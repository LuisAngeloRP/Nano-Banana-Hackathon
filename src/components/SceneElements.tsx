/**
 * Componente para mostrar elementos visuales de la escena en los mensajes narrativos
 */
import { useSceneImages } from '@/hooks/useSceneImages';

interface SceneElement {
  name: string;
  type: 'character' | 'object' | 'location';
  hasImage?: boolean;
}

interface SceneElementsProps {
  elements: SceneElement[];
  description?: string;
  sessionId: string;
}

export default function SceneElements({ elements, description, sessionId }: SceneElementsProps) {
  const { elementsWithImages, loading } = useSceneImages(elements, sessionId);

  if (!elements || elements.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 border-b border-gray-200 pb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-700">🎬 Escena visual</span>
        {loading && <span className="text-xs text-gray-500">Cargando imágenes...</span>}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {elementsWithImages.map((element, index) => (
          <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
            {element.imageBase64 ? (
              <img 
                src={`data:image/png;base64,${element.imageBase64}`}
                alt={element.name}
                className={`w-8 h-8 object-cover border border-gray-300 ${
                  element.type === 'character' ? 'rounded-full' : 
                  element.type === 'location' ? 'rounded' : 'rounded-sm'
                }`}
              />
            ) : (
              <div className={`w-8 h-8 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs ${
                element.type === 'character' ? 'rounded-full' : 
                element.type === 'location' ? 'rounded' : 'rounded-sm'
              }`}>
                {element.type === 'character' ? '👤' : 
                 element.type === 'object' ? '📦' : '📍'}
              </div>
            )}
            <div>
              <div className="text-xs font-medium">{element.name}</div>
              <div className="text-xs text-gray-500 capitalize">{element.type}</div>
            </div>
          </div>
        ))}
      </div>
      
      {description && (
        <p className="text-xs text-gray-600 mt-2 italic">
          📝 {description}
        </p>
      )}
    </div>
  );
}
