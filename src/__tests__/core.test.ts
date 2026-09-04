import { describe, it, expect, beforeEach } from "vitest";
import { execSql, querySql } from "@/db/connection";

describe("Lead Management", () => {
  beforeEach(async () => {
    await execSql("DELETE FROM messages");
    await execSql("DELETE FROM conversations");
    await execSql("DELETE FROM audit_log");
    await execSql("DELETE FROM leads");
  });

  describe("Deduplication", () => {
    it("should create a lead with unique handle", async () => {
      await execSql(
        `INSERT INTO leads (id, instagram_handle, name, lead_type, pipeline_status, channel_status)
         VALUES ('test-1', '@clinica_teste', 'Clínica Teste', 'client', 'discovered', 'browser_contact_pending')`
      );

      const result = await querySql("SELECT * FROM leads WHERE id = 'test-1'");
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].instagram_handle).toBe("@clinica_teste");
    });

    it("should reject duplicate instagram_handle", async () => {
      await execSql(
        `INSERT INTO leads (id, instagram_handle, lead_type) VALUES ('test-1', '@clinica_teste', 'client')`
      );

      await expect(
        execSql(`INSERT INTO leads (id, instagram_handle, lead_type) VALUES ('test-2', '@clinica_teste', 'client')`)
      ).rejects.toThrow();
    });
  });

  describe("Pipeline Transitions", () => {
    it("should transition pipeline status", async () => {
      await execSql(
        `INSERT INTO leads (id, instagram_handle, lead_type, pipeline_status) VALUES ('test-1', '@lead1', 'client', 'discovered')`
      );

      await execSql(
        `UPDATE leads SET pipeline_status = 'qualified', updated_at = datetime('now') WHERE id = 'test-1'`
      );

      const result = await querySql("SELECT pipeline_status FROM leads WHERE id = 'test-1'");
      expect(result.rows[0].pipeline_status).toBe("qualified");
    });
  });

  describe("Channel Transitions", () => {
    it("should transition channel status for handoff", async () => {
      await execSql(
        `INSERT INTO leads (id, instagram_handle, channel_status) VALUES ('test-1', '@lead1', 'waiting_inbound_reply')`
      );

      await execSql(
        `UPDATE leads SET channel_status = 'api_eligible', instagram_id = 'igsid_123', updated_at = datetime('now') WHERE id = 'test-1'`
      );

      const result = await querySql("SELECT channel_status, instagram_id FROM leads WHERE id = 'test-1'");
      expect(result.rows[0].channel_status).toBe("api_eligible");
      expect(result.rows[0].instagram_id).toBe("igsid_123");
    });
  });

  describe("Do Not Contact", () => {
    it("should mark lead as do_not_contact", async () => {
      await execSql(
        `INSERT INTO leads (id, instagram_handle, do_not_contact) VALUES ('test-1', '@lead1', 0)`
      );

      await execSql(
        `UPDATE leads SET do_not_contact = 1, channel_status = 'do_not_contact' WHERE id = 'test-1'`
      );

      const result = await querySql("SELECT do_not_contact, channel_status FROM leads WHERE id = 'test-1'");
      expect(result.rows[0].do_not_contact).toBe(1);
      expect(result.rows[0].channel_status).toBe("do_not_contact");
    });

    it("should not allow contacting do_not_contact leads", async () => {
      await execSql(
        `INSERT INTO leads (id, instagram_handle, do_not_contact) VALUES ('test-1', '@lead1', 1)`
      );

      const result = await querySql(
        "SELECT * FROM leads WHERE do_not_contact = 0 AND pipeline_status = 'qualified'"
      );
      expect(result.rows.length).toBe(0);
    });
  });
});

describe("Message Deduplication", () => {
  beforeEach(async () => {
    await execSql("DELETE FROM messages");
    await execSql("DELETE FROM conversations");
    await execSql("DELETE FROM leads");
    await execSql(
      `INSERT INTO leads (id, instagram_handle) VALUES ('lead-1', '@test_lead')`
    );
    await execSql(
      `INSERT INTO conversations (id, lead_id, channel) VALUES ('conv-1', 'lead-1', 'browser')`
    );
  });

  it("should prevent duplicate messages by meta_message_id", async () => {
    await execSql(
      `INSERT INTO messages (id, conversation_id, lead_id, direction, channel, content, meta_message_id)
       VALUES ('msg-1', 'conv-1', 'lead-1', 'inbound', 'api', 'Hello', 'meta-123')`
    );

    await expect(
      execSql(
        `INSERT INTO messages (id, conversation_id, lead_id, direction, channel, content, meta_message_id)
         VALUES ('msg-2', 'conv-1', 'lead-1', 'inbound', 'api', 'Hello again', 'meta-123')`
      )
    ).rejects.toThrow();
  });
});

describe("Job Queue", () => {
  beforeEach(async () => {
    await execSql("DELETE FROM jobs");
  });

  it("should enqueue and dequeue jobs atomically", async () => {
    await execSql(
      `INSERT INTO jobs (id, type, status, payload) VALUES ('job-1', 'discover_profiles', 'pending', '{}')`
    );

    // Simulate dequeue with lock
    const lockKey = crypto.randomUUID();
    await execSql(
      `UPDATE jobs SET status = 'running', lock_key = ?, started_at = datetime('now')
       WHERE id = (SELECT id FROM jobs WHERE status = 'pending' AND scheduled_at <= datetime('now') ORDER BY scheduled_at ASC LIMIT 1)`,
      [lockKey]
    );

    const running = await querySql("SELECT * FROM jobs WHERE status = 'running'");
    expect(running.rows.length).toBe(1);
    expect(running.rows[0].lock_key).toBe(lockKey);
  });

  it("should track retry attempts", async () => {
    await execSql(
      `INSERT INTO jobs (id, type, status, payload, attempts, max_attempts) VALUES ('job-1', 'send_first_dm', 'running', '{}', 1, 3)`
    );

    // Fail and retry
    await execSql(
      `UPDATE jobs SET status = 'pending', attempts = attempts + 1, error = 'Browser timeout' WHERE id = 'job-1'`
    );

    const result = await querySql("SELECT attempts, status FROM jobs WHERE id = 'job-1'");
    expect(result.rows[0].attempts).toBe(2);
    expect(result.rows[0].status).toBe("pending");
  });

  it("should move to dead_letter after max attempts", async () => {
    await execSql(
      `INSERT INTO jobs (id, type, status, payload, attempts, max_attempts) VALUES ('job-1', 'send_first_dm', 'running', '{}', 3, 3)`
    );

    // Should go to dead_letter since attempts >= max_attempts
    await execSql(
      `UPDATE jobs SET status = 'dead_letter', error = 'Max retries exceeded' WHERE id = 'job-1' AND attempts >= max_attempts`
    );

    const result = await querySql("SELECT status FROM jobs WHERE id = 'job-1'");
    expect(result.rows[0].status).toBe("dead_letter");
  });
});

describe("Webhook Idempotency", () => {
  beforeEach(async () => {
    await execSql("DELETE FROM messages");
    await execSql("DELETE FROM conversations");
    await execSql("DELETE FROM leads");
    await execSql(
      `INSERT INTO leads (id, instagram_handle) VALUES ('lead-1', '@test_lead')`
    );
    await execSql(
      `INSERT INTO conversations (id, lead_id, channel) VALUES ('conv-1', 'lead-1', 'api')`
    );
  });

  it("should reject webhook with duplicate meta_message_id", async () => {
    await execSql(
      `INSERT INTO messages (id, conversation_id, lead_id, direction, channel, content, meta_message_id)
       VALUES ('msg-1', 'conv-1', 'lead-1', 'inbound', 'api', 'First message', 'webhook-msg-123')`
    );

    // Second webhook with same ID should fail
    const existing = await querySql(
      "SELECT id FROM messages WHERE meta_message_id = 'webhook-msg-123'"
    );
    expect(existing.rows.length).toBe(1);

    // Trying to insert again should throw unique constraint violation
    await expect(
      execSql(
        `INSERT INTO messages (id, conversation_id, lead_id, direction, channel, content, meta_message_id)
         VALUES ('msg-2', 'conv-1', 'lead-1', 'inbound', 'api', 'First message', 'webhook-msg-123')`
      )
    ).rejects.toThrow();
  });
});

describe("Budget Control", () => {
  beforeEach(async () => {
    await execSql("DELETE FROM ai_calls");
  });

  it("should track AI costs per month", async () => {
    await execSql(
      `INSERT INTO ai_calls (id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, purpose, created_at)
       VALUES ('call-1', 'gpt-4o', 1000, 500, 1500, 0.0075, 'draft_first_message', datetime('now'))`
    );
    await execSql(
      `INSERT INTO ai_calls (id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, purpose, created_at)
       VALUES ('call-2', 'gpt-4o-mini', 500, 200, 700, 0.0002, 'classify_intent', datetime('now'))`
    );

    const result = await querySql(
      `SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM ai_calls
       WHERE created_at >= date('now', 'start of month')`
    );
    expect(Number(result.rows[0].total)).toBeGreaterThan(0);
  });
});

describe("System State", () => {
  it("should manage system pause state", async () => {
    // Read current state
    const result = await querySql("SELECT value FROM system_state WHERE key = 'system_paused'");
    expect(result.rows.length).toBe(1);

    // Update to paused
    await execSql(
      `UPDATE system_state SET value = ?, updated_at = datetime('now') WHERE key = 'system_paused'`,
      [JSON.stringify(true)]
    );

    const updated = await querySql("SELECT value FROM system_state WHERE key = 'system_paused'");
    expect(JSON.parse(updated.rows[0].value as string)).toBe(true);
  });

  it("should track circuit breaker states", async () => {
    const result = await querySql("SELECT value FROM system_state WHERE key = 'circuit_breakers'");
    const breakers = JSON.parse(result.rows[0].value as string);

    expect(breakers.instagram_browser.state).toBe("closed");
    expect(breakers.instagram_api.state).toBe("closed");
    expect(breakers.openai.state).toBe("closed");
  });
});

describe("Audit Trail", () => {
  beforeEach(async () => {
    await execSql("DELETE FROM audit_log");
  });

  it("should create audit log entries", async () => {
    await execSql(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, actor, details)
       VALUES ('audit-1', 'lead', 'lead-123', 'pipeline_transition', 'ai', '{"from":"discovered","to":"qualified"}')`
    );

    const result = await querySql("SELECT * FROM audit_log WHERE entity_id = 'lead-123'");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].action).toBe("pipeline_transition");
    expect(result.rows[0].actor).toBe("ai");
  });

  it("should be append-only (no updates needed)", async () => {
    await execSql(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, actor)
       VALUES ('audit-1', 'lead', 'lead-1', 'created', 'system')`
    );
    await execSql(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, actor)
       VALUES ('audit-2', 'lead', 'lead-1', 'qualified', 'ai')`
    );
    await execSql(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, actor)
       VALUES ('audit-3', 'lead', 'lead-1', 'contacted', 'system')`
    );

    const result = await querySql(
      "SELECT * FROM audit_log WHERE entity_id = 'lead-1' ORDER BY created_at ASC"
    );
    expect(result.rows.length).toBe(3);
  });
});
