# CMS AI Assistant

A dependency-light starter for a CMS-focused AI assistant. It provides:

- a reusable assistant core for CMS/editorial workflows
- deterministic local responses for development and tests
- an optional OpenAI-compatible provider adapter
- a small CLI for drafting, improving, summarizing, and SEO metadata prompts

## Requirements

- Node.js 18 or newer

## Quick start

```bash
npm test
npm start -- "Draft a landing page for a spring campaign"
```

Run the CLI directly:

```bash
node ./bin/cms-ai-assistant.js \
  --intent seo \
  --content-type article \
  --audience "content editors" \
  "headless CMS migration"
```

Print a full response payload:

```bash
node ./bin/cms-ai-assistant.js --json "Improve the homepage hero copy"
```

## Using an AI provider

The assistant works without external credentials by returning deterministic
CMS-ready guidance. To use the OpenAI-compatible provider:

```bash
export OPENAI_API_KEY="your-api-key"
node ./bin/cms-ai-assistant.js --openai "Draft a release announcement"
```

Optional environment variables:

- `OPENAI_MODEL` defaults to `gpt-4o-mini`
- `OPENAI_ENDPOINT` defaults to `https://api.openai.com/v1/chat/completions`

## Programmatic usage

```js
import { createCmsAssistant } from "./src/index.js";

const assistant = createCmsAssistant({
  brandVoice: ["clear", "friendly"],
  constraints: ["Use inclusive language."]
});

const response = await assistant.respond({
  input: "Announce the new support center",
  intent: "draft",
  contentType: "blog post",
  audience: "existing customers"
});

console.log(response.content);
```

Supported intents:

- `draft`
- `improve`
- `summarize`
- `seo`
- `help`
