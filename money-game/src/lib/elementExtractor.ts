import { GoogleGenerativeAI } from "@google/generative-ai";
import { ExtractedElements } from '@/types/game';
import { aiLogger } from './aiLogger';

export class ElementExtractor {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public async extractElementsFromPrompt(prompt: string, context?: string): Promise<ExtractedElements> {
    // SIEMPRE intentar usar IA primero, luego fallback inteligente si hay error
    if (this.genAI) {
      try {
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
                temperature: 0.4,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2048,
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
              const parsed = JSON.parse(text) as ExtractedElements;
              console.log(`🤖 Elementos extraídos con IA: ${parsed.characters?.length || 0} personajes, ${parsed.scenarios?.length || 0} escenarios, ${parsed.objects?.length || 0} objetos`);
              
              // Validar que tenga la estructura correcta
              if (!parsed.characters || !parsed.scenarios || !parsed.objects) {
                throw new Error('Estructura JSON inválida de IA');
              }
              
              return parsed;
            } catch (parseError) {
              console.warn('⚠️ Error parseando JSON de IA:', parseError);
              console.log('Respuesta cruda de IA:', text);
              throw new Error('JSON inválido de IA');
            }
          },
          {
            temperature: 0.4,
            maxTokens: 2048,
            promptLength: prompt.length,
            hasContext: !!context
          }
        );
      } catch (error) {
        console.warn('⚠️ Error con IA de extracción, usando fallback inteligente:', error);
        return this.getIntelligentFallback(prompt, context);
      }
    } else {
      console.log('🔍 API key no configurada, usando extracción inteligente local');
      return this.getIntelligentFallback(prompt, context);
    }
  }

  private buildExtractionPrompt(prompt: string, context?: string): string {
    return `
Eres un experto en análisis narrativo y diseño de videojuegos. Analiza el siguiente PROMPT DEL USUARIO para extraer elementos visuales que necesitan assets para pixel art.

PROMPT DEL USUARIO:
"${prompt}"

${context ? `CONTEXTO DEL JUEGO ACTUAL:\n${context}\n` : ''}

INSTRUCCIONES AVANZADAS:

🎯 TU MISIÓN: Extraer elementos visuales que necesitan representación gráfica, sin importar si se mencionan directa o indirectamente.

📋 TIPOS DE ANÁLISIS:
1. **MENCIONES DIRECTAS**: "voy a la cafetería" → cafetería como escenario
2. **MENCIONES IMPLÍCITAS**: "fracaso de mi startup" → oficina vacía, documentos, laptop
3. **CONTEXTO EMOCIONAL**: "recuerdos dolorosos" → espacios que reflejen esas emociones
4. **ELEMENTOS TEMÁTICOS**: Si habla de negocios → oficinas, documentos, tecnología

🎨 CRITERIOS DE EXTRACCIÓN:

**PERSONAJES**: Extrae si hay:
- Personas mencionadas directamente
- Roles profesionales implicados (emprendedores, estudiantes, trabajadores)
- "Yo" del usuario cuando tiene características visuales específicas

**ESCENARIOS**: Extrae si hay:
- Lugares físicos mencionados
- Contextos que implican ubicaciones (startup → oficina)
- Ambientes emocionales que necesitan representación visual

**OBJETOS**: Extrae si hay:
- Elementos físicos mencionados
- Objetos simbólicos importantes para la narrativa
- Herramientas relevantes al contexto (laptop, documentos, dinero)

🎯 EJEMPLOS INTELIGENTES:

Input: "El recuerdo del fracaso de mi startup me golpea"
→ Elementos implícitos: Oficina vacía (escenario), Documentos de negocio (objeto), Emprendedor (personaje)

Input: "Soy un estudiante sin dinero en la ciudad"
→ Elementos: Estudiante (personaje), Ciudad/Universidad (escenario), Dinero/Cartera vacía (objeto)

Input: "Necesito encontrar trabajo urgentemente"
→ Elementos: Oficinas de empleo (escenario), CV/Documentos (objeto), Reclutador (personaje)

🎨 DETALLES PARA PIXEL ART:
- Proporciona descripciones visuales ricas pero concisas
- Enfócate en elementos distintivos para pixel art 16-bit
- Considera colores, formas y atmósferas específicas

FORMATO DE RESPUESTA (JSON válido):
{
  "characters": [
    {
      "name": "Nombre descriptivo del personaje",
      "description": "Descripción contextual basada en el prompt",
      "appearance": "Características físicas específicas para pixel art",
      "personality": "Personalidad inferida del contexto",
      "role": "Rol específico en la narrativa"
    }
  ],
  "scenarios": [
    {
      "name": "Nombre del lugar o situación",
      "description": "Descripción del escenario y su importancia",
      "type": "location/situation/event",
      "atmosphere": "Ambiente emocional y visual",
      "visualDetails": "Detalles específicos para pixel art (colores, objetos, iluminación)"
    }
  ],
  "objects": [
    {
      "name": "Nombre del objeto",
      "description": "Descripción y relevancia narrativa",
      "type": "tool/weapon/document/money/information/contact",
      "appearance": "Descripción visual detallada para sprite pixel art",
      "importance": "low/medium/high"
    }
  ]
}

⚠️ CRÍTICO: Siempre extrae AL MENOS 1 elemento, incluso si el prompt es abstracto. Usa inferencia contextual inteligente.

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;
  }

  private getIntelligentFallback(prompt: string, context?: string): ExtractedElements {
    // Extracción básica usando análisis de texto simple
    const words = prompt.toLowerCase().split(/\s+/);
    const fullText = prompt.toLowerCase();
    
    // Palabras clave expandidas para detectar elementos
    const characterKeywords = ['persona', 'hombre', 'mujer', 'individuo', 'sujeto', 'tipo', 'cliente', 'jefe', 'empleado', 'emprendedor', 'fundador', 'socio', 'equipo'];
    const locationKeywords = ['lugar', 'sitio', 'oficina', 'casa', 'calle', 'edificio', 'local', 'negocio', 'restaurant', 'bar', 'startup', 'empresa', 'coworking', 'laboratorio', 'fábrica'];
    const objectKeywords = ['dinero', 'documento', 'papel', 'teléfono', 'computadora', 'herramienta', 'información', 'laptop', 'capital', 'inversión', 'producto', 'prototipo'];

    // Palabras temáticas que sugieren contextos específicos
    const businessKeywords = ['startup', 'empresa', 'negocio', 'emprendimiento', 'fracaso', 'éxito', 'inversión', 'producto'];
    const emotionalKeywords = ['recuerdo', 'nostalgia', 'dolor', 'frustración', 'esperanza', 'miedo', 'presión'];

    const extraction: ExtractedElements = {
      characters: [],
      scenarios: [],
      objects: []
    };

    // Detectar contexto de startup/negocio y crear elementos temáticos
    if (businessKeywords.some(keyword => fullText.includes(keyword))) {
      // Si menciona startup pero no detectamos lugar específico, crear oficina
      if (!locationKeywords.some(keyword => words.includes(keyword))) {
        extraction.scenarios.push({
          name: "Oficina de Startup",
          description: "El lugar donde comenzó todo, ahora vacío y lleno de recuerdos",
          type: "location" as const,
          atmosphere: "Melancólica, con vestigios de sueños rotos",
          visualDetails: "Oficina moderna pero desolada, sillas vacías, pizarras con ideas borradas, computadoras apagadas"
        });
      }

      // Si habla de fracaso/recuerdos, crear objetos simbólicos
      if (fullText.includes('fracaso') || fullText.includes('recuerdo')) {
        extraction.objects.push({
          name: "Documentos de la Startup",
          description: "Papeles con el plan de negocio original, ahora obsoleto",
          type: "document" as const,
          appearance: "Documentos arrugados y amarillentos, con números en rojo",
          importance: "high" as const
        });
      }
    }

    // Detectar menciones directas de personajes
    if (characterKeywords.some(keyword => words.includes(keyword))) {
      extraction.characters.push({
        name: "Emprendedor",
        description: "Alguien que apostó todo a una idea",
        appearance: "Vestimenta casual de startup, expresión cansada pero determinada",
        personality: "Resiliente pero marcado por la experiencia",
        role: "Protagonista de la historia empresarial"
      });
    }

    // Detectar menciones directas de lugares
    if (locationKeywords.some(keyword => words.includes(keyword))) {
      extraction.scenarios.push({
        name: "Lugar mencionado",
        description: "Ubicación importante en la narrativa",
        type: "location" as const,
        atmosphere: "Ambiente cargado de significado",
        visualDetails: "Detalles que reflejan la historia personal"
      });
    }

    // Detectar menciones directas de objetos
    if (objectKeywords.some(keyword => words.includes(keyword))) {
      extraction.objects.push({
        name: "Objeto significativo",
        description: "Elemento con valor simbólico en la historia",
        type: "information" as const,
        appearance: "Apariencia que refleja su importancia",
        importance: "medium" as const
      });
    }

    // Si no se detectó nada específico pero hay contenido emocional, crear elementos genéricos
    if (extraction.characters.length === 0 && extraction.scenarios.length === 0 && extraction.objects.length === 0) {
      if (emotionalKeywords.some(keyword => fullText.includes(keyword))) {
        extraction.scenarios.push({
          name: "Escenario Emocional",
          description: "El espacio mental donde se desarrollan los recuerdos",
          type: "situation" as const,
          atmosphere: "Introspectiva y cargada de emociones",
          visualDetails: "Ambiente que refleja el estado emocional del momento"
        });
      }
    }

    // Si después de todo el análisis no hay elementos, crear uno genérico basado en el contexto
    if (extraction.characters.length === 0 && extraction.scenarios.length === 0 && extraction.objects.length === 0) {
      // Analizar el tono general del prompt para crear elemento apropiado
      if (fullText.includes('dinero') || fullText.includes('trabajo') || fullText.includes('empleo')) {
        extraction.scenarios.push({
          name: "Entorno Laboral",
          description: "Espacio relacionado con trabajo y oportunidades económicas",
          type: "situation" as const,
          atmosphere: "Profesional y lleno de posibilidades",
          visualDetails: "Oficinas modernas, escritorios, computadoras, ambiente corporativo"
        });
      } else if (fullText.includes('hogar') || fullText.includes('casa') || fullText.includes('familia')) {
        extraction.scenarios.push({
          name: "Espacio Personal",
          description: "Lugar íntimo y personal del protagonista",
          type: "location" as const,
          atmosphere: "Acogedor pero con tensiones subyacentes",
          visualDetails: "Interior doméstico, muebles familiares, objetos personales"
        });
      } else {
        // Elemento genérico muy básico
        extraction.scenarios.push({
          name: "Escenario Narrativo",
          description: "El espacio donde se desarrolla la historia",
          type: "situation" as const,
          atmosphere: "Neutral, adaptable al contexto",
          visualDetails: "Ambiente simple pero significativo para la narrativa"
        });
      }
    }

    console.log(`🔍 Extracción fallback inteligente completada: ${extraction.characters.length} personajes, ${extraction.scenarios.length} escenarios, ${extraction.objects.length} objetos`);
    
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
