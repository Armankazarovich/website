"use client";

/**
 * ArayHomeRail — client wrapper над ArayPinnedRail с фиксированными Quick Actions
 * для раздела «Дом Арая» (/admin/aray).
 *
 * Зачем нужен: server component не может передать функциональные компоненты
 * (lucide иконки — это React.ElementType, не сериализуется) через props
 * в client component. Поэтому массив quickActions с icon-полем должен
 * жить внутри client-границы.
 */

import { Wallet, FlaskConical, BookOpen, History } from "lucide-react";
import { ArayPinnedRail, type ArayQuickAction } from "@/components/admin/aray-pinned-rail";

const QUICK_ACTIONS: ArayQuickAction[] = [
  { href: "/admin/aray/costs", label: "Расходы", icon: Wallet },
  { href: "/admin/aray-lab",   label: "Лаб",      icon: FlaskConical },
  { href: "#prompts",          label: "Промпты",  icon: BookOpen },
  { href: "#history",          label: "История",  icon: History },
];

export function ArayHomeRail() {
  return (
    <ArayPinnedRail
      page="aray-home"
      contextLabel="Дом Арая"
      quickActions={QUICK_ACTIONS}
      inputHint="Спроси про расход, промпт, модель"
    />
  );
}
