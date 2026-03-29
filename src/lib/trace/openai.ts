const DEFAULT_TIMEOUT_MS = 45_000;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function normalizeEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value.trim();
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("模型返回了空响应。");
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
  const content = choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("模型响应中缺少文本内容。");
  }
  return content.trim();
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim();
}

export async function callTraceModel(messages: ChatMessage[], temperature = 0.2): Promise<string> {
  const apiKey = readEnv("TRACE_OPENAI_API_KEY");
  const baseUrl = readEnv("TRACE_OPENAI_BASE_URL");
  const model = process.env.TRACE_OPENAI_MODEL?.trim() || "gpt-4o";
  const endpoint = normalizeEndpoint(baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object"
          ? JSON.stringify(payload)
          : `HTTP ${response.status}`;
      throw new Error(`模型请求失败：${message}`);
    }

    return extractText(payload);
  } finally {
    clearTimeout(timeout);
  }
}

export async function callTraceJson<T>(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.1,
): Promise<T> {
  const raw = await callTraceModel(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  );
  const normalized = stripCodeFence(raw);
  return JSON.parse(normalized) as T;
}

export async function callTraceText(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.55,
): Promise<string> {
  return callTraceModel(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  );
}
