"use client";

import { useEffect, useMemo, useState } from "react";
import { JobCreateDialog } from "@/components/jobs/job-create-dialog";
import { JobList } from "@/components/jobs/job-list";
import { JobsSummary } from "@/components/jobs/jobs-summary";
import { Badge } from "@/components/ui/badge";
import type { JobHistoryItem, JobResponse } from "@/lib/api/client";
import type { DetailSelection, JobTab } from "@/components/jobs/utils";

export type JobsPanelProps = {
  activeSessionId: string;
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
};

export function JobsPanel({
  activeSessionId,
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
    // 切换分组后清空当前详情，避免上一个分组的详情状态残留。
    setSelection(null);
  }, [tab]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-border bg-[rgba(255,250,241,0.92)] px-3 py-3 shadow-[0_18px_56px_rgba(74,54,18,0.06)]">
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Jobs Panel
          </div>
        </div>
        <Badge className="justify-center text-center" variant="secondary">
          {pendingJobs.length + completedJobs.length + failedJobs.length} 项
        </Badge>
      </div>

      <div className="pt-2">
        <JobCreateDialog
          activeSessionId={activeSessionId}
          creating={creating}
          onClose={() => setShowCreateDialog(false)}
          onOpen={() => setShowCreateDialog(true)}
          onCreateJob={onCreateJob}
          open={showCreateDialog}
        />
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
    </aside>
  );
}
