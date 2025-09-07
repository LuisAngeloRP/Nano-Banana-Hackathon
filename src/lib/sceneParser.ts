/**
 * Parser para extraer y procesar elementos visuales de las escenas narrativas
 */

interface SceneElements {
  characters: string[];
  objects: string[];
  locations: string[];
  description?: string;
}

interface ElementWithImage {
  name: string;
  type: 'character' | 'object' | 'location';
  imageBase64?: string;
}

interface ProcessedScene {
  elements: ElementWithImage[];
  description: string;
  hasVisualElements: boolean;
}

export class SceneParser {
  
  /**
   * Procesa los elementos de la escena y los enriquece con imágenes de la biblioteca
   */
  static async processSceneElements(
    sceneElements: SceneElements,
    worldData: {
      characters: Array<{id: string, name: string, imageBase64?: string}>,
      objects: Array<{id: string, name: string, imageBase64?: string}>,
      locations: Array<{id: string, name: string, imageBase64?: string}>
    }
  ): Promise<ProcessedScene> {
    const elements: ElementWithImage[] = [];

    // Procesar personajes
    if (sceneElements.characters) {
      for (const charIdentifier of sceneElements.characters) {
        const character = worldData.characters.find(c => 
          c.name.toLowerCase().trim() === charIdentifier.toLowerCase().trim() ||
          c.id === charIdentifier
        );
        
        if (character) {
          elements.push({
            name: character.name,
            type: 'character',
            imageBase64: character.imageBase64
          });
        }
      }
    }

    // Procesar objetos
    if (sceneElements.objects) {
      for (const objIdentifier of sceneElements.objects) {
        const object = worldData.objects.find(o => 
          o.name.toLowerCase().trim() === objIdentifier.toLowerCase().trim() ||
          o.id === objIdentifier
        );
        
        if (object) {
          elements.push({
            name: object.name,
            type: 'object',
            imageBase64: object.imageBase64
          });
        }
      }
    }

    // Procesar ubicaciones
    if (sceneElements.locations) {
      for (const locIdentifier of sceneElements.locations) {
        const location = worldData.locations.find(l => 
          l.name.toLowerCase().trim() === locIdentifier.toLowerCase().trim() ||
          l.id === locIdentifier
        );
        
        if (location) {
          elements.push({
            name: location.name,
            type: 'location',
            imageBase64: location.imageBase64
          });
        }
      }
    }

    return {
      elements,
      description: sceneElements.description || '',
      hasVisualElements: elements.length > 0
    };
  }

  /**
   * Genera metadatos para almacenar con el mensaje
   */
  static generateSceneMetadata(processedScene: ProcessedScene): Record<string, any> {
    return {
      sceneElements: processedScene.elements.map(el => ({
        name: el.name,
        type: el.type,
        hasImage: !!el.imageBase64
      })),
      sceneDescription: processedScene.description,
      hasVisualElements: processedScene.hasVisualElements,
      elementCount: processedScene.elements.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Filtra elementos únicos para evitar duplicados
   */
  static deduplicateElements(elements: ElementWithImage[]): ElementWithImage[] {
    const seen = new Set<string>();
    return elements.filter(element => {
      const key = `${element.type}:${element.name.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Ordena elementos por tipo (ubicaciones → personajes → objetos)
   */
  static sortElementsByType(elements: ElementWithImage[]): ElementWithImage[] {
    const order = { 'location': 0, 'character': 1, 'object': 2 };
    return elements.sort((a, b) => {
      const orderA = order[a.type] ?? 999;
      const orderB = order[b.type] ?? 999;
      return orderA - orderB;
    });
  }

  /**
   * Validar que los elementos mencionados existen en la base de datos
   */
  static validateSceneElements(
    sceneElements: SceneElements,
    worldData: {
      characters: Array<{id: string, name: string, imageBase64?: string}>,
      objects: Array<{id: string, name: string, imageBase64?: string}>,
      locations: Array<{id: string, name: string, imageBase64?: string}>
    }
  ): {
    valid: ElementWithImage[],
    invalid: string[]
  } {
    const valid: ElementWithImage[] = [];
    const invalid: string[] = [];

    // Validar personajes
    sceneElements.characters?.forEach(charIdentifier => {
      // Buscar por nombre exacto o por ID
      const character = worldData.characters.find(c => 
        c.name.toLowerCase().trim() === charIdentifier.toLowerCase().trim() ||
        c.id === charIdentifier
      );
      if (character) {
        valid.push({ 
          name: character.name, // Usar el nombre real, no el ID
          type: 'character',
          imageBase64: character.imageBase64 
        });
      } else {
        invalid.push(`Personaje: ${charIdentifier}`);
      }
    });

    // Validar objetos
    sceneElements.objects?.forEach(objIdentifier => {
      // Buscar por nombre exacto o por ID
      const object = worldData.objects.find(o => 
        o.name.toLowerCase().trim() === objIdentifier.toLowerCase().trim() ||
        o.id === objIdentifier
      );
      if (object) {
        valid.push({ 
          name: object.name, // Usar el nombre real, no el ID
          type: 'object',
          imageBase64: object.imageBase64 
        });
      } else {
        invalid.push(`Objeto: ${objIdentifier}`);
      }
    });

    // Validar ubicaciones
    sceneElements.locations?.forEach(locIdentifier => {
      // Buscar por nombre exacto o por ID
      const location = worldData.locations.find(l => 
        l.name.toLowerCase().trim() === locIdentifier.toLowerCase().trim() ||
        l.id === locIdentifier
      );
      if (location) {
        valid.push({ 
          name: location.name, // Usar el nombre real, no el ID
          type: 'location',
          imageBase64: location.imageBase64 
        });
      } else {
        invalid.push(`Ubicación: ${locIdentifier}`);
      }
    });

    return { valid, invalid };
  }
}

export type { SceneElements, ElementWithImage, ProcessedScene };
