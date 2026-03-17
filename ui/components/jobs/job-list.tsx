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
import { Badge } from "@/components/ui/badge";
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
    <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[14px] border border-border bg-white/60">
      <ScrollArea className="h-full">
        <div className="space-y-2 p-3">
          {loading ? (
            <div className="rounded-[12px] border border-border bg-white/80 px-3 py-3 text-[12px] text-muted-foreground">
              正在加载任务数据...
            </div>
          ) : error ? (
            <div className="rounded-[12px] border border-[rgba(154,50,36,0.18)] bg-[rgba(154,50,36,0.08)] px-3 py-3 text-[12px] text-[rgba(154,50,36,1)]">
              {error}
            </div>
          ) : currentList.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-border bg-white/80 px-3 py-3 text-[12px] text-muted-foreground">
              当前分组还没有任务。
            </div>
          ) : null}

          {tab === "pending"
            ? pendingJobs.map((job) => {
                const badge = getStatusBadge(job.enabled ? "pending" : "disabled");
                return (
                  <article
                    key={job.id}
                    className={`rounded-[14px] border px-3 py-3 transition ${
                      selection?.type === "job" && selection.id === job.id
                        ? "border-[rgba(180,106,44,0.22)] bg-[rgba(180,106,44,0.10)]"
                        : "border-border bg-[rgba(255,255,255,0.8)]"
                    }`}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => onSelect({ type: "job", id: job.id })}
                      type="button"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0 overflow-hidden">
                          <div className="truncate text-[13px] font-medium">{job.name}</div>
                          <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                            {describeSchedule(job)}
                          </div>
                          <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                            {job.state.next_run_at ? `下次执行：${formatDateTime(job.state.next_run_at)}` : "等待调度"}
                          </div>
                        </div>
                        <Badge className={`whitespace-nowrap ${badge.className}`}>{badge.label}</Badge>
                      </div>
                    </button>

                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button
                        className="flex h-7 w-16 items-center justify-center rounded-md border text-xs transition hover:bg-muted disabled:opacity-50"
                        disabled={updatingJobId === job.id}
                        onClick={() => void onToggleJob(job)}
                        type="button"
                      >
                        {updatingJobId === job.id ? "处理中..." : job.enabled ? "停用" : "启用"}
                      </button>
                      <button
                        aria-label="删除任务"
                        className="flex h-7 w-16 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                        disabled={deletingJobId === job.id}
                        onClick={() => void onDeleteJob(job.id)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })
            : null}

          {tab !== "pending"
            ? currentList.map((item) => {
                const historyItem = item as JobHistoryItem;
                const badge = getStatusBadge(tab === "completed" ? "completed" : "failed");
                return (
                  <button
                    key={historyItem.run_id}
                    className={`block w-full rounded-[14px] border px-3 py-3 text-left transition ${
                      selection?.type === "history" && selection.id === historyItem.run_id
                        ? "border-[rgba(180,106,44,0.22)] bg-[rgba(180,106,44,0.10)]"
                        : "border-border bg-[rgba(255,255,255,0.8)]"
                    }`}
                    onClick={() => onSelect({ type: "history", id: historyItem.run_id })}
                    type="button"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0 overflow-hidden">
                        <div className="truncate text-[13px] font-medium">{historyItem.job_name}</div>
                        <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                          {getHistoryScheduleLabel(historyItem)}
                        </div>
                        <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                          {tab === "completed" ? "执行完成" : "执行失败"}：{formatDateTime(historyItem.executed_at)}
                        </div>
                      </div>
                      <Badge className={`whitespace-nowrap ${badge.className}`}>{badge.label}</Badge>
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
