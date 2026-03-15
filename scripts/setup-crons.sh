#!/bin/bash
# ============================================================
# SEO Automation — Cron Jobs Setup
# Installs/updates cron jobs for the SEO automation system.
# Run: bash scripts/setup-crons.sh
# ============================================================

set -euo pipefail

PROJECT_DIR="/home/ubuntu/sites/seo-automation"
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
# Daily page generation (6:00 AM) $MARKER
0 6 * * * cd $PROJECT_DIR && /usr/bin/env npx tsx src/jobs/daily-generate.ts >> $LOG_FILE 2>&1 $MARKER

# Weekly GSC audit (Monday 8:00 AM) $MARKER
0 8 * * 1 cd $PROJECT_DIR && /usr/bin/env npx tsx src/jobs/weekly-gsc-audit.ts >> $LOG_FILE 2>&1 $MARKER

# Monthly content optimization (1st of month, 10:00 AM) $MARKER
0 10 1 * * cd $PROJECT_DIR && /usr/bin/env npx tsx src/jobs/monthly-optimize.ts >> $LOG_FILE 2>&1 $MARKER

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
