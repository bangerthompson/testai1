import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createCmsAiAssistant, DEFAULT_ASSISTANT_CONFIG } from "../src/index.js";

describe("createCmsAiAssistant", () => {
  it("initializes with sensible defaults", () => {
    const assistant = createCmsAiAssistant();

    assert.equal(assistant.isReady, true);
    assert.deepEqual(assistant.config, DEFAULT_ASSISTANT_CONFIG);
    assert.match(assistant.createSystemPrompt(), /editorial assistant embedded in a CMS/);
  });

  it("normalizes custom configuration", () => {
    const assistant = createCmsAiAssistant({
      assistantName: " Content Copilot ",
      brandVoice: "friendly",
      locale: "en-GB",
      maxDraftWords: "250",
      contentTypes: "guide, checklist, guide"
    });

    assert.deepEqual(assistant.config, {
      assistantName: "Content Copilot",
      brandVoice: "friendly",
      locale: "en-GB",
      maxDraftWords: 250,
      contentTypes: ["guide", "checklist"]
    });
  });

  it("creates a normalized content brief", () => {
    const assistant = createCmsAiAssistant({
      contentTypes: ["article"]
    });

    const brief = assistant.createContentBrief({
      title: " Launch Notes ",
      audience: "Editors",
      goal: "Explain the release",
      contentType: "article",
      keywords: "CMS, AI Assistant",
      constraints: ["Needs human review", "Do not invent metrics"]
    });

    assert.deepEqual(brief, {
      title: "Launch Notes",
      audience: "Editors",
      goal: "Explain the release",
      contentType: "article",
      keywords: ["cms", "ai assistant"],
      tone: DEFAULT_ASSISTANT_CONFIG.brandVoice,
      locale: DEFAULT_ASSISTANT_CONFIG.locale,
      constraints: ["Needs human review", "Do not invent metrics"]
    });
  });

  it("rejects incomplete briefs", () => {
    const assistant = createCmsAiAssistant();

    assert.throws(
      () =>
        assistant.createContentBrief({
          title: "Missing pieces"
        }),
      /Missing required content brief field/
    );
  });

  it("rejects unsupported content types", () => {
    const assistant = createCmsAiAssistant({
      contentTypes: ["article"]
    });

    assert.throws(
      () =>
        assistant.createContentBrief({
          title: "A",
          audience: "Editors",
          goal: "Publish",
          contentType: "podcast"
        }),
      /Unsupported content type/
    );
  });

  it("builds a draft prompt from a brief", () => {
    const assistant = createCmsAiAssistant({
      maxDraftWords: 120
    });

    const prompt = assistant.draftFromBrief({
      title: "CMS Assistant Launch",
      audience: "CMS editors",
      goal: "Introduce the assistant",
      contentType: "article",
      keywords: ["workflow"],
      constraints: "Mention editorial review"
    });

    assert.match(prompt, /Draft an article titled "CMS Assistant Launch"/);
    assert.match(prompt, /Target length: no more than 120 words/);
    assert.match(prompt, /Include these keywords naturally: workflow/);
    assert.match(prompt, /Editorial constraints: Mention editorial review/);
  });
});
