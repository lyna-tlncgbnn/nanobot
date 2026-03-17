import { z } from "zod";
import { sessionMessageSchema } from "@/lib/schemas/chat";

export const chatStreamEventSchema = z.object({
  type: z.enum(["message", "done", "error"]),
  session_id: z.string(),
  message: sessionMessageSchema.nullish(),
  reply: z.string().nullish(),
  error: z.string().nullish(),
});

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
