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
import { callTraceJson, callTraceText } from "@/lib/trace/openai";
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
  distanceLevels,
  languageMoves,
  problemTypes,
  reactions,
  stages,
  strategies,
  type AppraisalMap,
  type DistanceLevel,
  type LanguageMove,
  type ProblemType,
  type Reaction,
  type Stage,
  type Strategy,
} from "@/lib/trace/types";

const HISTORY_WINDOW = 8;
const VALIDATION_RETRY_LIMIT = 2;

function recentHistory(history: TraceMessage[]): TraceMessage[] {
  return history.slice(-HISTORY_WINDOW);
}

function collectUserText(history: TraceMessage[]): string {
  return history
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
}

function hasProfileInfo(content: string): boolean {
  const text = content.replace(/\s+/g, "");
  const age = /(\d{1,2}岁|年龄\d{1,2}|年龄[:：]?\d{1,2})/.test(text);
  const gender =
    /(性别|男生|女生|男性|女性|我是男|我是女)/.test(text) ||
    /(^|[，。,；;、\s])(男|女)([，。,；;、\s]|$)/.test(text);
  const major =
    /(专业|学院|系|学的是|就读于|学习的是)/.test(text) ||
    /[^\n，。,；;]{1,12}(专业|学院|系)/.test(text);
  return age && gender && major;
}

function hasAnxietyEvent(content: string): boolean {
  const text = content.replace(/\s+/g, "");
  return /(焦虑|担心|压力|烦恼|困扰|睡不着|失眠|害怕|紧张|崩溃|难受|不安|内耗|情绪|未来|考试|学业|人际|家庭|工作|就业)/.test(text);
}

function buildOnboardingReply(kind: "profile" | "concern", userMessage: string): string {
  if (kind === "profile") {
    if (hasAnxietyEvent(userMessage)) {
      return "我已经看到你刚才提到的那些感受了，也谢谢你愿意告诉我这些。开始之前，想先温柔地请你告诉我您的年龄、专业和性别。等我先了解这些基本信息后，我会继续陪你慢慢梳理最近让你感到焦虑的事情。";
    }
    return "谢谢你愿意来这里和我说这些。开始之前，想先温柔地请你告诉我您的年龄、专业和性别。等我先了解这些基本信息后，我会再请你慢慢说说最近让你感到焦虑的事情。";
  }

  return "谢谢你告诉我这些基本信息，我已经记下了。接下来，想请你慢慢说说，最近哪件事情最让你感到焦虑，或者最近哪一刻最让你觉得压力特别明显。我会认真听你说。";
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
    "我们这一轮不用把整件事处理完，只要先把最压住你的那层想法松动一点就够了。",
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

function isDistanceLevel(value: unknown): value is DistanceLevel {
  return typeof value === "string" && distanceLevels.includes(value as DistanceLevel);
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && stages.includes(value as Stage);
}

function isStrategy(value: unknown): value is Strategy {
  return typeof value === "string" && strategies.includes(value as Strategy);
}

function isLanguageMove(value: unknown): value is LanguageMove {
  return typeof value === "string" && languageMoves.includes(value as LanguageMove);
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
    distanceLevel: isDistanceLevel(raw.distanceLevel)
      ? raw.distanceLevel
      : session.state.distanceLevel,
    focusNote:
      typeof raw.focusNote === "string" && raw.focusNote.trim()
        ? raw.focusNote.trim()
        : session.state.focusNote,
    appraisals: normalizeAppraisals(raw.appraisals, session.state.appraisals),
  };
}

function normalizePlan(raw: StrategyPlan, session: TraceSession): StrategyPlan {
  const moves = Array.isArray(raw.languageMoves)
    ? raw.languageMoves.filter(isLanguageMove).slice(0, 2)
    : [];

  return {
    stage: isStage(raw.stage) ? raw.stage : session.state.stage,
    strategy: isStrategy(raw.strategy)
      ? raw.strategy
      : session.state.lastStrategy || "separating oneself",
    languageMoves: moves.length > 0 ? moves : ["提供新视角"],
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
  plan: StrategyPlan,
): StateUpdateResult {
  return {
    stage: isStage(raw.stage) ? raw.stage : plan.stage,
    distanceLevel: isDistanceLevel(raw.distanceLevel)
      ? raw.distanceLevel
      : session.state.distanceLevel,
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
  session: TraceSession,
  update: StateUpdateResult,
): SummaryResult {
  return {
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : `${update.summaryHint} 当前阶段：${update.stage}。`,
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
          stage: "共情澄清",
          userReaction: "情绪升级",
          focusNote: `触发安全分流：${safety.reason}`,
          summary: `最近一轮触发安全分流，原因：${safety.reason}`,
        },
      },
    };
  }

  const combinedUserText = collectUserText(historyWithUser);
  if (!hasProfileInfo(combinedUserText)) {
    return buildEarlySession(
      args.session,
      historyWithUser,
      buildOnboardingReply("profile", userMessage),
      "TRACE 正在收集用户的年龄、专业和性别等基本信息。",
    );
  }

  if (!hasAnxietyEvent(combinedUserText)) {
    return buildEarlySession(
      args.session,
      historyWithUser,
      buildOnboardingReply("concern", userMessage),
      "TRACE 已获取基本信息，正在邀请用户描述最近的焦虑事件。",
    );
  }

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

  const draftedReply = await callTraceText(
    TRACE_PROMPT_LIBRARY.identity,
    buildResponsePrompt({
      history: shortHistory,
      state: args.session.state,
      extracted: normalizedExtracted,
      plan: normalizedPlan,
      userMessage,
    }),
    0.6,
  );

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
  const normalizedUpdate = normalizeUpdate(update, args.session, normalizedPlan);

  const summary = await callTraceJson<SummaryResult>(
    TRACE_PROMPT_LIBRARY.identity,
    buildSummaryPrompt({
      history: [...shortHistory, assistantEntry],
      state: args.session.state,
      update: normalizedUpdate,
    }),
    0.1,
  );
  const normalizedSummary = normalizeSummary(summary, args.session, normalizedUpdate);

  const nextSession: TraceSession = {
    ...args.session,
    history: [...historyWithUser, assistantEntry],
    state: {
      ...args.session.state,
      problemTypes: normalizedExtracted.problemTypes,
      userReaction: normalizedExtracted.userReaction,
      distanceLevel: normalizedUpdate.distanceLevel,
      stage: normalizedUpdate.stage,
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
