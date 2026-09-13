import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { mkdirSync, existsSync, unlinkSync } from "fs";

const DEMO_DB_PATH = resolve("./data/demo.db");

console.log("Creating demo database at:", DEMO_DB_PATH);

mkdirSync(dirname(DEMO_DB_PATH), { recursive: true });

if (existsSync(DEMO_DB_PATH)) {
  try {
    unlinkSync(DEMO_DB_PATH);
  } catch {}
}

const client = createClient({
  url: `file:${DEMO_DB_PATH}`,
});

async function main() {
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");

  // Create tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY NOT NULL,
      instagram_handle TEXT NOT NULL UNIQUE,
      instagram_id TEXT,
      name TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      category TEXT DEFAULT '',
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      post_count INTEGER DEFAULT 0,
      profile_url TEXT DEFAULT '',
      is_verified INTEGER DEFAULT 0,
      is_business_account INTEGER DEFAULT 0,
      lead_type TEXT NOT NULL DEFAULT 'client',
      pipeline_status TEXT NOT NULL DEFAULT 'discovered',
      channel_status TEXT NOT NULL DEFAULT 'browser_contact_pending',
      icp_score INTEGER DEFAULT 0,
      icp_segment TEXT DEFAULT '',
      icp_keywords_matched TEXT DEFAULT '',
      detected_role TEXT DEFAULT 'unknown',
      source TEXT DEFAULT '',
      source_keyword TEXT DEFAULT '',
      experiment_group_id TEXT,
      do_not_contact INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      last_contacted_at TEXT,
      next_follow_up_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      channel TEXT NOT NULL DEFAULT 'browser',
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_message_at TEXT,
      api_window_expires_at TEXT,
      closed_at TEXT,
      close_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      lead_id TEXT NOT NULL REFERENCES leads(id),
      direction TEXT NOT NULL,
      channel TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'dm',
      variant_id TEXT,
      intent_classified TEXT,
      action_taken TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at TEXT,
      read_at TEXT,
      meta_message_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ai_calls (
      id TEXT PRIMARY KEY NOT NULL,
      lead_id TEXT REFERENCES leads(id),
      conversation_id TEXT REFERENCES conversations(id),
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      funnel TEXT NOT NULL DEFAULT 'client',
      variable TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      control_variant_id TEXT,
      sample_size_target INTEGER NOT NULL DEFAULT 100,
      current_sample_size INTEGER NOT NULL DEFAULT 0,
      winner_variant_id TEXT,
      conclusion TEXT,
      started_at TEXT,
      concluded_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS experiment_variants (
      id TEXT PRIMARY KEY NOT NULL,
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      name TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '{}',
      is_control INTEGER NOT NULL DEFAULT 0,
      assigned_count INTEGER NOT NULL DEFAULT 0,
      conversion_count INTEGER NOT NULL DEFAULT 0,
      conversion_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("Tables created successfully.");

  // 1. System state
  await client.execute({
    sql: "INSERT INTO system_state (key, value) VALUES ('is_paused', 'false')",
    args: [],
  });
  await client.execute({
    sql: "INSERT INTO system_state (key, value) VALUES ('daily_dm_count', '14')",
    args: [],
  });

  // 2. Insert Experiment
  const expId = "exp-dm-copy-01";
  await client.execute({
    sql: `INSERT INTO experiments (id, name, funnel, variable, hypothesis, status, sample_size_target, current_sample_size, winner_variant_id, conclusion, started_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'))`,
    args: [
      expId,
      "Gancho: Perda de Directs vs No-Show",
      "client",
      "first_dm_hook",
      "Mencionar perda de pacientes fora do horário comercial converte 40% mais que falar de faltas em consultas.",
      "running",
      100,
      48,
      "var-a",
      "Variante A demonstrando maior taxa de engajamento e respostas espontâneas.",
    ],
  });

  await client.execute({
    sql: `INSERT INTO experiment_variants (id, experiment_id, name, value, is_control, assigned_count, conversion_count, conversion_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["var-a", expId, "A: Perda Noturna (Dor de Direct)", "{}", 1, 26, 9, 0.346],
  });
  await client.execute({
    sql: `INSERT INTO experiment_variants (id, experiment_id, name, value, is_control, assigned_count, conversion_count, conversion_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["var-b", expId, "B: Redução de No-Show", "{}", 0, 22, 4, 0.182],
  });

  // 3. Leads creation
  interface LeadDef {
    id: string;
    handle: string;
    name: string;
    bio: string;
    followers: number;
    score: number;
    status: string;
    channelStatus: string;
    role: string;
  }

  const demoLeads: LeadDef[] = [
    // 2 WhatsApp Handoffs (as requested)
    {
      id: "lead-wa-1",
      handle: "dr.renatocosta_implantes",
      name: "Dr. Renato Costa | Especialista em Implantes e Reabilitação Oral",
      bio: "Cirurgião Dentista • CRO-SP 94821\nEspecialista em Carga Imediata e Lentes em Porcelana\n📍 Itaim Bibi, São Paulo\nAgendamentos pelo link abaixo 👇",
      followers: 14200,
      score: 95,
      status: "whatsapp_handoff",
      channelStatus: "api_active",
      role: "owner",
    },
    {
      id: "lead-wa-2",
      handle: "clinica.luminareodonto",
      name: "Clínica Luminare | Odontologia Estética & Harmonização",
      bio: "Mais de 10 anos transformando sorrisos com excelência.\nResponsável Técnico: Dra. Fernanda Mattos\n📍 Jardins, SP\n📲 Atendimento exclusivo via WhatsApp",
      followers: 28900,
      score: 98,
      status: "whatsapp_handoff",
      channelStatus: "api_active",
      role: "manager",
    },

    // 5 Interested
    {
      id: "lead-int-1",
      handle: "dra.marianaborges_odonto",
      name: "Dra. Mariana Borges | Odontologia Integrativa",
      bio: "Ortodontia Invisível e Estética Dental\n📍 Moema, São Paulo - SP\nTransformando sorrisos com tecnologia e acolhimento.",
      followers: 8600,
      score: 92,
      status: "interested",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-int-2",
      handle: "instituto.oralprime",
      name: "Instituto Oral Prime SP",
      bio: "Clínica odontológica multidisciplinar de alto padrão.\nImplantes | Ortodontia | Estética Facial\n📍 Vila Olímpia, SP",
      followers: 18400,
      score: 94,
      status: "interested",
      channelStatus: "waiting_inbound_reply",
      role: "manager",
    },
    {
      id: "lead-int-3",
      handle: "dr.felipe_ortodontia",
      name: "Dr. Felipe Andrade • Invisalign Top Doctor",
      bio: "Especialista em alinhadores invisíveis e estética do sorriso.\nConsultórios em Pinheiros e Morumbi.\nAtendimento personalizado.",
      followers: 11200,
      score: 90,
      status: "interested",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-int-4",
      handle: "clinica.sorrisovip",
      name: "Sorriso VIP Odontologia Especializada",
      bio: "Estrutura moderna para toda a sua família.\nImplantes, Clareamento e Odontopediatria.\n📍 Alphaville, Barueri - SP",
      followers: 15300,
      score: 91,
      status: "interested",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-int-5",
      handle: "dra.camila.harmonizacao",
      name: "Dra. Camila Toledo | HOF & Estética",
      bio: "Bioplastia, Toxina Botulínica e Lábios com naturalidade.\nProfessora e palestrante.\n📍 Brooklin, SP",
      followers: 24700,
      score: 93,
      status: "interested",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },

    // 8 Replied
    {
      id: "lead-rep-1",
      handle: "dr.gustavoprado_odonto",
      name: "Dr. Gustavo Prado | Reabilitação Oral",
      bio: "Especialista em Prótese Dentária e DTM.\n📍 Santana, Zona Norte - SP.",
      followers: 7400,
      score: 88,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-rep-2",
      handle: "clinica.artedentall",
      name: "Arte Dental Clínica Integrada",
      bio: "Odontologia moderna e indolor no coração de Santo Amaro.",
      followers: 9100,
      score: 85,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "manager",
    },
    {
      id: "lead-rep-3",
      handle: "dra.patricia_pediatriaodonto",
      name: "Dra. Patricia Lima | Odontopediatria",
      bio: "Cuidando com carinho dos primeiros dentinhos.\n📍 Perdizes, SP",
      followers: 6200,
      score: 86,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-rep-4",
      handle: "instituto.dentalle",
      name: "Instituto Dentalle Odontologia",
      bio: "Tecnologia 3D e scanner intraoral para o seu conforto.",
      followers: 12500,
      score: 89,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "manager",
    },
    {
      id: "lead-rep-5",
      handle: "dr.lucasrezende.odonto",
      name: "Dr. Lucas Rezende | Cirurgião Dentista",
      bio: "Extração de siso sem dor e cirurgias avançadas.\n📍 Bela Vista, SP",
      followers: 5800,
      score: 85,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-rep-6",
      handle: "dra.vanessamartins_estetica",
      name: "Dra. Vanessa Martins | Lentes de Resina",
      bio: "Harmonia e naturalidade para o seu sorriso.\n📍 Tatuapé, SP",
      followers: 16800,
      score: 91,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },
    {
      id: "lead-rep-7",
      handle: "clinica.oralsaude_sp",
      name: "Oral Saúde Odontologia Especializada",
      bio: "Tratamentos odontológicos integrados para todas as idades.",
      followers: 8900,
      score: 87,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "manager",
    },
    {
      id: "lead-rep-8",
      handle: "dr.marcioviana.odonto",
      name: "Dr. Marcio Viana | Periodontia e Implantes",
      bio: "Mestre em Periodontia pela USP.\nConsultório no Paraíso, SP",
      followers: 6400,
      score: 88,
      status: "replied",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    },

    // 2 Active Customer (Closed)
    {
      id: "lead-cust-1",
      handle: "dra.camilatavares.estetica",
      name: "Dra. Camila Tavares | Harmonização Facial & Sorriso",
      bio: "Clínica conceito no Itaim Bibi. Cliente Orbita IO desde Ago/2026.",
      followers: 32400,
      score: 98,
      status: "active_customer",
      channelStatus: "api_active",
      role: "owner",
    },
    {
      id: "lead-cust-2",
      handle: "odontologia.morumbi",
      name: "Centro Odontológico Morumbi Prime",
      bio: "Equipe com mais de 8 especialistas. Automação ativa de captação.",
      followers: 21500,
      score: 96,
      status: "active_customer",
      channelStatus: "api_active",
      role: "owner",
    },

    // 20 Contacted
    ...Array.from({ length: 20 }).map((_, i) => ({
      id: `lead-cont-${i + 1}`,
      handle: `dr.contatado_${i + 1}`,
      name: `Dr. Especialista ${i + 1} | Odontologia SP`,
      bio: `Atendimento humanizado e tecnologia em odontologia. Região Metropolitana de SP.`,
      followers: 4000 + i * 850,
      score: 85 + (i % 8),
      status: "contacted",
      channelStatus: "waiting_inbound_reply",
      role: "owner",
    })),

    // 25 Qualified
    ...Array.from({ length: 25 }).map((_, i) => ({
      id: `lead-qual-${i + 1}`,
      handle: `clinica.qualificada_${i + 1}`,
      name: `Clínica Odonto Qualificada ${i + 1}`,
      bio: `Clínica odontológica completa com foco em reabilitação e estética oral.`,
      followers: 5500 + i * 620,
      score: 85 + (i % 10),
      status: "qualified",
      channelStatus: "browser_contact_pending",
      role: "manager",
    })),

    // 15 Discovered
    ...Array.from({ length: 15 }).map((_, i) => ({
      id: `lead-disc-${i + 1}`,
      handle: `perfil.descoberto_${i + 1}`,
      name: `Consultório Descoberto ${i + 1}`,
      bio: `Perfil localizado via busca no Instagram. Aguardando qualificação completa.`,
      followers: 1200 + i * 300,
      score: 25 + (i % 5),
      status: "discovered",
      channelStatus: "browser_contact_pending",
      role: "unknown",
    })),
  ];

  console.log(`Inserting ${demoLeads.length} leads...`);

  for (const l of demoLeads) {
    await client.execute({
      sql: `INSERT INTO leads (id, instagram_handle, name, bio, follower_count, icp_score, pipeline_status, channel_status, detected_role, last_contacted_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 hours'), datetime('now', '-3 days'))`,
      args: [l.id, l.handle, l.name, l.bio, l.followers, l.score, l.status, l.channelStatus, l.role],
    });
  }

  // 4. Exactly 15 Active Conversations (as requested)
  console.log("Inserting exactly 15 active conversations...");

  // The 15 active conversations:
  // 2 whatsapp_handoff + 5 interested + 8 replied = exactly 15!
  const activeConversationLeads = [
    demoLeads[0], // wa 1
    demoLeads[1], // wa 2
    demoLeads[2], // int 1
    demoLeads[3], // int 2
    demoLeads[4], // int 3
    demoLeads[5], // int 4
    demoLeads[6], // int 5
    demoLeads[7], // rep 1
    demoLeads[8], // rep 2
    demoLeads[9], // rep 3
    demoLeads[10], // rep 4
    demoLeads[11], // rep 5
    demoLeads[12], // rep 6
    demoLeads[13], // rep 7
    demoLeads[14], // rep 8
  ];

  interface DialogMessage {
    dir: "outbound" | "inbound";
    text: string;
    intent?: string;
    action?: string;
    minsAgo: number;
  }

  const dialogPresets: Record<string, DialogMessage[]> = {
    "lead-wa-1": [
      {
        dir: "outbound",
        text: "Olá Dr. Renato, tudo bem? Vi o trabalho impecável da sua clínica aqui no Itaim Bibi. Notei que clínicas de implantes costumam perder até 35% das pessoas que chamam no direct fora do expediente. Desenvolvemos uma automação com IA que responde em segundos, pré-qualifica o paciente e passa direto para sua secretária agendar. Faria sentido te mostrar em 3 minutos?",
        minsAgo: 140,
      },
      {
        dir: "inbound",
        text: "Olá Victor, tudo ótimo! Rapaz, isso acontece demais por aqui, o pessoal manda mensagem às 22h e quando a recepcionista responde no outro dia o paciente já foi em outro lugar. Como funciona?",
        intent: "interested",
        action: "send_value_prop",
        minsAgo: 110,
      },
      {
        dir: "outbound",
        text: "Exatamente esse o ponto, Dr. Renato! A IA faz um acolhimento imediato com a voz da clínica, tira dúvidas comuns sobre tratamentos e já envia o link ou contato pronto no WhatsApp da recepcionista. Qual o melhor número de WhatsApp da clínica para eu te mandar uma demonstração rápida de 2 minutos?",
        minsAgo: 95,
      },
      {
        dir: "inbound",
        text: "Perfeito, me chama no meu WhatsApp pessoal: 11 98765-4321, fico no aguardo!",
        intent: "wants_whatsapp",
        action: "handoff_to_whatsapp",
        minsAgo: 25,
      },
      {
        dir: "outbound",
        text: "Excelente, Dr. Renato! Já encaminhei sua solicitação para nosso atendimento via WhatsApp. Muito obrigado!",
        minsAgo: 20,
      },
    ],
    "lead-wa-2": [
      {
        dir: "outbound",
        text: "Olá pessoal da Clínica Luminare, tudo bem? Acompanho o conteúdo de estética de vocês, padrão altíssimo! Uma dúvida rápida: vocês já possuem atendimento automatizado por IA para captar e filtrar leads que chegam nos directs à noite e fins de semana?",
        minsAgo: 180,
      },
      {
        dir: "inbound",
        text: "Oi Victor! Ainda não temos, hoje nossa equipe só responde no horário comercial das 9h às 18h. Qual o custo desse sistema?",
        intent: "pricing_question",
        action: "send_pricing_overview",
        minsAgo: 120,
      },
      {
        dir: "outbound",
        text: "Trabalhamos com planos muito acessíveis que se pagam já no primeiro paciente convertido pelo direct. Podemos conectar com o WhatsApp da coordenação de vocês para fazer um teste prático sem compromisso?",
        minsAgo: 100,
      },
      {
        dir: "inbound",
        text: "Gostei da proposta. Pode falar com a Fernanda no WhatsApp da recepção: 11 97123-8899.",
        intent: "wants_whatsapp",
        action: "handoff_to_whatsapp",
        minsAgo: 40,
      },
    ],
    "lead-int-1": [
      {
        dir: "outbound",
        text: "Olá Dra. Mariana, tudo bem? Parabéns pelos casos de Ortodontia Invisível publicados! Estava vendo que seu consultório em Moema tem muita procura. Vocês já utilizam IA para triagem automática de pacientes no direct?",
        minsAgo: 90,
      },
      {
        dir: "inbound",
        text: "Olá Victor! Obrigada. Ainda não temos, confesso que me perco bastante nos directs pela correria dos atendimentos. Vocês integram com agenda online?",
        intent: "interested",
        action: "qualify_integration",
        minsAgo: 45,
      },
      {
        dir: "outbound",
        text: "Sim, Dra. Mariana! Integramos com Google Agenda, Simples Dental e sistemas em nuvem. A IA consegue verificar os horários livres e propor a consulta direto ao paciente.",
        minsAgo: 30,
      },
    ],
    "lead-int-2": [
      {
        dir: "outbound",
        text: "Olá time do Instituto Oral Prime, tudo bem? Excelente posicionamento na Vila Olímpia! Vocês costumam ter um volume alto de orçamentos pelo Instagram que acabam esfriando?",
        minsAgo: 85,
      },
      {
        dir: "inbound",
        text: "Com certeza, temos muito lead curioso que não fecha ou demora a responder. Essa IA consegue qualificar se o paciente realmente tem interesse no tratamento?",
        intent: "interested",
        action: "explain_icp_filter",
        minsAgo: 35,
      },
    ],
    "lead-int-3": [
      {
        dir: "outbound",
        text: "Olá Dr. Felipe, tudo bem? Como está a conversão de pacientes particulares de Invisalign através do seu perfil?",
        minsAgo: 70,
      },
      {
        dir: "inbound",
        text: "Oi Victor! Poderia ser bem melhor. Me manda uma apresentação do serviço de vocês?",
        intent: "interested",
        action: "send_portfolio",
        minsAgo: 20,
      },
    ],
    "lead-int-4": [
      {
        dir: "outbound",
        text: "Olá Sorriso VIP! Tudo bem? Notei que vocês atendem bastante a região de Alphaville. Como vocês lidam com mensagens que chegam no sábado e domingo?",
        minsAgo: 60,
      },
      {
        dir: "inbound",
        text: "Olá! Nos finais de semana o direct fica parado até segunda. É fácil de instalar o robô?",
        intent: "interested",
        action: "explain_onboarding",
        minsAgo: 15,
      },
    ],
    "lead-int-5": [
      {
        dir: "outbound",
        text: "Dra. Camila, parabéns pelos resultados impecáveis de harmonização facial! Suas seguidoras costumam perguntar muito sobre valores de preenchimento e toxina no direct?",
        minsAgo: 120,
      },
      {
        dir: "inbound",
        text: "Demais, Victor! Passo metade do meu dia respondendo a mesma coisa sobre botox e labial haha. Vocês têm algo que responde automaticamente de forma natural?",
        intent: "interested",
        action: "send_demo_video",
        minsAgo: 50,
      },
    ],
  };

  for (let i = 0; i < activeConversationLeads.length; i++) {
    const l = activeConversationLeads[i];
    const convId = `conv-${i + 1}`;
    const minsAgo = 15 + i * 8;

    await client.execute({
      sql: `INSERT INTO conversations (id, lead_id, channel, status, started_at, last_message_at, created_at)
            VALUES (?, ?, 'browser', 'active', datetime('now', '-1 day'), datetime('now', '-${minsAgo} minutes'), datetime('now', '-1 day'))`,
      args: [convId, l.id],
    });

    const thread = dialogPresets[l.id] || [
      {
        dir: "outbound",
        text: `Olá ${l.name ? l.name.split(" ")[0] : "Doutor(a)"}, tudo bem? Estava analisando a presença digital da clínica e notei que vocês têm um perfil com ótimo engajamento. Gostaria de te mostrar como aumentar em 40% a captação de pacientes no direct sem aumentar a equipe.`,
        minsAgo: 100 + i * 10,
      },
      {
        dir: "inbound",
        text: "Olá Victor, tudo bem por aí? Achei interessante, pode me mandar mais detalhes?",
        intent: "interested",
        action: "follow_up",
        minsAgo: minsAgo,
      },
    ];

    for (let mIdx = 0; mIdx < thread.length; mIdx++) {
      const msg = thread[mIdx];
      await client.execute({
        sql: `INSERT INTO messages (id, conversation_id, lead_id, direction, channel, content, intent_classified, action_taken, sent_at)
              VALUES (?, ?, ?, ?, 'browser', ?, ?, ?, datetime('now', '-${msg.minsAgo} minutes'))`,
        args: [
          `msg-${convId}-${mIdx + 1}`,
          convId,
          l.id,
          msg.dir,
          msg.text,
          msg.intent || null,
          msg.action || null,
        ],
      });
    }
  }

  // 5. Insert AI Calls (Cost metrics)
  console.log("Inserting AI calls for cost metrics...");
  const models = ["gpt-4o-mini", "gpt-4o-mini", "gpt-4o"];
  const purposes = ["score_icp", "draft_message", "classify_intent", "qualify_lead"];

  for (let i = 0; i < 48; i++) {
    const model = models[i % models.length];
    const purpose = purposes[i % purposes.length];
    const promptTokens = 450 + (i * 37) % 300;
    const completionTokens = 80 + (i * 23) % 150;
    const totalTokens = promptTokens + completionTokens;
    const costUsd = model === "gpt-4o" ? (totalTokens * 0.0000075) : (totalTokens * 0.0000003);

    await client.execute({
      sql: `INSERT INTO ai_calls (id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, purpose, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-${i * 4} hours'))`,
      args: [`ai-call-${i + 1}`, model, promptTokens, completionTokens, totalTokens, costUsd, purpose],
    });
  }

  // 6. Insert Audit Log entries
  console.log("Inserting audit log entries...");
  const logEntries = [
    { actor: "ai", action: "Handoff para WhatsApp concluído", entity: "lead", details: "Lead @dr.renatocosta_implantes solicitou contato no WhatsApp (11 98765-4321)", mins: 20 },
    { actor: "ai", action: "Intenção classificada: 'wants_whatsapp'", entity: "conversation", details: "Confiança: 0.99. Palavras-chave: me chama no meu whatsapp pessoal", mins: 24 },
    { actor: "ai", action: "Mensagem enviada com sucesso", entity: "conversation", details: "DM enviada para @dra.marianaborges_odonto via automação", mins: 30 },
    { actor: "ai", action: "Handoff para WhatsApp concluído", entity: "lead", details: "Lead @clinica.luminareodonto forneceu contato da gestão (11 97123-8899)", mins: 40 },
    { actor: "ai", action: "Lead qualificado com Score 98", entity: "lead", details: "Perfil @clinica.luminareodonto atende a 100% dos requisitos de ICP A+", mins: 55 },
    { actor: "ai", action: "Abordagem inicial enviada", entity: "conversation", details: "Variante A (Perda de Directs Noturnos) enviada para @instituto.oralprime", mins: 85 },
    { actor: "ai", action: "Lead qualificado com Score 95", entity: "lead", details: "Perfil @dr.renatocosta_implantes qualificado como Cirurgião Dono de Clínica", mins: 140 },
    { actor: "system", action: "Ciclo de Descoberta concluído", entity: "job", details: "25 novos perfis mapeados na busca 'dentistasp'", mins: 190 },
  ];

  for (let i = 0; i < logEntries.length; i++) {
    const entry = logEntries[i];
    await client.execute({
      sql: `INSERT INTO audit_log (id, entity_type, entity_id, action, actor, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-${entry.mins} minutes'))`,
      args: [`audit-${i + 1}`, entry.entity, `entity-${i + 1}`, entry.action, entry.actor, entry.details],
    });
  }

  console.log("Demo database successfully seeded at:", DEMO_DB_PATH);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding demo database:", err);
    process.exit(1);
  });
