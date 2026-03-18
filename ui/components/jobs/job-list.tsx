"use client";

import { Trash2 } from "lucide-react";
import { JobDetailDialog } from "@/components/jobs/job-detail-dialog";
import {
  describeSchedule,
  formatDateTime,
  getHistoryScheduleLabel,
  getStatusBadge,
  type DetailSelection,
  type JobTab,
} from "@/components/jobs/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { JobHistoryItem, JobResponse } from "@/lib/api/client";

export function JobList({
  tab,
  loading,
  error,
  pendingJobs,
  completedJobs,
  failedJobs,
  selection,
  updatingJobId,
  deletingJobId,
  onSelect,
  onToggleJob,
  onDeleteJob,
}: {
  tab: JobTab;
  loading: boolean;
  error: string | null;
  pendingJobs: JobResponse[];
  completedJobs: JobHistoryItem[];
  failedJobs: JobHistoryItem[];
  selection: DetailSelection;
  updatingJobId: string | null;
  deletingJobId: string | null;
  onSelect: (selection: DetailSelection) => void;
  onToggleJob: (job: JobResponse) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
}) {
  const currentList = tab === "pending" ? pendingJobs : tab === "completed" ? completedJobs : failedJobs;
  const selectedJob =
    selection?.type === "job" ? pendingJobs.find((job) => job.id === selection.id) ?? null : null;
  const selectedHistory =
    selection?.type === "history"
      ? [...completedJobs, ...failedJobs].find((item) => item.run_id === selection.id) ?? null
      : null;

  return (
    <div className="mt-1 min-h-0 flex-1 overflow-hidden">
      <ScrollArea className="h-full" scrollbarClassName="translate-x-1">
        <div className="divide-y divide-[rgba(53,40,17,0.08)]">
          {loading ? (
            <div className="px-1 py-3 text-[12px] text-muted-foreground">正在加载任务数据...</div>
          ) : error ? (
            <div className="bg-[rgba(154,50,36,0.06)] px-1 py-3 text-[12px] text-[rgba(154,50,36,1)]">
              {error}
            </div>
          ) : currentList.length === 0 ? (
            <div className="px-1 py-3 text-[12px] text-muted-foreground">当前分组还没有任务。</div>
          ) : null}

          {tab === "pending"
            ? pendingJobs.map((job) => {
                const badge = getStatusBadge(job.enabled ? "pending" : "disabled");
                const selected = selection?.type === "job" && selection.id === job.id;

                return (
                  <div key={job.id} className={selected ? "bg-[rgba(180,106,44,0.05)]" : ""}>
                    <button
                      className="block w-full rounded-[12px] px-3 py-3 text-left transition hover:bg-[rgba(180,106,44,0.08)]"
                      onClick={() => onSelect({ type: "job", id: job.id })}
                      type="button"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-foreground">{job.name}</div>
                          <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                            {describeSchedule(job)}
                          </div>
                          <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                            {job.state.next_run_at ? `下次执行：${formatDateTime(job.state.next_run_at)}` : "等待调度"}
                          </div>
                        </div>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-[1px] text-[10px] ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 px-3 pb-3">
                      <button
                        className="inline-flex h-7 items-center justify-center rounded-[9px] border border-[rgba(53,40,17,0.14)] px-3 text-[11px] text-foreground transition hover:bg-[rgba(180,106,44,0.08)] disabled:opacity-50"
                        disabled={updatingJobId === job.id}
                        onClick={() => void onToggleJob(job)}
                        type="button"
                      >
                        {updatingJobId === job.id ? "处理中..." : job.enabled ? "停用" : "启用"}
                      </button>
                      <button
                        aria-label="删除任务"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[rgba(53,40,17,0.14)] text-muted-foreground transition hover:bg-[rgba(180,106,44,0.08)] hover:text-foreground disabled:opacity-50"
                        disabled={deletingJobId === job.id}
                        onClick={() => void onDeleteJob(job.id)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            : null}

          {tab !== "pending"
            ? currentList.map((item) => {
                const historyItem = item as JobHistoryItem;
                const badge = getStatusBadge(tab === "completed" ? "completed" : "failed");
                const selected = selection?.type === "history" && selection.id === historyItem.run_id;

                return (
                  <button
                    key={historyItem.run_id}
                    className={`block w-full rounded-[12px] px-4 py-4 text-left transition ${
                      selected ? "bg-[rgba(180,106,44,0.05)]" : "hover:bg-[rgba(180,106,44,0.08)]"
                    }`}
                    onClick={() => onSelect({ type: "history", id: historyItem.run_id })}
                    type="button"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-foreground">{historyItem.job_name}</div>
                        <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                          {getHistoryScheduleLabel(historyItem)}
                        </div>
                        <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                          {tab === "completed" ? "执行完成" : "执行失败"}：{formatDateTime(historyItem.executed_at)}
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-[1px] text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </button>
                );
              })
            : null}
        </div>
      </ScrollArea>
      <JobDetailDialog historyItem={selectedHistory} job={selectedJob} onClose={() => onSelect(null)} />
    </div>
  );
}
