'use client';

import { useState, useEffect, useRef } from 'react';
import { GameEngine } from '@/lib/gameEngine';
import { GameState, ChatMessage as ChatMessageType, QuickAction } from '@/types/game';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import GameStatusBar from './GameStatusBar';
import ElementLibrary from './ElementLibrary';

const ChatGameInterface = () => {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showElementLibrary, setShowElementLibrary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Inicializar el motor del juego
    // Usar Google AI para texto y Nano Banana para imágenes
    const googleAiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || 'dummy-key';
    const engine = new GameEngine(googleAiKey, googleAiKey); // Usar la misma key para ambos
    setGameEngine(engine);
    startNewGame(engine);
  }, []);

  const addMessage = (message: Omit<ChatMessageType, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessageType = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const startNewGame = async (engine: GameEngine) => {
    setIsLoading(true);
    setError(null);
    setMessages([]);
    
    try {
      // Mensaje de bienvenida del sistema
      const geminiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
      const falAiKey = process.env.NEXT_PUBLIC_FAL_AI_API_KEY;
      
      let welcomeMessage = '🎮 ¡Bienvenido a "De $1 a Millonario"! El narrador te está esperando para comenzar tu aventura...';
      
      if (!geminiKey || geminiKey === 'dummy-key') {
        welcomeMessage += '\n\n🤖 Modo demo: usando narrativa simulada. Para usar Gemini real, configura NEXT_PUBLIC_GOOGLE_AI_API_KEY.';
      }
      
      if (!falAiKey || falAiKey === 'dummy-key') {
        welcomeMessage += '\n🖼️ Imágenes deshabilitadas: configura NEXT_PUBLIC_FAL_AI_API_KEY para usar Nano Banana.';
      }
      
      welcomeMessage += '\n\n💡 Tip: Comparte tu trasfondo personal para que el narrador pueda crear tu historia única con personajes, lugares y objetos personalizados.';
      
      addMessage({
        type: 'system',
        content: welcomeMessage
      });

      const story = await engine.startNewGame();
      const currentGameState = engine.getGameState();
      setGameState(currentGameState);

      // Mensaje inicial de la IA
      addMessage({
        type: 'ai',
        content: story.narrative,
        gameData: {
          day: currentGameState.currentDay,
          money: currentGameState.money,
          actionsRemaining: currentGameState.actionsRemaining,
          newElements: {
            characters: story.newCharacters,
            scenarios: story.newScenarios,
            objects: story.newObjects
          },
          statusUpdates: story.statusUpdates,
          storyImage: story.storyImage
        }
      });

    } catch (err) {
      setError('Error al iniciar el juego: ' + (err as Error).message);
      addMessage({
        type: 'system',
        content: '❌ Error al iniciar el juego. Por favor, intenta de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (actionText: string) => {
    if (!gameEngine || !gameState) return;

    setIsLoading(true);
    setError(null);

    // Agregar mensaje del usuario
    addMessage({
      type: 'user',
      content: actionText
    });

    try {
      const story = await gameEngine.executeAction(actionText);
      const newGameState = gameEngine.getGameState();
      setGameState(newGameState);

      // Agregar respuesta de la IA
      addMessage({
        type: 'ai',
        content: story.narrative,
        gameData: {
          day: newGameState.currentDay,
          money: newGameState.money,
          moneyChange: story.actionResults.moneyChange,
          actionsRemaining: newGameState.actionsRemaining,
          newElements: {
            characters: story.newCharacters,
            scenarios: story.newScenarios,
            objects: story.newObjects
          },
          statusUpdates: story.statusUpdates,
          storyImage: story.storyImage,
          assetsGenerated: story.assetsGenerated,
          compositeDescription: story.compositeDescription
        }
      });

      // Si no quedan acciones, sugerir pasar al siguiente día
      if (newGameState.actionsRemaining === 0 && !newGameState.isGameOver) {
        setTimeout(() => {
          addMessage({
            type: 'system',
            content: '🌙 Has agotado tus acciones para hoy. ¿Quieres pasar al siguiente día?'
          });
        }, 1000);
      }

    } catch (err) {
      setError('Error al ejecutar acción: ' + (err as Error).message);
      addMessage({
        type: 'system',
        content: '❌ Error al procesar tu acción. Por favor, intenta de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextDay = async () => {
    if (!gameEngine) return;

    setIsLoading(true);
    setError(null);

    // Mensaje del usuario pasando al siguiente día
    addMessage({
      type: 'user',
      content: 'Pasar al siguiente día'
    });

    try {
      const story = await gameEngine.nextDay();
      const newGameState = gameEngine.getGameState();
      setGameState(newGameState);

      // Mensaje de transición
      if (!newGameState.isGameOver) {
        addMessage({
          type: 'system',
          content: `🌅 ¡Día ${newGameState.currentDay} de 10! Tienes ${newGameState.actionsRemaining} acciones disponibles.`
        });
      }

      // Respuesta de la IA para el nuevo día
      addMessage({
        type: 'ai',
        content: story.narrative,
        gameData: {
          day: newGameState.currentDay,
          money: newGameState.money,
          actionsRemaining: newGameState.actionsRemaining,
          newElements: {
            characters: story.newCharacters,
            scenarios: story.newScenarios,
            objects: story.newObjects
          },
          statusUpdates: story.statusUpdates,
          storyImage: story.storyImage
        }
      });

    } catch (err) {
      setError('Error al avanzar al siguiente día: ' + (err as Error).message);
      addMessage({
        type: 'system',
        content: '❌ Error al pasar al siguiente día. Por favor, intenta de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    if (gameEngine) {
      startNewGame(gameEngine);
    }
  };

  const getQuickActions = (): QuickAction[] => {
    if (!gameState) return [];

    // Si es el primer día y no hay historial, mostrar opciones de trasfondo
    if (gameState.currentDay === 1 && gameState.gameHistory.length === 0) {
      return [
        {
          id: 'student',
          text: 'Soy estudiante universitario que gastó todo en libros',
          type: 'social',
          riskLevel: 'low'
        },
        {
          id: 'entrepreneur',
          text: 'Fui emprendedor pero mi startup falló',
          type: 'business',
          riskLevel: 'medium'
        },
        {
          id: 'worker',
          text: 'Perdí mi trabajo y este es mi último dólar',
          type: 'survival',
          riskLevel: 'medium'
        },
        {
          id: 'dreamer',
          text: 'Dejé todo atrás para perseguir mi sueño',
          type: 'special',
          riskLevel: 'high'
        }
      ];
    }

    // Acciones normales del juego después del trasfondo
    const actions: QuickAction[] = [
      {
        id: 'work',
        text: 'Buscar trabajo honesto',
        type: 'business',
        riskLevel: 'low'
      },
      {
        id: 'networking',
        text: 'Hacer networking',
        type: 'social',
        riskLevel: 'low'
      },
      {
        id: 'explore',
        text: 'Explorar la ciudad',
        type: 'survival',
        riskLevel: 'medium'
      }
    ];

    // Acciones contextuales según el estado del juego
    if (gameState.money > 50) {
      actions.push({
        id: 'invest',
        text: 'Hacer una inversión',
        type: 'investment',
        riskLevel: 'high'
      });
    }

    if (gameState.money < 10 && gameState.currentDay > 3) {
      actions.push({
        id: 'desperate',
        text: 'Buscar métodos desesperados',
        type: 'crime',
        riskLevel: 'extreme'
      });
    }

    if (gameState.characters.length > 0) {
      actions.push({
        id: 'contact',
        text: 'Contactar a alguien conocido',
        type: 'social',
        riskLevel: 'low'
      });
    }

    return actions;
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Cargando juego...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Barra de estado superior */}
      <GameStatusBar 
        gameState={gameState} 
        onResetGame={resetGame}
        onOpenLibrary={() => setShowElementLibrary(true)}
        gameEngine={gameEngine}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-red-500 text-white p-3 text-center">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-red-200 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              gameState={gameState}
            />
          ))}
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>La IA está pensando...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-700 bg-slate-800">
          <ChatInput
            onSendMessage={executeAction}
            onNextDay={nextDay}
            quickActions={getQuickActions()}
            gameState={gameState}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Biblioteca de Elementos */}
      {showElementLibrary && (
        <ElementLibrary onClose={() => setShowElementLibrary(false)} />
      )}
    </div>
  );
};

export default ChatGameInterface;
