"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, UserCog, Clock, ShieldAlert, Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Складчик",
  SELLER: "Продавец",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COURIER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  ACCOUNTANT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  WAREHOUSE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  SELLER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const ALL_ROLES = ["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "ADMIN"];

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  staffStatus: string | null;
  customRole: string | null;
  createdAt: Date;
};

export function StaffList({ staff }: { staff: StaffMember[] }) {
  const [members, setMembers] = useState(staff);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const update = async (id: string, body: object) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...data.user } : m))
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  const pending = members.filter((m) => m.staffStatus === "PENDING");
  const active = members.filter((m) => m.staffStatus === "ACTIVE" || !m.staffStatus);
  const suspended = members.filter((m) => m.staffStatus === "SUSPENDED");

  const renderMember = (member: StaffMember) => {
    const isLoading = loadingId === member.id;
    const roleBadge = ROLE_COLORS[member.role] || "bg-gray-100 text-gray-600";
    const displayRole = member.customRole || ROLE_LABELS[member.role] || member.role;

    return (
      <div
        key={member.id}
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-card border border-border rounded-xl"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
          {member.name?.charAt(0)?.toUpperCase() || "?"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm">{member.name || "—"}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleBadge}`}>
              {displayRole}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
          {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Добавлен: {new Date(member.createdAt).toLocaleDateString("ru-RU")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Role selector */}
          {member.staffStatus !== "PENDING" && (
            <select
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none"
              value={member.role}
              disabled={isLoading}
              onChange={(e) => update(member.id, { role: e.target.value })}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          )}

          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {member.staffStatus === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                    onClick={() => update(member.id, { staffStatus: "ACTIVE" })}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Одобрить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                    onClick={() => update(member.id, { staffStatus: "SUSPENDED" })}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Отклонить
                  </Button>
                </>
              )}
              {member.staffStatus === "ACTIVE" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => update(member.id, { staffStatus: "SUSPENDED" })}
                >
                  Заблокировать
                </Button>
              )}
              {member.staffStatus === "SUSPENDED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                  onClick={() => update(member.id, { staffStatus: "ACTIVE" })}
                >
                  Восстановить
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm">Ожидают подтверждения ({pending.length})</h2>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="space-y-3">{pending.map(renderMember)}</div>
        </section>
      )}

      {/* Active */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <UserCog className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-sm">Активные сотрудники ({active.length})</h2>
          </div>
          <div className="space-y-3">{active.map(renderMember)}</div>
        </section>
      )}

      {/* Suspended */}
      {suspended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-sm">Заблокированы ({suspended.length})</h2>
          </div>
          <div className="space-y-3">{suspended.map(renderMember)}</div>
        </section>
      )}

      {members.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Сотрудников пока нет</p>
          <p className="text-sm mt-1">Поделитесь ссылкой на регистрацию: <strong>pilo-rus.ru/join</strong></p>
        </div>
      )}
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
