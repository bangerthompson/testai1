import assert from "node:assert/strict";
import test from "node:test";
import { CmsClient } from "../src/cmsClient.js";

test("CmsClient sends authorization headers and normalizes content payloads", async () => {
  let requestedUrl: URL | undefined;
  let requestedHeaders: HeadersInit | undefined;

  const fetchImpl: typeof fetch = async (input, init) => {
    requestedUrl = input instanceof URL ? input : new URL(String(input));
    requestedHeaders = init?.headers;

    return new Response(
      JSON.stringify({
        data: [
          {
            id: "post-1",
            attributes: {
              title: "Welcome",
              excerpt: "Introductory content",
              url: "/welcome",
            },
          },
        ],
      }),
      {
        status: 200,
        statusText: "OK",
      },
    );
  };

  const client = new CmsClient(
    {
      baseUrl: "https://cms.example.com",
      apiToken: "secret",
      contentPath: "/api/posts",
      healthPath: "/api/_health",
    },
    fetchImpl,
  );

  const results = await client.searchContent("welcome", 5);

  assert.equal(requestedUrl?.toString(), "https://cms.example.com/api/posts?search=welcome&limit=5");
  assert.deepEqual(requestedHeaders, {
    Accept: "application/json",
    Authorization: "Bearer secret",
  });
  assert.deepEqual(results, [
    {
      id: "post-1",
      title: "Welcome",
      excerpt: "Introductory content",
      url: "/welcome",
    },
  ]);
});

test("CmsClient surfaces non-success CMS responses", async () => {
  const client = new CmsClient(
    {
      baseUrl: "https://cms.example.com",
      contentPath: "/api/posts",
      healthPath: "/api/_health",
    },
    async () => new Response("Not found", { status: 404, statusText: "Not Found" }),
  );

  await assert.rejects(() => client.searchContent("missing", 5), /CMS content request failed with 404 Not Found/);
});
