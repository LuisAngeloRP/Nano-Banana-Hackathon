import { ElementLibrary, StoredCharacter, StoredScenario, StoredObject, ExtractedElements } from '@/types/game';
import { AssetManager } from './assetManager';

export class ElementLibraryManager {
  private static readonly STORAGE_KEY = 'nano-banana-element-library';
  private library: ElementLibrary;
  private assetManager: AssetManager;

  constructor() {
    this.library = this.loadLibrary();
    this.assetManager = new AssetManager();
  }

  // Cargar biblioteca desde localStorage
  private loadLibrary(): ElementLibrary {
    try {
      const stored = localStorage.getItem(ElementLibraryManager.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          lastUpdated: new Date(parsed.lastUpdated),
          characters: parsed.characters.map((char: any) => ({
            ...char,
            createdAt: new Date(char.createdAt),
            lastUsed: new Date(char.lastUsed)
          })),
          scenarios: parsed.scenarios.map((scenario: any) => ({
            ...scenario,
            createdAt: new Date(scenario.createdAt),
            lastUsed: new Date(scenario.lastUsed)
          })),
          objects: parsed.objects.map((obj: any) => ({
            ...obj,
            createdAt: new Date(obj.createdAt),
            lastUsed: new Date(obj.lastUsed)
          }))
        };
      }
    } catch (error) {
      console.warn('⚠️ Error cargando biblioteca de elementos:', error);
    }

    return {
      characters: [],
      scenarios: [],
      objects: [],
      lastUpdated: new Date()
    };
  }

  // Guardar biblioteca en localStorage
  private saveLibrary(): void {
    try {
      this.library.lastUpdated = new Date();
      localStorage.setItem(ElementLibraryManager.STORAGE_KEY, JSON.stringify(this.library));
    } catch (error) {
      console.error('❌ Error guardando biblioteca de elementos:', error);
    }
  }

  // Obtener biblioteca completa
  public getLibrary(): ElementLibrary {
    return { ...this.library };
  }

  // Buscar elementos similares por nombre o descripción
  public findSimilarElements(query: string, type: 'character' | 'scenario' | 'object') {
    const normalizedQuery = query.toLowerCase();
    
    const collection = this.library[type === 'character' ? 'characters' : type === 'scenario' ? 'scenarios' : 'objects'];
    
    return collection.filter(element => {
      const nameMatch = element.name.toLowerCase().includes(normalizedQuery);
      const descMatch = element.description.toLowerCase().includes(normalizedQuery);
      const tagMatch = element.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));
      
      return nameMatch || descMatch || tagMatch;
    });
  }

  // Buscar por tags específicos
  public findByTags(tags: string[], type?: 'character' | 'scenario' | 'object') {
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    
    if (type) {
      const collection = this.library[type === 'character' ? 'characters' : type === 'scenario' ? 'scenarios' : 'objects'];
      return collection.filter(element => 
        element.tags.some(tag => normalizedTags.includes(tag.toLowerCase()))
      );
    }

    return {
      characters: this.library.characters.filter(char => 
        char.tags.some(tag => normalizedTags.includes(tag.toLowerCase()))
      ),
      scenarios: this.library.scenarios.filter(scenario => 
        scenario.tags.some(tag => normalizedTags.includes(tag.toLowerCase()))
      ),
      objects: this.library.objects.filter(obj => 
        obj.tags.some(tag => normalizedTags.includes(tag.toLowerCase()))
      )
    };
  }

  // Agregar nuevo personaje a la biblioteca
  public addCharacter(character: Omit<StoredCharacter, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>): StoredCharacter {
    const storedCharacter: StoredCharacter = {
      ...character,
      id: this.generateId('char'),
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 1,
      firstMet: character.firstMet || 1,
      interactions: character.interactions || 0
    };

    this.library.characters.push(storedCharacter);
    this.saveLibrary();
    
    console.log(`📚 Personaje '${character.name}' agregado a la biblioteca`);
    return storedCharacter;
  }

  // Agregar nuevo escenario a la biblioteca
  public addScenario(scenario: Omit<StoredScenario, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>): StoredScenario {
    const storedScenario: StoredScenario = {
      ...scenario,
      id: this.generateId('scen'),
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 1,
      firstEncountered: scenario.firstEncountered || 1,
      timesVisited: scenario.timesVisited || 0,
      relatedCharacters: scenario.relatedCharacters || [],
      relatedObjects: scenario.relatedObjects || []
    };

    this.library.scenarios.push(storedScenario);
    this.saveLibrary();
    
    console.log(`📚 Escenario '${scenario.name}' agregado a la biblioteca`);
    return storedScenario;
  }

  // Agregar nuevo objeto a la biblioteca
  public addObject(object: Omit<StoredObject, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>): StoredObject {
    const storedObject: StoredObject = {
      ...object,
      id: this.generateId('obj'),
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 1,
      obtainedOn: object.obtainedOn || 1,
      usedCount: object.usedCount || 0
    };

    this.library.objects.push(storedObject);
    this.saveLibrary();
    
    console.log(`📚 Objeto '${object.name}' agregado a la biblioteca`);
    return storedObject;
  }

  // Marcar elemento como usado (actualizar estadísticas)
  public markAsUsed(elementId: string, type: 'character' | 'scenario' | 'object'): void {
    const collection = this.library[type === 'character' ? 'characters' : type === 'scenario' ? 'scenarios' : 'objects'];
    const element = collection.find(el => el.id === elementId);
    
    if (element) {
      element.lastUsed = new Date();
      element.usageCount++;
      
      // Incrementar contadores específicos según el tipo
      if (type === 'character' && 'interactions' in element) {
        (element as StoredCharacter).interactions++;
      } else if (type === 'scenario' && 'timesVisited' in element) {
        (element as StoredScenario).timesVisited++;
      } else if (type === 'object' && 'usedCount' in element) {
        (element as StoredObject).usedCount++;
      }
      
      this.saveLibrary();
    }
  }

  // Actualizar imagen de un elemento (ahora con gestión de assets)
  public async updateElementImage(elementId: string, type: 'character' | 'scenario' | 'object', imageDataUrl: string): Promise<void> {
    const collection = this.library[type === 'character' ? 'characters' : type === 'scenario' ? 'scenarios' : 'objects'];
    const element = collection.find(el => el.id === elementId);
    
    if (element) {
      // Si es una data URL (imagen base64), guardarla como asset
      if (imageDataUrl.startsWith('data:')) {
        console.log(`💾 Guardando imagen como asset para ${type} '${element.name}'...`);
        const assetPath = await this.assetManager.saveImageAsset(imageDataUrl, elementId, type);
        
        if (assetPath) {
          element.imageUrl = assetPath;
          console.log(`📸 Imagen guardada como asset: ${assetPath}`);
        } else {
          console.warn(`⚠️ No se pudo guardar imagen como asset para ${element.name}, usando placeholder`);
          element.imageUrl = undefined;
        }
      } else {
        // Si ya es una ruta de archivo, usarla directamente
        element.imageUrl = imageDataUrl;
        console.log(`📸 Ruta de imagen actualizada para ${type} '${element.name}'`);
      }
      
      this.saveLibrary();
    }
  }

  // Obtener elementos más utilizados
  public getMostUsed(type: 'character' | 'scenario' | 'object', limit: number = 5) {
    const collection = this.library[type === 'character' ? 'characters' : type === 'scenario' ? 'scenarios' : 'objects'];
    return collection
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  // Obtener elementos recientes
  public getRecent(type: 'character' | 'scenario' | 'object', limit: number = 5) {
    const collection = this.library[type === 'character' ? 'characters' : type === 'scenario' ? 'scenarios' : 'objects'];
    return collection
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit);
  }

  // Generar tags automáticamente basados en descripción
  public generateTags(name: string, description: string, type: 'character' | 'scenario' | 'object'): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const tags: string[] = [];

    // Tags comunes por tipo
    const commonTags = {
      character: ['persona', 'individuo', 'contacto', 'aliado', 'enemigo', 'neutral'],
      scenario: ['lugar', 'ubicación', 'sitio', 'interior', 'exterior', 'público', 'privado'],
      object: ['herramienta', 'recurso', 'información', 'valioso', 'útil', 'importante']
    };

    // Tags específicos por palabras clave
    const keywordMap = {
      'negocio': ['business', 'comercial', 'trabajo'],
      'dinero': ['monetario', 'financiero', 'económico'],
      'peligroso': ['riesgo', 'peligro', 'amenaza'],
      'seguro': ['seguridad', 'confiable', 'estable'],
      'tecnología': ['tech', 'digital', 'moderno'],
      'legal': ['jurídico', 'oficial', 'formal'],
      'informal': ['casual', 'alternativo', 'underground']
    };

    // Agregar tags basados en palabras clave
    Object.entries(keywordMap).forEach(([keyword, relatedTags]) => {
      if (text.includes(keyword)) {
        tags.push(keyword, ...relatedTags);
      }
    });

    // Agregar tags comunes del tipo
    tags.push(...commonTags[type]);

    // Remover duplicados y limitar cantidad
    return [...new Set(tags)].slice(0, 8);
  }

  // Generar ID único
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${random}`;
  }

  // Limpiar biblioteca (elementos no usados por mucho tiempo) 
  public async cleanupLibrary(daysThreshold: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    let removedCount = 0;

    // Limpiar personajes
    this.library.characters = this.library.characters.filter(char => {
      if (char.usageCount <= 1 && char.lastUsed < cutoffDate) {
        removedCount++;
        return false;
      }
      return true;
    });

    // Limpiar escenarios
    this.library.scenarios = this.library.scenarios.filter(scenario => {
      if (scenario.usageCount <= 1 && scenario.lastUsed < cutoffDate) {
        removedCount++;
        return false;
      }
      return true;
    });

    // Limpiar objetos
    this.library.objects = this.library.objects.filter(obj => {
      if (obj.usageCount <= 1 && obj.lastUsed < cutoffDate) {
        removedCount++;
        return false;
      }
      return true;
    });

    if (removedCount > 0) {
      this.saveLibrary();
      console.log(`🧹 Biblioteca limpiada: ${removedCount} elementos eliminados`);
    }

    // También limpiar assets no utilizados
    const assetsRemoved = await this.assetManager.cleanupAssets(daysThreshold);
    if (assetsRemoved > 0) {
      console.log(`🗑️ Assets limpiados: ${assetsRemoved} imágenes eliminadas`);
    }
  }

  // Obtener estadísticas de la biblioteca
  public async getStats() {
    const assetStats = await this.assetManager.getStorageStats();
    
    return {
      totalCharacters: this.library.characters.length,
      totalScenarios: this.library.scenarios.length,
      totalObjects: this.library.objects.length,
      totalElements: this.library.characters.length + this.library.scenarios.length + this.library.objects.length,
      lastUpdated: this.library.lastUpdated,
      mostUsedCharacter: this.getMostUsed('character', 1)[0],
      mostUsedScenario: this.getMostUsed('scenario', 1)[0],
      mostUsedObject: this.getMostUsed('object', 1)[0],
      assetStorage: {
        totalImages: assetStats.totalImages,
        totalSizeMB: Math.round(assetStats.totalSizeBytes / (1024 * 1024) * 100) / 100,
        oldestImage: assetStats.oldestImage,
        newestImage: assetStats.newestImage
      }
    };
  }

  // Exportar biblioteca para backup
  public exportLibrary(): string {
    return JSON.stringify(this.library, null, 2);
  }

  // Importar biblioteca desde backup
  public importLibrary(libraryData: string): boolean {
    try {
      const imported = JSON.parse(libraryData);
      
      // Validar estructura básica
      if (imported.characters && imported.scenarios && imported.objects) {
        this.library = {
          ...imported,
          lastUpdated: new Date(),
          characters: imported.characters.map((char: any) => ({
            ...char,
            createdAt: new Date(char.createdAt),
            lastUsed: new Date(char.lastUsed)
          })),
          scenarios: imported.scenarios.map((scenario: any) => ({
            ...scenario,
            createdAt: new Date(scenario.createdAt),
            lastUsed: new Date(scenario.lastUsed)
          })),
          objects: imported.objects.map((obj: any) => ({
            ...obj,
            createdAt: new Date(obj.createdAt),
            lastUsed: new Date(obj.lastUsed)
          }))
        };
        
        this.saveLibrary();
        console.log('📥 Biblioteca importada exitosamente');
        return true;
      }
    } catch (error) {
      console.error('❌ Error importando biblioteca:', error);
    }
    
    return false;
  }

  /**
   * Obtener URL de imagen desde el almacenamiento de assets
   */
  public async getImageUrl(imagePath: string): Promise<string | null> {
    if (!imagePath) return null;
    
    // Si ya es una URL válida, devolverla directamente
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Si es una ruta de asset, recuperarla desde IndexedDB
    if (imagePath.startsWith('/assets/generated/')) {
      const fileName = imagePath.split('/').pop();
      if (fileName) {
        return await this.assetManager.getImageFromStorage(fileName);
      }
    }
    
    return null;
  }

  /**
   * Verificar disponibilidad del sistema de assets
   */
  public async checkAssetSystemHealth(): Promise<{
    indexedDBAvailable: boolean;
    canStoreAssets: boolean;
    storageQuotaInfo: any;
  }> {
    const health = {
      indexedDBAvailable: false,
      canStoreAssets: false,
      storageQuotaInfo: null as any
    };

    try {
      // Verificar IndexedDB
      health.indexedDBAvailable = 'indexedDB' in window;
      
      // Verificar si podemos almacenar
      if (health.indexedDBAvailable) {
        health.canStoreAssets = true;
      }

      // Obtener información de cuota si está disponible
      if ('navigator' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
        health.storageQuotaInfo = await navigator.storage.estimate();
      }

    } catch (error) {
      console.warn('⚠️ Error verificando sistema de assets:', error);
    }

    return health;
  }

  /**
   * Limpiar todos los assets existentes
   */
  public async clearAllAssets(): Promise<{
    indexedDBCleared: boolean;
    localStorageCleared: boolean;
    totalAssetsRemoved: number;
  }> {
    return await this.assetManager.clearAllAssets();
  }

  /**
   * Limpiar solo assets de IndexedDB
   */
  public async clearIndexedDBAssets(): Promise<number> {
    return await this.assetManager.clearIndexedDBAssets();
  }

  /**
   * Limpiar TODA la biblioteca de elementos (elementos + assets)
   */
  public clearCompleteLibrary(): {
    charactersRemoved: number;
    scenariosRemoved: number;
    objectsRemoved: number;
    totalRemoved: number;
  } {
    const charactersCount = this.library.characters.length;
    const scenariosCount = this.library.scenarios.length;
    const objectsCount = this.library.objects.length;
    const totalCount = charactersCount + scenariosCount + objectsCount;

    // Resetear biblioteca completa
    this.library = {
      characters: [],
      scenarios: [],
      objects: [],
      lastUpdated: new Date()
    };

    // Guardar biblioteca vacía
    this.saveLibrary();

    console.log(`🗑️ Biblioteca completa limpiada: ${totalCount} elementos eliminados`);
    
    return {
      charactersRemoved: charactersCount,
      scenariosRemoved: scenariosCount,
      objectsRemoved: objectsCount,
      totalRemoved: totalCount
    };
  }

  /**
   * Resetear todo el sistema (biblioteca + assets)
   */
  public async resetCompleteSystem(): Promise<{
    libraryStats: {
      charactersRemoved: number;
      scenariosRemoved: number;
      objectsRemoved: number;
      totalRemoved: number;
    };
    assetStats: {
      indexedDBCleared: boolean;
      localStorageCleared: boolean;
      totalAssetsRemoved: number;
    };
  }> {
    console.log('🔄 Iniciando reset completo del sistema...');

    // 1. Limpiar biblioteca de elementos
    const libraryStats = this.clearCompleteLibrary();

    // 2. Limpiar todos los assets
    const assetStats = await this.clearAllAssets();

    console.log(`🧹 Reset completo: ${libraryStats.totalRemoved} elementos + ${assetStats.totalAssetsRemoved} assets eliminados`);

    return {
      libraryStats,
      assetStats
    };
  }
}
