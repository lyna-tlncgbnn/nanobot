"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Bot, Clock3, Files, Sparkles, Wrench } from "lucide-react";
import { MessageCard } from "@/components/chat/message-card";
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

function buildRenderKey(message: SessionMessage, index: number) {
  return [
    message.id ?? "",
    message.role,
    message.timestamp ?? "no-ts",
    message.tool_call_id ?? "no-tool",
    index,
  ].join(":");
}

const emptyStatePrompts = [
  {
    title: "整理文件",
    description: "帮我查看 F 盘某个目录里都有什么，并做一个简短整理。",
    icon: Files,
    prompt: "帮我查看 F 盘某个目录里都有什么，并做一个简短整理。",
  },
  {
    title: "执行网页任务",
    description: "打开一个网站，登录后按步骤完成查询或导出。",
    icon: Wrench,
    prompt: "打开一个网站，登录后按步骤完成查询或导出。",
  },
  {
    title: "定时任务",
    description: "帮我创建一个定时任务，每天固定时间执行一次。",
    icon: Clock3,
    prompt: "帮我创建一个定时任务，每天固定时间执行一次。",
  },
  {
    title: "总结说明",
    description: "读取一个文件或结果，然后输出一份清晰的总结。",
    icon: Sparkles,
    prompt: "读取一个文件或结果，然后输出一份清晰的总结。",
  },
];

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
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[18px] border border-border bg-panel px-3 py-3 shadow-[0_18px_56px_rgba(36,38,42,0.04)]">
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
            <article className="rounded-[14px] border border-border bg-[rgba(255,255,255,0.78)] px-3 py-2.5 text-[12px] text-muted-foreground">
              正在加载会话历史...
            </article>
          ) : messages.length === 0 ? (
            <section className="flex min-h-full items-center justify-center px-4 py-8">
              <div className="w-full max-w-[760px]">
                <div className="px-6 py-7">
                  <div className="flex items-center justify-center">
                    <div className="rounded-[18px] border border-[rgba(180,106,44,0.08)] bg-[rgba(180,106,44,0.025)] p-3 text-accent">
                      <Bot className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-[24px] font-semibold tracking-tight text-foreground">
                      开始一个新的任务
                    </div>
                    <p className="mx-auto mt-2 max-w-[560px] text-[13px] leading-6 text-muted-foreground">
                      可以直接输入你的目标，也可以先从下面这些常见任务模板开始。
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {/* 空状态不再只留一条提示语，而是给出几个常见入口，减少中间大面积留白。 */}
                    {emptyStatePrompts.map(({ title, description, icon: Icon, prompt }) => (
                      <button
                        key={title}
                        className="rounded-[18px] border border-border bg-[rgba(255,255,255,0.78)] px-4 py-4 text-left transition hover:bg-white"
                        onClick={() => onDraftChange(prompt)}
                        type="button"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                          <div className="rounded-[12px] bg-panel-strong p-2 text-accent">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{title}</span>
                        </div>
                        <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
                          {description}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[18px] border border-dashed border-border bg-[rgba(255,255,255,0.62)] px-4 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Tips
                    </div>
                    <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
                      你可以让我读取文件、执行网页操作、调用工具、整理结果，或者把某个流程做成定时任务。
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            messages.map((message, index) => {
              const { main, runtime } = splitRuntimeContext(message.content);
              const toolCallSummary = formatToolCalls(message);
              const role =
                message.role === "tool" ? "tool" : message.role === "assistant" ? "assistant" : "user";

              return (
                <div
                  key={buildRenderKey(message, index)}
                  className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {/* 这里把整张消息卡也抽成独立组件，chat-panel 只保留列表编排和滚动逻辑。
                      后续如果继续调消息宽度、边框、角色样式，只需要集中改 MessageCard。 */}
                  <MessageCard
                    main={main}
                    role={role}
                    runtime={runtime}
                    title={getMessageTitle(message)}
                    toolCallSummary={toolCallSummary}
                  />
                </div>
              );
            })
          )}

          {pendingUserMessage ? (
            <div className="flex justify-end">
              <MessageCard faded main={pendingUserMessage} role="user" title="You" />
            </div>
          ) : null}

          {error ? (
            <article className="rounded-[14px] border border-[rgba(154,50,36,0.16)] bg-[rgba(154,50,36,0.05)] px-3 py-2.5 text-[13px] leading-5 text-foreground">
              {error}
            </article>
          ) : null}

          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="mt-2 shrink-0 flex items-center gap-2 rounded-[12px] border border-border bg-[rgba(255,255,255,0.84)] px-3 py-2">
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
