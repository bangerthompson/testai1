import assert from "node:assert/strict";
import test from "node:test";

import { createCmsAssistant } from "../src/index.js";

test("initializes with default CMS assistant capabilities", () => {
  const assistant = createCmsAssistant({ siteName: "Example CMS" });

  assert.deepEqual(assistant.describe(), {
    siteName: "Example CMS",
    locale: "en-US",
    channels: ["web", "email", "social"],
    contentTypes: ["article", "page", "product", "campaign"],
    tone: "clear, helpful, and brand-safe",
    contentCount: 0
  });
});

test("stores and filters CMS content context", () => {
  const assistant = createCmsAssistant({
    siteName: "Example CMS",
    initialContent: [
      {
        id: "home",
        title: "Home Page",
        type: "page",
        status: "published",
        tags: ["homepage"]
      },
      {
        id: "launch",
        title: "Launch Post",
        type: "article",
        status: "draft",
        tags: ["launch"]
      }
    ]
  });

  assert.equal(assistant.describe().contentCount, 2);
  assert.deepEqual(
    assistant.listContent({ status: "published" }).map((item) => item.id),
    ["home"]
  );
  assert.deepEqual(
    assistant.listContent({ tag: "launch" }).map((item) => item.id),
    ["launch"]
  );
});

test("creates a draft and prompt from selected CMS context", () => {
  const assistant = createCmsAssistant({
    siteName: "Example CMS",
    channels: ["web"],
    contentTypes: ["article"],
    initialContent: [
      {
        id: "brief",
        title: "Spring Campaign Brief",
        type: "campaign",
        status: "published",
        summary: "Promote the new spring collection."
      }
    ]
  });

  const result = assistant.createDraft({
    topic: "spring collection",
    contentType: "article",
    audience: "returning customers",
    keywords: ["spring", "collection"],
    sourceIds: ["brief"]
  });

  assert.match(result.prompt, /You are the CMS AI assistant for Example CMS/);
  assert.match(result.prompt, /Spring Campaign Brief/);
  assert.equal(result.draft.title, "Spring Collection | Example CMS");
  assert.equal(result.draft.metadata.contentType, "article");
  assert.deepEqual(result.draft.metadata.keywords, ["spring", "collection"]);
  assert.deepEqual(result.draft.publishingNotes, [
    {
      channel: "web",
      note: "Adapt the article for web while preserving the clear, helpful, and brand-safe tone."
    }
  ]);
});

test("rejects unsupported content types before creating a draft", () => {
  const assistant = createCmsAssistant({
    siteName: "Example CMS",
    contentTypes: ["article"]
  });

  assert.throws(
    () => assistant.createDraft({ topic: "spring collection", contentType: "video" }),
    /Unsupported content type/
  );
});

test("suggests actions based on the request and published content", () => {
  const assistant = createCmsAssistant({
    siteName: "Example CMS",
    initialContent: [
      {
        id: "brief",
        title: "Spring Campaign Brief",
        type: "campaign",
        status: "published"
      }
    ]
  });

  assert.deepEqual(assistant.suggestActions("refresh landing page"), [
    "Clarify the goal for \"refresh landing page\" in en-US.",
    "Choose one primary CMS content type: article, page, product, campaign.",
    "Prepare channel variants for web, email, social.",
    "Review 1 published item for reuse opportunities."
  ]);
});
