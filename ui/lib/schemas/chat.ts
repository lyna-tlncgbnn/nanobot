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

export const jobScheduleSchema = z.object({
  kind: z.string(),
  at_ms: z.number().nullable().optional(),
  every_ms: z.number().nullable().optional(),
  expr: z.string().nullable().optional(),
  tz: z.string().nullable().optional(),
  at: z.string().nullable().optional(),
});

export const jobPayloadSchema = z.object({
  kind: z.string(),
  message: z.string(),
  deliver: z.boolean(),
  channel: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
});

export const jobStateSchema = z.object({
  next_run_at_ms: z.number().nullable().optional(),
  next_run_at: z.string().nullable().optional(),
  last_run_at_ms: z.number().nullable().optional(),
  last_run_at: z.string().nullable().optional(),
  last_status: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
});

export const jobResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  schedule: jobScheduleSchema,
  payload: jobPayloadSchema,
  state: jobStateSchema,
  created_at_ms: z.number(),
  created_at: z.string().nullable().optional(),
  updated_at_ms: z.number(),
  updated_at: z.string().nullable().optional(),
  delete_after_run: z.boolean(),
});

export const jobsSchema = z.array(jobResponseSchema);

export const jobHistoryItemSchema = z.object({
  run_id: z.string(),
  job_id: z.string(),
  job_name: z.string(),
  message: z.string(),
  channel: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  schedule_kind: z.string(),
  scheduled_for_ms: z.number().nullable().optional(),
  scheduled_for: z.string().nullable().optional(),
  executed_at_ms: z.number(),
  executed_at: z.string(),
  status: z.string(),
  response: z.string().nullable().optional(),
  response_preview: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  cron_session_key: z.string().nullable().optional(),
});

export const jobHistorySchema = z.array(jobHistoryItemSchema);

export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type SessionMessage = z.infer<typeof sessionMessageSchema>;
export type SessionDetail = z.infer<typeof sessionDetailSchema>;
export type JobResponse = z.infer<typeof jobResponseSchema>;
export type JobHistoryItem = z.infer<typeof jobHistoryItemSchema>;
