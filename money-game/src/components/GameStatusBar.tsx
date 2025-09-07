'use client';

import { useState } from 'react';
import { GameState } from '@/types/game';
import { GameEngine } from '@/lib/gameEngine';

interface GameStatusBarProps {
  gameState: GameState;
  onResetGame: () => void;
  onOpenLibrary?: () => void;
  gameEngine?: GameEngine | null;
}

const GameStatusBar = ({ gameState, onResetGame, onOpenLibrary, gameEngine }: GameStatusBarProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const getMoneyColor = () => {
    if (gameState.money >= 1000000) return 'text-purple-400';
    if (gameState.money >= 100000) return 'text-green-400';
    if (gameState.money >= 10000) return 'text-blue-400';
    if (gameState.money >= 1000) return 'text-yellow-400';
    if (gameState.money >= 100) return 'text-orange-400';
    if (gameState.money <= 0) return 'text-red-400';
    return 'text-white';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-400';
      case 'suspicious': return 'text-yellow-400';
      case 'wanted': return 'text-orange-400';
      case 'fugitive': return 'text-red-400';
      case 'respected': return 'text-blue-400';
      case 'feared': return 'text-purple-400';
      case 'beloved': return 'text-pink-400';
      case 'notorious': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Título */}
            <h1 className="text-xl font-bold text-white">
              💰 De $1 a Millonario
            </h1>

            {/* Stats principales */}
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <span className="text-gray-400">Día:</span>
                <span className="font-semibold text-white">
                  {gameState.currentDay}/10
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-gray-400">Dinero:</span>
                <span className={`font-bold ${getMoneyColor()}`}>
                  {formatMoney(gameState.money)}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-gray-400">Acciones:</span>
                <span className="font-semibold text-white">
                  {gameState.actionsRemaining}/3
                </span>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center space-x-2">
            {/* Botón de Biblioteca */}
            {onOpenLibrary && (
              <button
                onClick={onOpenLibrary}
                className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                title="Abrir biblioteca de elementos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Ver detalles"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={onResetGame}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Reiniciar juego"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats para móvil */}
        <div className="md:hidden mt-3 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-white">{gameState.currentDay}/10</div>
            <div className="text-gray-400">Día</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${getMoneyColor()}`}>
              {formatMoney(gameState.money)}
            </div>
            <div className="text-gray-400">Dinero</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-white">{gameState.actionsRemaining}/3</div>
            <div className="text-gray-400">Acciones</div>
          </div>
        </div>

        {/* Detalles expandidos */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {/* Estado del jugador */}
              <div className="bg-slate-700 p-3 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Estado Personal</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reputación:</span>
                    <span className={getStatusColor(gameState.playerStatus.reputation)}>
                      {gameState.playerStatus.reputation}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Legal:</span>
                    <span className={getStatusColor(gameState.playerStatus.legalStatus)}>
                      {gameState.playerStatus.legalStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Salud:</span>
                    <span className={getStatusColor(gameState.playerStatus.healthStatus)}>
                      {gameState.playerStatus.healthStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mental:</span>
                    <span className={getStatusColor(gameState.playerStatus.mentalState)}>
                      {gameState.playerStatus.mentalState}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progreso */}
              <div className="bg-slate-700 p-3 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Progreso</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Día actual</span>
                      <span className="text-white">{gameState.currentDay}/10</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${(gameState.currentDay / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Acciones hoy</span>
                      <span className="text-white">{3 - gameState.actionsRemaining}/3</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${((3 - gameState.actionsRemaining) / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="bg-slate-700 p-3 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Estadísticas</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Acciones totales:</span>
                    <span className="text-white">{gameState.gameHistory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Personajes:</span>
                    <span className="text-white">{gameState.characters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lugares:</span>
                    <span className="text-white">{gameState.scenarios.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Objetos:</span>
                    <span className="text-white">{gameState.objects.length}</span>
                  </div>
                  {gameEngine && (
                    <>
                      <div className="border-t border-slate-600 pt-1 mt-2">
                        <div className="flex justify-between">
                          <span className="text-purple-400">📚 Biblioteca:</span>
                          <span className="text-purple-300">
                            {(() => {
                              try {
                                const stats = gameEngine.getElementLibraryStats();
                                return stats ? stats.totalElements : 0;
                              } catch {
                                return 0;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Alertas */}
              <div className="bg-slate-700 p-3 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Estado</h3>
                <div className="space-y-1 text-xs">
                  {gameState.isGameOver && (
                    <div className="text-red-400 font-semibold">
                      🚨 Juego terminado
                    </div>
                  )}
                  {gameState.currentDay >= 8 && !gameState.isGameOver && (
                    <div className="text-yellow-400">
                      ⚠️ Pocos días restantes
                    </div>
                  )}
                  {gameState.money >= 1000000 && (
                    <div className="text-purple-400">
                      🏆 ¡Millonario!
                    </div>
                  )}
                  {gameState.money < 10 && gameState.currentDay > 3 && (
                    <div className="text-red-400">
                      💸 Dinero muy bajo
                    </div>
                  )}
                  {gameState.playerStatus.legalStatus !== 'clean' && (
                    <div className="text-orange-400">
                      🚔 Estado legal comprometido
                    </div>
                  )}
                  {gameState.actionsRemaining === 0 && !gameState.isGameOver && (
                    <div className="text-blue-400">
                      🌙 Sin acciones hoy
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStatusBar;
