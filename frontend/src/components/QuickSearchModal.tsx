import React, { useState, useEffect } from 'react';
import { Search, FileCode, X } from 'lucide-react';
import { ProjectFile } from '../types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: ProjectFile[];
  onSelectFile: (file: ProjectFile) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  files,
  onSelectFile
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = files.filter(f => !f.is_folder && f.name.toLowerCase().includes(query.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectFile(filtered[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-[#f0f6fc]">
        <div className="p-3 border-b border-[#30363d] flex items-center space-x-2.5 bg-[#0b0e14]">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name (or press Esc to exit)..."
            className="w-full bg-transparent text-xs text-white placeholder-[#6e7681] outline-none"
          />
          <button onClick={onClose} className="p-1 rounded text-[#8b949e] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#6e7681]">No matching files found.</div>
          ) : (
            filtered.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-[#6e7681]">{file.language}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
