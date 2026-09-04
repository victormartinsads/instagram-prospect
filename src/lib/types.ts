// ── Pipeline Status (Client Funnel) ─────────────────────────────────────────

export const CLIENT_PIPELINE_STATUSES = [
  "discovered",
  "qualified",
  "contacted",
  "replied",
  "interested",
  "whatsapp_handoff",
  "registered",
  "active_customer",
  "closed",
] as const;

export type ClientPipelineStatus = (typeof CLIENT_PIPELINE_STATUSES)[number];

// ── Pipeline Status (Affiliate Funnel) ──────────────────────────────────────

export const AFFILIATE_PIPELINE_STATUSES = [
  "discovered",
  "qualified",
  "contacted",
  "replied",
  "interested",
  "joined_affiliate_group",
  "active_affiliate",
  "generated_customer",
  "closed",
] as const;

export type AffiliatePipelineStatus = (typeof AFFILIATE_PIPELINE_STATUSES)[number];

export type PipelineStatus = ClientPipelineStatus | AffiliatePipelineStatus;

// ── Pipeline Status Labels (PT-BR for UI) ───────────────────────────────────

export const PIPELINE_STATUS_LABELS: Record<string, string> = {
  discovered: "Descoberto",
  qualified: "Qualificado",
  contacted: "Abordado",
  replied: "Respondeu",
  interested: "Interessado",
  whatsapp_handoff: "Encaminhado ao WhatsApp",
  registered: "Cadastrado",
  active_customer: "Cliente ativo",
  joined_affiliate_group: "Entrou no grupo",
  active_affiliate: "Afiliado ativo",
  generated_customer: "Gerou cliente",
  closed: "Encerrado",
};

// ── Channel Status ──────────────────────────────────────────────────────────

export const CHANNEL_STATUSES = [
  "browser_contact_pending",
  "browser_contact_sent",
  "waiting_inbound_reply",
  "api_eligible",
  "api_active",
  "api_window_closed",
  "human_review_required",
  "do_not_contact",
  "blocked",
  "completed",
] as const;

export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  browser_contact_pending: "Aguardando contato",
  browser_contact_sent: "Contato enviado",
  waiting_inbound_reply: "Aguardando resposta",
  api_eligible: "API elegível",
  api_active: "API ativa",
  api_window_closed: "Janela expirada",
  human_review_required: "Revisão humana",
  do_not_contact: "Não contatar",
  blocked: "Bloqueado",
  completed: "Concluído",
};

// ── Lead Type ───────────────────────────────────────────────────────────────

export const LEAD_TYPES = ["client", "affiliate"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

// ── Detected Role ───────────────────────────────────────────────────────────

export const DETECTED_ROLES = ["owner", "employee", "manager", "unknown"] as const;
export type DetectedRole = (typeof DETECTED_ROLES)[number];

// ── Message Direction & Channel ─────────────────────────────────────────────

export const MESSAGE_DIRECTIONS = ["outbound", "inbound"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const MESSAGE_CHANNELS = ["browser", "api"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

// ── AI Intent Classification ────────────────────────────────────────────────

export const INTENT_TYPES = [
  "interested",
  "asked_info",
  "asked_pricing",
  "wants_whatsapp",
  "not_the_owner",
  "will_forward",
  "objection",
  "not_interested",
  "opt_out",
  "ambiguous",
  "needs_human",
] as const;

export type IntentType = (typeof INTENT_TYPES)[number];

// ── AI Action Types ─────────────────────────────────────────────────────────

export const ACTION_TYPES = [
  "reply",
  "ask_question",
  "present_offer",
  "handle_objection",
  "send_whatsapp_link",
  "wait",
  "schedule_followup",
  "close_conversation",
  "escalate_to_human",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

// ── Job Types ───────────────────────────────────────────────────────────────

export const JOB_TYPES = [
  "discover_profiles",
  "qualify_lead",
  "send_first_dm",
  "process_inbound",
  "follow_up",
  "health_check",
  "backup_database",
  "cleanup_dead_letter",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "dead_letter",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

// ── Experiment Status ───────────────────────────────────────────────────────

export const EXPERIMENT_STATUSES = [
  "draft",
  "running",
  "paused",
  "concluded",
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

// ── AI Call Purpose ─────────────────────────────────────────────────────────

export const AI_CALL_PURPOSES = [
  "score_icp",
  "draft_first_message",
  "classify_intent",
  "decide_action",
  "draft_reply",
  "qualify_profile",
] as const;

export type AiCallPurpose = (typeof AI_CALL_PURPOSES)[number];

// ── Circuit Breaker ─────────────────────────────────────────────────────────

export const CIRCUIT_BREAKER_SERVICES = [
  "instagram_browser",
  "instagram_api",
  "openai",
] as const;

export type CircuitBreakerService = (typeof CIRCUIT_BREAKER_SERVICES)[number];

export const CIRCUIT_BREAKER_STATES = ["closed", "open", "half_open"] as const;
export type CircuitBreakerState = (typeof CIRCUIT_BREAKER_STATES)[number];

// ── Audit Log ───────────────────────────────────────────────────────────────

export const AUDIT_ACTORS = ["system", "ai", "operator"] as const;
export type AuditActor = (typeof AUDIT_ACTORS)[number];

// ── Warmup Schedule ─────────────────────────────────────────────────────────

export function getWarmupLimit(daysSinceStart: number): number {
  if (daysSinceStart < 3) {
    return 10; // 10 DMs/dia nos 3 primeiros dias
  }
  const daysAfterWarmup = daysSinceStart - 3;
  const week = Math.floor(daysAfterWarmup / 7);
  return Math.min(15 + week * 5, 30); // Aumenta gradualmente a cada semana até o máximo de 30/dia
}
