import React, { useState } from 'react';
import { User as UserIcon, Lock, Mail, X, Loader2, Code2, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(username || email, password);
        localStorage.setItem('codeforge_token', res.access_token);
        onAuthSuccess(res.user, res.access_token);
        onClose();
      } else {
        const res = await api.register(username, email, password);
        localStorage.setItem('codeforge_token', res.access_token);
        onAuthSuccess(res.user, res.access_token);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestDemo = () => {
    const demoUser: User = {
      id: 999,
      username: 'Hari',
      email: 'hari@codeforge.dev',
      created_at: new Date().toISOString(),
      projects_count: 8,
      saved_count: 42,
      problems_solved: 27,
      ai_requests: 134
    };
    onAuthSuccess(demoUser, 'demo-token');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#f0f6fc]">
        {/* Top Header */}
        <div className="p-6 border-b border-[#30363d] bg-[#0b0e14] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-mono font-bold text-white text-sm">
              &lt;/&gt;
            </div>
            <div>
              <h3 className="font-bold text-base text-white">CodeForge Account</h3>
              <p className="text-xs text-[#8b949e]">
                {isLogin ? 'Sign in to access your projects and history' : 'Create an account to save your code and statistics'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] mb-1.5">
              Username {isLogin && 'or Email'}
            </label>
            <div className="flex items-center bg-[#0b0e14] border border-[#30363d] rounded-lg px-3 py-2 focus-within:border-cyan-500">
              <UserIcon className="w-4 h-4 text-[#6e7681] mr-2" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={isLogin ? 'Hari or user@example.com' : 'Hari'}
                className="bg-transparent text-xs text-white outline-none w-full placeholder-[#6e7681]"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] mb-1.5">Email Address</label>
              <div className="flex items-center bg-[#0b0e14] border border-[#30363d] rounded-lg px-3 py-2 focus-within:border-cyan-500">
                <Mail className="w-4 h-4 text-[#6e7681] mr-2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="hari@example.com"
                  className="bg-transparent text-xs text-white outline-none w-full placeholder-[#6e7681]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] mb-1.5">Password</label>
            <div className="flex items-center bg-[#0b0e14] border border-[#30363d] rounded-lg px-3 py-2 focus-within:border-cyan-500">
              <Lock className="w-4 h-4 text-[#6e7681] mr-2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-xs text-white outline-none w-full placeholder-[#6e7681]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-950/40 flex items-center justify-center space-x-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign In to Workspace' : 'Create Account'}</span>
            )}
          </button>

          {/* Guest / One-Click Demo Mode */}
          <div className="pt-2 border-t border-[#30363d] flex flex-col space-y-2">
            <button
              type="button"
              onClick={handleGuestDemo}
              className="w-full py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc] text-xs font-medium border border-[#30363d] flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Explore as Hari (Demo Mode)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="text-center text-xs text-cyan-400 hover:underline pt-1"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
