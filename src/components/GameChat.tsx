'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Calendar, Target, Loader2, Users, Package, MapPin, DollarSign, TrendingUp, TrendingDown, PanelRight, X } from 'lucide-react';
import { ChatMessage, FinancialSummary } from '@/types/game';

interface GameChatProps {
  sessionId: string;
  onBackToMenu: () => void;
}

interface GameState {
  currentDay: number;
  maxDays: number;
  gameEnded: boolean;
  scenarioTitle: string;
  currentTime?: string;
  totalMinutesElapsed?: number;
}

interface WorldData {
  characters: Array<{
    id: string;
    name: string;
    description: string;
    traits?: string[];
    relationships?: Record<string, string>;
    status: string;
    backstory?: string;
    motivation?: string;
    imageBase64?: string;
  }>;
  objects: Array<{
    id: string;
    name: string;
    description: string;
    properties?: Record<string, any>;
    location?: string;
    owner?: string;
    imageBase64?: string;
  }>;
  locations: Array<{
    id: string;
    name: string;
    description: string;
    connections?: string[];
    properties?: Record<string, any>;
    imageBase64?: string;
  }>;
  rules: Array<{
    id: string;
    description: string;
    type: string;
    isActive: boolean;
  }>;
  currentState: Record<string, any>;
}

export default function GameChat({ sessionId, onBackToMenu }: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    currentDay: 1,
    maxDays: 10,
    gameEnded: false,
    scenarioTitle: '',
    currentTime: '08:00',
    totalMinutesElapsed: 0
  });
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'gallery' | 'finances' | 'characters' | 'objects' | 'locations' | 'rules'>('gallery');
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [isMillionaireScenario, setIsMillionaireScenario] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial y datos del mundo al montar el componente
  useEffect(() => {
    loadHistory();
    loadWorldData();
    loadFinancialData();
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
        day: entry.day,
        metadata: entry.metadata
      }));

      setMessages(chatMessages);
      setGameState({
        currentDay: data.session.currentDay,
        maxDays: data.scenario.maxDays,
        gameEnded: data.session.isCompleted,
        scenarioTitle: data.scenario.title,
        currentTime: data.session.currentHour && data.session.currentMinute 
          ? `${String(data.session.currentHour).padStart(2, '0')}:${String(data.session.currentMinute).padStart(2, '0')}`
          : '08:00',
        totalMinutesElapsed: data.session.totalMinutesElapsed || 0
      });

      // Detectar si es el escenario millonario
      setIsMillionaireScenario(data.scenario.id === 'millionaire-challenge');

    } catch (error) {
      console.error('Error cargando historial:', error);
      addSystemMessage('Error cargando el historial del juego.');
    }
  };

  const loadWorldData = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_world_data',
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Error cargando datos del mundo');
      }

      const data = await response.json();
      
      // Asegurar que todos los arrays están definidos
      const sanitizedData: WorldData = {
        characters: data.characters || [],
        objects: data.objects || [],
        locations: data.locations || [],
        rules: data.rules || [],
        currentState: data.currentState || {}
      };
      
      setWorldData(sanitizedData);

    } catch (error) {
      console.error('Error cargando datos del mundo:', error);
    }
  };

  const loadFinancialData = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_financial_data',
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Error cargando datos financieros');
      }

      const data = await response.json();
      setFinancialData(data);

    } catch (error) {
      console.error('Error cargando datos financieros:', error);
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
        scenarioTitle: gameState.scenarioTitle,
        currentTime: data.timeInfo?.timeString || gameState.currentTime,
        totalMinutesElapsed: data.timeInfo?.totalMinutesElapsed || gameState.totalMinutesElapsed
      });

      // Mostrar mensaje de tiempo transcurrido si corresponde
      if (data.minutesElapsed && data.minutesElapsed > 0) {
        const hours = Math.floor(data.minutesElapsed / 60);
        const minutes = data.minutesElapsed % 60;
        let timeMessage = '⏰ ';
        if (hours > 0) {
          timeMessage += `${hours}h ${minutes}m han pasado`;
        } else {
          timeMessage += `${minutes} minutos han pasado`;
        }
        timeMessage += ` - Hora actual: ${data.timeInfo?.timeString || gameState.currentTime}`;
        addSystemMessage(timeMessage);
      }

      // Mostrar mensaje de avance de día si corresponde
      if (data.shouldAdvanceDay) {
        addSystemMessage(`🌅 Ha pasado al día ${data.currentDay} de ${data.maxDays}`);
      }

      // Mostrar notificaciones de cambios en el mundo
      if (data.worldChanges && data.worldChanges.summary) {
        addSystemMessage(`🌍 Cambios en el mundo: ${data.worldChanges.summary}`);
      }

      // Mostrar mensaje de fin de juego
      if (data.gameEnded) {
        addSystemMessage('🎭 El juego ha terminado. ¡Gracias por jugar!');
      }

      // Recargar datos del mundo y financieros después de cada respuesta
      loadWorldData();
      if (isMillionaireScenario) {
        loadFinancialData();
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

  const getMessageIcon = (type: string, metadata?: any) => {
    if (type === 'world_change' && metadata?.icon) {
      return metadata.icon;
    }
    
    switch (type) {
      case 'user':
        return '👤';
      case 'ai':
        return '🎭';
      case 'system':
        return '⚙️';
      case 'world_change':
        return '🌍';
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

  const getMessageStyles = (type: string, metadata?: any) => {
    if (type === 'world_change') {
      const color = metadata?.color || 'gray';
      const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500',
        green: 'bg-green-50 border-green-200 border-l-4 border-l-green-500',
        amber: 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500',
        purple: 'bg-purple-50 border-purple-200 border-l-4 border-l-purple-500',
        orange: 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500',
        teal: 'bg-teal-50 border-teal-200 border-l-4 border-l-teal-500',
        gray: 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-500'
      };
      return colorMap[color] || colorMap.gray;
    }
    
    switch (type) {
      case 'user':
        return 'bg-blue-100 border-blue-200';
      case 'ai':
        return 'bg-gray-100 border-gray-200';
      case 'system':
        return 'bg-orange-50 border-orange-300 border-l-4 border-l-orange-500';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const getMessageTitle = (type: string, metadata?: any) => {
    if (type === 'world_change') {
      const typeMap: Record<string, string> = {
        character_new: 'Nuevo Personaje',
        character_updated: 'Personaje Actualizado',
        object_new: 'Nuevo Objeto',
        object_updated: 'Objeto Modificado',
        location_new: 'Nueva Ubicación',
        location_updated: 'Ubicación Alterada'
      };
      return typeMap[metadata?.type] || 'Cambio del Mundo';
    }
    
    switch (type) {
      case 'user':
        return 'Tú';
      case 'ai':
        return 'Narrador';
      case 'system':
        return 'Sistema';
      default:
        return 'Mensaje';
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Contenido Principal */}
      <div className={`flex flex-col transition-all duration-300 ${showSidePanel ? 'mr-80' : ''} flex-1`}>
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
                  ⏰
                  <span>{gameState.currentTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{gameState.gameEnded ? 'Completado' : 'En progreso'}</span>
                </div>
                {gameState.totalMinutesElapsed && gameState.totalMinutesElapsed > 0 && (
                  <div className="flex items-center gap-1">
                    ⏱️
                    <span>
                      {Math.floor(gameState.totalMinutesElapsed / 60)}h {gameState.totalMinutesElapsed % 60}m transcurridos
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSidePanel(!showSidePanel)}
                className="flex items-center gap-2"
              >
                <PanelRight className="w-4 h-4" />
                Info del Juego
              </Button>
              <Button variant="outline" onClick={onBackToMenu}>
                Volver al menú
              </Button>
            </div>
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
                  <div className="text-2xl">{getMessageIcon(message.type, message.metadata)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {getMessageTitle(message.type, message.metadata)}
                      </span>
                      {message.metadata?.elementName && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {message.metadata.elementName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.timestamp)}
                        {message.day && ` • Día ${message.day}`}
                      </span>
                    </div>
                    <div className={`rounded-lg p-3 border ${getMessageStyles(message.type, message.metadata)}`}>
                      {message.type === 'world_change' ? (
                        <div className="prose prose-sm max-w-none">
                          {message.content.split('\n').map((line, index) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <h4 key={index} className="font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</h4>;
                            } else if (line.startsWith('*') && line.endsWith('*')) {
                              return <p key={index} className="text-xs italic text-gray-600 mt-2">{line.slice(1, -1)}</p>;
                            } else if (line.trim() === '') {
                              return <div key={index} className="h-1"></div>;
                            } else {
                              return <p key={index} className="text-sm">{line}</p>;
                            }
                          })}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
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

      {/* Panel Lateral */}
      {showSidePanel && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
          {/* Header del Panel */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Info del Juego</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidePanel(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs del Panel */}
          <div className="grid grid-cols-3 border-b border-gray-200 text-xs">
            <Button
              variant={activeSideTab === 'gallery' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSideTab('gallery')}
              className="rounded-none col-span-3"
            >
              🖼️ Galería
            </Button>
            <Button
              variant={activeSideTab === 'characters' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSideTab('characters')}
              className="rounded-none"
            >
              <Users className="w-3 h-3 mr-1" />
              Personajes
            </Button>
            <Button
              variant={activeSideTab === 'objects' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSideTab('objects')}
              className="rounded-none"
            >
              <Package className="w-3 h-3 mr-1" />
              Objetos
            </Button>
            <Button
              variant={activeSideTab === 'locations' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSideTab('locations')}
              className="rounded-none"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Ubicaciones
            </Button>
            <Button
              variant={activeSideTab === 'rules' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSideTab('rules')}
              className="rounded-none"
            >
              <Target className="w-3 h-3 mr-1" />
              Reglas
            </Button>
            {isMillionaireScenario && (
              <Button
                variant={activeSideTab === 'finances' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSideTab('finances')}
                className="rounded-none col-span-2"
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Finanzas
              </Button>
            )}
          </div>

          {/* Contenido del Panel */}
          <ScrollArea className="flex-1 p-4">

            {activeSideTab === 'gallery' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg text-gray-700">🖼️ Galería del Mundo</h4>
                  <div className="text-xs text-gray-500">
                    {((worldData?.characters?.length || 0) + (worldData?.objects?.length || 0) + (worldData?.locations?.length || 0))} elementos
                  </div>
                </div>
                
                {/* Personajes con imágenes */}
                {worldData?.characters && worldData.characters.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm text-gray-600 border-b pb-1">👥 Personajes</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {worldData.characters.map((character) => (
                        <div key={character.id} className="text-center hover:bg-blue-50 p-2 rounded-lg transition-colors">
                          {character.imageBase64 ? (
                            <img 
                              src={`data:image/png;base64,${character.imageBase64}`}
                              alt={character.name}
                              className="w-20 h-20 rounded-full object-cover border-2 border-blue-300 mx-auto mb-2 hover:border-blue-400 transition-colors"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-blue-100 border-2 border-blue-300 mx-auto mb-2 flex items-center justify-center hover:border-blue-400 transition-colors">
                              <span className="text-2xl">👤</span>
                            </div>
                          )}
                          <p className="text-xs font-medium truncate">{character.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{character.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objetos con imágenes */}
                {worldData?.objects && worldData.objects.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm text-gray-600 border-b pb-1">📦 Objetos</h5>
                    <div className="grid grid-cols-3 gap-2">
                      {worldData.objects.map((object) => (
                        <div key={object.id} className="text-center hover:bg-green-50 p-2 rounded-lg transition-colors">
                          {object.imageBase64 ? (
                            <img 
                              src={`data:image/png;base64,${object.imageBase64}`}
                              alt={object.name}
                              className="w-16 h-16 rounded-md object-cover border border-green-300 mx-auto mb-1 hover:border-green-400 transition-colors"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-md bg-green-100 border border-green-300 mx-auto mb-1 flex items-center justify-center hover:border-green-400 transition-colors">
                              <span className="text-lg">📦</span>
                            </div>
                          )}
                          <p className="text-xs font-medium truncate">{object.name}</p>
                          {object.location && (
                            <p className="text-xs text-gray-400">📍 {object.location}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ubicaciones con imágenes */}
                {worldData?.locations && worldData.locations.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm text-gray-600 border-b pb-1">🏢 Ubicaciones</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {worldData.locations.map((location) => (
                        <div key={location.id} className="text-center hover:bg-yellow-50 p-2 rounded-lg transition-colors">
                          {location.imageBase64 ? (
                            <img 
                              src={`data:image/png;base64,${location.imageBase64}`}
                              alt={location.name}
                              className="w-20 h-20 rounded-lg object-cover border border-yellow-300 mx-auto mb-2 hover:border-yellow-400 transition-colors"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-yellow-100 border border-yellow-300 mx-auto mb-2 flex items-center justify-center hover:border-yellow-400 transition-colors">
                              <span className="text-2xl">🏢</span>
                            </div>
                          )}
                          <p className="text-xs font-medium truncate">{location.name}</p>
                          {location.connections && location.connections.length > 0 && (
                            <p className="text-xs text-gray-400">🔗 {location.connections.length} conexiones</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensaje si no hay elementos */}
                {(!worldData?.characters || worldData.characters.length === 0) &&
                 (!worldData?.objects || worldData.objects.length === 0) &&
                 (!worldData?.locations || worldData.locations.length === 0) && (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">🎭</span>
                    <p className="text-gray-500 text-sm">El mundo aún está vacío...</p>
                    <p className="text-gray-400 text-xs">¡Comienza a jugar para ver aparecer personajes, objetos y lugares!</p>
                  </div>
                )}
              </div>
            )}

            {activeSideTab === 'characters' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Personajes del Mundo</h4>
                {worldData?.characters?.length === 0 || !worldData?.characters ? (
                  <p className="text-gray-500 text-sm">No hay personajes definidos aún.</p>
                ) : (
                  <div className="space-y-2">
                    {worldData.characters.map((character) => (
                      <div key={character.id} className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex items-start gap-3">
                          {character.imageBase64 ? (
                            <img 
                              src={`data:image/png;base64,${character.imageBase64}`}
                              alt={character.name}
                              className="w-12 h-12 rounded-full object-cover border border-blue-300"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{character.name}</h5>
                            <p className="text-xs text-gray-600 mb-2">{character.description}</p>
                            {character.traits && character.traits.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {character.traits.slice(0, 3).map((trait, index) => (
                                  <span key={index} className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded">
                                    {trait}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Estado: {character.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSideTab === 'objects' && (
              <div className="space-y-4">
                {/* Tu Inventario */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">🎒 Tu Inventario</h4>
                  {worldData?.objects?.filter(obj => obj.owner === 'jugador' || obj.location === 'inventario').length === 0 ? (
                    <p className="text-gray-500 text-sm">No tienes objetos en tu inventario</p>
                  ) : (
                    <div className="space-y-2">
                      {worldData?.objects?.filter(obj => obj.owner === 'jugador' || obj.location === 'inventario').map((object) => (
                        <div key={object.id} className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                          <div className="flex items-start gap-3">
                            {object.imageBase64 ? (
                              <img 
                                src={`data:image/png;base64,${object.imageBase64}`}
                                alt={object.name}
                                className="w-12 h-12 rounded-md object-cover border border-blue-300"
                              />
                            ) : (
                              <span className="text-lg">🎒</span>
                            )}
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{object.name}</h5>
                              <p className="text-xs text-gray-600 mb-1">{object.description}</p>
                              {object.properties?.status && (
                                <div className="text-xs text-gray-500">
                                  Estado: {object.properties.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Otros Objetos del Mundo */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">🌍 Objetos del Mundo</h4>
                  {worldData?.objects?.filter(obj => obj.owner !== 'jugador' && obj.location !== 'inventario').length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay otros objetos en el mundo.</p>
                  ) : (
                    <div className="space-y-2">
                      {worldData?.objects?.filter(obj => obj.owner !== 'jugador' && obj.location !== 'inventario').map((object) => (
                        <div key={object.id} className="border rounded-lg p-3 bg-green-50">
                          <div className="flex items-start gap-3">
                            {object.imageBase64 ? (
                              <img 
                                src={`data:image/png;base64,${object.imageBase64}`}
                                alt={object.name}
                                className="w-12 h-12 rounded-md object-cover border border-green-300"
                              />
                            ) : (
                              <span className="text-lg">📦</span>
                            )}
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{object.name}</h5>
                              <p className="text-xs text-gray-600 mb-2">{object.description}</p>
                              {object.location && (
                                <div className="text-xs text-gray-500 mb-1">
                                  📍 {object.location}
                                </div>
                              )}
                              {object.owner && (
                                <div className="text-xs text-gray-500">
                                  👤 Propietario: {object.owner}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSideTab === 'locations' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Ubicaciones del Mundo</h4>
                {worldData?.locations?.length === 0 || !worldData?.locations ? (
                  <p className="text-gray-500 text-sm">No hay ubicaciones definidas aún.</p>
                ) : (
                  <div className="space-y-2">
                    {worldData.locations.map((location) => (
                      <div key={location.id} className="border rounded-lg p-3 bg-yellow-50">
                        <div className="flex items-start gap-3">
                          {location.imageBase64 ? (
                            <img 
                              src={`data:image/png;base64,${location.imageBase64}`}
                              alt={location.name}
                              className="w-12 h-12 rounded-md object-cover border border-yellow-300"
                            />
                          ) : (
                            <span className="text-lg">🏢</span>
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{location.name}</h5>
                            <p className="text-xs text-gray-600 mb-2">{location.description}</p>
                            {location.connections && location.connections.length > 0 && (
                              <div className="text-xs text-gray-500">
                                🔗 Conecta con: {location.connections.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSideTab === 'rules' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Reglas del Mundo</h4>
                {worldData?.rules?.filter(rule => rule.isActive).length === 0 || !worldData?.rules ? (
                  <p className="text-gray-500 text-sm">No hay reglas activas definidas aún.</p>
                ) : (
                  <div className="space-y-2">
                    {worldData.rules.filter(rule => rule.isActive).map((rule) => (
                      <div key={rule.id} className="border rounded-lg p-3 bg-purple-50">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">⚖️</span>
                          <div className="flex-1">
                            <p className="text-xs text-gray-700">{rule.description}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              Tipo: {rule.type}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSideTab === 'finances' && isMillionaireScenario && (
              <div className="space-y-4">
                {/* Resumen Financiero */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">💰 Resumen Financiero</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Dinero Actual:</span>
                      <span className="font-bold text-lg text-green-600">
                        ${financialData?.currentBalance?.toLocaleString() || '1'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Ingresos Totales:</span>
                      <span className="text-sm text-green-600 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        ${financialData?.totalIncome?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gastos Totales:</span>
                      <span className="text-sm text-red-600 flex items-center">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        ${financialData?.totalExpenses?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Ganancia Neta:</span>
                      <span className={`text-sm font-bold ${(financialData?.netChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${financialData?.netChange?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Historial de Transacciones */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">📊 Historial de Transacciones</h4>
                  {financialData?.transactions?.length === 0 || !financialData?.transactions ? (
                    <p className="text-gray-500 text-sm">No hay transacciones registradas</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {financialData.transactions.slice().reverse().map((transaction) => (
                        <div key={transaction.id} className={`border rounded-lg p-3 ${transaction.type === 'income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-1">
                                {transaction.type === 'income' ? 
                                  <TrendingUp className="w-3 h-3 text-green-600" /> : 
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                }
                                <span className={`text-xs font-medium ${transaction.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                                  {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                                </span>
                                <span className="text-xs text-gray-500">• Día {transaction.day}</span>
                              </div>
                              <p className="text-xs text-gray-700 mb-1">{transaction.description}</p>
                              <div className="text-xs text-gray-500">
                                Categoría: {transaction.category}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                Balance: ${transaction.balanceAfter.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
