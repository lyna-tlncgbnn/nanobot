"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChatPanel } from "@/components/layout/chat-panel";
import { DetailPanel } from "@/components/layout/detail-panel";
import { SidebarPanel } from "@/components/layout/sidebar-panel";
import {
  createJob,
  deleteSession,
  deleteJob,
  getJobHistory,
  getJobs,
  getSessionDetail,
  getSessions,
  streamChat,
  updateJobEnabled,
  type JobResponse,
  type SessionDetail,
  type SessionMessage,
} from "@/lib/api/client";
import { useUiStore } from "@/lib/stores/ui-store";

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

function buildMessageDedupKey(message: SessionMessage) {
  return [
    message.role,
    message.name ?? "",
    message.tool_call_id ?? "",
    message.timestamp ?? "",
    message.content,
    JSON.stringify(message.tool_calls ?? []),
  ].join("::");
}

function mergeMessages(
  persistedMessages: SessionMessage[],
  streamedMessages: SessionMessage[],
): SessionMessage[] {
  const merged: SessionMessage[] = [];
  const seen = new Set<string>();

  for (const message of [...persistedMessages, ...streamedMessages]) {
    const dedupKey = buildMessageDedupKey(message);
    if (seen.has(dedupKey)) {
      continue;
    }
    seen.add(dedupKey);
    merged.push(message);
  }

  return merged;
}

export function AppShell() {
  const queryClient = useQueryClient();
  const activeSessionId = useUiStore((state) => state.activeSessionId);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setActiveSessionId = useUiStore((state) => state.setActiveSessionId);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const [draft, setDraft] = useState("");
  const [streamMessages, setStreamMessages] = useState<SessionMessage[]>([]);
  const [streamTargetSessionId, setStreamTargetSessionId] = useState<string | null>(null);
  const streamMessagesRef = useRef<SessionMessage[]>([]);

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
    refetchInterval: 5000,
  });

  const sessionDetailQuery = useQuery({
    queryKey: ["session", activeSessionId],
    queryFn: () => getSessionDetail(activeSessionId),
    enabled: Boolean(activeSessionId),
    refetchInterval: 5000,
  });
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => getJobs(true),
    refetchInterval: 5000,
  });
  const jobHistoryQuery = useQuery({
    queryKey: ["job-history"],
    queryFn: () => getJobHistory(),
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sessionId }: { message: string; sessionId: string }) =>
      streamChat(message, sessionId, {
        onEvent: (event) => {
          if (event.type === "message" && event.message) {
            const nextMessage = event.message as SessionMessage;
            streamMessagesRef.current = [...streamMessagesRef.current, nextMessage];
            setStreamMessages(streamMessagesRef.current);
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
      streamMessagesRef.current = [optimisticUserMessage];
      setStreamMessages(streamMessagesRef.current);
      setDraft("");
    },
    onError: (_error, variables) => {
      streamMessagesRef.current = [];
      setStreamMessages([]);
      setStreamTargetSessionId(null);
      setDraft(variables.message);
    },
    onSuccess: async (_data, variables) => {
      const streamedForSession =
        streamTargetSessionId === variables.sessionId ? [...streamMessagesRef.current] : [];

      queryClient.setQueryData<SessionDetail | undefined>(["session", variables.sessionId], (current) => ({
        session_id: variables.sessionId,
        messages: mergeMessages(current?.messages ?? [], streamedForSession),
      }));

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["sessions"] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
        queryClient.refetchQueries({ queryKey: ["job-history"] }),
      ]);
      streamMessagesRef.current = [];
      setStreamMessages([]);
      setStreamTargetSessionId(null);
    },
  });

  const createJobMutation = useMutation({
    mutationFn: createJob,
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
        queryClient.refetchQueries({ queryKey: ["job-history"] }),
      ]);
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ jobId, enabled }: { jobId: string; enabled: boolean }) => updateJobEnabled(jobId, enabled),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
        queryClient.refetchQueries({ queryKey: ["job-history"] }),
      ]);
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
        queryClient.refetchQueries({ queryKey: ["job-history"] }),
      ]);
    },
  });
  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: async (_data, deletedSessionId) => {
      queryClient.removeQueries({ queryKey: ["session", deletedSessionId] });

      await queryClient.refetchQueries({ queryKey: ["sessions"] });

      if (deletedSessionId === activeSessionId) {
        const emptySessionId = `web:${crypto.randomUUID()}`;
        setActiveSessionId(emptySessionId);
        queryClient.setQueryData(["session", emptySessionId], {
          session_id: emptySessionId,
          messages: [],
        } satisfies SessionDetail);
      }
    },
  });

  const sessions = sessionsQuery.data ?? [];
  const sessionDetail = sessionDetailQuery.data;
  const renderMessages = mergeMessages(
    sessionDetail?.messages ?? [],
    streamTargetSessionId === activeSessionId ? streamMessages : [],
  );

  useEffect(() => {
    streamMessagesRef.current = [];
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

  const handleCreateJob = async (input: {
    name: string;
    message: string;
    every_seconds?: number;
    cron_expr?: string;
    tz?: string;
    at?: string;
    deliver?: boolean;
    channel?: string;
    to?: string;
  }) => {
    await createJobMutation.mutateAsync(input);
  };

  const handleToggleJob = async (job: JobResponse) => {
    await updateJobMutation.mutateAsync({ jobId: job.id, enabled: !job.enabled });
  };

  const handleDeleteJob = async (jobId: string) => {
    await deleteJobMutation.mutateAsync(jobId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSessionMutation.mutateAsync(sessionId);
  };

  return (
    <main className="noise-overlay h-screen overflow-hidden px-2 py-2 text-[12px] md:px-3 md:py-3">
      <div className="mx-auto flex h-[calc(100vh-1rem)] max-w-[1800px] gap-2 overflow-hidden">
        <SidebarPanel
          sessions={sidebarSessions}
          activeSessionId={activeSessionId}
          collapsed={sidebarCollapsed}
          deletingSessionId={deleteSessionMutation.isPending ? deleteSessionMutation.variables ?? null : null}
          onDeleteSession={handleDeleteSession}
          onSelectSession={setActiveSessionId}
          onCreateSession={handleCreateSession}
          onToggleCollapse={toggleSidebarCollapsed}
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
              creating={createJobMutation.isPending}
              deletingJobId={deleteJobMutation.isPending ? deleteJobMutation.variables ?? null : null}
              error={
                jobsQuery.error instanceof Error
                  ? jobsQuery.error.message
                  : jobHistoryQuery.error instanceof Error
                    ? jobHistoryQuery.error.message
                    : createJobMutation.error instanceof Error
                      ? createJobMutation.error.message
                      : updateJobMutation.error instanceof Error
                        ? updateJobMutation.error.message
                        : deleteJobMutation.error instanceof Error
                          ? deleteJobMutation.error.message
                          : null
              }
              history={jobHistoryQuery.data ?? []}
              jobs={jobsQuery.data ?? []}
              loading={jobsQuery.isLoading || jobHistoryQuery.isLoading}
              onCreateJob={handleCreateJob}
              onDeleteJob={handleDeleteJob}
              onToggleJob={handleToggleJob}
              updatingJobId={updateJobMutation.isPending ? updateJobMutation.variables?.jobId ?? null : null}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
