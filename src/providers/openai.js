import { CmsAssistantError } from "../assistant.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export function createOpenAiChatProvider(options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const endpoint = options.endpoint ?? process.env.OPENAI_ENDPOINT ?? DEFAULT_ENDPOINT;
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!apiKey) {
    throw new CmsAssistantError("OPENAI_API_KEY is required to create the OpenAI provider.", {
      code: "MISSING_OPENAI_API_KEY"
    });
  }

  if (typeof fetchImpl !== "function") {
    throw new CmsAssistantError("A fetch implementation is required for the OpenAI provider.", {
      code: "MISSING_FETCH"
    });
  }

  return {
    async complete({ prompt }) {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You produce safe, concise, CMS-ready editorial assistance."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.4
        })
      });

      if (!response.ok) {
        const body = await safeResponseText(response);
        throw new CmsAssistantError(
          `OpenAI provider request failed with ${response.status}: ${body}`,
          { code: "OPENAI_PROVIDER_ERROR" }
        );
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim() === "") {
        throw new CmsAssistantError("OpenAI provider returned an empty response.", {
          code: "OPENAI_EMPTY_RESPONSE"
        });
      }

      return content.trim();
    }
  };
}

async function safeResponseText(response) {
  try {
    return await response.text();
  } catch {
    return "Unable to read response body.";
  }
}
