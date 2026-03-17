"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { JobTab } from "@/components/jobs/utils";

type JobsSummaryProps = {
  tab: JobTab;
  pending: number;
  completed: number;
  failed: number;
  onChange: (tab: JobTab) => void;
};

export function JobsSummary({ tab, pending, completed, failed, onChange }: JobsSummaryProps) {
  const items: Array<{
    key: JobTab;
    label: string;
    count: number;
    icon: typeof Clock3;
  }> = [
    { key: "pending", label: "待执行", count: pending, icon: Clock3 },
    { key: "completed", label: "已完成", count: completed, icon: CheckCircle2 },
    { key: "failed", label: "失败", count: failed, icon: XCircle },
  ];

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = tab === item.key;

        return (
          <button
            key={item.key}
            className={`rounded-[14px] border p-3 text-center transition-colors ${
              active
                ? "border-[rgba(180,106,44,0.3)] bg-[rgba(180,106,44,0.12)] text-accent"
                : "border-border bg-white/60 text-foreground"
            }`}
            onClick={() => onChange(item.key)}
            type="button"
          >
            <div
              className={`flex items-center justify-center gap-2 text-center text-[12px] ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </div>
            <div className="mt-1 text-center text-[20px] font-semibold">{item.count}</div>
          </button>
        );
      })}
    </div>
  );
}
