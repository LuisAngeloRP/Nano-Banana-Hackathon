'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GameScenario } from '@/types/game';
import { Play, Clock, Target, Sparkles } from 'lucide-react';

interface GameMenuProps {
  onStartGame: (sessionId: string) => void;
}

export default function GameMenu({ onStartGame }: GameMenuProps) {
  const [scenarios, setScenarios] = useState<GameScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await fetch('/api/chat');
      if (!response.ok) {
        throw new Error('Error cargando escenarios');
      }
      
      const data = await response.json();
      setScenarios(data.scenarios);
    } catch (error) {
      console.error('Error cargando escenarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_session',
          scenarioId
        }),
      });

      if (!response.ok) {
        throw new Error('Error creando sesión');
      }

      const data = await response.json();
      onStartGame(data.sessionId);
    } catch (error) {
      console.error('Error iniciando juego:', error);
      setSelectedScenario(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando escenarios...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Historias Evolutivas
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experimenta aventuras narrativas donde cada decisión cuenta y la historia evoluciona 
            con inteligencia artificial. Elige tu desafío y vive una experiencia única.
          </p>
        </div>

        {/* Scenarios Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <Card 
              key={scenario.id} 
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-blue-200"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      {scenario.title}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {scenario.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Game Info */}
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{scenario.maxDays} días</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    <span>Desafío narrativo</span>
                  </div>
                </div>

                {/* Rules Preview */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2 text-gray-700">Reglas principales:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {scenario.rules.slice(0, 3).map((rule, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                    {scenario.rules.length > 3 && (
                      <li className="text-blue-500 text-xs">
                        +{scenario.rules.length - 3} reglas más...
                      </li>
                    )}
                  </ul>
                </div>

                {/* Start Button */}
                <Button
                  onClick={() => startGame(scenario.id)}
                  disabled={selectedScenario === scenario.id}
                  className="w-full"
                  size="lg"
                >
                  {selectedScenario === scenario.id ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Iniciando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Comenzar aventura
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 mb-8">
          <p className="text-sm text-muted-foreground">
            Potenciado por <span className="font-medium">Gemini AI</span> • 
            Cada historia es única e irrepetible
          </p>
        </div>
      </div>
    </div>
  );
}
