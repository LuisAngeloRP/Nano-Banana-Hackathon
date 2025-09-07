import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiLogger } from './aiLogger';

export class ImageGenerator {
  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    // Configurar Google AI para Nano Banana
    if (apiKey && apiKey !== 'dummy-key') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        console.log('🍌 Nano Banana configurado con Google AI Studio');
      } catch (error) {
        console.warn('⚠️ Error configurando Google AI:', error);
        this.genAI = null;
      }
    } else {
      console.log('🖼️ Modo placeholder - configura NEXT_PUBLIC_GOOGLE_AI_API_KEY para usar Nano Banana');
    }
  }

  public async generateSceneImage(
    prompt: string, 
    style: string = "cinematic realistic"
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
        
        // Crear el prompt optimizado para generación de imágenes
        const imagePrompt = `${style}, ${prompt}. High quality, detailed, realistic image.`;
        
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
    const prompt = `Portrait of ${characterName}, ${characterDescription}, in ${setting}, professional lighting, detailed face, high quality`;
    
    // El logging se maneja en generateSceneImage, pero agregamos metadata específica
    const result = await this.generateSceneImage(prompt, "realistic portrait style");
    
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
    const prompt = `${locationName}, ${locationDescription}, ${timeOfDay} lighting, atmospheric, detailed environment`;
    
    // El logging se maneja en generateSceneImage, pero agregamos metadata específica
    const result = await this.generateSceneImage(prompt, "cinematic landscape");
    
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
      dramatic: "dramatic lighting, cinematic composition",
      tense: "dark atmosphere, high contrast lighting",
      hopeful: "warm lighting, bright colors, optimistic mood",
      mysterious: "moody lighting, shadows, mysterious atmosphere",
      exciting: "dynamic composition, vibrant colors, action scene"
    };

    const prompt = `Scene depicting: ${cleanNarrative}, ${moodStyles[mood]}, high quality, detailed`;
    
    // El logging se maneja en generateSceneImage, pero agregamos metadata específica
    const result = await this.generateSceneImage(prompt, "cinematic storytelling");
    
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
   */
  public async generateCompositeSceneImage(
    characters: Array<{ name: string; appearance: string; }>,
    scenarios: Array<{ name: string; visualDetails: string; atmosphere: string; }>,
    objects: Array<{ name: string; appearance: string; }>,
    context: string,
    mood: 'dramatic' | 'tense' | 'hopeful' | 'mysterious' | 'exciting' = 'dramatic'
  ): Promise<string | null> {
    console.log('🎨 Generando imagen compuesta con múltiples elementos...');

    // Construir prompt complejo que incluya todos los elementos
    let compositePrompt = '';

    // Agregar escenario principal
    if (scenarios.length > 0) {
      const mainScenario = scenarios[0];
      compositePrompt += `Setting: ${mainScenario.visualDetails}, ${mainScenario.atmosphere}`;
    }

    // Agregar personajes (máximo 3 para no sobrecargar)
    if (characters.length > 0) {
      const characterDescs = characters
        .slice(0, 3)
        .map(char => `${char.name} (${char.appearance})`)
        .join(', ');
      
      compositePrompt += compositePrompt ? `. Characters present: ${characterDescs}` : `Characters: ${characterDescs}`;
    }

    // Agregar objetos importantes
    if (objects.length > 0) {
      const objectDescs = objects
        .slice(0, 2)
        .map(obj => obj.appearance || obj.name)
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

    // Definir estilos específicos para mood
    const moodStyles = {
      dramatic: "cinematic lighting, dramatic composition, depth of field",
      tense: "dark atmosphere, high contrast, shadows, suspenseful mood",
      hopeful: "bright lighting, warm colors, optimistic atmosphere",
      mysterious: "moody lighting, fog, shadows, enigmatic atmosphere",
      exciting: "dynamic angle, vibrant colors, energetic composition"
    };

    const fullPrompt = `${compositePrompt}. Style: ${moodStyles[mood]}, professional photography, high detail, realistic`;

    // Generar la imagen usando el método base
    const result = await this.generateSceneImage(fullPrompt, "composite cinematic scene");
    
    if (result) {
      aiLogger.logAIUsage({
        aiType: 'imagen',
        model: 'nano-banana',
        provider: 'Google AI',
        operation: 'generación de imagen compuesta',
        success: true,
        metadata: { 
          mood,
          characterCount: characters.length,
          scenarioCount: scenarios.length,
          objectCount: objects.length,
          promptLength: fullPrompt.length
        }
      });

      console.log('🎨 Imagen compuesta generada exitosamente');
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
        prompt = `Professional portrait of ${elementName}, ${elementDescription}`;
        if (visualDetails) {
          prompt += `, ${visualDetails}`;
        }
        prompt += ', detailed face, high quality portrait, studio lighting';
        style = "realistic portrait photography";
        break;

      case 'scenario':
        prompt = `Location view of ${elementName}, ${elementDescription}`;
        if (visualDetails) {
          prompt += `, ${visualDetails}`;
        }
        prompt += ', wide angle view, detailed environment, atmospheric lighting';
        style = "architectural photography";
        break;

      case 'object':
        prompt = `Detailed view of ${elementName}, ${elementDescription}`;
        if (visualDetails) {
          prompt += `, ${visualDetails}`;
        }
        prompt += ', product photography, clean background, detailed textures';
        style = "product photography";
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

  // Función de fallback que retorna una imagen placeholder
  public getPlaceholderImage(type: 'character' | 'location' | 'story' = 'story'): string {
    const placeholders = {
      character: 'https://placehold.co/400x300/6366f1/ffffff?text=Personaje',
      location: 'https://placehold.co/400x300/059669/ffffff?text=Lugar',
      story: 'https://placehold.co/400x300/dc2626/ffffff?text=Historia'
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
