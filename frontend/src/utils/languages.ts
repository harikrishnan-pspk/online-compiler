import type { SupportedLanguage } from '../types';

export interface LanguageMeta {
  id: SupportedLanguage;
  name: string;
  monacoLang: string;
  extension: string;
  defaultFilename: string;
  icon: string;
  badgeColor: string;
  template: string;
}

export const LANGUAGES: Record<SupportedLanguage, LanguageMeta> = {
  c: {
    id: 'c',
    name: 'C',
    monacoLang: 'c',
    extension: '.c',
    defaultFilename: 'main.c',
    icon: '📄',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    template: `#include <stdio.h>

int main()
{
    printf("Hello, World!\\n");
    return 0;
}
`
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    monacoLang: 'cpp',
    extension: '.cpp',
    defaultFilename: 'main.cpp',
    icon: '📄',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    template: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`
  },
  python: {
    id: 'python',
    name: 'Python',
    monacoLang: 'python',
    extension: '.py',
    defaultFilename: 'main.py',
    icon: '🐍',
    badgeColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    template: `print("Hello, World!")
`
  },
  java: {
    id: 'java',
    name: 'Java',
    monacoLang: 'java',
    extension: '.java',
    defaultFilename: 'Main.java',
    icon: '☕',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    template: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    monacoLang: 'javascript',
    extension: '.js',
    defaultFilename: 'main.js',
    icon: 'JS',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    template: `console.log("Hello, World!");
`
  }
};

export const LANGUAGE_LIST: SupportedLanguage[] = ['c', 'cpp', 'python', 'java', 'javascript'];

export function getLanguageFromFilename(filename: string): SupportedLanguage {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) return 'cpp';
  if (lower.endsWith('.c') || lower.endsWith('.h')) return 'c';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.java')) return 'java';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'javascript';
  return 'c';
}

export const SELECTED_LANG_KEY = 'codeforge_selected_language';
export const CODE_STORAGE_PREFIX = 'codeforge_code_';

/**
 * Checks whether the given text is invalid, an AI markdown response,
 * a diagnostic/debug message, test runner output, or error text rather than real source code.
 */
export function isInvalidOrAIText(code: string | null | undefined, _lang?: SupportedLanguage): boolean {
  if (!code || typeof code !== 'string') return true;
  const trimmed = code.trim();
  if (trimmed.length === 0) return true;

  // Stale placeholder from old frontend version
  if (trimmed.includes('Welcome to CodeForge Multi-File IDE!')) return true;

  // Markdown code fence leftovers
  if (trimmed.startsWith('```') || trimmed.endsWith('```')) return true;

  // AI assistant section markers or markdown headers
  // E.g., "### 🔍 Code Explanation", "### 🐛 Bug & Vulnerability", "#### Key Components:"
  // AI assistant section markers or markdown headers (when not Python code where # is comment)
  if (_lang !== 'python') {
    if (/^#{2,6}\s+/m.test(trimmed)) return true;
    if (/^#\s+(My CodeForge Project|\*\*|Title)/im.test(trimmed)) return true;
  } else {
    if (/^#{1,6}\s+(?:🔍|🐛|⚡|🤖|💡|Code Explanation|Bug & Vulnerability|Algorithmic|Key Components|Step-by-step)/im.test(trimmed)) {
      return true;
    }
  }

  const lower = trimmed.toLowerCase();

  // Common AI Assistant diagnostic phrases
  const aiPhrases = [
    'code explanation',
    'bug & vulnerability',
    'codeforge auto-fix',
    'algorithmic & performance',
    'language conversion',
    'request notice',
    'best practice recommendations',
    'codeforge ai',
    'we audited the source code',
    'applied repairs and produced',
    'no critical syntax crashes detected',
    'key components:',
    'step-by-step execution:',
    'complexity analysis:',
    'suggested optimizations:',
    'edge cases to check'
  ];

  for (const phrase of aiPhrases) {
    if (lower.includes(phrase)) return true;
  }

  // Execution runner diagnostic/error outputs mistakenly pasted into editor
  const runnerDiagnosticPhrases = [
    'websocket connection to interactive',
    'execution finished:',
    'execution completed:',
    '[process exited with code',
    'traceback (most recent call last):'
  ];

  for (const phrase of runnerDiagnosticPhrases) {
    if (lower.includes(phrase)) return true;
  }

  // Pure test case input/output formats
  if (
    (/^\s*Input:\s*\n/i.test(trimmed) && /Output:\s*/i.test(trimmed)) ||
    /^\s*Test Case \d+:/i.test(trimmed)
  ) {
    return true;
  }

  return false;
}

/**
 * Ensures clean valid source code. If the code is invalid or AI diagnostic text,
 * falls back to the clean default starter template for the specified language.
 */
export function sanitizeCode(code: string | null | undefined, lang: SupportedLanguage): string {
  const fallback = LANGUAGES[lang]?.template || LANGUAGES.c.template;
  if (!code || isInvalidOrAIText(code, lang)) {
    return fallback;
  }
  return code;
}

/**
 * Extracts pure source code if the user attempts to insert code from AI response.
 * Prevents non-code diagnostic text from entering the editor.
 */
export function extractCleanCodeFromAI(text: string, lang: SupportedLanguage): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // If text contains markdown code block, extract it
  const codeBlockMatch = trimmed.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim();
    if (!isInvalidOrAIText(extracted, lang)) {
      return extracted;
    }
  }

  // If no markdown code block, check if the raw text is clean source code
  if (!isInvalidOrAIText(trimmed, lang)) {
    return trimmed;
  }

  return null;
}

/**
 * Retrieves the persisted language or falls back to 'c'.
 */
export function getSavedLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(SELECTED_LANG_KEY);
    if (saved && saved in LANGUAGES) {
      return saved as SupportedLanguage;
    }
  } catch {}
  return 'c';
}

/**
 * Persists the selected language.
 */
export function saveSelectedLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(SELECTED_LANG_KEY, lang);
  } catch {}
}

/**
 * Retrieves saved valid user code draft for a specific language if available.
 */
export function getSavedCodeForLanguage(lang: SupportedLanguage): string | null {
  try {
    const raw = localStorage.getItem(`${CODE_STORAGE_PREFIX}${lang}`);
    if (raw && typeof raw === 'string' && raw.trim().length > 0 && !isInvalidOrAIText(raw, lang)) {
      return raw;
    }
  } catch {}
  return null;
}

/**
 * Persists valid user code draft for a specific language.
 */
export function saveCodeForLanguage(lang: SupportedLanguage, code: string): void {
  try {
    if (code && typeof code === 'string' && !isInvalidOrAIText(code, lang)) {
      localStorage.setItem(`${CODE_STORAGE_PREFIX}${lang}`, code);
    }
  } catch {}
}

/**
 * Clears saved draft for a specific language.
 */
export function clearCodeForLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.removeItem(`${CODE_STORAGE_PREFIX}${lang}`);
  } catch {}
}


