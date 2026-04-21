"use client";

import { useState } from "react";
import { Handshake } from "lucide-react";
import { PartnershipModal } from "@/components/store/partnership-modal";

export function FooterPartnershipButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-brand-orange font-medium hover:text-brand-orange/80 transition-colors group"
      >
        <Handshake className="w-4 h-4 shrink-0" />
        Сотрудничество
      </button>
      <PartnershipModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
