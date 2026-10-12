import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg border shadow-xl text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-[#161b22] border-emerald-500/40 text-emerald-300 shadow-emerald-950/20'
              : toast.type === 'error'
              ? 'bg-[#161b22] border-rose-500/40 text-rose-300 shadow-rose-950/20'
              : 'bg-[#161b22] border-cyan-500/40 text-cyan-300 shadow-cyan-950/20'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-0.5 rounded hover:bg-white/10 text-white/60 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
