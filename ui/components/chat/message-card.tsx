"use client";

import { Hammer, Search, Sparkles } from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";
import { cn } from "@/lib/utils";

type MessageCardProps = {
  role: "user" | "assistant" | "tool";
  title: string;
  main: string;
  runtime?: string;
  toolCallSummary?: string;
  faded?: boolean;
};

export function MessageCard({
  role,
  title,
  main,
  runtime = "",
  toolCallSummary = "",
  faded = false,
}: MessageCardProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const isTool = role === "tool";

  return (
    <article
      className={cn(
        // 这里不用 w-full，而是改成内容自适应宽度 + 最大宽度限制。
        // 这样短消息不会被硬撑成整块大白框，长消息仍然会在限定宽度内换行。
        "inline-flex w-fit min-w-0 flex-col rounded-[14px] border px-3 py-2",
        isUser && "max-w-[70%] border-[rgba(180,106,44,0.26)] bg-[rgba(180,106,44,0.14)]",
        isAssistant && "max-w-[80%] border-[rgba(180,106,44,0.14)] bg-[rgba(255,255,255,0.88)]",
        isTool && "max-w-[84%] border-[rgba(93,72,36,0.16)] bg-[rgba(93,72,36,0.06)]",
        faded && "opacity-80",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {isAssistant ? (
          <Sparkles className="h-3.5 w-3.5" />
        ) : isTool ? (
          <Hammer className="h-3.5 w-3.5" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
        {title}
      </div>

      {main ? (
        <div className="mt-1 text-[13px] leading-5 text-foreground">
          {/* 正文渲染单独交给 MessageContent，消息卡只负责外壳和布局。 */}
          <MessageContent content={main} mode={isAssistant ? "markdown" : "plain"} />
        </div>
      ) : null}

      {!main && toolCallSummary ? (
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground">
          {toolCallSummary}
        </pre>
      ) : null}

      {runtime && !isTool ? (
        <details className="mt-1.5 rounded-[12px] border border-border/80 bg-[rgba(255,248,238,0.9)] px-2 py-1.5">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Runtime Context
          </summary>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] leading-[1.125rem] text-muted-foreground">
            {runtime}
          </pre>
        </details>
      ) : null}
    </article>
  );
}
