import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getGeminiService } from '@/lib/gemini';

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

      // Guardar respuesta de la IA
      await db.addStoryEntry(sessionId, session.currentDay, 'ai', aiResponse.response);

      // Actualizar estado del mundo
      if (Object.keys(aiResponse.updatedWorld).length > 0) {
        await db.updateGameWorld(sessionId, aiResponse.updatedWorld);
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

      // Avanzar día si es necesario
      let newDay = session.currentDay;
      if (aiResponse.shouldAdvanceDay && session.currentDay < scenario.maxDays) {
        newDay = session.currentDay + 1;
        await db.updateSessionDay(sessionId, newDay);
      }

      // Verificar si el juego terminó
      if (aiResponse.gameEnded || newDay >= scenario.maxDays) {
        await db.completeSession(sessionId);
      }

      return NextResponse.json({
        response: aiResponse.response,
        currentDay: newDay,
        maxDays: scenario.maxDays,
        gameEnded: aiResponse.gameEnded || newDay >= scenario.maxDays,
        shouldAdvanceDay: aiResponse.shouldAdvanceDay,
        worldChanges: worldChanges
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

      return NextResponse.json({
        characters: world.characters || [],
        objects: world.objects || [],
        locations: world.locations || [],
        rules: world.rules || [],
        currentState: world.currentState || {}
      });
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
