"use client";

import { useEffect } from "react";
import { buildPwaManifestHref, getPwaIconSrc, resolvePwaInstallContext, type PwaInstallContext } from "@/lib/pwa-install-context";

type ManagedIconLink = {
  rel: string;
  href: string;
  sizes?: string;
  type?: string;
};

const MANAGED_ICON_LINK_SELECTOR = 'link[data-aray-app-identity="true"]';

function buildDocumentTitle(context: PwaInstallContext) {
  if (context.iconKind === "aray") {
    if (context.id === "aray-workspace") return "ARAY Production";
    return `${context.shortName} | ARAY Production`;
  }

  return null;
}

function buildIconLinks(context: PwaInstallContext): ManagedIconLink[] {
  if (context.iconKind === "aray") {
    return [
      { rel: "icon", href: getPwaIconSrc(context, 32), sizes: "32x32", type: "image/png" },
      { rel: "icon", href: getPwaIconSrc(context, 96), sizes: "96x96", type: "image/png" },
      { rel: "icon", href: getPwaIconSrc(context, 192), sizes: "192x192", type: "image/png" },
      { rel: "apple-touch-icon", href: getPwaIconSrc(context, 180), sizes: "180x180" },
      { rel: "shortcut icon", href: getPwaIconSrc(context, 192) },
    ];
  }

  return [
    { rel: "icon", href: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
    { rel: "icon", href: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
    { rel: "icon", href: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "shortcut icon", href: "/icons/icon-192x192.png" },
  ];
}

function iconKey(icon: ManagedIconLink) {
  return [icon.rel, icon.sizes || "", icon.type || ""].join("|");
}

function syncIconLinks(context: PwaInstallContext) {
  const desired = buildIconLinks(context);
  const desiredKeys = new Set(desired.map(iconKey));
  const managed = Array.from(document.querySelectorAll<HTMLLinkElement>(MANAGED_ICON_LINK_SELECTOR));

  for (const link of managed) {
    const key = [link.rel, link.getAttribute("sizes") || "", link.getAttribute("type") || ""].join("|");
    if (!desiredKeys.has(key)) link.remove();
  }

  for (const icon of desired) {
    const key = iconKey(icon);
    let link =
      managed.find((item) => [item.rel, item.getAttribute("sizes") || "", item.getAttribute("type") || ""].join("|") === key) ||
      document.querySelector<HTMLLinkElement>(
        `${MANAGED_ICON_LINK_SELECTOR}[rel="${icon.rel}"]${icon.sizes ? `[sizes="${icon.sizes}"]` : ":not([sizes])"}${
          icon.type ? `[type="${icon.type}"]` : ":not([type])"
        }`,
      ) ||
      document.querySelector<HTMLLinkElement>(
        `link[rel="${icon.rel}"]:not([data-aray-app-identity="true"])${icon.sizes ? `[sizes="${icon.sizes}"]` : ""}${
          icon.type ? `[type="${icon.type}"]` : ""
        }`,
      ) ||
      document.querySelector<HTMLLinkElement>(`link[rel="${icon.rel}"]:not([data-aray-app-identity="true"])`);

    if (!link) {
      link = document.createElement("link");
      link.rel = icon.rel;
      link.dataset.arayAppIdentity = "true";
      document.head.appendChild(link);
    }

    link.rel = icon.rel;
    link.dataset.arayAppIdentity = "true";
    link.dataset.arayAppContext = context.id;
    if (icon.sizes) link.setAttribute("sizes", icon.sizes);
    else link.removeAttribute("sizes");
    if (icon.type) link.setAttribute("type", icon.type);
    else link.removeAttribute("type");
    if (link.getAttribute("href") !== icon.href) {
      link.setAttribute("href", icon.href);
    }
  }
}

export function PwaManifestSync() {
  useEffect(() => {
    let syncingHead = false;

    const syncManifest = () => {
      if (syncingHead) return;
      syncingHead = true;

      const context = resolvePwaInstallContext(window.location.pathname || "/", window.location.search);
      const href = buildPwaManifestHref(context);
      let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');

      try {
        if (!link) {
          link = document.createElement("link");
          link.rel = "manifest";
          document.head.appendChild(link);
        }

        if (link.getAttribute("href") !== href) {
          link.setAttribute("href", href);
        }

        document
          .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
          .forEach((themeMeta) => themeMeta.setAttribute("content", context.themeColor));

        const nextTitle = buildDocumentTitle(context);
        if (nextTitle) document.title = nextTitle;
        document.documentElement.dataset.arayAppContext = context.id;
        document.documentElement.dataset.arayAppKind = context.iconKind;
        syncIconLinks(context);
      } finally {
        window.setTimeout(() => {
          syncingHead = false;
        }, 0);
      }
    };

    const pushState = window.history.pushState;
    const replaceState = window.history.replaceState;
    const scheduleSync = () => {
      window.setTimeout(syncManifest, 0);
      window.setTimeout(syncManifest, 160);
      window.setTimeout(syncManifest, 520);
      window.setTimeout(syncManifest, 1200);
    };

    const headObserver = new MutationObserver(() => {
      if (!syncingHead) scheduleSync();
    });
    headObserver.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["href", "content"],
    });

    window.history.pushState = function patchedPushState(...args) {
      const result = pushState.apply(this, args);
      scheduleSync();
      return result;
    };
    window.history.replaceState = function patchedReplaceState(...args) {
      const result = replaceState.apply(this, args);
      scheduleSync();
      return result;
    };

    syncManifest();
    window.addEventListener("popstate", syncManifest);
    window.addEventListener("hashchange", syncManifest);

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      headObserver.disconnect();
      window.removeEventListener("popstate", syncManifest);
      window.removeEventListener("hashchange", syncManifest);
    };
  }, []);

  return null;
}
