export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Ban, FileText, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARAY_ARC_RULES } from "@/lib/aray-agency-crm-foundation";

const ARC_ADMIN_ACTIONS = [
  "начислить bonus ARC с причиной",
  "начислить service credit",
  "показать paid ARC и bonus ARC отдельно",
  "показать историю операций",
  "заблокировать вывод до юридической схемы",
];

export default function ArayArcPage() {
  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <section className="rounded-2xl border border-border bg-card px-5 py-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARC balance
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Внутренний ARC баланс
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Первый слой ARC — не платежная система и не инвестиция, а внутренний
              учет услуг, бонусов, подписок и ИИ-расходов после подтвержденных оплат.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/finance">
              Финансы
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Пакет клиента", value: "3 000 ARC", hint: "150 000 ₽", icon: Wallet },
          { label: "Доля партнера", value: "1 500 ARC", hint: "75 000 ₽", icon: FileText },
          { label: "Доля ARAY", value: "1 500 ARC", hint: "75 000 ₽", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Правила ARC</h2>
          <div className="mt-4 space-y-3">
            {ARAY_ARC_RULES.map((rule) => (
              <div key={rule} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Админские действия</h2>
          <div className="mt-4 space-y-3">
            {ARC_ADMIN_ACTIONS.map((action) => (
              <div key={action} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex gap-3">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Вывод ARC временно недоступен</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              В интерфейсе можно показать отключенную кнопку вывода, но публично нельзя обещать
              выкуп, доходность или замену денег до отдельной юридической и налоговой схемы.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

