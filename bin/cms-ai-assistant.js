#!/usr/bin/env node

import { stdin as inputStream } from "node:process";
import { createCmsAssistant, createOpenAiChatProvider } from "../src/index.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const input = args.input ?? await readStdin();

  if (!input) {
    throw new Error("Provide a prompt as an argument, with --input, or through stdin.");
  }

  const assistant = createCmsAssistant({
    brandVoice: args.voice,
    constraints: args.constraint,
    provider: args.openai ? createOpenAiChatProvider() : undefined
  });

  const response = await assistant.respond({
    input,
    intent: args.intent ?? "draft",
    contentType: args.contentType,
    audience: args.audience
  });

  if (args.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    console.log(response.content);
  }
} catch (error) {
  console.error(`cms-ai-assistant: ${error.message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    constraint: [],
    voice: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--openai") {
      parsed.openai = true;
    } else if (arg === "--input") {
      parsed.input = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === "--intent") {
      parsed.intent = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === "--content-type") {
      parsed.contentType = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === "--audience") {
      parsed.audience = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === "--voice") {
      parsed.voice.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg === "--constraint") {
      parsed.constraint.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      parsed.input = [parsed.input, arg].filter(Boolean).join(" ");
    }
  }

  return parsed;
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

async function readStdin() {
  if (inputStream.isTTY) {
    return "";
  }

  const chunks = [];

  for await (const chunk of inputStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8").trim();
}

function printHelp() {
  console.log(awaitReadmeExcerpt());
}

function awaitReadmeExcerpt() {
  return [
    "CMS AI Assistant",
    "",
    "Usage:",
    "  cms-ai-assistant \"Draft a product launch article\"",
    "  cms-ai-assistant --intent seo --content-type article --audience editors \"headless CMS migration\"",
    "",
    "Options:",
    "  --intent <draft|improve|summarize|seo|help>",
    "  --content-type <type>",
    "  --audience <audience>",
    "  --voice <descriptor>       Repeat to set brand voice.",
    "  --constraint <constraint>  Repeat to add editorial constraints.",
    "  --json                     Print full response JSON.",
    "  --openai                   Use OPENAI_API_KEY with the OpenAI-compatible provider.",
    "  --help                     Show this message."
  ].join("\n");
}
