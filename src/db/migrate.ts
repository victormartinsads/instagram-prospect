import { execSql } from "./connection";

export async function ensureTablesExist(): Promise<void> {
  console.log("[DB] Ensuring tables exist...");

  await execSql(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      instagram_handle TEXT NOT NULL,
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
    )
  `);

  await execSql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_handle ON leads(instagram_handle)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON leads(pipeline_status)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel_status)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(icp_score)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_leads_dnc ON leads(do_not_contact)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_leads_ig_id ON leads(instagram_id)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
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
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_conv_lead ON conversations(lead_id)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(status)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
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
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_msg_lead ON messages(lead_id)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_msg_direction ON messages(direction)`);
  await execSql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_meta_id ON messages(meta_message_id)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS ai_calls (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
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
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_ai_lead ON ai_calls(lead_id)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_ai_purpose ON ai_calls(purpose)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_ai_created ON ai_calls(created_at)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
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
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_exp_status ON experiments(status)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_exp_funnel ON experiments(funnel)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS experiment_variants (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      name TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '{}',
      is_control INTEGER NOT NULL DEFAULT 0,
      assigned_count INTEGER NOT NULL DEFAULT 0,
      conversion_count INTEGER NOT NULL DEFAULT 0,
      conversion_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_var_exp ON experiment_variants(experiment_id)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payload TEXT NOT NULL DEFAULT '{}',
      result TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      lock_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_job_status ON jobs(status)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_job_type ON jobs(type)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_job_scheduled ON jobs(scheduled_at)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_job_lock ON jobs(lock_key)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await execSql(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)`);
  await execSql(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`);

  await execSql(`
    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Initialize default system state
  await execSql(
    `INSERT OR IGNORE INTO system_state (key, value) VALUES ('system_paused', ?)`,
    [JSON.stringify(false)]
  );
  await execSql(
    `INSERT OR IGNORE INTO system_state (key, value) VALUES ('warmup_start_date', ?)`,
    [JSON.stringify(new Date().toISOString())]
  );
  await execSql(
    `INSERT OR IGNORE INTO system_state (key, value) VALUES ('daily_dm_count', ?)`,
    [JSON.stringify({ date: "", count: 0 })]
  );
  await execSql(
    `INSERT OR IGNORE INTO system_state (key, value) VALUES ('circuit_breakers', ?)`,
    [JSON.stringify({
      instagram_browser: { state: "closed", failures: 0, lastFailure: null },
      instagram_api: { state: "closed", failures: 0, lastFailure: null },
      openai: { state: "closed", failures: 0, lastFailure: null },
    })]
  );

  console.log("[DB] Tables ensured.");
}

// Run directly if called as script
const isDirectRun = process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.includes("migrate");
if (isDirectRun) {
  ensureTablesExist()
    .then(() => console.log("[DB] Migration script complete."))
    .catch((err) => {
      console.error("[DB] Migration failed:", err);
      process.exit(1);
    });
}
