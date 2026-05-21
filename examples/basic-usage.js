import { createCmsAiAssistant } from "../src/index.js";

const assistant = createCmsAiAssistant({
  assistantName: process.env.CMS_AI_ASSISTANT_NAME,
  brandVoice: process.env.CMS_AI_BRAND_VOICE,
  locale: process.env.CMS_AI_LOCALE,
  maxDraftWords: process.env.CMS_AI_MAX_DRAFT_WORDS
});

const brief = assistant.createContentBrief({
  title: "Introducing the CMS AI Assistant",
  audience: "CMS editors and content managers",
  goal: "Show how the assistant helps teams prepare publication-ready drafts",
  contentType: "article",
  keywords: ["CMS", "AI assistant", "editorial workflow"],
  constraints: ["Keep claims reviewable", "Do not imply fully automated publishing"]
});

console.log(assistant.createSystemPrompt());
console.log();
console.log(assistant.draftFromBrief(brief));
