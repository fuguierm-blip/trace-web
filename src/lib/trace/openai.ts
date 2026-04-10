const DEFAULT_TIMEOUT_MS = 45_000;
const STREAM_TIMEOUT_MS = 180_000;

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

function extractDeltaText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const choice = (payload as {
    choices?: Array<{ delta?: { content?: string | Array<{ text?: string }> } }>;
  }).choices?.[0];

  const content = choice?.delta?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
  }

  return "";
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callTraceModel(messages: ChatMessage[], temperature = 0.2): Promise<string> {
  const apiKey = readEnv("TRACE_OPENAI_API_KEY");
  const baseUrl = readEnv("TRACE_OPENAI_BASE_URL");
  const model = process.env.TRACE_OPENAI_MODEL?.trim() || "gpt-4o";
  const endpoint = normalizeEndpoint(baseUrl);

  let retryDelayMs = 1_000;
  // 用户明确要求如果失败就继续重试到成功为止。
  // 因此这里不做次数上限，直到供应商返回可用结果。
  for (;;) {
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
    } catch (error) {
      console.error("TRACE model call failed, retrying:", error);
      await wait(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 8_000);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function callTraceTextStream(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => Promise<void> | void,
  onReset?: () => Promise<void> | void,
  temperature = 0.55,
): Promise<string> {
  const apiKey = readEnv("TRACE_OPENAI_API_KEY");
  const baseUrl = readEnv("TRACE_OPENAI_BASE_URL");
  const model = process.env.TRACE_OPENAI_MODEL?.trim() || "gpt-4o";
  const endpoint = normalizeEndpoint(baseUrl);

  let retryDelayMs = 1_000;
  for (;;) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
    let streamedText = "";

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
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object"
            ? JSON.stringify(payload)
            : `HTTP ${response.status}`;
        throw new Error(`模型请求失败：${message}`);
      }

      if (!response.body) {
        throw new Error("模型流式响应为空。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }

          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            return streamedText.trim();
          }

          const parsed = JSON.parse(payload) as unknown;
          const delta = extractDeltaText(parsed);
          if (!delta) {
            continue;
          }

          streamedText += delta;
          await onChunk(delta);
        }
      }

      if (buffer.trim().startsWith("data:")) {
        const payload = buffer.trim().slice(5).trim();
        if (payload !== "[DONE]") {
          const parsed = JSON.parse(payload) as unknown;
          const delta = extractDeltaText(parsed);
          if (delta) {
            streamedText += delta;
            await onChunk(delta);
          }
        }
      }

      if (!streamedText.trim()) {
        throw new Error("模型流式响应中缺少文本内容。");
      }

      return streamedText.trim();
    } catch (error) {
      console.error("TRACE model stream failed, retrying:", error);
      if (streamedText && onReset) {
        await onReset();
      }
      await wait(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 8_000);
    } finally {
      clearTimeout(timeout);
    }
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
