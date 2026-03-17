"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { JobDetailCard } from "@/components/jobs/job-detail-card";
import type { JobHistoryItem, JobResponse } from "@/lib/api/client";

export function JobDetailDialog({
  job,
  historyItem,
  onClose,
}: {
  job?: JobResponse | null;
  historyItem?: JobHistoryItem | null;
  onClose: () => void;
}) {
  const open = Boolean(job || historyItem);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(29,26,20,0.26)] px-4 py-6">
      <button
        aria-label="关闭任务详情弹窗"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 w-full max-w-[560px] rounded-[24px] border border-border bg-[rgba(255,250,241,0.98)] p-4 shadow-[0_30px_80px_rgba(29,26,20,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Job Detail
            </div>
            <div className="mt-1 text-[18px] font-semibold">任务详情</div>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/75 text-muted-foreground transition hover:bg-panel-strong hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <JobDetailCard historyItem={historyItem} job={job} />
      </div>
    </div>
  );
}
