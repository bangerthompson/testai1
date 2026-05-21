export const DEFAULT_CONTENT_TYPES = Object.freeze([
  "article",
  "landing-page",
  "product-page",
  "email",
  "social-post"
]);

export const DEFAULT_ASSISTANT_CONFIG = Object.freeze({
  assistantName: "CMS AI Assistant",
  brandVoice: "clear, helpful, and concise",
  locale: "en-US",
  maxDraftWords: 600,
  contentTypes: DEFAULT_CONTENT_TYPES
});

const REQUIRED_BRIEF_FIELDS = Object.freeze(["title", "audience", "goal"]);

export function createCmsAiAssistant(options = {}) {
  const config = normalizeConfig(options);

  return Object.freeze({
    config,
    isReady: true,
    createSystemPrompt() {
      return [
        `You are ${config.assistantName}, an editorial assistant embedded in a CMS.`,
        `Write in a ${config.brandVoice} brand voice for ${config.locale} audiences.`,
        `Supported content types: ${config.contentTypes.join(", ")}.`,
        "Prioritize factual accuracy, accessible language, clear structure, and editorial review before publishing."
      ].join(" ");
    },
    createContentBrief(input) {
      return createContentBrief(input, config);
    },
    draftFromBrief(brief) {
      return draftFromBrief(brief, config);
    }
  });
}

function normalizeConfig(options) {
  const contentTypes = normalizeContentTypes(options.contentTypes);

  return Object.freeze({
    assistantName: normalizeText(options.assistantName, DEFAULT_ASSISTANT_CONFIG.assistantName),
    brandVoice: normalizeText(options.brandVoice, DEFAULT_ASSISTANT_CONFIG.brandVoice),
    locale: normalizeText(options.locale, DEFAULT_ASSISTANT_CONFIG.locale),
    maxDraftWords: normalizePositiveInteger(options.maxDraftWords, DEFAULT_ASSISTANT_CONFIG.maxDraftWords),
    contentTypes
  });
}

function createContentBrief(input, config) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Content brief input must be an object.");
  }

  const missingFields = REQUIRED_BRIEF_FIELDS.filter((field) => !hasMeaningfulValue(input[field]));

  if (missingFields.length > 0) {
    throw new Error(`Missing required content brief field(s): ${missingFields.join(", ")}.`);
  }

  const contentType = normalizeText(input.contentType, config.contentTypes[0]);

  if (!config.contentTypes.includes(contentType)) {
    throw new Error(
      `Unsupported content type "${contentType}". Supported types: ${config.contentTypes.join(", ")}.`
    );
  }

  return Object.freeze({
    title: input.title.trim(),
    audience: input.audience.trim(),
    goal: input.goal.trim(),
    contentType,
    keywords: normalizeKeywords(input.keywords),
    tone: normalizeText(input.tone, config.brandVoice),
    locale: normalizeText(input.locale, config.locale),
    constraints: normalizeList(input.constraints)
  });
}

function draftFromBrief(brief, config) {
  const normalizedBrief = createContentBrief(brief, config);
  const keywordLine =
    normalizedBrief.keywords.length > 0
      ? `Include these keywords naturally: ${normalizedBrief.keywords.join(", ")}.`
      : "Use keywords only when they are provided by an editor.";
  const constraintLine =
    normalizedBrief.constraints.length > 0
      ? `Editorial constraints: ${normalizedBrief.constraints.join("; ")}.`
      : "Flag any missing facts or claims that need editorial verification.";

  return [
    `Draft a ${normalizedBrief.contentType} titled "${normalizedBrief.title}".`,
    `Audience: ${normalizedBrief.audience}.`,
    `Goal: ${normalizedBrief.goal}.`,
    `Tone: ${normalizedBrief.tone}. Locale: ${normalizedBrief.locale}.`,
    `Target length: no more than ${config.maxDraftWords} words.`,
    keywordLine,
    constraintLine
  ].join("\n");
}

function normalizeContentTypes(contentTypes) {
  const normalized = normalizeList(contentTypes);

  if (normalized.length === 0) {
    return DEFAULT_CONTENT_TYPES;
  }

  return Object.freeze([...new Set(normalized)]);
}

function normalizeKeywords(keywords) {
  return normalizeList(keywords).map((keyword) => keyword.toLowerCase());
}

function normalizeList(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value, fallback) {
  if (!hasMeaningfulValue(value)) {
    return fallback;
  }

  return String(value).trim();
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return fallback;
  }

  return number;
}

function hasMeaningfulValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}
