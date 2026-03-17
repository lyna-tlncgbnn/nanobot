"use client";

import { Bot, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type SessionItem = {
  id: string;
  title: string;
  time: string;
};

export function SidebarPanel({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  collapsed,
  onToggleCollapse,
  deletingSessionId,
  loading,
}: {
  sessions: SessionItem[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  deletingSessionId: string | null;
  loading: boolean;
}) {
  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 shrink-0 rounded-[18px] border border-border bg-[rgba(255,250,241,0.9)] px-3 py-3 shadow-[0_18px_56px_rgba(74,54,18,0.06)] lg:flex lg:flex-col lg:overflow-hidden",
        collapsed ? "w-[78px]" : "w-[280px]",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-border pb-2",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Task
          </div>
        ) : null}
        <button
          className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-[12px] border border-border bg-panel-strong text-muted-foreground transition hover:border-[rgba(180,106,44,0.22)] hover:text-accent"
          onClick={onToggleCollapse}
          title={collapsed ? "展开侧栏" : "收起侧栏"}
          type="button"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {collapsed ? (
        <>
          {/* 收起后保留一条窄边栏，符合常见控制台/聊天应用的侧栏行为。
              这样不会完全丢失导航入口，同时也给中间内容让出更多空间。 */}
          <Button className="mt-2 h-10 w-full rounded-[14px] px-0" onClick={onCreateSession} title="开始任务">
            <Plus className="h-4 w-4" />
          </Button>

          <ScrollArea className="mt-2 min-h-0 flex-1" scrollbarClassName="translate-x-1">
            {loading ? (
              <div className="flex justify-center px-1 py-2 text-[11px] text-muted-foreground">...</div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((session) => {
                  const active = session.id === activeSessionId;

                  return (
                    <div key={session.id} className="flex justify-center">
                      <button
                        className={cn(
                          "relative inline-flex h-11 w-11 items-center justify-center rounded-[14px] transition",
                          active
                            ? "bg-[rgba(180,106,44,0.12)] text-accent"
                            : "bg-transparent text-muted-foreground hover:bg-[rgba(255,255,255,0.52)] hover:text-accent",
                        )}
                        onClick={() => onSelectSession(session.id)}
                        title={`${session.title}\n${session.time}`}
                        type="button"
                      >
                        <Bot className="h-4 w-4" />
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </>
      ) : (
        <>
          <Button
            className="mt-2 h-10 w-full justify-center gap-2 rounded-[14px] px-3 text-[13px]"
            onClick={onCreateSession}
          >
            <Plus className="h-3.5 w-3.5" />
            开始任务
          </Button>

          <ScrollArea className="mt-2 min-h-0 flex-1" scrollbarClassName="translate-x-1">
            {loading ? (
              <div className="rounded-[12px] bg-white/50 px-3 py-3 text-[12px] text-muted-foreground">
                正在加载会话列表...
              </div>
            ) : (
              <div className="divide-y divide-[rgba(53,40,17,0.08)]">
                {sessions.map((session) => {
                  const active = session.id === activeSessionId;

                  return (
                    <div key={session.id} className="group relative py-1.5">
                      {/* 左栏本质上是导航列表，不适合再用一张张厚卡片。
                          这里改成轻量列表项，靠分割线和选中态区分，减少“AI 组件墙”的感觉。 */}
                      <div
                        className={cn(
                          "absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent transition-opacity",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                        )}
                      />

                      <div
                        className={cn(
                          "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[12px] px-3 py-2 transition",
                          active
                            ? "bg-[rgba(180,106,44,0.08)]"
                            : "hover:bg-[rgba(255,255,255,0.48)]",
                        )}
                        title={session.title}
                      >
                        <button
                          className="flex min-w-0 items-start gap-2.5 overflow-hidden text-left"
                          onClick={() => onSelectSession(session.id)}
                          type="button"
                        >
                          <div
                            className={cn(
                              "mt-0.5 rounded-[10px] p-1.5 transition",
                              active
                                ? "bg-[rgba(240,231,212,0.95)] text-accent"
                                : "bg-panel-strong/70 text-accent",
                            )}
                          >
                            <Bot className="h-3.5 w-3.5" />
                          </div>

                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="truncate text-[14px] font-medium leading-5 text-foreground">
                              {session.title}
                            </div>
                            <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                              {session.time}
                            </div>
                          </div>
                        </button>

                        <button
                          className={cn(
                            "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground transition",
                            active
                              ? "bg-white/65 hover:bg-white/85 hover:text-accent"
                              : "opacity-55 hover:bg-white/65 hover:text-accent group-hover:opacity-100",
                          )}
                          disabled={deletingSessionId === session.id}
                          onClick={() => onDeleteSession(session.id)}
                          title="删除会话"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </aside>
  );
}
