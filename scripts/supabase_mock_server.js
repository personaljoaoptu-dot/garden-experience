import http from 'http';

const PORT = 54321;

const DB = {
  profiles: [
    {
      id: 'usr_audit_001',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      full_name: 'Gestor de Auditoria'
    }
  ],
  user_unit_permissions: [
    {
      id: 'perm_001',
      user_id: 'usr_audit_001',
      unit_id: '11111111-1111-1111-1111-111111111111'
    }
  ],
  organizations: [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Garden Gold Academia',
      code: 'gardengold',
      email: 'contato@gardengold.com.br',
      phone: '(11) 3456-7890',
      logo_url: null,
      created_at: '2026-09-01T10:00:00.000Z'
    }
  ],
  units: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Garden Gold — Unidade A (Centro)',
      code: 'unidade-a',
      location: 'Centro - SP',
      address: 'Av. Principal, 1000 - Centro',
      is_active: true,
      status: 'Ativa'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Garden Gold — Unidade B (Zona Sul)',
      code: 'unidade-b',
      location: 'Zona Sul - SP',
      address: 'Rua das Flores, 500 - Zona Sul',
      is_active: true,
      status: 'Ativa'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Garden Gold — Unidade C (Jardins)',
      code: 'unidade-c',
      location: 'Jardins - SP',
      address: 'Alameda dos Anjos, 250 - Jardins',
      is_active: true,
      status: 'Ativa'
    }
  ],
  surveys: [
    {
      id: 's1111111-1111-1111-1111-111111111111',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Pesquisa de Satisfação NPS',
      title: 'Pesquisa de Satisfação NPS',
      unit_code: 'all',
      type: 'nps',
      is_active: true,
      created_at: '2026-09-01T10:00:00.000Z'
    }
  ],
  tablets: [
    {
      id: 't1111111-1111-1111-1111-111111111111',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Tablet Recepção Centro (Unidade A)',
      device_name: 'Tablet Recepção Centro (Unidade A)',
      device_token: 'device-token-unidade-a',
      status: 'active',
      unit_code: 'unidade-a',
      updated_at: '2026-09-25T12:00:00.000Z'
    }
  ],
  responses: [
    {
      id: 'sup_resp_901',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      origin: 'kiosk',
      nps_score: 2,
      comment: 'Atendimento da recepção muito demorado no horário de pico. Necessário ajustar a fila.',
      student_identifier: 'Aluno Auditado #4091',
      student_email: 'aluno.auditado@gardengold.com.br',
      student_phone: '(11) 97100-4091',
      touchpoint_ratings: { t1: 2, t2: 4, t3: 2, t4: 3 },
      created_at: '2026-09-24T14:30:00.000Z'
    },
    {
      id: 'sup_resp_902',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      origin: 'qr',
      nps_score: 10,
      comment: 'Professores excelentes e infraestrutura impecável! Parabéns à equipe.',
      student_identifier: 'Aluna Auditada #8120',
      student_email: 'aluna.auditada@gardengold.com.br',
      student_phone: '(11) 98200-8120',
      touchpoint_ratings: { t1: 5, t2: 5, t3: 5, t4: 5 },
      created_at: '2026-09-25T09:15:00.000Z'
    },
    {
      id: 'sup_resp_903',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '22222222-2222-2222-2222-222222222222',
      unit_code: 'unidade-b',
      origin: 'web',
      nps_score: 8,
      comment: 'Ótimas instalações de musculação. Gostaria de mais horários de aulas em grupo.',
      student_identifier: 'Aluno Auditado #3341',
      student_email: 'aluno.b@gardengold.com.br',
      student_phone: '(11) 99300-3341',
      touchpoint_ratings: { t1: 4, t2: 4, t3: 4, t4: 3 },
      created_at: '2026-09-25T11:45:00.000Z'
    }
  ],
  follow_up_cases: [
    {
      id: 'sup_case_901',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      response_id: 'sup_resp_901',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      student_name: 'Aluno Auditado #4091',
      nps_score: 2,
      comment: 'Atendimento da recepção muito demorado no horário de pico. Necessário ajustar a fila.',
      status: 'pending',
      priority: 'high',
      assigned_user: 'Gestor Unidade A',
      internal_notes: 'Caso de detrator em tratativa inicial.',
      created_at: '2026-09-24T14:31:00.000Z'
    }
  ]
};

export function startSupabaseMockServer(port = PORT) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/auth/v1/session' || url.pathname === '/auth/v1/user') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        data: {
          session: {
            user: {
              id: 'usr_audit_001',
              email: 'audit@gardengold.com.br',
              user_metadata: { full_name: 'Gestor de Auditoria' }
            }
          }
        },
        error: null
      }));
    }

    const match = url.pathname.match(/^\/rest\/v1\/([a-z0-9_]+)/i);
    if (match) {
      const tableName = match[1];
      const items = DB[tableName] || [];
      res.statusCode = 200;
      return res.end(JSON.stringify(items));
    }

    res.statusCode = 200;
    res.end(JSON.stringify([]));
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`📡 Local Supabase REST server active on port ${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (process.argv[1] && process.argv[1].endsWith('supabase_mock_server.js')) {
  startSupabaseMockServer(PORT);
}
