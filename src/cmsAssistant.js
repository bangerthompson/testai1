const DEFAULT_CHANNELS = Object.freeze(["web", "email", "social"]);
const DEFAULT_CONTENT_TYPES = Object.freeze(["article", "page", "product", "campaign"]);
const DEFAULT_TONE = "clear, helpful, and brand-safe";

/**
 * Creates a deterministic CMS assistant facade that can later be connected to
 * an LLM provider without changing the CMS-facing contract.
 *
 * @param {object} options
 * @param {string} options.siteName
 * @param {string} [options.locale]
 * @param {string[]} [options.channels]
 * @param {string[]} [options.contentTypes]
 * @param {string} [options.tone]
 * @param {Array<object>} [options.initialContent]
 * @returns {object}
 */
export function createCmsAssistant(options) {
  const config = normalizeConfig(options);
  const content = new Map();

  for (const item of options.initialContent ?? []) {
    const normalized = normalizeContentItem(item);
    content.set(normalized.id, normalized);
  }

  return {
    describe() {
      return {
        siteName: config.siteName,
        locale: config.locale,
        channels: [...config.channels],
        contentTypes: [...config.contentTypes],
        tone: config.tone,
        contentCount: content.size
      };
    },

    addContent(item) {
      const normalized = normalizeContentItem(item);
      content.set(normalized.id, normalized);
      return normalized;
    },

    listContent(filter = {}) {
      const entries = [...content.values()];
      return entries.filter((item) => {
        if (filter.type && item.type !== filter.type) {
          return false;
        }

        if (filter.status && item.status !== filter.status) {
          return false;
        }

        if (filter.tag && !item.tags.includes(filter.tag)) {
          return false;
        }

        return true;
      });
    },

    suggestActions(request) {
      const normalizedRequest = normalizeText(request, "request");
      const activeContent = this.listContent({ status: "published" });
      const recommendations = [
        `Clarify the goal for "${normalizedRequest}" in ${config.locale}.`,
        `Choose one primary CMS content type: ${config.contentTypes.join(", ")}.`,
        `Prepare channel variants for ${config.channels.join(", ")}.`
      ];

      if (activeContent.length > 0) {
        recommendations.push(
          `Review ${activeContent.length} published item${activeContent.length === 1 ? "" : "s"} for reuse opportunities.`
        );
      }

      return recommendations;
    },

    createDraft(input) {
      const draftInput = normalizeDraftInput(input, config);
      const relatedContent = draftInput.sourceIds.map((id) => {
        const item = content.get(id);

        if (!item) {
          throw new Error(`Unknown source content id: ${id}`);
        }

        return item;
      });

      const prompt = buildPrompt(config, draftInput, relatedContent);
      const draft = buildDeterministicDraft(config, draftInput, relatedContent);

      return {
        prompt,
        draft
      };
    }
  };
}

function normalizeConfig(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("Assistant options are required.");
  }

  return {
    siteName: normalizeText(options.siteName, "siteName"),
    locale: options.locale ? normalizeText(options.locale, "locale") : "en-US",
    channels: normalizeStringList(options.channels, DEFAULT_CHANNELS, "channels"),
    contentTypes: normalizeStringList(options.contentTypes, DEFAULT_CONTENT_TYPES, "contentTypes"),
    tone: options.tone ? normalizeText(options.tone, "tone") : DEFAULT_TONE
  };
}

function normalizeContentItem(item) {
  if (!item || typeof item !== "object") {
    throw new TypeError("Content item must be an object.");
  }

  return {
    id: normalizeText(item.id, "content id"),
    title: normalizeText(item.title, "content title"),
    type: normalizeText(item.type, "content type"),
    status: item.status ? normalizeText(item.status, "content status") : "draft",
    summary: item.summary ? normalizeText(item.summary, "content summary") : "",
    tags: normalizeStringList(item.tags, [], "content tags")
  };
}

function normalizeDraftInput(input, config) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Draft input is required.");
  }

  const contentType = input.contentType ? normalizeText(input.contentType, "contentType") : config.contentTypes[0];

  if (!config.contentTypes.includes(contentType)) {
    throw new Error(`Unsupported content type "${contentType}". Supported types: ${config.contentTypes.join(", ")}.`);
  }

  return {
    topic: normalizeText(input.topic, "topic"),
    contentType,
    audience: input.audience ? normalizeText(input.audience, "audience") : "general audience",
    keywords: normalizeStringList(input.keywords, [], "keywords"),
    sourceIds: normalizeStringList(input.sourceIds, [], "sourceIds"),
    tone: input.tone ? normalizeText(input.tone, "draft tone") : config.tone
  };
}

function normalizeText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeStringList(value, fallback, fieldName) {
  if (value === undefined) {
    return [...fallback];
  }

  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array of strings.`);
  }

  const normalized = value.map((entry) => normalizeText(entry, fieldName));
  return [...new Set(normalized)];
}

function buildPrompt(config, draftInput, relatedContent) {
  const sourceContext = relatedContent.length === 0
    ? "No source content selected."
    : relatedContent
      .map((item) => `- ${item.title} (${item.type}, ${item.status}): ${item.summary || "No summary provided."}`)
      .join("\n");

  const keywordLine = draftInput.keywords.length === 0
    ? "No required keywords."
    : draftInput.keywords.join(", ");

  return [
    `You are the CMS AI assistant for ${config.siteName}.`,
    `Locale: ${config.locale}.`,
    `Create a ${draftInput.contentType} for ${draftInput.audience}.`,
    `Tone: ${draftInput.tone}.`,
    `Topic: ${draftInput.topic}.`,
    `Keywords: ${keywordLine}.`,
    "Source context:",
    sourceContext,
    "Return a concise title, summary, outline, and channel-specific publishing notes."
  ].join("\n");
}

function buildDeterministicDraft(config, draftInput, relatedContent) {
  const sourceNote = relatedContent.length === 0
    ? "Start from the topic brief."
    : `Reuse context from ${relatedContent.map((item) => `"${item.title}"`).join(", ")}.`;

  return {
    title: `${titleCase(draftInput.topic)} | ${config.siteName}`,
    summary: `A ${draftInput.tone} ${draftInput.contentType} for ${draftInput.audience} about ${draftInput.topic}.`,
    outline: [
      `Introduce the reader need around ${draftInput.topic}.`,
      sourceNote,
      "Explain the key CMS message in plain language.",
      "End with a clear next action."
    ],
    metadata: {
      locale: config.locale,
      contentType: draftInput.contentType,
      keywords: draftInput.keywords,
      channels: config.channels
    },
    publishingNotes: config.channels.map((channel) => ({
      channel,
      note: `Adapt the ${draftInput.contentType} for ${channel} while preserving the ${draftInput.tone} tone.`
    }))
  };
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}
