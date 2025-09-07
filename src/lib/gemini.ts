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
3. VALIDA LA LÓGICA: Si el jugador menciona algo que no tiene/sabe, narra que no lo tiene
4. NO ASUMAS objetos, conocimientos o habilidades que no se han establecido
5. EJECUTA las acciones posibles, REDIRIGE las imposibles hacia obtener lo necesario
6. Proporciona consecuencias REALISTAS e INMEDIATAS para todas las acciones
7. Si una acción requiere algo no disponible, narra el obstáculo y las consecuencias
8. NO sugieras qué hacer ni ofrezcas opciones - deja que el jugador decida
9. NO hagas preguntas al final - simplemente narra lo que sucede
10. Incluye detalles del mundo que enriquezcan la experiencia
11. Si es apropiado, avanza la historia al siguiente día
12. PUEDES CREAR nuevos personajes, objetos y ubicaciones según sea necesario para la historia
13. PUEDES EDITAR personajes, objetos y ubicaciones existentes para reflejar cambios en la historia
14. Sé un NARRADOR REACTIVO, no un guía - el jugador es responsable de sus decisiones

FORMATO DE RESPUESTA:
Responde SOLO con un JSON válido que contenga:
{
  "response": "Tu respuesta narrativa que describe lo que sucede como resultado de la acción del jugador (sin saltos de línea, usa espacios)",
  "worldUpdates": {
    "characters": [array COMPLETO de todos los personajes del mundo, incluyendo nuevos y editados],
    "objects": [array COMPLETO de todos los objetos del mundo, incluyendo nuevos y editados],
    "locations": [array COMPLETO de todas las ubicaciones del mundo, incluyendo nuevas y editadas],
    "rules": [array de reglas del mundo, incluyendo nuevas si es necesario],
    "currentState": {objeto con el estado actual del juego actualizado}
  },
  "shouldAdvanceDay": boolean,
  "gameEnded": boolean,
  "endReason": "razón del fin del juego si aplica",
  "changes": {
    "newCharacters": [personajes completamente nuevos creados en esta respuesta],
    "editedCharacters": [personajes existentes que fueron modificados],
    "newObjects": [objetos completamente nuevos creados en esta respuesta],
    "editedObjects": [objetos existentes que fueron modificados],
    "newLocations": [ubicaciones completamente nuevas creadas en esta respuesta],
    "editedLocations": [ubicaciones existentes que fueron modificadas],
    "summary": "Breve resumen de los cambios realizados al mundo"
  }
}

IMPORTANTE: 
- El JSON debe ser válido y parseable
- NO uses saltos de línea dentro de strings
- NO uses comillas dobles dentro de strings (usa comillas simples)
- NO incluyas caracteres especiales o de control
- Asegúrate de cerrar todas las llaves y corchetes
- NO incluyas texto antes o después del JSON
- Responde ÚNICAMENTE con el JSON, sin explicaciones adicionales`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = result.response.text();
      
      // Limpiar la respuesta para obtener solo el JSON
      let jsonText = '';
      
      // Buscar el JSON más estrictamente
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta de Gemini');
      }
      
      jsonText = jsonMatch[0];
      
      // Limpiar caracteres problemáticos comunes
      jsonText = this.sanitizeJSON(jsonText);

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Error parseando JSON:', parseError);
        console.error('JSON problemático:', jsonText.substring(0, 500) + '...');
        console.error('Respuesta completa de Gemini:', response);
        
        // Intento de rescate: extraer solo la respuesta narrativa si es posible
        const responseMatch = response.match(/"response":\s*"([^"]+)"/);
        const fallbackResponse = responseMatch ? responseMatch[1] : 'La acción se ejecuta pero el resultado no es claro debido a un error técnico.';
        
        return {
          response: fallbackResponse,
          updatedWorld: world, // Mantener estado actual
          shouldAdvanceDay: false,
          gameEnded: false
        };
      }
      
      // Procesar cambios en el mundo y guardar nuevo contenido en la biblioteca
      if (parsed.changes) {
        try {
          const db = getDatabase();
          
          // Guardar personajes completamente nuevos en la biblioteca
          if (parsed.changes.newCharacters) {
            for (const char of parsed.changes.newCharacters) {
              try {
                if (char.name && char.description) {
                  await db.saveCharacterToLibrary({
                    name: char.name,
                    description: char.description,
                    traits: char.traits || [],
                    backstory: char.backstory || '',
                    personality: char.motivation || char.personality || '',
                    category: 'ai_generated'
                  });
                } else {
                  console.warn('Personaje nuevo omitido por datos insuficientes:', char);
                }
              } catch (charError) {
                console.error('Error guardando personaje nuevo:', charError);
              }
            }
          }
          
          // Guardar objetos completamente nuevos en la biblioteca
          if (parsed.changes.newObjects) {
            for (const obj of parsed.changes.newObjects) {
              try {
                if (obj.name && obj.description) {
                  await db.saveObjectToLibrary({
                    name: obj.name,
                    description: obj.description,
                    properties: obj.properties || {},
                    category: 'ai_generated',
                    rarity: obj.properties?.rarity || obj.rarity || 'common'
                  });
                } else {
                  console.warn('Objeto nuevo omitido por datos insuficientes:', obj);
                }
              } catch (objError) {
                console.error('Error guardando objeto nuevo:', objError);
              }
            }
          }
          
          // Guardar ubicaciones completamente nuevas en la biblioteca
          if (parsed.changes.newLocations) {
            for (const loc of parsed.changes.newLocations) {
              try {
                if (loc.name && loc.description) {
                  await db.saveLocationToLibrary({
                    name: loc.name,
                    description: loc.description,
                    type: 'ai_generated',
                    atmosphere: loc.properties?.atmosphere || loc.atmosphere || '',
                    connectionsInfo: loc.connections?.join(', ') || ''
                  });
                } else {
                  console.warn('Ubicación nueva omitida por datos insuficientes:', loc);
                }
              } catch (locError) {
                console.error('Error guardando ubicación nueva:', locError);
              }
            }
          }
          
          // Log de cambios para debugging
          if (parsed.changes.summary) {
            console.log('Cambios en el mundo:', parsed.changes.summary);
          }
          
        } catch (error) {
          console.error('Error general procesando cambios del mundo:', error);
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
        response: `Hubo un problema procesando tu acción. El mundo permanece en su estado actual.`,
        updatedWorld: {},
        shouldAdvanceDay: false,
        gameEnded: false
      };
    }
  }

  private sanitizeJSON(jsonText: string): string {
    return jsonText
      // Eliminar caracteres de control
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Manejar saltos de línea dentro de strings
      .replace(/"\s*\n\s*"/g, '" "')
      // Limpiar espacios extras
      .replace(/\s+/g, ' ')
      // Eliminar comentarios si los hay
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      // Escapar comillas dentro de strings si es necesario
      .replace(/(?<!\\)"/g, '"')
      .trim();
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
      prompt += `\nPERSONAJES ACTUALES (puedes editarlos o crear nuevos):
${world.characters.map(char => 
  `- ID: ${char.id} | ${char.name}: ${char.description} (Estado: ${char.status})${char.traits ? ` [${char.traits.join(', ')}]` : ''}`
).join('\n')}`;
    }

    if (world.objects.length > 0) {
      prompt += `\nOBJETOS ACTUALES (puedes editarlos o crear nuevos):
${world.objects.map(obj => 
  `- ID: ${obj.id} | ${obj.name}: ${obj.description} ${obj.location ? `(en ${obj.location})` : ''}${obj.owner ? ` [Propietario: ${obj.owner}]` : ''}`
).join('\n')}`;
    }

    if (world.locations.length > 0) {
      prompt += `\nUBICACIONES ACTUALES (puedes editarlas o crear nuevas):
${world.locations.map(loc => 
  `- ID: ${loc.id} | ${loc.name}: ${loc.description}${loc.connections ? ` [Conecta con: ${loc.connections.join(', ')}]` : ''}`
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
      prompt += `\nESTADO ACTUAL DEL JUGADOR:
${Object.entries(world.currentState)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}`;
    }

    // Agregar inventario explícito si existe
    const playerInventory = world.objects.filter(obj => obj.owner === 'jugador' || obj.location === 'inventario');
    if (playerInventory.length > 0) {
      prompt += `\nINVENTARIO DEL JUGADOR:
${playerInventory.map(obj => `- ${obj.name}: ${obj.description}`).join('\n')}`;
    } else {
      prompt += `\nINVENTARIO DEL JUGADOR: Vacío (no posee objetos actualmente)`;
    }

    // Agregar habilidades y conocimientos establecidos
    if (world.currentState?.skills || world.currentState?.knowledge) {
      prompt += `\nHABILIDADES Y CONOCIMIENTOS DEL JUGADOR:`;
      if (world.currentState.skills) {
        prompt += `\n- Habilidades: ${world.currentState.skills}`;
      }
      if (world.currentState.knowledge) {
        prompt += `\n- Conocimientos: ${world.currentState.knowledge}`;
      }
    } else {
      prompt += `\nHABILIDADES Y CONOCIMIENTOS: Solo las básicas (caminar, hablar, conocimiento general básico)`;
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
${scenario.rules.map(rule => `- ${rule}`).join('\n')}

CAPACIDADES DE EDICIÓN:
- Para EDITAR un elemento existente: Mantén el mismo ID pero actualiza sus propiedades
- Para CREAR un elemento nuevo: Asigna un nuevo ID único (ej: "char_nuevo_001")
- Ejemplos de ediciones válidas:
  * Cambiar estado de un personaje: vivo -> herido -> muerto
  * Mover un objeto de ubicación: "sala principal" -> "inventario del jugador"
  * Modificar conexiones entre ubicaciones: agregar nuevos caminos
  * Actualizar descripciones para reflejar daños, cambios, etc.
- Los elementos eliminados no deben aparecer en worldUpdates
- Siempre incluye TODOS los elementos actuales en worldUpdates, incluso los no modificados

ESTILO NARRATIVO:
- REACTIVO, no directivo: "El guardia te golpea con su bastón. Sientes un dolor punzante en el brazo."
- NO digas: "¿Qué quieres hacer ahora? Puedes: A) Huir, B) Atacar, C) Negociar"
- SÍ muestra consecuencias: "Tu brazo izquierdo está fracturado. La sangre mancha tu camisa."
- El jugador decide qué hacer sin tu guía - tú solo narras los resultados

VALIDACIÓN LÓGICA - EJEMPLOS:
- Jugador: "Uso mi pistola" → Si no tiene pistola: "Buscas en tu ropa una pistola, pero no tienes ninguna."
- Jugador: "Mezclo veneno" → Si no tiene veneno: "Necesitas sustancias tóxicas que no posees actualmente."
- Jugador: "Hackeo el sistema" → Si no sabe programar: "Los códigos en la pantalla no tienen sentido para ti."
- Jugador: "Conduzco el auto" → Si no hay auto: "No hay ningún vehículo disponible aquí."
- SIEMPRE verifica el inventario actual y conocimientos establecidos antes de ejecutar

REGLA FUNDAMENTAL: NO INVENTES que el jugador tiene algo. Si no está en su inventario/estado/historia, NO LO TIENE.`;

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
  "initialNarrative": "Una narrativa inmersiva de 200-300 palabras que establezca la escena, describa la situación actual, presente a personajes relevantes, mencione objetos importantes y termine describiendo el momento presente, sin preguntas ni sugerencias - deja que el jugador tome la iniciativa."
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

      let jsonText = this.sanitizeJSON(jsonMatch[0]);
      let parsed;
      
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Error parseando JSON inicial:', parseError);
        console.error('JSON problemático inicial:', jsonText.substring(0, 500) + '...');
        throw new Error('JSON malformado en generación inicial');
      }
      
      // Guardar contenido nuevo en la biblioteca automáticamente
      try {
        const db = getDatabase();
        
        // Guardar personajes generados en la biblioteca
        if (parsed.characters) {
          for (const char of parsed.characters) {
            try {
              // Validar que el personaje tenga datos mínimos requeridos
              if (char.name && char.description) {
                await db.saveCharacterToLibrary({
                  name: char.name,
                  description: char.description,
                  traits: char.traits || [],
                  backstory: char.backstory || '',
                  personality: char.motivation || '',
                  category: 'initial_generation'
                });
              } else {
                console.warn('Personaje omitido por datos insuficientes:', char);
              }
            } catch (error) {
              console.error('Error guardando personaje en biblioteca:', error);
            }
          }
        }
        
        // Guardar objetos generados en la biblioteca
        if (parsed.objects) {
          for (const obj of parsed.objects) {
            try {
              // Validar que el objeto tenga datos mínimos requeridos
              if (obj.name && obj.description) {
                await db.saveObjectToLibrary({
                  name: obj.name,
                  description: obj.description,
                  properties: obj.properties || {},
                  category: 'initial_generation',
                  rarity: obj.properties?.rarity || 'common'
                });
              } else {
                console.warn('Objeto omitido por datos insuficientes:', obj);
              }
            } catch (error) {
              console.error('Error guardando objeto en biblioteca:', error);
            }
          }
        }
        
        // Guardar ubicaciones generadas en la biblioteca
        if (parsed.locations) {
          for (const loc of parsed.locations) {
            try {
              // Validar que la ubicación tenga datos mínimos requeridos
              if (loc.name && loc.description) {
                await db.saveLocationToLibrary({
                  name: loc.name,
                  description: loc.description,
                  type: 'initial_generation',
                  atmosphere: loc.properties?.atmosphere || '',
                  connectionsInfo: loc.connections?.join(', ') || ''
                });
              } else {
                console.warn('Ubicación omitida por datos insuficientes:', loc);
              }
            } catch (error) {
              console.error('Error guardando ubicación en biblioteca:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error general guardando contenido inicial en biblioteca:', error);
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
          initialNarrative: "El mundo está listo. Tú decides qué hacer ahora."
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

