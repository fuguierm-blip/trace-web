import { NextResponse } from "next/server";
import { runTraceTurn } from "@/lib/trace/orchestrator";
import { upsertAccountSession } from "@/lib/trace/account-record-store";
import { restoreSession, saveSession } from "@/lib/trace/session-store";
import type { TraceSession } from "@/lib/trace/types";

interface ChatRequest {
  sessionId?: string;
  message?: string;
  snapshot?: Partial<TraceSession>;
  username?: string;
  isPilot?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const sessionId = body.sessionId?.trim();
    const message = body.message?.trim();
    const username = body.username?.trim();
    const isPilot = body.isPilot;

    if (!sessionId || !message || !username || typeof isPilot !== "boolean") {
      return NextResponse.json(
        { error: "请求缺少账号信息、sessionId 或 message。" },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const push = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          push({ type: "status", phase: "processing" });

          const session = await restoreSession(sessionId, body.snapshot);
          const result = await runTraceTurn({
            session,
            userMessage: message,
            onStatus: (phase) => {
              push({ type: "status", phase });
            },
            onResponseChunk: (chunk) => {
              push({ type: "chunk", content: chunk });
            },
            onResponseReset: () => {
              push({ type: "replace", content: "" });
            },
          });
          const savedSession = await saveSession(result.session);
          await upsertAccountSession({
            username,
            isPilot,
            session: savedSession,
            turnDiagnostics: result.diagnostics,
          });

          push({
            type: "done",
            reply: result.reply,
            session: savedSession,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "服务端处理失败，请稍后重试。";
          push({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "服务端处理失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
