// POST /api/assistant: the chat endpoint. All logic is in lib/ai/handle-chat;
// this file only connects it to Next. Node runtime (node:crypto), never cached.
import { readAiConfig } from "@/lib/ai/config";
import { handleChat } from "@/lib/ai/handle-chat";
import { buildChatDeps } from "@/lib/ai/live-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return handleChat(request, buildChatDeps(readAiConfig()));
}
