import { chat, chatJson } from "./client";
import {
  buildClassifyIntentPrompt,
  buildDecideActionPrompt,
  buildDraftReplyPrompt,
  buildDraftFirstMessagePrompt,
  buildScoreIcpPrompt,
} from "./prompts";
import type { IntentType, ActionType } from "@/lib/types";

// ── Types ───────────────────────────────────────────────────────────────────

interface IcpScoreResult {
  score: number;
  segment: string;
  detectedRole: "owner" | "manager" | "employee" | "unknown";
  keywordsMatched: string[];
  reasoning: string;
}

interface IntentResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
}

interface ActionResult {
  action: ActionType;
  reasoning: string;
  followUpDelayHours: number | null;
  shouldPresentOwner: boolean;
}

interface ConversationTurn {
  intent: IntentResult;
  action: ActionResult;
  reply: string | null;
  newPipelineStatus: string | null;
}

function fallbackScoreIcp(profileData: string): IcpScoreResult {
  let data: any = {};
  try { data = JSON.parse(profileData); } catch {}
  const text = `${data.name || ''} ${data.bio || ''} ${data.handle || ''} ${data.username || ''}`.toLowerCase();
  
  let score = 20;
  let segment = "Outro";
  let detectedRole: "owner" | "manager" | "employee" | "unknown" = "unknown";
  const matched: string[] = [];

  if (/dentist|odonto|cro|dente|sorriso|invisalign/i.test(text)) {
    score = 85;
    segment = "Clínica odontológica";
    matched.push("odontologia");
    detectedRole = /dr\.|dra\.|cirurgi/i.test(text) ? "owner" : "manager";
  } else if (/médic|medico|crm|doutor|dra\.|pediatra|dermatolog|cirurgi/i.test(text)) {
    score = 80;
    segment = "Clínica médica";
    matched.push("medicina");
    detectedRole = /dr\.|dra\./i.test(text) ? "owner" : "manager";
  } else if (/estétic|harmoniz|botox|preenchimento|biomedic/i.test(text)) {
    score = 80;
    segment = "Clínica de estética";
    matched.push("estetica");
    detectedRole = "owner";
  }

  return {
    score,
    segment,
    detectedRole,
    keywordsMatched: matched,
    reasoning: "Classificação automática por inteligência contextual baseada em termos da bio.",
  };
}

function fallbackDraftFirstMessage(profileData: string, segment: string): string {
  let data: any = {};
  try { data = JSON.parse(profileData); } catch {}
  
  const rawFullName = data.name || "";
  const isDr = /^(dr\.|dr\b)/i.test(rawFullName);
  const isDra = /^(dra\.|dra\b)/i.test(rawFullName);
  
  const cleanFirst = rawFullName
    .replace(/^(dr\.|dra\.|dr|dra)\s+/i, "")
    .trim()
    .split(" ")[0]
    .replace(/[^a-zA-ZáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ]/g, "");

  let greeting = "Olá!";
  if (isDra && cleanFirst) {
    greeting = `Olá Dra. ${cleanFirst}!`;
  } else if (isDr && cleanFirst) {
    greeting = `Olá Dr. ${cleanFirst}!`;
  } else if (cleanFirst) {
    greeting = `Olá ${cleanFirst}!`;
  }

  if (segment.toLowerCase().includes("odonto")) {
    return `${greeting} Tudo bem? Vi seu trabalho aqui no Instagram. Uma dúvida rápida: vocês mesmos cuidam do agendamento dos pacientes pelo WhatsApp ou têm equipe dedicada pra isso?`;
  }
  if (segment.toLowerCase().includes("estétic") || segment.toLowerCase().includes("estetica")) {
    return `${greeting} Tudo bem? Acompanhei a clínica por aqui. Vocês já usam algum sistema inteligente pra filtrar e agendar avaliações no WhatsApp ou fazem tudo manual?`;
  }
  return `${greeting} Tudo bem? Acompanhei o perfil de vocês por aqui. Hoje o agendamento de consultas da clínica pelo WhatsApp é feito de forma manual ou já têm automação integrada?`;
}

// ── Profile Scoring ─────────────────────────────────────────────────────────

export async function scoreIcp(
  profileData: string,
  leadId?: string,
): Promise<IcpScoreResult> {
  try {
    const prompt = buildScoreIcpPrompt(profileData);

    const result = await chatJson<IcpScoreResult>({
      model: "fast",
      purpose: "score_icp",
      leadId,
      systemPrompt: prompt.system,
      userMessage: prompt.user,
      temperature: 0.2,
    });

    return {
      score: Math.min(100, Math.max(0, result.score)),
      segment: result.segment,
      detectedRole: result.detectedRole,
      keywordsMatched: result.keywordsMatched ?? [],
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.warn("[CONVERSATION-ENGINE] Using fallback ICP scoring:", (error as Error).message);
    return fallbackScoreIcp(profileData);
  }
}

// ── First Message Drafting ──────────────────────────────────────────────────

export async function draftFirstMessage(
  profileData: string,
  segment: string,
  leadId?: string,
  variant?: string,
): Promise<string> {
  try {
    const prompt = buildDraftFirstMessagePrompt(profileData, segment, variant);

    const result = await chat({
      model: "default",
      purpose: "draft_first_message",
      leadId,
      systemPrompt: prompt.system,
      userMessage: prompt.user,
      temperature: 0.8, // Higher creativity for unique messages
      maxTokens: 300,
    });

    return result.content.trim();
  } catch (error) {
    console.warn("[CONVERSATION-ENGINE] Using fallback DM drafting:", (error as Error).message);
    return fallbackDraftFirstMessage(profileData, segment);
  }
}

// ── Intent Classification ───────────────────────────────────────────────────

export async function classifyIntent(
  conversationHistory: string,
  lastMessage: string,
  leadId?: string,
  conversationId?: string,
): Promise<IntentResult> {
  const prompt = buildClassifyIntentPrompt(conversationHistory, lastMessage);

  const result = await chatJson<IntentResult>({
    model: "fast",
    purpose: "classify_intent",
    leadId,
    conversationId,
    systemPrompt: prompt.system,
    userMessage: prompt.user,
    temperature: 0.1,
  });

  return {
    intent: result.intent,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

// ── Action Decision ─────────────────────────────────────────────────────────

export async function decideAction(
  profileData: string,
  conversationHistory: string,
  intent: string,
  pipelineStatus: string,
  leadId?: string,
  conversationId?: string,
): Promise<ActionResult> {
  const prompt = buildDecideActionPrompt(profileData, conversationHistory, intent, pipelineStatus);

  const result = await chatJson<ActionResult>({
    model: "default",
    purpose: "decide_action",
    leadId,
    conversationId,
    systemPrompt: prompt.system,
    userMessage: prompt.user,
    temperature: 0.3,
  });

  return {
    action: result.action,
    reasoning: result.reasoning,
    followUpDelayHours: result.followUpDelayHours ?? null,
    shouldPresentOwner: result.shouldPresentOwner ?? false,
  };
}

// ── Draft Reply ─────────────────────────────────────────────────────────────

export async function draftReply(
  profileData: string,
  conversationHistory: string,
  action: string,
  shouldPresentOwner: boolean,
  leadId?: string,
  conversationId?: string,
): Promise<string> {
  const prompt = buildDraftReplyPrompt(profileData, conversationHistory, action, shouldPresentOwner);

  const result = await chat({
    model: "default",
    purpose: "draft_reply",
    leadId,
    conversationId,
    systemPrompt: prompt.system,
    userMessage: prompt.user,
    temperature: 0.7,
    maxTokens: 400,
  });

  return result.content.trim();
}

// ── Full Conversation Turn ──────────────────────────────────────────────────
// Orchestrates: classify → decide → draft (if needed)

export async function processConversationTurn(
  profileData: string,
  conversationHistory: string,
  lastInboundMessage: string,
  pipelineStatus: string,
  leadId: string,
  conversationId: string,
): Promise<ConversationTurn> {
  // 1. Classify intent
  const intent = await classifyIntent(
    conversationHistory,
    lastInboundMessage,
    leadId,
    conversationId,
  );

  // 2. Handle immediate opt-out
  if (intent.intent === "opt_out") {
    return {
      intent,
      action: {
        action: "close_conversation",
        reasoning: "Lead solicitou parar de receber mensagens",
        followUpDelayHours: null,
        shouldPresentOwner: false,
      },
      reply: null, // Mark do_not_contact, no reply needed
      newPipelineStatus: "closed",
    };
  }

  // 3. Decide action
  const action = await decideAction(
    profileData,
    conversationHistory,
    intent.intent,
    pipelineStatus,
    leadId,
    conversationId,
  );

  // 4. Draft reply (if action requires one)
  let reply: string | null = null;
  const actionsRequiringReply: ActionType[] = [
    "reply",
    "ask_question",
    "present_offer",
    "handle_objection",
    "send_whatsapp_link",
    "close_conversation",
  ];

  if (actionsRequiringReply.includes(action.action as ActionType)) {
    reply = await draftReply(
      profileData,
      conversationHistory,
      action.action,
      action.shouldPresentOwner,
      leadId,
      conversationId,
    );
  }

  // 5. Determine pipeline status transition
  let newPipelineStatus: string | null = null;
  switch (intent.intent) {
    case "interested":
    case "asked_info":
    case "asked_pricing":
      newPipelineStatus = "interested";
      break;
    case "wants_whatsapp":
      newPipelineStatus = "whatsapp_handoff";
      break;
    case "not_interested":
      newPipelineStatus = "closed";
      break;
    default:
      // Keep current status for ambiguous/will_forward/etc.
      newPipelineStatus = null;
  }

  return { intent, action, reply, newPipelineStatus };
}
