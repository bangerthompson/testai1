export interface ServerConfig {
  host: string;
  port: number;
}

export interface CmsConfig {
  baseUrl: string;
  apiToken?: string;
  contentPath: string;
  healthPath: string;
}

export interface LlmConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  chatCompletionsPath: string;
}

export interface AssistantConfig {
  name: string;
  systemPrompt: string;
  maxContextItems: number;
}

export interface AppConfig {
  server: ServerConfig;
  cms: CmsConfig;
  llm: LlmConfig;
  assistant: AssistantConfig;
}

export interface ConfigStatus {
  ready: boolean;
  warnings: string[];
}

type Env = NodeJS.ProcessEnv;

const DEFAULT_SYSTEM_PROMPT =
  "You are a CMS assistant that helps draft, improve, and find content using the connected CMS context.";

export function loadConfig(env: Env = process.env): AppConfig {
  return {
    server: {
      host: envValue(env, "HOST") ?? "0.0.0.0",
      port: parsePositiveInteger(envValue(env, "PORT"), 3000, "PORT"),
    },
    cms: {
      baseUrl: normalizeBaseUrl(envValue(env, "CMS_BASE_URL") ?? "http://localhost:1337"),
      apiToken: envValue(env, "CMS_API_TOKEN"),
      contentPath: normalizePath(envValue(env, "CMS_CONTENT_PATH") ?? "/api/content"),
      healthPath: normalizePath(envValue(env, "CMS_HEALTH_PATH") ?? "/api/_health"),
    },
    llm: {
      apiKey: envValue(env, "LLM_API_KEY"),
      baseUrl: normalizeBaseUrl(envValue(env, "LLM_BASE_URL") ?? "https://api.openai.com/v1"),
      model: envValue(env, "LLM_MODEL") ?? "gpt-4o-mini",
      chatCompletionsPath: "/chat/completions",
    },
    assistant: {
      name: envValue(env, "ASSISTANT_NAME") ?? "CMS AI Assistant",
      systemPrompt: envValue(env, "ASSISTANT_SYSTEM_PROMPT") ?? DEFAULT_SYSTEM_PROMPT,
      maxContextItems: parsePositiveInteger(envValue(env, "ASSISTANT_MAX_CONTEXT_ITEMS"), 5, "ASSISTANT_MAX_CONTEXT_ITEMS"),
    },
  };
}

export function describeConfigStatus(config: AppConfig): ConfigStatus {
  const warnings: string[] = [];

  if (!config.cms.apiToken) {
    warnings.push("CMS_API_TOKEN is not set; only public CMS endpoints can be queried.");
  }

  if (!config.llm.apiKey) {
    warnings.push("LLM_API_KEY is not set; assistant responses will use initialization diagnostics only.");
  }

  return {
    ready: warnings.length === 0,
    warnings,
  };
}

export function publicConfig(config: AppConfig): Omit<AppConfig, "cms" | "llm"> & {
  cms: Omit<CmsConfig, "apiToken"> & { apiTokenConfigured: boolean };
  llm: Omit<LlmConfig, "apiKey"> & { apiKeyConfigured: boolean };
} {
  return {
    server: config.server,
    assistant: config.assistant,
    cms: {
      baseUrl: config.cms.baseUrl,
      contentPath: config.cms.contentPath,
      healthPath: config.cms.healthPath,
      apiTokenConfigured: Boolean(config.cms.apiToken),
    },
    llm: {
      baseUrl: config.llm.baseUrl,
      model: config.llm.model,
      chatCompletionsPath: config.llm.chatCompletionsPath,
      apiKeyConfigured: Boolean(config.llm.apiKey),
    },
  };
}

function envValue(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizePath(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}
