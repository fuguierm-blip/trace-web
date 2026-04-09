import {
  appraisalKeys,
  problemTypes,
  reactions,
  strategies,
  type AppraisalMap,
  type ProblemType,
  type Reaction,
  type Strategy,
  type TraceSession,
  type TraceState,
} from "@/lib/trace/types";

const sessionStore = new Map<string, TraceSession>();

function buildEmptyAppraisals(): AppraisalMap {
  return Object.fromEntries(
    appraisalKeys.map((key) => [key, { score: "NA", reason: "尚无足够信息。" }]),
  ) as AppraisalMap;
}

export function buildInitialState(): TraceState {
  return {
    problemTypes: [],
    lastStrategy: null,
    userReaction: null,
    appraisals: buildEmptyAppraisals(),
    focusNote: "首次对话，先稳定情绪与理解处境。",
    summary: "这是一次新的 TRACE 会话，尚无历史摘要。",
  };
}

export function buildInitialSession(sessionId: string): TraceSession {
  return {
    sessionId,
    history: [],
    state: buildInitialState(),
    updatedAt: new Date().toISOString(),
  };
}

function isProblemType(value: unknown): value is ProblemType {
  return typeof value === "string" && problemTypes.includes(value as ProblemType);
}

function isStrategy(value: unknown): value is Strategy {
  return typeof value === "string" && strategies.includes(value as Strategy);
}

function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && reactions.includes(value as Reaction);
}

function sanitizeState(value: unknown): TraceState {
  const fallback = buildInitialState();
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<TraceState>;
  const sanitizedAppraisals = buildEmptyAppraisals();

  if (candidate.appraisals && typeof candidate.appraisals === "object") {
    for (const key of appraisalKeys) {
      const item = candidate.appraisals[key];
      if (!item || typeof item !== "object") {
        continue;
      }
      const score = item.score;
      const reason = typeof item.reason === "string" ? item.reason : "未提供原因。";
      const validScore =
        score === "NA" ||
        (typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 9);
      sanitizedAppraisals[key] = {
        score: validScore ? score : "NA",
        reason,
      };
    }
  }

  return {
    problemTypes: Array.isArray(candidate.problemTypes)
      ? candidate.problemTypes.filter(isProblemType).slice(0, 2)
      : fallback.problemTypes,
    lastStrategy: isStrategy(candidate.lastStrategy) ? candidate.lastStrategy : null,
    userReaction: isReaction(candidate.userReaction) ? candidate.userReaction : null,
    appraisals: sanitizedAppraisals,
    focusNote:
      typeof candidate.focusNote === "string" && candidate.focusNote.trim()
        ? candidate.focusNote.trim()
        : fallback.focusNote,
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim()
        : fallback.summary,
  };
}

export function restoreSession(
  sessionId: string,
  snapshot?: Partial<TraceSession>,
): TraceSession {
  const existing = sessionStore.get(sessionId);
  if (existing) {
    return existing;
  }

  const restored = buildInitialSession(sessionId);
  if (snapshot) {
    restored.history = Array.isArray(snapshot.history)
      ? snapshot.history
          .filter(
            (message) =>
              message &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string" &&
              message.content.trim(),
          )
          .map((message) => ({
            id:
              typeof message.id === "string" && message.id.trim()
                ? message.id
                : crypto.randomUUID(),
            role: message.role,
            content: message.content.trim(),
            createdAt:
              typeof message.createdAt === "string" && message.createdAt.trim()
                ? message.createdAt
                : new Date().toISOString(),
          }))
      : [];
    restored.state = sanitizeState(snapshot.state);
  }

  sessionStore.set(sessionId, restored);
  return restored;
}

export function saveSession(session: TraceSession): TraceSession {
  const nextSession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  sessionStore.set(session.sessionId, nextSession);
  return nextSession;
}
