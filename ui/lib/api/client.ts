import { z } from "zod";
import {
  chatResponseSchema,
  sessionDetailSchema,
  sessionsSchema,
  type SessionDetail,
  type SessionSummary,
} from "@/lib/schemas/chat";
import { chatStreamEventSchema, type ChatStreamEvent } from "@/lib/schemas/stream";

const baseUrl = process.env.NEXT_PUBLIC_NANOBOT_API_BASE ?? "";

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
    throw new Error(`chat request failed: ${response.status}`);
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
    throw new Error(`chat stream request failed: ${response.status}`);
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
    throw new Error(`sessions request failed: ${response.status}`);
  }

  const payload = await response.json();
  return sessionsSchema.parse(payload);
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`session detail request failed: ${response.status}`);
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

export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type { SessionDetail, SessionSummary, SessionMessage } from "@/lib/schemas/chat";
export type { ChatStreamEvent } from "@/lib/schemas/stream";
