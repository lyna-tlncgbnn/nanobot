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
    <div className="mt-2 border-b border-[rgba(53,40,17,0.08)] pb-2">
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;

          return (
            <button
              key={item.key}
              className={`rounded-[10px] px-2 py-2 text-left transition-colors ${
                active
                  ? "bg-[rgba(180,106,44,0.08)] text-accent"
                  : "text-foreground hover:bg-[rgba(255,255,255,0.38)]"
              }`}
              onClick={() => onChange(item.key)}
              type="button"
            >
              <div
                className={`flex items-center gap-1.5 text-[11px] ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </div>
              <div className="mt-1 pl-5 text-[18px] font-semibold leading-none">{item.count}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
