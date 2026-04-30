#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "usage: ./run-agent.sh <command> [args...]"
  exit 2
fi

echo "run-agent: $*"
exec "$@"
