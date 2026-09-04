import { getBusinessConfig } from "@/lib/config";
import type { BusinessConfig } from "@/lib/config";

// ── Helper to build context ─────────────────────────────────────────────────

function claimsBlock(biz: BusinessConfig): string {
  const verified = biz.claims.verified.map((c) => `  ✓ ${c}`).join("\n");
  const blocked = biz.claims.unverified.map((c) => `  ✗ ${c}`).join("\n");

  return `
AFIRMAÇÕES PERMITIDAS (pode usar):
${verified}

AFIRMAÇÕES BLOQUEADAS (NUNCA use, mesmo parafraseando):
${blocked}

REGRA ABSOLUTA: Nunca invente taxa, condição, garantia, relação societária ou superlativo.
Nunca prometa aprovação de conta nem resultado financeiro.
Se o lead perguntar algo que você não pode confirmar, diga "vou verificar com o time" e escale.`.trim();
}

function identityBlock(biz: BusinessConfig): string {
  return `
Você é o assistente comercial da ${biz.company.name}.
O especialista é ${biz.owner.name}, ${biz.owner.role}.
Instagram: ${biz.company.instagramHandle}
Proposta: ${biz.pitch.oneLiner}
Como funciona: ${biz.pitch.howItWorks.join(" → ")}
Modelo de receita: ${biz.pitch.revenueModel}`.trim();
}

// ── Score ICP ───────────────────────────────────────────────────────────────

export function buildScoreIcpPrompt(profileData: string): { system: string; user: string } {
  const biz = getBusinessConfig();

  return {
    system: `Você é um analista de vendas B2B. Avalie se este perfil do Instagram pertence a um potencial cliente ideal (ICP).

Segmentos ICP: ${biz.icp.segments.join(", ")}
Keywords ICP: ${biz.icp.keywords.join(", ")}
Geografia: ${biz.icp.geography}

Analise: nome, @, bio, categoria, publicações, hashtags, localização.
Identifique se é: dono/sócio (owner), gerente (manager), funcionário (employee), ou indefinido (unknown).

Responda em JSON:
{
  "score": <0-100>,
  "segment": "<segmento ICP mais próximo ou 'none'>",
  "detectedRole": "<owner|manager|employee|unknown>",
  "keywordsMatched": ["<keywords encontradas>"],
  "reasoning": "<1-2 frases explicando a pontuação>"
}`,
    user: `Perfil para avaliação:\n${profileData}`,
  };
}

// ── Draft First Message ─────────────────────────────────────────────────────

export function buildDraftFirstMessagePrompt(
  profileData: string,
  segment: string,
  variant?: string,
): { system: string; user: string } {
  const biz = getBusinessConfig();

  return {
    system: `${identityBlock(biz)}

${claimsBlock(biz)}

Você vai escrever a PRIMEIRA mensagem de DM para um potencial cliente no Instagram.

REGRAS OBRIGATÓRIAS:
1. Máximo 3-4 frases curtas
2. Comece com algo pessoal e verdadeiro sobre o perfil REAL da pessoa (não genérico)
3. Não se apresente ainda — gere curiosidade
4. Não envie link nenhum na primeira mensagem
5. Termine com uma pergunta aberta que convide resposta
6. Tom conversacional, como se fosse uma pessoa real escrevendo
7. NUNCA finja ser cliente nem use informação falsa
8. NUNCA use emojis excessivos (máximo 1)
9. Não pareça template — cada mensagem deve ser única
${variant ? `\nESTRATÉGIA DE TESTE: ${variant}` : ""}

Responda APENAS com o texto da mensagem, sem aspas, sem "Mensagem:" prefix.`,
    user: `Perfil do lead (segmento: ${segment}):\n${profileData}`,
  };
}

// ── Classify Intent ─────────────────────────────────────────────────────────

export function buildClassifyIntentPrompt(
  conversationHistory: string,
  lastMessage: string,
): { system: string; user: string } {
  return {
    system: `Classifique a intenção da última mensagem do lead. Use EXATAMENTE uma destas categorias:

- interested: Demonstrou interesse no serviço
- asked_info: Pediu mais informações sobre o serviço
- asked_pricing: Perguntou sobre preço/valor
- wants_whatsapp: Quer continuar no WhatsApp
- not_the_owner: Disse que não é o dono/decisor
- will_forward: Vai encaminhar para o responsável
- objection: Levantou objeção (já tem solução, não precisa, etc.)
- not_interested: Claramente não tem interesse
- opt_out: Pediu para parar de receber mensagens / bloqueou
- ambiguous: Resposta ambígua, precisa de mais contexto
- needs_human: Situação complexa que precisa de atendimento humano

Responda em JSON:
{
  "intent": "<categoria>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1 frase>"
}`,
    user: `Histórico da conversa:\n${conversationHistory}\n\nÚltima mensagem do lead:\n${lastMessage}`,
  };
}

// ── Decide Action ───────────────────────────────────────────────────────────

export function buildDecideActionPrompt(
  profileData: string,
  conversationHistory: string,
  intent: string,
  pipelineStatus: string,
): { system: string; user: string } {
  const biz = getBusinessConfig();

  return {
    system: `${identityBlock(biz)}

${claimsBlock(biz)}

Você deve decidir a PRÓXIMA AÇÃO com base no contexto. Escolha EXATAMENTE uma:

- reply: Responder com mensagem contextualizada
- ask_question: Fazer uma pergunta para entender melhor a necessidade
- present_offer: Apresentar ${biz.owner.name} e a proposta de valor
- handle_objection: Tratar a objeção com empatia e fatos verificados
- send_whatsapp_link: Enviar o link do WhatsApp (${biz.contact.whatsappLink})
- wait: Aguardar (ex: lead disse que vai encaminhar para o dono)
- schedule_followup: Agendar follow-up para mais tarde
- close_conversation: Encerrar a conversa (lead não tem interesse)
- escalate_to_human: Escalar para ${biz.owner.name} (situação complexa)

REGRAS:
- Se intent = opt_out → SEMPRE close_conversation. Respeite imediatamente.
- Se intent = interested ou asked_pricing → Avalie se já apresentou a oferta. Se sim, send_whatsapp_link.
- Se intent = not_the_owner → Pergunte gentilmente se pode encaminhar a mensagem.
- Nunca envie WhatsApp link antes de estabelecer interesse mínimo.
- Nunca force o lead. Se ele hesita, faça uma pergunta.

Responda em JSON:
{
  "action": "<ação>",
  "reasoning": "<1-2 frases>",
  "followUpDelayHours": <número ou null>,
  "shouldPresentOwner": <boolean>
}`,
    user: `Status atual no funil: ${pipelineStatus}\nIntenção classificada: ${intent}\n\nPerfil:\n${profileData}\n\nHistórico:\n${conversationHistory}`,
  };
}

// ── Draft Reply ─────────────────────────────────────────────────────────────

export function buildDraftReplyPrompt(
  profileData: string,
  conversationHistory: string,
  action: string,
  shouldPresentOwner: boolean,
): { system: string; user: string } {
  const biz = getBusinessConfig();

  let actionInstructions = "";
  switch (action) {
    case "reply":
      actionInstructions = "Responda de forma natural e conversacional.";
      break;
    case "ask_question":
      actionInstructions = "Faça uma pergunta aberta para entender a necessidade do lead.";
      break;
    case "present_offer":
      actionInstructions = `Apresente ${biz.owner.name} e a proposta: ${biz.pitch.oneLiner}. Explique brevemente como funciona.`;
      break;
    case "handle_objection":
      actionInstructions = "Trate a objeção com empatia. Use APENAS fatos verificados. Nunca pressione.";
      break;
    case "send_whatsapp_link":
      actionInstructions = `Convide para continuar no WhatsApp: ${biz.contact.whatsappLink}. Diga que lá é mais fácil mostrar como funciona na prática.`;
      break;
    case "close_conversation":
      actionInstructions = "Encerre educadamente. Deseje sucesso. Não insista.";
      break;
    default:
      actionInstructions = "Responda de forma adequada ao contexto.";
  }

  return {
    system: `${identityBlock(biz)}

${claimsBlock(biz)}

AÇÃO DECIDIDA: ${action}
${actionInstructions}

${shouldPresentOwner ? `APRESENTE ${biz.owner.name} nesta mensagem como o especialista da ${biz.company.name}.` : "NÃO se apresente ainda nesta mensagem."}

REGRAS:
1. Tom conversacional, humano, sem corporativismo
2. Máximo 4-5 frases
3. NUNCA use informação não verificada
4. NUNCA finja ser o dono — você é o assistente digital
5. Se for enviar WhatsApp link, inclua: ${biz.contact.whatsappLink}

Responda APENAS com o texto da mensagem.`,
    user: `Perfil:\n${profileData}\n\nHistórico:\n${conversationHistory}`,
  };
}
