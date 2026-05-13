# CMS AI Assistant

A lightweight starter project for a CMS-focused AI assistant.

The assistant currently provides deterministic content analysis that works
without external services. It identifies common editorial issues, prioritizes
recommendations, and exposes a CLI that can analyze JSON content from a file or
standard input. The core is structured so a future LLM/provider integration can
be added without changing callers.

## Features

- Analyze CMS entries for title, body, summary, SEO, and readability concerns.
- Return structured suggestions with severity, field, message, and action.
- Dependency-free runtime built on the Python standard library.
- CLI support for local usage and automation.
- Unit tests covering the assistant behavior and CLI JSON output.

## Quick start

```bash
python -m cms_ai_assistant --help
```

Analyze content from a JSON file:

```bash
python -m cms_ai_assistant examples/article.json
```

Or from standard input:

```bash
echo '{"title":"Hello","body":"Short body"}' | python -m cms_ai_assistant -
```

## Input format

The CLI accepts a JSON object with the following fields:

```json
{
  "id": "optional-content-id",
  "title": "Article title",
  "body": "Full article body",
  "summary": "Optional summary",
  "metadata": {
    "seo_title": "Optional SEO title",
    "seo_description": "Optional SEO description",
    "keywords": ["cms", "assistant"]
  }
}
```

Only `title` and `body` are required.

## Development

Run the test suite with:

```bash
python -m unittest discover
```
