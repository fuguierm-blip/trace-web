import { NextResponse } from "next/server";
import {
  appendAccountEvent,
  type AccountEventType,
  restoreAccountRecord,
  upsertAccountSession,
} from "@/lib/trace/account-record-store";
import type { TraceSession } from "@/lib/trace/types";

interface AccountRecordRequest {
  username?: string;
  isPilot?: boolean;
  sessionId?: string;
  eventType?: AccountEventType | "sync-session";
  payload?: unknown;
  session?: TraceSession;
}

function isAccountEventType(value: unknown): value is AccountEventType {
  return (
    value === "consent" ||
    value === "pilot-basic-info" ||
    value === "stai" ||
    value === "panas" ||
    value === "gad-7" ||
    value === "event-checklist" ||
    value === "pilot-feedback"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccountRecordRequest;
    const username = body.username?.trim();
    const isPilot = body.isPilot;

    if (!username || typeof isPilot !== "boolean") {
      return NextResponse.json(
        { error: "请求缺少有效的账号信息。" },
        { status: 400 },
      );
    }

    if (body.eventType === "sync-session") {
      if (!body.session || typeof body.session !== "object") {
        return NextResponse.json(
          { error: "请求缺少会话数据。" },
          { status: 400 },
        );
      }

      const record = await upsertAccountSession({
        username,
        isPilot,
        session: body.session,
      });

      return NextResponse.json({ ok: true, recordUpdatedAt: record.updatedAt });
    }

    if (!isAccountEventType(body.eventType)) {
      return NextResponse.json(
        { error: "请求缺少有效的事件类型。" },
        { status: 400 },
      );
    }

    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json(
        { error: "请求缺少 sessionId。" },
        { status: 400 },
      );
    }

    const record = await appendAccountEvent({
      username,
      isPilot,
      sessionId,
      eventType: body.eventType,
      payload: body.payload ?? null,
    });

    return NextResponse.json({ ok: true, recordUpdatedAt: record.updatedAt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "账号记录保存失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();
    const isPilotValue = searchParams.get("isPilot");

    if (!username || (isPilotValue !== "true" && isPilotValue !== "false")) {
      return NextResponse.json(
        { error: "请求缺少有效的账号信息。" },
        { status: 400 },
      );
    }

    const record = await restoreAccountRecord(username, isPilotValue === "true");
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "账号记录读取失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
