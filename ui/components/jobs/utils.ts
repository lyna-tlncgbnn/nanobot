import type { JobHistoryItem, JobResponse } from "@/lib/api/client";

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未设置";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function describeSchedule(job: JobResponse) {
  if (job.schedule.kind === "at") {
    return `一次性 · ${formatDateTime(job.schedule.at ?? null)}`;
  }
  if (job.schedule.kind === "every") {
    const seconds = Math.max(0, Math.floor((job.schedule.every_ms ?? 0) / 1000));
    if (seconds >= 3600 && seconds % 3600 === 0) {
      return `每 ${seconds / 3600} 小时`;
    }
    if (seconds >= 60 && seconds % 60 === 0) {
      return `每 ${seconds / 60} 分钟`;
    }
    return `每 ${seconds} 秒`;
  }
  return job.schedule.tz ? `Cron · ${job.schedule.expr} · ${job.schedule.tz}` : `Cron · ${job.schedule.expr}`;
}

export function getHistoryScheduleLabel(item: JobHistoryItem) {
  if (item.schedule_kind === "at") {
    return `一次性 · ${formatDateTime(item.scheduled_for ?? null)}`;
  }
  return item.schedule_kind === "cron" ? "Cron 任务" : "周期任务";
}

export function getStatusBadge(status: string) {
  if (status === "error" || status === "failed") {
    return {
      label: "失败",
      className: "border-[rgba(154,50,36,0.18)] bg-[rgba(154,50,36,0.08)] text-[rgba(154,50,36,1)]",
    };
  }
  if (status === "disabled") {
    return {
      label: "停用",
      className: "border-border bg-panel-strong text-muted-foreground",
    };
  }
  if (status === "completed") {
    return {
      label: "完成",
      className: "border-[rgba(54,121,72,0.18)] bg-[rgba(54,121,72,0.08)] text-[rgba(54,121,72,1)]",
    };
  }
  return {
    label: "待执行",
    className: "border-[rgba(180,106,44,0.22)] bg-[rgba(180,106,44,0.10)] text-accent",
  };
}

export type JobTab = "pending" | "completed" | "failed";

export type DetailSelection =
  | { type: "job"; id: string }
  | { type: "history"; id: string }
  | null;

