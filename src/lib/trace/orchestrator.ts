import {
  buildResponsePrompt,
  buildSafetyRouterPrompt,
  buildSafetySupportPrompt,
  buildStateExtractorPrompt,
  buildStateUpdaterPrompt,
  buildSummaryPrompt,
  buildValidatorPrompt,
  buildPlannerPrompt,
  TRACE_PROMPT_LIBRARY,
} from "@/lib/trace/prompts";
import { callTraceJson, callTraceText, callTraceTextStream } from "@/lib/trace/openai";
import type {
  SafetyDecision,
  StateExtraction,
  StateUpdateResult,
  StrategyPlan,
  SummaryResult,
  TraceMessage,
  TraceSession,
  ValidationResult,
} from "@/lib/trace/types";
import {
  appraisalKeys,
  problemTypes,
  reactions,
  strategies,
  type AppraisalMap,
  type ProblemType,
  type Reaction,
  type Strategy,
} from "@/lib/trace/types";

const HISTORY_WINDOW = 8;
const VALIDATION_RETRY_LIMIT = 2;

function recentHistory(history: TraceMessage[]): TraceMessage[] {
  return history.slice(-HISTORY_WINDOW);
}

function countUserTurns(history: TraceMessage[]): number {
  return history.filter((message) => message.role === "user").length;
}

function buildSingleOnboardingReply(): string {
  return "谢谢你先告诉我这些信息，我已经记下了。接下来，想请你慢慢说说，最近哪件事情最让你感到焦虑，或者最近哪一刻最让你觉得压力特别明显。我会认真听你说。";
}

function buildEarlySession(
  session: TraceSession,
  historyWithUser: TraceMessage[],
  assistantReply: string,
  focusNote: string,
): { reply: string; session: TraceSession } {
  const assistantEntry: TraceMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: assistantReply,
    createdAt: new Date().toISOString(),
  };

  return {
    reply: assistantReply,
    session: {
      ...session,
      history: [...historyWithUser, assistantEntry],
      state: {
        ...session.state,
        focusNote,
        summary: focusNote,
      },
    },
  };
}

function sanitizeMessage(content: string): string {
  return content.replace(/\r/g, "").trim();
}

function countQuestions(content: string): number {
  return (content.match(/[？?]/g) || []).length;
}

function countSentences(content: string): number {
  const parts = content
    .split(/[。！？!?；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length;
}

function dedupeTrailingSentences(content: string): string {
  const matches = content.match(/[^。！？!?；;]+[。！？!?；;]?/g);
  if (!matches) {
    return content;
  }

  const deduped: string[] = [];
  for (const rawPart of matches) {
    const normalized = rawPart.trim();
    if (!normalized) {
      continue;
    }
    const previous = deduped[deduped.length - 1];
    if (previous?.trim() === normalized) {
      continue;
    }
    deduped.push(normalized);
  }
  return deduped.join("");
}

function keepSingleQuestion(content: string): string {
  let seenQuestion = false;
  let result = "";
  for (const char of content) {
    if (char === "?" || char === "？" || char === "﹖") {
      if (!seenQuestion) {
        result += "？";
        seenQuestion = true;
      } else {
        result += "。";
      }
      continue;
    }
    result += char;
  }
  return result;
}

function enforceResponseShape(content: string): string {
  let next = dedupeTrailingSentences(sanitizeMessage(content)).replace(/\s+/g, " ");
  const fillerSentences = [
    "先不用急着证明自己已经完全没事，能把这股压力稍微看清一点，就已经是在把局面往回拉。",
    "现在不用把整件事一下子处理完，只要先把最压住你的那层想法松动一点就够了。",
  ];

  next = keepSingleQuestion(next);

  let fillerIndex = 0;
  while (countSentences(next) < 6 && fillerIndex < fillerSentences.length) {
    next = `${next} ${fillerSentences[fillerIndex]}`;
    fillerIndex += 1;
  }

  if (countQuestions(next) > 1) {
    next = keepSingleQuestion(next);
  }

  return next;
}

function isProblemType(value: unknown): value is ProblemType {
  return typeof value === "string" && problemTypes.includes(value as ProblemType);
}

function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && reactions.includes(value as Reaction);
}

function isStrategy(value: unknown): value is Strategy {
  return typeof value === "string" && strategies.includes(value as Strategy);
}

function normalizeAppraisals(source: unknown, fallback: AppraisalMap): AppraisalMap {
  const next = structuredClone(fallback);
  if (!source || typeof source !== "object") {
    return next;
  }

  for (const key of appraisalKeys) {
    const candidate = (source as Partial<AppraisalMap>)[key];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const rawScore = candidate.score;
    const validScore =
      rawScore === "NA" ||
      (typeof rawScore === "number" &&
        Number.isInteger(rawScore) &&
        rawScore >= 1 &&
        rawScore <= 9);

    next[key] = {
      score: validScore ? rawScore : fallback[key].score,
      reason:
        typeof candidate.reason === "string" && candidate.reason.trim()
          ? candidate.reason.trim()
          : fallback[key].reason,
    };
  }

  return next;
}

function normalizeStateExtraction(
  raw: StateExtraction,
  session: TraceSession,
): StateExtraction {
  return {
    problemTypes: Array.isArray(raw.problemTypes)
      ? raw.problemTypes.filter(isProblemType).slice(0, 2)
      : session.state.problemTypes,
    userReaction: isReaction(raw.userReaction)
      ? raw.userReaction
      : session.state.userReaction || "无明显反应",
    focusNote:
      typeof raw.focusNote === "string" && raw.focusNote.trim()
        ? raw.focusNote.trim()
        : session.state.focusNote,
    appraisals: normalizeAppraisals(raw.appraisals, session.state.appraisals),
  };
}

function normalizePlan(raw: StrategyPlan, session: TraceSession): StrategyPlan {
  return {
    strategy: isStrategy(raw.strategy)
      ? raw.strategy
      : session.state.lastStrategy || "separating oneself",
    rationale:
      typeof raw.rationale === "string" && raw.rationale.trim()
        ? raw.rationale.trim()
        : "根据当前状态，先做最小幅度的推进。",
  };
}

function normalizeValidation(raw: ValidationResult, candidate: string): ValidationResult {
  return {
    pass: Boolean(raw.pass),
    issues: Array.isArray(raw.issues)
      ? raw.issues.filter((item) => typeof item === "string" && item.trim())
      : [],
    revisedResponse:
      typeof raw.revisedResponse === "string" && raw.revisedResponse.trim()
        ? raw.revisedResponse.trim()
        : candidate,
  };
}

function normalizeUpdate(
  raw: StateUpdateResult,
  session: TraceSession,
): StateUpdateResult {
  return {
    focusNote:
      typeof raw.focusNote === "string" && raw.focusNote.trim()
        ? raw.focusNote.trim()
        : session.state.focusNote,
    summaryHint:
      typeof raw.summaryHint === "string" && raw.summaryHint.trim()
        ? raw.summaryHint.trim()
        : "本轮对话完成了一次小幅推进。",
  };
}

function normalizeSummary(
  raw: SummaryResult,
  update: StateUpdateResult,
): SummaryResult {
  return {
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : update.summaryHint,
  };
}

async function validateOrRewrite(args: {
  history: TraceMessage[];
  session: TraceSession;
  userMessage: string;
  plan: StrategyPlan;
  candidate: string;
}): Promise<string> {
  let candidate = enforceResponseShape(args.candidate);

  for (let attempt = 0; attempt < VALIDATION_RETRY_LIMIT; attempt += 1) {
    const result = await callTraceJson<ValidationResult>(
      TRACE_PROMPT_LIBRARY.identity,
      buildValidatorPrompt({
        history: args.history,
        state: args.session.state,
        plan: args.plan,
        userMessage: args.userMessage,
        response: candidate,
      }),
      0.1,
    );

    const normalized = normalizeValidation(result, candidate);
    const revised = enforceResponseShape(normalized.revisedResponse);
    if (normalized.pass) {
      return revised;
    }
    candidate = revised;
  }

  return candidate;
}

export async function runTraceTurn(args: {
  session: TraceSession;
  userMessage: string;
  onResponseChunk?: (chunk: string) => Promise<void> | void;
  onResponseReset?: () => Promise<void> | void;
  onStatus?: (phase: string) => Promise<void> | void;
}): Promise<{ reply: string; session: TraceSession }> {
  const userMessage = sanitizeMessage(args.userMessage);
  const userEntry: TraceMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: userMessage,
    createdAt: new Date().toISOString(),
  };

  const historyWithUser = [...args.session.history, userEntry];
  const shortHistory = recentHistory(historyWithUser);

  await args.onStatus?.("safety");

  const safety = await callTraceJson<SafetyDecision>(
    TRACE_PROMPT_LIBRARY.identity,
    buildSafetyRouterPrompt({
      history: shortHistory,
      state: args.session.state,
      userMessage,
    }),
    0.1,
  );

  if (safety.riskLevel === "high") {
    const safeReply = enforceResponseShape(
      await callTraceText(
        TRACE_PROMPT_LIBRARY.identity,
        buildSafetySupportPrompt({
          history: shortHistory,
          userMessage,
          reason: safety.reason,
        }),
        0.35,
      ),
    );

    const assistantEntry: TraceMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: safeReply,
      createdAt: new Date().toISOString(),
    };

    return {
      reply: safeReply,
      session: {
        ...args.session,
        history: [...historyWithUser, assistantEntry],
        state: {
          ...args.session.state,
          userReaction: "情绪升级",
          focusNote: `触发安全分流：${safety.reason}`,
          summary: `最近一轮触发安全分流，原因：${safety.reason}`,
        },
      },
    };
  }

  if (countUserTurns(historyWithUser) === 1) {
    return buildEarlySession(
      args.session,
      historyWithUser,
      buildSingleOnboardingReply(),
      "TRACE 已收到用户第一条信息，正在邀请其描述最近的焦虑事件。",
    );
  }

  await args.onStatus?.("analysis");

  const extracted = await callTraceJson<StateExtraction>(
    TRACE_PROMPT_LIBRARY.identity,
    buildStateExtractorPrompt({
      history: shortHistory,
      state: args.session.state,
      userMessage,
    }),
    0.1,
  );
  const normalizedExtracted = normalizeStateExtraction(extracted, args.session);

  await args.onStatus?.("planning");

  const plan = await callTraceJson<StrategyPlan>(
    TRACE_PROMPT_LIBRARY.identity,
    buildPlannerPrompt({
      history: shortHistory,
      state: args.session.state,
      extracted: normalizedExtracted,
    }),
    0.15,
  );
  const normalizedPlan = normalizePlan(plan, args.session);

  const responsePrompt = buildResponsePrompt({
    history: shortHistory,
    state: args.session.state,
    extracted: normalizedExtracted,
    plan: normalizedPlan,
    userMessage,
  });

  await args.onStatus?.("responding");

  const draftedReply =
    args.onResponseChunk
      ? await callTraceTextStream(
          TRACE_PROMPT_LIBRARY.identity,
          responsePrompt,
          args.onResponseChunk,
          args.onResponseReset,
          0.6,
        )
      : await callTraceText(TRACE_PROMPT_LIBRARY.identity, responsePrompt, 0.6);

  await args.onStatus?.("finalizing");

  const finalReply = await validateOrRewrite({
    history: shortHistory,
    session: args.session,
    userMessage,
    plan: normalizedPlan,
    candidate: draftedReply,
  });

  const assistantEntry: TraceMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: finalReply,
    createdAt: new Date().toISOString(),
  };

  const update = await callTraceJson<StateUpdateResult>(
    TRACE_PROMPT_LIBRARY.identity,
    buildStateUpdaterPrompt({
      history: shortHistory,
      state: args.session.state,
      extracted: normalizedExtracted,
      plan: normalizedPlan,
      assistantResponse: finalReply,
    }),
    0.1,
  );
  const normalizedUpdate = normalizeUpdate(update, args.session);

  const summary = await callTraceJson<SummaryResult>(
    TRACE_PROMPT_LIBRARY.identity,
    buildSummaryPrompt({
      history: [...shortHistory, assistantEntry],
      state: args.session.state,
      update: normalizedUpdate,
    }),
    0.1,
  );
  const normalizedSummary = normalizeSummary(summary, normalizedUpdate);

  const nextSession: TraceSession = {
    ...args.session,
    history: [...historyWithUser, assistantEntry],
    state: {
      ...args.session.state,
      problemTypes: normalizedExtracted.problemTypes,
      userReaction: normalizedExtracted.userReaction,
      lastStrategy: normalizedPlan.strategy,
      appraisals: normalizedExtracted.appraisals,
      focusNote: normalizedUpdate.focusNote,
      summary: normalizedSummary.summary,
    },
  };

  return {
    reply: finalReply,
    session: nextSession,
  };
}
