import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  X,
  FileCode,
  Sparkles,
  ChevronDown,
  Layers,
  Wand2,
  Check,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { ProjectFile, SupportedLanguage } from '../types';
import { LANGUAGES, LanguageMeta } from '../utils/languages';

interface TabItem {
  file: ProjectFile;
  isDirty?: boolean;
}

interface MonacoCodeEditorProps {
  openTabs: TabItem[];
  activeFileId: number | null;
  onSelectTab: (fileId: number) => void;
  onCloseTab: (fileId: number) => void;
  code: string;
  language: SupportedLanguage;
  onChangeCode: (newCode: string) => void;
  onChangeLanguage: (newLang: SupportedLanguage) => void;
  onRun: () => void;
  onSave: () => void;
  onAskAIWithSelection: (selectedCode: string, actionType?: string) => void;
  jumpToLine?: { line: number; column?: number } | null;
  theme: 'dark' | 'light';
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  openTabs,
  activeFileId,
  onSelectTab,
  onCloseTab,
  code,
  language,
  onChangeCode,
  onChangeLanguage,
  onRun,
  onSave,
  onAskAIWithSelection,
  jumpToLine,
  theme
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Keep latest onRun and onSave in refs so Monaco keybindings never capture stale closures
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom VS-Code Dark modern theme
    monaco.editor.defineTheme('codeforge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'f0f6fc' }
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#f0f6fc',
        'editor.lineHighlightBackground': '#161b22',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#58a6ff',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#58a6ff'
      }
    });

    monaco.editor.setTheme(theme === 'dark' ? 'codeforge-dark' : 'vs');

    // Add Keybindings: Ctrl+Enter (Run), Ctrl+S (Save) with fresh refs
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current();
    });

    // Track text selection for "Ask AI" context popover
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        setSelectedText('');
        setSelectionPosition(null);
        return;
      }

      const model = editor.getModel();
      if (!model) return;
      const text = model.getValueInRange(selection);
      if (text.trim().length > 3) {
        setSelectedText(text);
        const scrolledPos = editor.getScrolledVisiblePosition(selection.getEndPosition());
        if (scrolledPos) {
          setSelectionPosition({
            top: Math.max(10, scrolledPos.top - 42),
            left: Math.min(window.innerWidth - 300, scrolledPos.left + 50)
          });
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    });
  };

  // Jump to specific error line when triggered from Console
  useEffect(() => {
    if (jumpToLine && editorRef.current) {
      editorRef.current.revealLineInCenter(jumpToLine.line);
      editorRef.current.setPosition({
        lineNumber: jumpToLine.line,
        column: jumpToLine.column || 1
      });
      editorRef.current.focus();
    }
  }, [jumpToLine]);

  // Update theme when toggled
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'codeforge-dark' : 'vs');
    }
  }, [theme]);

  const activeLangConfig = LANGUAGES[language] || LANGUAGES.c;

  const handleLanguageChange = (langKey: SupportedLanguage) => {
    setIsLangDropdownOpen(false);
    if (langKey === language) return;
    onChangeLanguage(langKey);
  };


  const handleResetTemplate = () => {
    if (confirm(`Reset current code to default ${activeLangConfig.name} template?`)) {
      onChangeCode(activeLangConfig.template);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden relative">
      {/* Top Editor Bar: File Tabs + Language Selector */}
      <div className="h-10 bg-[#0b0e14] border-b border-[#30363d] flex items-center justify-between select-none overflow-x-auto">
        {/* Editor Tabs */}
        <div className="flex items-center h-full overflow-x-auto flex-1 scrollbar-none">
          {openTabs.map(({ file, isDirty }) => {
            const isActive = file.id === activeFileId;
            return (
              <div
                key={file.id}
                onClick={() => onSelectTab(file.id)}
                className={`h-full px-3.5 flex items-center space-x-2 text-xs border-r border-[#30363d] cursor-pointer transition-colors max-w-[200px] ${
                  isActive
                    ? 'bg-[#0d1117] text-[#f0f6fc] border-t-2 border-t-cyan-400 font-medium'
                    : 'bg-[#161b22]/40 text-[#8b949e] hover:bg-[#161b22] hover:text-[#f0f6fc]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                {isDirty && (
                  <span className="text-cyan-400 font-bold ml-1 text-sm leading-none flex-shrink-0" title="Unsaved changes">•</span>
                )}
                {openTabs.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onCloseTab(file.id);
                    }}
                    className="p-0.5 rounded hover:bg-[#30363d] text-[#6e7681] hover:text-[#f0f6fc] flex-shrink-0 ml-1"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Language Selector Dropdown & Actions */}
        <div className="flex items-center space-x-2 px-3 border-l border-[#30363d] flex-shrink-0">
          <button
            onClick={handleResetTemplate}
            className="p-1 rounded text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            title="Reset to Template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-cyan-500/50 text-xs font-semibold text-[#f0f6fc] transition-all shadow-sm"
              title="Select Programming Language"
            >
              <span>{activeLangConfig.icon}</span>
              <span className="font-mono text-xs">{activeLangConfig.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8b949e]" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#8b949e] border-b border-[#30363d] mb-1">
                  Select Language
                </div>
                {(Object.keys(LANGUAGES) as SupportedLanguage[]).map(key => {
                  const meta = LANGUAGES[key];
                  const isCur = key === language;
                  return (
                    <button
                      key={key}
                      onClick={() => handleLanguageChange(key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                        isCur ? 'bg-cyan-500/20 text-cyan-300 font-semibold border-l-2 border-cyan-400' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]'
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <span className="text-xs">{meta.icon}</span>
                        <span className="font-mono text-xs">{meta.name}</span>
                      </span>
                      {isCur && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating "Ask AI" Context Pill on Code Selection */}
      {selectedText && selectionPosition && (
        <div
          style={{ top: `${selectionPosition.top}px`, left: `${selectionPosition.left}px` }}
          className="absolute z-40 bg-[#161b22]/95 backdrop-blur border border-purple-500/40 rounded-lg shadow-2xl shadow-purple-950/40 px-2 py-1.5 flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center space-x-1 pr-2 border-r border-[#30363d] text-[11px] font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Ask AI:</span>
          </div>
          <button
            onClick={() => onAskAIWithSelection(selectedText, 'explain')}
            className="px-2 py-0.5 rounded text-xs bg-[#21262d] hover:bg-purple-600/30 text-white hover:text-purple-200 transition-colors"
          >
            Explain
          </button>
          <button
            onClick={() => onAskAIWithSelection(selectedText, 'fix')}
            className="px-2 py-0.5 rounded text-xs bg-[#21262d] hover:bg-purple-600/30 text-white hover:text-purple-200 transition-colors"
          >
            Fix
          </button>
          <button
            onClick={() => onAskAIWithSelection(selectedText, 'optimize')}
            className="px-2 py-0.5 rounded text-xs bg-[#21262d] hover:bg-purple-600/30 text-white hover:text-purple-200 transition-colors"
          >
            Optimize
          </button>
        </div>
      )}

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language={activeLangConfig.monacoLang}
          value={code}
          onChange={val => onChangeCode(val || '')}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'codeforge-dark' : 'vs'}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, Monaco, monospace",
            fontLigatures: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            lineNumbers: 'on',
            lineDecorationsWidth: 10,
            glyphMargin: false,
            folding: true,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  );
};
