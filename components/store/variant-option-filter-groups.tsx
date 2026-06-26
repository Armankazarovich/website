"use client";

import { cn } from "@/lib/utils";
import type { VariantOptionKey } from "@/lib/variant-options";

type VariantOptionFilterGroup = {
  keyName: VariantOptionKey;
  label: string;
  values: string[];
  selected: string | null;
};

interface VariantOptionFilterGroupsProps {
  groups: VariantOptionFilterGroup[];
  onSelect: (key: VariantOptionKey, value: string | null) => void;
  isOptionVisible?: (key: VariantOptionKey, value: string) => boolean;
}

export function VariantOptionFilterGroups({ groups, onSelect, isOptionVisible }: VariantOptionFilterGroupsProps) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      values: group.values.filter(
        (value) => group.selected === value || isOptionVisible?.(group.keyName, value) !== false,
      ),
    }))
    .filter((group) => group.values.length > 1 || Boolean(group.selected));
  if (visibleGroups.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-3">
      {visibleGroups.map((group) => (
        <div key={group.keyName} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {group.label}
            </span>
            {group.selected && (
              <button
                type="button"
                onClick={() => onSelect(group.keyName, null)}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Все
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const active = group.selected === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelect(group.keyName, active ? null : value)}
                  className={cn(
                    "min-h-9 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border bg-background/70 text-foreground hover:border-primary/45 hover:bg-accent",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
