"use client";

import { useEffect, useMemo, useState } from "react";
import type { TraceMessage, TraceSession } from "@/lib/trace/types";

const STORAGE_KEY = "trace-web-session";

function createSessionId(): string {
  return crypto.randomUUID();
}

function buildLocalSession(): TraceSession {
  return {
    sessionId: createSessionId(),
    history: [],
    state: {
      problemTypes: [],
      stage: "共情澄清",
      lastStrategy: null,
      userReaction: null,
      distanceLevel: "低",
      appraisals: {
        "Self-responsibility": { score: "NA", reason: "尚无足够信息。" },
        "Problem-focused coping": { score: "NA", reason: "尚无足够信息。" },
        "Attentional activity": { score: "NA", reason: "尚无足够信息。" },
        "Emotionally cope": { score: "NA", reason: "尚无足够信息。" },
        "Self-Controllable": { score: "NA", reason: "尚无足够信息。" },
        "Consistency with internal values": {
          score: "NA",
          reason: "尚无足够信息。",
        },
      },
      focusNote: "首次对话，先稳定情绪与理解处境。",
      summary: "这是一次新的 TRACE 会话，尚无历史摘要。",
    },
    updatedAt: new Date().toISOString(),
  };
}

function welcomeMessage(): TraceMessage {
  return {
    id: "trace-welcome",
    role: "assistant",
    content:
      "你可以直接把最近困住你的那件事告诉我，不需要先组织得很完整。这个版本会按照 TRACE 的节奏一步一步来，不会一次给你压很多结论。只要你愿意，我们先从你现在最卡住的那一点开始。",
    createdAt: new Date().toISOString(),
  };
}

export function TraceChat() {
  const [session, setSession] = useState<TraceSession | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setSession(buildLocalSession());
      return;
    }

    try {
      setSession(JSON.parse(stored) as TraceSession);
    } catch {
      setSession(buildLocalSession());
    }
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const messages = useMemo(() => {
    if (!session) {
      return [welcomeMessage()];
    }
    return session.history.length > 0 ? session.history : [welcomeMessage()];
  }, [session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !session || pending) {
      return;
    }

    setPending(true);
    setError("");

    const optimisticMessage: TraceMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const optimisticSession: TraceSession = {
      ...session,
      history: [...session.history, optimisticMessage],
      updatedAt: new Date().toISOString(),
    };

    setSession(optimisticSession);
    setDraft("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          message: content,
          snapshot: session,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        session?: TraceSession;
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "发送失败，请稍后再试。");
      }

      setSession(payload.session);
    } catch (submitError) {
      setSession(session);
      setDraft(content);
      setError(
        submitError instanceof Error ? submitError.message : "发送失败，请稍后再试。",
      );
    } finally {
      setPending(false);
    }
  }

  function resetSession() {
    const nextSession = buildLocalSession();
    setSession(nextSession);
    setDraft("");
    setError("");
  }

  return (
    <section className="trace-panel flex min-h-[78vh] flex-col overflow-hidden rounded-[32px]">
      <div className="border-b border-[var(--line-soft)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              TRACE 聊天窗口
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              先说你此刻最困住的那句话，系统会按固定流程逐轮推进。
            </p>
          </div>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-2 text-sm font-medium text-[var(--ink-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
          >
            开启新会话
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message-enter flex ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-[26px] px-5 py-4 text-sm leading-7 shadow-[0_14px_30px_rgba(65,41,27,0.08)] sm:text-[15px] ${
                  message.role === "assistant"
                    ? "bg-[var(--assistant-bubble)] text-[var(--ink-strong)]"
                    : "bg-[var(--user-bubble)] text-[var(--ink-strong)]"
                }`}
              >
                {message.content}
              </div>
            </article>
          ))}

          {pending ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-[26px] bg-[var(--assistant-bubble)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)] shadow-[0_14px_30px_rgba(65,41,27,0.08)]">
                TRACE 正在读取状态、选择策略并校验回复，请稍等。
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--line-soft)] bg-[rgba(255,250,244,0.7)] px-4 py-4 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
          <label className="sr-only" htmlFor="trace-input">
            输入消息
          </label>
          <textarea
            id="trace-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="例如：我一直在反复想一件事，越想越觉得自己把事情搞砸了。"
            className="min-h-[124px] w-full resize-none rounded-[26px] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-5 py-4 text-[15px] leading-7 text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(197,106,56,0.12)]"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-[var(--ink-soft)]">
              紧急危险情况请优先联系当地紧急援助、家人朋友或专业热线。
            </p>
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pending ? "发送中..." : "发送消息"}
            </button>
          </div>

          {error ? (
            <p className="mt-3 rounded-2xl border border-[rgba(163,57,36,0.16)] bg-[rgba(255,240,236,0.9)] px-4 py-3 text-sm text-[var(--warning)]">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
