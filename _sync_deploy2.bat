@echo off
echo === Syncing files ===

copy /Y "D:\ПилоРус\website\app\admin\page.tsx" "D:\pilorus\website\app\admin\page.tsx"
copy /Y "D:\ПилоРус\website\app\api\ai\tts\route.ts" "D:\pilorus\website\app\api\ai\tts\route.ts"
copy /Y "D:\ПилоРус\website\components\admin\admin-aray.tsx" "D:\pilorus\website\components\admin\admin-aray.tsx"
copy /Y "D:\ПилоРус\website\components\admin\animated-counter.tsx" "D:\pilorus\website\components\admin\animated-counter.tsx"
copy /Y "D:\ПилоРус\website\components\admin\dashboard-greeting.tsx" "D:\pilorus\website\components\admin\dashboard-greeting.tsx"
copy /Y "D:\ПилоРус\website\components\admin\dashboard-metrics.tsx" "D:\pilorus\website\components\admin\dashboard-metrics.tsx"
copy /Y "D:\ПилоРус\website\components\admin\dashboard-chart.tsx" "D:\pilorus\website\components\admin\dashboard-chart.tsx"

echo === Git add + commit + push ===
cd /d D:\pilorus\website
git add -A
git commit -m "feat: dashboard v2 + TTS fallback + API fixes"
git push origin main

echo === Done ===
