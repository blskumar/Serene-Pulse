import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Compass,
  MessageSquare,
  Wind,
  BookOpen,
  Plus,
  LogOut,
  User as UserIcon,
  Cloud,
} from 'lucide-react';

export type NavTab = 'sanctuary' | 'creator' | 'chat' | 'breathing' | 'stats';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  customCount: number;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  customCount,
  user,
  onLogin,
  onLogout,
  isLoggingIn = false,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { id: 'sanctuary', label: 'Sanctuary', icon: Compass },
    { id: 'creator', label: 'Create Session', icon: Plus },
    { id: 'chat', label: 'Zen AI Guide', icon: MessageSquare },
    { id: 'breathing', label: 'Breathwork', icon: Wind },
    { id: 'stats', label: 'Journal & Streaks', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div
          onClick={() => onTabChange('sanctuary')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="text-lg font-serif-zen font-semibold text-white tracking-wide">
              SerenePulse
            </span>
            <span className="text-[10px] text-emerald-400 block -mt-1 font-mono uppercase tracking-widest">
              Gemini Sanctuary
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-1 text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as NavTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.id === 'creator' && customCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/30 text-emerald-200">
                    {customCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Auth & Action Button */}
        <div className="flex items-center gap-2.5">
          {/* Google Sign In / User Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 transition cursor-pointer text-xs"
                title={user.email || 'Your Account'}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-emerald-400/50"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-slate-200 max-w-[110px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <Cloud size={12} className="text-emerald-400 hidden sm:inline" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in text-xs space-y-2.5">
                  <div className="border-b border-slate-800 pb-2">
                    <p className="font-medium text-white truncate">
                      {user.displayName || 'Mindful Seeker'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                      <Cloud size={11} />
                      <span>Cloud Journal Sync Active</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onTabChange('stats');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center gap-2 transition"
                  >
                    <BookOpen size={13} className="text-emerald-400" />
                    <span>View Cloud Journal & Streaks</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 flex items-center gap-2 transition"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/15 transition text-xs font-medium cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Sign in with Google to backup journal entries and daily streaks"
            >
              {/* Google G SVG */}
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
              <span>{isLoggingIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}

          {/* New Session Action */}
          <button
            onClick={() => onTabChange('creator')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar at bottom or secondary row */}
      <div className="flex md:hidden border-t border-slate-800/80 px-2 py-1 justify-around text-xs bg-slate-950">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as NavTab)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon size={16} />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
