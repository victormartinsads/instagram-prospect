import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Helpers ─────────────────────────────────────────────────────────────────

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
};

function id() {
  return text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID());
}

// ── Leads ───────────────────────────────────────────────────────────────────

export const leads = sqliteTable(
  "leads",
  {
    id: id(),
    instagramHandle: text("instagram_handle").notNull(),
    instagramId: text("instagram_id"), // IGSID from Meta API
    name: text("name").default(""),
    bio: text("bio").default(""),
    category: text("category").default(""),
    followerCount: integer("follower_count").default(0),
    followingCount: integer("following_count").default(0),
    postCount: integer("post_count").default(0),
    profileUrl: text("profile_url").default(""),
    isVerified: integer("is_verified", { mode: "boolean" }).default(false),
    isBusinessAccount: integer("is_business_account", { mode: "boolean" }).default(false),

    leadType: text("lead_type").notNull().default("client"), // 'client' | 'affiliate'
    pipelineStatus: text("pipeline_status").notNull().default("discovered"),
    channelStatus: text("channel_status").notNull().default("browser_contact_pending"),

    icpScore: integer("icp_score").default(0), // 0-100
    icpSegment: text("icp_segment").default(""),
    icpKeywordsMatched: text("icp_keywords_matched").default(""), // JSON array
    detectedRole: text("detected_role").default("unknown"), // owner | employee | manager | unknown

    source: text("source").default(""), // keyword search, hashtag, related profile, etc.
    sourceKeyword: text("source_keyword").default(""),

    experimentGroupId: text("experiment_group_id"),

    doNotContact: integer("do_not_contact", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").default(""),

    lastContactedAt: text("last_contacted_at"),
    nextFollowUpAt: text("next_follow_up_at"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_leads_handle").on(table.instagramHandle),
    index("idx_leads_pipeline").on(table.pipelineStatus),
    index("idx_leads_channel").on(table.channelStatus),
    index("idx_leads_type").on(table.leadType),
    index("idx_leads_score").on(table.icpScore),
    index("idx_leads_dnc").on(table.doNotContact),
    index("idx_leads_ig_id").on(table.instagramId),
  ]
);

// ── Conversations ───────────────────────────────────────────────────────────

export const conversations = sqliteTable(
  "conversations",
  {
    id: id(),
    leadId: text("lead_id").notNull().references(() => leads.id),
    channel: text("channel").notNull().default("browser"), // 'browser' | 'api'
    status: text("status").notNull().default("active"), // 'active' | 'paused' | 'closed'
    startedAt: text("started_at").notNull().default(sql`(datetime('now'))`),
    lastMessageAt: text("last_message_at"),
    apiWindowExpiresAt: text("api_window_expires_at"),
    closedAt: text("closed_at"),
    closeReason: text("close_reason"),
    ...timestamps,
  },
  (table) => [
    index("idx_conv_lead").on(table.leadId),
    index("idx_conv_status").on(table.status),
  ]
);

// ── Messages ────────────────────────────────────────────────────────────────

export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id),
    leadId: text("lead_id").notNull().references(() => leads.id),
    direction: text("direction").notNull(), // 'outbound' | 'inbound'
    channel: text("channel").notNull(), // 'browser' | 'api'
    content: text("content").notNull(),
    messageType: text("message_type").notNull().default("dm"), // 'dm' | 'private_reply'
    variantId: text("variant_id"),
    intentClassified: text("intent_classified"), // AI-classified intent
    actionTaken: text("action_taken"), // AI-decided action

    sentAt: text("sent_at").notNull().default(sql`(datetime('now'))`),
    deliveredAt: text("delivered_at"),
    readAt: text("read_at"),

    metaMessageId: text("meta_message_id"), // ID from Meta API for dedup

    ...timestamps,
  },
  (table) => [
    index("idx_msg_conv").on(table.conversationId),
    index("idx_msg_lead").on(table.leadId),
    index("idx_msg_direction").on(table.direction),
    uniqueIndex("idx_msg_meta_id").on(table.metaMessageId),
    // Anti-duplicate: same content to same lead on same channel within the same second
    uniqueIndex("idx_msg_dedup").on(table.leadId, table.content, table.channel, table.sentAt),
  ]
);

// ── AI Calls ────────────────────────────────────────────────────────────────

export const aiCalls = sqliteTable(
  "ai_calls",
  {
    id: id(),
    leadId: text("lead_id").references(() => leads.id),
    conversationId: text("conversation_id").references(() => conversations.id),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
    purpose: text("purpose").notNull(), // score_icp, draft_message, classify_intent, etc.
    ...timestamps,
  },
  (table) => [
    index("idx_ai_lead").on(table.leadId),
    index("idx_ai_purpose").on(table.purpose),
    index("idx_ai_created").on(table.createdAt),
  ]
);

// ── Experiments ─────────────────────────────────────────────────────────────

export const experiments = sqliteTable(
  "experiments",
  {
    id: id(),
    name: text("name").notNull(),
    funnel: text("funnel").notNull().default("client"), // 'client' | 'affiliate'
    variable: text("variable").notNull(), // What's being tested
    hypothesis: text("hypothesis").notNull(),
    status: text("status").notNull().default("draft"), // draft | running | paused | concluded
    controlVariantId: text("control_variant_id"),
    sampleSizeTarget: integer("sample_size_target").notNull().default(100),
    currentSampleSize: integer("current_sample_size").notNull().default(0),
    winnerVariantId: text("winner_variant_id"),
    conclusion: text("conclusion"),
    startedAt: text("started_at"),
    concludedAt: text("concluded_at"),
    ...timestamps,
  },
  (table) => [
    index("idx_exp_status").on(table.status),
    index("idx_exp_funnel").on(table.funnel),
  ]
);

// ── Experiment Variants ─────────────────────────────────────────────────────

export const experimentVariants = sqliteTable(
  "experiment_variants",
  {
    id: id(),
    experimentId: text("experiment_id").notNull().references(() => experiments.id),
    name: text("name").notNull(),
    value: text("value").notNull().default("{}"), // JSON config for this variant
    isControl: integer("is_control", { mode: "boolean" }).notNull().default(false),
    assignedCount: integer("assigned_count").notNull().default(0),
    conversionCount: integer("conversion_count").notNull().default(0),
    conversionRate: real("conversion_rate").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_var_exp").on(table.experimentId),
  ]
);

// ── Jobs ────────────────────────────────────────────────────────────────────

export const jobs = sqliteTable(
  "jobs",
  {
    id: id(),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"),
    payload: text("payload").notNull().default("{}"), // JSON
    result: text("result"), // JSON
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    scheduledAt: text("scheduled_at").notNull().default(sql`(datetime('now'))`),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    error: text("error"),
    lockKey: text("lock_key"), // For mutex
    ...timestamps,
  },
  (table) => [
    index("idx_job_status").on(table.status),
    index("idx_job_type").on(table.type),
    index("idx_job_scheduled").on(table.scheduledAt),
    index("idx_job_lock").on(table.lockKey),
  ]
);

// ── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    entityType: text("entity_type").notNull(), // 'lead', 'conversation', 'experiment', etc.
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    actor: text("actor").notNull().default("system"), // 'system' | 'ai' | 'operator'
    details: text("details").default("{}"), // JSON
    ...timestamps,
  },
  (table) => [
    index("idx_audit_entity").on(table.entityType, table.entityId),
    index("idx_audit_created").on(table.createdAt),
  ]
);

// ── System State (KV store) ─────────────────────────────────────────────────

export const systemState = sqliteTable("system_state", {
  key: text("key").primaryKey().notNull(),
  value: text("value").notNull().default("{}"), // JSON
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
