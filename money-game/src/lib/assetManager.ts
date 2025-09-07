import { aiLogger } from './aiLogger';

export class AssetManager {
  private static readonly ASSETS_DIR = 'public/assets/generated';
  private static readonly BASE_URL = '/assets/generated';
  private static readonly DB_NAME = 'NanoBananaAssets';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'images';
  
  constructor() {
    this.ensureAssetsDirectory();
    this.initializeDatabase();
  }

  /**
   * Asegurar que el directorio de assets existe
   */
  private async ensureAssetsDirectory(): Promise<void> {
    try {
      // En el navegador, no podemos crear directorios directamente
      // El directorio debe existir en el proyecto
      console.log('📁 Directorio de assets configurado:', AssetManager.ASSETS_DIR);
    } catch (error) {
      console.warn('⚠️ No se pudo verificar directorio de assets:', error);
    }
  }

  /**
   * Inicializar la base de datos IndexedDB
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('⚠️ IndexedDB no está disponible');
        resolve();
        return;
      }

      const request = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);

      request.onerror = () => {
        console.warn('⚠️ Error inicializando IndexedDB:', request.error);
        resolve(); // No rejectedamos para que la app siga funcionando
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Verificar que el object store existe
        if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
          console.warn('⚠️ Object store no encontrado, reinicializando base de datos...');
          db.close();
          this.recreateDatabase().then(resolve).catch(() => resolve());
        } else {
          console.log('✅ Base de datos IndexedDB inicializada correctamente');
          db.close();
          resolve();
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Crear object store si no existe
        if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
          console.log('🔧 Creando object store para assets...');
          const store = db.createObjectStore(AssetManager.STORE_NAME, { keyPath: 'fileName' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ Object store creado correctamente');
        }
      };
    });
  }

  /**
   * Recrear base de datos en caso de problemas
   */
  private async recreateDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Eliminar base de datos existente
      const deleteRequest = indexedDB.deleteDatabase(AssetManager.DB_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('🗑️ Base de datos anterior eliminada');
        
        // Crear nueva base de datos
        const createRequest = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);
        
        createRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const store = db.createObjectStore(AssetManager.STORE_NAME, { keyPath: 'fileName' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ Nueva base de datos creada correctamente');
        };
        
        createRequest.onsuccess = () => {
          createRequest.result.close();
          resolve();
        };
        
        createRequest.onerror = () => reject(createRequest.error);
      };
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  /**
   * Guardar imagen como archivo local y retornar la URL
   */
  public async saveImageAsset(
    imageDataUrl: string, 
    elementId: string, 
    elementType: 'character' | 'scenario' | 'object'
  ): Promise<string | null> {
    try {
      // Verificar si es una data URL válida
      if (!imageDataUrl || !imageDataUrl.startsWith('data:')) {
        console.warn('⚠️ URL de imagen inválida:', imageDataUrl?.substring(0, 50));
        return null;
      }

      // Extraer el tipo MIME y los datos base64
      const [mimeHeader, base64Data] = imageDataUrl.split(',');
      if (!base64Data) {
        console.warn('⚠️ Datos base64 no encontrados en la imagen');
        return null;
      }

      // Determinar extensión de archivo
      const mimeType = mimeHeader.match(/data:([^;]+)/)?.[1] || 'image/png';
      const extension = this.getFileExtension(mimeType);
      
      // Generar nombre de archivo único
      const fileName = `${elementType}_${elementId}_${Date.now()}.${extension}`;
      const relativePath = `${AssetManager.BASE_URL}/${fileName}`;

      // Guardar en IndexedDB (para persistencia) Y crear blob URL para uso inmediato
      await this.simulateSaveToFile(base64Data, fileName, mimeType);
      
      // Crear blob URL para acceso inmediato
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'asset-manager',
        provider: 'Local',
        operation: 'guardado de imagen como asset',
        success: true,
        metadata: { 
          elementId, 
          elementType, 
          fileName,
          originalSize: imageDataUrl.length,
          mimeType,
          storage: 'IndexedDB + Blob URL'
        }
      });

      console.log(`💾 Imagen guardada: ${fileName} (${Math.round(blob.size / 1024)}KB)`);
      
      // Retornar la ruta relativa para el almacenamiento, pero el sistema usará blob URLs
      return relativePath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error guardando imagen como asset:', errorMessage);
      
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'asset-manager',
        provider: 'Local',
        operation: 'guardado de imagen como asset (error)',
        success: false,
        errorMessage,
        metadata: { elementId, elementType }
      });

      return null;
    }
  }

  /**
   * Simular guardado de archivo (en navegador)
   * En un entorno real, esto se haría en el servidor
   */
  private async simulateSaveToFile(
    base64Data: string, 
    fileName: string, 
    mimeType: string
  ): Promise<void> {
    try {
      // Convertir base64 a blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // En desarrollo, podemos usar IndexedDB para simular el almacenamiento
      await this.storeInIndexedDB(fileName, blob);
      
      console.log(`💾 Simulando guardado de archivo: ${fileName} (${blob.size} bytes)`);
    } catch (error) {
      console.error('❌ Error simulando guardado:', error);
      throw error;
    }
  }

  /**
   * Almacenar blob en IndexedDB como almacenamiento local
   */
  private async storeInIndexedDB(fileName: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);

      request.onerror = () => {
        console.error('❌ Error abriendo base de datos para almacenar:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        try {
          // Verificar que el object store existe antes de usarlo
          if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
            console.error('❌ Object store no existe al intentar almacenar');
            db.close();
            reject(new Error('Object store no encontrado'));
            return;
          }

          const transaction = db.transaction([AssetManager.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(AssetManager.STORE_NAME);
          
          const putRequest = store.put({ fileName, blob, createdAt: new Date() });
          
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          
          putRequest.onerror = () => {
            console.error('❌ Error almacenando archivo:', putRequest.error);
            db.close();
            reject(putRequest.error);
          };

          transaction.onerror = () => {
            console.error('❌ Error en transacción:', transaction.error);
            db.close();
            reject(transaction.error);
          };

        } catch (error) {
          console.error('❌ Error en operación de almacenamiento:', error);
          db.close();
          reject(error);
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
          const store = db.createObjectStore(AssetManager.STORE_NAME, { keyPath: 'fileName' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('🔧 Object store creado durante almacenamiento');
        }
      };
    });
  }

  /**
   * Recuperar imagen desde IndexedDB
   */
  public async getImageFromStorage(fileName: string): Promise<string | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);

      request.onerror = () => {
        console.warn('⚠️ Error abriendo base de datos para recuperar imagen:', request.error);
        resolve(null);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        try {
          // Verificar que el object store existe
          if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
            console.warn('⚠️ Object store no existe al intentar recuperar imagen');
            db.close();
            resolve(null);
            return;
          }

          const transaction = db.transaction([AssetManager.STORE_NAME], 'readonly');
          const store = transaction.objectStore(AssetManager.STORE_NAME);
          
          const getRequest = store.get(fileName);
          
          getRequest.onsuccess = () => {
            const result = getRequest.result;
            db.close();
            
            if (result && result.blob) {
              const url = URL.createObjectURL(result.blob);
              resolve(url);
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => {
            console.warn('⚠️ Error recuperando imagen:', getRequest.error);
            db.close();
            resolve(null);
          };

          transaction.onerror = () => {
            console.warn('⚠️ Error en transacción de recuperación:', transaction.error);
            db.close();
            resolve(null);
          };

        } catch (error) {
          console.warn('⚠️ Error en operación de recuperación:', error);
          db.close();
          resolve(null);
        }
      };
    });
  }

  /**
   * Verificar si una imagen existe en el almacenamiento
   */
  public async imageExists(imagePath: string): Promise<boolean> {
    if (!imagePath || !imagePath.startsWith(AssetManager.BASE_URL)) {
      return false;
    }

    const fileName = imagePath.split('/').pop();
    if (!fileName) return false;

    const imageUrl = await this.getImageFromStorage(fileName);
    return imageUrl !== null;
  }

  /**
   * Limpiar assets no utilizados
   */
  public async cleanupAssets(retentionDays: number = 30): Promise<number> {
    return new Promise((resolve) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const request = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);
      let deletedCount = 0;

      request.onerror = () => {
        console.warn('⚠️ Error abriendo base de datos para limpieza:', request.error);
        resolve(0);
      };

      request.onsuccess = () => {
        const db = request.result;
        
        try {
          // Verificar que el object store existe
          if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
            console.warn('⚠️ Object store no existe al intentar limpiar assets');
            db.close();
            resolve(0);
            return;
          }

          const transaction = db.transaction([AssetManager.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(AssetManager.STORE_NAME);
          const index = store.index('createdAt');
          
          const range = IDBKeyRange.upperBound(cutoffDate);
          const cursorRequest = index.openCursor(range);
          
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              deletedCount++;
              cursor.continue();
            } else {
              db.close();
              console.log(`🧹 Assets limpiados: ${deletedCount} archivos eliminados`);
              resolve(deletedCount);
            }
          };
          
          cursorRequest.onerror = () => {
            console.warn('⚠️ Error en cursor de limpieza:', cursorRequest.error);
            db.close();
            resolve(deletedCount);
          };

          transaction.onerror = () => {
            console.warn('⚠️ Error en transacción de limpieza:', transaction.error);
            db.close();
            resolve(deletedCount);
          };

        } catch (error) {
          console.warn('⚠️ Error en operación de limpieza:', error);
          db.close();
          resolve(0);
        }
      };
    });
  }

  /**
   * Obtener extensión de archivo basada en tipo MIME
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp'
    };

    return mimeToExt[mimeType.toLowerCase()] || 'png';
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  public async getStorageStats(): Promise<{
    totalImages: number;
    totalSizeBytes: number;
    oldestImage: Date | null;
    newestImage: Date | null;
  }> {
    return new Promise((resolve) => {
      const request = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);

      const defaultStats = {
        totalImages: 0,
        totalSizeBytes: 0,
        oldestImage: null,
        newestImage: null
      };

      request.onerror = () => {
        console.warn('⚠️ Error abriendo base de datos para estadísticas:', request.error);
        resolve(defaultStats);
      };

      request.onsuccess = () => {
        const db = request.result;
        
        try {
          // Verificar que el object store existe
          if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
            console.warn('⚠️ Object store no existe al obtener estadísticas');
            db.close();
            resolve(defaultStats);
            return;
          }

          const transaction = db.transaction([AssetManager.STORE_NAME], 'readonly');
          const store = transaction.objectStore(AssetManager.STORE_NAME);
          
          const cursorRequest = store.openCursor();
          
          let totalImages = 0;
          let totalSizeBytes = 0;
          let oldestImage: Date | null = null;
          let newestImage: Date | null = null;
          
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const { blob, createdAt } = cursor.value;
              totalImages++;
              totalSizeBytes += blob.size;
              
              const date = new Date(createdAt);
              if (!oldestImage || date < oldestImage) {
                oldestImage = date;
              }
              if (!newestImage || date > newestImage) {
                newestImage = date;
              }
              
              cursor.continue();
            } else {
              db.close();
              resolve({
                totalImages,
                totalSizeBytes,
                oldestImage,
                newestImage
              });
            }
          };
          
          cursorRequest.onerror = () => {
            console.warn('⚠️ Error en cursor de estadísticas:', cursorRequest.error);
            db.close();
            resolve(defaultStats);
          };

          transaction.onerror = () => {
            console.warn('⚠️ Error en transacción de estadísticas:', transaction.error);
            db.close();
            resolve(defaultStats);
          };

        } catch (error) {
          console.warn('⚠️ Error en operación de estadísticas:', error);
          db.close();
          resolve(defaultStats);
        }
      };
    });
  }

  /**
   * Limpiar TODOS los assets existentes (tanto IndexedDB como localStorage)
   */
  public async clearAllAssets(): Promise<{
    indexedDBCleared: boolean;
    localStorageCleared: boolean;
    totalAssetsRemoved: number;
  }> {
    console.log('🗑️ Iniciando limpieza completa de assets...');
    
    let indexedDBCleared = false;
    let localStorageCleared = false;
    let totalAssetsRemoved = 0;

    try {
      // 1. Limpiar IndexedDB completamente
      const stats = await this.getStorageStats();
      totalAssetsRemoved = stats.totalImages;
      
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(AssetManager.DB_NAME);
        
        deleteRequest.onsuccess = () => {
          console.log('✅ Base de datos IndexedDB eliminada completamente');
          indexedDBCleared = true;
          resolve();
        };
        
        deleteRequest.onerror = () => {
          console.error('❌ Error eliminando IndexedDB:', deleteRequest.error);
          reject(deleteRequest.error);
        };
        
        deleteRequest.onblocked = () => {
          console.warn('⚠️ Eliminación de IndexedDB bloqueada, reintentando...');
          // La eliminación se completará cuando se cierren las conexiones
        };
      });

      // 2. Recrear base de datos limpia
      await this.initializeDatabase();
      console.log('✅ Base de datos IndexedDB recreada limpia');

      // 3. Limpiar referencias en localStorage
      try {
        const libraryData = localStorage.getItem('nano-banana-element-library');
        if (libraryData) {
          const library = JSON.parse(libraryData);
          
          // Limpiar imageUrl de todos los elementos
          if (library.characters) {
            library.characters.forEach((char: any) => {
              char.imageUrl = undefined;
            });
          }
          
          if (library.scenarios) {
            library.scenarios.forEach((scenario: any) => {
              scenario.imageUrl = undefined;
            });
          }
          
          if (library.objects) {
            library.objects.forEach((obj: any) => {
              obj.imageUrl = undefined;
            });
          }
          
          localStorage.setItem('nano-banana-element-library', JSON.stringify(library));
          localStorageCleared = true;
          console.log('✅ Referencias de imágenes eliminadas de localStorage');
        }
      } catch (error) {
        console.warn('⚠️ Error limpiando localStorage:', error);
      }

      console.log(`🧹 Limpieza completa: ${totalAssetsRemoved} assets eliminados`);
      
      return {
        indexedDBCleared,
        localStorageCleared,
        totalAssetsRemoved
      };

    } catch (error) {
      console.error('❌ Error durante limpieza completa:', error);
      return {
        indexedDBCleared,
        localStorageCleared,
        totalAssetsRemoved: 0
      };
    }
  }

  /**
   * Limpiar solo assets de IndexedDB sin tocar localStorage
   */
  public async clearIndexedDBAssets(): Promise<number> {
    try {
      const stats = await this.getStorageStats();
      const totalAssets = stats.totalImages;
      
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(AssetManager.DB_NAME);
        
        deleteRequest.onsuccess = () => {
          console.log('✅ Assets de IndexedDB eliminados');
          resolve();
        };
        
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });

      await this.initializeDatabase();
      console.log(`🗑️ ${totalAssets} assets eliminados de IndexedDB`);
      
      return totalAssets;
    } catch (error) {
      console.error('❌ Error limpiando IndexedDB:', error);
      return 0;
    }
  }
}
