#!/bin/bash
# Auto-deploy script for pilo-rus.ru
# Runs on server: git pull → npm build → pm2 restart

set -e

APP_DIR="/home/armankmb/pilo-rus/app"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [Deploy]"

cd "$APP_DIR"

# Check for new commits
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # No changes, skip rebuild
fi

echo "$LOG_PREFIX New commits detected, rebuilding..."

git pull origin main

echo "$LOG_PREFIX Running npm build..."
npm run build

echo "$LOG_PREFIX Restarting PM2..."
pm2 restart pilo-rus --update-env

echo "$LOG_PREFIX Done! Deployed $(git rev-parse --short HEAD)"
