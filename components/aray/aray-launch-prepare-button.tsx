"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

export function ArayLaunchPrepareButton({
  leadId,
  prepared = false,
  size = "default",
}: {
  leadId: string;
  prepared?: boolean;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function prepareLaunch() {
    setConfirmOpen(false);
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/aray/launch/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, confirm: true }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось подготовить запуск");
      }

      setMessage(
        data.createdCount > 0
          ? `Готово: создано ${data.createdCount} задач`
          : "Запуск уже подготовлен",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подготовки запуска");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" size={size} onClick={() => setConfirmOpen(true)} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {prepared ? "Обновить запуск" : "Зафиксировать бриф"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void prepareLaunch()}
        title={prepared ? "Обновить запуск?" : "Зафиксировать бриф?"}
        description="ARAY создаст или обновит производственные задачи и добавит запись в историю клиента."
        confirmLabel={prepared ? "Обновить" : "Зафиксировать"}
        variant="warning"
        loading={loading}
      />
      {message ? <p className="text-xs font-medium text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
