'use client';

import { AssetGenerationSummary, AssetInfo } from '@/types/game';

interface AssetDisplayProps {
  assetsGenerated: AssetGenerationSummary;
  compositeImage?: string;
  compositeDescription?: string;
}

const AssetDisplay = ({ assetsGenerated, compositeImage, compositeDescription }: AssetDisplayProps) => {
  const { newAssets, reusedAssets, sceneComposition } = assetsGenerated;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'character': return '👤';
      case 'scenario': return '🏢';
      case 'object': return '📦';
      default: return '🔧';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'character': return 'border-purple-400 bg-purple-500/10';
      case 'scenario': return 'border-blue-400 bg-blue-500/10';
      case 'object': return 'border-green-400 bg-green-500/10';
      default: return 'border-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Assets Nuevos */}
      {newAssets.length > 0 && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            ✨ Assets Nuevos Generados ({newAssets.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {newAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} isNew={true} />
            ))}
          </div>
        </div>
      )}

      {/* Assets Reutilizados */}
      {reusedAssets.length > 0 && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            ♻️ Assets Reutilizados ({reusedAssets.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reusedAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} isNew={false} />
            ))}
          </div>
        </div>
      )}

      {/* Escena Compuesta */}
      <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-600">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🎬 Escena Final Compuesta
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Imagen de la escena */}
          <div className="space-y-3">
            {compositeImage ? (
              <div className="relative">
                <img
                  src={compositeImage}
                  alt="Escena compuesta"
                  className="w-full h-64 object-cover rounded-lg border border-slate-500"
                />
                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  🍌 Nano Banana
                </div>
              </div>
            ) : (
              <div className="w-full h-64 bg-slate-600 rounded-lg border border-slate-500 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <div className="text-4xl mb-2">🎨</div>
                  <p>Escena en proceso...</p>
                </div>
              </div>
            )}

            {/* Información de composición */}
            <div className="bg-slate-700/50 rounded p-3">
              <h4 className="font-semibold text-white mb-2">🎭 Elementos en escena:</h4>
              <div className="flex flex-wrap gap-1">
                {sceneComposition.elements.map((element, index) => (
                  <span
                    key={index}
                    className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded"
                  >
                    {element}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                🎨 Mood: <span className="font-medium">{sceneComposition.mood}</span>
              </div>
            </div>
          </div>

          {/* Descripción de la escena */}
          <div className="space-y-3">
            {compositeDescription && (
              <div className="bg-slate-700/50 rounded p-3">
                <h4 className="font-semibold text-white mb-2">📝 Descripción de la escena:</h4>
                <div className="text-sm text-slate-300 whitespace-pre-line">
                  {compositeDescription}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AssetCardProps {
  asset: AssetInfo;
  isNew: boolean;
}

const AssetCard = ({ asset, isNew }: AssetCardProps) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'character': return '👤';
      case 'scenario': return '🏢';
      case 'object': return '📦';
      default: return '🔧';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'character': return 'border-purple-400 bg-purple-500/10';
      case 'scenario': return 'border-blue-400 bg-blue-500/10';
      case 'object': return 'border-green-400 bg-green-500/10';
      default: return 'border-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className={`border-2 ${getTypeColor(asset.type)} rounded-lg p-3 transition-all hover:scale-105`}>
      {/* Header del asset */}
      <div className="flex items-start gap-3 mb-3">
        {asset.imageUrl ? (
          <img
            src={asset.imageUrl}
            alt={asset.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-500"
          />
        ) : (
          <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
            {getTypeIcon(asset.type)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white truncate">{asset.name}</h4>
            {isNew && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">NEW</span>
            )}
            {!isNew && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">REUSED</span>
            )}
          </div>
          <div className="text-xs text-slate-400 capitalize">{asset.type}</div>
        </div>
      </div>

      {/* Descripción */}
      <p className="text-sm text-slate-300 mb-3 line-clamp-3">
        {asset.description}
      </p>

      {/* Características únicas */}
      {asset.uniqueTraits.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-400 mb-1">Características únicas:</div>
          <div className="flex flex-wrap gap-1">
            {asset.uniqueTraits.map((trait, index) => (
              <span
                key={index}
                className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Firma visual */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate-400 mb-1">Firma visual:</div>
        <p className="text-xs text-slate-300 italic">
          {asset.visualSignature}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="text-xs text-slate-400 border-t border-slate-600 pt-2">
        {asset.usageCount && (
          <div>📈 Usado {asset.usageCount} veces</div>
        )}
        {asset.createdAt && (
          <div>📅 Creado {new Date(asset.createdAt).toLocaleDateString()}</div>
        )}
      </div>
    </div>
  );
};

export default AssetDisplay;
