import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { MonacoCodeEditor } from '../components/MonacoCodeEditor';
import { ConsolePanel } from '../components/ConsolePanel';
import { AIAssistantPanel } from '../components/AIAssistantPanel';
import { VisualizerModal } from '../components/VisualizerModal';
import { PracticeModal } from '../components/PracticeModal';
import { DashboardModal } from '../components/DashboardModal';
import { AuthModal } from '../components/AuthModal';
import { QuickSearchModal } from '../components/QuickSearchModal';
import { ToastContainer, ToastMessage } from '../components/Toast';
import {
  ProjectFile,
  SupportedLanguage,
  ExecutionResponse,
  User,
  AIResponse,
  VisualizerResponse,
  ProblemDetail
} from '../types';
import { api } from '../services/api';
import {
  LANGUAGES,
  getLanguageFromFilename,
  getSavedLanguage,
  saveSelectedLanguage,
  getSavedCodeForLanguage,
  saveCodeForLanguage,
  sanitizeCode,
  extractCleanCodeFromAI,
  isInvalidOrAIText
} from '../utils/languages';

interface TabItem {
  file: ProjectFile;
  isDirty?: boolean;
}

export const IDEWorkspace: React.FC = () => {
  // App state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [user, setUser] = useState<User | null>(null);

  // Workspace Files
  const [workspaceFiles, setWorkspaceFiles] = useState<ProjectFile[]>([]);
  const [entryFileId, setEntryFileId] = useState<number | null>(null);
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [recentFiles, setRecentFiles] = useState<ProjectFile[]>([]);

  // In-memory buffer of file contents keyed by file ID to prevent losing unsaved edits on file switch
  const [fileContents, setFileContents] = useState<Record<number, string>>({});
  const fileContentsRef = useRef<Record<number, string>>({});
  fileContentsRef.current = fileContents;

  // Set of file IDs with unsaved changes
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<number>>(new Set());

  // Active Editor State initialized with persisted language and clean starter code
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(() => getSavedLanguage());
  const [currentCode, setCurrentCode] = useState<string>(() => {
    const initLang = getSavedLanguage();
    return getSavedCodeForLanguage(initLang) || LANGUAGES[initLang]?.template || LANGUAGES.c.template;
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [jumpToLine, setJumpToLine] = useState<{ line: number; column?: number } | null>(null);

  // Synchronous refs kept up-to-date every render
  const currentCodeRef = useRef(currentCode);
  currentCodeRef.current = currentCode;

  const currentLanguageRef = useRef(currentLanguage);
  currentLanguageRef.current = currentLanguage;

  // Execution & Console
  const [stdin, setStdin] = useState<string>('');
  const stdinRef = useRef(stdin);
  stdinRef.current = stdin;

  const [isRunning, setIsRunning] = useState(false);
  const [interactiveOutput, setInteractiveOutput] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);
  const [consoleHeight, setConsoleHeight] = useState(240);

  // Panels & Modals
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualData, setVisualData] = useState<VisualizerResponse | null>(null);
  const [isVisualizerLoading, setIsVisualizerLoading] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Local Storage Workspace Files Persistence
  const STORAGE_KEY = 'codeforge_workspace_files_v1';
  const saveWorkspaceFilesToStorage = useCallback((files: ProjectFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (e) {
      console.warn('Failed to save files to localStorage', e);
    }
  }, []);

  const loadWorkspaceFilesFromStorage = (): ProjectFile[] | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  // Load initial workspace files & user
  useEffect(() => {
    loadUser();
    loadWorkspaceFiles();
  }, []);

  const loadUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // Guest mode
    }
  };

  const loadWorkspaceFiles = () => {
    const selectedLang = getSavedLanguage();
    const targetMeta = LANGUAGES[selectedLang] || LANGUAGES.c;
    const savedDraft = getSavedCodeForLanguage(selectedLang);
    const initialCode = savedDraft || targetMeta.template;

    let files: ProjectFile[] | null = loadWorkspaceFilesFromStorage();

    if (files && files.length > 0) {
      files = files.map(f => {
        const fileLang = (f.language as SupportedLanguage) || getLanguageFromFilename(f.name);
        if (fileLang in LANGUAGES) {
          const cleaned = sanitizeCode(f.content, fileLang);
          return { ...f, content: cleaned };
        }
        return f;
      });

      // Find or create file for selected language
      let fileForSelectedLang = files.find(
        f => !f.is_folder && ((f.language as SupportedLanguage) === selectedLang || f.name.toLowerCase() === targetMeta.defaultFilename.toLowerCase())
      );

      if (!fileForSelectedLang) {
        fileForSelectedLang = {
          id: Date.now(),
          name: targetMeta.defaultFilename,
          path: `/${targetMeta.defaultFilename}`,
          content: initialCode,
          language: selectedLang,
          is_folder: false,
          is_entry: true
        };
        files.push(fileForSelectedLang);
      } else {
        // If savedDraft exists, ensure it is in the file; if no savedDraft exists, use default template
        if (savedDraft) {
          fileForSelectedLang.content = savedDraft;
        } else if (!fileForSelectedLang.content || isInvalidOrAIText(fileForSelectedLang.content, selectedLang)) {
          fileForSelectedLang.content = targetMeta.template;
        }
      }

      setWorkspaceFiles(files);
      saveWorkspaceFilesToStorage(files);
      initActiveFile(files, selectedLang);
      return;
    }

    // Default initial file matching selected language
    const defaultInitialFile: ProjectFile = {
      id: 101,
      name: targetMeta.defaultFilename,
      path: `/${targetMeta.defaultFilename}`,
      content: initialCode,
      language: selectedLang,
      is_folder: false,
      is_entry: true
    };
    setWorkspaceFiles([defaultInitialFile]);
    setEntryFileId(101);
    saveWorkspaceFilesToStorage([defaultInitialFile]);
    initActiveFile([defaultInitialFile], selectedLang);
  };

  const initActiveFile = (files: ProjectFile[], targetLang: SupportedLanguage) => {
    const targetMeta = LANGUAGES[targetLang] || LANGUAGES.c;

    const initialBuf: Record<number, string> = {};
    files.forEach(f => {
      if (!f.is_folder) {
        const fileLang = (f.language as SupportedLanguage) || getLanguageFromFilename(f.name);
        const cleanContent = fileLang in LANGUAGES ? sanitizeCode(f.content, fileLang) : (f.content || '');
        initialBuf[f.id] = cleanContent;
      }
    });
    setFileContents(initialBuf);
    fileContentsRef.current = initialBuf;

    const entryFile =
      files.find(f => !f.is_folder && ((f.language as SupportedLanguage) === targetLang || f.name.toLowerCase() === targetMeta.defaultFilename.toLowerCase())) ||
      files.find(f => f.is_entry && !f.is_folder) ||
      files.find(f => !f.is_folder) ||
      files[0];

    if (entryFile) {
      const matchedLang = (entryFile.language as SupportedLanguage) || getLanguageFromFilename(entryFile.name) || targetLang;
      const savedDraft = getSavedCodeForLanguage(matchedLang);
      const cleanContent = savedDraft || sanitizeCode(entryFile.content, matchedLang);

      setOpenTabs([{ file: { ...entryFile, content: cleanContent }, isDirty: false }]);
      setActiveFileId(entryFile.id);
      if (entryFile.is_entry) setEntryFileId(entryFile.id);
      setCurrentCode(cleanContent);
      setCurrentLanguage(matchedLang);
      saveSelectedLanguage(matchedLang);
      if (savedDraft) {
        saveCodeForLanguage(matchedLang, cleanContent);
      }
      setIsDirty(false);
      setDirtyFileIds(new Set());
    }
  };

  const handleSelectFile = (file: ProjectFile) => {
    if (file.is_folder) return;

    // 1. Preserve active file's unsaved code in memory buffer before switching
    if (activeFileId !== null && currentCodeRef.current !== undefined) {
      setFileContents(prev => ({ ...prev, [activeFileId]: currentCodeRef.current }));
      fileContentsRef.current[activeFileId] = currentCodeRef.current;
    }

    // 2. Fetch the target file content (prioritizing in-memory buffer and sanitizing)
    const rawContent = fileContentsRef.current[file.id] ?? file.content ?? '';
    const matchedLang = (file.language as SupportedLanguage) || getLanguageFromFilename(file.name) || 'c';
    const contentToLoad = sanitizeCode(rawContent, matchedLang);

    // 3. Add to open tabs if not already present
    const existing = openTabs.find(t => t.file.id === file.id);
    if (!existing) {
      setOpenTabs(prev => [...prev, { file: { ...file, content: contentToLoad }, isDirty: dirtyFileIds.has(file.id) }]);
    }

    setActiveFileId(file.id);
    setCurrentCode(contentToLoad);
    setCurrentLanguage(matchedLang);
    saveSelectedLanguage(matchedLang);
    setIsDirty(dirtyFileIds.has(file.id));

    // Track recent files
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.id !== file.id);
      return [file, ...filtered].slice(0, 8);
    });
  };

  const handleSelectTab = (fileId: number) => {
    if (activeFileId === fileId) return;

    // 1. Preserve active file's unsaved code before switching tabs
    if (activeFileId !== null && currentCodeRef.current !== undefined) {
      setFileContents(prev => ({ ...prev, [activeFileId]: currentCodeRef.current }));
      fileContentsRef.current[activeFileId] = currentCodeRef.current;
    }

    const tab = openTabs.find(t => t.file.id === fileId);
    if (tab) {
      const rawContent = fileContentsRef.current[fileId] ?? tab.file.content ?? '';
      const matchedLang = (tab.file.language as SupportedLanguage) || getLanguageFromFilename(tab.file.name) || 'c';
      const contentToLoad = sanitizeCode(rawContent, matchedLang);
      setActiveFileId(fileId);
      setCurrentCode(contentToLoad);
      setCurrentLanguage(matchedLang);
      saveSelectedLanguage(matchedLang);
      setIsDirty(dirtyFileIds.has(fileId));
    }
  };

  const handleCloseTab = (fileId: number) => {
    const remaining = openTabs.filter(t => t.file.id !== fileId);
    if (remaining.length === 0) return;
    setOpenTabs(remaining);
    if (activeFileId === fileId) {
      const nextTab = remaining[remaining.length - 1];
      const rawContent = fileContentsRef.current[nextTab.file.id] ?? nextTab.file.content ?? '';
      const matchedLang = (nextTab.file.language as SupportedLanguage) || getLanguageFromFilename(nextTab.file.name) || 'c';
      const contentToLoad = sanitizeCode(rawContent, matchedLang);
      setActiveFileId(nextTab.file.id);
      setCurrentCode(contentToLoad);
      setCurrentLanguage(matchedLang);
      saveSelectedLanguage(matchedLang);
      setIsDirty(dirtyFileIds.has(nextTab.file.id));
    }
  };

  const handleChangeCode = (newCode: string) => {
    setCurrentCode(newCode);
    setIsDirty(true);
    saveCodeForLanguage(currentLanguage, newCode);

    if (activeFileId !== null) {
      setFileContents(prev => ({ ...prev, [activeFileId]: newCode }));
      fileContentsRef.current[activeFileId] = newCode;
      setDirtyFileIds(prev => new Set(prev).add(activeFileId));
    }

    setOpenTabs(prev =>
      prev.map(t =>
        t.file.id === activeFileId
          ? { ...t, isDirty: true, file: { ...t.file, content: newCode } }
          : t
      )
    );
  };

  // Complete Multi-Language Selector Handler
  const handleChangeLanguage = (newLang: SupportedLanguage) => {
    if (newLang === currentLanguage) return;

    const targetMeta = LANGUAGES[newLang] || LANGUAGES.c;
    const newFilename = targetMeta.defaultFilename;

    // 1. If current editor has code, preserve it as the draft for currentLanguage
    const currentEditorCode = currentCodeRef.current ?? currentCode;
    if (currentEditorCode) {
      saveCodeForLanguage(currentLanguage, currentEditorCode);
      if (activeFileId !== null) {
        setFileContents(prev => ({ ...prev, [activeFileId]: currentEditorCode }));
        fileContentsRef.current[activeFileId] = currentEditorCode;
        setWorkspaceFiles(prev =>
          prev.map(f => (f.id === activeFileId ? { ...f, content: currentEditorCode } : f))
        );
      }
    }

    // 2. For newLang, check if a saved draft exists
    const savedDraft = getSavedCodeForLanguage(newLang);
    const codeToLoad = savedDraft || targetMeta.template;

    // 3. Find or create file in workspace for newLang
    let targetFile = workspaceFiles.find(
      f => !f.is_folder && ((f.language as SupportedLanguage) === newLang || f.name.toLowerCase() === newFilename.toLowerCase())
    );

    let updatedFiles = [...workspaceFiles];
    if (!targetFile) {
      targetFile = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: newFilename,
        path: `/${newFilename}`,
        content: codeToLoad,
        language: newLang,
        is_folder: false,
        is_entry: true
      };
      updatedFiles.push(targetFile);
    } else {
      targetFile = {
        ...targetFile,
        content: codeToLoad
      };
      updatedFiles = updatedFiles.map(f => (f.id === targetFile!.id ? targetFile! : f));
    }

    setWorkspaceFiles(updatedFiles);
    saveWorkspaceFilesToStorage(updatedFiles);

    // 4. Update in-memory buffer
    setFileContents(prev => ({ ...prev, [targetFile!.id]: codeToLoad }));
    fileContentsRef.current[targetFile.id] = codeToLoad;

    // 5. Update tabs
    setOpenTabs(prev => {
      const exists = prev.some(t => t.file.id === targetFile!.id);
      if (exists) {
        return prev.map(t =>
          t.file.id === targetFile!.id
            ? { ...t, isDirty: false, file: { ...t.file, content: codeToLoad } }
            : t
        );
      }
      return [...prev, { file: targetFile!, isDirty: false }];
    });

    // 6. Update active file, language, and code state
    setActiveFileId(targetFile.id);
    setEntryFileId(targetFile.id);
    setCurrentLanguage(newLang);
    saveSelectedLanguage(newLang);
    setCurrentCode(codeToLoad);
    setIsDirty(false);
    setDirtyFileIds(prev => {
      const next = new Set(prev);
      next.delete(targetFile!.id);
      return next;
    });

    showToast(`Language switched to ${targetMeta.name}`, 'info');
  };

  const handleSave = useCallback(async () => {
    if (!activeFileId) return;
    const activeTab = openTabs.find(t => t.file.id === activeFileId);
    const fileName = activeTab?.file.name || LANGUAGES[currentLanguage]?.defaultFilename || 'main.c';
    const codeToSave = currentCodeRef.current ?? currentCode;

    // Persist to language storage
    saveCodeForLanguage(currentLanguage, codeToSave);

    // Update file in workspaceFiles
    setWorkspaceFiles(prev => {
      const updated = prev.map(f =>
        f.id === activeFileId ? { ...f, content: codeToSave, language: currentLanguage } : f
      );
      saveWorkspaceFilesToStorage(updated);
      return updated;
    });

    setDirtyFileIds(prev => {
      const next = new Set(prev);
      next.delete(activeFileId);
      return next;
    });

    setIsDirty(false);
    setIsSavedRecently(true);
    showToast('Code saved', 'success');
    setTimeout(() => setIsSavedRecently(false), 2500);

    setOpenTabs(prev =>
      prev.map(t => (t.file.id === activeFileId ? { ...t, isDirty: false, file: { ...t.file, content: codeToSave } } : t))
    );

    try {
      await api.updateFile(activeFileId, {
        name: fileName,
        content: codeToSave,
        language: currentLanguage
      });
    } catch {
      // Local persistence fallback
    }
  }, [activeFileId, openTabs, currentCode, currentLanguage, saveWorkspaceFilesToStorage, showToast]);

  const handleCreateFile = async (name: string, isFolder: boolean, parentId: number | null = null) => {
    try {
      const detectedLang = isFolder ? 'plaintext' : getLanguageFromFilename(name);
      const template = isFolder ? '' : (LANGUAGES[detectedLang as SupportedLanguage]?.template || '// Empty file\n');

      const parentFolder = parentId ? workspaceFiles.find(f => f.id === parentId) : null;
      const parentPath = parentFolder?.path || '';
      const filePath = parentPath ? `${parentPath}/${name}` : `/${name}`;

      const tempId = Date.now() + Math.floor(Math.random() * 1000);
      const newFile: ProjectFile = {
        id: tempId,
        name,
        path: filePath,
        content: template,
        language: detectedLang,
        is_folder: isFolder,
        parent_id: parentId
      };

      setWorkspaceFiles(prev => {
        const updated = [...prev, newFile];
        saveWorkspaceFilesToStorage(updated);
        return updated;
      });

      if (!isFolder) {
        setFileContents(prev => ({ ...prev, [newFile.id]: template }));
        fileContentsRef.current[newFile.id] = template;
        handleSelectFile(newFile);
      }

      showToast(`${isFolder ? 'Folder' : 'File'} created: ${name}`, 'success');
    } catch (e) {
      console.error('Failed to create file', e);
      showToast('Error creating file', 'error');
    }
  };

  const handleRenameFile = async (fileId: number, newName: string) => {
    const file = workspaceFiles.find(f => f.id === fileId);
    if (!file) return;

    const detectedLang = file.is_folder ? file.language : getLanguageFromFilename(newName);

    setWorkspaceFiles(prev => {
      const updated = prev.map(f =>
        f.id === fileId ? { ...f, name: newName, language: detectedLang } : f
      );
      saveWorkspaceFilesToStorage(updated);
      return updated;
    });

    setOpenTabs(prev =>
      prev.map(t =>
        t.file.id === fileId ? { ...t, file: { ...t.file, name: newName, language: detectedLang } } : t
      )
    );

    if (activeFileId === fileId) {
      setCurrentLanguage(detectedLang as SupportedLanguage);
    }

    showToast(`Renamed to "${newName}"`, 'success');
  };

  const handleDeleteFile = async (fileId: number) => {
    const deletedFile = workspaceFiles.find(f => f.id === fileId);
    if (!deletedFile) return;

    // Collect all file IDs to delete (file itself and child files if it's a folder)
    const idsToDelete = new Set<number>([fileId]);
    if (deletedFile.is_folder) {
      const collectChildren = (parentId: number) => {
        for (const f of workspaceFiles) {
          if (f.parent_id === parentId) {
            idsToDelete.add(f.id);
            if (f.is_folder) collectChildren(f.id);
          }
        }
      };
      collectChildren(fileId);
    }

    setWorkspaceFiles(prev => {
      const updated = prev.filter(f => !idsToDelete.has(f.id));
      saveWorkspaceFilesToStorage(updated);
      return updated;
    });

    if (idsToDelete.has(entryFileId ?? -1)) {
      setEntryFileId(null);
    }

    idsToDelete.forEach(id => {
      handleCloseTab(id);
      setDirtyFileIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });

    showToast(`Deleted ${deletedFile.is_folder ? 'folder' : 'file'}: ${deletedFile.name}`, 'info');
  };

  const handleSetEntryFile = (fileId: number) => {
    const target = workspaceFiles.find(f => f.id === fileId);
    if (!target || target.is_folder) return;

    setEntryFileId(fileId);
    setWorkspaceFiles(prev => {
      const updated = prev.map(f => ({ ...f, is_entry: f.id === fileId }));
      saveWorkspaceFilesToStorage(updated);
      return updated;
    });

    showToast(`Set "${target.name}" as entry file`, 'success');
  };

  const activeSessionRef = React.useRef<{
    sendStdin: (text: string) => void;
    stop: () => void;
    close: () => void;
  } | null>(null);

  // Real-time Interactive Execution Handler (with full Multi-File Workspace Support)
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionResult(null);
    setInteractiveOutput('');

    const currentMeta = LANGUAGES[currentLanguage] || LANGUAGES.c;
    const activeFile = activeFileId ? workspaceFiles.find(f => f.id === activeFileId) : null;
    const fileForCurLang = workspaceFiles.find(
      f => !f.is_folder && ((f.language as SupportedLanguage) === currentLanguage || f.name.toLowerCase() === currentMeta.defaultFilename.toLowerCase())
    );

    const entryFileObj =
      (activeFile && !activeFile.is_folder && ((activeFile.language as SupportedLanguage) === currentLanguage || getLanguageFromFilename(activeFile.name) === currentLanguage))
        ? activeFile
        : fileForCurLang
        || (entryFileId ? workspaceFiles.find(f => f.id === entryFileId) : null)
        || workspaceFiles.find(f => f.is_entry && !f.is_folder)
        || workspaceFiles.find(f => !f.is_folder);

    const entryFileName = entryFileObj?.name || currentMeta.defaultFilename;
    const langToRun = currentLanguageRef.current || currentLanguage;
    const codeToRun = currentCodeRef.current ?? currentCode;

    // Collect all workspace files, ensuring the active/entry file has the freshest in-memory content
    const projectFilesPayload = workspaceFiles.filter(f => !f.is_folder).map(f => {
      let content = f.content || '';
      if (f.id === (entryFileObj?.id ?? activeFileId)) {
        content = codeToRun;
      } else if (fileContentsRef.current[f.id] !== undefined) {
        content = fileContentsRef.current[f.id];
      }
      return {
        name: f.name,
        path: f.path || `/${f.name}`,
        content,
        is_folder: f.is_folder
      };
    });

    console.log("EXECUTE INTERACTIVE START:", {
      language: langToRun,
      entryFile: entryFileName,
      filesCount: projectFilesPayload.length
    });

    // Preloaded stdin from textarea if user entered it in Input (stdin) tab
    const textareaElem = document.getElementById('codeforge-stdin-input') as HTMLTextAreaElement | null;
    const domStdin = textareaElem ? textareaElem.value : '';
    const preloadedStdin = (stdin && stdin.length > 0) ? stdin : ((stdinRef.current && stdinRef.current.length > 0) ? stdinRef.current : domStdin);

    let accumulatedOut = '';
    let accumulatedErr = '';

    const session = api.createInteractiveSession(
      langToRun,
      codeToRun,
      entryFileName,
      {
        onStdout: (data: string) => {
          accumulatedOut += data;
          setInteractiveOutput(prev => prev + data);
        },
        onStderr: (data: string) => {
          accumulatedErr += data;
          setInteractiveOutput(prev => prev + data);
        },
        onExit: (code: number, status: string, duration?: number) => {
          setIsRunning(false);
          const finalStatus = status || (code === 0 ? 'Accepted' : 'Runtime Error');
          const finalResult: ExecutionResponse = {
            stdout: accumulatedOut,
            stderr: accumulatedErr,
            output: accumulatedOut,
            error: accumulatedErr,
            exit_code: code,
            execution_time: duration || 0.0,
            memory_mb: 4.2,
            status: finalStatus as ExecutionResponse['status'],
            language: langToRun
          };
          setExecutionResult(finalResult);

          if (finalStatus === 'Accepted') {
            showToast('Execution completed: Accepted', 'success');
          } else {
            showToast(`Execution finished: ${finalStatus}`, 'error');
          }
        },
        onError: () => {
          setIsRunning(false);
          const isRemoteHost = typeof window !== 'undefined' &&
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1';
          const hasCustomEndpoint = !!(import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL);

          const errorMessage = (isRemoteHost && !hasCustomEndpoint)
            ? 'Execution backend not connected: The frontend is running on GitHub Pages, but no backend execution server is configured. Please deploy the CodeForge backend (using Docker/Render/Railway) and configure VITE_API_URL or VITE_WS_URL.'
            : 'WebSocket connection to interactive execution runner failed. Please verify that the backend server is running and accessible.';

          setExecutionResult({
            stdout: accumulatedOut,
            stderr: errorMessage,
            output: accumulatedOut,
            error: errorMessage,
            exit_code: 1,
            execution_time: 0.0,
            memory_mb: 0.0,
            status: 'Execution Failed',
            language: langToRun
          });
          showToast(isRemoteHost && !hasCustomEndpoint ? 'Execution backend not configured' : 'Interactive execution connection error', 'error');
        }
      },
      preloadedStdin,
      projectFilesPayload,
      entryFileName
    );

    activeSessionRef.current = session;
  }, [isRunning, workspaceFiles, entryFileId, activeFileId, currentLanguage, currentCode, stdin, showToast]);

  const handleSendInteractiveStdin = useCallback((data: string) => {
    setInteractiveOutput(prev => prev + data);
    if (activeSessionRef.current) {
      activeSessionRef.current.sendStdin(data);
    }
  }, []);

  const handleStopInteractive = useCallback(() => {
    if (activeSessionRef.current) {
      activeSessionRef.current.stop();
      setIsRunning(false);
      showToast('Execution terminated by user', 'info');
    }
  }, [showToast]);

  const handleClearOutput = useCallback(() => {
    setInteractiveOutput('');
    setExecutionResult(null);
  }, []);

  useEffect(() => {
    return () => {
      if (activeSessionRef.current) {
        activeSessionRef.current.close();
      }
    };
  }, []);

  // Global Keyboard Shortcuts (Ctrl+Enter, Ctrl+S, Ctrl+P)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter -> Run Code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      // Ctrl + S -> Save Code
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      }
      // Ctrl + P -> Quick file search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsQuickSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleRun, handleSave]);

  // AI Assistant Call
  const handleCallAI = async (
    action: string,
    prompt?: string
  ): Promise<AIResponse> => {
    return await api.aiAction(
      action,
      currentLanguage,
      currentCode,
      selectedCode,
      prompt
    );
  };

  const handleAskAIWithSelection = (selText: string) => {
    setSelectedCode(selText);
    setIsAIPanelOpen(true);
  };

  const handleInsertCodeFromAI = (codeToInsert: string) => {
    const cleanCode = extractCleanCodeFromAI(codeToInsert, currentLanguage);
    if (!cleanCode) {
      showToast('AI response contains explanation/test text rather than source code', 'error');
      return;
    }
    handleChangeCode(cleanCode);
    showToast('AI code inserted into editor', 'success');
  };

  const handleApplyFixFromAI = (fixedCode: string) => {
    handleChangeCode(fixedCode);
    showToast('Fix applied to editor. Changes are unsaved until you save.', 'success');
  };

  // Visualizer trigger
  const handleOpenVisualizer = async () => {
    setIsVisualizerOpen(true);
    setIsVisualizerLoading(true);
    try {
      const res = await api.visualize(currentLanguage, currentCode, stdin);
      setVisualData(res);
    } catch (e) {
      console.error('Visualizer error', e);
    } finally {
      setIsVisualizerLoading(false);
    }
  };

  const handleJumpToError = (line: number, column: number = 1) => {
    setJumpToLine({ line, column });
  };

  const handleLoadProblemToIDE = (problem: ProblemDetail, lang: SupportedLanguage) => {
    const rawStarter = problem.starter_templates[lang] || LANGUAGES[lang]?.template || '';
    const starter = sanitizeCode(rawStarter, lang);
    setCurrentLanguage(lang);
    saveSelectedLanguage(lang);
    setCurrentCode(starter);
    saveCodeForLanguage(lang, starter);
    setIsDirty(true);
    showToast(`Loaded "${problem.title}" in ${LANGUAGES[lang].name}`, 'info');
  };

  const handleReopenCode = (code: string, language: string) => {
    const mapped = (language as SupportedLanguage) || 'c';
    const cleanCode = sanitizeCode(code, mapped);
    setCurrentLanguage(mapped);
    saveSelectedLanguage(mapped);
    setCurrentCode(cleanCode);
    saveCodeForLanguage(mapped, cleanCode);
    setIsDirty(true);
    showToast(`Reopened code in ${LANGUAGES[mapped]?.name || mapped}`, 'info');
  };

  const activeFileName =
    openTabs.find(t => t.file.id === activeFileId)?.file.name || LANGUAGES[currentLanguage]?.defaultFilename || 'main.c';

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${theme === 'light' ? 'light' : ''}`}>
      {/* Header with Prominent Language Selector and Save state */}
      <Header
        currentFileName={activeFileName}
        currentLanguage={currentLanguage}
        onChangeLanguage={handleChangeLanguage}
        isDirty={isDirty}
        isSavedRecently={isSavedRecently}
        isRunning={isRunning}
        theme={theme}
        user={user}
        onRun={handleRun}
        onSave={handleSave}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenPractice={() => setIsPracticeOpen(true)}
        onOpenVisualizer={handleOpenVisualizer}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          localStorage.removeItem('codeforge_token');
          setUser(null);
          showToast('Signed out', 'info');
        }}
        onOpenHistory={() => setIsDashboardOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          files={workspaceFiles}
          activeFileId={activeFileId}
          entryFileId={entryFileId}
          dirtyFileIds={dirtyFileIds}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onRenameFile={handleRenameFile}
          onDeleteFile={handleDeleteFile}
          onSetEntryFile={handleSetEntryFile}
          recentFiles={recentFiles}
          onOpenAI={() => setIsAIPanelOpen(!isAIPanelOpen)}
        />

        {/* Center: Editor + Bottom Console */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
          {/* Editor Area */}
          <div className="flex-1 overflow-hidden relative">
            <MonacoCodeEditor
              openTabs={openTabs}
              activeFileId={activeFileId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              code={currentCode}
              language={currentLanguage}
              onChangeCode={handleChangeCode}
              onChangeLanguage={handleChangeLanguage}
              onRun={handleRun}
              onSave={handleSave}
              onAskAIWithSelection={handleAskAIWithSelection}
              jumpToLine={jumpToLine}
              theme={theme}
            />
          </div>

          {/* Bottom Console Panel */}
          <ConsolePanel
            executionResult={executionResult}
            isRunning={isRunning}
            stdin={stdin}
            onChangeStdin={(val: string) => {
              setStdin(val);
              stdinRef.current = val;
            }}
            onClearOutput={handleClearOutput}
            onJumpToError={handleJumpToError}
            onShowToast={showToast}
            height={consoleHeight}
            onResize={setConsoleHeight}
            onRunCode={handleRun}
            interactiveOutput={interactiveOutput}
            onSendInteractiveStdin={handleSendInteractiveStdin}
            onStopInteractive={handleStopInteractive}
          />
        </div>

        {/* Right: AI Coding Assistant Panel */}
        {isAIPanelOpen && (
          <AIAssistantPanel
            currentLanguage={currentLanguage}
            currentCode={currentCode}
            selectedCode={selectedCode}
            stdin={stdin}
            latestOutput={executionResult?.stdout || executionResult?.output || interactiveOutput || ''}
            latestError={executionResult?.error || executionResult?.stderr || executionResult?.raw_error || ''}
            onApplyFix={handleApplyFixFromAI}
            onInsertCode={handleInsertCodeFromAI}
            onClose={() => setIsAIPanelOpen(false)}
            onCallAI={handleCallAI}
          />
        )}
      </div>

      {/* Quick Search Modal (Ctrl + P) */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        files={workspaceFiles}
        onSelectFile={handleSelectFile}
      />

      {/* Modals */}
      <VisualizerModal
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        visualData={visualData}
        isLoading={isVisualizerLoading}
        currentCode={currentCode}
      />

      <PracticeModal
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
        onLoadProblemToIDE={handleLoadProblemToIDE}
        currentLanguage={currentLanguage}
      />

      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        user={user}
        onReopenCode={handleReopenCode}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(newUser) => {
          setUser(newUser);
          loadWorkspaceFiles();
          showToast(`Welcome back, ${newUser.username}!`, 'success');
        }}
      />

      {/* Lightweight Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
