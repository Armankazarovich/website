#!/bin/bash
# Auto-deploy script for pilo-rus.ru
# Runs on server: git pull → npm build → pm2 restart

APP_DIR="/home/armankmb/pilo-rus/app"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [Deploy]"

cd "$APP_DIR" || exit 1

# Check for new commits
git fetch origin main --quiet 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # No changes, skip rebuild
fi

echo "$LOG_PREFIX New commits detected, rebuilding..."
git pull origin main

echo "$LOG_PREFIX Installing deps..."
npm install --legacy-peer-deps --prefer-offline 2>&1 | tail -3

echo "$LOG_PREFIX Running npm build (max 3GB RAM)..."
NODE_OPTIONS="--max-old-space-size=3072" npm run build

echo "$LOG_PREFIX Restarting PM2..."
pm2 restart pilo-rus --update-env || pm2 start ecosystem.config.js
pm2 save

echo "$LOG_PREFIX Done! Deployed $(git rev-parse --short HEAD)"
