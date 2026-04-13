#!/bin/bash
# Phase 0 — Régénération des pages faibles (score ≤ 30) par batch de 5
# Usage: bash run_phase0.sh
# Les pages "redirected" sont ignorées (seules les "published" sont traitées)
# JAMAIS d'auto-publish — les pages sont mises à jour en status draft

set -euo pipefail
cd "$(dirname "$0")"

# Permet de lancer claude depuis un sous-process
unset CLAUDECODE 2>/dev/null || true

mkdir -p logs

BATCH=0
LOG_FILE="logs/phase_0_$(date +%Y%m%d_%H%M%S).log"

echo "=== Phase 0 démarrée — $(date) ===" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE"

while true; do
  BATCH=$((BATCH + 1))
  echo "" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"
  echo "=== BATCH $BATCH — $(date) ===" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"

  # Vérifier si déjà terminé
  if grep -q "PHASE_0_DONE" PROGRESS.md 2>/dev/null; then
    echo "=== Phase 0 déjà terminée ===" | tee -a "$LOG_FILE"
    break
  fi

  claude -p --dangerously-skip-permissions "
Tu es le système d'automatisation SEO. Ta mission : régénérer les pages faibles du réseau multi-sites.

=== INSTRUCTIONS PHASE 0 — BATCH $BATCH ===

ÉTAPE 1 — COMPRENDRE LE CONTEXTE
- Lis CLAUDE.md pour comprendre l'architecture complète du projet
- Lis PROGRESS.md pour voir quelles pages sont déjà traitées (cases cochées [x])
- Les pages avec [ ] sont à traiter, les pages avec [x] sont déjà faites

ÉTAPE 2 — IDENTIFIER LES 10 PROCHAINES PAGES À TRAITER
- Prends les 5 prochaines pages non cochées [ ] dans PROGRESS.md
- Si moins de 5 restent, traite celles qui restent
- IGNORE les pages redirected (section en bas de PROGRESS.md)

ÉTAPE 3 — ANALYSER DES MODÈLES DE QUALITÉ
- Lis 2-3 pages existantes avec un bon score (100/100) depuis Supabase pour t'en inspirer comme modèle de structure et de qualité. Utilise la commande suivante pour en récupérer une :
  set -a && source .env && set +a && node -e \"
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    sb.from('seo_pages').select('*').eq('site_key','garage').eq('slug','entretien-voiture-perpignan').single().then(r => console.log(JSON.stringify(r.data?.content, null, 2)));
  \"
- Adapte le modèle au site et service de chaque page à régénérer

ÉTAPE 4 — POUR CHAQUE PAGE, CHERCHER SON CLUSTER DE MOTS-CLÉS
- Cherche dans keyword_clusters un cluster correspondant au slug/service de la page :
  set -a && source .env && set +a && node -e \"
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    sb.from('keyword_clusters').select('*').eq('site_key','SITE_KEY').ilike('suggested_slug','%SLUG_PART%').then(r => console.log(JSON.stringify(r.data, null, 2)));
  \"
- Si un cluster existe : utilise le mot-clé principal, les secondaires, le volume, l'intent
- Si pas de cluster : déduis les mots-clés du slug et du contexte du site

ÉTAPE 5 — CHERCHER LES PAGES EXISTANTES DU MÊME SITE (pour le maillage interne)
- Récupère la liste des slugs existants du même site :
  set -a && source .env && set +a && node -e \"
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    sb.from('seo_pages').select('slug, meta_title, page_type, status').eq('site_key','SITE_KEY').then(r => r.data.forEach(p => console.log(p.slug + ' | ' + p.meta_title)));
  \"
- Utilise ces pages pour créer des internalLinks pertinents (minimum 3 liens)

ÉTAPE 6 — GÉNÉRER LE CONTENU DE QUALITÉ MAXIMALE
Pour chaque page, génère un JSON complet avec TOUTES ces sections :

{
  \"metaTitle\": \"[Service] à Perpignan | [Nom Site] — max 60 chars\",
  \"metaDescription\": \"80-155 chars, bénéfice + localisation + CTA implicite\",
  \"h1\": \"H1 unique avec keyword principal\",
  \"heroTitle\": \"Titre héro accrocheur\",
  \"heroSubtitle\": \"Sous-titre avec proposition de valeur\",
  \"intro\": \"Introduction 200+ chars, contexte local, expertise, pourquoi nous choisir\",
  \"seoSections\": [
    {\"title\": \"H2 avec variante sémantique\", \"content\": \"200-350 mots, contenu unique, mentions locales (quartiers de Perpignan, routes, landmarks), cas pratiques, expertise terrain\"},
    ... (5 sections minimum, 250+ mots chacune)
  ],
  \"faq\": [
    {\"question\": \"Question naturelle que pose un client\", \"answer\": \"Réponse détaillée 60-120 mots avec expertise E-E-A-T\"},
    ... (6 FAQ minimum)
  ],
  \"highlights\": [\"5 points forts du service — concrets, pas génériques\"],
  \"trustSignals\": [\"4 signaux de confiance E-E-A-T — certifications, expérience, avis, garanties\"],
  \"internalLinks\": [
    {\"slug\": \"/autre-page\", \"label\": \"Texte d'ancre naturel\"},
    ... (3+ liens vers d'autres pages du même site)
  ],
  \"updatedDate\": \"2026-04-13\"
}

RÈGLES DE QUALITÉ NON NÉGOCIABLES :
- Minimum 800 mots de contenu utile au total (intro + sections + FAQ)
- Chaque section seoSections : 200-350 mots, PAS de remplissage
- Contenu local authentique : mentionner Perpignan, quartiers (Saint-Assiscle, Moulin à Vent, Le Vernet...), routes (RN116, D900...), landmarks selon le contexte
- Ton expert naturel — comme un pro du métier avec 15 ans d'expérience, PAS du spam SEO
- Chaque page doit donner envie d'appeler — le CTA implicite est le numéro de téléphone
- Contenu UNIQUE par page — pas de copier-coller entre pages, varier les angles
- Schema.org FAQPage + type métier du site

ÉTAPE 7 — METTRE À JOUR SUPABASE
Pour chaque page régénérée, mets à jour en base avec :
  set -a && source .env && set +a && node -e \"
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const content = GENERATED_JSON;
    const schemaOrg = { '@context': 'https://schema.org', '@type': 'FAQPage', ... };
    sb.from('seo_pages').update({
      content: content,
      meta_title: content.metaTitle,
      meta_description: content.metaDescription,
      h1: content.h1,
      schema_org: schemaOrg,
      status: 'draft',
      version: OLD_VERSION + 1,
      updated_at: new Date().toISOString()
    }).eq('id', 'PAGE_UUID').then(r => console.log(r.error ? 'ERROR: ' + r.error.message : 'OK'));
  \"
- Status = 'draft' (JAMAIS published — human-in-the-loop)
- Incrémenter version

ÉTAPE 8 — METTRE À JOUR PROGRESS.md
- Coche [x] pour chaque page traitée dans ce batch
- Ajoute un résumé du batch dans la section 'Batches traités' :
  ### Batch $BATCH — [date]
  | Page | Site | Score avant | Score après | Mots |
  |------|------|-------------|-------------|------|
  | slug | site | 20 | ~85 | 1200 |
  ...
- Mets à jour les compteurs dans le tableau Résumé (colonnes Traitées et Restantes)
- Si TOUTES les pages [ ] sont maintenant [x], écris PHASE_0_DONE à la fin du fichier

ÉTAPE 9 — ERREURS
- Si une page échoue (Supabase error, contenu invalide), log l'erreur dans ERRORS.md
- Continue avec la page suivante — ne bloque pas le batch

IMPORTANT :
- Ne traite que les pages non cochées [ ] dans PROGRESS.md
- Travaille page par page, pas en bulk — chaque page a un contenu UNIQUE
- Vérifie chaque update Supabase (log OK ou ERROR)
- Le status reste 'draft' — JAMAIS auto-publish
" 2>&1 | tee -a "$LOG_FILE"

  echo "" | tee -a "$LOG_FILE"

  # Vérifier si terminé
  if grep -q "PHASE_0_DONE" PROGRESS.md 2>/dev/null; then
    echo "=== Phase 0 TERMINÉE ! ===" | tee -a "$LOG_FILE"
    echo "=== $(date) ===" | tee -a "$LOG_FILE"
    echo ""
    echo "Résumé dans PROGRESS.md"
    echo "Erreurs dans ERRORS.md (si applicable)"
    echo "Logs dans $LOG_FILE"
    break
  fi

  echo "=== Batch $BATCH terminé, pause 10s avant prochain batch... ===" | tee -a "$LOG_FILE"
  sleep 10
done

echo ""
echo "=== Phase 0 terminée — $(date) ==="
echo "Prochaine étape : vérifier PROGRESS.md et publier manuellement les pages validées"
