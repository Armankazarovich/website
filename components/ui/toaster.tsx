"use client";

import Image from "next/image";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const image = (props as any).image as string | undefined;

        return (
          <Toast key={id} {...props}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {image && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                  <Image src={image} alt="" fill className="object-cover" sizes="48px" />
                </div>
              )}
              <div className="grid gap-0.5 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
