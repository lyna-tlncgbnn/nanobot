import { z } from "zod";

export const chatResponseSchema = z.object({
  session_id: z.string(),
  reply: z.string(),
});

export const sessionSummarySchema = z.object({
  id: z.string(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  message_count: z.number(),
});

export const sessionMessageSchema = z.object({
  id: z.string().optional(),
  role: z.string(),
  content: z.string(),
  timestamp: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  tool_call_id: z.string().nullable().optional(),
  tool_calls: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
});

export const sessionDetailSchema = z.object({
  session_id: z.string(),
  messages: z.array(sessionMessageSchema),
});

export const sessionsSchema = z.array(sessionSummarySchema);

export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type SessionMessage = z.infer<typeof sessionMessageSchema>;
export type SessionDetail = z.infer<typeof sessionDetailSchema>;
