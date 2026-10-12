import React from 'react';
import {
  Code2,
  Play,
  Sparkles,
  ShieldCheck,
  Activity,
  FolderKanban,
  Trophy,
  ArrowRight,
  Terminal,
  Cpu,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface LandingPageProps {
  onStartCoding: () => void;
  onExplorePractice: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCoding,
  onExplorePractice,
  onOpenAuth
}) => {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col selection:bg-cyan-500/30">
      {/* Navigation */}
      <nav className="h-16 border-b border-[#30363d]/70 px-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onStartCoding}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-mono font-bold text-white text-base">&lt;/&gt;</span>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
            CodeForge
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium">
          <button
            onClick={onExplorePractice}
            className="px-3 py-1.5 rounded-lg text-[#8b949e] hover:text-white transition-colors"
          >
            Practice Arena
          </button>
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onStartCoding}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/40 transition-all active:scale-95"
          >
            Open IDE →
          </button>
        </div>
      </nav>

      {/* Hero Section (Section 27) */}
      <section className="flex-1 max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Online Compiler & AI Assistant</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Code. Run. Learn. Build.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-[#8b949e] max-w-2xl leading-relaxed">
          A modern online coding environment with secure execution and AI-powered development assistance.
          Run C, C++, Python, Java, and JavaScript inside lightning-fast isolated sandboxes.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onStartCoding}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Coding</span>
          </button>
          <button
            onClick={onExplorePractice}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] text-white font-semibold text-sm border border-[#30363d] flex items-center justify-center space-x-2 transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Explore Practice Arena</span>
          </button>
        </div>

        {/* IDE Preview Mockup */}
        <div className="mt-14 w-full rounded-2xl border border-[#30363d] bg-[#161b22] p-2.5 shadow-2xl shadow-cyan-950/20">
          <div className="rounded-xl bg-[#0b0e14] border border-[#30363d]/50 p-4 text-left font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]/50 text-[#8b949e]">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-white text-xs pl-2">main.c — CodeForge Sandbox</span>
              </div>
              <span className="text-cyan-400 text-[11px]">GCC 14 (Isolated Container)</span>
            </div>
            <pre className="text-cyan-300 pt-3 leading-relaxed">
{`#include <stdio.h>

int main() {
    printf("Code. Run. Learn. Build.\\n");
    return 0;
}`}
            </pre>
            <div className="mt-4 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-emerald-400">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status: Accepted (0.04s • 8.2 MB)</span>
              </span>
              <span className="text-[#8b949e]">Output: Code. Run. Learn. Build.</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Section 27) */}
        <div className="mt-20 w-full text-left">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Engineered for Developers</h2>
            <p className="text-xs sm:text-sm text-[#8b949e] mt-2">
              Everything you need for fast coding, competitive programming, and AI tutoring in one unified IDE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-cyan-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1.5">Multi-Language Compiler</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Native compilation and execution for C, C++, Python, Java, and JavaScript with instant feedback and stdin support.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-purple-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1.5">AI Coding Assistant</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                CodeForge AI explains algorithms, diagnoses bugs, suggests optimal Big-O algorithmic fixes, and translates between languages.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-emerald-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1.5">Secure Execution Sandbox</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Zero arbitrary server execution. Strict container boundaries with memory limits, timeouts, and sanitized processes.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1.5">Visual Debugging</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Step-by-step state inspection. Inspect variable values, array index representations, and linked list node traversal graphs.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-cyan-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <FolderKanban className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1.5">Workspace Explorer</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Organize and manage multiple source files with headers, utilities, input files, auto-saving, and quick file search.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1.5">Coding Practice Arena</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Solve algorithmic challenges like Two Sum and Palindrome Number with automated public and hidden test case verdicts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#30363d] py-6 px-6 text-center text-xs text-[#6e7681]">
        CodeForge &copy; 2026 — Designed for high-performance online compilation and AI pair programming.
      </footer>
    </div>
  );
};
