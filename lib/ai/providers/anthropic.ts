import Anthropic from "@anthropic-ai/sdk";
import type { AIMessage, AIOptions, AIProvider, AIResponse, AIStreamChunk } from "@/types/ai";
import { DEFAULT_AI_MAX_TOKENS, DEFAULT_AI_TEMPERATURE } from "@/lib/constants";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly defaultModel = "claude-sonnet-4-6";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private split(messages: AIMessage[]): {
    system: string;
    turns: { role: "user" | "assistant"; content: string }[];
  } {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns = messages
      .filter((m): m is AIMessage & { role: "user" | "assistant" } => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    return { system, turns };
  }

  async generate(messages: AIMessage[], options: AIOptions): Promise<AIResponse> {
    const { system, turns } = this.split(messages);
    const response = await this.client.messages.create({
      model: options.model || this.defaultModel,
      system: system || undefined,
      messages: turns,
      temperature: options.temperature ?? DEFAULT_AI_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_AI_MAX_TOKENS,
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model,
      provider: this.name,
    };
  }

  async *stream(messages: AIMessage[], options: AIOptions): AsyncGenerator<AIStreamChunk> {
    const { system, turns } = this.split(messages);
    const stream = this.client.messages.stream({
      model: options.model || this.defaultModel,
      system: system || undefined,
      messages: turns,
      temperature: options.temperature ?? DEFAULT_AI_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_AI_MAX_TOKENS,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { text: event.delta.text, done: false };
      }
    }
    yield { text: "", done: true };
  }
}
