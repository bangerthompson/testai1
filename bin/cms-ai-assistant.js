#!/usr/bin/env node
import { createCmsAssistant } from "../src/index.js";

const assistant = createCmsAssistant({
  siteName: process.env.CMS_SITE_NAME || "Demo CMS",
  locale: process.env.CMS_LOCALE || "en-US"
});

const [command, ...args] = process.argv.slice(2);

try {
  if (!command || command === "init") {
    printJson({
      assistant: "cms-ai-assistant",
      status: "initialized",
      ...assistant.describe()
    });
    process.exit(0);
  }

  if (command === "draft") {
    const options = parseDraftArgs(args);
    const result = assistant.createDraft(options);
    printJson(result);
    process.exit(0);
  }

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  throw new Error(`Unknown command "${command}". Run "cms-ai-assistant help" for usage.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function parseDraftArgs(args) {
  const options = {
    topic: "",
    keywords: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--topic") {
      options.topic = requireValue(arg, next);
      index += 1;
    } else if (arg === "--type") {
      options.contentType = requireValue(arg, next);
      index += 1;
    } else if (arg === "--audience") {
      options.audience = requireValue(arg, next);
      index += 1;
    } else if (arg === "--tone") {
      options.tone = requireValue(arg, next);
      index += 1;
    } else if (arg === "--keyword") {
      options.keywords.push(requireValue(arg, next));
      index += 1;
    } else {
      throw new Error(`Unknown draft option "${arg}".`);
    }
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`CMS AI Assistant

Usage:
  cms-ai-assistant init
  cms-ai-assistant draft --topic "spring launch" [--type article] [--audience marketers] [--keyword launch]

Environment:
  CMS_SITE_NAME   Name used in generated assistant context.
  CMS_LOCALE      Locale used by the assistant. Defaults to en-US.
`);
}
