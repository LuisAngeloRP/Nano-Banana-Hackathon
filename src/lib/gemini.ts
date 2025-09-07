import { GoogleGenerativeAI } from '@google/generative-ai';
import { GameWorld, StoryEntry, GameScenario } from '@/types/game';

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

FORMATO DE RESPUESTA:
Responde SOLO con un JSON válido que contenga:
{
  "response": "Tu respuesta narrativa aquí",
  "worldUpdates": {
    "characters": [array de personajes actualizados],
    "objects": [array de objetos actualizados],
    "locations": [array de ubicaciones actualizadas],
    "rules": [array de reglas del mundo],
    "currentState": {objeto con el estado actual del juego}
  },
  "shouldAdvanceDay": boolean,
  "gameEnded": boolean,
  "endReason": "razón del fin del juego si aplica"
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
    const prompt = `${scenario.initialPrompt}

Genera el estado inicial del mundo para este escenario. Responde SOLO con un JSON válido:

{
  "characters": [array de personajes iniciales relevantes],
  "objects": [array de objetos importantes iniciales],
  "locations": [array de ubicaciones clave],
  "rules": [array de reglas específicas del mundo],
  "currentState": {estado inicial del juego con variables clave}
}

Cada personaje debe tener: id, name, description, traits, relationships, status
Cada objeto debe tener: id, name, description, properties, location, owner
Cada ubicación debe tener: id, name, description, connections, properties
Cada regla debe tener: id, description, type, isActive`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo generar el estado inicial del mundo');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generando estado inicial del mundo:', error);
      return {
        characters: [],
        objects: [],
        locations: [],
        rules: [],
        currentState: {}
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
