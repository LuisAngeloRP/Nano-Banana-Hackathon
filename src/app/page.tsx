'use client';

import React, { useState } from 'react';
import GameMenu from '@/components/GameMenu';
import GameChat from '@/components/GameChat';

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleStartGame = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleBackToMenu = () => {
    setCurrentSessionId(null);
  };

  return (
    <main>
      {currentSessionId ? (
        <GameChat 
          sessionId={currentSessionId} 
          onBackToMenu={handleBackToMenu}
        />
      ) : (
        <GameMenu onStartGame={handleStartGame} />
      )}
    </main>
  );
}
