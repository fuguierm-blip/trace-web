import { createClient } from "redis";

type TraceRedisClient = ReturnType<typeof createClient>;

let redisClientPromise: Promise<TraceRedisClient> | null = null;

function readRedisUrl(): string {
  const value = process.env.REDIS_URL?.trim();
  if (!value) {
    throw new Error("缺少环境变量 REDIS_URL");
  }
  return value;
}

export function getSessionRedisKey(sessionId: string): string {
  return `trace:session:${sessionId}`;
}

export async function getRedisClient(): Promise<TraceRedisClient> {
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({
        url: readRedisUrl(),
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 200, 3_000),
        },
      });

      client.on("error", (error) => {
        console.error("Redis error:", error);
      });

      if (!client.isOpen) {
        await client.connect();
      }

      return client;
    })();
  }

  return redisClientPromise;
}
