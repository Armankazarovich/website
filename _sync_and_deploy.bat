@echo off
echo === Syncing files from Cyrillic to Latin path ===

copy /Y "D:\ПилоРус\website\app\admin\page.tsx" "D:\pilorus\website\app\admin\page.tsx"
copy /Y "D:\ПилоРус\website\components\admin\animated-counter.tsx" "D:\pilorus\website\components\admin\animated-counter.tsx"
copy /Y "D:\ПилоРус\website\components\admin\dashboard-greeting.tsx" "D:\pilorus\website\components\admin\dashboard-greeting.tsx"
copy /Y "D:\ПилоРус\website\components\admin\dashboard-metrics.tsx" "D:\pilorus\website\components\admin\dashboard-metrics.tsx"
copy /Y "D:\ПилоРус\website\components\admin\dashboard-chart.tsx" "D:\pilorus\website\components\admin\dashboard-chart.tsx"

echo === Files synced ===

cd /d D:\pilorus\website
git add app/admin/page.tsx components/admin/animated-counter.tsx components/admin/dashboard-greeting.tsx components/admin/dashboard-metrics.tsx components/admin/dashboard-chart.tsx
git status
git commit -m "feat: dashboard v2 - animated counters, greeting, chart upgrade"
git push origin main

echo === Deploy triggered ===
