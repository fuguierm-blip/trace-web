"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ClipboardList, Eye, EyeOff, User, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TraceSession } from '@/lib/trace/types';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface STAIResult {
  answers: number[];
  timestamp: Date;
  type: 'pre' | 'post';
}

const welcomeMessage: Message = {
  id: 'trace-welcome',
  text: '你好！我是 Trace 🌿 很高兴见到你。我是一个温暖、善解人意的 AI 伙伴，你可以和我分享任何想法、感受或烦恼。我会认真倾听，陪伴你度过每一个时刻。开始之前，如果你愿意，也可以先告诉我你的性别、年龄、专业这些基本信息，再描述最近让你感到焦虑的事情。',
  sender: 'ai',
  timestamp: new Date(0),
};

const cuteTextStyle = {
  fontFamily: "'ZCOOL KuaiLe', 'Ma Shan Zheng', cursive, sans-serif"
};

// ==================== Eye Following Card ====================
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
        setMousePosition({
          x: Math.max(-1, Math.min(1, deltaX / maxDistance)) * 6,
          y: Math.max(-1, Math.min(1, deltaY / maxDistance)) * 6
        });
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
        setMousePosition({
          x: Math.max(-1, Math.min(1, deltaX / maxDistance)) * 6,
          y: Math.max(-1, Math.min(1, deltaY / maxDistance)) * 6
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
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
        width: 'min(220px, 60vw)',
        height: 'min(250px, 40vh)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '36px',
        padding: 'clamp(24px, 4vw, 36px)',
        boxShadow: '0 20px 60px rgba(52, 168, 83, 0.15), 0 0 0 1px rgba(255,255,255,0.9)',
        border: '2px solid rgba(255, 255, 255, 0.95)'
      }}
    >
      <div className="flex flex-col items-center h-full justify-center">
        <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="relative mb-2" style={{ height: '36px' }}>
          <div style={{ width: '3px', height: '28px', background: 'linear-gradient(to bottom, rgba(82, 183, 136, 0.6), rgba(82, 183, 136, 0.2))', margin: '0 auto', borderRadius: '2px' }} />
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)', borderRadius: '50%', position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 8px rgba(74, 222, 128, 0.4)' }} />
        </motion.div>

        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="relative rounded-full" style={{ width: '140px', height: '140px', background: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 50%, #6ee7b7 100%)', boxShadow: '0 12px 32px rgba(52, 168, 83, 0.25), inset 0 -8px 16px rgba(52, 168, 83, 0.15), inset 0 4px 12px rgba(255, 255, 255, 0.6)' }}>
          <motion.div animate={{ opacity: [0.4, 0.6, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="absolute rounded-full" style={{ width: '32px', height: '20px', background: 'radial-gradient(circle, rgba(248, 113, 113, 0.4) 0%, rgba(248, 113, 113, 0) 70%)', left: '12px', top: '75px', filter: 'blur(6px)' }} />
          <motion.div animate={{ opacity: [0.4, 0.6, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="absolute rounded-full" style={{ width: '32px', height: '20px', background: 'radial-gradient(circle, rgba(248, 113, 113, 0.4) 0%, rgba(248, 113, 113, 0) 70%)', right: '12px', top: '75px', filter: 'blur(6px)' }} />
          <div className="absolute left-[32px] top-[46px] flex gap-[44px]">
            {[0, 1].map(i => (
              <div key={i} className="relative">
                <div className="rounded-full" style={{ width: '32px', height: '36px', background: 'white', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} />
                <motion.div animate={{ x: mousePosition.x, y: mousePosition.y }} transition={{ type: "spring", stiffness: 150, damping: 15 }} className="absolute top-[6px] left-[5px]">
                  <div className="rounded-full relative" style={{ width: '22px', height: '24px', background: 'linear-gradient(135deg, #34a853 0%, #2d8945 100%)' }}>
                    <div className="rounded-full absolute" style={{ width: '9px', height: '9px', background: 'rgba(255, 255, 255, 0.85)', top: '3px', left: '4px' }} />
                    <div className="rounded-full absolute" style={{ width: '5px', height: '5px', background: 'rgba(255, 255, 255, 0.6)', bottom: '4px', right: '4px' }} />
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
          <motion.div animate={{ scaleX: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute bottom-[32px] left-1/2" style={{ transform: 'translateX(-50%)' }}>
            <div style={{ width: '60px', height: '9px', borderRadius: '0 0 50px 50px', background: 'linear-gradient(to bottom, transparent 0%, rgba(45, 137, 69, 0.5) 100%)', position: 'relative' }}>
              <div style={{ width: '100%', height: '5px', border: '2.5px solid rgba(45, 137, 69, 0.8)', borderTop: 'none', borderRadius: '0 0 50px 50px', position: 'absolute', bottom: 0 }} />
            </div>
          </motion.div>
          <div className="absolute rounded-full" style={{ width: '14px', height: '40px', background: 'linear-gradient(135deg, #86efac 0%, #6ee7b7 100%)', left: '-8px', top: '65px', borderRadius: '30px' }} />
          <div className="absolute rounded-full" style={{ width: '14px', height: '40px', background: 'linear-gradient(135deg, #86efac 0%, #6ee7b7 100%)', right: '-8px', top: '65px', borderRadius: '30px' }} />
        </motion.div>

        <motion.div animate={{ y: [0, -12, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-6 right-6 text-lg">💚</motion.div>
        <motion.div animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5], rotate: [0, 15, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} className="absolute top-10 left-6 text-base">✨</motion.div>
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} className="absolute bottom-6 right-8 text-sm">🌿</motion.div>
      </div>
    </motion.div>
  );
}

// ==================== Login Screen ====================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('请输入账号'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 50%, #bbf7d0 100%)' }}>
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-20 left-20 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(134, 239, 172, 0.4) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <motion.div animate={{ scale: [1.15, 1, 1.15], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 10, repeat: Infinity }} className="absolute bottom-20 right-20 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(110, 231, 183, 0.4) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">
        <EyeFollowingCard />

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="w-full">
          <h1 className="text-center" style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', marginBottom: '0.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Trace</h1>
          <p className="text-center" style={{ ...cuteTextStyle, fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)', marginBottom: '1.5rem', color: '#047857', fontWeight: 500 }}>你的心灵成长伙伴 🌱</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Username */}
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入账号"
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-[15px] text-emerald-950 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                style={{ ...cuteTextStyle, fontWeight: 400, background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(5, 150, 105, 0.2)', backdropFilter: 'blur(10px)' }}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-11 pr-12 py-3 rounded-2xl text-[15px] text-emerald-950 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                style={{ ...cuteTextStyle, fontWeight: 400, background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(5, 150, 105, 0.2)', backdropFilter: 'blur(10px)' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-700 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs text-center" style={{ fontWeight: 500 }}>{error}</motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              disabled={isLoading}
              className="w-full rounded-2xl text-white flex items-center justify-center gap-3 mt-1 disabled:opacity-70"
              style={{ ...cuteTextStyle, padding: '0.875rem', fontSize: '1rem', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 10px 30px rgba(5, 150, 105, 0.35)', fontWeight: 600 }}
            >
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>登录</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// ==================== STAI-S-6 Questionnaire ====================
const staiQuestions = [
  { text: '我感到心情平静', reverseScored: true },
  { text: '我感到紧张', reverseScored: false },
  { text: '我感到烦乱', reverseScored: false },
  { text: '我感到轻松', reverseScored: true },
  { text: '我感到心满意足', reverseScored: true },
  { text: '我感到烦恼', reverseScored: false },
];

const staiOptions = [
  { value: 1, label: '完全没有' },
  { value: 2, label: '有些' },
  { value: 3, label: '中等程度' },
  { value: 4, label: '非常明显' },
];

const reverseScoredOptions = [
  { value: 1, label: '非常没有' },
  { value: 2, label: '有些' },
  { value: 3, label: '中等程度' },
  { value: 4, label: '非常明显' },
];

function STAIQuestionnaire({ type, onSubmit, onClose }: { type: 'pre' | 'post'; onSubmit: (result: STAIResult) => void; onClose?: () => void }) {
  const [answers, setAnswers] = useState<number[]>(Array(6).fill(0));
  const allAnswered = answers.every(a => a > 0);

  const handleSelect = (qIndex: number, value: number) => {
    setAnswers(prev => { const next = [...prev]; next[qIndex] = value; return next; });
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit({ answers: [...answers], timestamp: new Date(), type });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl relative"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.95))', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <ClipboardList size={16} className="text-white" />
              </div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>STAI-S-6 焦虑评估</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors">
                <X size={18} className="text-emerald-600" />
              </button>
            )}
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(5, 150, 105, 0.08)' }}>
            <p className="text-xs text-emerald-800" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.6 }}>
              {type === 'pre' ? '📋 会话前评估' : '📋 会话后评估'} — 请根据您<span style={{ color: '#059669', fontWeight: 700 }}>此时此刻</span>的感受，对每句话选择最适合的答案。
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {staiQuestions.map((question, qi) => (
            <motion.div
              key={qi}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: qi * 0.06 }}
              className="rounded-2xl p-4"
              style={{ background: answers[qi] > 0 ? 'rgba(5, 150, 105, 0.06)' : 'rgba(255,255,255,0.8)', border: `1.5px solid ${answers[qi] > 0 ? 'rgba(5, 150, 105, 0.2)' : 'rgba(0,0,0,0.06)'}`, transition: 'all 0.2s' }}
            >
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>{qi + 1}</span>
                {question.text}
                {question.reverseScored && (
                  <span
                    className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
                    style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#047857', fontWeight: 700 }}
                  >
                    反向记分题
                  </span>
                )}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(question.reverseScored ? reverseScoredOptions : staiOptions).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(qi, opt.value)}
                    className="py-2 px-1 rounded-xl text-xs transition-all"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: answers[qi] === opt.value ? 600 : 400,
                      background: answers[qi] === opt.value ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.9)',
                      color: answers[qi] === opt.value ? 'white' : '#065f46',
                      border: `1.5px solid ${answers[qi] === opt.value ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                      boxShadow: answers[qi] === opt.value ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                      transform: answers[qi] === opt.value ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{opt.value}</div>
                    {opt.label}
                  </button>
                ))}
              </div>
              {question.reverseScored && (
                <p className="mt-3 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500 }}>
                  提示：本题为反向记分题，作答时仍按你此时此刻的实际感受选择相应程度。
                </p>
              )}
            </motion.div>
          ))}

          <motion.button
            whileHover={allAnswered ? { scale: 1.03 } : {}}
            whileTap={allAnswered ? { scale: 0.97 } : {}}
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="w-full py-3 rounded-2xl text-white mt-2 transition-all disabled:opacity-40"
            style={{
              ...cuteTextStyle,
              fontWeight: 600,
              background: allAnswered ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'rgba(5,150,105,0.3)',
              boxShadow: allAnswered ? '0 10px 30px rgba(5, 150, 105, 0.35)' : 'none'
            }}
          >
            {allAnswered ? '提交评估' : `请完成所有题目（${answers.filter(a => a > 0).length}/6）`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== Chat Bubble ====================
function ChatBubble({ message, index }: { message: Message; index: number }) {
  const isAI = message.sender === 'ai';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className={`flex gap-4 px-6 py-4 ${isAI ? '' : 'bg-white/40'}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isAI ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <span className="text-sm">{isAI ? '🌱' : '👤'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-emerald-900/60 mb-1" style={{ ...cuteTextStyle, fontWeight: 600 }}>{isAI ? 'Trace' : '你'}</div>
        <div className="text-[15px] text-emerald-950 leading-relaxed" style={{ ...cuteTextStyle, fontWeight: 400 }}>{message.text}</div>
      </div>
    </motion.div>
  );
}

// ==================== Typing Indicator ====================
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-4 px-6 py-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <span className="text-sm">🌱</span>
      </div>
      <div className="flex items-center gap-1 pt-1">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay }} className="w-2 h-2 rounded-full bg-emerald-600" />
        ))}
      </div>
    </motion.div>
  );
}

// ==================== Chat Interface ====================
function ChatInterface({ onLogout }: { onLogout: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSTAI, setShowSTAI] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [preSessionDone, setPreSessionDone] = useState(false);
  const [showPreSTAI, setShowPreSTAI] = useState(true);
  const [snapshot, setSnapshot] = useState<TraceSession | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [errorText, setErrorText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visibleMessages = [welcomeMessage, ...messages];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text?: string) => {
    const messageText = (text || inputValue).trim();
    if (messageText === '' || isTyping) return;
    const previousMessages = messages;
    const userMessage: Message = { id: crypto.randomUUID(), text: messageText, sender: 'user', timestamp: new Date() };
    setMessages([...messages, userMessage]);
    setInputValue('');
    setErrorText('');
    setIsTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(payload.error || 'TRACE 暂时没有返回结果。');
      }

      setSnapshot(payload.session);
      setMessages(
        payload.session.history.map((message) => ({
          id: message.id,
          text: message.content,
          sender: message.role === 'assistant' ? 'ai' : 'user',
          timestamp: new Date(message.createdAt),
        })),
      );
    } catch (error) {
      setMessages(previousMessages);
      setInputValue(messageText);
      setErrorText(error instanceof Error ? error.message : '消息发送失败，请稍后再试。');
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogoutClick = () => {
    setPendingLogout(true);
  };

  const handlePostSTAISubmit = (result: STAIResult) => {
    void result;
    setPendingLogout(false);
    onLogout();
  };

  const handlePreSTAISubmit = (result: STAIResult) => {
    void result;
    setShowPreSTAI(false);
    setPreSessionDone(true);
  };

  const handleManualSTAISubmit = (result: STAIResult) => {
    void result;
    setShowSTAI(false);
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #f0fdf4 0%, #dcfce7 100%)' }} />

      {/* Pre-session STAI */}
      <AnimatePresence>
        {showPreSTAI && <STAIQuestionnaire type="pre" onSubmit={handlePreSTAISubmit} />}
      </AnimatePresence>

      {/* Post-session STAI (on logout) */}
      <AnimatePresence>
        {pendingLogout && (
          <STAIQuestionnaire
            type="post"
            onSubmit={handlePostSTAISubmit}
            onClose={() => setPendingLogout(false)}
          />
        )}
      </AnimatePresence>

      {/* Manual STAI */}
      <AnimatePresence>
        {showSTAI && (
          <STAIQuestionnaire
            type="pre"
            onSubmit={handleManualSTAISubmit}
            onClose={() => setShowSTAI(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between px-6 py-4" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(5, 150, 105, 0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
              <span className="text-lg">🌿</span>
            </div>
            <div>
              <h1 className="text-lg text-emerald-900" style={{ fontWeight: 700 }}>Trace</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-xs text-emerald-700">在线</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSTAI(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-emerald-700 transition-all"
              style={{ ...cuteTextStyle, fontWeight: 500, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}
            >
              <ClipboardList size={14} />
              <span>焦虑评估</span>
            </motion.button>
            <button onClick={handleLogoutClick} className="text-sm text-emerald-700 hover:text-emerald-900 transition-colors" style={{ fontWeight: 500 }}>退出</button>
          </div>
        </motion.div>

        {/* STAI Notice Banner */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-6 py-2"
          style={{ background: 'rgba(5, 150, 105, 0.06)', borderBottom: '1px solid rgba(5, 150, 105, 0.08)' }}
        >
          <p className="text-xs text-emerald-700/80 text-center" style={{ ...cuteTextStyle, fontWeight: 400 }}>
            📋 STAI-S-6 焦虑量表需在每次会话<span style={{ fontWeight: 600 }}>开始前</span>及<span style={{ fontWeight: 600 }}>结束后</span>各填写一次
            {preSessionDone && <span className="ml-2 text-emerald-600" style={{ fontWeight: 600 }}>✓ 会话前已完成</span>}
          </p>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-3xl mx-auto py-6">
            {visibleMessages.map((message, index) => (
              <ChatBubble key={message.id} message={message} index={index} />
            ))}
            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-6 py-4" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(5, 150, 105, 0.1)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: 'white', border: '1.5px solid rgba(5, 150, 105, 0.2)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && void handleSendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 text-[15px] text-emerald-950 placeholder-emerald-400 focus:outline-none bg-transparent"
                  style={{ ...cuteTextStyle, fontWeight: 400 }}
                />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => void handleSendMessage()} disabled={inputValue.trim() === '' || isTyping} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30" style={{ background: inputValue.trim() ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'rgba(5, 150, 105, 0.1)' }}>
                  <Send size={16} className={inputValue.trim() ? 'text-white' : 'text-emerald-400'} />
                </motion.button>
              </div>
            </div>
            <p className="text-xs text-emerald-600/60 text-center mt-3" style={{ fontWeight: 400 }}>{errorText || 'Trace 是 AI 助手，不能替代专业心理咨询'}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ==================== Main App ====================
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full">
            <LoginScreen onLogin={() => { setIsLoggedIn(true); }} />
          </motion.div>
        ) : (
          <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full">
            <ChatInterface onLogout={() => setIsLoggedIn(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
