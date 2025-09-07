'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Play, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Target, 
  Trash2, 
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { GameSession, GameScenario } from '@/types/game';

interface SessionHistoryProps {
  onBackToMenu: () => void;
  onContinueGame: (sessionId: string) => void;
}

interface SessionWithDetails extends GameSession {
  scenario: GameScenario;
  messageCount: number;
  lastActivity: Date;
}

export default function SessionHistory({ onBackToMenu, onContinueGame }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  useEffect(() => {
    loadSessionHistory();
  }, []);

  const loadSessionHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Error cargando historial');
      }
      
      const data = await response.json();
      
      // Validar y filtrar sesiones con datos válidos
      const validSessions = (data.sessions || []).filter((session: any) => {
        return session && 
               session.id && 
               session.scenario && 
               session.scenario.title &&
               session.startedAt;
      });
      
      setSessions(validSessions);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setSessions([]); // Establecer array vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sesión? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingSession(sessionId);
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error eliminando sesión');
      }

      // Remover la sesión de la lista local
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error eliminando sesión:', error);
      alert('Error eliminando la sesión. Inténtalo de nuevo.');
    } finally {
      setDeletingSession(null);
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Fecha no disponible';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  const formatLastActivity = (date: Date | string | null | undefined) => {
    if (!date) return 'Sin actividad';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Sin actividad';
      
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return 'Hoy';
      } else if (diffInHours < 48) {
        return 'Ayer';
      } else {
        const days = Math.floor(diffInHours / 24);
        return `Hace ${days} días`;
      }
    } catch (error) {
      console.error('Error formateando última actividad:', error);
      return 'Sin actividad';
    }
  };

  const getStatusColor = (session: SessionWithDetails) => {
    if (session.isCompleted) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (session.currentDay >= session.scenario.maxDays) {
      return 'text-red-600 bg-red-50 border-red-200';
    } else {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (session: SessionWithDetails) => {
    if (session.isCompleted) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (session.currentDay >= session.scenario.maxDays) {
      return <XCircle className="w-4 h-4" />;
    } else {
      return <Play className="w-4 h-4" />;
    }
  };

  const getStatusText = (session: SessionWithDetails) => {
    if (session.isCompleted) {
      return 'Completada';
    } else if (session.currentDay >= session.scenario.maxDays) {
      return 'Tiempo agotado';
    } else {
      return 'En progreso';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 mt-8">
          <Button
            variant="outline"
            onClick={onBackToMenu}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al menú
          </Button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Historial de Sesiones
              </span>
            </h1>
            <p className="text-muted-foreground">
              Revisa y continúa tus aventuras anteriores
            </p>
          </div>
        </div>

        {/* Session Stats */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-sm text-muted-foreground">Sesiones totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {sessions.filter(s => s.isCompleted).length}
                </p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Play className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {sessions.filter(s => !s.isCompleted && s.currentDay < s.scenario.maxDays).length}
                </p>
                <p className="text-sm text-muted-foreground">En progreso</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay sesiones aún</h3>
              <p className="text-muted-foreground mb-6">
                Comienza tu primera aventura para ver el historial aquí
              </p>
              <Button onClick={onBackToMenu}>
                Crear nueva sesión
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              // Validación adicional por sesión
              if (!session || !session.id || !session.scenario) {
                return null;
              }
              
              return (
                <Card key={session.id} className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 flex items-center gap-2">
                        {session.scenario.title}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(session)}`}>
                          {getStatusIcon(session)}
                          {getStatusText(session)}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-base">
                        {session.scenario.description}
                      </CardDescription>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      disabled={deletingSession === session.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingSession === session.id ? (
                        <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Session Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span>Día {session.currentDay}/{session.scenario.maxDays}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span>{session.messageCount} mensajes</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(session.startedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatLastActivity(session.lastActivity)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="text-muted-foreground">
                        {Math.round((session.currentDay / session.scenario.maxDays) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((session.currentDay / session.scenario.maxDays) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => onContinueGame(session.id)}
                    disabled={session.isCompleted}
                    className="w-full"
                    variant={session.isCompleted ? "outline" : "default"}
                  >
                    {session.isCompleted ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Ver aventura completada
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Continuar aventura
                      </div>
                    )}
                  </Button>
                </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
