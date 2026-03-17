"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChatPanel } from "@/components/layout/chat-panel";
import { DetailPanel } from "@/components/layout/detail-panel";
import { SidebarPanel } from "@/components/layout/sidebar-panel";
import {
  getSessionDetail,
  getSessions,
  streamChat,
  type SessionDetail,
  type SessionMessage,
} from "@/lib/api/client";
import { useUiStore } from "@/lib/stores/ui-store";

const toolName = "browser_agent_run";

function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "未知";
  }

  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: zhCN,
    });
  } catch {
    return value;
  }
}

function stripRuntimeContext(content: string) {
  const marker = "[Runtime Context]";
  const index = content.indexOf(marker);
  return (index === -1 ? content : content.slice(0, index)).trim();
}

export function AppShell() {
  const queryClient = useQueryClient();
  const activeSessionId = useUiStore((state) => state.activeSessionId);
  const setActiveSessionId = useUiStore((state) => state.setActiveSessionId);
  const [draft, setDraft] = useState("");
  const [streamMessages, setStreamMessages] = useState<SessionMessage[]>([]);
  const [streamTargetSessionId, setStreamTargetSessionId] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });

  const sessionDetailQuery = useQuery({
    queryKey: ["session", activeSessionId],
    queryFn: () => getSessionDetail(activeSessionId),
    enabled: Boolean(activeSessionId),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sessionId }: { message: string; sessionId: string }) =>
      streamChat(message, sessionId, {
        onEvent: (event) => {
          if (event.type === "message" && event.message) {
            setStreamMessages((current) => [...current, event.message as SessionMessage]);
          }
        },
      }),
    onMutate: async ({ message, sessionId }) => {
      const optimisticUserMessage: SessionMessage = {
        id: `optimistic:user:${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setStreamTargetSessionId(sessionId);
      setStreamMessages([optimisticUserMessage]);
      setDraft("");
    },
    onError: (_error, variables) => {
      setStreamMessages([]);
      setStreamTargetSessionId(null);
      setDraft(variables.message);
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["sessions"] }),
        queryClient.refetchQueries({ queryKey: ["session", variables.sessionId] }),
      ]);
      setStreamMessages([]);
      setStreamTargetSessionId(null);
    },
  });

  const sessions = sessionsQuery.data ?? [];
  const sessionDetail = sessionDetailQuery.data;
  const renderMessages = [
    ...(sessionDetail?.messages ?? []),
    ...(streamTargetSessionId === activeSessionId ? streamMessages : []),
  ];

  useEffect(() => {
    setStreamMessages([]);
    setStreamTargetSessionId(null);
  }, [activeSessionId]);

  const sidebarSessions = sessions.map((session) => ({
    id: session.id,
    title: session.id,
    time: formatRelativeTime(session.updated_at),
  }));
  const handleCreateSession = () => {
    const sessionId = `web:${crypto.randomUUID()}`;
    setActiveSessionId(sessionId);
    queryClient.setQueryData(["session", sessionId], {
      session_id: sessionId,
      messages: [],
    } satisfies SessionDetail);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sendMessageMutation.isPending) {
      return;
    }
    await sendMessageMutation.mutateAsync({ message: content, sessionId: activeSessionId });
  };

  return (
    <main className="noise-overlay h-screen overflow-hidden px-2 py-2 text-[12px] md:px-3 md:py-3">
      <div className="mx-auto flex h-[calc(100vh-1rem)] max-w-[1800px] gap-2 overflow-hidden">
        <SidebarPanel
          sessions={sidebarSessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onCreateSession={handleCreateSession}
          loading={sessionsQuery.isLoading}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-2 overflow-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
            <ChatPanel
              draft={draft}
              error={
                sendMessageMutation.error instanceof Error
                  ? sendMessageMutation.error.message
                  : sessionDetailQuery.error instanceof Error
                    ? sessionDetailQuery.error.message
                    : null
              }
              isSending={sendMessageMutation.isPending}
              loadingHistory={sessionDetailQuery.isLoading}
              messages={renderMessages}
              onDraftChange={setDraft}
              onSend={handleSend}
              pendingUserMessage={null}
            />

            <DetailPanel
              activeSessionId={activeSessionId}
              latestReply={
                stripRuntimeContext(
                  [...(sessionDetail?.messages ?? [])]
                    .reverse()
                    .find((message) => message.role === "assistant")?.content ?? "",
                )
              }
              sessionCount={sessions.length}
              toolName={toolName}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
