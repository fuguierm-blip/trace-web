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

interface PANASResult {
  answers: number[];
  timestamp: Date;
}

interface GAD7Result {
  answers: number[];
  timestamp: Date;
}

interface EventChecklistResult {
  eventNature: number;
  categories: string[];
  emotionImpact: number;
  questionnaireImpact: number;
  description: string;
  timestamp: Date;
}

interface PilotFeedbackResult {
  agreementAnswers: number[];
  mostHelpfulPart: string;
  needsImprovement: string;
  preferredReward: string;
  comboRewardScore: number;
  timestamp: Date;
}

interface ChatStreamEvent {
  type: 'status' | 'chunk' | 'replace' | 'done' | 'error';
  phase?: string;
  content?: string;
  reply?: string;
  session?: TraceSession;
  error?: string;
}

interface UserAccount {
  username: string;
  isPilot: boolean;
}

interface RestoredAccountRecord {
  sessions?: Array<{
    sessionId: string;
    savedAt: string;
    chat: TraceSession;
  }>;
}

interface ConsentResult {
  hasRead: boolean;
  knowsBoundary: boolean;
  knowsCanQuit: boolean;
  agreesToJoin: boolean;
  timestamp: Date;
}

interface PilotBasicInfoResult {
  participantCode: string;
  displayName: string;
  contact: string;
  age: string;
  gender: string;
  hometown: string;
  schoolGrade: string;
  major: string;
  pressureSources: string[];
  stressLevel: string;
  timestamp: Date;
}

const welcomeMessage: Message = {
  id: 'trace-welcome',
  text: '你好！我是 Trace 🌿 很高兴见到你。我是一个温暖、善解人意的 AI 伙伴，你可以和我分享任何想法、感受或烦恼。我会认真倾听，陪伴你度过每一个时刻。请在开始之前先告诉我您的年龄、专业和性别。等我先了解这些基本信息后，再陪你慢慢说最近让你感到焦虑的事情。',
  sender: 'ai',
  timestamp: new Date(0),
};

const cuteTextStyle = {
  fontFamily: "'ZCOOL KuaiLe', 'Ma Shan Zheng', cursive, sans-serif"
};

const COMPLETED_SESSIONS_KEY = 'trace-completed-sessions-count';
const TARGET_SESSIONS_FOR_FOLLOWUP = 3;
const VALID_TEST_ACCOUNTS = Array.from({ length: 10 }, (_, index) => String(index + 1));
const SESSION_EFFECT_NOTICE =
  'TRACE 的目标是帮助您调节焦虑情绪，会话结束后您将重新做 STAI-S-6 量表，以检验 TRACE 的效果。';
const RETURNING_PROMPT =
  '欢迎回来，您最近有感到焦虑的事情吗，或者你想谈谈上次聊到的焦虑问题有所缓解吗？';

const consentIntroParagraphs = [
  'TRACE 是一个面向大学生的文本对话系统，主要用于在日常交流中提供支持，帮助用户缓解焦虑、梳理当前困扰，并尝试换一个角度理解问题。TRACE 不提供临床诊断，也不能替代心理治疗或医疗服务。本次试测主要用于检查系统流程、会话体验与研究材料是否清晰可用。',
  '您受邀参加“TRACE 认知重评对话系统”试测。本次试测的主要目的是检查研究流程、问卷安排、系统可用性与会话体验，以便在正式研究开始前进一步优化材料和程序。',
];

const consentSections = [
  {
    title: '一、试测内容',
    items: [
      '本次试测通常包括：阅读并确认知情说明、填写基本信息、完成会前简短量表、参加 1 次 TRACE 会话、完成会后反馈问卷；必要时，研究人员可能会在结束后进行简短口头询问。',
      '单次试测预计总时长约 20–40 分钟。',
    ],
  },
  {
    title: '二、隐私与资料使用',
    items: [
      '研究团队会尽量保护您的个人信息。试测材料将以编号形式整理，姓名、联系方式等识别信息将与研究数据分开保存。',
      '您提供的问卷、会话内容和反馈意见仅用于本项目的试测评估、系统优化、学术研究或伦理审查需要，不会在公开材料中直接披露您的身份信息。',
      '未经您的额外同意，研究团队不会公开能够直接识别您身份的原始信息。',
    ],
  },
  {
    title: '三、参加条件',
    items: [
      '您应为在读大学生，能够使用中文完成问卷与文本对话，并愿意按要求参加本次试测。',
      '如果您当前情绪极度不稳定，或近期正处在需要优先接受专业帮助的状态，建议暂不参加本次试测。',
    ],
  },
  {
    title: '四、可能的不适与风险',
    items: [
      '在回顾个人压力、焦虑或困扰时，您可能会感到短暂不适、紧张或情绪波动。',
      'TRACE 为低强度数字支持工具，不提供临床诊断，也不能替代心理治疗或医疗服务。',
    ],
  },
  {
    title: '五、可能的受益',
    items: [
      '您可能会从本次会话中获得一定的情绪梳理、问题澄清或短暂缓解。',
      '本次试测更主要的意义在于帮助研究团队发现问题、优化系统与流程。',
    ],
  },
  {
    title: '六、自愿参加与退出',
    items: [
      '参加本次试测完全出于自愿。您可以在任何时候拒绝回答某个问题，或在不说明理由的情况下中止试测。',
      '退出不会给您带来任何不利影响；如有补偿，将按研究安排执行。',
    ],
  },
  {
    title: '七、录音与记录',
    items: [
      '如研究人员在试测后进行简短口头访谈，可能会征求您是否同意录音。',
      '您可以不同意录音；不同意不会影响您参与本次试测。',
    ],
  },
  {
    title: '八、研究说明',
    items: [
      '如果您对本次试测有疑问，可以当场向研究人员咨询。',
      '如果您在试测过程中感到明显不适，请立即告诉研究人员，研究将暂停并视情况提供休息、退出或转介建议。',
    ],
  },
];

const pilotConsentChecks = [
  '我已阅读并理解以上说明。',
  '我知道本次活动属于试测，不是正式治疗，也不能替代专业心理服务。',
  '我知道自己可以随时退出，且不会因此受到不利影响。',
  '我同意参加本次试测。',
];

const pilotPressureSourceOptions = [
  '学业 / 考试',
  '求职 / 升学',
  '人际关系',
  '家庭',
  '睡眠或身体状态',
  '其他',
];

const pilotStressLevelOptions = ['没有', '偶尔', '有时', '经常'];
const pilotFeedbackAgreementOptions = [
  { value: 1, label: '非常不同意' },
  { value: 2, label: '不同意' },
  { value: 3, label: '一般' },
  { value: 4, label: '同意' },
  { value: 5, label: '非常同意' },
];

const pilotFeedbackStatements = [
  '我觉得这次 TRACE 会话整体上容易理解。',
  '我觉得 TRACE 的回复总体比较自然。',
  '我觉得 TRACE 大体能理解我想表达的重点。',
  '我觉得这次会话对我有一定帮助。',
  '我觉得这次会话结束后，我的情绪比开始时更稳定一些。',
  '如果以后有需要，我愿意再次使用类似的系统。',
  '如果以后还有类似研究，我愿意继续参加。',
];

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
function LoginScreen({ onLogin }: { onLogin: (account: UserAccount) => void }) {
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
    if (!VALID_TEST_ACCOUNTS.includes(username.trim())) {
      setError('账号仅支持 1 到 10。');
      return;
    }
    if (password.trim() !== username.trim()) {
      setError('密码需与账号一致。');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        username: username.trim(),
        isPilot: Number(username.trim()) >= 1 && Number(username.trim()) <= 6,
      });
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
                placeholder="请输入您的账号"
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
                placeholder="密码与账号相同"
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

function PilotConsentDialog({
  onSubmit,
}: {
  onSubmit: (result: ConsentResult) => void;
}) {
  const [checks, setChecks] = useState<boolean[]>(Array(4).fill(false));
  const allChecked = checks.every(Boolean);

  const toggleCheck = (index: number) => {
    setChecks((current) => current.map((item, itemIndex) => (itemIndex === index ? !item : item)));
  };

  const handleSubmit = () => {
    if (!allChecked) {
      return;
    }
    onSubmit({
      hasRead: checks[0],
      knowsBoundary: checks[1],
      knowsCanQuit: checks[2],
      agreesToJoin: checks[3],
      timestamp: new Date(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 30px 80px rgba(0,0,0,0.18)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.96))', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>TRACE 试测版知情同意书</h2>
              <p className="text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500 }}>请先阅读并确认以下说明，再继续进入试测流程。</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(5,150,105,0.12)' }}>
            {consentIntroParagraphs.map((text) => (
              <p key={text} className="text-sm text-emerald-950 mb-3" style={{ lineHeight: 1.75 }}>
                {text}
              </p>
            ))}
            {consentSections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="text-sm text-emerald-900 mb-2" style={{ ...cuteTextStyle, fontWeight: 700 }}>{section.title}</p>
                {section.items.map((item) => (
                  <p key={item} className="text-sm text-emerald-950 mb-2" style={{ lineHeight: 1.75 }}>
                    {item}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(5,150,105,0.06)', border: '1.5px solid rgba(5,150,105,0.12)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 700 }}>请勾选以下确认项</p>
            <div className="flex flex-col gap-3">
              {pilotConsentChecks.map((label, index) => (
                <button
                  key={label}
                  onClick={() => toggleCheck(index)}
                  className="flex items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                  style={{
                    background: checks[index] ? 'rgba(5,150,105,0.14)' : 'rgba(255,255,255,0.92)',
                    border: `1.5px solid ${checks[index] ? 'rgba(5,150,105,0.24)' : 'rgba(5,150,105,0.1)'}`,
                  }}
                >
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md text-xs"
                    style={{
                      background: checks[index] ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(5,150,105,0.08)',
                      color: checks[index] ? 'white' : '#047857',
                      fontWeight: 700,
                    }}
                  >
                    {checks[index] ? '✓' : ''}
                  </span>
                  <span className="text-sm text-emerald-950" style={{ lineHeight: 1.7 }}>{label}</span>
                </button>
              ))}
            </div>

            <motion.button
              whileHover={allChecked ? { scale: 1.02 } : {}}
              whileTap={allChecked ? { scale: 0.98 } : {}}
              onClick={handleSubmit}
              disabled={!allChecked}
              className="mt-5 w-full rounded-2xl py-3 text-white transition-all disabled:opacity-40"
              style={{
                ...cuteTextStyle,
                fontWeight: 700,
                background: allChecked ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'rgba(5,150,105,0.3)',
                boxShadow: allChecked ? '0 10px 30px rgba(5,150,105,0.25)' : 'none',
              }}
            >
              同意并继续
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PilotBasicInfoDialog({
  onSubmit,
}: {
  onSubmit: (result: PilotBasicInfoResult) => void;
}) {
  const [participantCode, setParticipantCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [contact, setContact] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [hometown, setHometown] = useState('');
  const [schoolGrade, setSchoolGrade] = useState('');
  const [major, setMajor] = useState('');
  const [pressureSources, setPressureSources] = useState<string[]>([]);
  const [stressLevel, setStressLevel] = useState('');

  const togglePressureSource = (value: string) => {
    setPressureSources((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const canSubmit = age.trim() && gender && hometown.trim() && schoolGrade.trim() && major.trim() && stressLevel;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({
      participantCode: participantCode.trim(),
      displayName: displayName.trim(),
      contact: contact.trim(),
      age: age.trim(),
      gender,
      hometown: hometown.trim(),
      schoolGrade: schoolGrade.trim(),
      major: major.trim(),
      pressureSources,
      stressLevel,
      timestamp: new Date(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 30px 80px rgba(0,0,0,0.18)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.96))', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>TRACE 试测版基本信息填写表</h2>
              <p className="text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500 }}>请根据实际情况填写。若个别项目暂时不便提供，可留空非必填项。</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(5,150,105,0.08)' }}>
            <p className="text-xs text-emerald-800" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              本表用于安排本次试测流程和整理基础背景信息。带 <span style={{ fontWeight: 700 }}>*</span> 的项目请尽量填写完整。
            </p>
          </div>

          {[
            { label: '受试者编号（就是您的账号，如已收到，可填写）', value: participantCode, setter: setParticipantCode, placeholder: '例如：P-01' },
            { label: '姓名或昵称', value: displayName, setter: setDisplayName, placeholder: '例如：小林' },
            { label: '联系方式（手机或微信）', value: contact, setter: setContact, placeholder: '例如：微信号 / 手机号' },
            { label: '年龄 *', value: age, setter: setAge, placeholder: '例如：20' },
            { label: '家乡 *', value: hometown, setter: setHometown, placeholder: '例如：湖南长沙' },
            { label: '学校与年级 *', value: schoolGrade, setter: setSchoolGrade, placeholder: '例如：XX大学大三' },
            { label: '所学专业 *', value: major, setter: setMajor, placeholder: '例如：心理学' },
          ].map((field) => (
            <div key={field.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(5,150,105,0.1)' }}>
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 700 }}>{field.label}</p>
              <input
                value={field.value}
                onChange={(event) => field.setter(event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-2xl px-4 py-3 text-sm text-emerald-950 placeholder-emerald-400 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(5,150,105,0.15)' }}
              />
            </div>
          ))}

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(5,150,105,0.1)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 700 }}>性别 *</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {['女', '男', '其他 / 不便说明'].map((option) => (
                <button
                  key={option}
                  onClick={() => setGender(option)}
                  className="rounded-2xl px-4 py-3 text-sm transition-all"
                  style={{
                    ...cuteTextStyle,
                    fontWeight: gender === option ? 700 : 500,
                    background: gender === option ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.95)',
                    color: gender === option ? 'white' : '#065f46',
                    border: `1.5px solid ${gender === option ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(5,150,105,0.1)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 700 }}>目前最主要的压力来源（可多选）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pilotPressureSourceOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => togglePressureSource(option)}
                  className="rounded-2xl px-4 py-3 text-sm text-left transition-all"
                  style={{
                    ...cuteTextStyle,
                    fontWeight: pressureSources.includes(option) ? 700 : 500,
                    background: pressureSources.includes(option) ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.95)',
                    color: pressureSources.includes(option) ? 'white' : '#065f46',
                    border: `1.5px solid ${pressureSources.includes(option) ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(5,150,105,0.1)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 700 }}>过去两周是否常感到紧张、担心或压力较大 *</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {pilotStressLevelOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setStressLevel(option)}
                  className="rounded-2xl px-4 py-3 text-sm transition-all"
                  style={{
                    ...cuteTextStyle,
                    fontWeight: stressLevel === option ? 700 : 500,
                    background: stressLevel === option ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.95)',
                    color: stressLevel === option ? 'white' : '#065f46',
                    border: `1.5px solid ${stressLevel === option ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-2xl py-3 text-white transition-all disabled:opacity-40"
            style={{
              ...cuteTextStyle,
              fontWeight: 700,
              background: canSubmit ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'rgba(5,150,105,0.3)',
              boxShadow: canSubmit ? '0 10px 30px rgba(5,150,105,0.25)' : 'none',
            }}
          >
            提交基本信息并继续
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
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
  { value: 1, label: '非常明显' },
  { value: 2, label: '中等程度' },
  { value: 3, label: '有些' },
  { value: 4, label: '完全没有' },
];

const panasQuestions = [
  '感兴趣的',
  '心烦的',
  '精神活力高的',
  '心神不宁的',
  '劲头足的',
  '内疚的',
  '恐惧的',
  '怀有敌意的',
  '热情的',
  '自豪的',
  '易怒的',
  '警觉性高的',
  '害羞的',
  '备受鼓舞的',
  '紧张的',
  '意志坚定的',
  '注意力集中的',
  '坐立不安的',
  '有活力的',
  '害怕的',
];

const gad7Questions = [
  '感到紧张、不安或烦躁',
  '无法停止或者控制忧虑',
  '对各种各样的事情担忧过多',
  '很难放松下来',
  '由于不安而无法静坐',
  '变得容易烦恼或急躁',
  '感到好像有什么可怕的事将要发生',
];

const gad7Options = [
  { value: 0, label: '完全没有' },
  { value: 1, label: '几天' },
  { value: 2, label: '一半以上天数' },
  { value: 3, label: '几乎每天' },
];

const panasOptions = [
  { value: 1, label: '几乎没有' },
  { value: 2, label: '比较少' },
  { value: 3, label: '中等' },
  { value: 4, label: '比较多' },
  { value: 5, label: '极其多' },
];

const eventNatureOptions = [
  { value: 1, label: '没有' },
  { value: 2, label: '有，负面为主' },
  { value: 3, label: '有，正面为主' },
  { value: 4, label: '有，正负都有' },
  { value: 5, label: '不确定' },
];

const eventCategoryOptions = [
  '学业/考试/论文',
  '实习/求职/升学申请',
  '人际冲突',
  '恋爱/分手',
  '家庭事件',
  '身体疾病或睡眠问题',
  '经济压力',
  '其他',
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
                <span
                  className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#047857', fontWeight: 700 }}
                >
                  {question.reverseScored ? '反向记分题' : '正向记分题'}
                </span>
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
              {question.reverseScored ? (
                <p className="mt-3 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500 }}>
                  提示：本题为反向记分题，作答时仍按你此时此刻的实际感受选择相应程度。
                </p>
              ) : (
                <p className="mt-3 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500 }}>
                  提示：本题为正向记分题，作答时请按你此时此刻的实际感受选择相应程度。
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

function NoticeDialog({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        className="w-full max-w-md rounded-3xl p-6"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <ClipboardList size={16} className="text-white" />
            </div>
            <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1rem' }}>提示</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors">
            <X size={18} className="text-emerald-600" />
          </button>
        </div>
        <p className="text-sm text-emerald-900 leading-7" style={{ ...cuteTextStyle, fontWeight: 500 }}>
          {message}
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-2xl text-white transition-all"
          style={{ ...cuteTextStyle, fontWeight: 600, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
        >
          我知道了
        </button>
      </motion.div>
    </motion.div>
  );
}

function PilotFeedbackQuestionnaire({
  onSubmit,
  onClose,
}: {
  onSubmit: (result: PilotFeedbackResult) => void;
  onClose?: () => void;
}) {
  const [agreementAnswers, setAgreementAnswers] = useState<number[]>(Array(7).fill(0));
  const [mostHelpfulPart, setMostHelpfulPart] = useState('');
  const [needsImprovement, setNeedsImprovement] = useState('');
  const [preferredReward, setPreferredReward] = useState('');
  const [comboRewardScore, setComboRewardScore] = useState<number | null>(null);

  const allAnswered =
    agreementAnswers.every((answer) => answer > 0) &&
    mostHelpfulPart.trim() !== '' &&
    needsImprovement.trim() !== '' &&
    preferredReward.trim() !== '' &&
    comboRewardScore !== null;

  const handleAgreementSelect = (questionIndex: number, value: number) => {
    setAgreementAnswers((previous) => {
      const next = [...previous];
      next[questionIndex] = value;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!allAnswered || comboRewardScore === null) return;
    onSubmit({
      agreementAnswers: [...agreementAnswers],
      mostHelpfulPart: mostHelpfulPart.trim(),
      needsImprovement: needsImprovement.trim(),
      preferredReward: preferredReward.trim(),
      comboRewardScore,
      timestamp: new Date(),
    });
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
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl relative"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.96))', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <ClipboardList size={16} className="text-white" />
              </div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>体验反馈</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors">
                <X size={18} className="text-emerald-600" />
              </button>
            )}
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(5, 150, 105, 0.08)' }}>
            <p className="text-xs text-emerald-800" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              感谢你完成刚才的对话。下面这些问题主要想了解你对这次聊天体验的真实感受，以及哪些地方还能继续优化。
              请按照刚才的实际体验作答，没有标准答案，按第一感觉填写就可以。
            </p>
            <p className="mt-2 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              评分方式：1 = 非常不同意，2 = 不同意，3 = 一般，4 = 同意，5 = 非常同意。
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {pilotFeedbackStatements.map((statement, questionIndex) => (
            <motion.div
              key={statement}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: questionIndex * 0.03 }}
              className="rounded-2xl p-4"
              style={{
                background: agreementAnswers[questionIndex] > 0 ? 'rgba(5, 150, 105, 0.06)' : 'rgba(255,255,255,0.82)',
                border: `1.5px solid ${agreementAnswers[questionIndex] > 0 ? 'rgba(5, 150, 105, 0.2)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {questionIndex + 1}
                </span>
                {statement}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {pilotFeedbackAgreementOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAgreementSelect(questionIndex, option.value)}
                    className="py-2 px-2 rounded-xl text-xs transition-all"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: agreementAnswers[questionIndex] === option.value ? 600 : 400,
                      background: agreementAnswers[questionIndex] === option.value ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.9)',
                      color: agreementAnswers[questionIndex] === option.value ? 'white' : '#065f46',
                      border: `1.5px solid ${agreementAnswers[questionIndex] === option.value ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                      boxShadow: agreementAnswers[questionIndex] === option.value ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{option.value}</div>
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
            <label className="block text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                8
              </span>
              这次体验中，你觉得最有帮助的部分是什么？
            </label>
            <textarea
              value={mostHelpfulPart}
              onChange={(event) => setMostHelpfulPart(event.target.value)}
              placeholder="可以写一写哪一句话、哪个部分、哪种感觉最让你觉得有帮助。"
              className="w-full min-h-[110px] rounded-2xl px-4 py-3 text-sm text-emerald-950 placeholder-emerald-400 focus:outline-none resize-y"
              style={{ ...cuteTextStyle, border: '1.5px solid rgba(5,150,105,0.15)', background: 'rgba(255,255,255,0.95)' }}
            />
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
            <label className="block text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                9
              </span>
              这次体验中，你觉得最需要改进的部分是什么？
            </label>
            <textarea
              value={needsImprovement}
              onChange={(event) => setNeedsImprovement(event.target.value)}
              placeholder="可以写一写哪些地方让你觉得不顺、别扭，或者还不够贴合。"
              className="w-full min-h-[110px] rounded-2xl px-4 py-3 text-sm text-emerald-950 placeholder-emerald-400 focus:outline-none resize-y"
              style={{ ...cuteTextStyle, border: '1.5px solid rgba(5,150,105,0.15)', background: 'rgba(255,255,255,0.95)' }}
            />
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
            <label className="block text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                10
              </span>
              如果以后参加类似活动，你更希望获得哪种感谢方式或奖品？
            </label>
            <textarea
              value={preferredReward}
              onChange={(event) => setPreferredReward(event.target.value)}
              placeholder="可以写你更偏好的感谢方式，或者你觉得更合适的奖品形式。"
              className="w-full min-h-[96px] rounded-2xl px-4 py-3 text-sm text-emerald-950 placeholder-emerald-400 focus:outline-none resize-y"
              style={{ ...cuteTextStyle, border: '1.5px solid rgba(5,150,105,0.15)', background: 'rgba(255,255,255,0.95)' }}
            />
            <div className="mt-4">
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
                如果是“多肉盆栽+卡套+随身笔记本+挂件”的组合，你会打几分？（满分 10 分）
              </p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                  <button
                    key={score}
                    onClick={() => setComboRewardScore(score)}
                    className="py-2 px-1 rounded-xl text-xs transition-all"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: comboRewardScore === score ? 600 : 400,
                      background: comboRewardScore === score ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.9)',
                      color: comboRewardScore === score ? 'white' : '#065f46',
                      border: `1.5px solid ${comboRewardScore === score ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                      boxShadow: comboRewardScore === score ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                    }}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
              boxShadow: allAnswered ? '0 10px 30px rgba(5, 150, 105, 0.35)' : 'none',
            }}
          >
            {allAnswered
              ? '提交反馈'
              : `请完成所有题目（${agreementAnswers.filter((answer) => answer > 0).length + (mostHelpfulPart.trim() ? 1 : 0) + (needsImprovement.trim() ? 1 : 0) + (preferredReward.trim() ? 1 : 0) + (comboRewardScore !== null ? 1 : 0)}/10）`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PANASQuestionnaire({ onSubmit, onClose }: { onSubmit: (result: PANASResult) => void; onClose?: () => void }) {
  const [answers, setAnswers] = useState<number[]>(Array(20).fill(0));
  const allAnswered = answers.every((answer) => answer > 0);

  const handleSelect = (questionIndex: number, value: number) => {
    setAnswers((previous) => {
      const next = [...previous];
      next[questionIndex] = value;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit({ answers: [...answers], timestamp: new Date() });
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
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl relative"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.96))', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <ClipboardList size={16} className="text-white" />
              </div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>情绪感受回顾</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors">
                <X size={18} className="text-emerald-600" />
              </button>
            )}
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(5, 150, 105, 0.08)' }}>
            <p className="text-xs text-emerald-800" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              请根据您<span style={{ color: '#059669', fontWeight: 700 }}>过去一周</span>的真实感受，对下面每个词语选择最符合的程度。
              请尽量按照第一感觉作答，不需要反复比较，也不需要刻意追求“正确答案”。
            </p>
            <p className="mt-2 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              评分方式：1 = 几乎没有，2 = 比较少，3 = 中等，4 = 比较多，5 = 极其多。
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {panasQuestions.map((question, questionIndex) => (
            <motion.div
              key={question}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: questionIndex * 0.03 }}
              className="rounded-2xl p-4"
              style={{
                background: answers[questionIndex] > 0 ? 'rgba(5, 150, 105, 0.06)' : 'rgba(255,255,255,0.82)',
                border: `1.5px solid ${answers[questionIndex] > 0 ? 'rgba(5, 150, 105, 0.2)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {questionIndex + 1}
                </span>
                {question}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {panasOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(questionIndex, option.value)}
                    className="py-2 px-1 rounded-xl text-xs transition-all"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: answers[questionIndex] === option.value ? 600 : 400,
                      background: answers[questionIndex] === option.value ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.9)',
                      color: answers[questionIndex] === option.value ? 'white' : '#065f46',
                      border: `1.5px solid ${answers[questionIndex] === option.value ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                      boxShadow: answers[questionIndex] === option.value ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{option.value}</div>
                    {option.label}
                  </button>
                ))}
              </div>
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
              boxShadow: allAnswered ? '0 10px 30px rgba(5, 150, 105, 0.35)' : 'none',
            }}
          >
            {allAnswered ? '提交回顾' : `请完成所有题目（${answers.filter((answer) => answer > 0).length}/20）`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GAD7Questionnaire({ onSubmit, onClose }: { onSubmit: (result: GAD7Result) => void; onClose?: () => void }) {
  const [answers, setAnswers] = useState<number[]>(Array(7).fill(-1));
  const allAnswered = answers.every((answer) => answer >= 0);

  const handleSelect = (questionIndex: number, value: number) => {
    setAnswers((previous) => {
      const next = [...previous];
      next[questionIndex] = value;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit({ answers: [...answers], timestamp: new Date() });
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
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl relative"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.96))', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <ClipboardList size={16} className="text-white" />
              </div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>焦虑感受回顾</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors">
                <X size={18} className="text-emerald-600" />
              </button>
            )}
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(5, 150, 105, 0.08)' }}>
            <p className="text-xs text-emerald-800" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              请回想您在<span style={{ color: '#059669', fontWeight: 700 }}>过去两周</span>内的真实状态，看看下面这些情况出现了多少次。
              请尽量按照第一感觉作答，不需要刻意寻找“标准答案”。
            </p>
            <p className="mt-2 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              评分方式：0 = 完全没有，1 = 几天，2 = 一半以上天数，3 = 几乎每天。
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {gad7Questions.map((question, questionIndex) => (
            <motion.div
              key={question}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: questionIndex * 0.03 }}
              className="rounded-2xl p-4"
              style={{
                background: answers[questionIndex] >= 0 ? 'rgba(5, 150, 105, 0.06)' : 'rgba(255,255,255,0.82)',
                border: `1.5px solid ${answers[questionIndex] >= 0 ? 'rgba(5, 150, 105, 0.2)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {questionIndex + 1}
                </span>
                {question}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {gad7Options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(questionIndex, option.value)}
                    className="py-2 px-2 rounded-xl text-xs transition-all"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: answers[questionIndex] === option.value ? 600 : 400,
                      background: answers[questionIndex] === option.value ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.9)',
                      color: answers[questionIndex] === option.value ? 'white' : '#065f46',
                      border: `1.5px solid ${answers[questionIndex] === option.value ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                      boxShadow: answers[questionIndex] === option.value ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{option.value}</div>
                    {option.label}
                  </button>
                ))}
              </div>
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
              boxShadow: allAnswered ? '0 10px 30px rgba(5, 150, 105, 0.35)' : 'none',
            }}
          >
            {allAnswered ? '提交回顾' : `请完成所有题目（${answers.filter((answer) => answer >= 0).length}/7）`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EventChecklistQuestionnaire({ onSubmit, onClose }: { onSubmit: (result: EventChecklistResult) => void; onClose?: () => void }) {
  const [eventNature, setEventNature] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [emotionImpact, setEmotionImpact] = useState<number | null>(null);
  const [questionnaireImpact, setQuestionnaireImpact] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  const needsCategorySelection = eventNature > 1;
  const allAnswered =
    eventNature > 0 &&
    (!needsCategorySelection || categories.length > 0) &&
    emotionImpact !== null &&
    questionnaireImpact !== null;

  const toggleCategory = (category: string) => {
    setCategories((previous) =>
      previous.includes(category)
        ? previous.filter((item) => item !== category)
        : [...previous, category],
    );
  };

  const handleSubmit = () => {
    if (!allAnswered || emotionImpact === null || questionnaireImpact === null) return;
    onSubmit({
      eventNature,
      categories,
      emotionImpact,
      questionnaireImpact,
      description: description.trim(),
      timestamp: new Date(),
    });
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
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl relative"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, #f0fdf4, rgba(240,253,244,0.96))', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <ClipboardList size={16} className="text-white" />
              </div>
              <h2 className="text-emerald-900" style={{ ...cuteTextStyle, fontWeight: 700, fontSize: '1.1rem' }}>近期事件回顾</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors">
                <X size={18} className="text-emerald-600" />
              </button>
            )}
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(5, 150, 105, 0.08)' }}>
            <p className="text-xs text-emerald-800" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              请回顾从第一次填写会话前问答到现在这段时间里，生活中是否出现过对您情绪波动比较明显的事情。
              这部分没有对错之分，只需要按照真实经历作答即可。
            </p>
            <p className="mt-2 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500, lineHeight: 1.7 }}>
              如果一时想不全，也没有关系，只填写你认为影响最明显的内容就可以。
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>1</span>
              自第一次填写问答以来，您是否经历了对情绪影响明显的事件？
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eventNatureOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setEventNature(option.value);
                    if (option.value === 1) {
                      setCategories([]);
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl text-sm text-left transition-all"
                  style={{
                    ...cuteTextStyle,
                    fontWeight: eventNature === option.value ? 600 : 400,
                    background: eventNature === option.value ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.95)',
                    color: eventNature === option.value ? 'white' : '#065f46',
                    border: `1.5px solid ${eventNature === option.value ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                  }}
                >
                  {option.value}. {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>2</span>
              如果有，这件事主要属于哪一类？（可多选）
            </p>
            {!needsCategorySelection && (
              <p className="mb-3 text-xs text-emerald-700/80" style={{ ...cuteTextStyle, fontWeight: 500 }}>
                如果你选择了“没有”，这一题可以跳过。
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eventCategoryOptions.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  disabled={!needsCategorySelection}
                  className="py-2.5 px-3 rounded-xl text-sm text-left transition-all"
                  style={{
                    ...cuteTextStyle,
                    fontWeight: categories.includes(category) ? 600 : 400,
                    background: !needsCategorySelection
                      ? 'rgba(240,253,244,0.9)'
                      : categories.includes(category)
                        ? 'linear-gradient(135deg, #059669, #10b981)'
                        : 'rgba(255,255,255,0.95)',
                    color: !needsCategorySelection ? '#6b7280' : categories.includes(category) ? 'white' : '#065f46',
                    border: `1.5px solid ${categories.includes(category) ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                    opacity: !needsCategorySelection ? 0.7 : 1,
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {[
            {
              title: '3. 你认为这件事对你近期情绪状态的影响程度有多大？',
              value: emotionImpact,
              setter: setEmotionImpact,
            },
            {
              title: '4. 你认为这件事对你本次填写内容的影响程度有多大？',
              value: questionnaireImpact,
              setter: setQuestionnaireImpact,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
              <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
                {item.title}
              </p>
              <p className="text-xs text-emerald-700/80 mb-3" style={{ ...cuteTextStyle, fontWeight: 500 }}>
                0 = 完全没有影响，10 = 影响非常大
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                {Array.from({ length: 11 }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => item.setter(index)}
                    className="py-2 px-1 rounded-xl text-xs transition-all"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: item.value === index ? 600 : 400,
                      background: item.value === index ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.95)',
                      color: item.value === index ? 'white' : '#065f46',
                      border: `1.5px solid ${item.value === index ? 'transparent' : 'rgba(5,150,105,0.15)'}`,
                    }}
                  >
                    {index}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(0,0,0,0.06)' }}>
            <p className="text-sm text-emerald-900 mb-3" style={{ ...cuteTextStyle, fontWeight: 600 }}>
              5. 如愿意，请简要描述最影响你情绪的一件事，以及它大约持续了多久。
            </p>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="例如：最近因为论文和实习同时推进，连续两周都觉得很紧绷。"
              className="w-full min-h-28 rounded-2xl p-4 text-sm text-emerald-950 placeholder-emerald-400 focus:outline-none resize-y"
              style={{ ...cuteTextStyle, fontWeight: 400, background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(5,150,105,0.15)' }}
            />
          </div>

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
              boxShadow: allAnswered ? '0 10px 30px rgba(5, 150, 105, 0.35)' : 'none',
            }}
          >
            {allAnswered ? '提交回顾' : '请先完成前四题'}
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

function ReturnDivider({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-6"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(5,150,105,0.28))' }} />
          <div
            className="px-3 py-1 rounded-full text-[11px] text-emerald-700"
            style={{
              ...cuteTextStyle,
              fontWeight: 600,
              background: 'rgba(5,150,105,0.08)',
              border: '1px solid rgba(5,150,105,0.12)',
            }}
          >
            继续上次对话
          </div>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(5,150,105,0.28))' }} />
        </div>
        <div
          className="rounded-2xl px-5 py-4 text-sm text-emerald-900"
          style={{
            ...cuteTextStyle,
            fontWeight: 500,
            lineHeight: 1.8,
            background: 'rgba(255,255,255,0.86)',
            border: '1px solid rgba(5,150,105,0.12)',
            boxShadow: '0 10px 24px rgba(5,150,105,0.08)',
          }}
        >
          {text}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== Chat Interface ====================
function ChatInterface({
  account,
  onLogout,
}: {
  account: UserAccount;
  onLogout: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [exitStep, setExitStep] = useState<'idle' | 'pilot-feedback' | 'panas' | 'gad7' | 'events'>('idle');
  const [showPostSTAI, setShowPostSTAI] = useState(false);
  const [preSessionDone, setPreSessionDone] = useState(false);
  const [showConsent, setShowConsent] = useState(account.isPilot);
  const [showPilotBasicInfo, setShowPilotBasicInfo] = useState(false);
  const [showPreSTAI, setShowPreSTAI] = useState(!account.isPilot);
  const [snapshot, setSnapshot] = useState<TraceSession | null>(null);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [errorText, setErrorText] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [returnDividerAfterId, setReturnDividerAfterId] = useState<string | null>(null);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.length > 0 || returnDividerAfterId ? messages : [welcomeMessage, ...messages];

  const persistAccountEvent = async (
    eventType: 'consent' | 'pilot-basic-info' | 'stai' | 'panas' | 'gad-7' | 'event-checklist' | 'pilot-feedback',
    payload: unknown,
  ) => {
    const response = await fetch('/api/account-record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: account.username,
        isPilot: account.isPilot,
        sessionId,
        eventType,
        payload,
      }),
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(failure?.error || '账号记录保存失败，请稍后重试。');
    }
  };

  const showSaveError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    setNoticeMessage(message);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const storedCount = window.localStorage.getItem(`${COMPLETED_SESSIONS_KEY}:${account.username}`);
    const parsedCount = storedCount ? Number.parseInt(storedCount, 10) : 0;
    if (Number.isFinite(parsedCount) && parsedCount >= 0) {
      setCompletedSessionsCount(parsedCount);
    }
  }, [account.username]);

  useEffect(() => {
    let cancelled = false;

    const restoreLatestSession = async () => {
      try {
        const response = await fetch(
          `/api/account-record?username=${encodeURIComponent(account.username)}&isPilot=${String(account.isPilot)}`,
        );
        if (!response.ok) {
          throw new Error('账号历史读取失败。');
        }
        const payload = (await response.json()) as { record?: RestoredAccountRecord };
        if (cancelled) return;

        const sessions = payload.record?.sessions ?? [];
        if (sessions.length === 0) {
          setMessages([]);
          setSnapshot(null);
          setReturnDividerAfterId(null);
          setSessionId(crypto.randomUUID());
          return;
        }

        const latestSession = [...sessions].sort((left, right) => {
          const leftTime = new Date(left.chat?.updatedAt || left.savedAt || 0).getTime();
          const rightTime = new Date(right.chat?.updatedAt || right.savedAt || 0).getTime();
          return rightTime - leftTime;
        })[0];

        const restoredMessages = latestSession.chat.history.map((message) => ({
          id: message.id,
          text: message.content,
          sender: message.role === 'assistant' ? 'ai' : 'user',
          timestamp: new Date(message.createdAt),
        })) as Message[];

        setMessages(restoredMessages);
        setSnapshot(latestSession.chat);
        setReturnDividerAfterId(restoredMessages.at(-1)?.id ?? null);
        setSessionId(crypto.randomUUID());
      } catch (error) {
        if (!cancelled) {
          setMessages([]);
          setSnapshot(null);
          setReturnDividerAfterId(null);
          setSessionId(crypto.randomUUID());
          showSaveError(error, '账号历史读取失败，请稍后重试。');
        }
      }
    };

    void restoreLatestSession();

    return () => {
      cancelled = true;
    };
  }, [account.username, account.isPilot]);

  useEffect(() => {
    if (!isTimerRunning || timerStartedAt === null) {
      return;
    }

    const tick = () => {
      setTimerElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)));
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTimerRunning, timerStartedAt]);

  const formatElapsedTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const startSessionTimer = () => {
    const now = Date.now();
    setTimerStartedAt(now);
    setTimerElapsedSeconds(0);
    setIsTimerRunning(true);
  };

  const pauseSessionTimer = () => {
    if (timerStartedAt !== null) {
      setTimerElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)));
    }
    setIsTimerRunning(false);
  };

  const resumeSessionTimer = () => {
    const resumedStartedAt = Date.now() - timerElapsedSeconds * 1000;
    setTimerStartedAt(resumedStartedAt);
    setIsTimerRunning(true);
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = (text || inputValue).trim();
    if (messageText === '' || isTyping) return;
    const previousMessages = messages;
    const userMessage: Message = { id: crypto.randomUUID(), text: messageText, sender: 'user', timestamp: new Date() };
    const assistantPlaceholderId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantPlaceholderId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage, assistantPlaceholder]);
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
          username: account.username,
          isPilot: account.isPilot,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          session?: TraceSession;
        } | null;
        throw new Error(payload?.error || 'TRACE 暂时没有返回结果。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finishedSession: TraceSession | null = null;

      const applyAssistantChunk = (chunk: string) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantPlaceholderId
              ? { ...message, text: `${message.text}${chunk}` }
              : message,
          ),
        );
      };

      const replaceAssistantContent = (content: string) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantPlaceholderId
              ? { ...message, text: content }
              : message,
          ),
        );
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          const event = JSON.parse(trimmed) as ChatStreamEvent;

          if (event.type === 'chunk' && event.content) {
            applyAssistantChunk(event.content);
          }

          if (event.type === 'replace') {
            replaceAssistantContent(event.content || '');
          }

          if (event.type === 'done' && event.session) {
            finishedSession = event.session;
          }

          if (event.type === 'error') {
            throw new Error(event.error || 'TRACE 暂时没有返回结果。');
          }
        }
      }

      if (!finishedSession) {
        throw new Error('TRACE 暂时没有返回结果。');
      }

      setSnapshot(finishedSession);
      setMessages(
        finishedSession.history.map((message) => ({
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

  const finalizeLogout = () => {
    pauseSessionTimer();
    setShowPostSTAI(false);
    if (!account.isPilot) {
      const nextCount = completedSessionsCount + 1;
      setCompletedSessionsCount(nextCount);
      window.localStorage.setItem(`${COMPLETED_SESSIONS_KEY}:${account.username}`, String(nextCount));
    }
    setExitStep('idle');
    onLogout();
  };

  const handleLogoutClick = () => {
    pauseSessionTimer();
    setShowPostSTAI(true);
  };

  const handleExitFlowClose = () => {
    setShowPostSTAI(false);
    setExitStep('idle');
    if (preSessionDone) {
      resumeSessionTimer();
    }
  };

  const handlePostSTAISubmit = async (result: STAIResult) => {
    try {
      await persistAccountEvent('stai', result);
      setShowPostSTAI(false);
      if (account.isPilot) {
        setExitStep('pilot-feedback');
        return;
      }
      if (completedSessionsCount + 1 === TARGET_SESSIONS_FOR_FOLLOWUP) {
        setExitStep('panas');
        return;
      }
      finalizeLogout();
    } catch (error) {
      showSaveError(error, '会后 STAI-S-6 保存失败，请稍后重试。');
    }
  };

  const handlePreSTAISubmit = async (result: STAIResult) => {
    try {
      await persistAccountEvent('stai', result);
      setShowPreSTAI(false);
      setPreSessionDone(true);
      startSessionTimer();
      setNoticeMessage(SESSION_EFFECT_NOTICE);
    } catch (error) {
      showSaveError(error, '会前 STAI-S-6 保存失败，请稍后重试。');
    }
  };

  const handleConsentSubmit = async (result: ConsentResult) => {
    try {
      await persistAccountEvent('consent', result);
      setShowConsent(false);
      setShowPilotBasicInfo(true);
    } catch (error) {
      showSaveError(error, '知情同意书保存失败，请稍后重试。');
    }
  };

  const handlePilotBasicInfoSubmit = async (result: PilotBasicInfoResult) => {
    try {
      await persistAccountEvent('pilot-basic-info', result);
      setShowPilotBasicInfo(false);
      setShowPreSTAI(true);
    } catch (error) {
      showSaveError(error, '基本信息保存失败，请稍后重试。');
    }
  };

  const handlePANASSubmit = async (result: PANASResult) => {
    try {
      await persistAccountEvent('panas', result);
      setExitStep('gad7');
    } catch (error) {
      showSaveError(error, 'PANAS 保存失败，请稍后重试。');
    }
  };

  const handleGAD7Submit = async (result: GAD7Result) => {
    try {
      await persistAccountEvent('gad-7', result);
      setExitStep('events');
    } catch (error) {
      showSaveError(error, 'GAD-7 保存失败，请稍后重试。');
    }
  };

  const handlePilotFeedbackSubmit = async (result: PilotFeedbackResult) => {
    try {
      await persistAccountEvent('pilot-feedback', result);
      finalizeLogout();
    } catch (error) {
      showSaveError(error, '试测反馈保存失败，请稍后重试。');
    }
  };

  const handleEventChecklistSubmit = async (result: EventChecklistResult) => {
    try {
      await persistAccountEvent('event-checklist', result);
      finalizeLogout();
    } catch (error) {
      showSaveError(error, '事件核查表保存失败，请稍后重试。');
    }
  };

  const handleSTAIAccessClick = () => {
    setNoticeMessage('抱歉你只有在离开此次会话后需要填写该量表。');
  };

  const handleFollowupScaleAccessClick = () => {
    setNoticeMessage('抱歉您只有在第三次会话结束后需要填写这个问卷。');
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #f0fdf4 0%, #dcfce7 100%)' }} />

      {/* Pre-session STAI */}
      <AnimatePresence>
        {showConsent && (
          <PilotConsentDialog onSubmit={handleConsentSubmit} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPilotBasicInfo && (
          <PilotBasicInfoDialog onSubmit={handlePilotBasicInfoSubmit} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreSTAI && <STAIQuestionnaire type="pre" onSubmit={handlePreSTAISubmit} />}
      </AnimatePresence>

      {/* Post-session STAI (on logout) */}
      <AnimatePresence>
        {showPostSTAI && (
          <STAIQuestionnaire
            type="post"
            onSubmit={handlePostSTAISubmit}
            onClose={handleExitFlowClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exitStep === 'pilot-feedback' && (
          <PilotFeedbackQuestionnaire
            onSubmit={handlePilotFeedbackSubmit}
            onClose={handleExitFlowClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exitStep === 'panas' && (
          <PANASQuestionnaire
            onSubmit={handlePANASSubmit}
            onClose={handleExitFlowClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exitStep === 'gad7' && (
          <GAD7Questionnaire
            onSubmit={handleGAD7Submit}
            onClose={handleExitFlowClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exitStep === 'events' && (
          <EventChecklistQuestionnaire
            onSubmit={handleEventChecklistSubmit}
            onClose={handleExitFlowClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {noticeMessage && <NoticeDialog message={noticeMessage} onClose={() => setNoticeMessage('')} />}
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
                {preSessionDone && (
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-[11px] text-emerald-800"
                    style={{
                      ...cuteTextStyle,
                      fontWeight: 600,
                      background: 'rgba(5,150,105,0.1)',
                      border: '1px solid rgba(5,150,105,0.16)',
                    }}
                  >
                    会话计时 {formatElapsedTime(timerElapsedSeconds)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSTAIAccessClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-emerald-700 transition-all"
              style={{ ...cuteTextStyle, fontWeight: 500, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}
            >
              <ClipboardList size={14} />
              <span>STAI-S-6</span>
            </motion.button>
            {!account.isPilot && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFollowupScaleAccessClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-emerald-700 transition-all"
                  style={{ ...cuteTextStyle, fontWeight: 500, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}
                >
                  <ClipboardList size={14} />
                  <span>PANAS</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFollowupScaleAccessClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-emerald-700 transition-all"
                  style={{ ...cuteTextStyle, fontWeight: 500, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}
                >
                  <ClipboardList size={14} />
                  <span>GAD-7</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFollowupScaleAccessClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-emerald-700 transition-all"
                  style={{ ...cuteTextStyle, fontWeight: 500, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}
                >
                  <ClipboardList size={14} />
                  <span>事件核查表</span>
                </motion.button>
              </>
            )}
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
          {!account.isPilot && (
            <p className="mt-1 text-xs text-emerald-700/80 text-center" style={{ ...cuteTextStyle, fontWeight: 400 }}>
              📋 PANAS、GAD-7 与事件核查表会在<span style={{ fontWeight: 600 }}>第三次会话结束并点击离开后</span>自动出现
              <span className="ml-2 text-emerald-600" style={{ fontWeight: 600 }}>已完成会话：{completedSessionsCount}</span>
            </p>
          )}
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-3xl mx-auto py-6">
            {visibleMessages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ChatBubble message={message} index={index} />
                {returnDividerAfterId === message.id && <ReturnDivider text={RETURNING_PROMPT} />}
              </React.Fragment>
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
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full">
            <LoginScreen onLogin={(account) => {
              setActiveAccount(account);
              setIsLoggedIn(true);
            }} />
          </motion.div>
        ) : (
          <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="w-full h-full">
            {activeAccount && (
              <ChatInterface
                account={activeAccount}
                onLogout={() => {
                  setIsLoggedIn(false);
                  setActiveAccount(null);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
