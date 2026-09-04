import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getEnvConfig } from "@/lib/config";
import { BudgetExceededError } from "@/lib/errors";
import { querySql, execSql } from "@/db/connection";
import type { AiCallPurpose } from "@/lib/types";

let _openaiClient: OpenAI | null = null;
let _geminiClient: GoogleGenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_openaiClient) return _openaiClient;
  const env = getEnvConfig();
  _openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openaiClient;
}

function getGeminiClient(): GoogleGenAI {
  if (_geminiClient) return _geminiClient;
  const env = getEnvConfig();
  _geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return _geminiClient;
}

function isGeminiEnabled(): boolean {
  const env = getEnvConfig();
  return !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5;
}

// ── Cost Estimation ─────────────────────────────────────────────────────────

const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "gemini-2.5-pro": { input: 1.25, output: 5.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_MILLION[model] ?? { input: 0.1, output: 0.3 };
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000;
}

// ── Budget Check ────────────────────────────────────────────────────────────

export async function getMonthlySpend(): Promise<number> {
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const result = await querySql(
    `SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM ai_calls WHERE created_at >= ?`,
    [monthStart]
  );

  return (result.rows[0]?.total as number) ?? 0;
}

async function checkBudget(): Promise<void> {
  const env = getEnvConfig();
  const spent = await getMonthlySpend();
  if (spent >= env.OPENAI_MONTHLY_BUDGET_USD) {
    throw new BudgetExceededError(spent, env.OPENAI_MONTHLY_BUDGET_USD);
  }
}

// ── Record AI Call ──────────────────────────────────────────────────────────

async function recordCall(
  model: string,
  promptTokens: number,
  completionTokens: number,
  purpose: AiCallPurpose,
  leadId?: string,
  conversationId?: string,
): Promise<void> {
  const cost = estimateCost(model, promptTokens, completionTokens);

  await execSql(
    `INSERT INTO ai_calls (id, lead_id, conversation_id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, purpose)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      leadId ?? null,
      conversationId ?? null,
      model,
      promptTokens,
      completionTokens,
      promptTokens + completionTokens,
      cost,
      purpose,
    ]
  );
}

// ── Chat Completion ─────────────────────────────────────────────────────────

export interface ChatOptions {
  model?: "default" | "fast";
  purpose: AiCallPurpose;
  leadId?: string;
  conversationId?: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
}

export interface ChatResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
  await checkBudget();
  const env = getEnvConfig();

  if (isGeminiEnabled()) {
    const client = getGeminiClient();
    const model = options.model === "fast" ? "gemini-2.5-flash" : "gemini-2.5-pro";

    const response = await client.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: options.userMessage }] }
      ],
      config: {
        systemInstruction: options.systemPrompt,
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
        responseMimeType: options.responseMimeType,
      }
    });

    const content = response.text || "";
    const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    const cost = estimateCost(model, promptTokens, completionTokens);

    await recordCall(model, promptTokens, completionTokens, options.purpose, options.leadId, options.conversationId);

    return { content, model, promptTokens, completionTokens, estimatedCost: cost };
  } else {
    const client = getOpenAIClient();
    const model = options.model === "fast" ? env.OPENAI_MODEL_FAST : env.OPENAI_MODEL;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userMessage },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
    });

    const choice = response.choices[0];
    const content = choice?.message?.content ?? "";
    const usage = response.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const cost = estimateCost(model, promptTokens, completionTokens);

    await recordCall(model, promptTokens, completionTokens, options.purpose, options.leadId, options.conversationId);

    return { content, model, promptTokens, completionTokens, estimatedCost: cost };
  }
}

// ── Structured Output (JSON) ────────────────────────────────────────────────

export async function chatJson<T>(options: ChatOptions & { schema?: string }): Promise<T & { _meta: { model: string; cost: number } }> {
  const systemPrompt = options.schema
    ? `${options.systemPrompt}\n\nRespond ONLY with valid JSON matching this schema:\n${options.schema}`
    : `${options.systemPrompt}\n\nRespond ONLY with valid JSON.`;

  const result = await chat({
    ...options,
    systemPrompt,
    temperature: options.temperature ?? 0.2,
    responseMimeType: isGeminiEnabled() ? "application/json" : undefined,
  });

  try {
    let cleaned = result.content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(cleaned) as T;
    return { ...parsed, _meta: { model: result.model, cost: result.estimatedCost } };
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${result.content.slice(0, 200)}`);
  }
}
