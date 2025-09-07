'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Calendar, Target, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/types/game';

interface GameChatProps {
  sessionId: string;
  onBackToMenu: () => void;
}

interface GameState {
  currentDay: number;
  maxDays: number;
  gameEnded: boolean;
  scenarioTitle: string;
}

export default function GameChat({ sessionId, onBackToMenu }: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    currentDay: 1,
    maxDays: 10,
    gameEnded: false,
    scenarioTitle: ''
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial al montar el componente
  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  // Auto-scroll al final cuando hay mensajes nuevos
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_history',
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Error cargando historial');
      }

      const data = await response.json();
      
      // Convertir entradas de historia a mensajes de chat
      const chatMessages: ChatMessage[] = data.history.map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        content: entry.content,
        timestamp: new Date(entry.timestamp),
        day: entry.day
      }));

      setMessages(chatMessages);
      setGameState({
        currentDay: data.session.currentDay,
        maxDays: data.scenario.maxDays,
        gameEnded: data.session.isCompleted,
        scenarioTitle: data.scenario.title
      });

    } catch (error) {
      console.error('Error cargando historial:', error);
      addSystemMessage('Error cargando el historial del juego.');
    }
  };

  const addSystemMessage = (content: string) => {
    const message: ChatMessage = {
      id: `system_${Date.now()}`,
      type: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading || gameState.gameEnded) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
      day: gameState.currentDay
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_message',
          sessionId,
          message: currentMessage
        }),
      });

      if (!response.ok) {
        throw new Error('Error enviando mensaje');
      }

      const data = await response.json();

      // Agregar respuesta de la IA
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        day: data.currentDay
      };

      setMessages(prev => [...prev, aiMessage]);

      // Actualizar estado del juego
      setGameState({
        currentDay: data.currentDay,
        maxDays: data.maxDays,
        gameEnded: data.gameEnded,
        scenarioTitle: gameState.scenarioTitle
      });

      // Mostrar mensaje de avance de día si corresponde
      if (data.shouldAdvanceDay) {
        addSystemMessage(`🌅 Ha pasado al día ${data.currentDay} de ${data.maxDays}`);
      }

      // Mostrar mensaje de fin de juego
      if (data.gameEnded) {
        addSystemMessage('🎭 El juego ha terminado. ¡Gracias por jugar!');
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      addSystemMessage('Error enviando el mensaje. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return '👤';
      case 'ai':
        return '🎭';
      case 'system':
        return '⚙️';
      default:
        return '💭';
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <Card className="m-4 mb-2">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">{gameState.scenarioTitle}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Día {gameState.currentDay} de {gameState.maxDays}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{gameState.gameEnded ? 'Completado' : 'En progreso'}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={onBackToMenu}>
              Volver al menú
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 mx-4 mb-2">
        <CardContent className="p-0">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="text-2xl">{getMessageIcon(message.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.type === 'user' ? 'Tú' : 
                         message.type === 'ai' ? 'Narrador' : 'Sistema'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.timestamp)}
                        {message.day && ` • Día ${message.day}`}
                      </span>
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-blue-100 border-blue-200' 
                        : message.type === 'ai'
                        ? 'bg-gray-100 border-gray-200'
                        : 'bg-yellow-50 border-yellow-200'
                    } border`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="text-2xl">🎭</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">Narrador</span>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="rounded-lg p-3 bg-gray-100 border-gray-200 border">
                      <p className="text-sm text-muted-foreground">Pensando...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card className="m-4 mt-2">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                gameState.gameEnded 
                  ? "El juego ha terminado" 
                  : "Describe tu acción..."
              }
              disabled={isLoading || gameState.gameEnded}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading || gameState.gameEnded}
              size="lg"
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {!gameState.gameEnded && (
            <p className="text-xs text-muted-foreground mt-2">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
