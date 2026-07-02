export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  text: string;
  tokensUsed: number;
  model: string;
  provider: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  generate(messages: AIMessage[], options: AIOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options: AIOptions): AsyncGenerator<AIStreamChunk>;
}

export interface ResolvedAIProvider {
  provider: AIProvider;
  model: string;
  source: "user" | "admin" | "fallback";
}
