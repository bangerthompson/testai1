import type { CmsConfig } from "./config.js";

export interface CmsContentItem {
  id: string;
  title: string;
  excerpt?: string;
  url?: string;
  source?: string;
}

export interface CmsHealth {
  ok: boolean;
  status: number;
  statusText: string;
}

type Fetch = typeof fetch;

export class CmsClient {
  constructor(
    private readonly config: CmsConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  async health(): Promise<CmsHealth> {
    const response = await this.fetchImpl(this.urlFor(this.config.healthPath), {
      headers: this.headers(),
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  }

  async searchContent(query: string, limit: number): Promise<CmsContentItem[]> {
    const url = this.urlFor(this.config.contentPath);
    url.searchParams.set("search", query);
    url.searchParams.set("limit", String(limit));

    const response = await this.fetchImpl(url, {
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`CMS content request failed with ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    return normalizeContentPayload(payload).slice(0, limit);
  }

  private urlFor(path: string): URL {
    return new URL(path, `${this.config.baseUrl}/`);
  }

  private headers(): HeadersInit {
    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (this.config.apiToken) {
      headers.Authorization = `Bearer ${this.config.apiToken}`;
    }

    return headers;
  }
}

function normalizeContentPayload(payload: unknown): CmsContentItem[] {
  const values = unwrapCollection(payload);

  return values.map((value, index) => toContentItem(value, index));
}

function unwrapCollection(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [payload.data, payload.items, payload.results, payload.entries];
  const collection = candidates.find(Array.isArray);

  return collection ?? [];
}

function toContentItem(value: unknown, index: number): CmsContentItem {
  if (!isRecord(value)) {
    return {
      id: String(index),
      title: String(value),
    };
  }

  const attributes = isRecord(value.attributes) ? value.attributes : value;
  const id = firstString(value.id, attributes.id, attributes.slug, index);
  const title = firstString(attributes.title, attributes.name, attributes.slug, `Untitled ${index + 1}`);
  const excerpt = firstString(attributes.excerpt, attributes.summary, attributes.description, attributes.body);
  const url = firstString(attributes.url, attributes.href, attributes.permalink);
  const source = firstString(attributes.source, attributes.collection, attributes.type);

  return {
    id,
    title,
    ...(excerpt ? { excerpt } : {}),
    ...(url ? { url } : {}),
    ...(source ? { source } : {}),
  };
}

function firstString(...values: unknown[]): string {
  const match = values.find((value) => typeof value === "string" || typeof value === "number");
  return String(match ?? "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
