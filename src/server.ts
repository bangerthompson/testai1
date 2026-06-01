import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { CmsAiAssistant } from "./assistant.js";
import { CmsClient } from "./cmsClient.js";
import { describeConfigStatus, loadConfig, publicConfig, type AppConfig } from "./config.js";

export interface AppDependencies {
  config?: AppConfig;
  cmsClient?: CmsClient;
  assistant?: CmsAiAssistant;
}

export function createApp(dependencies: AppDependencies = {}): Server {
  const config = dependencies.config ?? loadConfig();
  const cmsClient = dependencies.cmsClient ?? new CmsClient(config.cms);
  const assistant = dependencies.assistant ?? new CmsAiAssistant(config, cmsClient);

  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, config, cmsClient, assistant);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      });
    }
  });
}

export async function startServer(config = loadConfig()): Promise<Server> {
  const server = createApp({ config });

  return new Promise((resolve) => {
    server.listen(config.server.port, config.server.host, () => {
      const address = server.address() as AddressInfo;
      console.log(`${config.assistant.name} listening on http://${address.address}:${address.port}`);
      resolve(server);
    });
  });
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: AppConfig,
  cmsClient: CmsClient,
  assistant: CmsAiAssistant,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      assistant: config.assistant.name,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/config") {
    sendJson(response, 200, {
      config: publicConfig(config),
      status: describeConfigStatus(config),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/cms/health") {
    const health = await cmsClient.health();
    sendJson(response, health.ok ? 200 : 502, health);
    return;
  }

  if (request.method === "POST" && url.pathname === "/assistant/query") {
    const body = await readJsonBody(request);
    const result = await assistant.answer({ query: String(body.query ?? "") });
    sendJson(response, 200, result);
    return;
  }

  sendJson(response, 404, {
    error: "Not found.",
  });
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;

    if (size > 1_000_000) {
      throw new Error("Request body exceeds 1 MB.");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const content = Buffer.concat(chunks).toString("utf8");
  const parsed = JSON.parse(content) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload, null, 2));
}
