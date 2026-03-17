"use client";

import { Bot, FileStack, Hammer, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function DetailPanel({
  toolName,
  sessionCount,
  activeSessionId,
  latestReply,
}: {
  toolName: string;
  sessionCount: number;
  activeSessionId: string;
  latestReply: string;
}) {
  const toolCards = [
    {
      title: toolName,
      status: "Ready",
      body: "当前最小闭环已经能通过后端 API 驱动 nanobot，后续再接时间线和参数摘要。",
      icon: Hammer,
    },
    {
      title: "Artifacts",
      status: "暂未接入",
      body: "后续接 browser-use 产物、下载文件和路径跳转。",
      icon: FileStack,
    },
    {
      title: "Jobs",
      status: "暂未接入",
      body: "后续接 nanobot cron 列表与执行记录。",
      icon: TimerReset,
    },
  ];

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-border bg-[rgba(255,250,241,0.92)] px-3 py-3 shadow-[0_18px_56px_rgba(74,54,18,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Detail Panel
          </div>
          <div className="mt-0.5 text-[14px] font-semibold">工具与上下文</div>
        </div>
        <Badge variant="secondary">Phase 2</Badge>
      </div>

      <div className="mt-2 shrink-0 rounded-[14px] border border-border bg-white/60 p-3">
        <div className="flex items-center gap-2">
          <div className="rounded-[12px] bg-panel-strong p-1.5 text-accent">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[13px] font-medium">Nanobot runtime</div>
            <div className="text-[12px] leading-5 text-muted-foreground">
              已接入 `/api/chat`、`/api/sessions` 与 `/api/sessions/{"{id}"}`
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 shrink-0 rounded-[14px] border border-border bg-white/60 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          当前会话
        </div>
        <div className="mt-1.5 break-all text-[13px] font-medium leading-5">{activeSessionId}</div>

        <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          会话总数
        </div>
        <div className="mt-1 text-[13px] font-medium">{sessionCount}</div>

        <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          最新回复摘要
        </div>
        <p className="mt-1 line-clamp-5 break-words text-[12px] leading-5 text-muted-foreground">
          {latestReply ? latestReply.slice(0, 160) : "暂无回复。"}
        </p>
      </div>

      <Separator className="my-3" />

      <ScrollArea className="min-h-0 flex-1 pr-1">
        <div className="space-y-2">
          {toolCards.map(({ title, status, body, icon: Icon }) => (
            <article key={title} className="rounded-[14px] border border-border bg-white/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="rounded-[12px] bg-panel-strong p-1.5 text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate text-[13px] font-medium">{title}</div>
                </div>
                <Badge>{status}</Badge>
              </div>
              <p className="mt-1.5 break-words text-[12px] leading-5 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
