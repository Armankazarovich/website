// Yandex Metrika + Google Analytics — вставляется в root layout
// ID берётся из SiteSettings → рендерится только если настроен

import Script from "next/script";

interface AnalyticsProps {
  yandexMetrikaId?: string;
  googleAnalyticsId?: string;
}

export function Analytics({ yandexMetrikaId, googleAnalyticsId }: AnalyticsProps) {
  const metrikaId = yandexMetrikaId?.replace(/\D/g, "") || "";

  return (
    <>
      {/* ── Яндекс Метрика ── */}
      {metrikaId && (
        <>
          <Script id={`ym-init-${metrikaId}`} strategy="afterInteractive">
            {`
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}", "ym");

              window.dataLayer = window.dataLayer || [];
              ym(${metrikaId}, "init", {
                ssr: true,
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true,
                webvisor: true,
                ecommerce: "dataLayer",
                referrer: document.referrer,
                url: location.href
              });

              var scheduleMetrikaGoal = function(send) {
                if (typeof window.requestIdleCallback === "function") {
                  window.requestIdleCallback(send, { timeout: 1500 });
                  return;
                }
                setTimeout(send, 0);
              };

              window.arayMetrikaGoal = function(goal, params) {
                if (!goal || typeof ym !== "function") return;
                scheduleMetrikaGoal(function() {
                  ym(${metrikaId}, "reachGoal", goal, params || {});
                });
              };
              (window.arayMetrikaGoalQueue || []).forEach(function(item) {
                window.arayMetrikaGoal(item.goal, item.params || {});
              });
              window.arayMetrikaGoalQueue = [];
              window.addEventListener("aray:metrika-goal", function(event) {
                var detail = event && event.detail ? event.detail : {};
                window.arayMetrikaGoal(detail.goal || detail.name, detail.params || {});
              });
              document.addEventListener("click", function(event) {
                var target = event.target && event.target.closest ? event.target.closest("a[href]") : null;
                if (!target) return;
                var href = target.getAttribute("href") || "";
                if (href.indexOf("tel:") === 0) {
                  window.arayMetrikaGoal("aray_phone_click", { href: href });
                }
                if (/wa\\.me|whatsapp|t\\.me|telegram/i.test(href)) {
                  window.arayMetrikaGoal("aray_messenger_click", { href: href });
                }
              }, true);
            `}
          </Script>
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${metrikaId}`}
                style={{ position: "absolute", left: "-9999px" }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}

      {/* ── Google Analytics (GA4) ── */}
      {googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
