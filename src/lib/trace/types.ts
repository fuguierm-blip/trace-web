export const problemTypes = [
  "责任/自责",
  "可控性",
  "问题应对能力",
  "情绪调节能力",
  "价值冲突",
  "注意力过度黏住问题",
] as const;

export const stages = [
  "共情澄清",
  "轻度距离化",
  "认知重评",
  "落地行动",
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

export const distanceLevels = ["低", "中", "高"] as const;

export const languageMoves = [
  "社会距离",
  "时间距离",
  "物理/空间距离",
  "假设性距离",
  "提问",
  "提供新视角",
  "示范/教练式引导/直接指导",
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
export type Stage = (typeof stages)[number];
export type Strategy = (typeof strategies)[number];
export type Reaction = (typeof reactions)[number];
export type DistanceLevel = (typeof distanceLevels)[number];
export type LanguageMove = (typeof languageMoves)[number];
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
  stage: Stage;
  lastStrategy: Strategy | null;
  userReaction: Reaction | null;
  distanceLevel: DistanceLevel;
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
  distanceLevel: DistanceLevel;
  focusNote: string;
  appraisals: AppraisalMap;
}

export interface StrategyPlan {
  stage: Stage;
  strategy: Strategy;
  languageMoves: LanguageMove[];
  rationale: string;
}

export interface ValidationResult {
  pass: boolean;
  issues: string[];
  revisedResponse: string;
}

export interface StateUpdateResult {
  stage: Stage;
  distanceLevel: DistanceLevel;
  focusNote: string;
  summaryHint: string;
}

export interface SummaryResult {
  summary: string;
}
