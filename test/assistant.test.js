import assert from "node:assert/strict";
import test from "node:test";
import {
  CmsAssistantError,
  buildAssistantPrompt,
  createCmsAssistant
} from "../src/index.js";

test("creates a deterministic CMS draft response", async () => {
  const assistant = createCmsAssistant({
    brandVoice: ["friendly", "plainspoken"],
    constraints: ["Use inclusive language."]
  });

  const response = await assistant.respond({
    input: "Announce the spring collection",
    intent: "draft",
    contentType: "landing page",
    audience: "returning customers"
  });

  assert.equal(response.intent, "draft");
  assert.equal(response.source, "deterministic");
  assert.match(response.content, /Draft landing page/);
  assert.match(response.content, /returning customers/);
  assert.match(response.prompt, /Use inclusive language/);
});

test("builds prompts with CMS context and request details", () => {
  const prompt = buildAssistantPrompt(
    {
      input: "Refresh the careers page",
      intent: "improve",
      contentType: "web page",
      audience: "job seekers"
    },
    {
      brandVoice: "warm",
      constraints: ["Avoid jargon."]
    }
  );

  assert.match(prompt, /CMS AI assistant/);
  assert.match(prompt, /Intent: improve/);
  assert.match(prompt, /Content type: web page/);
  assert.match(prompt, /Audience: job seekers/);
  assert.match(prompt, /Avoid jargon/);
});

test("delegates to a configured provider", async () => {
  const requests = [];
  const assistant = createCmsAssistant({
    provider: {
      async complete(request) {
        requests.push(request);
        return "Provider generated content.";
      }
    }
  });

  const response = await assistant.respond("Write a homepage hero");

  assert.equal(response.source, "provider");
  assert.equal(response.content, "Provider generated content.");
  assert.equal(requests.length, 1);
  assert.match(requests[0].prompt, /Write a homepage hero/);
});

test("rejects unsupported intents", async () => {
  const assistant = createCmsAssistant();

  await assert.rejects(
    () => assistant.respond({ input: "Hello", intent: "translate" }),
    (error) => error instanceof CmsAssistantError && error.code === "UNSUPPORTED_INTENT"
  );
});
