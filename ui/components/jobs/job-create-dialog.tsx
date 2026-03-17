"use client";

import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import { JobCreateForm } from "@/components/jobs/job-create-form";
import { Button } from "@/components/ui/button";

export function JobCreateDialog({
  activeSessionId,
  creating,
  open,
  onOpen,
  onClose,
  onCreateJob,
}: {
  activeSessionId: string;
  creating: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCreateJob: (input: {
    name: string;
    message: string;
    every_seconds?: number;
    cron_expr?: string;
    tz?: string;
    at?: string;
    deliver?: boolean;
    channel?: string;
    to?: string;
  }) => Promise<void>;
}) {
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

  return (
    <>
      <Button className="h-10 w-full justify-center gap-2 rounded-[14px] px-3 text-[13px]" onClick={onOpen} variant="default">
        <Plus className="h-3.5 w-3.5" />
        定时任务
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(29,26,20,0.26)] px-4 py-6">
          <button
            aria-label="关闭新建任务弹窗"
            className="absolute inset-0"
            onClick={onClose}
            type="button"
          />
          <div className="relative z-10 w-full max-w-[520px] rounded-[24px] border border-border bg-[rgba(255,250,241,0.98)] p-4 shadow-[0_30px_80px_rgba(29,26,20,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Create Job
                </div>
                <div className="mt-1 text-[18px] font-semibold">新建定时任务</div>
                <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  创建成功后，任务会出现在右侧列表里。
                </div>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/75 text-muted-foreground transition hover:bg-panel-strong hover:text-foreground"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <JobCreateForm
                activeSessionId={activeSessionId}
                creating={creating}
                onCreateJob={onCreateJob}
                onCreated={onClose}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
