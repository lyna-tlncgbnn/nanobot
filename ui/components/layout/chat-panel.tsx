"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Hammer, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionMessage } from "@/lib/api/client";

type ChatPanelProps = {
  messages: SessionMessage[];
  draft: string;
  isSending: boolean;
  loadingHistory: boolean;
  error: string | null;
  pendingUserMessage: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void | Promise<void>;
};

function getMessageTitle(message: SessionMessage) {
  if (message.role === "assistant") {
    return "Agent";
  }
  if (message.role === "tool") {
    return "Tool";
  }
  return "You";
}

function splitRuntimeContext(content: string) {
  const marker = "[Runtime Context]";
  const index = content.indexOf(marker);
  if (index === -1) {
    return { main: content.trim(), runtime: "" };
  }

  const main = content.slice(0, index).trim();
  const runtime = content.slice(index).trim();
  return { main, runtime };
}

function formatToolCalls(message: SessionMessage) {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return "";
  }

  return message.tool_calls
    .map((toolCall) => {
      const functionPayload =
        typeof toolCall === "object" && toolCall && "function" in toolCall ? toolCall.function : null;
      if (
        functionPayload &&
        typeof functionPayload === "object" &&
        "name" in functionPayload &&
        typeof functionPayload.name === "string"
      ) {
        const argumentsText =
          "arguments" in functionPayload && typeof functionPayload.arguments === "string"
            ? functionPayload.arguments
            : "";
        return argumentsText ? `${functionPayload.name}(${argumentsText})` : functionPayload.name;
      }
      return "tool_call";
    })
    .join("\n");
}

export function ChatPanel({
  messages,
  draft,
  isSending,
  loadingHistory,
  error,
  pendingUserMessage,
  onDraftChange,
  onSend,
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = endRef.current;
    if (!node) {
      return;
    }

    requestAnimationFrame(() => {
      node.scrollIntoView({ block: "end" });
    });
  }, [messages, pendingUserMessage, loadingHistory, error]);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[18px] border border-border bg-panel px-3 py-3 shadow-[0_18px_56px_rgba(74,54,18,0.06)]">
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Chat Surface
        </div>
        <div className="flex items-center gap-1.5">
          <Badge>{isSending ? "处理中" : "已接后端"}</Badge>
          <Badge variant="secondary">{messages.length} 条消息</Badge>
        </div>
      </div>

      <ScrollArea className="mt-2 min-h-0 flex-1 pr-1">
        <div className="space-y-2 pb-2">
          {loadingHistory ? (
            <article className="rounded-[14px] border border-border bg-white/70 px-3 py-2.5 text-[12px] text-muted-foreground">
              正在加载会话历史...
            </article>
          ) : messages.length === 0 ? (
            <article className="rounded-[14px] border border-dashed border-border bg-white/55 px-3 py-2.5 text-[12px] text-muted-foreground">
              当前会话还没有消息，可以直接输入一个任务。
            </article>
          ) : (
            messages.map((message) => {
              const { main, runtime } = splitRuntimeContext(message.content);
              const toolCallSummary = formatToolCalls(message);
              const isUser = message.role === "user";
              const isAssistant = message.role === "assistant";
              const isTool = message.role === "tool";

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <article
                    className={`w-full rounded-[14px] border px-3 py-2 ${
                      isUser
                        ? "max-w-[70%] border-[rgba(180,106,44,0.26)] bg-[rgba(180,106,44,0.14)]"
                        : isAssistant
                          ? "max-w-[80%] border-[rgba(180,106,44,0.14)] bg-[rgba(255,255,255,0.88)]"
                          : "max-w-[84%] border-[rgba(93,72,36,0.16)] bg-[rgba(93,72,36,0.06)]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {isAssistant ? (
                        <Sparkles className="h-3.5 w-3.5" />
                      ) : isTool ? (
                        <Hammer className="h-3.5 w-3.5" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                      {getMessageTitle(message)}
                    </div>

                    {main ? (
                      <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-foreground">
                        {main}
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
                </div>
              );
            })
          )}

          {pendingUserMessage ? (
            <div className="flex justify-end">
              <article className="w-full max-w-[70%] rounded-[14px] border border-[rgba(180,106,44,0.26)] bg-[rgba(180,106,44,0.14)] px-3 py-2 opacity-80">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  You
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-foreground">
                  {pendingUserMessage}
                </div>
              </article>
            </div>
          ) : null}

          {error ? (
            <article className="rounded-[14px] border border-[rgba(154,50,36,0.18)] bg-[rgba(154,50,36,0.08)] px-3 py-2.5 text-[13px] leading-5 text-foreground">
              {error}
            </article>
          ) : null}

          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="mt-2 shrink-0 flex items-center gap-2 rounded-[12px] border border-border bg-[rgba(255,255,255,0.68)] px-3 py-2">
        <input
          className="h-8 w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void onSend();
            }
          }}
          placeholder="输入你的任务..."
          value={draft}
        />
        <Button
          className="h-8 gap-1.5 rounded-[10px] px-3 text-[12px]"
          disabled={isSending || !draft.trim()}
          onClick={() => void onSend()}
        >
          {isSending ? "处理中" : "发送"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}
