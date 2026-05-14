import { describe, expect, it, vi } from "vitest";
import { initializeCmsAssistant, type AssistantProvider } from "../src";

describe("initializeCmsAssistant", () => {
  const baseContext = {
    siteName: "Example CMS",
    locale: "en-US",
    contentTypes: [
      {
        id: "article",
        label: "Article",
        fields: ["title", "summary", "body"],
      },
      {
        id: "landing-page",
        label: "Landing Page",
        fields: ["heroTitle", "ctaText"],
      },
    ],
  };

  it("builds a CMS-aware system prompt", () => {
    const assistant = initializeCmsAssistant({
      provider: createProvider(),
      context: baseContext,
    });

    expect(assistant.buildSystemPrompt()).toContain("Site: Example CMS");
    expect(assistant.buildSystemPrompt()).toContain("Locale: en-US");
    expect(assistant.buildSystemPrompt()).toContain("- Article (article): title, summary, body");
  });

  it("sends normalized context and messages to the provider", async () => {
    const provider = createProvider();
    const assistant = initializeCmsAssistant({
      provider,
      context: {
        siteName: " Example CMS ",
        locale: " en-US ",
        contentTypes: [
          {
            id: " article ",
            label: " Article ",
            fields: [" title ", "", " body "],
          },
        ],
      },
    });

    const response = await assistant.sendMessage(" Draft a headline ", [
      { role: "assistant", content: "What content type are you editing?" },
    ]);

    expect(response).toEqual({ role: "assistant", content: "Done" });
    expect(provider.complete).toHaveBeenCalledWith({
      context: {
        siteName: "Example CMS",
        locale: "en-US",
        contentTypes: [
          {
            id: "article",
            label: "Article",
            fields: ["title", "body"],
          },
        ],
      },
      messages: [
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining("Article (article): title, body"),
        }),
        { role: "assistant", content: "What content type are you editing?" },
        { role: "user", content: "Draft a headline" },
      ],
    });
  });

  it("rejects missing provider configuration", () => {
    expect(() =>
      initializeCmsAssistant({
        provider: undefined as unknown as AssistantProvider,
        context: baseContext,
      }),
    ).toThrow("CMS assistant provider with a complete() method is required.");
  });

  it("rejects blank user messages", async () => {
    const assistant = initializeCmsAssistant({
      provider: createProvider(),
      context: baseContext,
    });

    await expect(assistant.sendMessage("   ")).rejects.toThrow("Message is required.");
  });
});

function createProvider(): AssistantProvider {
  return {
    complete: vi.fn().mockResolvedValue({ role: "assistant", content: "Done" }),
  };
}
