'use client';

import { useState, useRef, useEffect } from 'react';
import { GameState, QuickAction } from '@/types/game';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onNextDay: () => void;
  quickActions: QuickAction[];
  gameState: GameState;
  isLoading: boolean;
}

const ChatInput = ({ 
  onSendMessage, 
  onNextDay, 
  quickActions, 
  gameState, 
  isLoading 
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && canAct) {
      onSendMessage(message.trim());
      setMessage('');
      setShowQuickActions(false);
      setTimeout(() => setShowQuickActions(true), 2000);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (!isLoading && canAct) {
      onSendMessage(action.text);
      setShowQuickActions(false);
      setTimeout(() => setShowQuickActions(true), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const canAct = !gameState.isGameOver && gameState.actionsRemaining > 0;
  const canNextDay = !gameState.isGameOver && gameState.actionsRemaining === 0 && gameState.currentDay < 10;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'border-green-500 text-green-400 hover:bg-green-500 hover:text-white';
      case 'medium': return 'border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-white';
      case 'high': return 'border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white';
      case 'extreme': return 'border-red-500 text-red-400 hover:bg-red-500 hover:text-white';
      default: return 'border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white';
    }
  };

  if (gameState.isGameOver) {
    return (
      <div className="p-4 text-center">
        <div className="mb-4">
          <div className="text-xl font-bold text-white mb-2">
            🎯 ¡Juego Terminado!
          </div>
          <div className="text-lg text-gray-300 mb-2">
            Resultado: <span className="font-bold text-yellow-400">
              {gameState.gameResult?.toUpperCase()}
            </span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            Dinero final: ${gameState.money}
          </div>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          🔄 Jugar Otra Vez
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Quick actions */}
      {showQuickActions && quickActions.length > 0 && canAct && (
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Acciones rápidas:</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 6).map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${getRiskColor(action.riskLevel)}`}
              >
                {action.text}
                <span className="ml-1 opacity-60">({action.riskLevel})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main input area */}
      <div className="flex space-x-2">
        {/* Text input */}
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canAct ? "Escribe tu acción..." : "Sin acciones restantes hoy"}
              className="flex-1 bg-slate-700 text-white border border-slate-600 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              rows={1}
              disabled={!canAct || isLoading}
              maxLength={500}
            />
            
            <button
              type="submit"
              disabled={!message.trim() || !canAct || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white p-3 rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
          
          {/* Character counter */}
          <div className="text-xs text-gray-500 mt-1 text-right">
            {message.length}/500
          </div>
        </div>

        {/* Next day button */}
        {canNextDay && (
          <button
            onClick={onNextDay}
            disabled={isLoading}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-3 rounded-lg transition-colors whitespace-nowrap"
          >
            🌅 Siguiente Día
          </button>
        )}
      </div>

      {/* Status info */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        {canAct ? (
          <>
            ⚡ {gameState.actionsRemaining} acciones restantes hoy • 
            💰 ${gameState.money} • 
            📅 Día {gameState.currentDay}/10
          </>
        ) : canNextDay ? (
          <>
            🌙 Sin acciones restantes • Pasa al siguiente día para continuar
          </>
        ) : (
          <>
            🎯 Juego en progreso • Día {gameState.currentDay}/10
          </>
        )}
      </div>

      {/* Tips */}
      {canAct && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          💡 Tip: Presiona Enter para enviar, Shift+Enter para nueva línea
        </div>
      )}
    </div>
  );
};

export default ChatInput;
