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
    narrativeHooks?: string[];
    availableElements?: {
      people: string[];
      objects: string[];
      locations: string[];
      conditions: string[];
    };
    minutesToAdd?: number;
  }> {
    
    const contextPrompt = await this.buildContextPrompt(scenario, world, storyHistory, currentDay, storyHistory[0]?.sessionId);
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
8. SIEMPRE termina con 2-3 GANCHOS NARRATIVOS específicos que guíen la dirección de la historia
9. Presenta elementos concretos y tangibles del mundo que el jugador puede ver, tocar y usar
10. Incluye detalles del mundo que enriquezcan la experiencia y LIMITEN las posibilidades a lo establecido
11. BLOQUEA acciones imposibles con respuestas SARCÁSTICAS y REALISTAS que obliguen al jugador a pensar
12. Si es apropiado, avanza la historia al siguiente día
13. PUEDES CREAR nuevos elementos del mundo SOLO si aparecen y se explican en tu narrativa
14. PUEDES EDITAR elementos existentes SOLO si los cambios están justificados en la narrativa
15. CADA cambio del mundo debe estar EXPLÍCITAMENTE mencionado en tu respuesta narrativa
16. MANTÉN CONSISTENCIA del estado de objetos (roto, perdido, funcional, etc.)
17. SI un objeto fue perdido/robado/destruido anteriormente, NO puede reaparecer
18. USA EXCLUSIVAMENTE la información proporcionada de la base de datos
19. NO INVENTES estados de objetos - usa solo los que aparecen en las listas
20. LA BASE DE DATOS ES LA ÚNICA FUENTE DE VERDAD - no asumas nada más
21. RESTRINGE las opciones del jugador EXCLUSIVAMENTE a lo que existe en el mundo narrativo
22. Sé un NARRADOR RESTRICTIVO que canaliza la creatividad del jugador hacia elementos específicos del mundo
23. NUNCA permitas al jugador hacer algo que no tenga fundamento en el mundo establecido
24. USA SARCASMO para hacer ver lo absurdo de acciones imposibles
25. OBLIGA al jugador a pensar en los PASOS PREVIOS necesarios con preguntas específicas
26. PRESENTA los obstáculos REALISTAS que debe superar primero
27. PARA EL ESCENARIO MILLONARIO: REGISTRA TODAS las transacciones financieras (ingresos y gastos) que ocurran en la narrativa
28. CADA ganancia, venta, compra, gasto o inversión debe aparecer en financialTransactions
29. Los montos deben ser REALISTAS y ESPECÍFICOS, no aproximados
30. Las transacciones deben tener descripciones CLARAS y categorías apropiadas
31. TIEMPO: CADA acción consume tiempo realista. Calcula minutesToAdd según la acción
32. Acciones simples (mirar, hablar): 1-5 minutos
33. Acciones complejas (buscar, negociar): 10-30 minutos
34. Actividades largas (trabajar, viajar): 60-240 minutos
35. El tiempo es CRUCIAL para mantener coherencia narrativa
36. SIEMPRE indica cuánto tiempo pasó en la narrativa

FORMATO DE RESPUESTA:
Responde SOLO con un JSON válido que contenga:
{
  "response": "Tu respuesta narrativa que describe lo que sucede como resultado de la acción del jugador. TODA modificación al mundo (personajes, objetos, ubicaciones) debe estar EXPLÍCITAMENTE mencionada y justificada en esta narrativa. SIEMPRE termina con ganchos narrativos específicos (sin saltos de línea, usa espacios)",
  "narrativeHooks": [
    "Elemento específico del mundo que llama la atención (ej: 'Una puerta de metal oxidado está entreabierta')",
    "Segundo elemento concreto disponible (ej: 'El comerciante te mira con desconfianza')",
    "Tercer elemento del entorno actual (ej: 'Tu herida en el brazo sigue sangrando')"
  ],
  "availableElements": {
    "people": ["Lista de personajes presentes que el jugador puede contactar"],
    "objects": ["Lista de objetos visibles que el jugador puede tomar o usar"],
    "locations": ["Lista de lugares accesibles desde la ubicación actual"],
    "conditions": ["Estado actual del jugador que afecta sus opciones"]
  },
  "worldUpdates": {
    "characters": [
      {
        "id": "char_id",
        "name": "Nombre del personaje",
        "description": "Descripción",
        "traits": ["trait1", "trait2"],
        "relationships": {"personaje": "relacion"},
        "status": "alive|dead|unknown"
      }
    ],
    "objects": [
      {
        "id": "obj_id", 
        "name": "Nombre del objeto",
        "description": "Descripción",
        "properties": {"status": "funcional|roto|perdido", "condition": "condición"},
        "location": "ubicación",
        "owner": "propietario"
      }
    ],
    "locations": [
      {
        "id": "loc_id",
        "name": "Nombre de ubicación", 
        "description": "Descripción",
        "connections": ["lugar1", "lugar2"],
        "properties": {"atmosphere": "ambiente"}
      }
    ],
    "rules": [array de reglas del mundo],
    "currentState": {objeto con el estado actual del juego actualizado}
  },
  "financialTransactions": [
    {
      "type": "income|expense",
      "amount": número_positivo,
      "description": "Descripción clara de la transacción",
      "category": "ventas|compras|servicios|inversiones|gastos_operativos|otros"
    }
  ],
  "shouldAdvanceDay": boolean,
  "gameEnded": boolean,
  "endReason": "razón del fin del juego si aplica",
  "minutesToAdd": number_positivo_de_minutos_que_pasa_la_accion,
  "changes": {
    "newCharacters": [personajes completamente nuevos creados en esta respuesta - DEBEN estar mencionados en la narrativa],
    "editedCharacters": [personajes existentes que fueron modificados - cambios DEBEN estar justificados en la narrativa],
    "newObjects": [objetos completamente nuevos creados en esta respuesta - DEBEN aparecer explicados en la narrativa],
    "editedObjects": [objetos existentes que fueron modificados - cambios DEBEN estar descritos en la narrativa],
    "newLocations": [ubicaciones completamente nuevas creadas en esta respuesta - DEBEN estar mencionadas en la narrativa],
    "editedLocations": [ubicaciones existentes que fueron modificadas - cambios DEBEN estar explicados en la narrativa],
    "summary": "Breve resumen de los cambios realizados al mundo, todos ellos mencionados explícitamente en la narrativa"
  }
}

IMPORTANTE - REGLAS DE JSON VÁLIDO: 
- El JSON debe ser válido y parseable
- NO uses saltos de línea dentro de strings
- NO uses comillas dobles dentro de strings (usa comillas simples)
- NO incluyas caracteres especiales o de control
- Asegúrate de cerrar todas las llaves y corchetes
- NO incluyas texto antes o después del JSON
- Responde ÚNICAMENTE con el JSON, sin explicaciones adicionales
- NUNCA uses la palabra "undefined" como valor - usa null o cadena vacía ""
- TODOS los campos deben tener valores válidos, no undefined
- Si no conoces un valor, usa: id: "unknown_id", name: "Desconocido", description: "Sin descripción"

REGLA ABSOLUTA DE CONSISTENCIA NARRATIVA:
- PROHIBIDO hacer cambios en worldUpdates que no estén mencionados en la narrativa
- PROHIBIDO crear/editar/eliminar elementos sin explicación narrativa
- CADA cambio en el mundo debe tener su correspondiente mención en la respuesta
- SI NO APARECE EN LA NARRATIVA, NO PUEDE CAMBIAR EN EL MUNDO
- La narrativa es la ÚNICA fuente válida de cambios al mundo del juego`;

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
        
        // Intentar limpiar más agresivamente el JSON
        try {
          const cleanedJson = jsonText
            .replace(/"ID":/g, '"id":')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/undefined/g, 'null')
            .replace(/"[^"]*undefined[^"]*":/g, '"unknown":');
          
          parsed = JSON.parse(cleanedJson);
          console.log('JSON limpiado exitosamente');
        } catch (secondParseError) {
          console.error('Segundo intento de parseo falló:', secondParseError);
          
          // Intento de rescate: extraer solo la respuesta narrativa si es posible
          const responseMatch = response.match(/"response":\s*"([^"]*(?:\\"[^"]*)*[^"]*)"/);
          const fallbackResponse = responseMatch ? responseMatch[1].replace(/\\"/g, '"') : 'La acción se ejecuta pero el resultado no es claro debido a un error técnico.';
          
          return {
            response: fallbackResponse,
            updatedWorld: world, // Mantener estado actual
            shouldAdvanceDay: false,
            gameEnded: false,
            narrativeHooks: [],
            availableElements: {
              people: [],
              objects: [],
              locations: [],
              conditions: []
            },
            minutesToAdd: 5
          };
        }
      }
      
      // Procesar cambios en el mundo y guardar nuevo contenido en la biblioteca
      if (parsed.changes) {
        try {
          const db = getDatabase();
          
          // Guardar personajes completamente nuevos en la biblioteca
          if (parsed.changes.newCharacters) {
            for (const char of parsed.changes.newCharacters) {
              try {
                // Auto-completar datos faltantes en lugar de omitir
                const completedChar = {
                  name: char.name || char.id || 'Personaje Sin Nombre',
                  description: char.description || `Personaje que apareció en la historia`,
                  traits: char.traits || ['misterioso'],
                  backstory: char.backstory || '',
                  personality: char.motivation || char.personality || '',
                  category: 'ai_generated'
                };
                
                await db.saveCharacterToLibrary(completedChar);
              } catch (charError) {
                console.error('Error guardando personaje nuevo:', charError);
              }
            }
          }
          
          // Guardar objetos completamente nuevos en la biblioteca
          if (parsed.changes.newObjects) {
            for (const obj of parsed.changes.newObjects) {
              try {
                // Auto-completar datos faltantes en lugar de omitir
                const completedObj = {
                  name: obj.name || obj.id || 'Objeto Sin Nombre',
                  description: obj.description || `Objeto que apareció en la historia`,
                  properties: obj.properties || {},
                  category: 'ai_generated',
                  rarity: obj.properties?.rarity || obj.rarity || 'common'
                };
                
                await db.saveObjectToLibrary(completedObj);
              } catch (objError) {
                console.error('Error guardando objeto nuevo:', objError);
              }
            }
          }
          
          // Guardar ubicaciones completamente nuevas en la biblioteca
          if (parsed.changes.newLocations) {
            for (const loc of parsed.changes.newLocations) {
              try {
                // Auto-completar datos faltantes en lugar de omitir
                const completedLoc = {
                  name: loc.name || loc.id || 'Ubicación Sin Nombre',
                  description: loc.description || `Ubicación que apareció en la historia`,
                  type: 'ai_generated',
                  atmosphere: loc.properties?.atmosphere || loc.atmosphere || '',
                  connectionsInfo: loc.connections?.join(', ') || ''
                };
                
                await db.saveLocationToLibrary(completedLoc);
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
      
      // Procesar transacciones financieras si existen
      if (parsed.financialTransactions && Array.isArray(parsed.financialTransactions) && storyHistory[0]?.sessionId) {
        try {
          const db = getDatabase();
          for (const transaction of parsed.financialTransactions) {
            if (transaction.type && transaction.amount && transaction.description) {
              await db.addFinancialTransaction(
                storyHistory[0].sessionId,
                transaction.type,
                transaction.amount,
                transaction.description,
                transaction.category || 'otros',
                currentDay
              );
            }
          }
        } catch (error) {
          console.error('Error procesando transacciones financieras:', error);
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
        gameEnded: parsed.gameEnded || false,
        narrativeHooks: parsed.narrativeHooks || [],
        availableElements: parsed.availableElements || {
          people: [],
          objects: [],
          locations: [],
          conditions: []
        },
        minutesToAdd: parsed.minutesToAdd || 5 // Default a 5 minutos si no se especifica
      };

    } catch (error) {
      console.error('Error generando respuesta con Gemini:', error);
      
      // Respuesta de fallback
      return {
        response: `Hubo un problema procesando tu acción. El mundo permanece en su estado actual.`,
        updatedWorld: {},
        shouldAdvanceDay: false,
        gameEnded: false,
        narrativeHooks: [],
        availableElements: {
          people: [],
          objects: [],
          locations: [],
          conditions: []
        },
        minutesToAdd: 5
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
      // Corregir valores undefined literales
      .replace(/"undefined"/g, '""')
      .replace(/:\s*undefined/g, ': null')
      // Corregir campos con nombres undefined
      .replace(/"undefined":/g, '"unknown":')
      // Escapar comillas dentro de strings si es necesario
      .replace(/(?<!\\)"/g, '"')
      .trim();
  }

  private async buildContextPrompt(
    scenario: GameScenario,
    world: GameWorld,
    storyHistory: StoryEntry[],
    currentDay: number,
    sessionId?: string
  ): Promise<string> {
    const recentHistory = storyHistory.slice(-20); // Últimas 20 entradas para contexto
    
    // Obtener información temporal detallada
    let timeInfo = '';
    if (sessionId) {
      try {
        const db = getDatabase();
        const currentTime = await db.getCurrentGameTime(sessionId);
        if (currentTime) {
          timeInfo = `

TIEMPO ACTUAL DEL JUEGO:
- Día: ${currentTime.day}/${scenario.maxDays}
- Hora: ${currentTime.timeString}
- Tiempo total transcurrido: ${Math.floor(currentTime.totalMinutesElapsed / 60)}h ${currentTime.totalMinutesElapsed % 60}m
- IMPORTANTE: Cada acción consume tiempo realista que se acumula`;
        }
      } catch (error) {
        console.error('Error obteniendo información temporal:', error);
      }
    }
    
    let prompt = `${scenario.initialPrompt}

DÍA ACTUAL: ${currentDay}/${scenario.maxDays}${timeInfo}

ESTADO DEL MUNDO (FUENTE DE VERDAD ÚNICA - USA SOLO ESTA INFORMACIÓN):
`;

    if (world.characters && world.characters.length > 0) {
      prompt += `\nPERSONAJES ACTUALES (estado exacto desde BD - NO cambiar sin justificación):
${world.characters.map(char => {
        const status = char.status || 'desconocido';
        const relationships = char.relationships && Object.keys(char.relationships).length > 0 ? 
          Object.entries(char.relationships).map(([key, value]) => `${key}: ${value}`).join(', ') : 'sin relaciones';
        return `- ID: ${char.id} | ${char.name}: ${char.description} [Estado: ${status}] [Relaciones: ${relationships}]${char.traits ? ` [Rasgos: ${char.traits.join(', ')}]` : ''}`;
      }).join('\n')}`;
    }

    if (world.objects && world.objects.length > 0) {
      prompt += `\nOBJETOS ACTUALES (estado exacto desde BD - NO inventar estados):
${world.objects.map(obj => {
        const status = obj.properties?.status || 'funcional';
        const condition = obj.properties?.condition || '';
        const location = obj.location || 'ubicación desconocida';
        const owner = obj.owner || 'sin dueño';
        const propertiesInfo = obj.properties && Object.keys(obj.properties).length > 0 ? 
          ` [Propiedades: ${Object.entries(obj.properties).map(([k,v]) => `${k}:${v}`).join(', ')}]` : '';
        return `- ID: ${obj.id} | ${obj.name}: ${obj.description} [Estado: ${status}] [Ubicación: ${location}] [Dueño: ${owner}]${condition ? ` (${condition})` : ''}${propertiesInfo}`;
      }).join('\n')}`;
    }

    if (world.locations && world.locations.length > 0) {
      prompt += `\nUBICACIONES ACTUALES (puedes editarlas o crear nuevas):
${world.locations.map(loc => 
  `- ID: ${loc.id} | ${loc.name}: ${loc.description}${loc.connections ? ` [Conecta con: ${loc.connections.join(', ')}]` : ''}`
).join('\n')}`;
    }

    if (world.rules && world.rules.length > 0) {
      prompt += `\nREGLAS ACTIVAS DEL MUNDO:
${world.rules
  .filter(rule => rule.isActive)
  .map(rule => `- ${rule.description}`)
  .join('\n')}`;
    }

    if (world.currentState && Object.keys(world.currentState).length > 0) {
      prompt += `\nESTADO ACTUAL DEL JUGADOR:
${Object.entries(world.currentState)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}`;
    }

    // Agregar información financiera para el escenario millonario
    if (scenario.id === 'millionaire-challenge' && sessionId) {
      try {
        const db = getDatabase();
        const financialSummary = await db.getFinancialSummary(sessionId);
        
        prompt += `\nESTADO FINANCIERO ACTUAL (ESCENARIO MILLONARIO):
- Dinero actual: $${financialSummary.currentBalance.toFixed(2)}
- Ingresos totales: $${financialSummary.totalIncome.toFixed(2)}
- Gastos totales: $${financialSummary.totalExpenses.toFixed(2)}
- Ganancia neta: $${financialSummary.netChange.toFixed(2)}
- Objetivo: $1,000,000 (faltan $${(1000000 - financialSummary.currentBalance).toFixed(2)})`;

        if (financialSummary.transactions.length > 0) {
          const recentTransactions = financialSummary.transactions.slice(-5);
          prompt += `\nÚLTIMAS TRANSACCIONES FINANCIERAS:
${recentTransactions.map(t => 
  `- Día ${t.day}: ${t.type === 'income' ? '+' : '-'}$${t.amount} (${t.description}) - Balance: $${t.balanceAfter.toFixed(2)}`
).join('\n')}`;
        }
      } catch (error) {
        console.error('Error obteniendo datos financieros para el prompt:', error);
      }
    }

    // Agregar inventario explícito si existe - ESTA ES LA LISTA DEFINITIVA
    const playerInventory = world.objects ? world.objects.filter(obj => obj.owner === 'jugador' || obj.location === 'inventario') : [];
    if (playerInventory.length > 0) {
      prompt += `\nINVENTARIO DEL JUGADOR (OBJETOS DISPONIBLES REALES):
${playerInventory.map(obj => {
        const status = obj.properties?.status || 'funcional';
        const condition = obj.properties?.condition || '';
        return `- ${obj.name}: ${obj.description} [Estado: ${status}]${condition ? ` (${condition})` : ''}`;
      }).join('\n')}`;
    } else {
      prompt += `\nINVENTARIO DEL JUGADOR: Vacío (no posee objetos actualmente)`;
    }
    
    // Lista de objetos que NO tiene (para evitar que la IA los invente)
    const lostOrDestroyedObjects = world.objects ? world.objects.filter(obj => 
      obj.location === 'perdido' || obj.location === 'destruido' || 
      obj.properties?.status === 'perdido' || obj.properties?.status === 'destruido'
    ) : [];
    if (lostOrDestroyedObjects.length > 0) {
      prompt += `\nOBJETOS QUE EL JUGADOR NO TIENE (PERDIDOS/DESTRUIDOS):
${lostOrDestroyedObjects.map(obj => `- ${obj.name}: ${obj.location || obj.properties?.status || 'no disponible'}`).join('\n')}`;
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

CAPACIDADES DE EDICIÓN CON JUSTIFICACIÓN NARRATIVA:
- Para EDITAR un elemento existente: Mantén el mismo ID pero actualiza sus propiedades
- Para CREAR un elemento nuevo: Asigna un nuevo ID único (ej: "char_nuevo_001")
- REGLA CRÍTICA: TODO cambio debe estar mencionado en la narrativa
- Ejemplos de ediciones válidas con justificación:
  * Cambiar estado de un personaje: "Marcus grita de dolor cuando la bala le atraviesa el hombro" → estado: herido
  * Mover un objeto: "Recoges la llave de la mesa y la guardas en tu bolsillo" → ubicación: inventario
  * Crear nuevo personaje: "Un guardia de seguridad aparece corriendo por el pasillo" → nuevo personaje
  * Modificar ubicación: "La explosión derrumba la pared este, abriendo un nuevo pasaje" → nueva conexión
  * Eliminar objeto: "La computadora explota en mil pedazos, quedando completamente destruida" → eliminar objeto
- EJEMPLOS INCORRECTOS (sin justificación narrativa):
  * ❌ Cambiar estado de personaje sin mencionarlo en la narrativa
  * ❌ Aparecer objetos nuevos sin explicar de dónde salen
  * ❌ Cambiar ubicaciones sin describir el proceso
- Los elementos eliminados no deben aparecer en worldUpdates
- Siempre incluye TODOS los elementos actuales en worldUpdates, incluso los no modificados
- SI NO SE MENCIONA EN LA NARRATIVA, NO PUEDE CAMBIAR EN EL MUNDO

ESTILO NARRATIVO SARCÁSTICO Y REALISTA:
- REACTIVO pero RESTRICTIVO: Ejecuta acciones válidas, BLOQUEA las imposibles con SARCASMO
- NO digas: "¿Qué quieres hacer ahora? Puedes: A) Huir, B) Atacar, C) Negociar"
- SÍ usa sarcasmo para acciones absurdas: "¿En serio? ¿Esa es tu gran estrategia?"
- SÍ muestra consecuencias realistas: "Tu brazo izquierdo está fracturado. La sangre mancha tu camisa."
- SÍ presenta elementos específicos con tono: "La puerta de hierro está firmemente cerrada. ¿Sorpresa? No se abre mágicamente."
- SÍ cuestiona la lógica: "¿Con qué planeas hacer eso exactamente?"
- SIEMPRE termina describiendo elementos tangibles REALES que el jugador puede usar
- NUNCA permitas que el jugador haga algo imposible sin burlarte un poco de la idea
- USA humor negro y realismo para mantener la inmersión
- HAZLE VER al jugador cuando sus ideas no tienen sentido

VALIDACIÓN LÓGICA CON SARCASMO Y CONSISTENCIA DE OBJETOS:
- Jugador: "Uso mi pistola" → "¿Tu pistola? ¿Te refieres a la pistola imaginaria? Porque revisas todos tus bolsillos y no hay nada más que pelusas."
- Jugador: "Uso mi teléfono" (si está roto) → "¿Tu teléfono? ¿Te refieres al pedazo de plástico y vidrio roto que ya no funciona? Porque eso es lo que tienes."
- Jugador: "Llamo a la policía" (sin teléfono) → "¿Con qué teléfono? ¿Con telepatía? Ya no tienes teléfono, ¿recuerdas? Se lo quedaron los niños después de que perdieras la apuesta."
- Jugador: "Saco dinero del bolsillo" (sin dinero) → "¿Qué dinero? Tus bolsillos están más vacíos que tus estrategias. No tienes ni un centavo."
- Jugador: "Como mi pan" (si se perdió) → "¿Qué pan? El panecillo rancio se deshizo en el suelo cuando te golpearon. Ya no tienes comida."
- Jugador: "Hackeo el sistema" → "Ah claro, simplemente 'hackeas'. ¿Con qué? ¿Con tus poderes telepáticos? No tienes computadora, no sabes programar, y la pantalla ni siquiera tiene teclado."
- Jugador: "Me conecto al wifi" → "Excelente idea. ¿Y la contraseña? ¿Vas a adivinarla? Tu teléfono muestra redes, pero todas están protegidas. ¿Cómo planeas exactamente obtener acceso?"
- Jugador: "Desbloqueo el celular" → "¿Con qué código? Este teléfono no es tuyo. ¿Tienes la contraseña? ¿Las huellas del dueño? ¿Un manual de hackeo? Porque tocar la pantalla esperando un milagro no funciona."
- Jugador: "Conduzco el auto" → "Fantástico. ¿Dónde están las llaves? ¿Sabes siquiera conducir? El auto está cerrado y no eres mago para que aparezcan llaves de la nada."
- Jugador: "Vuelo" → "Te concentras mucho, agitas los brazos... y sigues firmemente plantado en el suelo. Las leyes de la física no han cambiado por tu optimismo."

FÓRMULA PARA RESPUESTAS SARCÁSTICAS:
1. RECONOCE la acción con ironía ("Ah claro, simplemente...")
2. SEÑALA el problema específico ("¿Con qué?", "¿Dónde está...?", "¿Cómo planeas...?")
3. EXPLICA la realidad ("No tienes...", "No sabes...", "No funciona así...")
4. OBLIGA a pensar en los pasos previos ("Necesitas primero...", "Deberías obtener...")

EJEMPLOS ESPECÍFICOS SEGÚN EL ESCENARIO MOSTRADO:
- Wifi de cafetería: "¿La contraseña? ¿Vas a pedírsela al guardia de seguridad que te persigue? Las redes están protegidas."
- Hackear sin herramientas: "¿Con qué exactamente? ¿Con buenos deseos? No tienes laptop, software, ni conocimientos de ciberseguridad."
- Usar cosas ajenas: "¿Y cómo planeas autenticarte? ¿Con telepatía? Ese sistema no es tuyo."

TÉCNICAS PARA OBLIGAR AL JUGADOR A PENSAR EN PASOS PREVIOS:
1. PREGUNTA ESPECÍFICA: "¿Con qué herramientas?"
2. SEÑALA LO QUE FALTA: "Necesitas primero conseguir..."
3. EXPLICA LA REALIDAD: "Eso requiere tener acceso a..."
4. SUGIERE EL PRIMER PASO: "Deberías buscar una manera de obtener..."

EJEMPLOS DE BLOQUEO CON REDIRECCIÓN INTELIGENTE:
- "Hackeo la cuenta bancaria" → "¿Con qué dispositivo? ¿Qué software? ¿Tienes las credenciales? Primero necesitas una computadora, luego herramientas, luego conocimientos. ¿Por dónde planeas empezar?"
- "Desbloqueo este teléfono" → "¿Sabes el PIN? ¿Tienes la huella del dueño? ¿Conoces software de bypass? Porque tocar botones al azar solo activará el bloqueo de seguridad. Tal vez deberías encontrar otra forma de conseguir información."
- "Me conecto al wifi" → "¿Tienes la contraseña? ¿Vas a preguntarle a alguien? ¿Intentar adivinación? Estas redes están protegidas. Necesitas primero conseguir acceso legítimo de alguna manera."
- "Conduzco este auto" → "¿Dónde están las llaves? ¿Sabes conducir? ¿Vas a hot-wiring? Porque sin llaves esto es solo un gran pisapapeles de metal. Primero necesitas resolver el acceso."

REGLA FUNDAMENTAL: NO INVENTES que el jugador tiene algo. Si no está en su inventario/estado/historia, NO LO TIENE.

EJEMPLOS DE GANCHOS NARRATIVOS CORRECTOS:
- "En la mesa hay una carta sellada con cera roja. El sello muestra un símbolo que no reconoces."
- "Marcus te observa desde la esquina, su mano descansa sobre la empuñadura de su pistola."
- "Tu herida en el hombro palpita con cada movimiento. Necesitas atención médica pronto."
- "La radio crepita con estática, pero ocasionalmente se escuchan voces distorsionadas."
- "El pasillo se extiende hacia la izquierda, donde una luz tenue parpadea intermitentemente."

EJEMPLOS DE RESTRICCIONES NARRATIVAS CON SARCASMO:
- "Vuelo hacia el techo" → "Te concentras mucho, cierras los ojos, agitas los brazos... y después de este ridículo espectáculo, sigues con los pies firmemente en el suelo. Sorpresa: no eres Superman."
- "Me teletransporto" → "Cierras los ojos, piensas muy fuerte en otro lugar... abres los ojos y... ¡qué sorpresa! Sigues en el mismo sitio. La teletransportación sigue siendo ciencia ficción."
- "Me convierto en lobo" → "Gruñes, te pones en cuatro patas, intentas aullar... y solo consigues verte ridículo. Sigues siendo completamente humano, pero ahora con menos dignidad."
- "Creo una bomba de la nada" → "¿Con qué materiales exactamente? ¿Con el aire? No tienes explosivos, no sabes química, no tienes herramientas. ¿Vas a wishful thinking una bomba?"
- "Abro la puerta blindada con las manos" → "Te abalanzas sobre la puerta de acero reforzado de 10 cm de grosor. Resultado: tus manos duelen, la puerta sigue cerrada, y tu ego está magullado."
- "Respiro bajo el agua por 30 minutos" → "Contiendes la respiración... 30 segundos después sales desesperado por aire. Resulta que no eres un pez. ¿Quién lo hubiera imaginado?"

REGLA DE CONSISTENCIA NARRATIVA:
Cada respuesta debe hacer referencia a elementos específicos del mundo establecido y presentar nuevos elementos tangibles que mantengan la coherencia narrativa.

VALIDACIÓN DE CAMBIOS NARRATIVOS:
1. ANTES de cambiar algo en worldUpdates, debe estar mencionado en la narrativa
2. CADA nuevo personaje debe aparecer y ser descrito en la respuesta
3. CADA objeto movido/creado/destruido debe estar explicado narrativamente
4. CADA cambio de estado debe tener causa narrativa clara
5. NO aparezcan elementos "de la nada" sin contexto

EJEMPLOS DE CONSISTENCIA CORRECTA:
- Narrativa: "El comerciante saca una pistola de debajo del mostrador" → worldUpdates: nuevo objeto "pistola" en posesión del comerciante
- Narrativa: "Marcus se desploma herido tras recibir el disparo" → worldUpdates: Marcus cambia estado a "herido"
- Narrativa: "Encuentras una llave escondida bajo la maceta" → worldUpdates: nuevo objeto "llave" en inventario del jugador
- Narrativa: "La puerta se derrumba por la explosión" → worldUpdates: eliminar puerta, agregar "escombros"

EJEMPLOS DE INCONSISTENCIA (PROHIBIDOS):
- ❌ Aparece una pistola en worldUpdates sin mencionarla en la narrativa
- ❌ Un personaje cambia de estado sin que se explique por qué
- ❌ Objetos se mueven sin que el jugador o alguien lo haga
- ❌ Nuevos personajes en worldUpdates que no aparecen en la historia

REGLA ABSOLUTA: Si no está en la narrativa, no puede estar en worldUpdates.

CONSISTENCIA DE ESTADO DE OBJETOS - REGLAS CRÍTICAS:
1. TELÉFONO ROTO = NO FUNCIONA para llamadas, internet, etc.
2. SIN DINERO = NO puede comprar, sobornar, pagar
3. OBJETO PERDIDO = NO puede usarlo hasta que lo recupere
4. COMIDA CONSUMIDA/DESTRUIDA = NO puede comerla de nuevo
5. PERSONA MUERTA = NO puede hablar con ella
6. PUERTA CERRADA = NO puede pasar sin llave/fuerza

EJEMPLOS DE INCONSISTENCIAS PROHIBIDAS:
❌ Jugador usa teléfono roto como si funcionara
❌ Jugador gasta dinero que no tiene
❌ Aparece comida que se perdió anteriormente
❌ Objetos "se reparan solos" sin explicación
❌ Personajes "reviven" sin justificación narrativa

EJEMPLOS DE CONSISTENCIA CORRECTA:
✅ "Tu teléfono está roto, la pantalla agrietada no responde"
✅ "Buscas en tus bolsillos vacíos, no tienes dinero"
✅ "El pan ya no está, se deshizo en el suelo anteriormente"
✅ "Los niños se fueron con tu teléfono después de ganar la apuesta"

RESPONSABILIDAD DE LA IA:
- REVISAR el inventario actual antes de permitir uso de objetos
- RECORDAR el estado de todos los elementos del mundo
- BLOQUEAR acciones imposibles basadas en el estado actual
- MANTENER coherencia temporal de todos los elementos

SINCRONIZACIÓN BASE DE DATOS ↔ IA:
1. LA BD CONTIENE EL ESTADO REAL DEL MUNDO - es la fuente de verdad
2. LA IA RECIBE esta información y debe usarla EXACTAMENTE como está
3. LA IA GENERA cambios basados en acciones del jugador
4. ESTOS CAMBIOS se guardan en la BD para futuras referencias
5. NUNCA asumir estados que no estén en la BD

FLUJO DE INFORMACIÓN:
BD → PROMPT → IA → RESPUESTA → ACTUALIZACIÓN BD → NUEVO ESTADO

REGLAS DE SINCRONIZACIÓN:
- Si un objeto está marcado como "roto" en BD → IA debe tratarlo como roto
- Si un objeto está en "perdido" en BD → IA NO puede permitir su uso
- Si el jugador no tiene dinero en BD → IA NO puede permitir compras
- Todo estado nuevo debe justificarse narrativamente Y guardarse en BD`;

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
4. SIEMPRE termina con ganchos narrativos específicos que presenten elementos concretos del mundo
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
  "initialNarrative": "Una narrativa inmersiva de 200-300 palabras que establezca la escena, describa la situación actual, presente a personajes relevantes, mencione objetos importantes y termine con ganchos narrativos específicos que guíen sutilmente hacia elementos concretos del mundo que el jugador puede explorar.",
  "narrativeHooks": [
    "Primer elemento específico del mundo que llama la atención",
    "Segundo elemento concreto disponible para interactuar",
    "Tercer gancho narrativo que presenta oportunidades claras"
  ],
  "availableElements": {
    "people": ["Personajes presentes que el jugador puede contactar"],
    "objects": ["Objetos visibles que el jugador puede examinar o usar"],
    "locations": ["Lugares accesibles desde la posición inicial"],
    "conditions": ["Estado actual del jugador que afecta sus opciones"]
  }
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
              // Auto-completar datos faltantes en lugar de omitir
              const completedChar = {
                name: char.name || char.id || 'Personaje Sin Nombre',
                description: char.description || `Personaje del mundo inicial`,
                traits: char.traits || ['misterioso'],
                backstory: char.backstory || '',
                personality: char.motivation || char.personality || '',
                category: 'initial_generation'
              };
              
              await db.saveCharacterToLibrary(completedChar);
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
              // Auto-completar datos faltantes en lugar de omitir
              const completedObj = {
                name: obj.name || obj.id || 'Objeto Sin Nombre',
                description: obj.description || `Objeto del mundo inicial`,
                properties: obj.properties || {},
                category: 'initial_generation',
                rarity: obj.properties?.rarity || obj.rarity || 'common'
              };
              
              await db.saveObjectToLibrary(completedObj);
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
              // Auto-completar datos faltantes en lugar de omitir
              const completedLoc = {
                name: loc.name || loc.id || 'Ubicación Sin Nombre',
                description: loc.description || `Ubicación del mundo inicial`,
                type: 'initial_generation',
                atmosphere: loc.properties?.atmosphere || loc.atmosphere || '',
                connectionsInfo: loc.connections?.join(', ') || ''
              };
              
              await db.saveLocationToLibrary(completedLoc);
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

