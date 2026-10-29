#!/usr/bin/env bash
# Refuse (or warn) deploying a commit whose CI is red / missing.
# Usage:
#   ./scripts/assert-ci-green.sh            # HEAD of current repo
#   ./scripts/assert-ci-green.sh <sha>      # specific commit
# Env:
#   CI_GATE_MODE=refuse|warn   (default: refuse)
#   GITHUB_REPO=owner/name     (default: hasnain007007/Crazzycars.pk)
#   CI_WORKFLOW="SEO Healthcheck"  (override if more workflows are added)

set -euo pipefail

MODE="${CI_GATE_MODE:-refuse}"
REPO="${GITHUB_REPO:-hasnain007007/Crazzycars.pk}"
WORKFLOW="${CI_WORKFLOW:-SEO Healthcheck}"
SHA="${1:-}"

if [ -z "$SHA" ]; then
  SHA="$(git rev-parse HEAD)"
fi
SHORT="$(git rev-parse --short "$SHA" 2>/dev/null || echo "$SHA")"

if ! command -v gh >/dev/null 2>&1; then
  echo "WARNING: gh not installed — cannot verify CI for $SHORT" >&2
  if [ "$MODE" = "refuse" ]; then
    echo "Set CI_GATE_MODE=warn to continue without gh, or install GitHub CLI." >&2
    exit 1
  fi
  exit 0
fi

echo "==> Checking CI ($WORKFLOW) for $REPO@$SHORT …"

# Prefer conclusion for this exact commit on the named workflow.
JSON="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --commit "$SHA" --limit 5 --json databaseId,conclusion,status,url,headSha,displayTitle 2>/dev/null || echo '[]')"

if [ "$JSON" = "[]" ] || [ -z "$JSON" ] || [ "$JSON" = "null" ]; then
  MSG="No CI run found for workflow \"$WORKFLOW\" on commit $SHORT ($REPO)."
  if [ "$MODE" = "refuse" ]; then
    echo "ERROR: $MSG Refusing deploy (CI_GATE_MODE=refuse)." >&2
    exit 1
  fi
  echo "WARNING: $MSG Continuing (CI_GATE_MODE=warn)." >&2
  exit 0
fi

# Pick newest run for this commit
CONCLUSION="$(printf '%s' "$JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("conclusion") or "") if d else print("")')"
STATUS="$(printf '%s' "$JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("status") or "") if d else print("")')"
URL="$(printf '%s' "$JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("url") or "") if d else print("")')"

echo "    status=$STATUS conclusion=$CONCLUSION"
echo "    $URL"

if [ "$STATUS" != "completed" ]; then
  MSG="CI still running for $SHORT ($STATUS)."
  if [ "$MODE" = "refuse" ]; then
    echo "ERROR: $MSG Refusing deploy." >&2
    exit 1
  fi
  echo "WARNING: $MSG Continuing (CI_GATE_MODE=warn)." >&2
  exit 0
fi

if [ "$CONCLUSION" != "success" ]; then
  MSG="CI is $CONCLUSION for $SHORT — $URL"
  if [ "$MODE" = "refuse" ]; then
    echo "ERROR: $MSG Refusing deploy (CI_GATE_MODE=refuse)." >&2
    exit 1
  fi
  echo "WARNING: $MSG Continuing (CI_GATE_MODE=warn)." >&2
  exit 0
fi

echo "==> CI green for $SHORT — deploy allowed."
