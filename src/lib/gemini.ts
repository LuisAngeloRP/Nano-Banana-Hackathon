import { GoogleGenerativeAI } from '@google/generative-ai';
import { GameWorld, StoryEntry, GameScenario } from '@/types/game';
import { getDatabase } from './database';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY no está configurada en las variables de entorno');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  }

  async generateStoryResponse(
    scenario: GameScenario,
    world: GameWorld,
    storyHistory: StoryEntry[],
    userAction: string,
    currentDay: number
  ): Promise<{
    response: string;
    updatedWorld: Partial<GameWorld>;
    shouldAdvanceDay: boolean;
    gameEnded: boolean;
  }> {
    
    const contextPrompt = this.buildContextPrompt(scenario, world, storyHistory, currentDay);
    const fullPrompt = `${contextPrompt}

ACCIÓN DEL JUGADOR (Día ${currentDay}):
${userAction}

INSTRUCCIONES:
1. Responde de manera narrativa y envolvente en español
2. Mantén coherencia con la historia previa y las reglas del mundo
3. Si la acción no es válida o rompe las reglas, explica por qué y ofrece alternativas
4. Proporciona consecuencias realistas para las acciones
5. Incluye detalles del mundo que enriquezcan la experiencia
6. Si es apropiado, avanza la historia al siguiente día
7. SIEMPRE termina tu respuesta con una pregunta directa al jugador sobre qué quiere hacer a continuación
8. Proporciona 2-3 opciones de acción sugeridas, pero permite libertad creativa

FORMATO DE RESPUESTA:
Responde SOLO con un JSON válido que contenga:
{
  "response": "Tu respuesta narrativa aquí que SIEMPRE termine con una pregunta y opciones de acción",
  "worldUpdates": {
    "characters": [array de personajes actualizados],
    "objects": [array de objetos actualizados],
    "locations": [array de ubicaciones actualizadas],
    "rules": [array de reglas del mundo],
    "currentState": {objeto con el estado actual del juego}
  },
  "shouldAdvanceDay": boolean,
  "gameEnded": boolean,
  "endReason": "razón del fin del juego si aplica",
  "newContent": {
    "charactersToSave": [personajes nuevos para guardar en biblioteca],
    "objectsToSave": [objetos nuevos para guardar en biblioteca],
    "locationsToSave": [ubicaciones nuevas para guardar en biblioteca]
  }
}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = result.response.text();
      
      // Limpiar la respuesta para obtener solo el JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Respuesta no válida de Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Guardar contenido nuevo en la biblioteca si existe
      if (parsed.newContent) {
        const db = getDatabase();
        
        // Guardar personajes nuevos
        if (parsed.newContent.charactersToSave) {
          for (const char of parsed.newContent.charactersToSave) {
            await db.saveCharacterToLibrary({
              name: char.name,
              description: char.description,
              traits: char.traits || [],
              backstory: char.backstory,
              personality: char.personality,
              category: 'ai_generated'
            });
          }
        }
        
        // Guardar objetos nuevos
        if (parsed.newContent.objectsToSave) {
          for (const obj of parsed.newContent.objectsToSave) {
            await db.saveObjectToLibrary({
              name: obj.name,
              description: obj.description,
              properties: obj.properties || {},
              category: 'ai_generated',
              rarity: obj.rarity || 'common'
            });
          }
        }
        
        // Guardar ubicaciones nuevas
        if (parsed.newContent.locationsToSave) {
          for (const loc of parsed.newContent.locationsToSave) {
            await db.saveLocationToLibrary({
              name: loc.name,
              description: loc.description,
              type: loc.type || 'ai_generated',
              atmosphere: loc.atmosphere,
              connectionsInfo: loc.connectionsInfo
            });
          }
        }
      }
      
      return {
        response: parsed.response,
        updatedWorld: {
          characters: parsed.worldUpdates.characters || world.characters,
          objects: parsed.worldUpdates.objects || world.objects,
          locations: parsed.worldUpdates.locations || world.locations,
          rules: parsed.worldUpdates.rules || world.rules,
          currentState: { ...world.currentState, ...parsed.worldUpdates.currentState }
        },
        shouldAdvanceDay: parsed.shouldAdvanceDay || false,
        gameEnded: parsed.gameEnded || false
      };

    } catch (error) {
      console.error('Error generando respuesta con Gemini:', error);
      
      // Respuesta de fallback
      return {
        response: `Hubo un problema procesando tu acción. Por favor, intenta de nuevo con una acción más específica.`,
        updatedWorld: {},
        shouldAdvanceDay: false,
        gameEnded: false
      };
    }
  }

  private buildContextPrompt(
    scenario: GameScenario,
    world: GameWorld,
    storyHistory: StoryEntry[],
    currentDay: number
  ): string {
    const recentHistory = storyHistory.slice(-20); // Últimas 20 entradas para contexto
    
    let prompt = `${scenario.initialPrompt}

DÍA ACTUAL: ${currentDay}/${scenario.maxDays}

ESTADO DEL MUNDO:
`;

    if (world.characters.length > 0) {
      prompt += `\nPERSONAJES:
${world.characters.map(char => 
  `- ${char.name}: ${char.description} (Estado: ${char.status})`
).join('\n')}`;
    }

    if (world.objects.length > 0) {
      prompt += `\nOBJETOS IMPORTANTES:
${world.objects.map(obj => 
  `- ${obj.name}: ${obj.description} ${obj.location ? `(en ${obj.location})` : ''}`
).join('\n')}`;
    }

    if (world.locations.length > 0) {
      prompt += `\nUBICACIONES:
${world.locations.map(loc => 
  `- ${loc.name}: ${loc.description}`
).join('\n')}`;
    }

    if (world.rules.length > 0) {
      prompt += `\nREGLAS ACTIVAS DEL MUNDO:
${world.rules
  .filter(rule => rule.isActive)
  .map(rule => `- ${rule.description}`)
  .join('\n')}`;
    }

    if (Object.keys(world.currentState).length > 0) {
      prompt += `\nESTADO ACTUAL:
${Object.entries(world.currentState)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}`;
    }

    if (recentHistory.length > 0) {
      prompt += `\nHISTORIA RECIENTE:
${recentHistory.map(entry => {
  const prefix = entry.type === 'user' ? 'JUGADOR' : 
                 entry.type === 'ai' ? 'NARRADOR' : 'SISTEMA';
  return `[Día ${entry.day}] ${prefix}: ${entry.content}`;
}).join('\n')}`;
    }

    prompt += `\n\nREGLAS DEL ESCENARIO:
${scenario.rules.map(rule => `- ${rule}`).join('\n')}`;

    return prompt;
  }

  async generateInitialWorldState(scenario: GameScenario): Promise<Partial<GameWorld>> {
    // Obtener contenido existente de la biblioteca para inspiración
    const db = getDatabase();
    const existingCharacters = await db.getCharactersFromLibrary(undefined, 5);
    const existingObjects = await db.getObjectsFromLibrary(undefined, 5);
    const existingLocations = await db.getLocationsFromLibrary(undefined, 5);

    const libraryContext = `
CONTENIDO DISPONIBLE EN LA BIBLIOTECA (para inspiración, puedes adaptar o crear nuevo):

PERSONAJES EXISTENTES:
${existingCharacters.map(char => `- ${char.name}: ${char.description}`).join('\n')}

OBJETOS EXISTENTES:
${existingObjects.map(obj => `- ${obj.name}: ${obj.description}`).join('\n')}

UBICACIONES EXISTENTES:
${existingLocations.map(loc => `- ${loc.name}: ${loc.description}`).join('\n')}
`;

    const prompt = `${scenario.initialPrompt}

${libraryContext}

TAREA: Genera un ESCENARIO INICIAL COMPLETO Y DETALLADO para este juego narrativo. 

INSTRUCCIONES CRÍTICAS:
1. Crea un mundo inmersivo con personajes únicos, objetos específicos y ubicaciones atmosféricas
2. Cada elemento debe tener características detalladas y propósito en la historia
3. La narrativa inicial debe ser envolvente y establecer claramente la situación
4. SIEMPRE termina con una pregunta directa y 2-3 opciones de acción específicas
5. Usa la biblioteca existente como inspiración, pero crea contenido nuevo y original

FORMATO DE RESPUESTA (JSON válido):
{
  "characters": [
    {
      "id": "char_unique_id",
      "name": "Nombre del personaje",
      "description": "Descripción física y mental detallada",
      "traits": ["trait1", "trait2", "trait3"],
      "relationships": {"otro_personaje": "tipo_relacion"},
      "status": "alive",
      "backstory": "Historia personal relevante",
      "motivation": "Qué los motiva en esta situación"
    }
  ],
  "objects": [
    {
      "id": "obj_unique_id",
      "name": "Nombre del objeto",
      "description": "Descripción detallada del objeto y su apariencia",
      "properties": {
        "durability": "estado",
        "functionality": "para qué sirve",
        "rarity": "común/raro/único"
      },
      "location": "donde se encuentra",
      "owner": "quien lo posee si aplica"
    }
  ],
  "locations": [
    {
      "id": "loc_unique_id",
      "name": "Nombre del lugar",
      "description": "Descripción visual y atmosférica detallada",
      "connections": ["lugar1", "lugar2"],
      "properties": {
        "atmosphere": "ambiente del lugar",
        "safety": "nivel de seguridad",
        "resources": "recursos disponibles"
      }
    }
  ],
  "rules": [
    {
      "id": "rule_unique_id",
      "description": "Regla específica del mundo",
      "type": "constraint",
      "isActive": true
    }
  ],
  "currentState": {
    "playerLocation": "ubicación inicial del jugador",
    "timeOfDay": "momento del día",
    "weatherConditions": "condiciones climáticas",
    "immediateThreats": "amenazas inmediatas si las hay",
    "availableResources": "recursos al alcance del jugador",
    "mainObjective": "objetivo principal establecido"
  },
  "initialNarrative": "Una narrativa inmersiva de 200-300 palabras que establezca la escena, describa la situación actual, presente a personajes relevantes, mencione objetos importantes y termine con una pregunta directa al jugador seguida de 2-3 opciones específicas de acción numeradas."
}

REQUISITOS ESPECÍFICOS:
- Crea 2-4 personajes únicos con motivaciones claras
- Incluye 3-5 objetos importantes con propósitos específicos
- Diseña 2-3 ubicaciones conectadas con atmósferas distintas
- La narrativa debe ser visual, inmersiva y emocionante
- Las opciones de acción deben ser específicas y relevantes al contexto`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo generar el estado inicial del mundo');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Guardar contenido nuevo en la biblioteca automáticamente
      const db = getDatabase();
      
      // Guardar personajes generados en la biblioteca
      if (parsed.characters) {
        for (const char of parsed.characters) {
          try {
            await db.saveCharacterToLibrary({
              name: char.name,
              description: char.description,
              traits: char.traits || [],
              backstory: char.backstory || '',
              personality: char.motivation || '',
              category: 'initial_generation'
            });
          } catch (error) {
            console.error('Error guardando personaje en biblioteca:', error);
          }
        }
      }
      
      // Guardar objetos generados en la biblioteca
      if (parsed.objects) {
        for (const obj of parsed.objects) {
          try {
            await db.saveObjectToLibrary({
              name: obj.name,
              description: obj.description,
              properties: obj.properties || {},
              category: 'initial_generation',
              rarity: obj.properties?.rarity || 'common'
            });
          } catch (error) {
            console.error('Error guardando objeto en biblioteca:', error);
          }
        }
      }
      
      // Guardar ubicaciones generadas en la biblioteca
      if (parsed.locations) {
        for (const loc of parsed.locations) {
          try {
            await db.saveLocationToLibrary({
              name: loc.name,
              description: loc.description,
              type: 'initial_generation',
              atmosphere: loc.properties?.atmosphere || '',
              connectionsInfo: loc.connections?.join(', ') || ''
            });
          } catch (error) {
            console.error('Error guardando ubicación en biblioteca:', error);
          }
        }
      }
      
      // Guardar la narrativa inicial como parte del estado actual
      const worldState = {
        characters: parsed.characters || [],
        objects: parsed.objects || [],
        locations: parsed.locations || [],
        rules: parsed.rules || [],
        currentState: {
          ...parsed.currentState,
          initialNarrative: parsed.initialNarrative || "El mundo espera tu primera acción..."
        }
      };

      return worldState;
    } catch (error) {
      console.error('Error generando estado inicial del mundo:', error);
      return {
        characters: [],
        objects: [],
        locations: [],
        rules: [],
        currentState: {
          initialNarrative: "El mundo espera tu primera acción. ¿Qué quieres hacer?"
        }
      };
    }
  }
}

// Singleton instance
let geminiInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiInstance) {
    geminiInstance = new GeminiService();
  }
  return geminiInstance;
}

export default GeminiService;
