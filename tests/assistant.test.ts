import assert from "node:assert/strict";
import test from "node:test";
import { CmsAiAssistant } from "../src/assistant.js";
import type { CmsClient } from "../src/cmsClient.js";
import { loadConfig } from "../src/config.js";

test("CmsAiAssistant returns diagnostic response when no LLM API key is configured", async () => {
  const config = loadConfig({});
  const cmsClient = {
    searchContent: async () => [
      {
        id: "1",
        title: "About us",
      },
    ],
  } as unknown as CmsClient;

  const assistant = new CmsAiAssistant(config, cmsClient);
  const response = await assistant.answer({ query: "Find about page" });

  assert.equal(response.mode, "diagnostic");
  assert.equal(response.context.length, 1);
  assert.match(response.answer, /CMS AI Assistant is initialized/);
  assert.deepEqual(response.warnings, ["LLM_API_KEY is not configured."]);
});

test("CmsAiAssistant sends CMS context to an OpenAI-compatible chat API", async () => {
  const config = loadConfig({
    LLM_API_KEY: "secret",
    LLM_BASE_URL: "https://llm.example.com/v1",
    LLM_MODEL: "test-model",
  });
  const cmsClient = {
    searchContent: async () => [
      {
        id: "post-1",
        title: "Launch post",
        excerpt: "Product launch summary",
      },
    ],
  } as unknown as CmsClient;
  let requestedUrl: URL | undefined;
  let requestBody: Record<string, unknown> | undefined;

  const fetchImpl: typeof fetch = async (input, init) => {
    requestedUrl = input instanceof URL ? input : new URL(String(input));
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "Use the launch post as the starting point.",
            },
          },
        ],
      }),
      {
        status: 200,
        statusText: "OK",
      },
    );
  };

  const assistant = new CmsAiAssistant(config, cmsClient, fetchImpl);
  const response = await assistant.answer({ query: "Draft an update" });

  assert.equal(requestedUrl?.toString(), "https://llm.example.com/chat/completions");
  assert.equal(requestBody?.model, "test-model");
  assert.match(JSON.stringify(requestBody), /Launch post/);
  assert.equal(response.mode, "generated");
  assert.equal(response.answer, "Use the launch post as the starting point.");
});
