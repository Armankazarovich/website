"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { cn } from "@/lib/utils";

type AdminModalSize = "sm" | "md" | "lg" | "xl" | "full";

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: AdminModalSize;
  role?: "dialog" | "alertdialog";
  showClose?: boolean;
  overlayClassName?: string;
  className?: string;
  bodyClassName?: string;
};

const sizeClass: Record<AdminModalSize, string> = {
  sm: "admin-modal-sm",
  md: "admin-modal-md",
  lg: "admin-modal-lg",
  xl: "admin-modal-xl",
  full: "admin-modal-full",
};

export function AdminModal({
  open,
  onClose,
  modal = true,
  title,
  subtitle,
  headerActions,
  children,
  footer,
  size = "md",
  role = "dialog",
  showClose = true,
  overlayClassName,
  className,
  bodyClassName,
}: AdminModalProps) {
  useAdminOverlayGuard(open);

  return (
    <DialogPrimitive.Root modal={modal} open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn("admin-modal-overlay", overlayClassName)} />
        <DialogPrimitive.Content
          role={role}
          className={cn("admin-modal-panel admin-popup-liquid", sizeClass[size], className)}
        >
          {!title && (
            <DialogPrimitive.Title className="sr-only">
              Диалог
            </DialogPrimitive.Title>
          )}
          {!subtitle && (
            <DialogPrimitive.Description className="sr-only">
              Окно управления
            </DialogPrimitive.Description>
          )}
          {(title || subtitle || showClose) && (
            <div className="admin-modal-header">
              <div className="min-w-0 flex-1">
                {title && (
                  <DialogPrimitive.Title className="truncate text-base font-semibold leading-tight text-foreground">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {subtitle && (
                  <DialogPrimitive.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                    {subtitle}
                  </DialogPrimitive.Description>
                )}
              </div>
              {headerActions && (
                <div className="admin-modal-header-actions">
                  {headerActions}
                </div>
              )}
              {showClose && (
                <DialogPrimitive.Close className="admin-modal-close" aria-label="Закрыть">
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          <div className={cn("admin-modal-body", bodyClassName)}>
            {children}
          </div>

          {footer && (
            <div className="admin-modal-footer">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
