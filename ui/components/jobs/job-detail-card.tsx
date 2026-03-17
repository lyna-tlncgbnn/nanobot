"use client";

import { CalendarClock } from "lucide-react";
import type { JobHistoryItem, JobResponse } from "@/lib/api/client";
import { describeSchedule, formatDateTime, getHistoryScheduleLabel } from "@/components/jobs/utils";

export function JobDetailCard({
  job,
  historyItem,
}: {
  job?: JobResponse | null;
  historyItem?: JobHistoryItem | null;
}) {
  if (job) {
    return (
      <article className="rounded-[14px] border border-border bg-[rgba(255,250,241,0.96)] p-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" />
          <div className="text-[13px] font-medium">任务详情</div>
        </div>
        <div className="mt-3 space-y-2 text-[12px] leading-5">
          <div><span className="text-muted-foreground">标题：</span>{job.name}</div>
          <div><span className="text-muted-foreground">内容：</span>{job.payload.message}</div>
          <div><span className="text-muted-foreground">调度：</span>{describeSchedule(job)}</div>
          <div><span className="text-muted-foreground">投递：</span>{job.payload.deliver ? `${job.payload.channel ?? "web"} / ${job.payload.to ?? "当前会话"}` : "仅执行，不投递"}</div>
          <div><span className="text-muted-foreground">创建时间：</span>{formatDateTime(job.created_at)}</div>
          <div><span className="text-muted-foreground">最近执行：</span>{formatDateTime(job.state.last_run_at ?? null)}</div>
          {job.state.last_error ? (
            <div className="rounded-[12px] border border-[rgba(154,50,36,0.18)] bg-[rgba(154,50,36,0.08)] px-3 py-2 text-[rgba(154,50,36,1)]">
              {job.state.last_error}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  if (historyItem) {
    return (
      <article className="rounded-[14px] border border-border bg-[rgba(255,250,241,0.96)] p-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" />
          <div className="text-[13px] font-medium">执行详情</div>
        </div>
        <div className="mt-3 space-y-2 text-[12px] leading-5">
          <div><span className="text-muted-foreground">标题：</span>{historyItem.job_name}</div>
          <div><span className="text-muted-foreground">内容：</span>{historyItem.message}</div>
          <div><span className="text-muted-foreground">执行时间：</span>{formatDateTime(historyItem.executed_at)}</div>
          <div><span className="text-muted-foreground">调度：</span>{getHistoryScheduleLabel(historyItem)}</div>
          <div><span className="text-muted-foreground">目标：</span>{historyItem.channel ?? "未指定"} / {historyItem.target ?? "未指定"}</div>
          {historyItem.response_preview ? (
            <div><span className="text-muted-foreground">结果摘要：</span>{historyItem.response_preview}</div>
          ) : null}
          {historyItem.error ? (
            <div className="rounded-[12px] border border-[rgba(154,50,36,0.18)] bg-[rgba(154,50,36,0.08)] px-3 py-2 text-[rgba(154,50,36,1)]">
              {historyItem.error}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return null;
}
