"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Globe2, ImageIcon, Loader2, Mail, Phone, ScanSearch, ShieldCheck } from "lucide-react";

type SupplierOption = {
  id: string;
  name: string;
  slug: string;
  sourceUrl: string | null;
  website: string | null;
};

type ScanResult = {
  ok: boolean;
  previewOnly: boolean;
  sourceUrl: string;
  fetchedUrl: string;
  title: string;
  siteName: string;
  description: string;
  logoCandidates: string[];
  phoneCandidates: string[];
  emailCandidates: string[];
  socialLinks: Array<{ label: string; url: string }>;
  storefrontDraft: {
    name: string;
    website: string;
    sourceUrl: string;
    logoUrl: string;
    phone: string;
    email: string;
    publicDescription: string;
  };
};

type Props = {
  suppliers: SupplierOption[];
};

function suggestedUrl(supplier: SupplierOption | undefined) {
  return supplier?.sourceUrl || supplier?.website || "";
}

export function SupplierSiteScanPreviewClient({ suppliers }: Props) {
  const defaultSupplier = suppliers.find((supplier) => supplier.slug === "pilmos") || suppliers[0];
  const [supplierId, setSupplierId] = useState(defaultSupplier?.id || "");
  const selectedSupplier = useMemo(() => suppliers.find((supplier) => supplier.id === supplierId), [supplierId, suppliers]);
  const [sourceUrl, setSourceUrl] = useState(suggestedUrl(defaultSupplier));
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSupplierChange(value: string) {
    setSupplierId(value);
    const supplier = suppliers.find((item) => item.id === value);
    setSourceUrl(suggestedUrl(supplier));
    setResult(null);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/suppliers/site-scan-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, sourceUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Preview сайта не удалось выполнить");
      setResult(payload);
    } catch (err: any) {
      setError(err?.message || "Preview сайта не удалось выполнить");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Preview сайта продавца</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Скан главной страницы ищет логотип, описание, телефон, почту и социальные ссылки. Это только предпросмотр: данные не применяются к карточке продавца автоматически.
          </p>
        </div>
        {result ? (
          <span className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Preview готов
          </span>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] lg:items-end">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Продавец</span>
          <select
            value={supplierId}
            onChange={(event) => handleSupplierChange(event.target.value)}
            className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Сайт для scan-preview</span>
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://example.ru/"
            className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !sourceUrl.trim() || !supplierId}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          Preview
        </button>
      </form>

      {selectedSupplier?.website && sourceUrl !== selectedSupplier.website ? (
        <p className="mt-2 text-xs text-muted-foreground">Основной сайт продавца: {selectedSupplier.website}</p>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Черновик карточки</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-foreground">{result.storefrontDraft.name || result.siteName || "Название не найдено"}</h3>
              </div>
              <a href={result.fetchedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:bg-accent">
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть сайт
              </a>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.storefrontDraft.publicDescription || "Описание на главной странице не найдено."}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <PreviewFact icon={Phone} label="Телефон" value={result.storefrontDraft.phone || "не найден"} />
              <PreviewFact icon={Mail} label="Почта" value={result.storefrontDraft.email || "не найдена"} />
            </div>
            {result.socialLinks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.socialLinks.map((link) => (
                  <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-accent">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-semibold text-foreground">Кандидаты логотипа</h3>
            </div>
            <div className="mt-3 grid gap-2">
              {result.logoCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Логотип не найден. Можно указать вручную в карточке продавца.</p>
              ) : (
                result.logoCandidates.slice(0, 5).map((logo) => (
                  <a key={logo} href={logo} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 text-xs text-foreground hover:bg-accent">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="" className="h-10 w-10 rounded-lg border border-border bg-background object-contain p-1" />
                    <span className="min-w-0 flex-1 truncate">{logo}</span>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewFact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3 text-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
