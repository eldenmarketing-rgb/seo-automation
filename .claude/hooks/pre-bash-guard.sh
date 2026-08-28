#!/usr/bin/env bash
# Hook Claude Code — PreToolUse (Bash).
# Deux garde-fous, calqués sur les règles « NON NÉGOCIABLE » de CLAUDE.md :
#  1. jamais de secret dans git : refuse `git add`/`git commit` si un fichier
#     sensible est nommé ou déjà stagé ;
#  2. jamais de force-push sur master.
# Tout le reste passe (exit 0 = décision laissée au flux normal).
set -u
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
[ -z "$cmd" ] && exit 0

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# 2. force-push sur master
if grep -qE 'git\s+push\b' <<<"$cmd" && grep -qE '(--force|-f\b|\+master)' <<<"$cmd" && grep -qE '\bmaster\b' <<<"$cmd"; then
  deny "Force-push sur master interdit (CLAUDE.md > Déploiement)."
fi

# 1. secrets
if grep -qE 'git\s+(add|commit|stage)\b' <<<"$cmd"; then
  secret_re='(^|[/ ])(\.env(\.[a-z]+)?|gsc-service-account\.json)([ "'"'"']|$)'
  if grep -qE "$secret_re" <<<"$cmd"; then
    deny "Fichier sensible nommé dans la commande (.env / gsc-service-account.json). Il ne doit jamais entrer dans git."
  fi
  root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
  staged=$(cd "$root" && git diff --cached --name-only 2>/dev/null)
  if grep -E '(^|/)\.env(\.[a-z]+)?$|gsc-service-account\.json$' <<<"$staged" | grep -qvE '\.env\.example$'; then
    deny "Un fichier sensible est déjà stagé : $(grep -E '(^|/)\.env|gsc-service-account' <<<"$staged" | tr '\n' ' '). Retire-le (git restore --staged) avant de commiter."
  fi
fi

exit 0
