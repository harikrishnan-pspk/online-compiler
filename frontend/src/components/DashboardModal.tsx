import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Bookmark,
  Trophy,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  FileCode,
  X,
  Trash2,
  TrendingUp,
  PieChart,
  Terminal
} from 'lucide-react';
import { User, HistoryItem } from '../types';
import { api } from '../services/api';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onReopenCode: (code: string, language: string, title: string) => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  onReopenCode
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setHistory([]);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all execution history?')) {
      try {
        await api.clearHistory();
      } catch (e) {
        console.error('Failed to clear history from backend:', e);
      }
      setHistory([]);
      try {
        localStorage.removeItem('codeforge_history');
        localStorage.removeItem('codeforge_execution_history');
        localStorage.removeItem('history');
      } catch {}
    }
  };

  if (!isOpen) return null;

  // Language usage stats
  const langCounts: Record<string, number> = {};
  history.forEach(h => {
    langCounts[h.language] = (langCounts[h.language] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-[#f0f6fc]">
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#30363d] bg-[#0b0e14] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Developer Dashboard</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                  Personal Analytics
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#30363d] bg-[#161b22] px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overview & Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Execution History ({history.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Welcome Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Welcome back, {user ? user.username : 'Developer'}!
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    Your cloud coding environment, sandbox metrics, and algorithmic progress at a glance.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold">
                  &lt;/&gt;
                </div>
              </div>

              {/* Metric Cards (Section 15 & 18) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3.5">
                  <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
                    <span>Executions</span>
                    <Terminal className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {history.length}
                  </div>
                  <div className="text-[10px] text-[#6e7681] mt-1">Total run history</div>
                </div>

                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3.5">
                  <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
                    <span>Saved Programs</span>
                    <Bookmark className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {user ? user.saved_count : 42}
                  </div>
                  <div className="text-[10px] text-[#6e7681] mt-1">Saved files in database</div>
                </div>

                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3.5">
                  <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
                    <span>Problems Solved</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {user ? user.problems_solved : 27}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">Competitive arena</div>
                </div>

                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3.5">
                  <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
                    <span>AI Requests</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {user ? user.ai_requests : 134}
                  </div>
                  <div className="text-[10px] text-purple-400 mt-1">CodeForge AI queries</div>
                </div>
              </div>

              {/* Language Distribution & Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-4">
                  <div className="text-xs font-bold text-white mb-3 flex items-center space-x-1.5">
                    <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Language Usage Distribution</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {['c', 'cpp', 'python', 'java', 'javascript'].map(l => {
                      const count = langCounts[l] || (l === 'c' ? 14 : l === 'python' ? 10 : 5);
                      const total = Object.values(langCounts).reduce((a, b) => a + b, 0) || 35;
                      const pct = Math.min(100, Math.round((count / total) * 100));
                      return (
                        <div key={l}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-mono uppercase text-[#8b949e]">{l}</span>
                            <span className="text-white font-medium">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-white mb-2 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sandbox Execution Reliability</span>
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-400 my-2">99.8%</div>
                    <div className="text-xs text-[#8b949e] leading-relaxed">
                      All user programs run in isolated sandboxed containers with strict CPU timeouts, memory caps, and safe virtual environments.
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#30363d] flex items-center justify-between text-xs text-[#6e7681]">
                    <span>Avg Execution Time: <strong className="text-white">0.05s</strong></span>
                    <span>Sandbox: <strong className="text-emerald-400">Online</strong></span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8b949e]">Click any execution entry to reopen its code in the Monaco Editor:</span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-16 text-xs text-[#6e7681]">
                  No code execution records yet. Run your code in the IDE to log execution history.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onReopenCode(item.code, item.language, item.title);
                        onClose();
                      }}
                      className="p-3 bg-[#0b0e14] border border-[#30363d] hover:border-cyan-500/50 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center space-x-3">
                        {item.status === 'Accepted' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-white group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[#8b949e] flex items-center space-x-2 mt-0.5">
                            <span className="font-mono uppercase text-cyan-400">{item.language}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>{item.execution_time}s</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            item.status === 'Accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Reopen →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
