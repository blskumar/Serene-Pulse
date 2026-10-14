/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { MeditationSession, JournalEntry } from './types';
import { PRESET_SESSIONS } from './data/presetSessions';
import { Navbar, NavTab } from './components/Navbar';
import { SanctuaryLibrary } from './components/SanctuaryLibrary';
import { SessionCreator } from './components/SessionCreator';
import { ZenChatbot } from './components/ZenChatbot';
import { BreathingGuide } from './components/BreathingGuide';
import { MeditationStats } from './components/MeditationStats';
import { MeditationPlayer } from './components/MeditationPlayer';
import { soundscapeAudio } from './services/soundscapeAudio';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  saveJournalEntryToCloud,
  subscribeToUserJournal,
} from './services/firebase';

const STORAGE_KEY_SESSIONS = 'serenepulse_custom_sessions';
const STORAGE_KEY_JOURNAL = 'serenepulse_journal_entries';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('sanctuary');
  const [activeSession, setActiveSession] = useState<MeditationSession | null>(null);

  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Load custom sessions from localStorage
  const [customSessions, setCustomSessions] = useState<MeditationSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load journal entries from localStorage (serves as initial / offline store)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JOURNAL);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Draft session parameters passed from chatbot recommendation
  const [creatorInitialValues, setCreatorInitialValues] = useState<
    Partial<MeditationSession> | undefined
  >(undefined);

  // Combined sessions list: custom sessions first, then presets
  const allSessions = [...customSessions, ...PRESET_SESSIONS];

  // Persist custom sessions to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(customSessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  }, [customSessions]);

  // Persist journal entries to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(journalEntries));
    } catch (e) {
      console.warn('Failed to save journal to localStorage:', e);
    }
  }, [journalEntries]);

  // Firebase Auth state listener and real-time Firestore sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 1. Sync any local entries to cloud if not already synced
        try {
          const savedLocal = localStorage.getItem(STORAGE_KEY_JOURNAL);
          if (savedLocal) {
            const localEntries: JournalEntry[] = JSON.parse(savedLocal);
            for (const item of localEntries) {
              await saveJournalEntryToCloud(currentUser.uid, item);
            }
          }
        } catch (e) {
          console.warn('Local entries cloud sync warning:', e);
        }

        // 2. Subscribe to user's journal entries in Firestore
        const unsubscribeJournal = subscribeToUserJournal(
          currentUser.uid,
          (cloudEntries) => {
            if (cloudEntries.length > 0) {
              setJournalEntries(cloudEntries);
            }
          },
          (err) => console.warn('Firestore subscription error:', err)
        );

        return () => {
          unsubscribeJournal();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Google Login & Logout handlers
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthNotice(null);
    try {
      const loggedUser = await loginWithGoogle();
      setUser(loggedUser);
      setAuthNotice(`Welcome, ${loggedUser.displayName || 'Mindful Seeker'}! Cloud journal active.`);
      setTimeout(() => setAuthNotice(null), 4000);
    } catch (err: any) {
      if (!err?.message?.includes('popup-closed-by-user')) {
        console.warn('Google login warning:', err?.message);
        setAuthNotice('Could not connect to Google account. Please try again.');
        setTimeout(() => setAuthNotice(null), 4000);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setAuthNotice('Signed out. Journal saved locally on this device.');
      setTimeout(() => setAuthNotice(null), 4000);
    } catch (err: any) {
      console.warn('Logout error:', err?.message);
    }
  };

  // Handlers for session creation and audio updates
  const handleSessionCreated = (newSession: MeditationSession) => {
    setCustomSessions((prev) => [newSession, ...prev]);
  };

  const handleUpdateSessionAudio = (sessionId: string, audioBase64: string) => {
    setCustomSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, audioBase64 } : s))
    );
    if (activeSession && activeSession.id === sessionId) {
      setActiveSession({ ...activeSession, audioBase64 });
    }
  };

  const handleDeleteCustomSession = (id: string) => {
    setCustomSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCompleteSession = (data: {
    sessionId: string;
    durationMinutes: number;
    stressBefore: number;
    calmnessAfter: number;
    notes: string;
  }) => {
    const sessionTitle =
      allSessions.find((s) => s.id === data.sessionId)?.title || 'Mindful Practice';

    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      sessionId: data.sessionId,
      sessionTitle,
      date: new Date().toISOString(),
      durationMinutes: data.durationMinutes,
      stressBefore: data.stressBefore,
      calmnessAfter: data.calmnessAfter,
      notes: data.notes,
    };

    setJournalEntries((prev) => [newEntry, ...prev]);

    // Save to Firestore if user is authenticated with Google
    if (user) {
      saveJournalEntryToCloud(user.uid, newEntry).catch((err) =>
        console.warn('Firestore cloud save error:', err)
      );
    }
  };

  const handleAddManualJournalEntry = (newEntry: JournalEntry) => {
    setJournalEntries((prev) => [newEntry, ...prev]);
    if (user) {
      saveJournalEntryToCloud(user.uid, newEntry).catch((err) =>
        console.warn('Firestore cloud save error:', err)
      );
    }
  };

  const handleApplySessionIdea = (topic: string, intent: string) => {
    setCreatorInitialValues({
      title: topic,
      description: intent,
    });
    setActiveTab('creator');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar with Google Login */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'creator') {
            setCreatorInitialValues(undefined);
          }
        }}
        customCount={customSessions.length}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
      />

      {/* Global Auth Feedback Toast */}
      {authNotice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/40 text-xs text-emerald-200 backdrop-blur-xl shadow-2xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{authNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'sanctuary' && (
          <SanctuaryLibrary
            sessions={allSessions}
            onPlaySession={(s) => setActiveSession(s)}
            onCreateNew={() => setActiveTab('creator')}
            onDeleteCustomSession={handleDeleteCustomSession}
            user={user}
          />
        )}

        {activeTab === 'creator' && (
          <SessionCreator
            initialValues={creatorInitialValues}
            onSessionCreated={handleSessionCreated}
            onPlaySession={(s) => setActiveSession(s)}
          />
        )}

        {activeTab === 'chat' && (
          <ZenChatbot onApplySessionIdea={handleApplySessionIdea} />
        )}

        {activeTab === 'breathing' && (
          <div className="max-w-xl mx-auto p-6 text-center animate-fade-in space-y-6 pt-10">
            <div>
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                Sacred Breath Sanctuary
              </span>
              <h2 className="text-3xl font-serif-zen font-medium text-white tracking-wide mt-1">
                Centering The Mind & Vagus Nerve
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                Sync your breathing with the expanding mandala. Just 2 minutes of paced breathing lowers cortisol and stimulates parasympathetic calm.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl">
              <BreathingGuide
                technique="box"
                initialMinutes={2}
                onComplete={(durationMinutes) => {
                  handleCompleteSession({
                    sessionId: 'sacred-breathwork',
                    durationMinutes,
                    stressBefore: 6,
                    calmnessAfter: 9,
                    notes: `Mindful breathwork practice (${durationMinutes} min) completed in Sacred Breath Sanctuary.`,
                  });
                }}
              />
            </div>

            {/* Quick soundscape background toggle */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-xs text-slate-500 mr-2">Ambient Backdrop:</span>
              {[
                { id: 'singing-bowls', label: '🥣 Singing Bowls' },
                { id: 'ocean', label: '🌊 Ocean' },
                { id: 'forest-rain', label: '🌧️ Rain' },
                { id: 'theta-binaural', label: '🧠 4Hz Theta' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => soundscapeAudio.play(item.id as any)}
                  className="px-3 py-1 rounded-full text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => soundscapeAudio.stop()}
                className="px-3 py-1 rounded-full text-xs text-rose-400 hover:text-rose-300 bg-slate-800/80 border border-slate-700 transition cursor-pointer"
              >
                Mute
              </button>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <MeditationStats
            entries={journalEntries}
            sessions={allSessions}
            onPlaySession={(s) => setActiveSession(s)}
            onAddEntry={handleAddManualJournalEntry}
            user={user}
            onLogin={handleLogin}
          />
        )}
      </main>

      {/* Active Meditation Player (Fullscreen or Modal) */}
      {activeSession && (
        <MeditationPlayer
          session={activeSession}
          onClose={() => setActiveSession(null)}
          onComplete={handleCompleteSession}
          onUpdateSessionAudio={handleUpdateSessionAudio}
        />
      )}
    </div>
  );
}
