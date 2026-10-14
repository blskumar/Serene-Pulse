import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BreathPatternType } from '../types';
import { soundscapeAudio } from '../services/soundscapeAudio';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  CheckCircle2,
  Heart,
  ChevronRight,
  Palette,
  CircleDot,
  Radio,
  Hexagon,
  Flower2,
} from 'lucide-react';

export type MandalaStyle = 'soft-pulses' | 'expanding-rings' | 'geometric-flow' | 'sacred-lotus';

export interface MandalaStyleOption {
  id: MandalaStyle;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const MANDALA_STYLES: MandalaStyleOption[] = [
  {
    id: 'soft-pulses',
    label: 'Soft Pulses',
    tagline: 'Gentle blooming aura & organic halo',
    icon: CircleDot,
  },
  {
    id: 'expanding-rings',
    label: 'Expanding Rings',
    tagline: 'Harmonic ripples & resonant orbits',
    icon: Radio,
  },
  {
    id: 'geometric-flow',
    label: 'Geometric Flow',
    tagline: 'Sacred geometry & rotating facets',
    icon: Hexagon,
  },
  {
    id: 'sacred-lotus',
    label: 'Sacred Lotus',
    tagline: 'Blossoming petals opening with breath',
    icon: Flower2,
  },
];

export interface BreathingGuideProps {
  technique?: BreathPatternType;
  compact?: boolean;
  initialMinutes?: number | null;
  onComplete?: (durationMinutes: number) => void;
  showTimerControls?: boolean;
  defaultMandalaStyle?: MandalaStyle;
}

interface PhaseConfig {
  name: 'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)';
  instruction: string;
  durationSec: number;
  scaleTarget: number; // 1.0 to 1.5
  ringColor: string;
}

const TIMER_PRESETS = [
  { label: '1 min', minutes: 1, subtitle: 'Quick reset' },
  { label: '2 min', minutes: 2, subtitle: 'Vagus calm' },
  { label: '3 min', minutes: 3, subtitle: 'Deep balance' },
  { label: '5 min', minutes: 5, subtitle: 'Heart coherence' },
  { label: '10 min', minutes: 10, subtitle: 'Total sanctuary' },
  { label: 'Open ∞', minutes: null, subtitle: 'Untimed flow' },
];

const STORAGE_KEY_MANDALA = 'serenepulse_mandala_style';

export const BreathingGuide: React.FC<BreathingGuideProps> = ({
  technique = 'box',
  compact = false,
  initialMinutes = 2,
  onComplete,
  showTimerControls = true,
  defaultMandalaStyle = 'soft-pulses',
}) => {
  const [selectedTechnique, setSelectedTechnique] = useState<BreathPatternType>(technique);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseSecondsRemaining, setPhaseSecondsRemaining] = useState(4);
  const [chimeEnabled, setChimeEnabled] = useState(false);
  const [scale, setScale] = useState(1);

  // Mandala Style state with local storage persistence
  const [mandalaStyle, setMandalaStyle] = useState<MandalaStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MANDALA);
      if (
        saved === 'soft-pulses' ||
        saved === 'expanding-rings' ||
        saved === 'geometric-flow' ||
        saved === 'sacred-lotus'
      ) {
        return saved;
      }
    } catch {
      // Fallback if localStorage is unavailable
    }
    return defaultMandalaStyle;
  });

  // Timer feature state
  // null represents open / untimed practice
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(
    compact ? null : initialMinutes
  );
  const [totalTimerSeconds, setTotalTimerSeconds] = useState<number | null>(
    initialMinutes ? initialMinutes * 60 : null
  );
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(
    initialMinutes ? initialMinutes * 60 : null
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(!compact);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [hasLoggedEntry, setHasLoggedEntry] = useState(false);

  // Handle changing mandala style
  const handleSelectMandalaStyle = (style: MandalaStyle) => {
    setMandalaStyle(style);
    try {
      localStorage.setItem(STORAGE_KEY_MANDALA, style);
    } catch {
      // Ignore storage errors
    }
  };

  // Define phases for each technique
  const getPhases = (tech: BreathPatternType): PhaseConfig[] => {
    switch (tech) {
      case 'box':
        return [
          {
            name: 'Inhale',
            instruction: 'Breathe in slowly through your nose',
            durationSec: 4,
            scaleTarget: 1.45,
            ringColor: 'from-emerald-400 to-teal-500',
          },
          {
            name: 'Hold (Full)',
            instruction: 'Gently suspend the breath with ease',
            durationSec: 4,
            scaleTarget: 1.45,
            ringColor: 'from-teal-400 to-cyan-500',
          },
          {
            name: 'Exhale',
            instruction: 'Release smoothly through soft lips',
            durationSec: 4,
            scaleTarget: 1.0,
            ringColor: 'from-indigo-400 to-sky-500',
          },
          {
            name: 'Hold (Empty)',
            instruction: 'Rest in pure stillness before the next breath',
            durationSec: 4,
            scaleTarget: 1.0,
            ringColor: 'from-purple-400 to-slate-500',
          },
        ];
      case '4-7-8':
        return [
          {
            name: 'Inhale',
            instruction: 'Quiet inhale through nose',
            durationSec: 4,
            scaleTarget: 1.45,
            ringColor: 'from-emerald-400 to-teal-400',
          },
          {
            name: 'Hold (Full)',
            instruction: 'Hold the breath effortlessly',
            durationSec: 7,
            scaleTarget: 1.45,
            ringColor: 'from-cyan-400 to-blue-500',
          },
          {
            name: 'Exhale',
            instruction: 'Complete whoosh exhale through mouth',
            durationSec: 8,
            scaleTarget: 1.0,
            ringColor: 'from-violet-400 to-indigo-500',
          },
        ];
      case 'coherence':
        return [
          {
            name: 'Inhale',
            instruction: 'Smooth diaphragmatic inhale',
            durationSec: 5,
            scaleTarget: 1.4,
            ringColor: 'from-amber-400 to-rose-400',
          },
          {
            name: 'Exhale',
            instruction: 'Smooth diaphragmatic exhale',
            durationSec: 5,
            scaleTarget: 1.0,
            ringColor: 'from-sky-400 to-indigo-400',
          },
        ];
      case 'natural':
      default:
        return [
          {
            name: 'Inhale',
            instruction: 'Breathe in gentle awareness',
            durationSec: 4,
            scaleTarget: 1.35,
            ringColor: 'from-emerald-300 to-teal-400',
          },
          {
            name: 'Exhale',
            instruction: 'Let go of tension and soften',
            durationSec: 6,
            scaleTarget: 1.0,
            ringColor: 'from-teal-400 to-slate-400',
          },
        ];
    }
  };

  const phases = useMemo(() => getPhases(selectedTechnique), [selectedTechnique]);
  const activePhase = phases[currentPhaseIndex] || phases[0];

  // Sync prop changes
  useEffect(() => {
    setSelectedTechnique(technique);
  }, [technique]);

  // Reset phase when technique changes
  useEffect(() => {
    setCurrentPhaseIndex(0);
    setPhaseSecondsRemaining(phases[0].durationSec);
    setScale(phases[0].scaleTarget);
  }, [phases]);

  // Overall session countdown timer
  useEffect(() => {
    if (!isTimerRunning || isSessionCompleted || sessionSecondsLeft === null) {
      return;
    }

    const sessionInterval = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Timer completed!
          setIsTimerRunning(false);
          setIsSessionCompleted(true);
          soundscapeAudio.playChime(528);
          if (onComplete && selectedMinutes) {
            onComplete(selectedMinutes);
            setHasLoggedEntry(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(sessionInterval);
  }, [isTimerRunning, isSessionCompleted, sessionSecondsLeft, onComplete, selectedMinutes]);

  // Breath pacing interval
  useEffect(() => {
    if (!isTimerRunning || isSessionCompleted) {
      return;
    }

    const timer = setInterval(() => {
      setPhaseSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Advance to next phase
          const nextIndex = (currentPhaseIndex + 1) % phases.length;
          setCurrentPhaseIndex(nextIndex);
          const nextPhase = phases[nextIndex];
          setScale(nextPhase.scaleTarget);

          // If completed one full cycle of all phases
          if (nextIndex === 0) {
            setCompletedCycles((c) => c + 1);
          }

          if (chimeEnabled) {
            soundscapeAudio.playChime(nextIndex === 0 ? 528 : 396);
          }
          return nextPhase.durationSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, isSessionCompleted, currentPhaseIndex, phases, chimeEnabled]);

  // Handle changing preset timer
  const handleSelectMinutes = (mins: number | null) => {
    setSelectedMinutes(mins);
    setIsSessionCompleted(false);
    setHasLoggedEntry(false);
    setCompletedCycles(0);

    if (mins === null) {
      setTotalTimerSeconds(null);
      setSessionSecondsLeft(null);
      setIsTimerRunning(true);
    } else {
      const secs = mins * 60;
      setTotalTimerSeconds(secs);
      setSessionSecondsLeft(secs);
      setIsTimerRunning(true);
    }

    // Reset breath phase
    setCurrentPhaseIndex(0);
    setPhaseSecondsRemaining(phases[0].durationSec);
    setScale(phases[0].scaleTarget);
  };

  // Toggle play/pause
  const handleTogglePlayPause = () => {
    if (isSessionCompleted) {
      handleRestart();
      return;
    }
    setIsTimerRunning((prev) => !prev);
  };

  // Restart session
  const handleRestart = () => {
    setIsSessionCompleted(false);
    setHasLoggedEntry(false);
    setCompletedCycles(0);
    setCurrentPhaseIndex(0);
    setPhaseSecondsRemaining(phases[0].durationSec);
    setScale(phases[0].scaleTarget);

    if (selectedMinutes !== null) {
      const secs = selectedMinutes * 60;
      setTotalTimerSeconds(secs);
      setSessionSecondsLeft(secs);
    }
    setIsTimerRunning(true);
  };

  // Cycle to next mandala style
  const handleCycleNextMandala = () => {
    const currentIndex = MANDALA_STYLES.findIndex((s) => s.id === mandalaStyle);
    const nextIndex = (currentIndex + 1) % MANDALA_STYLES.length;
    handleSelectMandalaStyle(MANDALA_STYLES[nextIndex].id);
  };

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${String(remainder).padStart(2, '0')}`;
  };

  // Calculate timer progress percentage
  const timerProgress = useMemo(() => {
    if (totalTimerSeconds === null || sessionSecondsLeft === null || totalTimerSeconds <= 0) {
      return 0;
    }
    const elapsed = totalTimerSeconds - sessionSecondsLeft;
    return Math.min(100, Math.max(0, (elapsed / totalTimerSeconds) * 100));
  }, [totalTimerSeconds, sessionSecondsLeft]);

  const sizeClass = compact ? 'w-48 h-48' : 'w-72 h-72 md:w-80 md:h-80';

  return (
    <div className="flex flex-col items-center justify-center p-2 w-full">
      {/* Technique Switcher if not compact */}
      {!compact && (
        <div className="flex flex-wrap gap-2 mb-5 justify-center">
          {[
            { id: 'box', label: 'Box Breath (4-4-4-4)' },
            { id: '4-7-8', label: '4-7-8 Relax' },
            { id: 'coherence', label: 'Coherence (5-5)' },
            { id: 'natural', label: 'Natural Flow' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedTechnique(item.id as BreathPatternType);
                setCurrentPhaseIndex(0);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedTechnique === item.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Visual Mandala Style Selector */}
      {!compact && (
        <div className="w-full max-w-md mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Palette size={13} className="text-teal-400" />
              <span>Mandala Visual Style</span>
            </span>
            <span className="text-[11px] text-teal-400 font-medium">
              {MANDALA_STYLES.find((s) => s.id === mandalaStyle)?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            {MANDALA_STYLES.map((style) => {
              const isSelected = mandalaStyle === style.id;
              const Icon = style.icon;
              return (
                <button
                  key={style.id}
                  onClick={() => handleSelectMandalaStyle(style.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                  title={style.tagline}
                >
                  <Icon size={16} className={isSelected ? 'text-teal-300' : 'text-slate-400'} />
                  <span className="text-[11px] font-medium leading-tight">{style.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Timer Selector Tabs */}
      {!compact && showTimerControls && (
        <div className="w-full max-w-md mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-emerald-400" />
              <span>Practice Timer</span>
            </span>
            {selectedMinutes !== null && sessionSecondsLeft !== null && (
              <span className="text-xs font-mono font-medium text-emerald-400">
                {formatTime(sessionSecondsLeft)} remaining
              </span>
            )}
            {selectedMinutes === null && (
              <span className="text-[11px] text-slate-400 font-medium">Freeflow Mode</span>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            {TIMER_PRESETS.map((preset) => {
              const isSelected = selectedMinutes === preset.minutes;
              return (
                <button
                  key={preset.label}
                  onClick={() => handleSelectMinutes(preset.minutes)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  title={preset.subtitle}
                >
                  <div className="font-semibold">{preset.label}</div>
                </button>
              );
            })}
          </div>

          {/* Progress bar if timer is active */}
          {selectedMinutes !== null && sessionSecondsLeft !== null && (
            <div className="mt-2.5 w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${timerProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Main Breathing Mandala or Completion View */}
      {isSessionCompleted ? (
        <div className="w-full max-w-md p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 backdrop-blur-xl text-center space-y-4 animate-fade-in shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto text-emerald-300 shadow-lg shadow-emerald-500/20 animate-pulse">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              Session Finished
            </span>
            <h3 className="text-2xl font-serif-zen font-medium text-white mt-1">
              Breath Sanctuary Complete
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
              You completed{' '}
              <span className="font-semibold text-emerald-300">
                {selectedMinutes} {selectedMinutes === 1 ? 'minute' : 'minutes'}
              </span>{' '}
              of centered breathwork with the{' '}
              <span className="text-teal-300 font-medium">
                {MANDALA_STYLES.find((s) => s.id === mandalaStyle)?.label}
              </span>{' '}
              mandala. Your heart rate and nervous system are now harmonized.
            </p>
          </div>

          {/* Practice stats pill */}
          <div className="flex items-center justify-center gap-6 py-2 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Cycles</div>
              <div className="font-semibold text-emerald-400 font-mono text-sm">
                {completedCycles > 0 ? completedCycles : Math.max(1, Math.round((selectedMinutes || 1) * 3))}
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Technique</div>
              <div className="font-semibold text-slate-200 capitalize">{selectedTechnique}</div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Duration</div>
              <div className="font-semibold text-teal-400 font-mono text-sm">
                {selectedMinutes}m
              </div>
            </div>
          </div>

          {hasLoggedEntry ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-300 bg-emerald-900/40 py-2 px-3 rounded-xl border border-emerald-500/30">
              <Sparkles size={14} />
              <span>Saved to your Mindful Journal & Streak counter</span>
            </div>
          ) : (
            onComplete && selectedMinutes && (
              <button
                onClick={() => {
                  onComplete(selectedMinutes);
                  setHasLoggedEntry(true);
                  soundscapeAudio.playChime(648);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Heart size={14} />
                <span>Save Practice to Journal & Streak</span>
              </button>
            )
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRestart}
              className="py-2 px-4 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Breathe Again</span>
            </button>
            <button
              onClick={() => handleSelectMinutes(selectedMinutes === 5 ? 10 : 5)}
              className="py-2 px-4 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Extend Practice</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Visual Breathing Mandala Container */}
          <div className={`relative flex items-center justify-center ${sizeClass}`}>
            {/* MANDALA STYLE 1: SOFT PULSES */}
            {mandalaStyle === 'soft-pulses' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Outermost ambient diffuse aura */}
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-tr ${activePhase.ringColor} blur-3xl opacity-35 transition-all ease-in-out`}
                  style={{
                    transform: `scale(${isTimerRunning ? scale * 1.25 : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                />
                {/* Secondary blooming halo */}
                <div
                  className={`absolute inset-4 rounded-full bg-gradient-to-br ${activePhase.ringColor} blur-xl opacity-45 transition-all ease-in-out`}
                  style={{
                    transform: `scale(${isTimerRunning ? scale * 1.15 : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                />
                {/* Subtle boundary shimmer ring */}
                <div
                  className="absolute inset-8 rounded-full border border-teal-400/40 transition-transform ease-in-out"
                  style={{
                    transform: `scale(${isTimerRunning ? scale * 1.05 : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                />
              </div>
            )}

            {/* MANDALA STYLE 2: EXPANDING RINGS */}
            {mandalaStyle === 'expanding-rings' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Ambient glow behind rings */}
                <div
                  className={`absolute inset-4 rounded-full bg-gradient-to-tr ${activePhase.ringColor} blur-2xl opacity-25 transition-all ease-in-out`}
                  style={{
                    transform: `scale(${isTimerRunning ? scale : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                />
                {/* Concentric Resonant Rings SVG */}
                <svg
                  viewBox="0 0 320 320"
                  className="absolute inset-0 w-full h-full overflow-visible transition-transform ease-in-out"
                  style={{
                    transform: `scale(${isTimerRunning ? scale * 1.06 : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                >
                  <defs>
                    <linearGradient id="expandingRingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>

                  {/* Outermost Expanding Echo Ring */}
                  <circle
                    cx="160"
                    cy="160"
                    r="145"
                    fill="none"
                    stroke="url(#expandingRingsGrad)"
                    strokeWidth="1.2"
                    strokeOpacity={
                      isTimerRunning && (activePhase.name === 'Inhale' || activePhase.name.includes('Hold'))
                        ? 0.75
                        : 0.25
                    }
                    className="transition-all ease-in-out"
                    style={{ transitionDuration: `${activePhase.durationSec}s` }}
                  />

                  {/* Middle Harmonic Orbit Ring with dash pattern */}
                  <circle
                    cx="160"
                    cy="160"
                    r="120"
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                    strokeOpacity="0.55"
                  />

                  {/* Cardinal Node Orbit Ring */}
                  <circle
                    cx="160"
                    cy="160"
                    r="96"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeOpacity="0.6"
                  />

                  {/* 8 Cardinal / Celestial orbital nodes */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                    const rad = (deg * Math.PI) / 180;
                    const x = 160 + 96 * Math.cos(rad);
                    const y = 160 + 96 * Math.sin(rad);
                    return (
                      <circle
                        key={deg}
                        cx={x}
                        cy={y}
                        r="2.5"
                        fill="#5eead4"
                        className="transition-opacity duration-500"
                        opacity={isTimerRunning ? 0.9 : 0.4}
                      />
                    );
                  })}

                  {/* Inner Resonance Echo Ring */}
                  <circle
                    cx="160"
                    cy="160"
                    r="74"
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                    strokeOpacity="0.45"
                  />
                </svg>
              </div>
            )}

            {/* MANDALA STYLE 3: GEOMETRIC FLOW */}
            {mandalaStyle === 'geometric-flow' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Background aura */}
                <div
                  className={`absolute inset-4 rounded-full bg-gradient-to-tr ${activePhase.ringColor} blur-2xl opacity-30 transition-all ease-in-out`}
                  style={{
                    transform: `scale(${isTimerRunning ? scale : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                />
                <svg
                  viewBox="0 0 320 320"
                  className="absolute inset-0 w-full h-full overflow-visible transition-transform ease-in-out"
                  style={{
                    transform: `scale(${isTimerRunning ? scale * 1.05 : 1}) rotate(${
                      isTimerRunning ? (scale - 1) * 80 : 0
                    }deg)`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                >
                  <defs>
                    <linearGradient id="geomFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6ee7b7" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>

                  {/* Sacred Octagram (Two Interlocked Rotated Squares) */}
                  <g stroke="url(#geomFlowGrad)" strokeWidth="1.2" fill="none" opacity="0.65">
                    <rect x="55" y="55" width="210" height="210" rx="16" />
                    <rect
                      x="55"
                      y="55"
                      width="210"
                      height="210"
                      rx="16"
                      transform="rotate(45 160 160)"
                      strokeOpacity="0.55"
                    />
                  </g>

                  {/* Flower of Life 8-Petal Rosette Lattice */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 160 + 55 * Math.cos(rad);
                    const cy = 160 + 55 * Math.sin(rad);
                    return (
                      <circle
                        key={angle}
                        cx={cx}
                        cy={cy}
                        r="55"
                        fill="none"
                        stroke="#5eead4"
                        strokeWidth="0.9"
                        strokeOpacity="0.4"
                      />
                    );
                  })}

                  {/* Concentric Crystalline Perimeter Circle */}
                  <circle
                    cx="160"
                    cy="160"
                    r="135"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="1"
                    strokeDasharray="6 6"
                    strokeOpacity="0.5"
                  />

                  {/* Diamond vertex nodes */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 160 + 135 * Math.cos(rad);
                    const cy = 160 + 135 * Math.sin(rad);
                    return (
                      <polygon
                        key={angle}
                        points={`${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`}
                        fill="#38bdf8"
                        opacity="0.8"
                      />
                    );
                  })}
                </svg>
              </div>
            )}

            {/* MANDALA STYLE 4: SACRED LOTUS */}
            {mandalaStyle === 'sacred-lotus' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`absolute inset-4 rounded-full bg-gradient-to-tr ${activePhase.ringColor} blur-2xl opacity-25 transition-all ease-in-out`}
                  style={{
                    transform: `scale(${isTimerRunning ? scale : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                />
                <svg
                  viewBox="0 0 320 320"
                  className="absolute inset-0 w-full h-full overflow-visible transition-transform ease-in-out"
                  style={{
                    transform: `scale(${isTimerRunning ? scale * 1.08 : 1})`,
                    transitionDuration: `${activePhase.durationSec}s`,
                  }}
                >
                  <defs>
                    <linearGradient id="lotusOuterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity="0.75" />
                      <stop offset="50%" stopColor="#ec4899" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
                    </linearGradient>
                    <linearGradient id="lotusInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.25" />
                    </linearGradient>
                  </defs>

                  {/* 8 Outer Blooming Petals */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <g key={`outer-${angle}`} transform={`rotate(${angle} 160 160)`}>
                      <path
                        d="M 160 35 C 178 75 190 120 160 160 C 130 120 142 75 160 35 Z"
                        fill="url(#lotusOuterGrad)"
                        stroke="#f472b6"
                        strokeWidth="1"
                        strokeOpacity="0.6"
                      />
                      <circle cx="160" cy="35" r="2.5" fill="#fbcfe8" opacity="0.9" />
                    </g>
                  ))}

                  {/* 8 Inner Blooming Petals rotated 22.5 deg */}
                  {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                    <g key={`inner-${angle}`} transform={`rotate(${angle} 160 160)`}>
                      <path
                        d="M 160 65 C 172 95 180 130 160 160 C 140 130 148 95 160 65 Z"
                        fill="url(#lotusInnerGrad)"
                        stroke="#5eead4"
                        strokeWidth="0.8"
                        strokeOpacity="0.6"
                      />
                    </g>
                  ))}

                  {/* Golden Stamen Halo Ring */}
                  <circle
                    cx="160"
                    cy="160"
                    r="86"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    strokeOpacity="0.5"
                  />
                </svg>
              </div>
            )}

            {/* Central High-Contrast Glass Breathing Core */}
            <div
              className={`relative z-10 w-36 h-36 md:w-44 md:h-44 rounded-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/15 shadow-2xl backdrop-blur-xl transition-all ease-in-out`}
              style={{
                transform: `scale(${isTimerRunning ? scale : 1})`,
                transitionDuration: `${activePhase.durationSec}s`,
              }}
            >
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-1">
                {isTimerRunning ? activePhase.name : 'Paused'}
              </span>
              <span className="text-3xl md:text-4xl font-light text-white font-mono">
                {isTimerRunning ? `${phaseSecondsRemaining}s` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 max-w-[120px] line-clamp-2">
                {compact ? '' : activePhase.instruction}
              </span>
            </div>
          </div>

          {/* Subtitle instruction under the circle */}
          <p className="mt-4 text-sm text-slate-300 font-light text-center max-w-sm h-6">
            {isTimerRunning ? activePhase.instruction : 'Press play to resume conscious breath rhythm.'}
          </p>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            {/* Play / Pause */}
            <button
              onClick={handleTogglePlayPause}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 transition cursor-pointer"
              title={isTimerRunning ? 'Pause breathing guide' : 'Start breathing guide'}
            >
              {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
              <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleRestart}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
              title="Restart session"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            {/* Quick Mandala Style Cycle Button */}
            <button
              onClick={handleCycleNextMandala}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-teal-300 hover:text-teal-200 bg-teal-950/40 hover:bg-teal-900/50 border border-teal-800/40 transition cursor-pointer"
              title="Cycle to next visual mandala style"
            >
              <Palette size={12} className="text-teal-400" />
              <span>{MANDALA_STYLES.find((s) => s.id === mandalaStyle)?.label}</span>
            </button>

            {/* Bell Chime Toggle */}
            <button
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                chimeEnabled
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700'
              }`}
              title="Toggle subtle phase chime"
            >
              {chimeEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>Bell</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
