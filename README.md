# CMS AI Assistant

A small, dependency-free starter for initializing a CMS AI assistant. The module provides:

- Assistant configuration defaults for name, brand voice, locale, draft length, and content types.
- A CMS-oriented system prompt for editorial workflows.
- Content brief validation and normalization.
- Draft prompt generation that keeps human review and factual accuracy in scope.

## Requirements

- Node.js 20 or newer.

## Quick start

```bash
npm test
npm start
```

## Usage

```js
import { createCmsAiAssistant } from "./src/index.js";

const assistant = createCmsAiAssistant({
  assistantName: "Content Copilot",
  brandVoice: "warm, direct, and practical",
  locale: "en-US",
  maxDraftWords: 400,
  contentTypes: ["article", "landing-page", "email"]
});

const brief = assistant.createContentBrief({
  title: "Launching the spring campaign",
  audience: "Marketing editors",
  goal: "Prepare a publication-ready campaign landing page",
  contentType: "landing-page",
  keywords: ["spring campaign", "CMS workflow"],
  constraints: ["Do not invent campaign metrics", "Flag claims that need source links"]
});

console.log(assistant.createSystemPrompt());
console.log(assistant.draftFromBrief(brief));
```

## Environment configuration

The example script reads these optional environment variables:

- `CMS_AI_ASSISTANT_NAME`
- `CMS_AI_BRAND_VOICE`
- `CMS_AI_LOCALE`
- `CMS_AI_MAX_DRAFT_WORDS`

## Development

Run the smoke tests with:

```bash
npm test
```
