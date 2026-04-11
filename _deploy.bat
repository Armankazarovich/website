@echo off
cd /d D:\pilorus\website
git commit --allow-empty -m "chore: redeploy with new API secrets"
git push origin main
