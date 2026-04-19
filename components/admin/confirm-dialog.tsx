"use client";

import { useRef, useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
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
  // Backward compat: onCancel alias for onClose, "destructive" alias for "danger"
  const onClose = onCloseProp || onCancel || (() => {});
  const variant = variantProp === "destructive" ? "danger" : variantProp;

  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Фокус на кнопку отмены — безопаснее для destructive диалогов
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 className="w-5 h-5 text-destructive" />,
      iconBg: "bg-destructive/10",
      btn: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      iconBg: "bg-yellow-500/10",
      btn: "bg-yellow-500 text-white hover:bg-yellow-600",
    },
    default: {
      icon: null,
      iconBg: "bg-primary/10",
      btn: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
  }[variant];

  return (
    <>
      {/* ARAY POPUP — z-[200] для confirm поверх всех попапов */}
      <div className="arayglass-popup-backdrop" style={{ zIndex: 200 }} onClick={onClose} />
      <div className="arayglass-popup-container" style={{ zIndex: 201 }}>
        <div
          className="arayglass-popup arayglass-popup-sm"
          role="alertdialog"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="arayglass-popup-body">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-4">
              {variantStyles.icon && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}>
                  {variantStyles.icon}
                </div>
              )}
              <div className="flex-1 min-w-0 pt-1">
                <h3 id="confirm-dialog-title" className="font-semibold text-base leading-tight text-foreground">{title}</h3>
                {description && (
                  <p className="text-sm mt-1 leading-relaxed text-muted-foreground">{description}</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 mt-6">
              <button
                ref={cancelRef}
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border border-primary/15 text-muted-foreground hover:bg-primary/[0.05] hover:border-primary/30"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 ${variantStyles.btn}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Удаляю...
                  </span>
                ) : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
