import Groq from "groq-sdk";
import type { AIMessage, AIOptions, AIProvider, AIResponse, AIStreamChunk } from "@/types/ai";
import {
  AIProviderName,
  DEFAULT_AI_MAX_TOKENS,
  DEFAULT_AI_TEMPERATURE,
  defaultModelFor,
} from "@/lib/constants";

export class GroqProvider implements AIProvider {
  readonly name = "groq";
  readonly defaultModel = defaultModelFor(AIProviderName.Groq);
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
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
