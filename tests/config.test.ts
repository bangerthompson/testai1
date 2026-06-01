import assert from "node:assert/strict";
import test from "node:test";
import { describeConfigStatus, loadConfig, publicConfig } from "../src/config.js";

test("loadConfig applies defaults and normalizes URLs", () => {
  const config = loadConfig({
    PORT: "4000",
    CMS_BASE_URL: "https://cms.example.com/",
    CMS_CONTENT_PATH: "api/posts",
    LLM_BASE_URL: "https://llm.example.com/v1/",
    ASSISTANT_MAX_CONTEXT_ITEMS: "3",
  });

  assert.equal(config.server.port, 4000);
  assert.equal(config.cms.baseUrl, "https://cms.example.com");
  assert.equal(config.cms.contentPath, "/api/posts");
  assert.equal(config.llm.baseUrl, "https://llm.example.com/v1");
  assert.equal(config.assistant.maxContextItems, 3);
});

test("loadConfig rejects invalid positive integer settings", () => {
  assert.throws(() => loadConfig({ PORT: "0" }), /PORT must be a positive integer/);
  assert.throws(
    () => loadConfig({ ASSISTANT_MAX_CONTEXT_ITEMS: "many" }),
    /ASSISTANT_MAX_CONTEXT_ITEMS must be a positive integer/,
  );
});

test("publicConfig reports configured secrets without exposing values", () => {
  const config = loadConfig({
    CMS_API_TOKEN: "cms-secret",
    LLM_API_KEY: "llm-secret",
  });

  assert.equal(publicConfig(config).cms.apiTokenConfigured, true);
  assert.equal(publicConfig(config).llm.apiKeyConfigured, true);
  assert.deepEqual(describeConfigStatus(config), {
    ready: true,
    warnings: [],
  });
});
