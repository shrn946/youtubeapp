import "server-only";
import type { AiProvider } from "@/lib/ai/provider";
import type { AiSeoInput, AiSeoResult } from "@/types/video";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  async generateSeo(_input: AiSeoInput): Promise<AiSeoResult> {
    throw new Error("The OpenAI provider is not implemented yet.");
  }
}
