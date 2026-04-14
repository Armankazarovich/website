export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && ["ADMIN", "SUPER_ADMIN"].includes(role as string);
}

const EMAIL_RE = /[\w.+'-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
const SKIP_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js", ".woff", ".ico"];

async function fetchPage(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PiloRus-Outreach/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return "";
    return await res.text();
  } catch {
    clearTimeout(timer);
    return "";
  }
}

function extractEmails(html: string): string[] {
  const raw = html.match(EMAIL_RE) || [];
  const filtered = raw.filter((e) => {
    const lower = e.toLowerCase();
    if (SKIP_EXTS.some((ext) => lower.endsWith(ext))) return false;
    if (lower.startsWith("w3") || lower.startsWith("//")) return false;
    return true;
  });
  return [...new Set(filtered.map((e) => e.toLowerCase()))];
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)];
  const links: string[] = [];
  for (const m of matches) {
    try {
      const u = new URL(m[1], baseUrl);
      const path = u.pathname.toLowerCase();
      if (u.hostname !== base.hostname) continue;
      if (SKIP_EXTS.some((ext) => path.endsWith(ext))) continue;
      if (path.includes("logout") || path.includes("login") || path.includes("admin")) continue;
      const clean = u.origin + u.pathname;
      links.push(clean);
    } catch {}
  }
  return [...new Set(links)];
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { url?: string; depth?: number } = {};
  try { body = await req.json(); } catch {}

  const { url, depth = 1 } = body;
  if (!url?.trim()) return NextResponse.json({ error: "URL обязателен" }, { status: 400 });

  let startUrl: string;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    startUrl = u.href;
  } catch {
    return NextResponse.json({ error: "Неверный формат URL" }, { status: 400 });
  }

  const allEmails = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  let pagesScanned = 0;
  const maxPages = depth > 0 ? 6 : 1;

  while (queue.length > 0 && pagesScanned < maxPages) {
    const pageUrl = queue.shift()!;
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    const html = await fetchPage(pageUrl);
    if (!html) continue;
    pagesScanned++;

    extractEmails(html).forEach((e) => allEmails.add(e));

    if (depth > 0 && pagesScanned < maxPages - 1) {
      const links = extractInternalLinks(html, pageUrl);
      for (const link of links) {
        if (!visited.has(link)) queue.push(link);
      }
    }
  }

  return NextResponse.json({
    emails: [...allEmails].sort(),
    pages: pagesScanned,
    baseUrl: startUrl,
  });
}
