import tls from 'node:tls';

function encodeMimeHeader(text) {
  return `=?UTF-8?B?${Buffer.from(String(text || ''), 'utf8').toString('base64')}?=`;
}

function buildHtmlEmail({ senderName, subject, messageText, studentName }) {
  const brandName = senderName || 'Garden Gold Academia';
  const escapedLines = String(messageText || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0;padding:0;background-color:#f4f2ec;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1b241d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f2ec;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.10);border:2px solid #e5b93f;">
          <tr>
            <td style="background:linear-gradient(135deg,#0b110e 0%,#16241b 100%);padding:28px 34px;border-bottom:4px solid #d4af37;text-align:left;">
              <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(229,185,63,0.16);border:1px solid #e5b93f;color:#e5b93f;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">
                ⭐ Gestão de Experiência do Aluno
              </div>
              <div style="font-size:21px;font-weight:800;color:#ffffff;letter-spacing:0.02em;">${brandName}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 34px;font-size:15px;line-height:1.7;color:#1f2937;background:linear-gradient(180deg,#ffffff 0%,#fdfbf6 100%);">
              ${escapedLines}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 34px;background-color:#0d1117;border-top:2px solid #d4af37;font-size:12px;color:#9ca3af;line-height:1.5;">
              💬 <strong style="color:#e5b93f;">Quer continuar essa conversa?</strong> Basta responder diretamente a este e-mail — sua mensagem chega na hora para a equipe da <strong style="color:#ffffff;">${brandName}</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an email directly via SMTP over TLS (port 465, e.g. smtp.gmail.com) using Node's built-in tls module.
 */
function sendViaSmtpTls({
  host = 'smtp.gmail.com',
  port = 465,
  user,
  pass,
  fromName,
  fromEmail,
  replyTo,
  toEmail,
  subject,
  text,
  html,
}) {
  return new Promise((resolve, reject) => {
    const cleanPass = String(pass || '').replace(/\s+/g, '');
    const cleanUser = String(user || fromEmail || '').trim();
    const senderAddress = String(fromEmail || cleanUser).trim();

    let buffer = '';
    let step = 0;
    let settled = false;

    const finish = (err, res) => {
      if (settled) return;
      settled = true;
      try {
        socket.end();
      } catch (_) {}
      if (err) reject(err);
      else resolve(res);
    };

    const socket = tls.connect(
      {
        host: host || 'smtp.gmail.com',
        port: Number(port) || 465,
        servername: host || 'smtp.gmail.com',
        rejectUnauthorized: false,
      },
      () => {
        // Connected over TLS; wait for 220 greeting
      }
    );

    socket.setTimeout(15000, () => {
      finish(new Error('Tempo limite excedido ao conectar ao servidor SMTP.'));
    });

    socket.on('error', (err) => {
      finish(err);
    });

    const sendLine = (line) => {
      socket.write(line + '\r\n');
    };

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        // Multi-line response continues with '-' after 3-digit code (e.g. 250-...)
        if (line.length >= 4 && line[3] === '-') continue;

        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400) {
          return finish(new Error(`Erro SMTP (${code}): ${line}`));
        }

        if (step === 0 && code === 220) {
          step = 1;
          sendLine(`EHLO garden-experience.local`);
        } else if (step === 1 && code === 250) {
          step = 2;
          sendLine(`AUTH LOGIN`);
        } else if (step === 2 && code === 334) {
          step = 3;
          sendLine(Buffer.from(cleanUser, 'utf8').toString('base64'));
        } else if (step === 3 && code === 334) {
          step = 4;
          sendLine(Buffer.from(cleanPass, 'utf8').toString('base64'));
        } else if (step === 4 && code === 235) {
          step = 5;
          sendLine(`MAIL FROM:<${senderAddress}>`);
        } else if (step === 5 && code === 250) {
          step = 6;
          sendLine(`RCPT TO:<${toEmail.trim()}>`);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendLine(`DATA`);
        } else if (step === 7 && code === 354) {
          step = 8;
          const boundary = `----GardenBoundary_${Date.now().toString(36)}`;
          const headers = [
            `From: ${encodeMimeHeader(fromName || 'Garden Experience')} <${senderAddress}>`,
            `To: <${toEmail.trim()}>`,
            `Reply-To: <${(replyTo || senderAddress).trim()}>`,
            `Subject: ${encodeMimeHeader(subject)}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            `Date: ${new Date().toUTCString()}`,
          ];

          const body = [
            ...headers,
            '',
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            `Content-Transfer-Encoding: base64`,
            '',
            Buffer.from(String(text || ''), 'utf8').toString('base64'),
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            `Content-Transfer-Encoding: base64`,
            '',
            Buffer.from(String(html || ''), 'utf8').toString('base64'),
            `--${boundary}--`,
            '.',
          ].join('\r\n');

          sendLine(body);
        } else if (step === 8 && code === 250) {
          step = 9;
          sendLine(`QUIT`);
          return finish(null, { ok: true, provider: 'smtp' });
        }
      }
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      toEmail,
      studentName,
      subject,
      message,
      senderName,
      senderEmail,
      replyTo,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      resendApiKey,
    } = body;

    if (!toEmail || !subject || !message) {
      return res.status(400).json({ error: 'Destinatário, assunto e mensagem são obrigatórios.' });
    }

    const html = buildHtmlEmail({
      senderName: senderName || 'Garden Experience',
      subject,
      messageText: message,
      studentName,
    });

    // 1. Try Resend API if key is provided
    const activeResendKey = (resendApiKey || process.env.RESEND_API_KEY || '').trim();
    if (activeResendKey) {
      const fromHeader = senderEmail && !senderEmail.endsWith('@gmail.com')
        ? `${senderName || 'Garden Experience'} <${senderEmail}>`
        : `${senderName || 'Garden Experience'} <onboarding@resend.dev>`;

      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeResendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [toEmail.trim()],
          reply_to: replyTo || senderEmail || undefined,
          subject,
          text: message,
          html,
        }),
      });

      const resendData = await resendResp.json().catch(() => ({}));
      if (!resendResp.ok) {
        return res.status(400).json({
          error: resendData?.message || 'Erro ao enviar via Resend API.',
        });
      }

      return res.status(200).json({
        ok: true,
        provider: 'resend',
        id: resendData?.id,
      });
    }

    // 2. Try Direct SMTP over TLS (Gmail App Password / Custom SMTP)
    const activeSmtpUser = (smtpUser || senderEmail || process.env.SMTP_USER || '').trim();
    const activeSmtpPass = (smtpPass || process.env.SMTP_PASS || '').trim();

    if (!activeSmtpUser || !activeSmtpPass) {
      return res.status(400).json({
        code: 'MISSING_EMAIL_CREDENTIALS',
        error: 'Configure o e-mail remetente e a Senha de App (Google) para ativar o envio automático em 1 clique.',
      });
    }

    await sendViaSmtpTls({
      host: smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(smtpPort || process.env.SMTP_PORT || 465),
      user: activeSmtpUser,
      pass: activeSmtpPass,
      fromName: senderName || 'Garden Experience',
      fromEmail: activeSmtpUser,
      replyTo: replyTo || activeSmtpUser,
      toEmail,
      subject,
      text: message,
      html,
    });

    return res.status(200).json({
      ok: true,
      provider: 'smtp',
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || 'Falha ao enviar e-mail automaticamente.',
    });
  }
}
