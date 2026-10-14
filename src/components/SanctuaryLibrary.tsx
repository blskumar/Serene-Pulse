import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { MeditationSession } from '../types';
import { DailyAffirmationWidget } from './DailyAffirmationWidget';
import {
  Play,
  Sparkles,
  Clock,
  Mic,
  Image as ImageIcon,
  Wind,
  Plus,
  Trash2,
  Filter,
} from 'lucide-react';

interface SanctuaryLibraryProps {
  sessions: MeditationSession[];
  onPlaySession: (session: MeditationSession) => void;
  onCreateNew: () => void;
  onDeleteCustomSession?: (id: string) => void;
  user?: User | null;
}

export const SanctuaryLibrary: React.FC<SanctuaryLibraryProps> = ({
  sessions,
  onPlaySession,
  onCreateNew,
  onDeleteCustomSession,
  user,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    'Deep Sleep & Relaxation',
    'Morning Energy & Focus',
    'Stress & Anxiety Relief',
    'Compassion & Gratitude',
    'Quick Micro-Sessions',
    'Custom AI Sessions',
  ];

  const filteredSessions = sessions.filter((s) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Custom AI Sessions') return s.isCustom;
    return s.category === selectedCategory;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-fade-in space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <Sparkles size={13} />
            <span>AI Sanctuary • Bespoke Visuals & Voiceovers</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-serif-zen font-medium text-white tracking-wide">
            Find Stillness Within The Chaos
          </h1>

          <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed">
            Immerse yourself in custom meditation sanctuaries featuring unique ultra-high resolution
            sceneries rendered by Gemini and lifelike voiceovers narrated with{' '}
            <span className="text-emerald-300 font-medium">Gemini 3.8 Flash TTS</span>.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Generate Custom Session</span>
            </button>

            {sessions[0] && (
              <button
                onClick={() => onPlaySession(sessions[0])}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-medium text-sm border border-slate-700 transition cursor-pointer"
              >
                <Play size={15} />
                <span>Begin Daily Anchor ({sessions[0].durationMinutes}m)</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background radial glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Daily Mindful Affirmation Widget */}
      <DailyAffirmationWidget user={user} />

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Filter size={14} className="text-slate-500 shrink-0 ml-1 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="group relative rounded-3xl overflow-hidden bg-slate-900/70 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col"
          >
            {/* Image Header with resolution badge */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={session.imageUrl}
                alt={session.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

              {/* Badges on top of image */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px]">
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 font-mono border border-white/10">
                  {session.imageSize} Visual
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-slate-200 border border-white/10 flex items-center gap-1">
                  <Clock size={11} />
                  {session.durationMinutes} min
                </span>
              </div>

              {/* Play overlay button */}
              <button
                onClick={() => onPlaySession(session)}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 cursor-pointer"
                title="Play Session"
              >
                <Play size={20} className="ml-0.5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 block mb-1">
                  {session.category}
                </span>
                <h3 className="text-base font-serif-zen font-semibold text-white tracking-wide group-hover:text-emerald-200 transition">
                  {session.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed font-light">
                  {session.description}
                </p>
              </div>

              {/* Tags and Action */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1" title="Gemini Voice">
                    <Mic size={12} className="text-emerald-400" />
                    {session.voice}
                  </span>
                  <span className="flex items-center gap-1" title="Paced Breathing">
                    <Wind size={12} className="text-teal-400" />
                    {session.breathTechnique}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {session.isCustom && onDeleteCustomSession && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomSession(session.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                      title="Delete Custom Session"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onPlaySession(session)}
                    className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium text-xs border border-emerald-500/40 transition cursor-pointer"
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
