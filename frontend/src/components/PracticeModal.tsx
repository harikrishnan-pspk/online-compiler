import React, { useState, useEffect } from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  Code2,
  Loader2,
  X,
  FileCode,
  Check
} from 'lucide-react';
import { ProblemListItem, ProblemDetail, ProblemSubmitResponse, SupportedLanguage } from '../types';
import { api } from '../services/api';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProblemToIDE: (problem: ProblemDetail, language: SupportedLanguage) => void;
  currentLanguage: SupportedLanguage;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({
  isOpen,
  onClose,
  onLoadProblemToIDE,
  currentLanguage
}) => {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('two-sum');
  const [problemDetail, setProblemDetail] = useState<ProblemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [solutionCode, setSolutionCode] = useState('');
  const [submissionResult, setSubmissionResult] = useState<ProblemSubmitResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<SupportedLanguage>(currentLanguage);

  useEffect(() => {
    if (isOpen) {
      loadProblems();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSlug) {
      loadProblemDetail(selectedSlug);
    }
  }, [selectedSlug, lang]);

  const loadProblems = async () => {
    try {
      const data = await api.getProblems();
      setProblems(data);
      if (data.length > 0 && !selectedSlug) {
        setSelectedSlug(data[0].slug);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadProblemDetail = async (slug: string) => {
    setIsLoading(true);
    setSubmissionResult(null);
    try {
      const p = await api.getProblem(slug);
      setProblemDetail(p);
      const starter = p.starter_templates[lang] || p.starter_templates['c'] || '';
      setSolutionCode(starter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!problemDetail) return;
    setIsSubmitting(true);
    try {
      const res = await api.submitProblem(problemDetail.id, lang, solutionCode);
      setSubmissionResult(res);
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden text-[#f0f6fc]">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#30363d] bg-[#0b0e14] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center space-x-2">
                <span>CodeForge Practice Mode</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                  Competitive Arena
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

        {/* Content Layout: Left problem statement & list, Right coding editor & test runner */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel: Problem List & Description */}
          <div className="w-full lg:w-1/2 border-r border-[#30363d] flex flex-col bg-[#0d1117] overflow-hidden">
            {/* Problem Selector Bar */}
            <div className="p-3 border-b border-[#30363d] flex items-center space-x-2 overflow-x-auto bg-[#161b22]/50">
              {problems.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedSlug(p.slug)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                    selectedSlug === p.slug
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc]'
                  }`}
                >
                  <span>{p.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-emerald-400 font-semibold">
                    {p.difficulty}
                  </span>
                </button>
              ))}
            </div>

            {/* Problem Description Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
              {isLoading || !problemDetail ? (
                <div className="flex items-center justify-center py-20 text-[#8b949e]">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading problem details...</span>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">{problemDetail.title}</h2>
                    <div className="flex items-center space-x-2 text-[11px] text-[#8b949e]">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                        {problemDetail.difficulty}
                      </span>
                      <span>Category: {problemDetail.category}</span>
                    </div>
                  </div>

                  <div className="text-[#f0f6fc] text-sm whitespace-pre-wrap">{problemDetail.description}</div>

                  <div className="space-y-2">
                    <div className="font-bold text-white uppercase text-[11px] tracking-wider text-[#8b949e]">
                      Input Format
                    </div>
                    <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d] font-mono text-xs">
                      {problemDetail.input_format}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-white uppercase text-[11px] tracking-wider text-[#8b949e]">
                      Output Format
                    </div>
                    <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d] font-mono text-xs">
                      {problemDetail.output_format}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-white uppercase text-[11px] tracking-wider text-[#8b949e]">
                      Examples
                    </div>
                    {problemDetail.examples.map((ex, idx) => (
                      <div key={idx} className="bg-[#161b22] p-3 rounded border border-[#30363d] space-y-1.5">
                        <div className="text-[11px] font-bold text-cyan-400">Example {idx + 1}:</div>
                        <div>
                          <strong className="text-[#8b949e]">Input:</strong>
                          <pre className="bg-[#0b0e14] p-1.5 rounded mt-0.5 font-mono text-[11px]">{ex.input}</pre>
                        </div>
                        <div>
                          <strong className="text-[#8b949e]">Output:</strong>
                          <pre className="bg-[#0b0e14] p-1.5 rounded mt-0.5 font-mono text-[11px]">{ex.output}</pre>
                        </div>
                        {ex.explanation && (
                          <div className="text-[#8b949e] italic pt-1">{ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-white uppercase text-[11px] tracking-wider text-[#8b949e]">
                      Constraints
                    </div>
                    <pre className="bg-[#161b22] p-2.5 rounded border border-[#30363d] font-mono text-[11px] text-amber-300">
                      {problemDetail.constraints}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Solution Editor & Test Case Results */}
          <div className="w-full lg:w-1/2 flex flex-col bg-[#161b22] overflow-hidden">
            {/* Action Bar */}
            <div className="h-10 px-4 border-b border-[#30363d] bg-[#0b0e14] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-[#8b949e]">Language:</span>
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value as SupportedLanguage)}
                  className="bg-[#161b22] border border-[#30363d] text-white px-2 py-1 rounded text-xs outline-none"
                >
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                {problemDetail && (
                  <button
                    onClick={() => {
                      onLoadProblemToIDE(problemDetail, lang);
                      onClose();
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs border border-[#30363d]"
                    title="Open problem in primary Monaco IDE workspace"
                  >
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Open in IDE</span>
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-md disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Judging...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Submit Solution</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Textarea */}
            <div className="flex-1 bg-[#0d1117] p-2 overflow-hidden flex flex-col">
              <textarea
                value={solutionCode}
                onChange={e => setSolutionCode(e.target.value)}
                className="w-full flex-1 bg-transparent border-0 outline-none text-[#f0f6fc] font-mono text-xs p-2 resize-none"
                placeholder="// Write your solution here"
                spellCheck={false}
              />
            </div>

            {/* Test Cases Results Section */}
            <div className="h-48 border-t border-[#30363d] bg-[#0b0e14] p-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-[#8b949e] tracking-wider">
                  Test Case Evaluation
                </span>
                {submissionResult && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      submissionResult.status === 'Accepted'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    Passed: {submissionResult.passed_count}/{submissionResult.total_count} ({submissionResult.status})
                  </span>
                )}
              </div>

              {!submissionResult ? (
                <div className="text-xs text-[#6e7681] py-4 text-center">
                  Submit your solution to execute against visible and hidden test cases.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {submissionResult.test_cases.map(tc => (
                    <div
                      key={tc.id}
                      className={`p-2 rounded border flex items-center justify-between text-xs font-mono ${
                        tc.passed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {tc.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span>
                          Test Case {tc.id} {tc.is_hidden ? '(Hidden)' : '(Public)'}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold">
                        {tc.passed ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
