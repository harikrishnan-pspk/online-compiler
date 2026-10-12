import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { IDEWorkspace } from './pages/IDEWorkspace';
import { AuthModal } from './components/AuthModal';
import { User } from './types';

export function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'ide'>('ide');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const handleStartCoding = () => {
    setCurrentView('ide');
  };

  const handleExplorePractice = () => {
    setCurrentView('ide');
  };

  const handleOpenAuth = () => {
    setIsAuthOpen(true);
  };

  return (
    <div className="w-screen h-screen bg-[#0d1117] text-[#f0f6fc]">
      {currentView === 'landing' ? (
        <LandingPage
          onStartCoding={handleStartCoding}
          onExplorePractice={handleExplorePractice}
          onOpenAuth={handleOpenAuth}
        />
      ) : (
        <IDEWorkspace />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(newUser, token) => {
          setUser(newUser);
          setCurrentView('ide');
        }}
      />
    </div>
  );
}

export default App;
