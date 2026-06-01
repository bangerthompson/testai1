# testai1

CMS AI assistant initialization service.

## What this provides

- A small Node.js/TypeScript HTTP service for a CMS-connected assistant.
- Generic headless CMS configuration via environment variables.
- OpenAI-compatible chat completions integration.
- Diagnostic assistant responses when an LLM key is not configured yet.
- Health, configuration, CMS health, and assistant query endpoints.

## Prerequisites

- Node.js 20 or newer
- npm

## Setup

```bash
npm install
cp .env.example .env
```

Update `.env` with your CMS and LLM settings:

| Variable | Description |
| --- | --- |
| `CMS_BASE_URL` | Base URL for the CMS API. |
| `CMS_API_TOKEN` | Optional bearer token for private CMS APIs. |
| `CMS_CONTENT_PATH` | CMS content search endpoint. The service sends `search` and `limit` query parameters. |
| `CMS_HEALTH_PATH` | CMS health endpoint. |
| `LLM_API_KEY` | API key for an OpenAI-compatible chat completions provider. |
| `LLM_BASE_URL` | Base URL for the LLM API. |
| `LLM_MODEL` | Model name used for chat completions. |

## Development

```bash
npm run dev
```

The service listens on `PORT` and `HOST` from the environment, defaulting to `0.0.0.0:3000`.

## API

### `GET /health`

Returns service health.

### `GET /config`

Returns non-secret runtime configuration and readiness warnings.

### `GET /cms/health`

Checks the configured CMS health endpoint.

### `POST /assistant/query`

Requests an assistant response.

```bash
curl -X POST http://localhost:3000/assistant/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Draft a homepage intro from current CMS content"}'
```

When `LLM_API_KEY` is absent, this endpoint confirms initialization and returns CMS context diagnostics without calling an external model.

## Quality checks

```bash
npm test
npm run build
```
