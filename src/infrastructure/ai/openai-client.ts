import OpenAI from "openai";
import { AppError } from "../../shared/errors/AppError";

let openaiClient: OpenAI | null = null;

export function getAiModel(): string {
  return process.env.AI_MODEL ?? "gpt-4o-mini";
}

export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AppError(
      "OPENAI_API_KEY não configurada.",
      503,
      "OPENAI_NOT_CONFIGURED",
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

export type GenerateAiJsonResult = {
  raw: string;
  model: string;
  tokensUsed: number | null;
};

export async function generateAiJsonResponse(
  systemPrompt: string,
  userPrompt: string,
): Promise<GenerateAiJsonResult> {
  const client = getOpenAiClient();
  const model = getAiModel();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    if (!raw) {
      throw new AppError(
        "A IA retornou uma resposta vazia.",
        502,
        "AI_EMPTY_RESPONSE",
      );
    }

    return {
      raw,
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Falha ao gerar resposta com a OpenAI.",
      502,
      "AI_PROVIDER_ERROR",
    );
  }
}

export function parseAiJsonResponse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim()) as T;
      } catch {
        // fall through
      }
    }

    throw new AppError(
      "A IA retornou JSON inválido. Tente novamente.",
      502,
      "AI_INVALID_RESPONSE",
    );
  }
}
