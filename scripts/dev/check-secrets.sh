#!/usr/bin/env bash
# Refuse un commit qui contiendrait un fichier sensible ou une clé en clair.
# Appelé par le hook pre-commit (husky). Exit 1 = commit refusé.
set -euo pipefail

staged=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$staged" ] && exit 0

# 1. Fichiers interdits par nom (CLAUDE.md > Sécurité — NON NÉGOCIABLE)
if bad=$(grep -E '(^|/)\.env(\.[a-z]+)?$|gsc-service-account\.json$' <<<"$staged" | grep -vE '\.env\.example$'); then
  echo "✖ Fichier sensible stagé, commit refusé :" >&2
  echo "$bad" | sed 's/^/    /' >&2
  exit 1
fi

# 2. Clés en clair dans le contenu ajouté
patterns='sk-ant-api03-[A-Za-z0-9_-]{20,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}'
if hits=$(git diff --cached -U0 -- $staged | grep -E '^\+' | grep -vE '^\+\+\+' | grep -nE "$patterns"); then
  echo "✖ Une clé ou un token semble présent dans le diff, commit refusé :" >&2
  echo "$hits" | cut -c1-120 | sed 's/^/    /' >&2
  echo "  (si c'est un faux positif : git commit --no-verify, en connaissance de cause)" >&2
  exit 1
fi

exit 0
