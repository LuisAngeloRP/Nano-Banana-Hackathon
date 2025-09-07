/**
 * Generador de imágenes mockup para objetos del juego
 * Crea imágenes de color sólido con el nombre del objeto como texto
 */

import { createCanvas } from 'canvas';

interface MockupImageOptions {
  name: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

interface GeneratedImage {
  base64: string;
  width: number;
  height: number;
  format: string;
}

class ImageGenerator {
  private static readonly COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];

  private static getColorFromName(name: string): string {
    // Generar color basado en el hash del nombre para consistencia
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const index = Math.abs(hash) % this.COLORS.length;
    return this.COLORS[index];
  }

  /**
   * Genera una imagen mockup para un objeto
   */
  static async generateObjectMockup(options: MockupImageOptions): Promise<GeneratedImage> {
    return this.generateGenericMockup(options, 'object');
  }

  /**
   * Genera una imagen mockup para un personaje
   */
  static async generateCharacterMockup(options: MockupImageOptions): Promise<GeneratedImage> {
    return this.generateGenericMockup(options, 'character');
  }

  /**
   * Genera una imagen mockup para un lugar
   */
  static async generateLocationMockup(options: MockupImageOptions): Promise<GeneratedImage> {
    return this.generateGenericMockup(options, 'location');
  }

  /**
   * Genera una imagen mockup genérica
   */
  private static async generateGenericMockup(options: MockupImageOptions, type: 'object' | 'character' | 'location'): Promise<GeneratedImage> {
    const {
      name,
      width = 200,
      height = 200,
      backgroundColor = this.getColorFromName(options.name),
      textColor = '#FFFFFF',
      fontSize = 16
    } = options;

    // Crear canvas usando Canvas API del navegador o similar
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No se pudo crear el contexto del canvas');
    }

    // Fondo de color sólido
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Configurar texto
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dividir el texto en múltiples líneas si es muy largo
    const words = name.split(' ');
    const lines = this.wrapText(words, ctx, width - 20);
    
    // Calcular posición inicial para centrar verticalmente
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (height - totalHeight) / 2 + lineHeight / 2;

    // Dibujar cada línea
    lines.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      ctx.fillText(line, width / 2, y);
    });

    // Añadir icono simple (emoji o símbolo)
    const icon = this.getIconForElement(name, type);
    if (icon) {
      ctx.font = `${fontSize * 2}px Arial`;
      ctx.fillText(icon, width / 2, height * 0.25);
    }

    // Convertir a base64
    const base64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

    return {
      base64,
      width,
      height,
      format: 'png'
    };
  }

  /**
   * Crea un canvas (implementación para Node.js usando canvas)
   */
  private static createCanvas(width: number, height: number): any {
    // Usar la librería canvas para Node.js
    return createCanvas(width, height);
  }


  /**
   * Divide el texto en líneas que caben en el ancho especificado
   */
  private static wrapText(words: string[], ctx: any, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText ? ctx.measureText(testLine) : { width: testLine.length * 10 };
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Obtiene un emoji/icono apropiado basado en el nombre y tipo del elemento
   */
  private static getIconForElement(name: string, type: 'object' | 'character' | 'location'): string {
    const nameLower = name.toLowerCase();
    
    // Mapeo de palabras clave a emojis
    const iconMap: Record<string, string> = {
      // Tecnología
      'telefono': '📱',
      'smartphone': '📱',
      'ordenador': '💻',
      'computadora': '💻',
      'laptop': '💻',
      'tablet': '📱',
      'camara': '📷',
      'radio': '📻',
      
      // Herramientas
      'martillo': '🔨',
      'destornillador': '🔧',
      'llave': '🔑',
      'cuchillo': '🔪',
      'navaja': '🔪',
      'tijeras': '✂️',
      
      // Medicina/Ciencia
      'medicina': '💊',
      'pastilla': '💊',
      'jeringa': '💉',
      'microscopio': '🔬',
      'laboratorio': '🧪',
      'kit': '🧰',
      
      // Armas
      'pistola': '🔫',
      'rifle': '🔫',
      'espada': '⚔️',
      
      // Supervivencia
      'mochila': '🎒',
      'linterna': '🔦',
      'brujula': '🧭',
      'cuerda': '🪢',
      'tienda': '⛺',
      'saco': '🎒',
      
      // Comida
      'comida': '🍽️',
      'agua': '💧',
      'bebida': '🥤',
      'pan': '🍞',
      'carne': '🥩',
      
      // Vehiculos
      'coche': '🚗',
      'auto': '🚗',
      'bicicleta': '🚲',
      'moto': '🏍️',
      'barco': '🚤',
      
      // Dinero/Valor
      'dinero': '💰',
      'oro': '🪙',
      'joyas': '💎',
      'diamante': '💎',
      
      // Documentos
      'documento': '📄',
      'libro': '📖',
      'mapa': '🗺️',
      'carta': '📋',
      
      // Ropa
      'ropa': '👕',
      'zapatos': '👟',
      'sombrero': '👒',
      'gafas': '👓'
    };

    // Buscar coincidencias en el nombre
    for (const [keyword, emoji] of Object.entries(iconMap)) {
      if (nameLower.includes(keyword)) {
        return emoji;
      }
    }

    // Íconos específicos para personajes
    if (type === 'character') {
      if (nameLower.includes('doctor') || nameLower.includes('medico')) {
        return '👨‍⚕️';
      } else if (nameLower.includes('profesor') || nameLower.includes('maestro')) {
        return '👨‍🏫';
      } else if (nameLower.includes('soldado') || nameLower.includes('militar')) {
        return '👮‍♂️';
      } else if (nameLower.includes('chef') || nameLower.includes('cocinero')) {
        return '👨‍🍳';
      } else if (nameLower.includes('anciano') || nameLower.includes('viejo')) {
        return '👴';
      } else if (nameLower.includes('niño') || nameLower.includes('joven')) {
        return '👦';
      } else if (nameLower.includes('mujer')) {
        return '👩';
      } else if (nameLower.includes('hombre')) {
        return '👨';
      }
      return '👤'; // Persona genérica
    }

    // Íconos específicos para lugares
    if (type === 'location') {
      if (nameLower.includes('hospital')) {
        return '🏥';
      } else if (nameLower.includes('escuela') || nameLower.includes('universidad')) {
        return '🏫';
      } else if (nameLower.includes('casa') || nameLower.includes('hogar')) {
        return '🏠';
      } else if (nameLower.includes('tienda') || nameLower.includes('comercio')) {
        return '🏪';
      } else if (nameLower.includes('banco')) {
        return '🏦';
      } else if (nameLower.includes('iglesia') || nameLower.includes('templo')) {
        return '⛪';
      } else if (nameLower.includes('parque') || nameLower.includes('jardin')) {
        return '🌳';
      } else if (nameLower.includes('playa')) {
        return '🏖️';
      } else if (nameLower.includes('montaña') || nameLower.includes('cerro')) {
        return '🏔️';
      } else if (nameLower.includes('bosque')) {
        return '🌲';
      } else if (nameLower.includes('ciudad')) {
        return '🏙️';
      } else if (nameLower.includes('laboratorio')) {
        return '🧪';
      } else if (nameLower.includes('fabrica') || nameLower.includes('industria')) {
        return '🏭';
      } else if (nameLower.includes('aeropuerto')) {
        return '✈️';
      } else if (nameLower.includes('estacion')) {
        return '🚉';
      }
      return '📍'; // Lugar genérico
    }

    // Iconos por defecto según categorías generales para objetos
    if (nameLower.includes('electr') || nameLower.includes('digit')) {
      return '⚡';
    } else if (nameLower.includes('metal') || nameLower.includes('hierro')) {
      return '🔩';
    } else if (nameLower.includes('madera')) {
      return '🪵';
    } else if (nameLower.includes('papel') || nameLower.includes('libro')) {
      return '📄';
    } else if (nameLower.includes('vidrio') || nameLower.includes('cristal')) {
      return '🔮';
    }

    // Íconos por defecto según tipo
    return this.getDefaultIcon(type);
  }

  /**
   * Obtiene el ícono por defecto según el tipo
   */
  private static getDefaultIcon(elementType: 'object' | 'character' | 'location'): string {
    if (elementType === 'character') return '👤';
    if (elementType === 'location') return '📍';
    return '📦';
  }

  /**
   * Genera múltiples imágenes para una lista de objetos
   */
  static async generateMultipleObjectMockups(objects: Array<{name: string, id: string}>): Promise<Array<{id: string, image: GeneratedImage}>> {
    const results = [];
    
    for (const obj of objects) {
      try {
        const image = await this.generateObjectMockup({ name: obj.name });
        results.push({ id: obj.id, image });
      } catch (error) {
        console.error(`Error generando imagen para objeto ${obj.name}:`, error);
        // Continuar con los demás objetos en caso de error
      }
    }
    
    return results;
  }
}

export default ImageGenerator;
export { ImageGenerator };
export type { MockupImageOptions, GeneratedImage };
