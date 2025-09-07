'use client';

import { ChatMessage as ChatMessageType, GameState } from '@/types/game';

interface ChatMessageProps {
  message: ChatMessageType;
  gameState: GameState;
}

const ChatMessage = ({ message, gameState }: ChatMessageProps) => {
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-slate-700 text-gray-300 px-4 py-2 rounded-lg text-sm max-w-md text-center">
          {message.content}
          <div className="text-xs text-gray-500 mt-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg max-w-md">
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className="text-xs text-blue-200 mt-1 text-right">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex justify-start">
      <div className="bg-slate-800 border border-slate-700 text-white p-4 rounded-lg max-w-3xl">
        {/* Avatar y header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
            🎭
          </div>
          <div className="text-sm text-gray-400">
            Narrador
          </div>
          {message.gameData && (
            <div className="text-xs text-gray-500">
              Día {message.gameData.day} • {formatTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* Imagen de la historia (si existe) */}
        {message.gameData?.storyImage && (
          <div className="mb-4">
            <img 
              src={message.gameData.storyImage} 
              alt="Escena de la historia"
              className="w-full max-w-md rounded-lg shadow-lg"
              onError={(e) => {
                // Si la imagen falla, ocultarla
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Contenido principal */}
        <div className="prose prose-invert max-w-none">
          <div className="text-gray-100 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>

        {/* Información del juego */}
        {message.gameData && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-700 p-2 rounded text-center">
                <div className="text-white font-semibold">
                  {formatMoney(message.gameData.money)}
                </div>
                <div className="text-gray-400 text-xs">Dinero</div>
              </div>
              
              <div className="bg-slate-700 p-2 rounded text-center">
                <div className="text-white font-semibold">
                  {message.gameData.actionsRemaining}
                </div>
                <div className="text-gray-400 text-xs">Acciones</div>
              </div>
              
              <div className="bg-slate-700 p-2 rounded text-center">
                <div className="text-white font-semibold">
                  {message.gameData.day}/10
                </div>
                <div className="text-gray-400 text-xs">Día</div>
              </div>

              {message.gameData.moneyChange !== undefined && message.gameData.moneyChange !== 0 && (
                <div className="bg-slate-700 p-2 rounded text-center">
                  <div className={`font-semibold ${
                    message.gameData.moneyChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {message.gameData.moneyChange > 0 ? '+' : ''}${message.gameData.moneyChange}
                  </div>
                  <div className="text-gray-400 text-xs">Cambio</div>
                </div>
              )}
            </div>

            {/* Nuevos elementos descubiertos */}
            {message.gameData.newElements && (
              <div className="mt-4 space-y-2">
                {message.gameData.newElements.characters && message.gameData.newElements.characters.length > 0 && (
                  <div className="bg-slate-700 rounded p-2">
                    <div className="text-xs font-semibold text-yellow-400 mb-1">
                      👥 Nuevos personajes:
                    </div>
                    <div className="text-xs text-gray-300">
                      {message.gameData.newElements.characters.map(c => c.name).join(', ')}
                    </div>
                  </div>
                )}

                {message.gameData.newElements.scenarios && message.gameData.newElements.scenarios.length > 0 && (
                  <div className="bg-slate-700 rounded p-2">
                    <div className="text-xs font-semibold text-blue-400 mb-1">
                      🗺️ Nuevos lugares:
                    </div>
                    <div className="text-xs text-gray-300">
                      {message.gameData.newElements.scenarios.map(s => s.name).join(', ')}
                    </div>
                  </div>
                )}

                {message.gameData.newElements.objects && message.gameData.newElements.objects.length > 0 && (
                  <div className="bg-slate-700 rounded p-2">
                    <div className="text-xs font-semibold text-green-400 mb-1">
                      📦 Nuevos objetos:
                    </div>
                    <div className="text-xs text-gray-300">
                      {message.gameData.newElements.objects.map(o => o.name).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cambios de estado */}
            {message.gameData.statusUpdates && Object.keys(message.gameData.statusUpdates).length > 0 && (
              <div className="mt-4 bg-slate-700 rounded p-2">
                <div className="text-xs font-semibold text-purple-400 mb-1">
                  ⚡ Cambios de estado:
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(message.gameData.statusUpdates).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400 capitalize">{key}:</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
