/**
 * Hook para obtener imágenes de elementos de la escena
 */
import { useState, useEffect } from 'react';

interface SceneElement {
  name: string;
  type: 'character' | 'object' | 'location';
  hasImage?: boolean;
}

interface ElementWithImage extends SceneElement {
  imageBase64?: string;
}

export function useSceneImages(sceneElements: SceneElement[], sessionId: string) {
  const [elementsWithImages, setElementsWithImages] = useState<ElementWithImage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sceneElements || sceneElements.length === 0) {
      setElementsWithImages([]);
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      try {
        // Obtener datos del mundo con imágenes
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'get_world_data',
            sessionId
          })
        });

        if (response.ok) {
          const worldData = await response.json();
          
          // Enriquecer elementos de la escena con imágenes
          const enrichedElements = sceneElements.map(element => {
            let foundElement = null;
            
            switch (element.type) {
              case 'character':
                foundElement = worldData.characters?.find((c: any) => 
                  c.name.toLowerCase().trim() === element.name.toLowerCase().trim()
                );
                break;
              case 'object':
                foundElement = worldData.objects?.find((o: any) => 
                  o.name.toLowerCase().trim() === element.name.toLowerCase().trim()
                );
                break;
              case 'location':
                foundElement = worldData.locations?.find((l: any) => 
                  l.name.toLowerCase().trim() === element.name.toLowerCase().trim()
                );
                break;
            }
            
            return {
              ...element,
              imageBase64: foundElement?.imageBase64
            };
          });
          
          setElementsWithImages(enrichedElements);
        }
      } catch (error) {
        console.error('Error fetching scene images:', error);
        setElementsWithImages(sceneElements.map(el => ({ ...el })));
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [sceneElements, sessionId]);

  return { elementsWithImages, loading };
}
