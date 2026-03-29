"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { TraceSession } from "@/lib/trace/types";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface StoredFrontendState {
  isLoggedIn: boolean;
  sessionId: string;
  snapshot: TraceSession | null;
  messages: Array<{
    id: string;
    text: string;
    sender: "user" | "ai";
    timestamp: string;
  }>;
}

const STORAGE_KEY = "trace-frontend-state-v1";

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Ma+Shan+Zheng&display=swap');
`;

const cuteTextStyle = {
  fontFamily: "'ZCOOL KuaiLe', 'Ma Shan Zheng', cursive, sans-serif",
};

const welcomeMessage: Message = {
  id: "trace-welcome",
  text: "你好！我是 Trace 🌿 很高兴见到你。我是一个温暖、善解人意的 AI 伙伴，你可以和我分享任何想法、感受或烦恼。我会认真倾听，陪伴你度过每一个时刻。今天想聊些什么呢？",
  sender: "ai",
  timestamp: new Date(0),
};

function readStoredState(): StoredFrontendState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredFrontendState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function injectCuteFont() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.head.querySelector("style[data-cute-font]")) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.textContent = fontImport;
  styleElement.setAttribute("data-cute-font", "true");
  document.head.appendChild(styleElement);
}

function createSessionId(): string {
  return crypto.randomUUID();
}

function toUiMessages(session: TraceSession | null): Message[] {
  if (!session) {
    return [];
  }

  return session.history.map((message) => ({
    id: message.id,
    text: message.content,
    sender: message.role === "assistant" ? "ai" : "user",
    timestamp: new Date(message.createdAt),
  }));
}

function toStoredMessages(messages: Message[]): StoredFrontendState["messages"] {
  return messages.map((message) => ({
    id: message.id,
    text: message.text,
    sender: message.sender,
    timestamp: message.timestamp.toISOString(),
  }));
}

function fromStoredMessages(messages: StoredFrontendState["messages"]): Message[] {
  return messages.map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}

function EyeFollowingCard() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        const maxDistance = 200;
        const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
        const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));

        setMousePosition({ x: normalizedX * 6, y: normalizedY * 6 });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (cardRef.current && e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;

        const maxDistance = 200;
        const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
        const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));

        setMousePosition({ x: normalizedX * 6, y: normalizedY * 6 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.8 }}
      className="relative"
      style={{
        width: "min(320px, 85vw)",
        height: "min(360px, 60vh)",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        borderRadius: "36px",
        padding: "clamp(36px, 6vw, 48px)",
        boxShadow: "0 20px 60px rgba(52, 168, 83, 0.15), 0 0 0 1px rgba(255,255,255,0.9)",
        border: "2px solid rgba(255, 255, 255, 0.95)",
      }}
    >
      <div className="flex h-full flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative mb-4"
          style={{ height: "50px" }}
        >
          <div
            style={{
              width: "3px",
              height: "40px",
              background:
                "linear-gradient(to bottom, rgba(82, 183, 136, 0.6), rgba(82, 183, 136, 0.2))",
              margin: "0 auto",
              borderRadius: "2px",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: "18px",
              height: "18px",
              background: "linear-gradient(135deg, #86efac 0%, #4ade80 100%)",
              borderRadius: "50%",
              position: "absolute",
              top: "-8px",
              left: "50%",
              transform: "translateX(-50%)",
              boxShadow:
                "0 2px 8px rgba(74, 222, 128, 0.4), inset 0 -2px 4px rgba(52, 168, 83, 0.3)",
            }}
          />
        </motion.div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative rounded-full"
          style={{
            width: "200px",
            height: "200px",
            background: "linear-gradient(135deg, #bbf7d0 0%, #86efac 50%, #6ee7b7 100%)",
            boxShadow:
              "0 12px 32px rgba(52, 168, 83, 0.25), inset 0 -8px 16px rgba(52, 168, 83, 0.15), inset 0 4px 12px rgba(255, 255, 255, 0.6)",
          }}
        >
          <motion.div
            animate={{ opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute rounded-full"
            style={{
              width: "45px",
              height: "28px",
              background:
                "radial-gradient(circle, rgba(248, 113, 113, 0.4) 0%, rgba(248, 113, 113, 0) 70%)",
              left: "18px",
              top: "105px",
              filter: "blur(6px)",
            }}
          />
          <motion.div
            animate={{ opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute rounded-full"
            style={{
              width: "45px",
              height: "28px",
              background:
                "radial-gradient(circle, rgba(248, 113, 113, 0.4) 0%, rgba(248, 113, 113, 0) 70%)",
              right: "18px",
              top: "105px",
              filter: "blur(6px)",
            }}
          />

          <div className="absolute left-[50px] top-[68px] flex gap-[60px]">
            {[0, 1].map((index) => (
              <div className="relative" key={index}>
                <div
                  className="rounded-full"
                  style={{
                    width: "44px",
                    height: "50px",
                    background: "white",
                    boxShadow:
                      "0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
                  }}
                />
                <motion.div
                  animate={{ x: mousePosition.x, y: mousePosition.y }}
                  transition={{ type: "spring", stiffness: 150, damping: 15 }}
                  className="absolute left-[8px] top-[8px]"
                >
                  <div
                    className="relative rounded-full"
                    style={{
                      width: "28px",
                      height: "32px",
                      background: "linear-gradient(135deg, #34a853 0%, #2d8945 100%)",
                    }}
                  >
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: "12px",
                        height: "12px",
                        background: "rgba(255, 255, 255, 0.85)",
                        top: "4px",
                        left: "5px",
                        boxShadow: "0 0 4px rgba(255, 255, 255, 0.8)",
                      }}
                    />
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: "6px",
                        height: "6px",
                        background: "rgba(255, 255, 255, 0.6)",
                        bottom: "6px",
                        right: "6px",
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          <motion.div
            animate={{ scaleX: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute bottom-[48px] left-1/2"
            style={{ transform: "translateX(-50%)" }}
          >
            <div
              style={{
                width: "85px",
                height: "12px",
                borderRadius: "0 0 50px 50px",
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(45, 137, 69, 0.5) 100%)",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  border: "3px solid rgba(45, 137, 69, 0.8)",
                  borderTop: "none",
                  borderRadius: "0 0 50px 50px",
                  position: "absolute",
                  bottom: 0,
                }}
              />
            </div>
          </motion.div>

          <div
            className="absolute rounded-full"
            style={{
              width: "18px",
              height: "55px",
              background: "linear-gradient(135deg, #86efac 0%, #6ee7b7 100%)",
              left: "-10px",
              top: "95px",
              borderRadius: "30px",
              boxShadow: "0 4px 8px rgba(52, 168, 83, 0.2)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: "18px",
              height: "55px",
              background: "linear-gradient(135deg, #86efac 0%, #6ee7b7 100%)",
              right: "-10px",
              top: "95px",
              borderRadius: "30px",
              boxShadow: "0 4px 8px rgba(52, 168, 83, 0.2)",
            }}
          />
        </motion.div>

        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute right-10 top-10 text-2xl"
        >
          💚
        </motion.div>
        <motion.div
          animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5], rotate: [0, 15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          className="absolute left-10 top-16 text-xl"
        >
          ✨
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="absolute bottom-10 right-12 text-lg"
        >
          🌿
        </motion.div>
      </div>
    </motion.div>
  );
}

function LoginScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #d1fae5 50%, #bbf7d0 100%)",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute left-20 top-20 h-96 w-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(134, 239, 172, 0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <motion.div
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 right-20 h-96 w-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(110, 231, 183, 0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12">
        <EyeFollowingCard />

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="px-4 text-center"
        >
          <h1
            style={{
              fontSize: "clamp(3rem, 10vw, 4rem)",
              marginBottom: "0.75rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Trace
          </h1>
          <p
            style={{
              ...cuteTextStyle,
              fontSize: "clamp(1rem, 4vw, 1.25rem)",
              marginBottom: "2rem",
              color: "#047857",
              fontWeight: 500,
            }}
          >
            你的心灵成长伙伴 🌱
          </p>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            className="mx-auto flex rounded-full text-white"
            style={{
              ...cuteTextStyle,
              padding: "clamp(0.875rem, 3vw, 1rem) clamp(2rem, 8vw, 3rem)",
              fontSize: "clamp(1rem, 4vw, 1.125rem)",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              boxShadow: "0 10px 30px rgba(5, 150, 105, 0.4)",
              fontWeight: 600,
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <Sparkles size={20} />
            <span>开始对话</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function ChatBubble({ message, index }: { message: Message; index: number }) {
  const isAI = message.sender === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex gap-4 px-6 py-4 ${isAI ? "" : "bg-white/40"}`}
    >
      <div
        className="h-8 w-8 flex-shrink-0 rounded-full"
        style={{
          background: isAI
            ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
            : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="text-sm">{isAI ? "🌱" : "👤"}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs text-emerald-900/60" style={{ ...cuteTextStyle, fontWeight: 600 }}>
          {isAI ? "Trace" : "你"}
        </div>
        <div className="text-[15px] leading-relaxed text-emerald-950" style={{ ...cuteTextStyle, fontWeight: 400 }}>
          {message.text}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-4 px-6 py-4"
    >
      <div
        className="h-8 w-8 flex-shrink-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="text-sm">🌱</span>
      </div>

      <div className="flex items-center gap-1 pt-1">
        {[0, 0.2, 0.4].map((delay) => (
          <motion.div
            key={delay}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay }}
            className="h-2 w-2 rounded-full bg-emerald-600"
          />
        ))}
      </div>
    </motion.div>
  );
}

function SuggestedPrompts({ onSelect }: { onSelect: (text: string) => void }) {
  const prompts = [
    { text: "我感到有些焦虑", icon: "😰" },
    { text: "想要倾诉心事", icon: "💭" },
    { text: "今天心情不错", icon: "😊" },
    { text: "寻求一些建议", icon: "💡" },
  ];

  return (
    <div className="px-6 py-4">
      <div className="mb-3 text-xs text-emerald-700/70" style={{ ...cuteTextStyle, fontWeight: 500 }}>
        快速开始
      </div>
      <div className="grid grid-cols-2 gap-2">
        {prompts.map((prompt, index) => (
          <motion.button
            key={prompt.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(prompt.text)}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm text-emerald-800 transition-all"
            style={{
              ...cuteTextStyle,
              background: "rgba(255, 255, 255, 0.6)",
              border: "1.5px solid rgba(5, 150, 105, 0.15)",
              fontWeight: 500,
            }}
          >
            <span>{prompt.icon}</span>
            <span>{prompt.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ChatInterface({
  onLogout,
  sessionId,
}: {
  onLogout: () => void;
  sessionId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(() =>
    fromStoredMessages(readStoredState()?.messages ?? []),
  );
  const [snapshot, setSnapshot] = useState<TraceSession | null>(
    () => readStoredState()?.snapshot ?? null,
  );
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorText, setErrorText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const payload: StoredFrontendState = {
      isLoggedIn: true,
      sessionId,
      snapshot,
      messages: toStoredMessages(messages),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [messages, sessionId, snapshot]);

  const visibleMessages = [welcomeMessage, ...messages];

  const handleSendMessage = async (text?: string) => {
    const messageText = (text || inputValue).trim();
    if (!messageText || isTyping) {
      return;
    }

    const optimisticUserMessage: Message = {
      id: crypto.randomUUID(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    const nextMessages = [...messages, optimisticUserMessage];
    setMessages(nextMessages);
    setInputValue("");
    setErrorText("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: messageText,
          snapshot: snapshot ?? undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        session?: TraceSession;
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "TRACE 暂时没有返回结果。");
      }

      setSnapshot(payload.session);
      setMessages(toUiMessages(payload.session));
    } catch (error) {
      setMessages(messages);
      setInputValue(messageText);
      setErrorText(
        error instanceof Error ? error.message : "消息发送失败，请再试一次。",
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #f0fdf4 0%, #dcfce7 100%)",
        }}
      />

      <div className="relative z-10 flex h-full w-full flex-col">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(5, 150, 105, 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              }}
            >
              <span className="text-lg">🌿</span>
            </div>
            <div>
              <h1 className="text-lg text-emerald-900" style={{ fontWeight: 700 }}>
                Trace
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-700">在线</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="text-sm text-emerald-700 transition-colors hover:text-emerald-900"
            style={{ fontWeight: 500 }}
          >
            退出
          </button>
        </motion.div>

        <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
          <div className="mx-auto max-w-3xl py-6">
            {messages.length === 0 ? <SuggestedPrompts onSelect={handleSendMessage} /> : null}

            {visibleMessages.map((message, index) => (
              <ChatBubble key={message.id} message={message} index={index} />
            ))}

            <AnimatePresence>{isTyping ? <TypingIndicator /> : null}</AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-6 py-4"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(5, 150, 105, 0.1)",
          }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3">
              <div
                className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-3"
                style={{
                  background: "white",
                  border: "1.5px solid rgba(5, 150, 105, 0.2)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleSendMessage();
                    }
                  }}
                  placeholder="输入消息..."
                  className="flex-1 bg-transparent text-[15px] text-emerald-950 placeholder-emerald-400 focus:outline-none"
                  style={{ ...cuteTextStyle, fontWeight: 400 }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => void handleSendMessage()}
                  disabled={inputValue.trim() === "" || isTyping}
                  className="flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-30"
                  style={{
                    background:
                      inputValue.trim() && !isTyping
                        ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                        : "rgba(5, 150, 105, 0.1)",
                  }}
                >
                  <Send
                    size={16}
                    className={
                      inputValue.trim() && !isTyping ? "text-white" : "text-emerald-400"
                    }
                  />
                </motion.button>
              </div>
            </div>

            <p
              className="mt-3 text-center text-xs text-emerald-600/60"
              style={{ fontWeight: 400 }}
            >
              {errorText || "Trace 是 AI 助手，不能替代专业心理咨询"}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Component({
  showLoginScreen = true,
}: {
  showLoginScreen?: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const stored = readStoredState();
    return stored ? stored.isLoggedIn : !showLoginScreen;
  });
  const [sessionId, setSessionId] = useState(() => {
    const stored = readStoredState();
    return stored?.sessionId || createSessionId();
  });

  useEffect(() => {
    injectCuteFont();
  }, []);

  const handleEnter = () => {
    setIsLoggedIn(true);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const payload: StoredFrontendState = {
        isLoggedIn: true,
        sessionId,
        snapshot: null,
        messages: [],
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredFrontendState;
      parsed.isLoggedIn = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSessionId(createSessionId());
    setIsLoggedIn(false);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
          >
            <LoginScreen onEnter={handleEnter} />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
          >
            <ChatInterface onLogout={handleLogout} sessionId={sessionId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
