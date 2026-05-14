"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PopupPortalProps = {
  children: ReactNode;
  rootId?: string;
};

function getPopupRoot(rootId: string) {
  let root = document.getElementById(rootId);
  if (root) return root;

  root = document.createElement("div");
  root.id = rootId;
  root.dataset.popupRoot = "true";
  document.body.appendChild(root);
  return root;
}

export function PopupPortal({ children, rootId = "pilorus-popup-root" }: PopupPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, getPopupRoot(rootId));
}
