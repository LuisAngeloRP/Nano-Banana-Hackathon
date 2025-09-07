'use client';

import { useState, useEffect } from 'react';
import { ElementLibraryManager } from '@/lib/elementLibrary';
import { StoredCharacter, StoredScenario, StoredObject, ElementLibrary } from '@/types/game';

interface ElementLibraryProps {
  onClose: () => void;
}

const ElementLibraryComponent = ({ onClose }: ElementLibraryProps) => {
  const [library, setLibrary] = useState<ElementLibrary | null>(null);
  const [activeTab, setActiveTab] = useState<'characters' | 'scenarios' | 'objects'>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'recent'>('usage');
  const [libraryManager] = useState(() => new ElementLibraryManager());

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = () => {
    const lib = libraryManager.getLibrary();
    setLibrary(lib);
  };

  const getFilteredAndSortedElements = () => {
    if (!library) return [];

    let elements: (StoredCharacter | StoredScenario | StoredObject)[] = [];
    
    switch (activeTab) {
      case 'characters':
        elements = library.characters;
        break;
      case 'scenarios':
        elements = library.scenarios;
        break;
      case 'objects':
        elements = library.objects;
        break;
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      elements = elements.filter(element => 
        element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        element.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        element.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Ordenar
    switch (sortBy) {
      case 'name':
        elements.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'usage':
        elements.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'recent':
        elements.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
        break;
    }

    return elements;
  };

  const cleanupLibrary = () => {
    libraryManager.cleanupLibrary(30);
    loadLibrary();
  };

  const exportLibrary = () => {
    const exportData = libraryManager.exportLibrary();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nano-banana-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStats = () => {
    if (!library) return null;
    return libraryManager.getStats();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredElements = getFilteredAndSortedElements();
  const stats = getStats();

  if (!library) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 text-white p-6 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Cargando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 text-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-purple-300">📚 Biblioteca de Elementos</h2>
            <p className="text-slate-400 mt-1">
              {stats?.totalElements || 0} elementos totales
              {stats?.lastUpdated && ` • Actualizada ${formatDate(stats.lastUpdated)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Stats Panel */}
        {stats && (
          <div className="p-4 bg-slate-900 border-b border-slate-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-purple-600 bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-300">{stats.totalCharacters}</div>
                <div className="text-sm text-slate-400">Personajes</div>
              </div>
              <div className="bg-blue-600 bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-300">{stats.totalScenarios}</div>
                <div className="text-sm text-slate-400">Escenarios</div>
              </div>
              <div className="bg-green-600 bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-300">{stats.totalObjects}</div>
                <div className="text-sm text-slate-400">Objetos</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Tabs */}
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('characters')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'characters' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👥 Personajes ({library.characters.length})
              </button>
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'scenarios' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏢 Escenarios ({library.scenarios.length})
              </button>
              <button
                onClick={() => setActiveTab('objects')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'objects' 
                    ? 'bg-green-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📦 Objetos ({library.objects.length})
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="usage">Más usados</option>
              <option value="recent">Más recientes</option>
              <option value="name">Por nombre</option>
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={cleanupLibrary}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                title="Limpiar elementos no usados"
              >
                🧹 Limpiar
              </button>
              <button
                onClick={exportLibrary}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                title="Exportar biblioteca"
              >
                📥 Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredElements.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-lg">No se encontraron elementos</p>
              <p className="text-sm">
                {searchQuery 
                  ? 'Intenta con otros términos de búsqueda' 
                  : 'Los elementos aparecerán aquí conforme juegues'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredElements.map((element) => (
                <ElementCard
                  key={element.id}
                  element={element}
                  type={activeTab.slice(0, -1) as 'character' | 'scenario' | 'object'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ElementCardProps {
  element: StoredCharacter | StoredScenario | StoredObject;
  type: 'character' | 'scenario' | 'object';
}

const ElementCard = ({ element, type }: ElementCardProps) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'character': return '👤';
      case 'scenario': return '🏢';
      case 'object': return '📦';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'character': return 'border-purple-500 bg-purple-600 bg-opacity-10';
      case 'scenario': return 'border-blue-500 bg-blue-600 bg-opacity-10';
      case 'object': return 'border-green-500 bg-green-600 bg-opacity-10';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <div className={`border-2 ${getTypeColor()} rounded-lg p-4 hover:shadow-lg transition-all`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {element.imageUrl ? (
          <img
            src={element.imageUrl}
            alt={element.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
            {getTypeIcon()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white truncate">{element.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>📈 {element.usageCount} usos</span>
            <span>•</span>
            <span>🕒 {formatDate(element.lastUsed)}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-300 text-sm mb-3 line-clamp-3">
        {element.description}
      </p>

      {/* Type-specific info */}
      {type === 'character' && 'personality' in element && (
        <div className="text-xs text-slate-400 mb-2">
          <span className="font-medium">Personalidad:</span> {element.personality}
        </div>
      )}

      {type === 'scenario' && 'atmosphere' in element && (
        <div className="text-xs text-slate-400 mb-2">
          <span className="font-medium">Atmósfera:</span> {element.atmosphere}
        </div>
      )}

      {type === 'object' && 'value' in element && (
        <div className="text-xs text-slate-400 mb-2">
          <span className="font-medium">Valor:</span> ${element.value}
        </div>
      )}

      {/* Tags */}
      {element.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {element.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
          {element.tags.length > 3 && (
            <span className="text-slate-400 text-xs">+{element.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
        Creado {formatDate(element.createdAt)}
      </div>
    </div>
  );
};

export default ElementLibraryComponent;
