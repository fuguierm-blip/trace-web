import { NextResponse } from "next/server";
import { runTraceTurn } from "@/lib/trace/orchestrator";
import { restoreSession, saveSession } from "@/lib/trace/session-store";
import type { TraceSession } from "@/lib/trace/types";

interface ChatRequest {
  sessionId?: string;
  message?: string;
  snapshot?: Partial<TraceSession>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const sessionId = body.sessionId?.trim();
    const message = body.message?.trim();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "请求缺少 sessionId 或 message。" },
        { status: 400 },
      );
    }

    const session = restoreSession(sessionId, body.snapshot);
    const result = await runTraceTurn({
      session,
      userMessage: message,
    });
    const savedSession = saveSession(result.session);

    return NextResponse.json({
      reply: result.reply,
      session: savedSession,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "服务端处理失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
