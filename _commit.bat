@echo off
cd /d D:\pilorus\website
git add app/admin/page.tsx components/admin/animated-counter.tsx components/admin/dashboard-greeting.tsx components/admin/dashboard-metrics.tsx components/admin/dashboard-chart.tsx
git commit -m "feat: dashboard v2 - animated counters, greeting, chart upgrade"
git push origin main
