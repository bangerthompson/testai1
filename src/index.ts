export type AssistantRole = "system" | "user" | "assistant";

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
}

export interface AssistantRequest {
  messages: AssistantMessage[];
  context: CmsAssistantContext;
}

export interface AssistantProvider {
  complete(request: AssistantRequest): Promise<AssistantMessage>;
}

export interface CmsContentType {
  id: string;
  label: string;
  fields: string[];
}

export interface CmsAssistantContext {
  siteName: string;
  locale: string;
  contentTypes: CmsContentType[];
}

export interface CmsAssistantConfig {
  provider: AssistantProvider;
  context: CmsAssistantContext;
  systemPrompt?: string;
}

export interface CmsAssistant {
  context: CmsAssistantContext;
  buildSystemPrompt(): string;
  sendMessage(message: string, history?: AssistantMessage[]): Promise<AssistantMessage>;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are a CMS assistant. Help editors create, revise, and organize content using the provided CMS context.";

export function initializeCmsAssistant(config: CmsAssistantConfig): CmsAssistant {
  validateConfig(config);

  const context = normalizeContext(config.context);
  const systemPrompt = config.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

  return {
    context,
    buildSystemPrompt() {
      return [
        systemPrompt,
        "",
        `Site: ${context.siteName}`,
        `Locale: ${context.locale}`,
        "Content types:",
        ...context.contentTypes.map((type) => {
          const fields = type.fields.length > 0 ? type.fields.join(", ") : "no configured fields";
          return `- ${type.label} (${type.id}): ${fields}`;
        }),
      ].join("\n");
    },
    async sendMessage(message, history = []) {
      const trimmedMessage = message.trim();

      if (!trimmedMessage) {
        throw new Error("Message is required.");
      }

      return config.provider.complete({
        context,
        messages: [
          {
            role: "system",
            content: this.buildSystemPrompt(),
          },
          ...history,
          {
            role: "user",
            content: trimmedMessage,
          },
        ],
      });
    },
  };
}

function validateConfig(config: CmsAssistantConfig): void {
  if (!config || typeof config !== "object") {
    throw new Error("CMS assistant config is required.");
  }

  if (!config.provider || typeof config.provider.complete !== "function") {
    throw new Error("CMS assistant provider with a complete() method is required.");
  }

  if (!config.context || typeof config.context !== "object") {
    throw new Error("CMS assistant context is required.");
  }

  if (!config.context.siteName?.trim()) {
    throw new Error("CMS assistant context requires a siteName.");
  }

  if (!config.context.locale?.trim()) {
    throw new Error("CMS assistant context requires a locale.");
  }

  if (!Array.isArray(config.context.contentTypes)) {
    throw new Error("CMS assistant context requires contentTypes.");
  }
}

function normalizeContext(context: CmsAssistantContext): CmsAssistantContext {
  return {
    siteName: context.siteName.trim(),
    locale: context.locale.trim(),
    contentTypes: context.contentTypes.map(normalizeContentType),
  };
}

function normalizeContentType(contentType: CmsContentType): CmsContentType {
  if (!contentType.id?.trim()) {
    throw new Error("CMS content type requires an id.");
  }

  if (!contentType.label?.trim()) {
    throw new Error("CMS content type requires a label.");
  }

  if (!Array.isArray(contentType.fields)) {
    throw new Error(`CMS content type "${contentType.id}" requires fields.`);
  }

  return {
    id: contentType.id.trim(),
    label: contentType.label.trim(),
    fields: contentType.fields.map((field) => field.trim()).filter(Boolean),
  };
}
