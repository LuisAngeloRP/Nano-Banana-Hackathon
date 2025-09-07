import { GoogleGenerativeAI } from "@google/generative-ai";
import { ExtractedElements } from '@/types/game';
import { aiLogger } from './aiLogger';

export class ElementExtractor {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public async extractElementsFromPrompt(prompt: string, context?: string): Promise<ExtractedElements> {
    // Verificar si tenemos una API key válida
    if (!this.genAI) {
      console.log('🔍 Usando extracción simulada - configura NEXT_PUBLIC_GOOGLE_AI_API_KEY para usar Gemini');
      return this.getFallbackExtraction(prompt);
    }

    return await aiLogger.measureAIOperation(
      'texto',
      'gemini-1.5-flash',
      'Google Gemini',
      'extracción de elementos',
      async () => {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const extractionPrompt = this.buildExtractionPrompt(prompt, context);
        
        const result = await model.generateContent({
          contents: [
            {
              role: "user", 
              parts: [{ text: extractionPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
          }
        });

        const response = await result.response;
        let text = response.text();
        
        // Limpiar el texto para extraer solo el JSON
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        text = text.trim();
        
        // Extraer JSON válido
        if (!text.startsWith('{')) {
          const jsonStart = text.indexOf('{');
          if (jsonStart !== -1) {
            text = text.substring(jsonStart);
          }
        }
        
        if (!text.endsWith('}')) {
          const jsonEnd = text.lastIndexOf('}');
          if (jsonEnd !== -1) {
            text = text.substring(0, jsonEnd + 1);
          }
        }
        
        try {
          return JSON.parse(text) as ExtractedElements;
        } catch (error) {
          console.warn('⚠️ Error parseando elementos extraídos, usando fallback:', error);
          return this.getFallbackExtraction(prompt);
        }
      },
      {
        temperature: 0.3,
        maxTokens: 1024,
        promptLength: prompt.length
      }
    ).catch(error => {
      console.warn('⚠️ Error extrayendo elementos, usando fallback:', error);
      return this.getFallbackExtraction(prompt);
    });
  }

  private buildExtractionPrompt(prompt: string, context?: string): string {
    return `
Analiza el siguiente texto de historia/acción de juego y extrae ÚNICAMENTE los elementos específicos que se mencionan explícitamente.

TEXTO A ANALIZAR:
"${prompt}"

${context ? `CONTEXTO ADICIONAL:\n${context}\n` : ''}

INSTRUCCIONES:
- Extrae SOLO personajes, lugares/escenarios y objetos que se mencionen EXPLÍCITAMENTE
- NO inventes elementos que no estén en el texto
- Para cada elemento, proporciona detalles visuales específicos
- Si no hay elementos claros de alguna categoría, deja el array vacío

FORMATO DE RESPUESTA (JSON válido):
{
  "characters": [
    {
      "name": "Nombre exacto mencionado",
      "description": "Descripción basada en el texto",
      "appearance": "Características físicas específicas mencionadas",
      "personality": "Rasgos de personalidad evidentes",
      "role": "Rol en la historia"
    }
  ],
  "scenarios": [
    {
      "name": "Nombre del lugar/situación",
      "description": "Descripción del escenario",
      "type": "location/situation/event",
      "atmosphere": "Ambiente y mood del lugar",
      "visualDetails": "Detalles visuales específicos"
    }
  ],
  "objects": [
    {
      "name": "Nombre del objeto",
      "description": "Descripción del objeto",
      "type": "tool/weapon/document/money/information/contact",
      "appearance": "Cómo se ve físicamente",
      "importance": "low/medium/high"
    }
  ]
}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;
  }

  private getFallbackExtraction(prompt: string): ExtractedElements {
    // Extracción básica usando análisis de texto simple
    const words = prompt.toLowerCase().split(/\s+/);
    
    // Palabras clave para detectar personajes
    const characterKeywords = ['persona', 'hombre', 'mujer', 'individuo', 'sujeto', 'tipo', 'cliente', 'jefe', 'empleado'];
    const locationKeywords = ['lugar', 'sitio', 'oficina', 'casa', 'calle', 'edificio', 'local', 'negocio', 'restaurant', 'bar'];
    const objectKeywords = ['dinero', 'documento', 'papel', 'teléfono', 'computadora', 'herramienta', 'información'];

    const extraction: ExtractedElements = {
      characters: [],
      scenarios: [],
      objects: []
    };

    // Detectar si hay menciones de personajes
    if (characterKeywords.some(keyword => words.includes(keyword))) {
      extraction.characters.push({
        name: "Persona mencionada",
        description: "Individuo mencionado en la narrativa",
        appearance: "Apariencia no especificada",
        personality: "Personalidad por determinar",
        role: "Rol en desarrollo"
      });
    }

    // Detectar si hay menciones de lugares
    if (locationKeywords.some(keyword => words.includes(keyword))) {
      extraction.scenarios.push({
        name: "Ubicación mencionada",
        description: "Lugar referenciado en la historia",
        type: "location" as const,
        atmosphere: "Ambiente por determinar",
        visualDetails: "Detalles visuales por desarrollar"
      });
    }

    // Detectar si hay menciones de objetos
    if (objectKeywords.some(keyword => words.includes(keyword))) {
      extraction.objects.push({
        name: "Objeto mencionado",
        description: "Elemento referenciado en la narrativa",
        type: "information" as const,
        appearance: "Apariencia por describir",
        importance: "medium" as const
      });
    }

    return extraction;
  }

  // Método para mejorar un elemento existente con más detalles
  public async enhanceElement(
    elementName: string, 
    elementType: 'character' | 'scenario' | 'object',
    currentDescription: string,
    context?: string
  ): Promise<any> {
    if (!this.genAI) {
      return null;
    }

    return await aiLogger.measureAIOperation(
      'texto',
      'gemini-1.5-flash',
      'Google Gemini',
      'mejora de elemento',
      async () => {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const enhancementPrompt = `
Mejora y expande la descripción del siguiente elemento para hacerlo más visual y detallado:

ELEMENTO: ${elementName}
TIPO: ${elementType}
DESCRIPCIÓN ACTUAL: ${currentDescription}
${context ? `CONTEXTO: ${context}` : ''}

Proporciona una descripción mejorada que incluya:
- Detalles visuales específicos
- Características únicas
- Elementos que lo hagan memorable
- Información relevante para generar imágenes

Responde en formato JSON con las mejoras:
${elementType === 'character' ? `
{
  "appearance": "Descripción física detallada",
  "personality": "Rasgos de personalidad específicos",
  "background": "Historia personal breve",
  "visualDetails": "Elementos visuales únicos"
}` : elementType === 'scenario' ? `
{
  "visualDetails": "Descripción visual detallada del lugar",
  "atmosphere": "Ambiente y mood específico",
  "uniqueFeatures": "Características distintivas",
  "lightingMood": "Iluminación y ambiente visual"
}` : `
{
  "appearance": "Apariencia física detallada",
  "uniqueFeatures": "Características distintivas",
  "story": "Historia u origen del objeto",
  "visualDetails": "Detalles visuales para imagen"
}`}
`;
        
        const result = await model.generateContent(enhancementPrompt);
        const response = await result.response;
        let text = response.text();
        
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          return JSON.parse(text);
        } catch (error) {
          console.warn('⚠️ Error parseando mejora de elemento:', error);
          return null;
        }
      },
      {
        elementType,
        elementName,
        temperature: 0.7
      }
    );
  }
}
