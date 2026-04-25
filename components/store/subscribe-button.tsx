"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Loader2, Check } from "lucide-react";

type Props = {
  targetType: "supplier" | "category" | "brand";
  targetId: string;
  targetName: string;
  compact?: boolean;
};

type Sub = { id: string; targetType: string; targetId: string };

/**
 * Кнопка «Подписаться» — создаёт/удаляет запись Subscription.
 * Для гостей — редирект на /login с callback.
 */
export function SubscribeButton({ targetType, targetId, targetName, compact = false }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Проверяем подписку при монтаже (только если авторизован)
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setChecking(false);
      return;
    }
    fetch("/api/cabinet/subscriptions")
      .then((r) => (r.ok ? r.json() : { subscriptions: [] }))
      .then((data: { subscriptions: Sub[] }) => {
        const found = (data.subscriptions || []).find(
          (s) => s.targetType === targetType && s.targetId === targetId
        );
        if (found) {
          setSubscribed(true);
          setSubId(found.id);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [status, session?.user?.id, targetType, targetId]);

  async function handleClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoading(true);
    try {
      if (subscribed && subId) {
        const res = await fetch("/api/cabinet/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: subId }),
        });
        if (res.ok) {
          setSubscribed(false);
          setSubId(null);
        }
      } else {
        const res = await fetch("/api/cabinet/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId, targetName }),
        });
        if (res.ok) {
          const data = await res.json();
          setSubscribed(true);
          setSubId(data.subscription?.id ?? null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const baseClass = compact
    ? "inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold transition-all"
    : "inline-flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-semibold transition-all";

  const activeClass = subscribed
    ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15"
    : "bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary";

  if (checking) {
    return (
      <button disabled className={`${baseClass} ${activeClass} opacity-60`}>
        <Loader2 className={compact ? "w-3.5 h-3.5 animate-spin" : "w-4 h-4 animate-spin"} />
        {!compact && "Подписка"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${baseClass} ${activeClass} disabled:opacity-60 active:scale-[0.97]`}
      aria-pressed={subscribed}
      title={subscribed ? `Отписаться от «${targetName}»` : `Подписаться на «${targetName}»`}
    >
      {loading ? (
        <Loader2 className={compact ? "w-3.5 h-3.5 animate-spin" : "w-4 h-4 animate-spin"} />
      ) : subscribed ? (
        <Check className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      ) : (
        <Heart className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
      {subscribed ? "Подписаны" : "Подписаться"}
    </button>
  );
}
