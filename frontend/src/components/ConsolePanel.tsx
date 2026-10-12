import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Play,
  Square,
  Copy,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
  FileText,
  Check,
  CornerDownLeft
} from 'lucide-react';
import { ExecutionResponse } from '../types';

interface ConsolePanelProps {
  executionResult: ExecutionResponse | null;
  isRunning: boolean;
  stdin: string;
  onChangeStdin: (val: string) => void;
  onClearOutput: () => void;
  onJumpToError: (line: number, column?: number) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  height: number;
  onResize: (newHeight: number) => void;
  onRunCode?: () => void;
  interactiveOutput?: string;
  onSendInteractiveStdin?: (data: string) => void;
  onStopInteractive?: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  executionResult,
  isRunning,
  stdin,
  onChangeStdin,
  onClearOutput,
  onJumpToError,
  onShowToast,
  height,
  onResize,
  onRunCode,
  interactiveOutput = '',
  onSendInteractiveStdin,
  onStopInteractive
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'errors' | 'terminal'>('output');
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  // Automatically switch to output tab when execution starts
  React.useEffect(() => {
    if (isRunning) {
      setActiveTab('output');
    }
  }, [isRunning]);

  const handleCopy = () => {
    const text = activeTab === 'input' ? stdin : (executionResult?.output || executionResult?.stdout || executionResult?.error || executionResult?.stderr || '');
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    if (onShowToast) onShowToast('Output copied', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = executionResult?.output || executionResult?.stdout || executionResult?.error || executionResult?.stderr || '';
    if (!text) {
      if (onShowToast) onShowToast('No output to download', 'info');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeforge_output_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Output downloaded as .txt', 'success');
  };

  const handleClear = () => {
    onClearOutput();
    if (onShowToast) onShowToast('Output cleared', 'info');
  };

  // Clickable error line parsing: e.g. main.cpp:8:5: error or prog.java:5
  const renderFormattedErrors = (stderr: string) => {
    if (!stderr) return null;
    const lines = stderr.split('\n');

    return (
      <div className="space-y-1 font-mono text-xs">
        {lines.map((line, idx) => {
          // Detect patterns like file.ext:LINE:COL: error or file.ext:LINE:
          const match = line.match(/(?:[a-zA-Z0-9_\-\.]+):(\d+)(?::(\d+))?:?\s*(.*)/);
          if (match) {
            const lineNum = parseInt(match[1]);
            const colNum = match[2] ? parseInt(match[2]) : 1;
            return (
              <div
                key={idx}
                onClick={() => onJumpToError(lineNum, colNum)}
                className="p-1.5 rounded hover:bg-rose-500/15 cursor-pointer text-rose-300 hover:text-rose-200 transition-colors flex items-start space-x-2 group border border-transparent hover:border-rose-500/30"
                title={`Click to jump to line ${lineNum}`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0 group-hover:scale-110" />
                <span className="break-all">{line}</span>
                <span className="text-[10px] bg-rose-950/60 px-1.5 py-0.2 rounded text-rose-400 border border-rose-800/40 ml-auto flex-shrink-0 font-bold">
                  Jump L{lineNum}
                </span>
              </div>
            );
          }
          return (
            <div key={idx} className="text-[#8b949e] whitespace-pre-wrap">
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Compilation Error':
      case 'Runtime Error':
      case 'Execution Failed':
      case 'Error':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Time Limit Exceeded':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'Memory Limit Exceeded':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newH = Math.max(120, Math.min(window.innerHeight - 150, startHeight + deltaY));
      onResize(newH);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const outputText = executionResult?.output || executionResult?.stdout || '';
  const errorText = executionResult?.error || executionResult?.stderr || '';

  const displayOutput = interactiveOutput || outputText;

  const lastNewlineIdx = displayOutput.lastIndexOf('\n');
  const completedLines = isRunning
    ? (lastNewlineIdx !== -1 ? displayOutput.slice(0, lastNewlineIdx + 1) : '')
    : displayOutput;
  const activePrompt = isRunning
    ? (lastNewlineIdx !== -1 ? displayOutput.slice(lastNewlineIdx + 1) : displayOutput)
    : '';

  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [interactiveOutput, executionResult, isRunning]);

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = currentInput + '\n';
      if (onSendInteractiveStdin) {
        onSendInteractiveStdin(val);
      }
      setCurrentInput('');
    }
  };

  return (
    <div
      style={{ height: `${height}px` }}
      className="border-t border-[#30363d] bg-[#0d1117] flex flex-col relative select-none"
    >
      {/* Resizer Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full bg-transparent hover:bg-cyan-500/40 cursor-row-resize absolute top-0 left-0 transition-colors z-30"
        title="Drag to resize console"
      />

      {/* Console Header Bar */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-3 text-xs">
        {/* Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'output'
                ? 'bg-[#21262d] text-cyan-300'
                : 'text-[#8b949e] hover:text-[#f0f6fc]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terminal / Output</span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'input'
                ? 'bg-[#21262d] text-cyan-300'
                : 'text-[#8b949e] hover:text-[#f0f6fc]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Input (stdin)</span>
            {stdin.trim() && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'errors'
                ? 'bg-[#21262d] text-rose-300'
                : 'text-[#8b949e] hover:text-[#f0f6fc]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Errors</span>
            {errorText && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Execution Metrics & Header Actions */}
        <div className="flex items-center space-x-3 text-xs">
          {isRunning && onStopInteractive && (
            <button
              type="button"
              onClick={onStopInteractive}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm animate-pulse"
              title="Terminate running process"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {executionResult && (
            <div className="hidden sm:flex items-center space-x-3 text-[11px] text-[#8b949e]">
              <span className={`px-2 py-0.5 rounded border font-semibold ${getStatusBadge(executionResult.status)}`}>
                {executionResult.status}
              </span>
              <span className="flex items-center space-x-1 font-mono">
                <Clock className="w-3 h-3 text-[#6e7681]" />
                <span>{executionResult.execution_time}s</span>
              </span>
              {executionResult.memory_mb ? (
                <span className="flex items-center space-x-1 font-mono">
                  <HardDrive className="w-3 h-3 text-[#6e7681]" />
                  <span>{executionResult.memory_mb} MB</span>
                </span>
              ) : null}
            </div>
          )}

          <div className="flex items-center space-x-1 border-l border-[#30363d] pl-2">
            <button
              onClick={handleCopy}
              className="p-1 rounded text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]"
              title="Copy output"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1 rounded text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]"
              title="Download output as .txt"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClear}
              className="p-1 rounded text-[#8b949e] hover:text-rose-400 hover:bg-[#21262d]"
              title="Clear output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs select-text">
        {/* Output / Interactive Terminal Tab */}
        {activeTab === 'output' && (
          <div
            ref={terminalScrollRef}
            onClick={() => {
              if (isRunning && terminalInputRef.current) {
                terminalInputRef.current.focus();
              }
            }}
            className="h-full flex flex-col justify-between overflow-y-auto cursor-text select-text"
          >
            <div>
              {isRunning && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363d]/60 text-xs">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                    <span className="font-semibold text-[11px] uppercase tracking-wider">Interactive Process Live</span>
                  </div>
                  <span className="text-[10px] text-[#8b949e]">Type input at prompt & press Enter</span>
                </div>
              )}

              {/* Display completed lines of output */}
              {displayOutput ? (
                <pre className="text-[#f0f6fc] whitespace-pre-wrap leading-relaxed font-mono">
                  {completedLines}
                </pre>
              ) : null}

              {/* If process is running, show active prompt and interactive input caret */}
              {isRunning ? (
                <div className="flex items-baseline font-mono text-xs leading-relaxed text-[#f0f6fc] mt-0.5">
                  {activePrompt ? (
                    <span className="text-[#f0f6fc] whitespace-pre font-mono">{activePrompt}</span>
                  ) : (
                    <span className="text-cyan-400 font-bold mr-1.5 select-none font-mono">❯</span>
                  )}
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={currentInput}
                    onChange={e => setCurrentInput(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-cyan-300 ml-1 caret-cyan-400 p-0 m-0"
                    placeholder=""
                  />
                  <span className="text-[#6e7681] text-[10px] select-none ml-2 flex items-center space-x-0.5">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    <span>Enter</span>
                  </span>
                </div>
              ) : null}

              {/* If not running and no output yet */}
              {!isRunning && !displayOutput && !errorText && (
                <div className="text-[#6e7681] flex flex-col items-center justify-center py-8 text-center select-none">
                  <Play className="w-8 h-8 text-[#30363d] mb-2" />
                  <span className="font-semibold text-white text-xs mb-1">Interactive Terminal Ready</span>
                  <span className="text-[11px]">Click "Run Code" above to start execution and interact with stdin in real-time.</span>
                </div>
              )}

              {/* Error diagnostics if any */}
              {errorText && (
                <div className="mt-3 pt-3 border-t border-[#30363d]">
                  <div className="text-rose-400 font-bold mb-1 flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{executionResult?.status === 'Compilation Error' ? 'COMPILATION ERROR' : 'ERROR'}</span>
                  </div>
                  {renderFormattedErrors(errorText)}
                </div>
              )}
            </div>

            {/* Status Summary Divider when execution finished */}
            {!isRunning && executionResult && (
              <div className="pt-3 mt-4 border-t border-[#30363d]/70 flex flex-wrap items-center justify-between gap-4 text-xs text-[#8b949e]">
                <div className="flex items-center space-x-3">
                  <div>
                    Status:{' '}
                    <strong className={`font-semibold ${executionResult.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {executionResult.status}
                    </strong>
                  </div>
                  <div>
                    Exit code: <strong className="text-white font-mono">{executionResult.exit_code}</strong>
                  </div>
                  <div>
                    Execution time: <strong className="text-white font-mono">{executionResult.execution_time}s</strong>
                  </div>
                  {executionResult.memory_mb ? (
                    <div>
                      Memory: <strong className="text-white font-mono">{executionResult.memory_mb} MB</strong>
                    </div>
                  ) : null}
                </div>
                <div className="text-[11px] text-[#6e7681]">
                  Process exited with code {executionResult.exit_code} ({executionResult.status})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Tab (Terminal Style Stdin) */}
        {activeTab === 'input' && (
          <div className="h-full flex flex-col select-text">
            <div className="text-[11px] text-[#8b949e] mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d]/60 pb-1.5">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-[#f0f6fc]">Standard Input (stdin):</span>
                {stdin.trim() ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    ✓ {stdin.trim().split('\n').length} line(s), {stdin.length} chars
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    ⚠ Empty — programs with scanf() will fail
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onChangeStdin("Hari\n5\n10 20 30 40 50\n")}
                  className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors font-medium flex items-center space-x-1"
                  title="Load sample test input"
                >
                  <span>⚡ Load Test Input (Hari / 5 / 10 20 30 40 50)</span>
                </button>
                {stdin && (
                  <button
                    type="button"
                    onClick={() => onChangeStdin("")}
                    className="px-2 py-0.5 rounded text-[11px] bg-[#21262d] hover:bg-rose-500/20 text-[#8b949e] hover:text-rose-300 border border-[#30363d] transition-colors"
                  >
                    Clear
                  </button>
                )}
                <span className="text-cyan-400 font-mono text-[10px]">Ctrl+Enter to Run</span>
              </div>
            </div>
            <textarea
              id="codeforge-stdin-input"
              value={stdin}
              onChange={e => {
                const stdinValue = e.target.value;
                console.log("STDIN UI VALUE:", JSON.stringify(stdinValue));
                onChangeStdin(stdinValue);
              }}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (onRunCode) onRunCode();
                }
              }}
              placeholder="Type or paste input here line by line (required for scanf)...&#10;Example:&#10;Hari&#10;5&#10;10 20 30 40 50"
              className="flex-1 w-full bg-[#0b0e14] border border-[#30363d] rounded p-2.5 text-[#f0f6fc] placeholder-[#6e7681]/70 outline-none font-mono text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 resize-none leading-relaxed select-text"
            />
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div>
            {errorText ? (
              <div>
                <div className="text-rose-400 font-bold mb-2 uppercase tracking-wide flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{executionResult?.status === 'Compilation Error' ? 'COMPILATION ERROR' : 'RUNTIME ERROR / DIAGNOSTICS'}</span>
                </div>
                {renderFormattedErrors(errorText)}
              </div>
            ) : (
              <div className="text-emerald-400 flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
                <span className="font-semibold text-white text-xs mb-1">No errors</span>
                <span className="text-[11px] text-[#8b949e]">Your latest execution completed without errors.</span>
              </div>
            )}
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="text-xs text-[#8b949e] space-y-2">
            <div className="text-cyan-400 font-semibold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              <span>CodeForge Cloud Sandbox v1.0.0</span>
            </div>
            <div>Architecture: Isolated Subprocess & Container Sandbox</div>
            <div>Supported Languages: C, C++, Python, Java, JavaScript</div>
            <div className="text-[#f0f6fc] pt-2">
              Status: Ready. Standard input is piped directly to the user process.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
