"use client";

import { CalendarClock, LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function toLocalDateTimeInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function JobCreateForm({
  activeSessionId,
  creating,
  onCreateJob,
  onCreated,
}: {
  activeSessionId: string;
  creating: boolean;
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
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleType, setScheduleType] = useState<"at" | "every" | "cron">("at");
  const [atValue, setAtValue] = useState("");
  const [everySeconds, setEverySeconds] = useState("600");
  const [cronExpr, setCronExpr] = useState("0 9 * * *");
  const [timezone, setTimezone] = useState("");
  const [deliver, setDeliver] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const minAtValue = toLocalDateTimeInputValue(new Date(Date.now() + 60_000));

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) {
      setFormError("请先填写任务标题和任务内容。");
      return;
    }
    if (scheduleType === "at" && !atValue) {
      setFormError("请选择一次性任务的执行时间。");
      return;
    }
    if (scheduleType === "at" && atValue) {
      const atDate = new Date(atValue);
      if (Number.isNaN(atDate.getTime())) {
        setFormError("一次性任务时间格式无效。");
        return;
      }
      // datetime-local 输入是本地时间，这里按本地时间解析后再校验，
      // 避免 UTC 字符串造成“看起来未来、实际已过期”的错觉。
      if (atDate.getTime() <= Date.now() + 30_000) {
        setFormError("一次性任务时间需要至少晚于当前 30 秒。");
        return;
      }
    }
    if (scheduleType === "every" && (!everySeconds || Number(everySeconds) <= 0)) {
      setFormError("请填写大于 0 的间隔秒数。");
      return;
    }
    if (scheduleType === "cron" && !cronExpr.trim()) {
      setFormError("请填写 Cron 表达式。");
      return;
    }

    setFormError(null);
    try {
      await onCreateJob({
        name: trimmedName,
        message: trimmedMessage,
        deliver,
        channel: deliver ? "web" : undefined,
        to: deliver ? activeSessionId : undefined,
        at: scheduleType === "at" ? new Date(atValue).toISOString() : undefined,
        every_seconds: scheduleType === "every" ? Number(everySeconds) : undefined,
        cron_expr: scheduleType === "cron" ? cronExpr.trim() : undefined,
        tz: scheduleType === "cron" && timezone.trim() ? timezone.trim() : undefined,
      });
      setName("");
      setMessage("");
      setScheduleType("at");
      setEverySeconds("600");
      setCronExpr("0 9 * * *");
      setTimezone("");
      setAtValue("");
      onCreated?.();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "创建任务失败。");
    }
  };

  return (
    <div className="rounded-[14px] border border-border bg-[rgba(255,255,255,0.74)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium">新建任务</div>
          <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
            默认把结果投递回当前 web 会话。
          </div>
        </div>
        <Badge>{activeSessionId.replace(/^web:/, "")}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        <input
          className="h-9 w-full rounded-[12px] border border-border bg-[rgba(255,255,255,0.88)] px-3 text-[13px] outline-none focus:border-[rgba(180,106,44,0.22)]"
          placeholder="任务标题"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <textarea
          className="min-h-[82px] w-full rounded-[12px] border border-border bg-[rgba(255,255,255,0.88)] px-3 py-2 text-[13px] outline-none focus:border-[rgba(180,106,44,0.22)]"
          placeholder="任务内容，例如：提醒我带伞"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />

        <div className="grid grid-cols-3 gap-2">
          <button
            className={`rounded-[12px] border px-2 py-2 text-[12px] ${
              scheduleType === "at"
                ? "border-[rgba(180,106,44,0.16)] bg-[rgba(180,106,44,0.04)] text-accent"
                : "border-border bg-[rgba(255,255,255,0.74)] text-muted-foreground"
            }`}
            onClick={() => setScheduleType("at")}
            type="button"
          >
            一次性
          </button>
          <button
            className={`rounded-[12px] border px-2 py-2 text-[12px] ${
              scheduleType === "every"
                ? "border-[rgba(180,106,44,0.16)] bg-[rgba(180,106,44,0.04)] text-accent"
                : "border-border bg-[rgba(255,255,255,0.74)] text-muted-foreground"
            }`}
            onClick={() => setScheduleType("every")}
            type="button"
          >
            间隔
          </button>
          <button
            className={`rounded-[12px] border px-2 py-2 text-[12px] ${
              scheduleType === "cron"
                ? "border-[rgba(180,106,44,0.16)] bg-[rgba(180,106,44,0.04)] text-accent"
                : "border-border bg-[rgba(255,255,255,0.74)] text-muted-foreground"
            }`}
            onClick={() => setScheduleType("cron")}
            type="button"
          >
            Cron
          </button>
        </div>

        {scheduleType === "at" ? (
          <div className="rounded-[14px] border border-[rgba(180,106,44,0.12)] bg-[rgba(255,255,255,0.74)] p-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-accent">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>执行时间</span>
            </div>
            <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
              选择这条一次性任务的触发时间。
            </div>
            <input
              className="mt-3 h-11 w-full rounded-[12px] border border-border bg-[rgba(255,255,255,0.92)] px-3 text-[14px] text-foreground outline-none transition-colors [color-scheme:light] focus:border-[rgba(180,106,44,0.24)]"
              min={minAtValue}
              type="datetime-local"
              value={atValue}
              onChange={(event) => setAtValue(event.target.value)}
            />
          </div>
        ) : null}

        {scheduleType === "every" ? (
          <input
            className="h-9 w-full rounded-[12px] border border-border bg-[rgba(255,255,255,0.88)] px-3 text-[13px] outline-none focus:border-[rgba(180,106,44,0.22)]"
            min={1}
            placeholder="间隔秒数，例如 600"
            type="number"
            value={everySeconds}
            onChange={(event) => setEverySeconds(event.target.value)}
          />
        ) : null}

        {scheduleType === "cron" ? (
          <div className="space-y-2">
            <input
              className="h-9 w-full rounded-[12px] border border-border bg-[rgba(255,255,255,0.88)] px-3 text-[13px] outline-none focus:border-[rgba(180,106,44,0.22)]"
              placeholder="Cron 表达式，例如 0 9 * * *"
              value={cronExpr}
              onChange={(event) => setCronExpr(event.target.value)}
            />
            <input
              className="h-9 w-full rounded-[12px] border border-border bg-[rgba(255,255,255,0.88)] px-3 text-[13px] outline-none focus:border-[rgba(180,106,44,0.22)]"
              placeholder="时区，可选，例如 Asia/Shanghai"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <input checked={deliver} onChange={(event) => setDeliver(event.target.checked)} type="checkbox" />
          执行后回写到当前会话
        </label>

        {formError ? (
          <div className="rounded-[12px] border border-[rgba(154,50,36,0.18)] bg-[rgba(154,50,36,0.08)] px-3 py-2 text-[12px] text-[rgba(154,50,36,1)]">
            {formError}
          </div>
        ) : null}

        <Button className="h-9 w-full gap-1.5 text-[12px]" disabled={creating} onClick={() => void handleCreate()}>
          {creating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          创建任务
        </Button>
      </div>
    </div>
  );
}
