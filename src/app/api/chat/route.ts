import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getGeminiService } from '@/lib/gemini';
import { SceneParser } from '@/lib/sceneParser';
import { GameWorld } from '@/types/game';

// Función para generar tarjetas de cambios del mundo
function generateWorldChangeCards(oldWorld: GameWorld, updatedWorld: Partial<GameWorld>, changes: any): Array<{content: string, metadata: any}> {
  const changeCards: Array<{content: string, metadata: any}> = [];

  // Crear tarjetas para nuevos personajes
  if (changes.newCharacters && changes.newCharacters.length > 0) {
    for (const char of changes.newCharacters) {
      const cardContent = `**🎭 Nuevo Personaje Aparece**\n\n**${char.name || char.id}**\n\n${char.description || 'Un nuevo personaje ha aparecido en la historia.'}\n\n**Estado:** ${char.status || 'Desconocido'}\n**Rasgos:** ${char.traits ? char.traits.join(', ') : 'Aún por descubrir'}`;
      
      changeCards.push({
        content: cardContent,
        metadata: {
          type: 'character_new',
          elementType: 'character',
          elementId: char.id,
          elementName: char.name || char.id,
          icon: '🎭',
          color: 'blue'
        }
      });
    }
  }

  // Crear tarjetas para personajes editados
  if (changes.editedCharacters && changes.editedCharacters.length > 0) {
    for (const char of changes.editedCharacters) {
      const oldChar = oldWorld.characters.find(c => c.id === char.id);
      const newChar = updatedWorld.characters?.find(c => c.id === char.id);
      
      if (oldChar && newChar) {
        let changeDetails = [];
        
        if (oldChar.status !== newChar.status) {
          changeDetails.push(`**Estado:** ${oldChar.status} → ${newChar.status}`);
        }
        if (oldChar.description !== newChar.description) {
          changeDetails.push(`**Descripción:** Actualizada`);
        }
        
        if (changeDetails.length > 0) {
          const cardContent = `**⚡ Personaje Actualizado**\n\n**${oldChar.name}**\n\n${changeDetails.join('\n')}\n\n*Los eventos han marcado a este personaje de manera permanente.*`;
          
          changeCards.push({
            content: cardContent,
            metadata: {
              type: 'character_updated',
              elementType: 'character',
              elementId: char.id,
              elementName: oldChar.name,
              icon: '⚡',
              color: 'amber'
            }
          });
        }
      }
    }
  }

  // Crear tarjetas para nuevos objetos
  if (changes.newObjects && changes.newObjects.length > 0) {
    for (const obj of changes.newObjects) {
      const cardContent = `**📦 Nuevo Objeto Descubierto**\n\n**${obj.name || obj.id}**\n\n${obj.description || 'Un nuevo objeto ha aparecido.'}\n\n**Ubicación:** ${obj.location || 'Desconocida'}\n**Propietario:** ${obj.owner || 'Sin dueño'}`;
      
      changeCards.push({
        content: cardContent,
        metadata: {
          type: 'object_new',
          elementType: 'object',
          elementId: obj.id,
          elementName: obj.name || obj.id,
          icon: '📦',
          color: 'green'
        }
      });
    }
  }

  // Crear tarjetas para objetos editados
  if (changes.editedObjects && changes.editedObjects.length > 0) {
    for (const obj of changes.editedObjects) {
      const oldObj = oldWorld.objects.find(o => o.id === obj.id);
      const newObj = updatedWorld.objects?.find(o => o.id === obj.id);
      
      if (oldObj && newObj) {
        let changeDetails = [];
        
        if (oldObj.location !== newObj.location) {
          changeDetails.push(`**Ubicación:** ${oldObj.location || 'Desconocida'} → ${newObj.location || 'Desconocida'}`);
        }
        if (oldObj.owner !== newObj.owner) {
          changeDetails.push(`**Propietario:** ${oldObj.owner || 'Sin dueño'} → ${newObj.owner || 'Sin dueño'}`);
        }
        if (oldObj.properties?.status !== newObj.properties?.status) {
          changeDetails.push(`**Estado:** ${oldObj.properties?.status || 'Funcional'} → ${newObj.properties?.status || 'Funcional'}`);
        }
        
        if (changeDetails.length > 0) {
          const cardContent = `**🔄 Objeto Modificado**\n\n**${oldObj.name}**\n\n${changeDetails.join('\n')}\n\n*Este objeto ha experimentado cambios debido a los eventos recientes.*`;
          
          changeCards.push({
            content: cardContent,
            metadata: {
              type: 'object_updated',
              elementType: 'object',
              elementId: obj.id,
              elementName: oldObj.name,
              icon: '🔄',
              color: 'purple'
            }
          });
        }
      }
    }
  }

  // Crear tarjetas para nuevas ubicaciones
  if (changes.newLocations && changes.newLocations.length > 0) {
    for (const loc of changes.newLocations) {
      const cardContent = `**🏗️ Nueva Ubicación Disponible**\n\n**${loc.name || loc.id}**\n\n${loc.description || 'Una nueva ubicación ha sido descubierta.'}\n\n**Conexiones:** ${loc.connections ? loc.connections.join(', ') : 'Ninguna conocida'}`;
      
      changeCards.push({
        content: cardContent,
        metadata: {
          type: 'location_new',
          elementType: 'location',
          elementId: loc.id,
          elementName: loc.name || loc.id,
          icon: '🏗️',
          color: 'orange'
        }
      });
    }
  }

  // Crear tarjetas para ubicaciones editadas
  if (changes.editedLocations && changes.editedLocations.length > 0) {
    for (const loc of changes.editedLocations) {
      const oldLoc = oldWorld.locations.find(l => l.id === loc.id);
      const newLoc = updatedWorld.locations?.find(l => l.id === loc.id);
      
      if (oldLoc && newLoc) {
        let changeDetails = [];
        
        if (JSON.stringify(oldLoc.connections) !== JSON.stringify(newLoc.connections)) {
          changeDetails.push(`**Conexiones:** ${oldLoc.connections?.join(', ') || 'Ninguna'} → ${newLoc.connections?.join(', ') || 'Ninguna'}`);
        }
        if (oldLoc.description !== newLoc.description) {
          changeDetails.push(`**Descripción:** Actualizada`);
        }
        
        if (changeDetails.length > 0) {
          const cardContent = `**🚪 Ubicación Alterada**\n\n**${oldLoc.name}**\n\n${changeDetails.join('\n')}\n\n*Los eventos han transformado este lugar de manera significativa.*`;
          
          changeCards.push({
            content: cardContent,
            metadata: {
              type: 'location_updated',
              elementType: 'location',
              elementId: loc.id,
              elementName: oldLoc.name,
              icon: '🚪',
              color: 'teal'
            }
          });
        }
      }
    }
  }

  return changeCards;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message, action, scenarioId } = body;

    if (action === 'create_session') {
      if (!scenarioId) {
        return NextResponse.json({ error: 'scenarioId es requerido' }, { status: 400 });
      }
      
      const db = getDatabase();
      const newSessionId = await db.createGameSession(scenarioId);
      
      // Obtener el escenario
      const scenarios = await db.getScenarios();
      const scenario = scenarios.find(s => s.id === scenarioId);
      
      if (!scenario) {
        return NextResponse.json({ error: 'Escenario no encontrado' }, { status: 404 });
      }

      // Generar estado inicial del mundo
      const gemini = getGeminiService();
      const initialWorld = await gemini.generateInitialWorldState(scenario);
      
      // Actualizar el mundo en la base de datos
      await db.updateGameWorld(newSessionId, initialWorld);
      
      // Crear entrada inicial del sistema con la narrativa generada
      const initialNarrative = initialWorld.currentState?.initialNarrative || 
        `Has comenzado: ${scenario.title}. ${scenario.description}`;
      
      await db.addStoryEntry(newSessionId, 1, 'system', initialNarrative);

      return NextResponse.json({ 
        sessionId: newSessionId,
        scenario: scenario,
        initialNarrative: initialNarrative,
        message: 'Sesión creada exitosamente',
        showNarrativeImmediately: true
      });
    }

    if (action === 'send_message') {
      if (!sessionId || !message) {
        return NextResponse.json({ error: 'sessionId y message son requeridos' }, { status: 400 });
      }
      
      const db = getDatabase();
      const gemini = getGeminiService();

      // Obtener sesión actual
      const session = await db.getGameSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
      }

      // Obtener escenario
      const scenarios = await db.getScenarios();
      const scenario = scenarios.find(s => s.id === session.scenarioId);
      if (!scenario) {
        return NextResponse.json({ error: 'Escenario no encontrado' }, { status: 404 });
      }

      // Obtener estado del mundo y historia
      const world = await db.getGameWorld(sessionId);
      const storyHistory = await db.getStoryEntries(sessionId);

      if (!world) {
        return NextResponse.json({ error: 'Estado del mundo no encontrado' }, { status: 404 });
      }

      // Guardar mensaje del usuario
      await db.addStoryEntry(sessionId, session.currentDay, 'user', message);

      // Generar respuesta con Gemini
      const aiResponse = await gemini.generateStoryResponse(
        scenario,
        world,
        storyHistory,
        message,
        session.currentDay
      );

      // Procesar elementos visuales de la escena
      let sceneMetadata = {};
      try {
        console.log('🎬 AI Response sceneElements:', aiResponse.sceneElements);
        if (aiResponse.sceneElements) {
          // Obtener datos del mundo actualizados para el procesamiento
          const currentWorld = await db.getGameWorld(sessionId);
          if (currentWorld) {
            // Obtener imágenes de la biblioteca para enriquecer los datos del mundo
            const charactersLibrary = await db.getCharactersFromLibrary(undefined, 1000);
            const objectsLibrary = await db.getObjectsFromLibrary(undefined, 1000);
            const locationsLibrary = await db.getLocationsFromLibrary(undefined, 1000);

            // Enriquecer elementos del mundo con imágenes
            const worldDataWithImages = {
              characters: (currentWorld.characters || []).map(character => {
                const libraryChar = charactersLibrary.find(c => 
                  c.name.toLowerCase() === character.name.toLowerCase()
                );
                return {
                  ...character,
                  imageBase64: libraryChar?.imageBase64
                };
              }),
              objects: (currentWorld.objects || []).map(object => {
                const libraryObj = objectsLibrary.find(o => 
                  o.name.toLowerCase() === object.name.toLowerCase()
                );
                return {
                  ...object,
                  imageBase64: libraryObj?.imageBase64
                };
              }),
              locations: (currentWorld.locations || []).map(location => {
                const libraryLoc = locationsLibrary.find(l => 
                  l.name.toLowerCase() === location.name.toLowerCase()
                );
                return {
                  ...location,
                  imageBase64: libraryLoc?.imageBase64
                };
              })
            };

            // Procesar elementos de la escena
            const processedScene = await SceneParser.processSceneElements(
              aiResponse.sceneElements,
              worldDataWithImages
            );

            sceneMetadata = SceneParser.generateSceneMetadata(processedScene);
            console.log('🎬 Generated sceneMetadata:', sceneMetadata);
          }
        }
      } catch (error) {
        console.error('Error procesando elementos visuales:', error);
      }

      // Guardar respuesta de la IA con metadatos visuales
      console.log('🎬 About to save sceneMetadata:', sceneMetadata);
      await db.addStoryEntry(
        sessionId, 
        session.currentDay, 
        'ai', 
        aiResponse.response,
        sceneMetadata
      );

      // Actualizar estado del mundo
      if (Object.keys(aiResponse.updatedWorld).length > 0) {
        await db.updateGameWorld(sessionId, aiResponse.updatedWorld);
      }

      // Actualizar tiempo del juego si la IA especificó cuánto tiempo pasó
      if (aiResponse.minutesToAdd && aiResponse.minutesToAdd > 0) {
        await db.updateGameTime(sessionId, aiResponse.minutesToAdd);
      }

      // Obtener sesión actualizada después de actualizar el tiempo
      const updatedSession = await db.getGameSession(sessionId);
      if (!updatedSession) {
        return NextResponse.json({ error: 'Error obteniendo sesión actualizada' }, { status: 500 });
      }

      // Verificar si hubo cambios significativos en el mundo
      let worldChanges = null;
      try {
        const responseText = JSON.stringify(aiResponse);
        if (responseText.includes('"changes"') && responseText.includes('"summary"')) {
          const parsedResponse = JSON.parse(responseText);
          worldChanges = parsedResponse.changes;
        }
      } catch (error) {
        // No es crítico si no podemos parsear los cambios
      }

      // Generar y guardar tarjetas de cambios del mundo
      if (worldChanges) {
        const changeCards = generateWorldChangeCards(world, aiResponse.updatedWorld, worldChanges);
        for (const card of changeCards) {
          await db.addStoryEntry(sessionId, updatedSession.currentDay, 'world_change', card.content, card.metadata);
        }
      }

      // Avanzar día si es necesario
      let newDay = updatedSession.currentDay;
      if (aiResponse.shouldAdvanceDay && updatedSession.currentDay < scenario.maxDays) {
        newDay = updatedSession.currentDay + 1;
        await db.updateSessionDay(sessionId, newDay);
      }

      // Verificar si el juego terminó
      if (aiResponse.gameEnded || newDay >= scenario.maxDays) {
        await db.completeSession(sessionId);
      }

      // Obtener información temporal final para la respuesta
      const finalTimeInfo = await db.getCurrentGameTime(sessionId);
      
      return NextResponse.json({
        response: aiResponse.response,
        currentDay: newDay,
        maxDays: scenario.maxDays,
        gameEnded: aiResponse.gameEnded || newDay >= scenario.maxDays,
        shouldAdvanceDay: aiResponse.shouldAdvanceDay,
        worldChanges: worldChanges,
        narrativeHooks: aiResponse.narrativeHooks || [],
        availableElements: aiResponse.availableElements || {
          people: [],
          objects: [],
          locations: [],
          conditions: []
        },
        timeInfo: finalTimeInfo,
        minutesElapsed: aiResponse.minutesToAdd || 0
      });
    }

    if (action === 'get_history') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
      }
      
      const db = getDatabase();
      const session = await db.getGameSession(sessionId);
      const storyHistory = await db.getStoryEntries(sessionId);
      
      if (!session) {
        return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
      }

      const scenarios = await db.getScenarios();
      const scenario = scenarios.find(s => s.id === session.scenarioId);

      return NextResponse.json({
        session,
        scenario,
        history: storyHistory
      });
    }

    if (action === 'get_world_data') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
      }
      
      const db = getDatabase();
      const world = await db.getGameWorld(sessionId);
      
      if (!world) {
        return NextResponse.json({ error: 'Mundo no encontrado' }, { status: 404 });
      }

      // Obtener imágenes de la biblioteca para enriquecer los datos del mundo
      const charactersLibrary = await db.getCharactersFromLibrary(undefined, 1000);
      const objectsLibrary = await db.getObjectsFromLibrary(undefined, 1000);
      const locationsLibrary = await db.getLocationsFromLibrary(undefined, 1000);

      // Enriquecer personajes con imágenes
      const enrichedCharacters = (world.characters || []).map(character => {
        const libraryChar = charactersLibrary.find(c => 
          c.name.toLowerCase() === character.name.toLowerCase()
        );
        return {
          ...character,
          imageBase64: libraryChar?.imageBase64
        };
      });

      // Enriquecer objetos con imágenes
      const enrichedObjects = (world.objects || []).map(object => {
        const libraryObj = objectsLibrary.find(o => 
          o.name.toLowerCase() === object.name.toLowerCase()
        );
        return {
          ...object,
          imageBase64: libraryObj?.imageBase64
        };
      });

      // Enriquecer ubicaciones con imágenes
      const enrichedLocations = (world.locations || []).map(location => {
        const libraryLoc = locationsLibrary.find(l => 
          l.name.toLowerCase() === location.name.toLowerCase()
        );
        return {
          ...location,
          imageBase64: libraryLoc?.imageBase64
        };
      });

      return NextResponse.json({
        characters: enrichedCharacters,
        objects: enrichedObjects,
        locations: enrichedLocations,
        rules: world.rules || [],
        currentState: world.currentState || {}
      });
    }

    if (action === 'regenerate_images') {
      try {
        const db = getDatabase();
        const { ImageGenerator } = await import('@/lib/imageGenerator');
        
        let regeneratedCount = 0;
        
        // Regenerar imágenes para personajes sin imagen
        const characters = await db.getCharactersFromLibrary(undefined, 1000);
        for (const char of characters) {
          if (!char.imageBase64) {
            try {
              const generatedImage = await ImageGenerator.generateCharacterMockup({
                name: char.name
              });
              await db.saveCharacterToLibrary({
                ...char,
                imageBase64: generatedImage.base64
              });
              regeneratedCount++;
            } catch (error) {
              console.error(`Error regenerando imagen para personaje ${char.name}:`, error);
            }
          }
        }
        
        // Regenerar imágenes para objetos sin imagen
        const objects = await db.getObjectsFromLibrary(undefined, 1000);
        for (const obj of objects) {
          if (!obj.imageBase64) {
            try {
              const generatedImage = await ImageGenerator.generateObjectMockup({
                name: obj.name
              });
              await db.saveObjectToLibrary({
                ...obj,
                imageBase64: generatedImage.base64
              });
              regeneratedCount++;
            } catch (error) {
              console.error(`Error regenerando imagen para objeto ${obj.name}:`, error);
            }
          }
        }
        
        // Regenerar imágenes para ubicaciones sin imagen
        const locations = await db.getLocationsFromLibrary(undefined, 1000);
        for (const loc of locations) {
          if (!loc.imageBase64) {
            try {
              const generatedImage = await ImageGenerator.generateLocationMockup({
                name: loc.name
              });
              await db.saveLocationToLibrary({
                ...loc,
                imageBase64: generatedImage.base64
              });
              regeneratedCount++;
            } catch (error) {
              console.error(`Error regenerando imagen para ubicación ${loc.name}:`, error);
            }
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          regeneratedCount,
          message: `Se regeneraron ${regeneratedCount} imágenes` 
        });
      } catch (error) {
        console.error('Error regenerando imágenes:', error);
        return NextResponse.json({ 
          error: 'Error regenerando imágenes' 
        }, { status: 500 });
      }
    }

    if (action === 'get_financial_data') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
      }
      
      const db = getDatabase();
      const financialSummary = await db.getFinancialSummary(sessionId);
      
      return NextResponse.json(financialSummary);
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en API de chat:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDatabase();
    const scenarios = await db.getScenarios();
    
    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Error obteniendo escenarios:', error);
    return NextResponse.json({ 
      error: 'Error obteniendo escenarios' 
    }, { status: 500 });
  }
}
