import type { AppConfig } from "./config.js";
import type { CmsClient, CmsContentItem } from "./cmsClient.js";

export interface AssistantRequest {
  query: string;
}

export interface AssistantResponse {
  assistant: string;
  answer: string;
  mode: "diagnostic" | "generated";
  context: CmsContentItem[];
  warnings: string[];
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

type Fetch = typeof fetch;

export class CmsAiAssistant {
  constructor(
    private readonly config: AppConfig,
    private readonly cmsClient: CmsClient,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  async answer(request: AssistantRequest): Promise<AssistantResponse> {
    const query = request.query.trim();

    if (!query) {
      throw new Error("query is required.");
    }

    const warnings: string[] = [];
    const context = await this.loadContext(query, warnings);

    if (!this.config.llm.apiKey) {
      warnings.push("LLM_API_KEY is not configured.");

      return {
        assistant: this.config.assistant.name,
        answer: diagnosticAnswer(this.config.assistant.name, context.length),
        mode: "diagnostic",
        context,
        warnings,
      };
    }

    const answer = await this.generateAnswer(query, context);

    return {
      assistant: this.config.assistant.name,
      answer,
      mode: "generated",
      context,
      warnings,
    };
  }

  private async loadContext(query: string, warnings: string[]): Promise<CmsContentItem[]> {
    try {
      return await this.cmsClient.searchContent(query, this.config.assistant.maxContextItems);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "CMS content request failed.");
      return [];
    }
  }

  private async generateAnswer(query: string, context: CmsContentItem[]): Promise<string> {
    const response = await this.fetchImpl(this.chatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.llm.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.llm.model,
        messages: [
          {
            role: "system",
            content: this.config.assistant.systemPrompt,
          },
          {
            role: "user",
            content: `CMS context:\n${formatContext(context)}\n\nUser request:\n${query}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("LLM response did not include assistant content.");
    }

    return content;
  }

  private chatCompletionsUrl(): URL {
    return new URL(this.config.llm.chatCompletionsPath, `${this.config.llm.baseUrl}/`);
  }
}

function diagnosticAnswer(assistantName: string, contextCount: number): string {
  return [
    `${assistantName} is initialized.`,
    `Loaded ${contextCount} CMS context item${contextCount === 1 ? "" : "s"}.`,
    "Set LLM_API_KEY to enable generated assistant responses.",
  ].join(" ");
}

function formatContext(context: CmsContentItem[]): string {
  if (context.length === 0) {
    return "No CMS context returned.";
  }

  return context
    .map((item, index) => {
      const parts = [`${index + 1}. ${item.title}`, `id: ${item.id}`];

      if (item.excerpt) {
        parts.push(`excerpt: ${item.excerpt}`);
      }

      if (item.url) {
        parts.push(`url: ${item.url}`);
      }

      return parts.join("\n");
    })
    .join("\n\n");
}
