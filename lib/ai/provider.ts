import "server-only";
import type { AiSeoInput, AiSeoResult } from "@/types/video";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { MockProvider } from "@/lib/ai/providers/mock";
import { OpenAiProvider } from "@/lib/ai/providers/openai";

export interface AiProvider {
  readonly name: string;
  generateSeo(input: AiSeoInput): Promise<AiSeoResult>;
}

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider === "gemini") return new GeminiProvider();
  if (provider === "openai") return new OpenAiProvider();
  if (provider === "mock") return new MockProvider();
  throw new Error(`Unsupported AI provider: ${provider}`);
}

export async function generateSeoWithProvider(input: AiSeoInput): Promise<AiSeoResult> {
  return getAiProvider().generateSeo(input);
}
