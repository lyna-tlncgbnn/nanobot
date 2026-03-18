"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, XCircle } from "lucide-react";
import { JobCreateDialog } from "@/components/jobs/job-create-dialog";
import { JobList } from "@/components/jobs/job-list";
import { JobsSummary } from "@/components/jobs/jobs-summary";
import { Button } from "@/components/ui/button";
import type { JobHistoryItem, JobResponse } from "@/lib/api/client";
import type { DetailSelection, JobTab } from "@/components/jobs/utils";
import { cn } from "@/lib/utils";

export type JobsPanelProps = {
  activeSessionId: string;
  collapsed: boolean;
  jobs: JobResponse[];
  history: JobHistoryItem[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  updatingJobId: string | null;
  deletingJobId: string | null;
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
  onToggleJob: (job: JobResponse) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onToggleCollapse: () => void;
};

export function JobsPanel({
  activeSessionId,
  collapsed,
  jobs,
  history,
  loading,
  error,
  creating,
  updatingJobId,
  deletingJobId,
  onCreateJob,
  onToggleJob,
  onDeleteJob,
  onToggleCollapse,
}: JobsPanelProps) {
  const [tab, setTab] = useState<JobTab>("pending");
  const [selection, setSelection] = useState<DetailSelection>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const pendingJobs = useMemo(
    () => jobs.filter((job) => job.state.last_status === null || job.state.last_status !== "error"),
    [jobs],
  );
  const completedJobs = useMemo(() => history.filter((item) => item.status === "ok"), [history]);
  const failedJobs = useMemo(
    () => [
      ...jobs.filter((job) => job.state.last_status === "error").map((job) => ({
        run_id: `live:${job.id}`,
        job_id: job.id,
        job_name: job.name,
        message: job.payload.message,
        channel: job.payload.channel ?? null,
        target: job.payload.to ?? null,
        schedule_kind: job.schedule.kind,
        scheduled_for_ms: job.state.next_run_at_ms ?? null,
        scheduled_for: job.state.next_run_at ?? null,
        executed_at_ms: job.state.last_run_at_ms ?? 0,
        executed_at: job.state.last_run_at ?? "",
        status: "error" as const,
        response: null,
        response_preview: null,
        error: job.state.last_error ?? "执行失败",
        cron_session_key: `cron:${job.id}`,
      })),
      ...history.filter((item) => item.status === "error"),
    ],
    [jobs, history],
  );

  useEffect(() => {
    if (!selection) {
      return;
    }
    const exists =
      selection.type === "job"
        ? pendingJobs.some((job) => job.id === selection.id)
        : [...completedJobs, ...failedJobs].some((item) => item.run_id === selection.id);
    if (!exists) {
      setSelection(null);
    }
  }, [selection, pendingJobs, completedJobs, failedJobs]);

  useEffect(() => {
    setSelection(null);
  }, [tab]);

  const collapsedItems: Array<{
    key: JobTab;
    label: string;
    count: number;
    icon: typeof Clock3;
  }> = [
    { key: "pending", label: "待执行", count: pendingJobs.length, icon: Clock3 },
    { key: "completed", label: "已完成", count: completedJobs.length, icon: CheckCircle2 },
    { key: "failed", label: "失败", count: failedJobs.length, icon: XCircle },
  ];

  const handleCollapsedTabOpen = (nextTab: JobTab) => {
    setTab(nextTab);
    onToggleCollapse();
  };

  const handleCollapsedCreate = () => {
    setShowCreateDialog(true);
    onToggleCollapse();
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-border bg-[rgba(255,250,241,0.92)] px-3 py-3 shadow-[0_18px_56px_rgba(74,54,18,0.06)]",
        collapsed ? "w-[78px]" : "w-full",
      )}
    >
      <JobCreateDialog
        activeSessionId={activeSessionId}
        creating={creating}
        onClose={() => setShowCreateDialog(false)}
        onOpen={() => setShowCreateDialog(true)}
        onCreateJob={onCreateJob}
        open={showCreateDialog}
        showTrigger={false}
      />

      <div
        className={cn(
          "flex shrink-0 items-center border-b border-border pb-2",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Jobs Panel
            </div>
          </div>
        ) : null}
        <button
          className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-[12px] border border-border bg-panel-strong text-muted-foreground transition hover:border-[rgba(180,106,44,0.22)] hover:text-accent"
          onClick={onToggleCollapse}
          title={collapsed ? "展开任务面板" : "收起任务面板"}
          type="button"
        >
          {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      </div>

      {collapsed ? (
        <>
          <Button className="mt-2 h-10 w-full rounded-[14px] px-0" onClick={handleCollapsedCreate} title="新建任务">
            <Plus className="h-4 w-4" />
          </Button>

          <div className="mt-2 flex min-h-0 flex-1 flex-col items-center gap-1.5">
            {collapsedItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;

              return (
                <button
                  key={item.key}
                  className={cn(
                    "relative inline-flex h-11 w-11 items-center justify-center rounded-[14px] transition",
                    active
                      ? "bg-[rgba(180,106,44,0.12)] text-accent"
                      : "bg-transparent text-muted-foreground hover:bg-[rgba(255,255,255,0.52)] hover:text-accent",
                  )}
                  onClick={() => handleCollapsedTabOpen(item.key)}
                  title={`${item.label}: ${item.count}`}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full border border-border bg-white/90 px-1 text-center font-mono text-[10px] leading-4 text-foreground">
                    {item.count}
                  </span>
                  {active ? (
                    <span className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="pt-2">
            <Button
              className="h-10 w-full justify-center gap-2 rounded-[14px] px-3 text-[13px]"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              定时任务
            </Button>
          </div>

          <JobsSummary
            completed={completedJobs.length}
            failed={failedJobs.length}
            onChange={setTab}
            pending={pendingJobs.length}
            tab={tab}
          />

          <JobList
            completedJobs={completedJobs}
            deletingJobId={deletingJobId}
            error={error}
            failedJobs={failedJobs}
            loading={loading}
            onDeleteJob={onDeleteJob}
            onSelect={setSelection}
            onToggleJob={onToggleJob}
            pendingJobs={pendingJobs}
            selection={selection}
            tab={tab}
            updatingJobId={updatingJobId}
          />
        </>
      )}
    </aside>
  );
}
