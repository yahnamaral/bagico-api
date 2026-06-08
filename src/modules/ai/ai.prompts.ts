export const BAGIAI_SYSTEM_PROMPT = `Você é a BagiAI, uma consultora de marketing digital dentro do BagiCo Suite.
Seu papel é ajudar agências e equipes de marketing com copy, pautas, briefings, recomendação de canais e resumos operacionais.

Regras:
- Responda sempre em português do Brasil.
- Use linguagem profissional, clara e vendável.
- Não prometa resultados irreais, garantias absolutas ou números sem base.
- Seja objetiva, prática e orientada à execução.
- Retorne SEMPRE um JSON válido, sem markdown, sem texto fora do JSON.`;

export function buildGenerateCopyPrompt(input: Record<string, unknown>): string {
  return `Gere uma copy de marketing com base nos dados abaixo.

Dados:
${JSON.stringify(input, null, 2)}

Retorne JSON com esta estrutura exata:
{
  "headline": "string",
  "caption": "string",
  "cta": "string",
  "hashtags": ["string"],
  "variations": [
    {
      "headline": "string",
      "caption": "string",
      "cta": "string"
    }
  ]
}

Gere pelo menos 2 variações em "variations".
Adapte o tom e formato ao canal informado.`;
}

export function buildContentIdeasPrompt(
  input: Record<string, unknown>,
  quantity: number,
): string {
  return `Gere ${quantity} ideias de conteúdo práticas com base nos dados abaixo.

Dados:
${JSON.stringify(input, null, 2)}

Retorne JSON com esta estrutura exata:
{
  "ideas": [
    {
      "title": "string",
      "description": "string",
      "channel": "string",
      "format": "string",
      "hook": "string",
      "cta": "string"
    }
  ]
}

Gere exatamente ${quantity} ideias, distribuídas entre os canais informados quando fizer sentido.`;
}

export function buildImproveBriefingPrompt(input: Record<string, unknown>): string {
  return `Melhore o briefing abaixo e organize recomendações operacionais.

Dados:
${JSON.stringify(input, null, 2)}

Retorne JSON com esta estrutura exata:
{
  "improvedBriefing": "string",
  "missingQuestions": ["string"],
  "suggestedTasks": ["string"],
  "risks": ["string"],
  "nextSteps": ["string"]
}`;
}

export function buildRecommendChannelPrompt(
  input: Record<string, unknown>,
): string {
  return `Recomende canais de distribuição para o conteúdo descrito.

Dados:
${JSON.stringify(input, null, 2)}

Considere canais como Instagram, LinkedIn, TikTok, YouTube Shorts, E-mail e Blog.

Retorne JSON com esta estrutura exata:
{
  "primaryChannel": "string",
  "secondaryChannels": ["string"],
  "reasoning": "string",
  "suggestedFormat": "string",
  "distributionTips": ["string"]
}`;
}

export function buildTaskSummaryPrompt(
  taskContext: Record<string, unknown>,
): string {
  return `Gere um resumo operacional da tarefa abaixo.

Contexto da tarefa:
${JSON.stringify(taskContext, null, 2)}

Retorne JSON com esta estrutura exata:
{
  "summary": "string",
  "pendingItems": ["string"],
  "decisions": ["string"],
  "nextActions": ["string"],
  "risks": ["string"]
}`;
}
