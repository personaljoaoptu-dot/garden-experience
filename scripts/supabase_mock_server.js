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
  students: [
    {
      id: 'st_11111111-1111-1111-1111-111111111111',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      unit_id: '11111111-1111-1111-1111-111111111111',
      name: 'João Silva (Aluno Auditado #4091)',
      email: 'aluno.auditado@gardengold.com.br',
      phone: '(11) 97100-4091',
      external_evo_id: 'evo_88201',
      status: 'active',
      created_at: '2026-07-01T10:00:00.000Z'
    },
    {
      id: 'st_22222222-2222-2222-2222-222222222222',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      unit_id: '11111111-1111-1111-1111-111111111111',
      name: 'Mariana Souza (Aluna Auditada #8120)',
      email: 'aluna.auditada@gardengold.com.br',
      phone: '(11) 98200-8120',
      external_evo_id: 'evo_88202',
      status: 'active',
      created_at: '2026-07-15T10:00:00.000Z'
    }
  ],
  responses: [
    {
      id: 'sup_resp_900',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      student_id: 'st_11111111-1111-1111-1111-111111111111',
      origin: 'kiosk',
      nps_score: 3,
      comment: 'Estou insatisfeito com o tempo de espera na recepção.',
      student_identifier: 'João Silva (Aluno Auditado #4091)',
      student_email: 'aluno.auditado@gardengold.com.br',
      student_phone: '(11) 97100-4091',
      touchpoint_ratings: { t1: 2, t2: 4, t3: 3, t4: 3 },
      created_at: '2026-07-12T14:30:00.000Z'
    },
    {
      id: 'sup_resp_901',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      student_id: 'st_11111111-1111-1111-1111-111111111111',
      origin: 'kiosk',
      nps_score: 7,
      comment: 'Atendimento da recepção melhorou bastante após a reorganização.',
      student_identifier: 'João Silva (Aluno Auditado #4091)',
      student_email: 'aluno.auditado@gardengold.com.br',
      student_phone: '(11) 97100-4091',
      touchpoint_ratings: { t1: 4, t2: 4, t3: 4, t4: 4 },
      created_at: '2026-08-14T10:15:00.000Z'
    },
    {
      id: 'sup_resp_902',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      student_id: 'st_11111111-1111-1111-1111-111111111111',
      origin: 'qr',
      nps_score: 10,
      comment: 'Agora estou muito satisfeito com a recepção e os professores! Parabéns à equipe.',
      student_identifier: 'João Silva (Aluno Auditado #4091)',
      student_email: 'aluno.auditado@gardengold.com.br',
      student_phone: '(11) 97100-4091',
      touchpoint_ratings: { t1: 5, t2: 5, t3: 5, t4: 5 },
      created_at: '2026-09-24T09:15:00.000Z'
    },
    {
      id: 'sup_resp_903',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '22222222-2222-2222-2222-222222222222',
      unit_code: 'unidade-b',
      student_id: 'st_22222222-2222-2222-2222-222222222222',
      origin: 'web',
      nps_score: 9,
      comment: 'Ótimas instalações de musculação. Atendimento excelente.',
      student_identifier: 'Mariana Souza (Aluna Auditada #8120)',
      student_email: 'aluna.auditada@gardengold.com.br',
      student_phone: '(11) 98200-8120',
      touchpoint_ratings: { t1: 5, t2: 4, t3: 5, t4: 4 },
      created_at: '2026-09-25T11:45:00.000Z'
    },
    {
      id: 'sup_resp_904',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      survey_id: 's1111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      student_id: null,
      origin: 'qr',
      nps_score: 8,
      comment: 'Resposta anônima com bom nível de avaliação geral.',
      student_identifier: 'Anônimo',
      student_email: null,
      student_phone: null,
      touchpoint_ratings: { t1: 4, t2: 4, t3: 4, t4: 4 },
      created_at: '2026-09-25T12:00:00.000Z'
    }
  ],
  follow_up_cases: [
    {
      id: 'sup_case_901',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      response_id: 'sup_resp_900',
      student_id: 'st_11111111-1111-1111-1111-111111111111',
      unit_id: '11111111-1111-1111-1111-111111111111',
      unit_code: 'unidade-a',
      student_name: 'João Silva (Aluno Auditado #4091)',
      nps_score: 3,
      comment: 'Estou insatisfeito com o tempo de espera na recepção.',
      status: 'resolved',
      priority: 'high',
      assigned_user: 'Gestor Unidade A',
      internal_notes: 'Contato realizado com o aluno. Reorganização do fluxo de atendimento da recepção efetuada.',
      created_at: '2026-07-13T09:00:00.000Z'
    }
  ],
  communication_logs: [
    {
      id: 'log_901',
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      case_id: 'sup_case_901',
      student_id: 'st_11111111-1111-1111-1111-111111111111',
      type: 'phone',
      notes: 'Ligação realizada para o aluno explicativo das ações de melhoria na recepção.',
      created_at: '2026-07-14T10:30:00.000Z'
    }
  ]
};

export function startSupabaseMockServer(port = PORT) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Range', '0-100/100');
    res.setHeader('Range-Unit', 'items');

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
