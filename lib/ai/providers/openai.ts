import OpenAI from "openai";
import type { AIMessage, AIOptions, AIProvider, AIResponse, AIStreamChunk } from "@/types/ai";
import { DEFAULT_AI_MAX_TOKENS, DEFAULT_AI_TEMPERATURE } from "@/lib/constants";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly defaultModel = "gpt-4o";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(messages: AIMessage[], options: AIOptions): Promise<AIResponse> {
    const completion = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? DEFAULT_AI_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_AI_MAX_TOKENS,
    });
    return {
      text: completion.choices[0]?.message?.content ?? "",
      tokensUsed: completion.usage?.total_tokens ?? 0,
      model: completion.model,
      provider: this.name,
    };
  }

  async *stream(messages: AIMessage[], options: AIOptions): AsyncGenerator<AIStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? DEFAULT_AI_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_AI_MAX_TOKENS,
      stream: true,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        yield { text, done: false };
      }
    }
    yield { text: "", done: true };
  }
}
