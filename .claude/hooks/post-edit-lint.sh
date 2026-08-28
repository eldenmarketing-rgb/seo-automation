#!/usr/bin/env bash
# Hook Claude Code — PostToolUse (Edit|Write).
# Après chaque fichier écrit par l'agent : Prettier puis ESLint --fix sur CE fichier
# seulement. Si ESLint laisse des erreurs, elles remontent à l'agent (exit 2) pour
# qu'il corrige tout de suite, au lieu de les découvrir au commit.
set -u
input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[ -z "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx|*.mjs|*.js|*.json) ;;
  *) exit 0 ;;
esac

# Hors périmètre outillé : scripts jetables, rapports, node_modules.
case "$file" in
  */scripts/oneshot/*|*/reports/*|*/node_modules/*|*/package-lock.json) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" || exit 0
[ -f "$file" ] || exit 0

npx --no-install prettier --log-level warn --write "$file" >/dev/null 2>&1 || true

case "$file" in
  *.ts|*.tsx|*.mjs|*.js)
    out=$(npx --no-install eslint --fix "$file" 2>&1)
    status=$?
    if [ $status -ne 0 ]; then
      echo "ESLint signale des erreurs dans $file :" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac
exit 0
