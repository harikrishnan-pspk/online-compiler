import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  Plus,
  FolderPlus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles,
  Search,
  Play,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { ProjectFile } from '../types';

interface SidebarProps {
  files: ProjectFile[];
  activeFileId: number | null;
  entryFileId?: number | null;
  dirtyFileIds?: Set<number>;
  onSelectFile: (file: ProjectFile) => void;
  onCreateFile: (name: string, isFolder: boolean, parentId?: number | null) => void;
  onRenameFile: (fileId: number, newName: string) => void;
  onDeleteFile: (fileId: number) => void;
  onSetEntryFile?: (fileId: number) => void;
  recentFiles: ProjectFile[];
  onOpenAI: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetFile: ProjectFile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileId,
  entryFileId,
  dirtyFileIds = new Set(),
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onSetEntryFile,
  recentFiles,
  onOpenAI
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'recent'>('explorer');

  // Expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename State
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetFile: null
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Automatically expand folders that contain the active file on file switch
  useEffect(() => {
    if (!activeFileId) return;
    const file = files.find(f => f.id === activeFileId);
    if (file && file.parent_id) {
      setExpandedFolders(prev => {
        const next = new Set(prev);
        let currParent: number | null | undefined = file.parent_id;
        while (currParent) {
          next.add(currParent);
          const parentFolder = files.find(f => f.id === currParent);
          currParent = parentFolder?.parent_id;
        }
        return next;
      });
    }
  }, [activeFileId, files]);

  // Close context menu on outside click or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setIsCreating(false);
        setRenamingId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getFileIcon = (fileName: string, isFolder: boolean, isExpanded?: boolean) => {
    if (isFolder) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
      );
    }
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.py')) return <span className="text-xs">🐍</span>;
    if (lower.endsWith('.java')) return <span className="text-xs">☕</span>;
    if (lower.endsWith('.js') || lower.endsWith('.ts')) {
      return <span className="font-mono text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20">JS</span>;
    }
    if (lower.endsWith('.cpp') || lower.endsWith('.hpp') || lower.endsWith('.cc')) {
      return <span className="text-xs text-cyan-300 font-semibold">C++</span>;
    }
    if (lower.endsWith('.c') || lower.endsWith('.h')) {
      return <span className="text-xs text-blue-300 font-semibold">C</span>;
    }
    if (lower.endsWith('.json')) return <span className="text-[10px] text-yellow-300 font-mono">{}</span>;
    if (lower.endsWith('.md')) return <span className="text-[10px] text-slate-300 font-mono">MD</span>;
    if (lower.endsWith('.txt')) return <span className="text-[10px] text-zinc-400 font-mono">TXT</span>;
    return <FileCode className="w-4 h-4 text-[#8b949e] flex-shrink-0" />;
  };

  // Name Validation
  const validateName = (name: string, parentId: number | null, isFolder: boolean, currentId?: number): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Name cannot be empty.';
    if (/[\\/:*?"<>|]/.test(trimmed)) {
      return 'Name cannot contain \\ / : * ? " < > |';
    }
    if (trimmed.length > 64) {
      return 'Name is too long (max 64 characters).';
    }
    // Check duplicates under same parent
    const duplicate = files.find(f =>
      f.id !== currentId &&
      (f.parent_id ?? null) === (parentId ?? null) &&
      f.name.toLowerCase() === trimmed.toLowerCase() &&
      Boolean(f.is_folder) === isFolder
    );
    if (duplicate) {
      return `A ${isFolder ? 'folder' : 'file'} with this name already exists in this directory.`;
    }
    return null;
  };

  const handleStartCreate = (type: 'file' | 'folder', parentId: number | null = null) => {
    setCreateType(type);
    setCreateParentId(parentId);
    setCreateName('');
    setCreateError(null);
    setIsCreating(true);
    if (parentId) {
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateName(createName, createParentId, createType === 'folder');
    if (error) {
      setCreateError(error);
      return;
    }
    onCreateFile(createName.trim(), createType === 'folder', createParentId);
    setIsCreating(false);
    setCreateName('');
    setCreateError(null);
  };

  const handleStartRename = (file: ProjectFile) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
    setRenameError(null);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSubmitRename = (file: ProjectFile) => {
    const error = validateName(renameValue, file.parent_id ?? null, file.is_folder, file.id);
    if (error) {
      setRenameError(error);
      return;
    }
    onRenameFile(file.id, renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
    setRenameError(null);
  };

  const handleDeleteWithConfirm = (file: ProjectFile) => {
    const isFolder = file.is_folder;
    const msg = isFolder
      ? `Delete folder "${file.name}" and all of its contents?`
      : `Delete file "${file.name}"?`;
    if (confirm(msg)) {
      onDeleteFile(file.id);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleContextMenu = (e: React.MouseEvent, file: ProjectFile | null) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({
      visible: true,
      x,
      y,
      targetFile: file
    });
  };

  // Build Hierarchy
  const allFiles = files;
  const effectiveEntryFileId = entryFileId || allFiles.find(f => f.is_entry)?.id;

  const renderTree = (parentId: number | null = null, depth: number = 0) => {
    const items = allFiles
      .filter(f => (f.parent_id ?? null) === parentId)
      .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Folders first, then files
    const sorted = [...items].sort((a, b) => {
      if (a.is_folder === b.is_folder) {
        return a.name.localeCompare(b.name);
      }
      return a.is_folder ? -1 : 1;
    });

    return (
      <div className="flex flex-col space-y-0.5">
        {/* Inline Create Input when parent matches */}
        {isCreating && createParentId === parentId && (
          <form
            onSubmit={handleSubmitCreate}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className="pr-2 py-1 bg-[#21262d] border-l-2 border-cyan-400 my-0.5 rounded"
          >
            <div className="flex items-center space-x-1.5">
              {getFileIcon(createName, createType === 'folder')}
              <input
                type="text"
                autoFocus
                placeholder={createType === 'folder' ? 'folder_name' : 'filename.ext'}
                value={createName}
                onChange={e => {
                  setCreateName(e.target.value);
                  setCreateError(null);
                }}
                className="bg-[#0b0e14] border border-cyan-500/60 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full font-mono"
              />
              <button
                type="submit"
                className="p-1 text-emerald-400 hover:text-emerald-300"
                title="Create"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 text-[#8b949e] hover:text-white"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {createError && (
              <div className="text-[10px] text-rose-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}
          </form>
        )}

        {sorted.map(file => {
          const isFolder = file.is_folder;
          const isExpanded = expandedFolders.has(file.id);
          const isActive = file.id === activeFileId;
          const isEntry = file.id === effectiveEntryFileId;
          const isDirty = dirtyFileIds.has(file.id);
          const isRenaming = renamingId === file.id;

          return (
            <div key={file.id} className="select-none">
              {isRenaming ? (
                <div
                  style={{ paddingLeft: `${depth * 14 + 10}px` }}
                  className="pr-2 py-1 bg-[#21262d] border-l-2 border-cyan-400 rounded"
                >
                  <div className="flex items-center space-x-1.5">
                    {getFileIcon(renameValue, isFolder, isExpanded)}
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={e => {
                        setRenameValue(e.target.value);
                        setRenameError(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSubmitRename(file);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="bg-[#0b0e14] border border-cyan-500/60 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full font-mono"
                    />
                    <button
                      onClick={() => handleSubmitRename(file)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="p-1 text-[#8b949e] hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {renameError && (
                    <div className="text-[10px] text-rose-400 mt-1 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{renameError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (isFolder) {
                      toggleFolder(file.id);
                    } else {
                      onSelectFile(file);
                    }
                  }}
                  onContextMenu={e => handleContextMenu(e, file)}
                  style={{ paddingLeft: `${depth * 14 + 8}px` }}
                  className={`group flex items-center justify-between pr-2 py-1 rounded cursor-pointer text-xs transition-colors ${
                    isActive && !isFolder
                      ? 'bg-cyan-500/15 text-cyan-300 font-medium border-l-2 border-cyan-400'
                      : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]'
                  }`}
                  title={file.name}
                >
                  <div className="flex items-center space-x-1.5 truncate flex-1 min-w-0">
                    {/* Expand/Collapse Chevron for Folders */}
                    {isFolder ? (
                      <span className="p-0.5 text-[#6e7681] hover:text-white">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                    ) : (
                      <span className="w-3.5" />
                    )}

                    {getFileIcon(file.name, isFolder, isExpanded)}

                    <span className="truncate font-mono text-[12px]">{file.name}</span>

                    {/* Entry File Badge */}
                    {isEntry && !isFolder && (
                      <span
                        className="inline-flex items-center space-x-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider flex-shrink-0"
                        title="Project Entry Point (Runs on Run Code)"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>ENTRY</span>
                      </span>
                    )}

                    {/* Unsaved Indicator Dot */}
                    {isDirty && !isFolder && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse"
                        title="Unsaved changes"
                      />
                    )}
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity flex-shrink-0">
                    {isFolder && (
                      <>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleStartCreate('file', file.id);
                          }}
                          className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-cyan-300"
                          title="New File in Folder"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleStartCreate('folder', file.id);
                          }}
                          className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-amber-300"
                          title="New Folder in Folder"
                        >
                          <FolderPlus className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {!isFolder && !isEntry && onSetEntryFile && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSetEntryFile(file.id);
                        }}
                        className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-emerald-400"
                        title="Set as Project Entry Point"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleStartRename(file);
                      }}
                      className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteWithConfirm(file);
                      }}
                      className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Recursive Folder Children */}
              {isFolder && isExpanded && renderTree(file.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col h-[calc(100vh-3.5rem)] select-none text-[#f0f6fc] relative">
      {/* Sidebar Navigation Tabs */}
      <div className="flex border-b border-[#30363d] text-xs font-semibold text-[#8b949e] bg-[#0b0e14]/50">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center space-x-1.5 ${
            activeTab === 'explorer'
              ? 'border-cyan-400 text-cyan-300 bg-[#161b22]'
              : 'border-transparent hover:text-[#f0f6fc]'
          }`}
          title="File Explorer"
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Explorer</span>
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center space-x-1.5 ${
            activeTab === 'recent'
              ? 'border-cyan-400 text-cyan-300 bg-[#161b22]'
              : 'border-transparent hover:text-[#f0f6fc]'
          }`}
          title="Recent Executed Files"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Recent</span>
        </button>
      </div>

      {/* Explorer Content */}
      {activeTab === 'explorer' && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          onContextMenu={e => handleContextMenu(e, null)}
        >
          {/* Active Workspace Banner & Action Bar */}
          <div className="p-3 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#8b949e] uppercase tracking-wider truncate">
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate">WORKSPACE FILES</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleStartCreate('file', null)}
                className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc]"
                title="New File at Root"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleStartCreate('folder', null)}
                className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc]"
                title="New Folder at Root"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Search Filter */}
          <div className="px-2.5 py-1.5 border-b border-[#30363d]/50">
            <div className="flex items-center space-x-1.5 bg-[#0b0e14] px-2 py-1 rounded text-xs border border-[#30363d]/40">
              <Search className="w-3 h-3 text-[#6e7681]" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-[#f0f6fc] placeholder-[#6e7681] outline-none w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-[#6e7681] hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {allFiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6e7681]">
                No files in project. Click "+" to create one!
              </div>
            ) : (
              renderTree(null, 0)
            )}
          </div>
        </div>
        )}

      {/* Recent Files Tab */}
      {activeTab === 'recent' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3">
          <div className="text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-2">Recent Work</div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {recentFiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6e7681]">
                No recent files opened yet.
              </div>
            ) : (
              recentFiles.map(rf => (
                <div
                  key={rf.id}
                  onClick={() => onSelectFile(rf)}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-[#21262d] cursor-pointer text-xs text-[#f0f6fc]"
                >
                  <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">{rf.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CodeForge AI Assistant Quick Trigger Banner */}
      <div className="p-3 border-t border-[#30363d] bg-[#0b0e14]">
        <button
          onClick={onOpenAI}
          className="w-full py-2 px-3 rounded-md bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40 hover:from-purple-800/50 hover:to-blue-800/50 border border-purple-500/30 text-purple-200 text-xs font-medium flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>CodeForge AI Assistant</span>
        </button>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-44 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-1 text-xs text-[#f0f6fc] animate-in fade-in zoom-in-95 duration-75"
        >
          {contextMenu.targetFile ? (
            <>
              <div className="px-2.5 py-1 text-[10px] text-[#6e7681] border-b border-[#30363d] truncate font-semibold">
                {contextMenu.targetFile.name}
              </div>
              {contextMenu.targetFile.is_folder ? (
                <>
                  <button
                    onClick={() => {
                      handleStartCreate('file', contextMenu.targetFile?.id);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-cyan-300 flex items-center space-x-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New File</span>
                  </button>
                  <button
                    onClick={() => {
                      handleStartCreate('folder', contextMenu.targetFile?.id);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-amber-300 flex items-center space-x-2"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>New Folder</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (contextMenu.targetFile) onSelectFile(contextMenu.targetFile);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-cyan-300 flex items-center space-x-2"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Open File</span>
                  </button>
                  {onSetEntryFile && (
                    <button
                      onClick={() => {
                        if (contextMenu.targetFile) onSetEntryFile(contextMenu.targetFile.id);
                        setContextMenu(prev => ({ ...prev, visible: false }));
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-emerald-300 flex items-center space-x-2"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Set as Entry File</span>
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  if (contextMenu.targetFile) handleStartRename(contextMenu.targetFile);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-white flex items-center space-x-2"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
              <div className="border-t border-[#30363d] my-1" />
              <button
                onClick={() => {
                  if (contextMenu.targetFile) handleDeleteWithConfirm(contextMenu.targetFile);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-500/20 text-rose-400 flex items-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  handleStartCreate('file', null);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-cyan-300 flex items-center space-x-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New File at Root</span>
              </button>
              <button
                onClick={() => {
                  handleStartCreate('folder', null);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#21262d] hover:text-amber-300 flex items-center space-x-2"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Folder at Root</span>
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
