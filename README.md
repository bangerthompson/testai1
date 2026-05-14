# testai1

CMS AI assistant initialization package.

## What is included

- A typed `initializeCmsAssistant` API
- CMS context normalization for site, locale, content types, and fields
- A provider contract so OpenAI, Anthropic, or an internal model gateway can be plugged in later
- Focused tests for prompt building, request dispatch, and validation

## Usage

```ts
import { initializeCmsAssistant, type AssistantProvider } from "testai1";

const provider: AssistantProvider = {
  async complete(request) {
    // Connect this to your model provider or internal AI gateway.
    return {
      role: "assistant",
      content: `Ready to help with ${request.context.siteName}.`,
    };
  },
};

const assistant = initializeCmsAssistant({
  provider,
  context: {
    siteName: "Marketing CMS",
    locale: "en-US",
    contentTypes: [
      {
        id: "article",
        label: "Article",
        fields: ["title", "summary", "body"],
      },
    ],
  },
});

const response = await assistant.sendMessage("Draft a launch article outline.");
console.log(response.content);
```

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```
