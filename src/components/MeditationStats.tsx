import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { JournalEntry, MeditationSession } from '../types';
import { soundscapeAudio } from '../services/soundscapeAudio';
import {
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  BookOpen,
  Play,
  Check,
  Award,
  Bell,
  Plus,
  Heart,
  X,
  Volume2,
  Cloud,
} from 'lucide-react';

interface MeditationStatsProps {
  entries: JournalEntry[];
  sessions: MeditationSession[];
  onPlaySession: (session: MeditationSession) => void;
  onAddEntry?: (entry: JournalEntry) => void;
  user?: User | null;
  onLogin?: () => void;
}

// Format local calendar date key 'YYYY-MM-DD'
function toLocalDateKey(d: Date | string): string {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Milestone tier definitions
interface MilestoneInfo {
  tierName: string;
  nextTarget: number;
  badge: string;
  quote: string;
}

function getMilestoneInfo(streak: number): MilestoneInfo {
  if (streak === 0) {
    return {
      tierName: 'Sacred Beginning',
      nextTarget: 1,
      badge: '🌱',
      quote: 'The journey of inner peace begins with a single conscious breath.',
    };
  }
  if (streak < 3) {
    return {
      tierName: 'Spark of Stillness',
      nextTarget: 3,
      badge: '✨',
      quote: 'Consistency is the gentle rhythm of a grounded mind.',
    };
  }
  if (streak < 7) {
    return {
      tierName: 'Radiant Momentum',
      nextTarget: 7,
      badge: '🔥',
      quote: 'Your nervous system is remembering its natural state of deep calm.',
    };
  }
  if (streak < 14) {
    return {
      tierName: 'Weekly Harmony',
      nextTarget: 14,
      badge: '🌟',
      quote: 'Seven days of sacred presence have anchored lasting emotional resilience.',
    };
  }
  if (streak < 30) {
    return {
      tierName: 'Fortnight of Inner Peace',
      nextTarget: 30,
      badge: '💎',
      quote: 'Mindfulness has blossomed into an effortless daily sanctuary.',
    };
  }
  return {
    tierName: 'Zen Sanctuary Luminary',
    nextTarget: streak + 10,
    badge: '🧘',
    quote: 'You dwell in unbroken stillness, radiating peace and equanimity to all.',
  };
}

export const MeditationStats: React.FC<MeditationStatsProps> = ({
  entries,
  sessions,
  onPlaySession,
  onAddEntry,
  user,
  onLogin,
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // Quick manual log state
  const [logTitle, setLogTitle] = useState('Mindful Breath Practice');
  const [logDuration, setLogDuration] = useState(5);
  const [logStressBefore, setLogStressBefore] = useState(6);
  const [logCalmnessAfter, setLogCalmnessAfter] = useState(9);
  const [logNotes, setLogNotes] = useState('');

  // Floating celebration particles
  const [particles, setParticles] = useState<
    Array<{ id: number; left: number; top: number; delay: number; size: number; char: string }>
  >([]);

  // 1. Calculate overall session metrics
  const totalMinutes = useMemo(
    () => entries.reduce((acc, curr) => acc + curr.durationMinutes, 0),
    [entries]
  );
  const totalSessions = entries.length;

  const averageCalmnessDelta = useMemo(() => {
    if (entries.length === 0) return '+3.5';
    const sum = entries.reduce((acc, curr) => acc + (curr.calmnessAfter - curr.stressBefore), 0);
    const avg = sum / entries.length;
    return avg > 0 ? `+${avg.toFixed(1)}` : avg.toFixed(1);
  }, [entries]);

  // 2. Accurate Consecutive Daily Streak Calculation
  const { currentStreak, longestStreak, todayCompleted, last7Days } = useMemo(() => {
    const completedDays = new Set<string>();
    const dayEntryCount: Record<string, number> = {};

    entries.forEach((entry) => {
      const key = toLocalDateKey(entry.date);
      completedDays.add(key);
      dayEntryCount[key] = (dayEntryCount[key] || 0) + 1;
    });

    const now = new Date();
    const todayKey = toLocalDateKey(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterday);

    const isTodayDone = completedDays.has(todayKey);
    const isYesterdayDone = completedDays.has(yesterdayKey);

    let streak = 0;
    if (isTodayDone) {
      // User meditated today: walk back from today
      const check = new Date(now);
      while (completedDays.has(toLocalDateKey(check))) {
        streak++;
        check.setDate(check.getDate() - 1);
      }
    } else if (isYesterdayDone) {
      // User meditated yesterday: streak is alive waiting for today's practice
      const check = new Date(yesterday);
      while (completedDays.has(toLocalDateKey(check))) {
        streak++;
        check.setDate(check.getDate() - 1);
      }
    }

    // Longest contiguous streak ever in journal
    const sortedDays = Array.from(completedDays).sort();
    let maxStreak = 0;
    let tempStreak = 0;
    let prevTime: number | null = null;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    for (const dayStr of sortedDays) {
      const [y, m, d] = dayStr.split('-').map(Number);
      const curTime = new Date(y, m - 1, d).getTime();
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((curTime - prevTime) / ONE_DAY_MS);
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTime = curTime;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }

    // Last 7 days ribbon (6 days ago through today)
    const ribbon: Array<{
      key: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
      isCompleted: boolean;
      count: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayNum = d.getDate();
      ribbon.push({
        key,
        dayName,
        dayNum,
        isToday: i === 0,
        isCompleted: completedDays.has(key),
        count: dayEntryCount[key] || 0,
      });
    }

    return {
      currentStreak: streak,
      longestStreak: Math.max(maxStreak, streak),
      todayCompleted: isTodayDone,
      last7Days: ribbon,
    };
  }, [entries]);

  const milestone = getMilestoneInfo(currentStreak);

  // Trigger celebration effect with golden sparkles and chime
  const triggerCelebration = (customMsg?: string) => {
    soundscapeAudio.playChime(528);
    setShowCelebration(true);
    setCelebrationMessage(
      customMsg ||
        (todayCompleted
          ? `Harmonious Streak of ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}! Your dedication radiates peace.`
          : `Streak preserved at ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}! Complete a session today to reach ${currentStreak + 1}.`)
    );

    // Spawn 24 shimmering celebration particles
    const sparks = ['✨', '🌟', '🔥', '🌸', '✦', '⭐'];
    const newParticles = Array.from({ length: 24 }).map((_, i) => ({
      id: Date.now() + i,
      left: 10 + Math.random() * 80,
      top: 20 + Math.random() * 60,
      delay: Math.random() * 0.8,
      size: 14 + Math.random() * 16,
      char: sparks[Math.floor(Math.random() * sparks.length)],
    }));
    setParticles(newParticles);

    setTimeout(() => {
      setShowCelebration(false);
    }, 4500);
  };

  // Auto-celebrate on entry addition or if today completed
  useEffect(() => {
    if (todayCompleted && currentStreak > 0) {
      const timer = setTimeout(() => {
        triggerCelebration();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [todayCompleted, currentStreak]);

  // Handle saving a manual mindful reflection/practice
  const handleSaveManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddEntry) return;

    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      sessionId: 'quick-practice',
      sessionTitle: logTitle || 'Mindful Sanctuary Practice',
      date: new Date().toISOString(),
      durationMinutes: logDuration,
      stressBefore: logStressBefore,
      calmnessAfter: logCalmnessAfter,
      notes: logNotes || 'Conscious mindful breathing practice.',
    };

    onAddEntry(newEntry);
    setShowLogModal(false);
    setLogNotes('');
    triggerCelebration(`Mindful practice logged! Streak extended to ${currentStreak + (todayCompleted ? 0 : 1)} days.`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-fade-in space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium mb-2">
            <BookOpen size={13} />
            <span>Mindful Journey & Daily Streaks</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif-zen font-medium text-white tracking-wide">
            Your Sanctuary Progress & Daily Habit
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Every day you return to your breath strengthens the neural pathways of calmness, equanimity, and presence.
          </p>
        </div>

        {onAddEntry && (
          <button
            onClick={() => setShowLogModal(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition shadow-sm hover:border-emerald-500/50 cursor-pointer"
          >
            <Plus size={14} />
            <span>Log Practice</span>
          </button>
        )}
      </div>

      {/* Google Cloud Account Sync Banner */}
      {user ? (
        <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md text-xs shadow-md">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-emerald-400/60"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{user.displayName || 'Mindful Seeker'}</span>
                <span className="text-emerald-300 font-mono text-[11px]">({user.email})</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All journal reflections & consecutive day streaks are permanently saved to your Google Account.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <Cloud size={14} />
            <span>Cloud Synced</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-md text-xs shadow-md">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <Sparkles size={14} className="text-amber-400" />
              <span>Save & Sync Your Journal to Google Account</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Sign in with your Google Account to automatically backup your reflections, mood transformations, and daily streak progress.
            </p>
          </div>
          {onLogin && (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium border border-white/15 transition shrink-0 cursor-pointer shadow-sm hover:border-emerald-500/50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      )}

      {/* Hero Daily Streak Showcase with Celebratory Effect */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-2xl p-6 md:p-8 backdrop-blur-xl">
        {/* Ambient golden glow rings */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/0 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Celebratory floating particles */}
        {showCelebration &&
          particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none animate-particle-rise select-none"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                animationDelay: `${p.delay}s`,
                fontSize: `${p.size}px`,
                filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.9))',
              }}
            >
              {p.char}
            </div>
          ))}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Column: Streak Flame & Number */}
          <div className="flex items-center gap-5">
            {/* Glowing flame container */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-amber-950/40 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
                {/* Pulsing halo */}
                <div className="absolute inset-0 rounded-3xl border border-amber-400/50 animate-halo-expand pointer-events-none" />
                <Flame
                  size={46}
                  className={`${
                    currentStreak > 0
                      ? 'text-amber-400 animate-flame-pulse'
                      : 'text-slate-600'
                  }`}
                />
              </div>

              {/* Day badge at bottom of flame */}
              <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-amber-400/40 text-[10px] font-mono text-amber-300 font-semibold shadow-md">
                  {milestone.badge} {milestone.tierName}
                </span>
              </div>
            </div>

            {/* Streak Number & Status Description */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
                  {currentStreak}
                </span>
                <span className="text-base md:text-lg font-serif-zen text-slate-300">
                  {currentStreak === 1 ? 'Day Consecutive' : 'Days Consecutive'}
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 pt-0.5">
                {todayCompleted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Check size={14} className="text-emerald-400" />
                    <span>Practiced today • Streak extended!</span>
                  </span>
                ) : currentStreak > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-300/90 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Streak preserved from yesterday • Practice today to reach {currentStreak + 1} days!</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Complete your first meditation session today to ignite your streak.
                  </span>
                )}
              </div>

              {longestStreak > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                  <Award size={12} className="text-amber-400/80" />
                  <span>Personal Best: <strong className="text-slate-200 font-mono">{longestStreak} days</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Milestone progress & Celebration Action */}
          <div className="flex flex-col sm:items-end justify-between gap-3 pt-2 md:pt-0">
            {/* Interactive Celebration Trigger Button */}
            <button
              onClick={() => triggerCelebration()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-amber-500/20 hover:from-amber-500/35 hover:to-orange-500/35 text-amber-200 text-xs font-medium border border-amber-400/40 transition shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
              title="Ring 528Hz bell chime and celebrate your mindfulness dedication"
            >
              <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Celebrate Streak</span>
              <Volume2 size={13} className="text-amber-400/70" />
            </button>

            {/* Milestone Target & Progress Bar */}
            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Next Sanctuary Tier</span>
                <span className="text-amber-300 font-mono font-medium">
                  {currentStreak} / {milestone.nextTarget} days
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, Math.round((currentStreak / milestone.nextTarget) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] font-serif-zen italic text-slate-400 text-right">
                "{milestone.quote}"
              </p>
            </div>
          </div>
        </div>

        {/* Celebration Toast Banner when active */}
        {showCelebration && (
          <div className="mt-5 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/50 backdrop-blur-md text-center text-xs text-amber-200 animate-fade-in shadow-xl flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="font-medium">{celebrationMessage}</span>
          </div>
        )}

        {/* 7-Day Visual Streak Timeline Ribbon */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Past 7 Days Practice Rhythm</span>
            <span>
              {last7Days.filter((d) => d.isCompleted).length} of 7 days active
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {last7Days.map((day) => (
              <div
                key={day.key}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                  day.isCompleted
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-200 shadow-md shadow-amber-500/10'
                    : day.isToday
                    ? 'bg-slate-800/60 border-dashed border-amber-400/50 text-slate-300'
                    : 'bg-slate-900/40 border-white/5 text-slate-500'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  {day.dayName}
                </span>

                <div className="my-1.5 flex items-center justify-center">
                  {day.isCompleted ? (
                    <div className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/40">
                      <Flame size={14} className="animate-flame-pulse" />
                    </div>
                  ) : day.isToday ? (
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <Clock size={13} className="text-amber-300/80 animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                      <span className="text-[11px] font-mono">•</span>
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-mono">
                  {day.isToday ? 'Today' : day.dayNum}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Mindful Time */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3">
            <Clock size={18} />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {totalMinutes}
            <span className="text-xs text-slate-400 font-sans ml-1">mins</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Mindful Practice Time</div>
        </div>

        {/* Sessions Completed */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-3">
            <Sparkles size={18} />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {totalSessions}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Sessions Completed</div>
        </div>

        {/* Current Day Streak */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-md bg-gradient-to-b from-amber-500/5 to-transparent">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3">
            <Flame size={18} />
          </div>
          <div className="text-2xl font-semibold text-amber-300 font-mono">
            {currentStreak}
            <span className="text-xs text-amber-400/80 font-sans ml-1">days</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Active Mindful Streak</div>
        </div>

        {/* Calmness Shift */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3">
            <TrendingUp size={18} />
          </div>
          <div className="text-2xl font-semibold text-white font-mono">
            {Number(averageCalmnessDelta) > 0 ? `+${averageCalmnessDelta}` : averageCalmnessDelta}
            <span className="text-xs text-slate-400 font-sans ml-1">pts</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Avg Calmness Boost</div>
        </div>
      </div>

      {/* Reflections Journal List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif-zen font-medium text-white flex items-center gap-2">
            <span>Recent Practice Reflections</span>
            <span className="text-xs font-sans text-slate-500">({entries.length})</span>
          </h3>

          {onAddEntry && (
            <button
              onClick={() => setShowLogModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Add Reflection</span>
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 text-sm">
            <BookOpen size={28} className="mx-auto mb-2 text-slate-600" />
            <p>No reflections recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete any guided session or tap "Log Practice" above to start your mindful streak!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const matchedSession = sessions.find((s) => s.id === entry.sessionId);
              return (
                <div
                  key={entry.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md hover:border-emerald-500/30 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {entry.sessionTitle}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Duration: {entry.durationMinutes} min</span>
                      <span>
                        Stress Before:{' '}
                        <span className="text-amber-400">{entry.stressBefore}/10</span>
                      </span>
                      <span>
                        Calmness After:{' '}
                        <span className="text-emerald-400">{entry.calmnessAfter}/10</span>
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-xs font-serif-zen italic text-slate-300 pt-1">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>

                  {matchedSession && (
                    <button
                      onClick={() => onPlaySession(matchedSession)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium border border-slate-700 transition shrink-0"
                    >
                      <Play size={13} />
                      <span>Re-enter Session</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Practice Logger Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif-zen font-medium text-white flex items-center gap-2">
                <Flame size={18} className="text-amber-400" />
                <span>Log Mindful Practice Today</span>
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveManualLog} className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="block mb-1 font-medium">Practice Title</label>
                <input
                  type="text"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="e.g. Morning Breathwork or Walking Meditation"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Duration</span>
                  <span className="font-mono text-emerald-400">{logDuration} minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="45"
                  value={logDuration}
                  onChange={(e) => setLogDuration(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Stress Before</span>
                    <span className="text-amber-400 font-medium">{logStressBefore}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={logStressBefore}
                    onChange={(e) => setLogStressBefore(parseInt(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Calmness After</span>
                    <span className="text-emerald-400 font-medium">{logCalmnessAfter}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={logCalmnessAfter}
                    onChange={(e) => setLogCalmnessAfter(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Reflection / Gratitude (Optional)</label>
                <textarea
                  rows={2}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="How does your body and mind feel?..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition shadow-lg shadow-emerald-500/20"
                >
                  Record & Extend Streak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
