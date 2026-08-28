#!/bin/bash
# ============================================================
# SEO Automation — Cron Jobs Setup
# Installs/updates cron jobs for the SEO automation system.
# Run: bash scripts/setup-crons.sh
# ============================================================

set -euo pipefail

PROJECT_DIR="/home/ubuntu/sites/seo-automation"
DASH_ENV="/home/ubuntu/sites/seo-dashboard/.env.local"
LOG_FILE="/var/log/seo-automation.log"
MARKER="# seo-automation"

# Ensure log file exists
sudo touch "$LOG_FILE" 2>/dev/null || touch "$LOG_FILE"
sudo chown "$(whoami)" "$LOG_FILE" 2>/dev/null || true

echo "Installing SEO automation cron jobs..."
echo "Project: $PROJECT_DIR"
echo "Log: $LOG_FILE"
echo ""

# Remove existing seo-automation crons
crontab -l 2>/dev/null | grep -v "$MARKER" > /tmp/crontab_clean || true

# Add new cron jobs
cat >> /tmp/crontab_clean << EOF

# ── SEO Automation System ─────────────────────────────── $MARKER
# daily-generate DÉSACTIVÉ — génération human-in-the-loop via le dashboard $MARKER

# Daily GSC sync → gsc_positions (6:30 AM tous les jours, en tête de chaîne le lundi) $MARKER
# 8 s pour 9 sites, upsert idempotent : le dashboard travaille sur J-3 au lieu de J-3 à J-9. $MARKER
30 6 * * * cd $PROJECT_DIR && /usr/bin/env npx tsx src/jobs/gsc-sync.ts --trigger=cron >> $LOG_FILE 2>&1 $MARKER

# Weekly crawl + funnel d'indexation → crawl_results (Monday 6:45 AM) $MARKER
# Sans lui, les détecteurs du backlog raisonnent sur un crawl figé : une page $MARKER
# réparée resterait « inconnue de Google » indéfiniment dans le diagnostic. $MARKER
# Compter ~1 min par site ; la marge avant le scan de 7h30 est volontaire. $MARKER
45 6 * * 1 cd $PROJECT_DIR && /usr/bin/env npx tsx scripts/crawl.ts --apply >> $LOG_FILE 2>&1 $MARKER

# Weekly backlog scan — détecteurs SEO + mesures (Monday 7:30 AM, après la sync ET le crawl, via le dashboard pm2) $MARKER
# Les identifiants Basic Auth sont lus depuis .env.local du dashboard (jamais dans git) $MARKER
30 7 * * 1 curl -s -X POST -u "\$(grep '^DASHBOARD_USER=' $DASH_ENV | cut -d= -f2-):\$(grep '^DASHBOARD_PASSWORD=' $DASH_ENV | cut -d= -f2-)" http://localhost:3000/api/backlog/scan >> $LOG_FILE 2>&1 $MARKER

# Weekly GSC audit (Monday 8:00 AM) $MARKER
0 8 * * 1 cd $PROJECT_DIR && /usr/bin/env npx tsx src/jobs/weekly-gsc-audit.ts >> $LOG_FILE 2>&1 $MARKER

# Weekly keyword clustering (Sunday 10:00 PM) $MARKER
0 22 * * 0 cd $PROJECT_DIR && /usr/bin/env npx tsx src/jobs/weekly-clustering.ts >> $LOG_FILE 2>&1 $MARKER

# monthly-optimize DÉSACTIVÉ — utilisait l'API Anthropic (crédits épuisés) ; optimisations en session CLI $MARKER

# Monthly backlinks verification via DataForSEO (1er du mois, 9h) $MARKER
0 9 1 * * curl -s -X POST -u "\$(grep '^DASHBOARD_USER=' $DASH_ENV | cut -d= -f2-):\$(grep '^DASHBOARD_PASSWORD=' $DASH_ENV | cut -d= -f2-)" http://localhost:3000/api/backlinks/verify >> $LOG_FILE 2>&1 $MARKER

# Log rotation (weekly) $MARKER
0 0 * * 0 if [ -f $LOG_FILE ] && [ \$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt 10485760 ]; then mv $LOG_FILE ${LOG_FILE}.old; touch $LOG_FILE; fi $MARKER
EOF

# Install the new crontab
crontab /tmp/crontab_clean
rm /tmp/crontab_clean

echo "✅ Cron jobs installed successfully!"
echo ""
echo "Current crontab:"
crontab -l | grep "$MARKER"
echo ""
echo "View logs: tail -f $LOG_FILE"
echo "Remove crons: crontab -l | grep -v '$MARKER' | crontab -"
