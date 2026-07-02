import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import type { AIMessage, AIOptions, AIProvider, AIResponse, AIStreamChunk } from "@/types/ai";
import { DEFAULT_AI_MAX_TOKENS, DEFAULT_AI_TEMPERATURE } from "@/lib/constants";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly defaultModel = "gemini-1.5-pro";
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private toContents(messages: AIMessage[]): { system: string; contents: Content[] } {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents: Content[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    return { system, contents };
  }

  private getModel(options: AIOptions, system: string) {
    return this.client.getGenerativeModel({
      model: options.model || this.defaultModel,
      systemInstruction: system || undefined,
      generationConfig: {
        temperature: options.temperature ?? DEFAULT_AI_TEMPERATURE,
        maxOutputTokens: options.maxTokens ?? DEFAULT_AI_MAX_TOKENS,
      },
    });
  }

  async generate(messages: AIMessage[], options: AIOptions): Promise<AIResponse> {
    const { system, contents } = this.toContents(messages);
    const result = await this.getModel(options, system).generateContent({ contents });
    return {
      text: result.response.text(),
      tokensUsed: result.response.usageMetadata?.totalTokenCount ?? 0,
      model: options.model || this.defaultModel,
      provider: this.name,
    };
  }

  async *stream(messages: AIMessage[], options: AIOptions): AsyncGenerator<AIStreamChunk> {
    const { system, contents } = this.toContents(messages);
    const result = await this.getModel(options, system).generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { text, done: false };
      }
    }
    yield { text: "", done: true };
  }
}
