# 🖼️ Sistema de Gestión de Assets - Nano Banana

## 📖 Resumen

Este documento describe el nuevo sistema de gestión de assets implementado para resolver el problema de **QuotaExceededError** en localStorage. El sistema mueve las imágenes generadas desde data URLs base64 a un almacenamiento eficiente en IndexedDB con referencias por archivo.

## 🚫 Problema Original

```
QuotaExceededError: Failed to execute 'setItem' on 'Storage': 
Setting the value of 'nano-banana-element-library' exceeded the quota.
```

**Causa**: Las imágenes se almacenaban como data URLs base64 directamente en localStorage, que tiene un límite de ~5-10MB.

## ✅ Solución Implementada

### 🏗️ Arquitectura del Sistema

```
📁 AssetManager (assetManager.ts)
├── 💾 Almacenamiento en IndexedDB
├── 🔄 Conversión data URL → Blob
├── 📝 Generación de nombres únicos
├── 🧹 Limpieza automática
└── 📊 Estadísticas de uso

📚 ElementLibraryManager (elementLibrary.ts)
├── 🔗 Integración con AssetManager
├── 📍 Almacena solo rutas de archivos
├── ⚡ Carga rápida de metadatos
└── 🔄 Compatibilidad hacia atrás

🎮 ElementManager (elementManager.ts)
├── 🖼️ Generación de assets individuales
├── 🎨 Composición de escenas
└── 📊 Gestión de elementos
```

### 🔧 Componentes Principales

#### 1. **AssetManager** (`src/lib/assetManager.ts`)

**Responsabilidades:**
- Convierte data URLs base64 a blobs
- Almacena imágenes en IndexedDB
- Genera nombres únicos para archivos
- Proporciona métodos de limpieza
- Gestiona estadísticas de almacenamiento

**Métodos Clave:**
```typescript
// Guardar imagen como asset
saveImageAsset(dataUrl: string, elementId: string, type: string): Promise<string | null>

// Recuperar imagen desde almacenamiento
getImageFromStorage(fileName: string): Promise<string | null>

// Limpiar assets antiguos
cleanupAssets(retentionDays: number): Promise<number>

// Obtener estadísticas
getStorageStats(): Promise<StorageStats>
```

#### 2. **ElementLibraryManager** (modificado)

**Cambios Implementados:**
- `updateElementImage()` ahora es async y usa AssetManager
- `cleanupLibrary()` incluye limpieza de assets
- `getStats()` incluye información de almacenamiento
- Nuevos métodos `getImageUrl()` y `checkAssetSystemHealth()`

#### 3. **ElementManager** (modificado)

**Cambios Implementados:**
- Todas las llamadas a `updateElementImage()` son ahora async
- Recuperación de URLs de imagen después del almacenamiento
- Compatibilidad con el flujo de pixel art existente

### 💾 Almacenamiento

#### Antes (localStorage):
```json
{
  "nano-banana-element-library": {
    "characters": [{
      "id": "char_123",
      "name": "Juan",
      "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANS..." // ❌ ~1MB por imagen
    }]
  }
}
```

#### Después (híbrido):
```json
// localStorage (solo metadatos)
{
  "nano-banana-element-library": {
    "characters": [{
      "id": "char_123", 
      "name": "Juan",
      "imageUrl": "/assets/generated/character_char_123_1672531200000.png" // ✅ Solo ruta
    }]
  }
}

// IndexedDB (imágenes como blobs)
{
  "NanoBananaAssets": {
    "images": [{
      "fileName": "character_char_123_1672531200000.png",
      "blob": Blob(imageData), // ✅ Blob eficiente
      "createdAt": "2023-01-01T00:00:00.000Z"
    }]
  }
}
```

### 🎯 Beneficios

#### ✅ **Espacio de Almacenamiento:**
- **localStorage**: Solo metadatos (~KB en lugar de MB)
- **IndexedDB**: Imágenes como blobs (mucho más eficiente)
- **Capacidad**: De ~5MB a ~几GB dependiendo del navegador

#### ⚡ **Rendimiento:**
- Carga rápida de biblioteca (solo metadatos)
- Imágenes se cargan bajo demanda
- Menos bloqueo de UI

#### 🧹 **Gestión:**
- Limpieza automática de assets antiguos
- Estadísticas de uso de almacenamiento
- Compatibilidad hacia atrás

### 🔧 Configuración

#### Directorio de Assets:
```bash
mkdir -p public/assets/generated
```

#### IndexedDB Schema:
```javascript
Database: "NanoBananaAssets"
Version: 1
Store: "images"
Index: "createdAt"
```

### 📊 Estadísticas y Monitoreo

```typescript
// Obtener estadísticas completas
const stats = await elementLibrary.getStats();
console.log(stats.assetStorage);
// {
//   totalImages: 45,
//   totalSizeMB: 12.3,
//   oldestImage: "2023-01-01T00:00:00.000Z",
//   newestImage: "2023-01-01T12:00:00.000Z"
// }

// Verificar salud del sistema
const health = await elementLibrary.checkAssetSystemHealth();
console.log(health);
// {
//   indexedDBAvailable: true,
//   canStoreAssets: true,
//   storageQuotaInfo: { quota: 1000000000, usage: 125000 }
// }
```

### 🧹 Limpieza y Mantenimiento

```typescript
// Limpiar biblioteca y assets (30 días por defecto)
await elementManager.cleanupLibrary(30);

// Solo limpiar assets
await assetManager.cleanupAssets(30);
```

### 🔄 Compatibilidad

El sistema es **totalmente compatible hacia atrás**:
- Data URLs existentes siguen funcionando
- URLs HTTP externos siguen funcionando  
- Assets nuevos usan el sistema optimizado

### 🐛 Troubleshooting

#### Error: "IndexedDB no disponible"
```typescript
const health = await elementLibrary.checkAssetSystemHealth();
if (!health.indexedDBAvailable) {
  console.warn("Fallback a placeholders");
}
```

#### Error: "Cuota excedida en IndexedDB"
```typescript
// Limpiar assets antiguos
await elementManager.cleanupLibrary(7); // 7 días
```

#### Verificar integridad de assets:
```typescript
const imagePath = "/assets/generated/character_123.png";
const exists = await assetManager.imageExists(imagePath);
if (!exists) {
  // Regenerar asset o usar placeholder
}
```

## 🔮 Futuras Mejoras

1. **Compresión de imágenes**: WebP automático
2. **Cache inteligente**: LRU para assets más usados
3. **Sincronización**: Backup en servidor
4. **Optimización**: Lazy loading de imágenes
5. **Analytics**: Métricas de uso de assets

---

**✨ Con este sistema, las imágenes de pixel art se almacenan de manera eficiente, resolviendo completamente el problema de QuotaExceededError mientras mantiene la alta calidad visual del juego.**
