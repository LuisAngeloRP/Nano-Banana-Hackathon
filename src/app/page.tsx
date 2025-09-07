'use client';

import React, { useState } from 'react';
import GameMenu from '@/components/GameMenu';
import GameChat from '@/components/GameChat';
import SessionHistory from '@/components/SessionHistory';

type AppView = 'menu' | 'game' | 'history';

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleStartGame = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentView('game');
  };

  const handleBackToMenu = () => {
    setCurrentSessionId(null);
    setCurrentView('menu');
  };

  const handleShowHistory = () => {
    setCurrentView('history');
  };

  const handleContinueGame = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentView('game');
  };

  return (
    <main>
      {currentView === 'game' && currentSessionId ? (
        <GameChat 
          sessionId={currentSessionId} 
          onBackToMenu={handleBackToMenu}
        />
      ) : currentView === 'history' ? (
        <SessionHistory 
          onBackToMenu={handleBackToMenu}
          onContinueGame={handleContinueGame}
        />
      ) : (
        <GameMenu 
          onStartGame={handleStartGame}
          onShowHistory={handleShowHistory}
        />
      )}
    </main>
  );
}
