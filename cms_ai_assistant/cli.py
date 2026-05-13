"""Command line interface for the CMS AI assistant."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Sequence, TextIO

from cms_ai_assistant.core import CMSAIAssistant, CMSContent


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cms-ai-assistant",
        description="Analyze CMS content and return structured editorial suggestions.",
    )
    parser.add_argument(
        "source",
        help="Path to a JSON content file, or '-' to read JSON from standard input.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the JSON report.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        payload = _load_payload(args.source, sys.stdin)
        content = CMSContent.from_mapping(payload)
        report = CMSAIAssistant().analysis_report(content)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"cms-ai-assistant: {exc}", file=sys.stderr)
        return 1

    indent = 2 if args.pretty else None
    print(json.dumps(report, indent=indent, sort_keys=True))
    return 0


def _load_payload(source: str, stdin: TextIO) -> dict[str, object]:
    if source == "-":
        raw_payload = stdin.read()
    else:
        raw_payload = Path(source).read_text(encoding="utf-8")

    payload = json.loads(raw_payload)
    if not isinstance(payload, dict):
        raise ValueError("Input JSON must be an object")
    return payload


if __name__ == "__main__":
    raise SystemExit(main())
