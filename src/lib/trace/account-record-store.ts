import { getRedisClient } from "@/lib/trace/redis-client";
import type { TraceSession, TraceTurnDiagnostics } from "@/lib/trace/types";

export type AccountEventType =
  | "consent"
  | "pilot-basic-info"
  | "stai"
  | "panas"
  | "event-checklist"
  | "pilot-feedback";

export interface StoredAccountEvent<T = unknown> {
  id: string;
  sessionId: string;
  createdAt: string;
  data: T;
}

export interface StoredAccountSession {
  sessionId: string;
  savedAt: string;
  chat: TraceSession;
  turnDiagnostics: TraceTurnDiagnostics[];
}

export interface AccountRecord {
  username: string;
  isPilot: boolean;
  createdAt: string;
  updatedAt: string;
  sessions: StoredAccountSession[];
  consentRecords: StoredAccountEvent[];
  pilotBasicInfoRecords: StoredAccountEvent[];
  staiRecords: StoredAccountEvent[];
  panasRecords: StoredAccountEvent[];
  eventChecklistRecords: StoredAccountEvent[];
  pilotFeedbackRecords: StoredAccountEvent[];
}

function getAccountRedisKey(username: string): string {
  return `trace:account:${username}`;
}

function buildInitialAccountRecord(username: string, isPilot: boolean): AccountRecord {
  const now = new Date().toISOString();
  return {
    username,
    isPilot,
    createdAt: now,
    updatedAt: now,
    sessions: [],
    consentRecords: [],
    pilotBasicInfoRecords: [],
    staiRecords: [],
    panasRecords: [],
    eventChecklistRecords: [],
    pilotFeedbackRecords: [],
  };
}

function sanitizeStoredEvent(value: unknown): StoredAccountEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<StoredAccountEvent>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.sessionId !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }
  return {
    id: candidate.id,
    sessionId: candidate.sessionId,
    createdAt: candidate.createdAt,
    data: candidate.data ?? null,
  };
}

function sanitizeStoredSession(value: unknown): StoredAccountSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<StoredAccountSession>;
  if (
    typeof candidate.sessionId !== "string" ||
    typeof candidate.savedAt !== "string" ||
    !candidate.chat ||
    typeof candidate.chat !== "object"
  ) {
    return null;
  }
  return {
    sessionId: candidate.sessionId,
    savedAt: candidate.savedAt,
    chat: candidate.chat as TraceSession,
    turnDiagnostics: Array.isArray(candidate.turnDiagnostics)
      ? (candidate.turnDiagnostics as TraceTurnDiagnostics[])
      : [],
  };
}

function sanitizeEventList(value: unknown): StoredAccountEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(sanitizeStoredEvent)
    .filter((item): item is StoredAccountEvent => item !== null);
}

function sanitizeSessionList(value: unknown): StoredAccountSession[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(sanitizeStoredSession)
    .filter((item): item is StoredAccountSession => item !== null);
}

function sanitizeAccountRecord(value: unknown, username: string, isPilot: boolean): AccountRecord {
  const fallback = buildInitialAccountRecord(username, isPilot);
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<AccountRecord>;
  return {
    username: typeof candidate.username === "string" ? candidate.username : username,
    isPilot: typeof candidate.isPilot === "boolean" ? candidate.isPilot : isPilot,
    createdAt:
      typeof candidate.createdAt === "string" && candidate.createdAt.trim()
        ? candidate.createdAt
        : fallback.createdAt,
    updatedAt:
      typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
        ? candidate.updatedAt
        : fallback.updatedAt,
    sessions: sanitizeSessionList(candidate.sessions),
    consentRecords: sanitizeEventList(candidate.consentRecords),
    pilotBasicInfoRecords: sanitizeEventList(candidate.pilotBasicInfoRecords),
    staiRecords: sanitizeEventList(candidate.staiRecords),
    panasRecords: sanitizeEventList(candidate.panasRecords),
    eventChecklistRecords: sanitizeEventList(candidate.eventChecklistRecords),
    pilotFeedbackRecords: sanitizeEventList(candidate.pilotFeedbackRecords),
  };
}

function readPayloadTimestamp(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = payload as { timestamp?: unknown };
  return typeof candidate.timestamp === "string" && candidate.timestamp.trim()
    ? candidate.timestamp
    : null;
}

function getCollectionKey(eventType: AccountEventType): keyof Pick<
  AccountRecord,
  | "consentRecords"
  | "pilotBasicInfoRecords"
  | "staiRecords"
  | "panasRecords"
  | "eventChecklistRecords"
  | "pilotFeedbackRecords"
> {
  switch (eventType) {
    case "consent":
      return "consentRecords";
    case "pilot-basic-info":
      return "pilotBasicInfoRecords";
    case "stai":
      return "staiRecords";
    case "panas":
      return "panasRecords";
    case "event-checklist":
      return "eventChecklistRecords";
    case "pilot-feedback":
      return "pilotFeedbackRecords";
  }
}

export async function restoreAccountRecord(
  username: string,
  isPilot: boolean,
): Promise<AccountRecord> {
  const client = await getRedisClient();
  const existing = await client.get(getAccountRedisKey(username));
  if (!existing) {
    return buildInitialAccountRecord(username, isPilot);
  }
  return sanitizeAccountRecord(JSON.parse(existing), username, isPilot);
}

export async function saveAccountRecord(record: AccountRecord): Promise<AccountRecord> {
  const client = await getRedisClient();
  const nextRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  await client.set(getAccountRedisKey(record.username), JSON.stringify(nextRecord));
  return nextRecord;
}

export async function appendAccountEvent(options: {
  username: string;
  isPilot: boolean;
  sessionId: string;
  eventType: AccountEventType;
  payload: unknown;
}): Promise<AccountRecord> {
  const record = await restoreAccountRecord(options.username, options.isPilot);
  const collectionKey = getCollectionKey(options.eventType);
  const createdAt = readPayloadTimestamp(options.payload) ?? new Date().toISOString();
  const entry: StoredAccountEvent = {
    id: crypto.randomUUID(),
    sessionId: options.sessionId,
    createdAt,
    data: options.payload ?? null,
  };
  record[collectionKey] = [...record[collectionKey], entry];
  return saveAccountRecord(record);
}

export async function upsertAccountSession(options: {
  username: string;
  isPilot: boolean;
  session: TraceSession;
  turnDiagnostics?: TraceTurnDiagnostics | null;
}): Promise<AccountRecord> {
  const record = await restoreAccountRecord(options.username, options.isPilot);
  const savedAt = new Date().toISOString();
  const existingDiagnostics =
    record.sessions.find((item) => item.sessionId === options.session.sessionId)?.turnDiagnostics || [];
  const nextDiagnostics = options.turnDiagnostics
    ? [...existingDiagnostics, options.turnDiagnostics]
    : existingDiagnostics;
  const nextEntry: StoredAccountSession = {
    sessionId: options.session.sessionId,
    savedAt,
    chat: options.session,
    turnDiagnostics: nextDiagnostics,
  };
  const existingIndex = record.sessions.findIndex(
    (item) => item.sessionId === options.session.sessionId,
  );

  if (existingIndex >= 0) {
    record.sessions = record.sessions.map((item, index) =>
      index === existingIndex ? nextEntry : item,
    );
  } else {
    record.sessions = [...record.sessions, nextEntry];
  }

  return saveAccountRecord(record);
}
