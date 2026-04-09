export const problemTypes = [
  "责任/自责",
  "可控性",
  "问题应对能力",
  "情绪调节能力",
  "价值冲突",
  "注意力过度黏住问题",
] as const;

export const strategies = [
  "changing circumstances",
  "challenging reality",
  "changing consequences",
  "acceptance",
  "introducing agency",
  "making positive",
  "separating oneself",
  "problem-solving",
] as const;

export const reactions = [
  "接受",
  "抵触",
  "无明显反应",
  "情绪升级",
] as const;

export const appraisalKeys = [
  "Self-responsibility",
  "Problem-focused coping",
  "Attentional activity",
  "Emotionally cope",
  "Self-Controllable",
  "Consistency with internal values",
] as const;

export type ProblemType = (typeof problemTypes)[number];
export type Strategy = (typeof strategies)[number];
export type Reaction = (typeof reactions)[number];
export type AppraisalKey = (typeof appraisalKeys)[number];
export type Score = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | "NA";

export type ChatRole = "user" | "assistant";

export interface AppraisalResult {
  score: Score;
  reason: string;
}

export type AppraisalMap = Record<AppraisalKey, AppraisalResult>;

export interface TraceState {
  problemTypes: ProblemType[];
  lastStrategy: Strategy | null;
  userReaction: Reaction | null;
  appraisals: AppraisalMap;
  focusNote: string;
  summary: string;
}

export interface TraceMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface TraceSession {
  sessionId: string;
  history: TraceMessage[];
  state: TraceState;
  updatedAt: string;
}

export interface SafetyDecision {
  riskLevel: "normal" | "high";
  reason: string;
  warningSignals: string[];
}

export interface StateExtraction {
  problemTypes: ProblemType[];
  userReaction: Reaction;
  focusNote: string;
  appraisals: AppraisalMap;
}

export interface StrategyPlan {
  strategy: Strategy;
  rationale: string;
}

export interface ValidationResult {
  pass: boolean;
  issues: string[];
  revisedResponse: string;
}

export interface StateUpdateResult {
  focusNote: string;
  summaryHint: string;
}

export interface SummaryResult {
  summary: string;
}
