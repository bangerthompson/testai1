# CMS AI Assistant

This repository initializes a lightweight CMS AI assistant that can be embedded
in content-management workflows or run from the command line. The current
implementation is deterministic and does not require an external AI provider,
which keeps local development and tests fast while preserving a stable contract
for future LLM integration.

## Features

- Assistant initialization with site name, locale, content types, channels, and
  brand tone.
- In-memory CMS content context for filtering published or tagged content.
- Draft generation that returns both an LLM-ready prompt and a deterministic
  draft payload.
- CLI commands for initialization checks and draft scaffolding.
- Node.js test coverage using the built-in test runner.

## Requirements

- Node.js 22 or newer.

## Usage

Install dependencies if you add any later:

```sh
npm install
```

Run the assistant initialization check:

```sh
npm start -- init
```

Create a draft scaffold:

```sh
npm start -- draft --topic "spring collection" --type article --audience "returning customers" --keyword spring
```

Use the assistant as a module:

```js
import { createCmsAssistant } from "./src/index.js";

const assistant = createCmsAssistant({
  siteName: "Example CMS",
  locale: "en-US"
});

const result = assistant.createDraft({
  topic: "spring collection",
  contentType: "article",
  audience: "returning customers"
});

console.log(result.prompt);
console.log(result.draft);
```

## Testing

```sh
npm test
```
