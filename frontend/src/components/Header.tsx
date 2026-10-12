import React, { useState } from 'react';
import {
  Play,
  Save,
  Moon,
  Sun,
  Terminal,
  Activity,
  Trophy,
  User as UserIcon,
  Check,
  Loader2,
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';
import { User, SupportedLanguage } from '../types';
import { LANGUAGES, LANGUAGE_LIST } from '../utils/languages';

interface HeaderProps {
  currentFileName: string;
  currentLanguage: SupportedLanguage;
  onChangeLanguage: (newLang: SupportedLanguage) => void;
  isDirty: boolean;
  isSavedRecently: boolean;
  isRunning: boolean;
  theme: 'dark' | 'light';
  user: User | null;
  onRun: () => void;
  onSave: () => void;
  onToggleTheme: () => void;
  onOpenPractice: () => void;
  onOpenVisualizer: () => void;
  onOpenDashboard: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentFileName,
  currentLanguage,
  onChangeLanguage,
  isDirty,
  isSavedRecently,
  isRunning,
  theme,
  user,
  onRun,
  onSave,
  onToggleTheme,
  onOpenPractice,
  onOpenVisualizer,
  onOpenDashboard,
  onOpenAuth,
  onLogout,
  onOpenHistory
}) => {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const activeLangConfig = LANGUAGES[currentLanguage] || LANGUAGES.c;

  return (
    <header className="h-14 border-b border-[#30363d] bg-[#0b0e14] px-4 flex items-center justify-between select-none z-20 text-[#f0f6fc]">
      {/* Left: Branding & Feature Navigation */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <span className="font-mono font-bold text-white text-sm tracking-tighter">&lt;/&gt;</span>
          </div>
          <div>
            <div className="font-bold text-base tracking-tight flex items-center space-x-1.5">
              <span className="bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                CodeForge
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                AI IDE
              </span>
            </div>
          </div>
        </div>

        {/* Feature Nav Buttons */}
        <div className="hidden md:flex items-center space-x-1 border-l border-[#30363d] pl-4 text-xs">
          <button
            onClick={onOpenPractice}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
            title="Competitive Programming Practice"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Practice</span>
          </button>
          <button
            onClick={onOpenVisualizer}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
            title="Visualize Step-by-Step Code Execution"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Visualize</span>
          </button>
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
            title="Recent Code Executions"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>History</span>
          </button>
          <button
            onClick={onOpenDashboard}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
            title="Developer Statistics & Projects"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Center: Current Project & File Breadcrumb */}
      <div className="hidden lg:flex items-center space-x-2 text-xs bg-[#161b22] px-3 py-1.5 rounded-md border border-[#30363d]/60">
        <span className="text-[#8b949e] font-medium">Workspace</span>
        <span className="text-[#6e7681]">/</span>
        <span className="text-[#f0f6fc] font-mono font-medium flex items-center space-x-1.5">
          <span>{currentFileName}</span>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Unsaved changes" />
          )}
        </span>
      </div>

      {/* Right: Language Selector, Run, Save, Theme & Profile */}
      <div className="flex items-center space-x-2.5">
        {/* Language Selector Dropdown (Prominent in Header) */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-semibold text-[#f0f6fc] transition-all hover:border-cyan-500/50 shadow-sm"
            title="Select Programming Language"
          >
            <span className="text-xs">{activeLangConfig.icon}</span>
            <span>{activeLangConfig.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8b949e]" />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#8b949e] border-b border-[#30363d] mb-1">
                Select Language
              </div>
              {LANGUAGE_LIST.map(key => {
                const meta = LANGUAGES[key];
                const isCur = key === currentLanguage;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setIsLangDropdownOpen(false);
                      onChangeLanguage(key);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                      isCur
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                        : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <span className="text-xs">{meta.icon}</span>
                      <span className="font-mono text-[12px]">{meta.name}</span>
                    </span>
                    {isCur && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Prominent Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md font-medium text-xs shadow-md transition-all ${
            isRunning
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 active:scale-95'
          }`}
          title="Run Code (Ctrl + Enter)"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>⏳ Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>▶ Run Code</span>
              <kbd className="hidden sm:inline-block ml-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-emerald-200 border border-emerald-400/20">
                Ctrl+↵
              </kbd>
            </>
          )}
        </button>

        {/* Save Button with Unsaved Indicator */}
        <button
          onClick={onSave}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
            isSavedRecently
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
              : isDirty
              ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
              : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:text-[#f0f6fc]'
          }`}
          title="Save file (Ctrl + S)"
        >
          {isSavedRecently ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-semibold">Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isDirty ? 'Unsaved changes' : 'Save'}
              </span>
            </>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors border border-transparent hover:border-[#30363d]"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-400" />}
        </button>

        {/* User Profile / Auth */}
        {user ? (
          <div className="relative group">
            <button
              onClick={onOpenDashboard}
              className="flex items-center space-x-2 pl-2 pr-2.5 py-1 rounded-md bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-[#f0f6fc] font-medium hidden sm:inline">{user.username}</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl p-1.5 hidden group-hover:block z-50">
              <div className="px-2.5 py-1.5 border-b border-[#30363d] text-[11px] text-[#8b949e]">
                Signed in as <strong className="text-white block truncate">{user.email}</strong>
              </div>
              <button
                onClick={onOpenDashboard}
                className="w-full text-left px-2.5 py-1.5 text-xs text-[#f0f6fc] hover:bg-[#21262d] rounded flex items-center space-x-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded flex items-center space-x-2"
              >
                <span>Log out</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#1f2937] hover:bg-[#374151] border border-[#30363d] text-xs font-medium text-white transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
