import React, { useState } from 'react';
import {
  Sparkles,
  Bug,
  Wrench,
  Zap,
  BookOpen,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Send,
  Loader2,
  Code2,
  Terminal,
  FileCode
} from 'lucide-react';
import { SupportedLanguage, AIResponse } from '../types';

interface AIAssistantPanelProps {
  currentLanguage: SupportedLanguage;
  currentCode: string;
  selectedCode: string;
  stdin?: string;
  latestOutput?: string;
  latestError?: string;
  onApplyFix: (fixedCode: string) => void;
  onInsertCode?: (codeToInsert: string) => void;
  onClose: () => void;
  onCallAI: (
    action: string,
    prompt?: string
  ) => Promise<AIResponse>;
}

// Lightweight Tokenizer for Safe Syntax Highlighting
interface CodeToken {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'number' | 'type' | 'default';
}

function tokenizeLine(line: string): CodeToken[] {
  if (!line) return [{ text: '', type: 'default' }];

  // Regex capturing: 1) Comments, 2) Strings, 3) Keywords, 4) Numbers, 5) Others
  const pattern = /(\/\/.*$|#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:def|class|return|if|else|elif|for|while|import|from|in|as|try|except|finally|with|async|await|const|let|var|function|int|char|float|double|void|bool|include|struct|typedef|public|private|static|new|switch|case|break|continue|default|typeof|instanceof|None|True|False|true|false|null|undefined|NULL)\b)|(\b\d+(?:\.\d+)?\b)|([^\s\w"'/`#]+|\w+|\s+)/g;

  const tokens: CodeToken[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match[1]) {
      tokens.push({ text: match[1], type: 'comment' });
    } else if (match[2]) {
      tokens.push({ text: match[2], type: 'string' });
    } else if (match[3]) {
      tokens.push({ text: match[3], type: 'keyword' });
    } else if (match[4]) {
      tokens.push({ text: match[4], type: 'number' });
    } else if (match[5]) {
      tokens.push({ text: match[5], type: 'default' });
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, type: 'default' }];
}

// Dedicated Syntax-Highlighted Code Block
const HighlightedCodeBlock: React.FC<{
  code: string;
  language: string;
  title?: string;
}> = ({ code, language, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg overflow-hidden my-2.5 font-mono text-[11px] shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d] text-[10px]">
        <div className="flex items-center space-x-1.5 text-[#8b949e]">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-cyan-300 uppercase">{language || 'code'}</span>
          {title && <span className="text-[#6e7681]">({title})</span>}
        </div>
        <button
          onClick={handleCopy}
          className="px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white flex items-center space-x-1 border border-[#30363d] transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Line Numbers */}
      <pre className="p-3 overflow-x-auto text-[#f0f6fc] leading-5 font-mono">
        {lines.map((line, idx) => (
          <div key={idx} className="table-row">
            <span className="table-cell select-none text-right pr-3 text-[#484f58] text-[10px] w-6">
              {idx + 1}
            </span>
            <span className="table-cell whitespace-pre">
              {tokenizeLine(line).map((token, tIdx) => {
                let colorClass = 'text-[#f0f6fc]';
                if (token.type === 'keyword') colorClass = 'text-purple-400 font-semibold';
                else if (token.type === 'string') colorClass = 'text-emerald-300';
                else if (token.type === 'comment') colorClass = 'text-neutral-500 italic';
                else if (token.type === 'number') colorClass = 'text-amber-300';
                return (
                  <span key={tIdx} className={colorClass}>
                    {token.text}
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
};

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentLanguage,
  currentCode,
  selectedCode,
  stdin = '',
  latestOutput = '',
  latestError = '',
  onApplyFix,
  onClose,
  onCallAI
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeResponse, setActiveResponse] = useState<AIResponse | null>(null);
  const [copiedResponseCode, setCopiedResponseCode] = useState(false);

  // Formats active editor context strictly per specifications
  const buildStructuredPrompt = (customNote?: string): string => {
    const codeToAnalyze = selectedCode.trim() ? selectedCode : currentCode;
    const parts = [
      `Language: ${currentLanguage.toUpperCase()}`,
      '',
      'Source:',
      codeToAnalyze.trim() ? codeToAnalyze : '[empty]',
      '',
      'Input:',
      stdin && stdin.trim() ? stdin.trim() : '[none]',
      '',
      'Output:',
      latestOutput && latestOutput.trim() ? latestOutput.trim() : '[none]',
      '',
      'Error:',
      latestError && latestError.trim() ? latestError.trim() : '[none]'
    ];

    if (customNote && customNote.trim()) {
      parts.push('', 'User Note:', customNote.trim());
    }

    return parts.join('\n');
  };

  const handleAction = async (action: string, customPromptText?: string) => {
    // Prevent duplicate requests while one is running
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    const structuredPrompt = buildStructuredPrompt(customPromptText);

    try {
      const res = await onCallAI(action, structuredPrompt);
      setActiveResponse(res);
      setPromptInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete AI request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponseCode(true);
    setTimeout(() => setCopiedResponseCode(false), 2000);
  };

  // Render markdown-like sections cleanly with formatted headers and code blocks
  const renderAIContent = (content: string) => {
    const paragraphs = content.split('\n\n');

    return (
      <div className="text-xs text-[#f0f6fc] space-y-3 leading-relaxed font-sans">
        {paragraphs.map((paragraph, idx) => {
          // Headers
          if (paragraph.startsWith('### ')) {
            return (
              <h3 key={idx} className="font-bold text-sm text-cyan-300 pt-1 pb-1 border-b border-[#30363d]/70 flex items-center space-x-1.5">
                <span>{paragraph.replace('### ', '')}</span>
              </h3>
            );
          }
          if (paragraph.startsWith('#### ')) {
            return (
              <h4 key={idx} className="font-semibold text-xs text-purple-300 pt-1">
                {paragraph.replace('#### ', '')}
              </h4>
            );
          }

          // Fenced Code Blocks
          if (paragraph.startsWith('```')) {
            const lines = paragraph.split('\n');
            const langSpec = lines[0].replace('```', '').trim() || currentLanguage;
            const codeBody = lines.slice(1, -1).join('\n');
            return (
              <HighlightedCodeBlock
                key={idx}
                code={codeBody}
                language={langSpec}
              />
            );
          }

          // Bullet points or numbered lists
          if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
            const items = paragraph.split('\n').filter(l => l.trim().length > 0);
            return (
              <ul key={idx} className="space-y-1 pl-2">
                {items.map((item, iIdx) => {
                  const cleaned = item.replace(/^-\s*/, '');
                  return (
                    <li key={iIdx} className="flex items-start space-x-1.5 text-[#c9d1d9]">
                      <span className="text-cyan-400 mt-1 flex-shrink-0">•</span>
                      <span>{renderInlineFormatting(cleaned)}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          return (
            <div key={idx} className="text-[#c9d1d9] whitespace-pre-wrap">
              {renderInlineFormatting(paragraph)}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper to render bold and inline code in text
  const renderInlineFormatting = (text: string) => {
    // Simple inline formatting for **bold** and `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1 py-0.5 rounded bg-[#0b0e14] border border-[#30363d] text-cyan-300 font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const hasProposedFix = activeResponse?.action === 'fix' && !!activeResponse?.generated_code;

  return (
    <aside className="w-80 sm:w-96 bg-[#161b22] border-l border-[#30363d] flex flex-col h-[calc(100vh-3.5rem)] select-none text-[#f0f6fc] z-20">
      {/* Panel Header */}
      <div className="h-10 px-3.5 border-b border-[#30363d] bg-[#0b0e14] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-xs tracking-tight bg-gradient-to-r from-purple-300 via-cyan-300 to-white bg-clip-text text-transparent">
            CodeForge AI Assistant
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
          title="Close AI Assistant Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Context Badge */}
      <div className="px-3 py-1.5 bg-[#0e131a] border-b border-[#30363d] text-[11px] flex items-center justify-between text-[#8b949e]">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 font-mono text-cyan-300">
            <FileCode className="w-3 h-3 text-cyan-400" />
            <span className="uppercase">{currentLanguage}</span>
          </span>
          {selectedCode.trim() && (
            <span className="text-[10px] bg-purple-950/60 border border-purple-500/40 text-purple-300 px-1.5 py-0.2 rounded font-mono">
              {selectedCode.split('\n').length} lines selected
            </span>
          )}
        </div>
        {latestError.trim() ? (
          <span className="text-[10px] bg-rose-950/60 border border-rose-500/40 text-rose-300 px-1.5 py-0.5 rounded flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Active Error</span>
          </span>
        ) : latestOutput.trim() ? (
          <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Output ready</span>
          </span>
        ) : null}
      </div>

      {/* Primary Actions: 1. Explain Code, 2. Find Error, 3. Fix Code, 4. Optimize Code */}
      <div className="p-3 border-b border-[#30363d] bg-[#161b22] space-y-2">
        <div className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider flex items-center justify-between">
          <span>AI Actions</span>
          {isLoading && (
            <span className="text-cyan-400 text-[10px] flex items-center space-x-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing...</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {/* 1. Explain Code */}
          <button
            onClick={() => handleAction('explain')}
            disabled={isLoading}
            className="flex items-center space-x-2 p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs text-[#f0f6fc] transition-all border border-[#30363d] hover:border-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed group text-left"
            title="Explain current code in beginner-friendly language"
          >
            <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <div className="font-medium truncate">Explain Code</div>
              <div className="text-[9px] text-[#8b949e] truncate">Beginner overview</div>
            </div>
          </button>

          {/* 2. Find Error */}
          <button
            onClick={() => handleAction('find_error')}
            disabled={isLoading}
            className="flex items-center space-x-2 p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs text-[#f0f6fc] transition-all border border-[#30363d] hover:border-rose-500/40 disabled:opacity-50 disabled:cursor-not-allowed group text-left"
            title="Analyze compiler or runtime error and where it happened"
          >
            <Bug className="w-4 h-4 text-rose-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <div className="font-medium truncate">Find Error</div>
              <div className="text-[9px] text-[#8b949e] truncate">Cause, spot & fix</div>
            </div>
          </button>

          {/* 3. Fix Code */}
          <button
            onClick={() => handleAction('fix')}
            disabled={isLoading}
            className="flex items-center space-x-2 p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs text-[#f0f6fc] transition-all border border-[#30363d] hover:border-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed group text-left"
            title="Return a corrected version of the code"
          >
            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <div className="font-medium truncate">Fix Code</div>
              <div className="text-[9px] text-[#8b949e] truncate">Generate repair</div>
            </div>
          </button>

          {/* 4. Optimize Code */}
          <button
            onClick={() => handleAction('optimize')}
            disabled={isLoading}
            className="flex items-center space-x-2 p-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs text-[#f0f6fc] transition-all border border-[#30363d] hover:border-yellow-500/40 disabled:opacity-50 disabled:cursor-not-allowed group text-left"
            title="Suggest improvements for readability, perf, data structures, and complexities"
          >
            <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <div className="font-medium truncate">Optimize Code</div>
              <div className="text-[9px] text-[#8b949e] truncate">Perf & complexity</div>
            </div>
          </button>
        </div>

      </div>

      {/* Assistant Main Content / Response Display Area */}
      <div className="flex-1 p-3.5 overflow-y-auto select-text space-y-3">
        {/* Error Alert Message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-rose-300">AI Request Notice</div>
              <p className="text-[11px] text-rose-200/90 leading-normal">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 py-16">
            <div className="relative">
              <Loader2 className="w-9 h-9 text-cyan-400 animate-spin" />
              <Sparkles className="w-4 h-4 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs font-medium text-[#f0f6fc]">CodeForge AI analyzing code...</div>
              <div className="text-[11px] text-[#8b949e]">Inspecting syntax, runtime context & logic</div>
            </div>
          </div>
        ) : activeResponse ? (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* "Apply Fix" Banner - ONLY when response contains a proposed corrected code version */}
            {hasProposedFix && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-2.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-emerald-300">Proposed Code Fix Ready</div>
                    <div className="text-[10px] text-emerald-400/80">Click Apply Fix to update editor</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleCopyText(activeResponse.generated_code!)}
                    className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-[#f0f6fc] flex items-center space-x-1 border border-[#30363d] transition-colors"
                    title="Copy corrected code"
                  >
                    {copiedResponseCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onApplyFix(activeResponse.generated_code!)}
                    className="px-3 py-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs text-white font-medium flex items-center space-x-1.5 shadow-sm transition-all hover:scale-[1.02]"
                    title="Apply corrected code to editor without overwriting unsaved work silently"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Apply Fix</span>
                  </button>
                </div>
              </div>
            )}

            {/* Render Formatted AI Content */}
            {renderAIContent(activeResponse.content)}
          </div>
        ) : (
          /* Empty / Default State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#6e7681] space-y-2 py-16">
            <div className="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center mb-1">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-xs font-semibold text-[#c9d1d9]">CodeForge AI Assistant</div>
            <div className="text-[11px] text-[#8b949e] max-w-xs leading-relaxed">
              Click an action above to <strong>Explain Code</strong>, <strong>Find Error</strong>, <strong>Fix Code</strong>, or <strong>Optimize Code</strong> using the active editor context.
            </div>
          </div>
        )}
      </div>

      {/* Custom Prompt Input */}
      <div className="p-3 border-t border-[#30363d] bg-[#0b0e14]">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (promptInput.trim() && !isLoading) {
              if (
                promptInput.toLowerCase().startsWith('create ') ||
                promptInput.toLowerCase().startsWith('generate ')
              ) {
                handleAction('generate', promptInput.trim());
              } else {
                handleAction('ask', promptInput.trim());
              }
            }
          }}
          className="flex items-center space-x-1.5 bg-[#161b22] border border-[#30363d] rounded-lg p-1.5 focus-within:border-cyan-500 transition-colors"
        >
          <input
            type="text"
            placeholder="Ask AI or specify custom instructions..."
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent px-2 py-1 text-xs text-[#f0f6fc] placeholder-[#6e7681] outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !promptInput.trim()}
            className="p-1.5 rounded-md bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white disabled:opacity-40 transition-opacity"
            title="Send prompt to AI"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>
    </aside>
  );
};
