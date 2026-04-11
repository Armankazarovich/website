@echo off
cd /d D:\pilorus\website
git add -A
git status
git commit -m "feat: dashboard v2 + TTS browser fallback + API fixes"
git push origin main
