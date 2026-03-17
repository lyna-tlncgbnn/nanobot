import { z } from "zod";
import {
  chatResponseSchema,
  jobHistorySchema,
  jobResponseSchema,
  jobsSchema,
  sessionDetailSchema,
  sessionsSchema,
  type JobHistoryItem,
  type JobResponse,
  type SessionDetail,
  type SessionSummary,
} from "@/lib/schemas/chat";
import { chatStreamEventSchema, type ChatStreamEvent } from "@/lib/schemas/stream";

const baseUrl = process.env.NEXT_PUBLIC_NANOBOT_API_BASE ?? "";

async function buildErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    // ignore parse failures and use fallback below
  }
  return fallback;
}

export async function postChat(message: string, sessionId: string) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `chat request failed: ${response.status}`));
  }

  const payload = await response.json();
  return chatResponseSchema.parse(payload);
}

export async function streamChat(
  message: string,
  sessionId: string,
  handlers: {
    onEvent: (event: ChatStreamEvent) => void;
  },
) {
  const response = await fetch(`${baseUrl}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(await buildErrorMessage(response, `chat stream request failed: ${response.status}`));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const chunk = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const dataLines = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length > 0) {
        const event = chatStreamEventSchema.parse(JSON.parse(dataLines.join("\n")));
        handlers.onEvent(event);
      }

      separatorIndex = buffer.indexOf("\n\n");
    }

    if (done) {
      break;
    }
  }
}

export async function getSessions(): Promise<SessionSummary[]> {
  const response = await fetch(`${baseUrl}/api/sessions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `sessions request failed: ${response.status}`));
  }

  const payload = await response.json();
  return sessionsSchema.parse(payload);
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `session detail request failed: ${response.status}`));
  }

  const payload = await response.json();
  const parsed = sessionDetailSchema.parse(payload);
  return {
    ...parsed,
    messages: parsed.messages.map((message, index) => ({
      ...message,
      id:
        message.id ??
        `${message.role}:${message.timestamp ?? "no-ts"}:${message.tool_call_id ?? "no-tool"}:${index}`,
    })),
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `delete session request failed: ${response.status}`));
  }
}

export async function getJobs(includeDisabled = true): Promise<JobResponse[]> {
  const response = await fetch(
    `${baseUrl}/api/jobs?include_disabled=${includeDisabled ? "true" : "false"}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `jobs request failed: ${response.status}`));
  }

  const payload = await response.json();
  return jobsSchema.parse(payload);
}

export async function getJobHistory(jobId?: string): Promise<JobHistoryItem[]> {
  const query = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  const response = await fetch(`${baseUrl}/api/jobs/history${query}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `job history request failed: ${response.status}`));
  }

  const payload = await response.json();
  return jobHistorySchema.parse(payload);
}

export async function createJob(input: {
  name: string;
  message: string;
  every_seconds?: number;
  cron_expr?: string;
  tz?: string;
  at?: string;
  deliver?: boolean;
  channel?: string;
  to?: string;
}): Promise<JobResponse> {
  const response = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `create job request failed: ${response.status}`));
  }

  const payload = await response.json();
  return jobResponseSchema.parse(payload);
}

export async function updateJobEnabled(jobId: string, enabled: boolean): Promise<JobResponse> {
  const response = await fetch(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `update job request failed: ${response.status}`));
  }

  const payload = await response.json();
  return jobResponseSchema.parse(payload);
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `delete job request failed: ${response.status}`));
  }
}

export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type {
  JobHistoryItem,
  JobResponse,
  SessionDetail,
  SessionSummary,
  SessionMessage,
} from "@/lib/schemas/chat";
export type { ChatStreamEvent } from "@/lib/schemas/stream";
