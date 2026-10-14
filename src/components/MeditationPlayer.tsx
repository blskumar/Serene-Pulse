import React, { useState, useEffect, useRef } from 'react';
import { MeditationSession, SoundscapeType, VoiceName } from '../types';
import { soundscapeAudio } from '../services/soundscapeAudio';
import { BreathingGuide } from './BreathingGuide';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Wind,
  Subtitles,
  Sparkles,
  CheckCircle,
  Music,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MeditationPlayerProps {
  session: MeditationSession;
  onClose: () => void;
  onComplete?: (completedData: {
    sessionId: string;
    durationMinutes: number;
    stressBefore: number;
    calmnessAfter: number;
    notes: string;
  }) => void;
  onUpdateSessionAudio?: (sessionId: string, audioBase64: string) => void;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({
  session,
  onClose,
  onComplete,
  onUpdateSessionAudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session.durationMinutes * 60);
  const [voiceVolume, setVoiceVolume] = useState(0.85);
  const [soundscapeVolume, setSoundscapeVolume] = useState(0.4);
  const [selectedSoundscape, setSelectedSoundscape] = useState<SoundscapeType | 'off'>(
    session.soundscape || 'ocean'
  );
  const [showBreathing, setShowBreathing] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [showMixer, setShowMixer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [usingSpeechFallback, setUsingSpeechFallback] = useState(!session.audioBase64);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voiceSuccess, setVoiceSuccess] = useState<boolean>(false);

  // Post-session reflection state
  const [isCompleted, setIsCompleted] = useState(false);
  const [stressBefore, setStressBefore] = useState(6);
  const [calmnessAfter, setCalmnessAfter] = useState(9);
  const [reflectionNotes, setReflectionNotes] = useState('');

  // Audio elements
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenIndexRef = useRef<number>(-1);

  // Web Speech API fallback player for calm narration
  const speakSegmentText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && voiceVolume > 0) {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\|[^|]+\|/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.82; // Gentle, slow meditation cadence
      utterance.pitch = 0.95;
      utterance.volume = voiceVolume;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Serena') ||
            v.name.includes('Daniel') ||
            v.name.includes('Victoria'))
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const speakCurrentSegment = () => {
    if (session.segments && session.segments.length > 0) {
      let activeIndex = 0;
      for (let i = session.segments.length - 1; i >= 0; i--) {
        if (currentTime >= session.segments[i].cueTimeSec) {
          activeIndex = i;
          break;
        }
      }
      lastSpokenIndexRef.current = activeIndex;
      speakSegmentText(session.segments[activeIndex].text);
    } else {
      speakSegmentText(session.fullScript || session.description);
    }
  };

  // Initialize or update voice audio element
  useEffect(() => {
    if (session.audioBase64) {
      setUsingSpeechFallback(false);
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      audioElementRef.current.src = `data:audio/wav;base64,${session.audioBase64}`;
      audioElementRef.current.volume = voiceVolume;

      audioElementRef.current.onloadedmetadata = () => {
        if (audioElementRef.current) {
          setDuration(Math.max(audioElementRef.current.duration, session.durationMinutes * 60));
        }
      };

      audioElementRef.current.ontimeupdate = () => {
        if (audioElementRef.current) {
          setCurrentTime(audioElementRef.current.currentTime);
        }
      };

      audioElementRef.current.onended = () => {
        handleSessionEnd();
      };
    } else {
      setUsingSpeechFallback(true);
    }
  }, [session.audioBase64]);

  // Handle ambient soundscape playback
  useEffect(() => {
    soundscapeAudio.setVolume(soundscapeVolume);
    if (isPlaying && selectedSoundscape !== 'off') {
      soundscapeAudio.play(selectedSoundscape as SoundscapeType);
    } else {
      soundscapeAudio.stop();
    }
    return () => {
      soundscapeAudio.stop();
    };
  }, [isPlaying, selectedSoundscape, soundscapeVolume]);

  // Fallback timer and segment narrator when audio file is not used
  useEffect(() => {
    let interval: any;
    if (isPlaying && (!session.audioBase64 || usingSpeechFallback)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const nextTime = prev + 1;
          if (nextTime >= duration) {
            handleSessionEnd();
            return duration;
          }

          // Check if a new subtitle segment cue time is reached
          if (session.segments && session.segments.length > 0) {
            let activeIndex = -1;
            for (let i = session.segments.length - 1; i >= 0; i--) {
              if (nextTime >= session.segments[i].cueTimeSec) {
                activeIndex = i;
                break;
              }
            }
            if (activeIndex !== -1 && activeIndex !== lastSpokenIndexRef.current) {
              lastSpokenIndexRef.current = activeIndex;
              speakSegmentText(session.segments[activeIndex].text);
            }
          }

          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, session.audioBase64, usingSpeechFallback, duration, voiceVolume]);

  // Session ending handler
  const handleSessionEnd = () => {
    setIsPlaying(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    soundscapeAudio.stop();
    soundscapeAudio.playChime(432); // Final Tibetan chime
    setIsCompleted(true);
  };

  const togglePlay = () => {
    if (!isPlaying) {
      // Start
      soundscapeAudio.playChime(528); // Opening bell
      if (session.audioBase64 && !usingSpeechFallback && audioElementRef.current) {
        audioElementRef.current.play().catch(() => {
          setUsingSpeechFallback(true);
          speakCurrentSegment();
        });
      } else {
        speakCurrentSegment();
      }
      setIsPlaying(true);
    } else {
      // Pause
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    lastSpokenIndexRef.current = -1;
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
      if (isPlaying && !usingSpeechFallback) {
        audioElementRef.current.play();
      }
    }
    if (isPlaying && (!session.audioBase64 || usingSpeechFallback)) {
      speakCurrentSegment();
    }
  };

  const handleVoiceVolumeChange = (vol: number) => {
    setVoiceVolume(vol);
    if (audioElementRef.current) {
      audioElementRef.current.volume = vol;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Generate on-demand TTS voiceover if session lacks audio, with automatic graceful fallback
  const handleGenerateVoiceover = async (voice: VoiceName = session.voice || 'Kore') => {
    setIsGeneratingVoice(true);
    setAudioError(null);
    try {
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: session.fullScript,
          voice,
          style: session.voiceStyle || 'Soothing, gentle, slow-cadence meditation guide',
        }),
      });

      const data = await response.json();

      if (data.audioBase64) {
        onUpdateSessionAudio?.(session.id, data.audioBase64);
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
        }
        audioElementRef.current.src = `data:audio/wav;base64,${data.audioBase64}`;
        audioElementRef.current.volume = voiceVolume;
        setUsingSpeechFallback(false);
        setVoiceNotice(null);
        setVoiceSuccess(true);
        setTimeout(() => setVoiceSuccess(false), 4500);
        // If already playing, continue with the loaded audio smoothly
        if (isPlaying) {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          audioElementRef.current.currentTime = currentTime;
          audioElementRef.current.play().catch(() => {});
        }
      } else {
        // High demand or temporary fallback active
        setUsingSpeechFallback(true);
        setVoiceNotice(
          data.notice ||
            'Gemini Voice is currently experiencing temporary high traffic. Your meditation continues uninterrupted with our built-in voice guide.'
        );
        if (isPlaying) {
          speakCurrentSegment();
        }
      }
    } catch (err: any) {
      // Gracefully switch without disturbing user
      setUsingSpeechFallback(true);
      setVoiceNotice(
        'Gemini Voice is temporarily busy. Your practice continues with the local voice guide; tap retry anytime.'
      );
      if (isPlaying) {
        speakCurrentSegment();
      }
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // Find currently active subtitle segment
  const activeSubtitle =
    session.segments?.slice().reverse().find((seg) => currentTime >= seg.cueTimeSec)?.text ||
    session.segments?.[0]?.text ||
    'Breathe gently and rest your awareness in the present moment.';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white select-none overflow-hidden"
    >
      {/* Background Visual with atmospheric Ken Burns slow zoom */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src={session.imageUrl}
          alt={session.title}
          className={`w-full h-full object-cover transition-transform duration-10000 ease-out ${
            isPlaying ? 'scale-110' : 'scale-100'
          }`}
          style={{ transitionDuration: '25000ms' }}
        />
        {/* Deep ambient vignette and color overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/60" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/30 to-black/80" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-5 bg-gradient-to-b from-black/70 to-transparent">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles size={11} />
            {session.category} • {session.durationMinutes} min
          </span>
          <h2 className="text-xl md:text-2xl font-serif-zen font-medium text-white tracking-wide mt-1 drop-shadow-md">
            {session.title}
          </h2>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Breathing Overlay Toggle */}
          <button
            onClick={() => setShowBreathing(!showBreathing)}
            className={`p-2.5 rounded-full transition-all ${
              showBreathing
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
            }`}
            title="Toggle Breathing Mandala"
          >
            <Wind size={18} />
          </button>

          {/* Subtitles Toggle */}
          <button
            onClick={() => setShowSubtitles(!showSubtitles)}
            className={`p-2.5 rounded-full transition-all ${
              showSubtitles
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
            }`}
            title="Toggle Subtitles"
          >
            <Subtitles size={18} />
          </button>

          {/* Audio Mixer Toggle */}
          <button
            onClick={() => setShowMixer(!showMixer)}
            className={`p-2.5 rounded-full transition-all ${
              showMixer
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
            }`}
            title="Audio & Soundscape Mixer"
          >
            <Sliders size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/40 text-slate-400 hover:text-white border border-white/10 transition"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Close / Exit Button */}
          <button
            onClick={() => {
              soundscapeAudio.stop();
              if (audioElementRef.current) audioElementRef.current.pause();
              onClose();
            }}
            className="p-2.5 rounded-full bg-black/40 text-slate-400 hover:text-rose-400 border border-white/10 transition"
            title="Leave Session"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Center Zone: Breathing Mandala or Zen Visuals */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {showBreathing ? (
          <div className="transform transition-all duration-500">
            <BreathingGuide
              technique={session.breathTechnique}
              compact={false}
              showTimerControls={false}
            />
          </div>
        ) : (
          <div className="text-center max-w-lg px-6 py-8 rounded-2xl zen-glass border border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
              Deep Mindfulness
            </span>
            <p className="mt-2 text-lg md:text-xl font-serif-zen italic text-slate-200">
              "{session.description}"
            </p>
          </div>
        )}

        {/* Live Subtitle Banner */}
        {showSubtitles && (
          <div className="mt-6 max-w-2xl px-6 py-3.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-center shadow-xl transition-all">
            <p className="text-base md:text-lg font-light text-slate-100 tracking-wide leading-relaxed font-serif-zen">
              {activeSubtitle}
            </p>
          </div>
        )}

        {/* Voiceover status and fallback indicator */}
        {voiceSuccess ? (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 backdrop-blur-md shadow-lg animate-fade-in">
            <Sparkles size={14} className="text-emerald-400" />
            <span>Gemini Studio HD Voice Connected ({session.voice})</span>
          </div>
        ) : !session.audioBase64 ? (
          <div className="mt-4 flex flex-col items-center max-w-md w-full px-4">
            <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-xs text-slate-200 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Spoken Guide: <strong className="text-emerald-300 font-medium">Natural Audio ({session.voice})</strong>
                </span>
              </div>
              <button
                onClick={() => handleGenerateVoiceover(session.voice)}
                disabled={isGeneratingVoice}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50 cursor-pointer shadow-sm"
                title="Synthesize high-fidelity Gemini neural voiceover"
              >
                <Sparkles size={12} className={isGeneratingVoice ? 'animate-spin' : ''} />
                <span>
                  {isGeneratingVoice
                    ? 'Connecting voice...'
                    : voiceNotice
                    ? `Retry Gemini Voice (${session.voice})`
                    : `Generate Voice (${session.voice})`}
                </span>
              </button>
            </div>

            {/* Tranquil feedback when Gemini API experienced high demand (503) */}
            {voiceNotice && (
              <div className="mt-2 text-center text-xs text-amber-200/90 bg-slate-950/80 border border-amber-500/30 px-3.5 py-1.5 rounded-xl backdrop-blur-md animate-fade-in shadow-md">
                <span>{voiceNotice}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Floating Audio Mixer Drawer */}
      {showMixer && (
        <div className="absolute top-20 right-6 z-30 w-80 p-5 rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <Sliders size={15} className="text-emerald-400" />
              Sanctuary Audio Mixer
            </h4>
            <button
              onClick={() => setShowMixer(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4 mt-4">
            {/* Guide Voice Volume */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Gemini Guide Voice ({session.voice})</span>
                <span className="font-mono">{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={voiceVolume}
                onChange={(e) => handleVoiceVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* Ambient Soundscape Volume */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Ambient Soundscape</span>
                <span className="font-mono">{Math.round(soundscapeVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundscapeVolume}
                onChange={(e) => setSoundscapeVolume(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* Soundscape Type Selector */}
            <div>
              <label className="text-xs text-slate-300 block mb-1.5">
                Ambient Soundscape Mode
              </label>
              <select
                value={selectedSoundscape}
                onChange={(e) => setSelectedSoundscape(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ocean">🌊 Deep Ocean Swells</option>
                <option value="singing-bowls">🥣 Tibetan Singing Bowls (432Hz)</option>
                <option value="forest-rain">🌧️ Forest Rain & Mist</option>
                <option value="theta-binaural">🧠 4Hz Theta Waves (Deep Calm)</option>
                <option value="alpha-flow">✨ 8Hz Alpha Waves (Mental Flow)</option>
                <option value="zen-stream">🍃 Zen Mountain Stream</option>
                <option value="off">Mute Soundscape</option>
              </select>
            </div>

            <button
              onClick={() => soundscapeAudio.playChime(528)}
              className="w-full py-1.5 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
            >
              🔔 Test Tibetan Bell Chime
            </button>
          </div>
        </div>
      )}

      {/* Bottom Player Controls */}
      <div className="relative z-20 px-6 py-5 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
        {/* Progress Timeline Slider */}
        <div className="max-w-3xl mx-auto mb-3">
          <div className="relative flex items-center group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const newT = parseFloat(e.target.value);
                setCurrentTime(newT);
                if (audioElementRef.current) {
                  audioElementRef.current.currentTime = newT;
                }
              }}
              className="w-full accent-emerald-400 bg-slate-800/80 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-mono mt-1 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Central Controls Bar */}
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Visual: <span className="text-emerald-400">{session.imageSize}</span>
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Voice: <span className="text-emerald-400">{session.voice}</span>
            </span>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleRestart}
              className="p-3 text-slate-400 hover:text-white transition"
              title="Restart Session"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>

            <button
              onClick={() => {
                const nextVol = voiceVolume === 0 ? 0.8 : 0;
                handleVoiceVolumeChange(nextVol);
              }}
              className="p-3 text-slate-400 hover:text-white transition"
              title="Toggle Voice Mute"
            >
              {voiceVolume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSessionEnd}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
            >
              Complete Now
            </button>
          </div>
        </div>
      </div>

      {/* Post-Session Mindful Reflection Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-2xl font-serif-zen font-medium text-white">
                Mindful Practice Completed
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                You dedicated {Math.round(currentTime / 60) || session.durationMinutes} minutes to your inner peace.
              </p>
            </div>

            <div className="space-y-4 my-6">
              {/* Stress Before Rating */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Stress level before session</span>
                  <span className="font-medium text-amber-400">{stressBefore} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={stressBefore}
                  onChange={(e) => setStressBefore(parseInt(e.target.value))}
                  className="w-full accent-amber-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Calmness After Rating */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Calmness & presence right now</span>
                  <span className="font-medium text-emerald-400">{calmnessAfter} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={calmnessAfter}
                  onChange={(e) => setCalmnessAfter(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* Reflection Note */}
              <div>
                <label className="text-xs text-slate-300 block mb-1.5">
                  Mindful Reflection or Gratitude Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  placeholder="How does your mind and body feel right now?..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onComplete?.({
                    sessionId: session.id,
                    durationMinutes: Math.max(1, Math.round(currentTime / 60)),
                    stressBefore,
                    calmnessAfter,
                    notes: reflectionNotes,
                  });
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-sm transition shadow-lg shadow-emerald-500/20"
              >
                Save to Journal & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
