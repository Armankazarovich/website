"use client";

import { AlertTriangle, Check, Loader2, Trash2 } from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";

interface ConfirmDialogProps {
  open?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default" | "destructive";
  loading?: boolean;
}

export function ConfirmDialog({
  open = true,
  onClose: onCloseProp,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  variant: variantProp = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const onClose = onCloseProp || onCancel || (() => {});
  const variant = variantProp === "destructive" ? "danger" : variantProp;
  const isDanger = variant === "danger";
  const isWarning = variant === "warning";
  const Icon = isDanger ? Trash2 : isWarning ? AlertTriangle : Check;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      role="alertdialog"
      size="sm"
      showClose
      bodyClassName="p-4"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
              isDanger
                ? "border-destructive/35 bg-destructive/5 text-destructive hover:bg-destructive/10"
                : "border-primary/45 bg-primary/10 text-primary hover:bg-primary/15"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Подождите...
              </span>
            ) : confirmLabel}
          </button>
        </>
      )}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/25 p-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
          isDanger
            ? "border-destructive/25 bg-destructive/5 text-destructive"
            : isWarning
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-primary/30 bg-primary/10 text-primary"
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {description && (
            <p className="break-words text-sm font-medium leading-6 text-foreground">
              {description}
            </p>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            {isDanger
              ? "Проверьте действие перед подтверждением. Если это удаление, восстановление может быть ограничено."
              : isWarning
                ? "Проверьте детали перед подтверждением: действие изменит рабочие данные."
                : "Подтвердите действие, чтобы система выполнила его сейчас."}
          </p>
        </div>
      </div>
    </AdminModal>
  );
}
