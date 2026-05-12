const DEFAULT_BRAND_VOICE = [
  "clear",
  "helpful",
  "concise",
  "accessible"
];

const SUPPORTED_INTENTS = new Set([
  "draft",
  "improve",
  "summarize",
  "seo",
  "help"
]);

export class CmsAssistantError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "CmsAssistantError";
    this.code = options.code ?? "CMS_ASSISTANT_ERROR";
  }
}

export function createCmsAssistant(options = {}) {
  const config = normalizeConfig(options);
  const provider = config.provider;

  return {
    config: snapshotConfig(config),
    async respond(request) {
      const normalizedRequest = normalizeRequest(request);
      const prompt = buildAssistantPrompt(normalizedRequest, config);

      if (provider) {
        const response = await provider.complete({
          prompt,
          request: normalizedRequest,
          config: snapshotConfig(config)
        });

        return normalizeProviderResponse(response, normalizedRequest, prompt);
      }

      return createDeterministicResponse(normalizedRequest, config, prompt);
    }
  };
}

export function buildAssistantPrompt(request, config = {}) {
  const normalizedConfig = normalizeConfig(config);
  const normalizedRequest = normalizeRequest(request);
  const contentType = normalizedRequest.contentType ?? "general CMS content";
  const audience = normalizedRequest.audience ?? "site visitors";
  const brandVoice = normalizedConfig.brandVoice.join(", ");
  const constraints = normalizedConfig.constraints.length > 0
    ? normalizedConfig.constraints.map((item) => `- ${item}`).join("\n")
    : "- Follow the channel, audience, and content type requirements.";

  return [
    "You are a CMS AI assistant embedded in an editorial workflow.",
    `Intent: ${normalizedRequest.intent}`,
    `Content type: ${contentType}`,
    `Audience: ${audience}`,
    `Brand voice: ${brandVoice}`,
    "Editorial constraints:",
    constraints,
    "",
    "User request:",
    normalizedRequest.input,
    "",
    "Return practical CMS-ready output. Include assumptions only when needed."
  ].join("\n");
}

function normalizeConfig(options) {
  if (options == null || typeof options !== "object" || Array.isArray(options)) {
    throw new CmsAssistantError("Assistant options must be an object.", {
      code: "INVALID_OPTIONS"
    });
  }

  return {
    brandVoice: normalizeStringList(options.brandVoice, DEFAULT_BRAND_VOICE),
    constraints: normalizeStringList(options.constraints, []),
    provider: options.provider
  };
}

function normalizeRequest(request) {
  if (typeof request === "string") {
    return {
      input: request.trim(),
      intent: "draft",
      contentType: undefined,
      audience: undefined
    };
  }

  if (request == null || typeof request !== "object" || Array.isArray(request)) {
    throw new CmsAssistantError("Assistant request must be a string or object.", {
      code: "INVALID_REQUEST"
    });
  }

  const input = normalizeRequiredString(request.input, "input");
  const intent = normalizeIntent(request.intent ?? "draft");

  return {
    input,
    intent,
    contentType: normalizeOptionalString(request.contentType),
    audience: normalizeOptionalString(request.audience)
  };
}

function normalizeProviderResponse(response, request, prompt) {
  const content = typeof response === "string"
    ? response.trim()
    : normalizeRequiredString(response?.content, "provider response content");

  return {
    content,
    intent: request.intent,
    source: "provider",
    prompt
  };
}

function createDeterministicResponse(request, config, prompt) {
  const contentType = request.contentType ?? "content";
  const audience = request.audience ?? "your audience";
  const voice = config.brandVoice.slice(0, 3).join(", ");

  const contentByIntent = {
    draft: [
      `Draft ${contentType} for ${audience}`,
      "",
      `Use a ${voice} voice to address: ${request.input}`,
      "",
      "Suggested structure:",
      "1. Lead with the primary user benefit.",
      "2. Add the essential details an editor must confirm.",
      "3. Close with a clear next step or call to action."
    ],
    improve: [
      `Editorial improvement plan for ${contentType}`,
      "",
      `Goal: make the content more ${voice}.`,
      "",
      "Recommended edits:",
      `- Clarify the core message in: ${request.input}`,
      "- Remove duplicated phrasing and tighten long sentences.",
      "- Add CMS metadata such as title, summary, tags, and CTA when relevant."
    ],
    summarize: [
      `Summary for ${audience}`,
      "",
      `The content is about: ${request.input}`,
      "",
      "CMS-ready summary:",
      `A concise ${contentType} summary should highlight the main topic, audience value, and next action.`
    ],
    seo: [
      `SEO recommendations for ${contentType}`,
      "",
      `Topic: ${request.input}`,
      "",
      "Metadata starter:",
      `- Title: ${titleCase(request.input).slice(0, 60)}`,
      `- Description: Explain the value of ${request.input} for ${audience}.`,
      "- Suggested tags: cms, content, editorial"
    ],
    help: [
      "CMS AI assistant help",
      "",
      "Supported intents: draft, improve, summarize, seo, help.",
      "Provide input, contentType, audience, and optional brand voice constraints."
    ]
  };

  return {
    content: contentByIntent[request.intent].join("\n"),
    intent: request.intent,
    source: "deterministic",
    prompt
  };
}

function normalizeIntent(intent) {
  const normalized = normalizeRequiredString(intent, "intent").toLowerCase();

  if (!SUPPORTED_INTENTS.has(normalized)) {
    throw new CmsAssistantError(
      `Unsupported intent "${intent}". Supported intents: ${Array.from(SUPPORTED_INTENTS).join(", ")}.`,
      { code: "UNSUPPORTED_INTENT" }
    );
  }

  return normalized;
}

function normalizeStringList(value, fallback) {
  if (value == null) {
    return [...fallback];
  }

  const items = Array.isArray(value) ? value : [value];
  const normalized = items
    .map((item) => String(item).trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeRequiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CmsAssistantError(`Assistant ${name} must be a non-empty string.`, {
      code: "INVALID_STRING"
    });
  }

  return value.trim();
}

function normalizeOptionalString(value) {
  if (value == null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function snapshotConfig(config) {
  return {
    brandVoice: [...config.brandVoice],
    constraints: [...config.constraints],
    hasProvider: Boolean(config.provider)
  };
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
