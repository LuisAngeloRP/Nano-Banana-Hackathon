import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiLogger } from './aiLogger';

export class ImageGenerator {
  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;
  
  // Configuración global de estilo pixel art para uniformidad
  private readonly PIXEL_ART_STYLE = `
PIXEL ART STYLE SPECIFICATIONS (STRICTLY FOLLOW):
- 16-bit or 32-bit pixel art aesthetic
- Limited color palette (256 colors maximum)
- Clean pixel lines with no anti-aliasing
- Crisp, blocky textures and shapes
- Dithering patterns for gradients and shadows
- Consistent pixel density (1:1 pixel ratio)
- Retro video game art style (SNES/Genesis era)
- Sharp edges and geometric forms
- No blurring or smooth gradients
- Vibrant, saturated colors with clear contrast
- Stylized proportions typical of classic RPGs
- 8x8 or 16x16 pixel tile-based construction mindset
`;

  private readonly COMMON_PIXEL_MODIFIERS = [
    "pixelated",
    "retro gaming style",
    "16-bit graphics", 
    "pixel perfect",
    "sprite-based art",
    "classic JRPG style",
    "no anti-aliasing",
    "sharp pixel edges",
    "limited color palette",
    "dithered shading"
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    // Configurar Google AI para Nano Banana
    if (apiKey && apiKey !== 'dummy-key') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        console.log('🍌 Nano Banana configurado con Google AI Studio para pixel art');
      } catch (error) {
        console.warn('⚠️ Error configurando Google AI:', error);
        this.genAI = null;
      }
    } else {
      console.log('🖼️ Modo placeholder - configura NEXT_PUBLIC_GOOGLE_AI_API_KEY para usar Nano Banana');
    }
  }

  /**
   * Crea un prompt optimizado para pixel art con especificaciones consistentes
   */
  private createPixelArtPrompt(basePrompt: string, specificStyle?: string): string {
    // Seleccionar modificadores pixel art aleatorios para variedad pero manteniendo consistencia
    const selectedModifiers = this.COMMON_PIXEL_MODIFIERS
      .sort(() => Math.random() - 0.5)
      .slice(0, 4)
      .join(', ');
    
    const pixelPrompt = `${basePrompt}. 
    
${this.PIXEL_ART_STYLE}

SPECIFIC MODIFIERS: ${selectedModifiers}${specificStyle ? `, ${specificStyle}` : ''}

TECHNICAL REQUIREMENTS:
- Output as pixel art sprite/scene
- Maintain consistent pixel grid alignment
- Use indexed color approach
- Avoid gradients, use dithering instead
- Sharp, defined outlines
- Classic video game aesthetic`;

    return pixelPrompt;
  }

  public async generateSceneImage(
    prompt: string, 
    style: string = "pixel art scene"
  ): Promise<string | null> {
    // Verificar si tenemos configuración de Google AI válida
    if (!this.genAI) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'placeholder',
        provider: 'Google AI',
        operation: 'generación de imagen de escena',
        success: true,
        metadata: { mode: 'placeholder', reason: 'Google AI no configurado' }
      });
      console.log('🖼️ Usando imágenes placeholder - configura NEXT_PUBLIC_GOOGLE_AI_API_KEY para usar Nano Banana');
      return null;
    }

    return await aiLogger.measureAIOperation(
      'imagen',
      'nano-banana',
      'Google AI',
      'generación de imagen de escena',
      async () => {
        if (!this.genAI) {
          throw new Error('Google AI no está configurado');
        }

        console.log("🍌 Generando imagen real con Nano Banana...");
        
        // Usar el modelo correcto de Nano Banana para generación de imágenes
        const model = this.genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash-image-preview" 
        });
        
        // Crear el prompt optimizado para pixel art
        const imagePrompt = this.createPixelArtPrompt(prompt, style);
        
        console.log("🍌 Prompt para imagen:", imagePrompt);
        
        try {
          // Intentar generar imagen real con Nano Banana
          const result = await model.generateContent([imagePrompt]);
          
          if (result.response) {
            // Buscar si hay datos de imagen en la respuesta
            const response = result.response;
            
            // Verificar si hay contenido de imagen
            if (response.candidates && response.candidates.length > 0) {
              const candidate = response.candidates[0];
              
              if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                  // Buscar partes que contengan datos de imagen
                  if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                    console.log("🍌 ¡Imagen generada exitosamente con Nano Banana!");
                    
                    // Convertir datos base64 a data URL
                    const imageDataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    return imageDataUrl;
                  }
                }
              }
            }
          }
          
          // Si no se encontró imagen en la respuesta, usar fallback
          console.log("🍌 Nano Banana procesó la solicitud, usando fallback visual");
          return this.generateContentBasedPlaceholder(prompt, style);
          
        } catch (error: any) {
          console.log("🍌 Nano Banana no disponible aún, usando placeholder inteligente");
          console.log("Error:", error.message);
          
          // Usar placeholder inteligente como fallback
          return this.generateContentBasedPlaceholder(prompt, style);
        }
      },
      {
        style,
        promptLength: prompt.length,
        model: "nano-banana"
      }
    ).catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Error generando imagen con Nano Banana:', errorMessage);
      
      // Loggear el error
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Google AI',
        operation: 'generación de imagen de escena (error)',
        success: false,
        errorMessage: errorMessage,
        metadata: { style, promptLength: prompt.length }
      });
      
      return null;
    });
  }

  public async generateCharacterImage(
    characterName: string,
    characterDescription: string,
    setting: string = "urban environment"
  ): Promise<string | null> {
    const prompt = `Character sprite of ${characterName}, ${characterDescription}, in ${setting}`;
    
    // El logging se maneja en generateSceneImage, pero agregamos metadata específica
    const result = await this.generateSceneImage(prompt, "character portrait sprite, JRPG character design");
    
    if (result) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Fal.ai',
        operation: 'generación de imagen de personaje',
        success: true,
        metadata: { 
          characterName, 
          setting,
          descriptionLength: characterDescription.length
        }
      });
    }
    
    return result;
  }

  public async generateLocationImage(
    locationName: string,
    locationDescription: string,
    timeOfDay: string = "day"
  ): Promise<string | null> {
    const prompt = `Location scene of ${locationName}, ${locationDescription}, ${timeOfDay} atmosphere`;
    
    // El logging se maneja en generateSceneImage, pero agregamos metadata específica
    const result = await this.generateSceneImage(prompt, "environment tileset, isometric or side-view level design");
    
    if (result) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Fal.ai',
        operation: 'generación de imagen de ubicación',
        success: true,
        metadata: { 
          locationName, 
          timeOfDay,
          descriptionLength: locationDescription.length
        }
      });
    }
    
    return result;
  }

  public async generateStoryMomentImage(
    narrative: string,
    mood: 'dramatic' | 'tense' | 'hopeful' | 'mysterious' | 'exciting' = 'dramatic'
  ): Promise<string | null> {
    // Extraer elementos clave de la narrativa para el prompt
    const cleanNarrative = narrative
      .replace(/[^\w\s,.-]/g, '') // Remover caracteres especiales
      .substring(0, 200); // Limitar longitud
    
    const moodStyles = {
      dramatic: "dramatic pixel art scene, high contrast pixels",
      tense: "dark pixel palette, sharp shadows in pixel form",
      hopeful: "bright pixel colors, warm pixel tones",
      mysterious: "shadowy pixel art, limited dark palette",
      exciting: "dynamic pixel composition, vibrant pixel colors"
    };

    const prompt = `Pixel art scene depicting: ${cleanNarrative}, ${moodStyles[mood]}`;
    
    // El logging se maneja en generateSceneImage, pero agregamos metadata específica
    const result = await this.generateSceneImage(prompt, "story cutscene sprite art, visual novel style");
    
    if (result) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Google AI',
        operation: 'generación de imagen de momento narrativo',
        success: true,
        metadata: { 
          mood, 
          narrativeLength: narrative.length,
          cleanNarrativeLength: cleanNarrative.length
        }
      });
    }
    
    return result;
  }

  /**
   * Generar imagen que combina múltiples elementos (personajes, escenarios, objetos)
   * Usa los assets individuales ya creados para componer la escena
   */
  public async generateCompositeSceneImage(
    characters: Array<{ name: string; appearance: string; hasAsset?: boolean; }>,
    scenarios: Array<{ name: string; visualDetails: string; atmosphere: string; hasAsset?: boolean; }>,
    objects: Array<{ name: string; appearance: string; hasAsset?: boolean; }>,
    context: string,
    mood: 'dramatic' | 'tense' | 'hopeful' | 'mysterious' | 'exciting' = 'dramatic'
  ): Promise<string | null> {
    console.log('🎨 Generando escena compuesta usando assets de Nano Banana...');

    // Construir prompt que referencie los assets ya creados en pixel art
    let compositePrompt = 'Compose a pixel art scene using pre-existing character and environment sprites. ';

    // Agregar escenario principal con referencia a asset
    if (scenarios.length > 0) {
      const mainScenario = scenarios[0];
      compositePrompt += `Setting: ${mainScenario.visualDetails}, ${mainScenario.atmosphere}`;
      if (mainScenario.hasAsset) {
        compositePrompt += ' (using pre-generated environment asset)';
      }
    }

    // Agregar personajes (máximo 3 para no sobrecargar)
    if (characters.length > 0) {
      const characterDescs = characters
        .slice(0, 3)
        .map(char => {
          let desc = `${char.name} (${char.appearance})`;
          if (char.hasAsset) {
            desc += ' [using pre-generated character asset]';
          }
          return desc;
        })
        .join(', ');
      
      compositePrompt += compositePrompt ? `. Characters present: ${characterDescs}` : `Characters: ${characterDescs}`;
    }

    // Agregar objetos importantes
    if (objects.length > 0) {
      const objectDescs = objects
        .slice(0, 2)
        .map(obj => {
          let desc = obj.appearance || obj.name;
          if (obj.hasAsset) {
            desc += ' [using pre-generated object asset]';
          }
          return desc;
        })
        .join(' and ');
      
      compositePrompt += `. Important objects: ${objectDescs}`;
    }

    // Agregar contexto de la historia
    if (context) {
      const contextWords = context
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 8)
        .join(' ');
      
      compositePrompt += `. Scene context: ${contextWords}`;
    }

    // Definir estilos específicos para mood en pixel art
    const moodStyles = {
      dramatic: "dramatic pixel lighting, high contrast pixel composition",
      tense: "dark pixel atmosphere, sharp pixel shadows, suspenseful pixel mood",
      hopeful: "bright pixel lighting, warm pixel colors, optimistic pixel atmosphere",
      mysterious: "moody pixel lighting, shadowy pixels, enigmatic pixel atmosphere",
      exciting: "dynamic pixel angle, vibrant pixel colors, energetic pixel composition"
    };

    // Instrucciones específicas para Nano Banana sobre composición de pixel art
    const fullPrompt = `${compositePrompt}. 

PIXEL ART COMPOSITION INSTRUCTIONS for Nano Banana:
- Combine the pre-existing character and environment sprites into a cohesive pixel art scene
- Maintain consistent pixel art style with all individual sprite assets
- Create natural sprite interactions between characters and environment
- Style: ${moodStyles[mood]}, classic RPG sprite composition, detailed pixel work
- Focus on seamless integration of existing pixel art elements
- Use consistent pixel grid alignment across all elements`;

    console.log('🍌 Nano Banana prompt para composición:', fullPrompt);

    // Generar la imagen usando el método base
    const result = await this.generateSceneImage(fullPrompt, "asset-based composite scene");
    
    if (result) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Google AI',
        operation: 'generación de escena compuesta con assets',
        success: true,
        metadata: { 
          mood,
          characterCount: characters.length,
          scenarioCount: scenarios.length,
          objectCount: objects.length,
          charactersWithAssets: characters.filter(c => c.hasAsset).length,
          scenariosWithAssets: scenarios.filter(s => s.hasAsset).length,
          objectsWithAssets: objects.filter(o => o.hasAsset).length,
          promptLength: fullPrompt.length
        }
      });

      console.log('🎨✅ Escena compuesta generada usando assets de Nano Banana');
    }
    
    return result;
  }

  /**
   * Generar imagen optimizada para mostrar elementos de la biblioteca
   */
  public async generateLibraryElementImage(
    elementName: string,
    elementDescription: string,
    elementType: 'character' | 'scenario' | 'object',
    visualDetails?: string
  ): Promise<string | null> {
    console.log(`🖼️ Generando imagen para elemento de biblioteca: ${elementName}`);

    let prompt = '';
    let style = '';

    switch (elementType) {
      case 'character':
        prompt = `Character sprite of ${elementName}, ${elementDescription}`;
        if (visualDetails) {
          prompt += `, ${visualDetails}`;
        }
        prompt += ', detailed pixel face, character portrait sprite';
        style = "JRPG character sprite, front-facing portrait";
        break;

      case 'scenario':
        prompt = `Environment scene of ${elementName}, ${elementDescription}`;
        if (visualDetails) {
          prompt += `, ${visualDetails}`;
        }
        prompt += ', wide pixel view, detailed environment tileset';
        style = "RPG environment tileset, isometric or side-scrolling level";
        break;

      case 'object':
        prompt = `Item sprite of ${elementName}, ${elementDescription}`;
        if (visualDetails) {
          prompt += `, ${visualDetails}`;
        }
        prompt += ', item icon sprite, clean pixel background';
        style = "RPG item icon, inventory sprite";
        break;
    }

    const result = await this.generateSceneImage(prompt, style);
    
    if (result) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Google AI',
        operation: `generación de imagen de ${elementType}`,
        success: true,
        metadata: { 
          elementName,
          elementType,
          hasVisualDetails: !!visualDetails
        }
      });
    }
    
    return result;
  }

  // Generar placeholder inteligente basado en contenido
  private generateContentBasedPlaceholder(prompt: string, style: string): string {
    // Extraer palabras clave del prompt para crear un placeholder más relevante
    const keywords = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join('+');
    
    // Determinar color basado en el estilo
    const styleColors = {
      'cinematic': '2563eb', // azul cinematográfico
      'realistic': '059669', // verde realista
      'dramatic': 'dc2626', // rojo dramático
      'landscape': '16a34a', // verde paisaje
      'portrait': '7c3aed', // púrpura retrato
      'urban': '64748b', // gris urbano
      'mysterious': '374151', // gris oscuro misterioso
      'hopeful': 'f59e0b', // amarillo esperanzador
    };
    
    // Buscar color basado en palabras clave del estilo
    let color = '6366f1'; // color por defecto
    for (const [key, value] of Object.entries(styleColors)) {
      if (style.toLowerCase().includes(key)) {
        color = value;
        break;
      }
    }
    
    // Crear texto descriptivo para el placeholder
    const displayText = keywords.replace(/\+/g, ' ').substring(0, 20) || 'Imagen';
    
    // Generar URL del placeholder con contenido relevante
    const placeholderUrl = `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(displayText)}`;
    
    return placeholderUrl;
  }

  // Función de fallback que retorna una imagen placeholder temática de pixel art
  public getPlaceholderImage(type: 'character' | 'location' | 'story' = 'story'): string {
    const placeholders = {
      character: 'https://placehold.co/400x300/6366f1/ffffff?text=🎮+Sprite+Personaje',
      location: 'https://placehold.co/400x300/059669/ffffff?text=🗺️+Escenario+Pixel',
      story: 'https://placehold.co/400x300/dc2626/ffffff?text=📖+Escena+RPG'
    };
    
    return placeholders[type];
  }


  // Verificar si el servicio está disponible
  public async isServiceAvailable(): Promise<boolean> {
    try {
      // Verificar si Google AI está configurado
      if (!this.genAI) {
        return false;
      }
      
      // Intentar probar específicamente el modelo de Nano Banana
      try {
        const imageModel = this.genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash-image-preview" 
        });
        await imageModel.generateContent("test image");
        console.log('🍌 Nano Banana (gemini-2.5-flash-image-preview) disponible');
        return true;
      } catch (error) {
        console.log('🍌 Nano Banana no disponible, fallback a Gemini text');
        
        // Si Nano Banana no está disponible, verificar Gemini básico
        const textModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await textModel.generateContent("test");
        return result !== null;
      }
    } catch (error) {
      console.warn('Servicio de Google AI no disponible:', error);
      return false;
    }
  }
}
