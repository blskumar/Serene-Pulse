import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { soundscapeAudio } from '../services/soundscapeAudio';
import {
  Sparkles,
  Heart,
  Copy,
  Check,
  RotateCw,
  Volume2,
  Bookmark,
  Share2,
  Calendar,
  Compass,
} from 'lucide-react';

export interface DailyAffirmationData {
  date: string; // YYYY-MM-DD
  affirmation: string;
  theme: string;
  breathingMantra: string;
  mindfulPrompt: string;
  author?: string;
  savedAt?: string;
}

interface DailyAffirmationWidgetProps {
  user?: User | null;
  onExploreTheme?: (theme: string) => void;
}

const STORAGE_KEY_DAILY_AFFIRMATION = 'serenepulse_daily_affirmation';
const STORAGE_KEY_SAVED_AFFIRMATIONS = 'serenepulse_saved_affirmations';

function toLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DailyAffirmationWidget: React.FC<DailyAffirmationWidgetProps> = ({
  user,
  onExploreTheme,
}) => {
  const [affirmationData, setAffirmationData] = useState<DailyAffirmationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('Inner Peace');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const themes = [
    'Inner Peace',
    'Self-Compassion',
    'Focus & Clarity',
    'Anxiety Release',
    'Deep Strength',
  ];

  // Load cached daily affirmation or fetch fresh from Gemini API
  const loadOrFetchAffirmation = async (forceRefresh = false, themeToUse = selectedTheme) => {
    const todayKey = toLocalDateKey();

    if (!forceRefresh) {
      try {
        const cachedStr = localStorage.getItem(STORAGE_KEY_DAILY_AFFIRMATION);
        if (cachedStr) {
          const cached: DailyAffirmationData = JSON.parse(cachedStr);
          if (cached.date === todayKey && cached.affirmation) {
            setAffirmationData(cached);
            checkIfSaved(cached.affirmation);
            return;
          }
        }
      } catch (e) {
        console.warn('Error reading cached affirmation:', e);
      }
    }

    // Fetch fresh affirmation from Gemini API
    setIsLoading(true);
    try {
      const res = await fetch('/api/daily-affirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: themeToUse,
          userName: user?.displayName || '',
        }),
      });

      const data = await res.json();
      const freshAffirmation: DailyAffirmationData = {
        date: todayKey,
        affirmation: data.affirmation || 'Within this breath, you are safe, capable, and completely at peace.',
        theme: data.theme || themeToUse,
        breathingMantra: data.breathingMantra || 'Inhale peace · Exhale doubt',
        mindfulPrompt: data.mindfulPrompt || 'What peaceful presence can you bring to your day?',
        author: data.author || 'Zen Sanctuary Reflection',
        savedAt: new Date().toISOString(),
      };

      setAffirmationData(freshAffirmation);
      checkIfSaved(freshAffirmation.affirmation);

      // Save to user local profile storage
      try {
        localStorage.setItem(STORAGE_KEY_DAILY_AFFIRMATION, JSON.stringify(freshAffirmation));
      } catch (e) {
        console.warn('Failed to save daily affirmation to localStorage:', e);
      }
    } catch (err) {
      console.warn('Failed to fetch affirmation from Gemini API:', err);
      // Fallback peaceful affirmation
      const fallbackData: DailyAffirmationData = {
        date: todayKey,
        affirmation: 'Within this very breath lies everything you need. You are grounded, capable, and completely at peace.',
        theme: 'Inner Sanctuary',
        breathingMantra: 'Inhale stillness · Exhale uncertainty',
        mindfulPrompt: 'What peaceful quality will you embody in your interactions today?',
        author: 'Zen Sanctuary Reflection',
      };
      setAffirmationData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfSaved = (quoteText: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED_AFFIRMATIONS) || '[]');
      const found = saved.some((item: DailyAffirmationData) => item.affirmation === quoteText);
      setIsSaved(found);
    } catch {
      setIsSaved(false);
    }
  };

  useEffect(() => {
    loadOrFetchAffirmation();
  }, [user]);

  // Handle saving quote to local user profile favorites
  const toggleSaveAffirmation = () => {
    if (!affirmationData) return;

    try {
      const saved: DailyAffirmationData[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY_SAVED_AFFIRMATIONS) || '[]'
      );

      if (isSaved) {
        // Remove
        const filtered = saved.filter((i) => i.affirmation !== affirmationData.affirmation);
        localStorage.setItem(STORAGE_KEY_SAVED_AFFIRMATIONS, JSON.stringify(filtered));
        setIsSaved(false);
      } else {
        // Add
        const updated = [affirmationData, ...saved];
        localStorage.setItem(STORAGE_KEY_SAVED_AFFIRMATIONS, JSON.stringify(updated));
        setIsSaved(true);
      }
    } catch (e) {
      console.warn('Error saving affirmation:', e);
    }
  };

  // Copy to clipboard
  const handleCopyQuote = () => {
    if (!affirmationData) return;
    const textToCopy = `"${affirmationData.affirmation}"\n— Daily Mindful Affirmation (${affirmationData.breathingMantra})`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Chime bell and recite softly with Web Speech
  const handleChimeAndRecite = () => {
    if (!affirmationData) return;

    soundscapeAudio.playChime(528);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(affirmationData.affirmation);
      utterance.rate = 0.82; // Gentle, slow meditation cadence
      utterance.pitch = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const sereneVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Serena') ||
            v.name.includes('Daniel') ||
            v.name.includes('Victoria'))
      );
      if (sereneVoice) utterance.voice = sereneVoice;

      setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      // Delay speech slightly to let chime ring
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 350);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setSelectedTheme(newTheme);
    loadOrFetchAffirmation(true, newTheme);
  };

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 bg-gradient-to-br from-slate-900/95 via-slate-900/70 to-emerald-950/30 border border-white/10 shadow-2xl backdrop-blur-xl transition-all">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Top Meta Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Sparkles size={13} />
              <span>Daily Mindful Affirmation</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{formattedDate}</span>
            {affirmationData?.theme && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-amber-300 font-medium">{affirmationData.theme}</span>
              </>
            )}
          </div>

          {/* Theme Quick Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  selectedTheme === t
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Affirmation Text & Decorative Quote Display */}
        <div className="py-2">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center text-slate-400">
              <RotateCw size={22} className="animate-spin text-emerald-400" />
              <p className="text-xs">Receiving today's empowering contemplation from Gemini...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute -top-3 -left-3 text-4xl text-emerald-500/20 font-serif leading-none select-none">
                  “
                </span>
                <p className="text-xl md:text-2xl font-serif-zen italic text-slate-100 leading-relaxed tracking-wide pl-3">
                  {affirmationData?.affirmation}
                </p>
              </div>

              {/* Breathing Mantra & Reflective Contemplation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {affirmationData?.breathingMantra && (
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                        Breath Anchor
                      </span>
                      <span className="text-xs font-medium text-emerald-300">
                        {affirmationData.breathingMantra}
                      </span>
                    </div>
                  </div>
                )}

                {affirmationData?.mindfulPrompt && (
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                        Daily Contemplation
                      </span>
                      <span className="text-xs font-serif-zen italic text-slate-300">
                        {affirmationData.mindfulPrompt}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            {/* Chime & Listen Button */}
            <button
              onClick={handleChimeAndRecite}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                isSpeaking
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Ring 528Hz bell chime and listen to peaceful spoken affirmation"
            >
              <Volume2 size={13} className={isSpeaking ? 'text-emerald-400 animate-pulse' : ''} />
              <span>{isSpeaking ? 'Speaking...' : 'Chime & Recite'}</span>
            </button>

            {/* Favorite / Save to Profile */}
            <button
              onClick={toggleSaveAffirmation}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                isSaved
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isSaved ? 'Saved in your local profile' : 'Save to profile favorites'}
            >
              <Heart
                size={13}
                className={isSaved ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}
              />
              <span>{isSaved ? 'Saved to Profile' : 'Save Quote'}</span>
            </button>

            {/* Copy Quote Button */}
            <button
              onClick={handleCopyQuote}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Copy quote and mantra to clipboard"
            >
              {isCopied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Refresh / Another Daily Inspiration */}
          <button
            onClick={() => loadOrFetchAffirmation(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-300 transition text-xs cursor-pointer py-1"
            title="Generate a new empowering affirmation from Gemini"
          >
            <RotateCw size={12} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
            <span>New Inspiration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
