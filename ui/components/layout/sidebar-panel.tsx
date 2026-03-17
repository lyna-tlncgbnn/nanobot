"use client";

import { Bot, PanelLeftDashed, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  loading,
}: {
  sessions: SessionItem[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  loading: boolean;
}) {
  return (
    <aside className="hidden h-full min-h-0 w-[280px] shrink-0 rounded-[18px] border border-border bg-[rgba(255,250,241,0.9)] p-2.5 shadow-[0_18px_56px_rgba(74,54,18,0.06)] lg:flex lg:flex-col lg:overflow-hidden">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            TASK
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-panel-strong p-1.5 text-muted-foreground">
          <PanelLeftDashed className="h-3.5 w-3.5" />
        </div>
      </div>

      <Button className="mt-2 h-10 justify-start gap-2 rounded-[14px] px-3" onClick={onCreateSession}>
        <Plus className="h-3.5 w-3.5" />
        新建会话
      </Button>

      <ScrollArea className="mt-2 min-h-0 flex-1">
        <div className="space-y-2">
          {loading ? (
            <div className="rounded-[14px] border border-border bg-white/60 px-3 py-2.5 text-[12px] text-muted-foreground">
              正在加载会话列表...
            </div>
          ) : null}

          {sessions.map((session) => (
            <button
              key={session.id}
              className={`w-full rounded-[14px] border px-3 py-2.5 text-left transition ${
                session.id === activeSessionId
                  ? "border-[rgba(180,106,44,0.22)] bg-[rgba(180,106,44,0.10)]"
                  : "border-border bg-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.92)]"
              }`}
              onClick={() => onSelectSession(session.id)}
              type="button"
              title={session.title}
            >
              <div className="flex items-start gap-2">
                <div className="rounded-[12px] bg-panel-strong p-1.5 text-accent">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0 overflow-hidden">
                      <div className="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium leading-5">
                        {session.title}
                      </div>
                    </div>
                    <div className="max-w-20 truncate pt-0.5 text-right font-mono text-[10px] text-muted-foreground">
                      {session.time}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
