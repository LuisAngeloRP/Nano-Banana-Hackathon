import { GameState, StoryContext, AIResponse, GameAction, Character, Scenario, GameObject } from '@/types/game';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiLogger } from './aiLogger';

export class StoryGenerator {
  private apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public async generateStory(gameState: GameState, playerAction?: string): Promise<AIResponse> {
    const context = this.buildStoryContext(gameState);
    const prompt = this.buildPrompt(context, playerAction);

    try {
      const response = await this.callGoogleAI(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Error generating story:', error);
      return this.getFallbackResponse(gameState, playerAction);
    }
  }

  private buildStoryContext(gameState: GameState): StoryContext {
    const relevantCharacters = gameState.characters
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);

    const relevantScenarios = gameState.scenarios
      .sort((a, b) => b.timesVisited - a.timesVisited)
      .slice(0, 3);

    const relevantObjects = gameState.objects
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      currentSituation: this.describeSituation(gameState),
      availableActions: this.generatePossibleActions(gameState),
      relevantCharacters,
      relevantScenarios,
      relevantObjects,
      playerThoughts: this.generatePlayerThoughts(gameState)
    };
  }

  private buildPrompt(context: StoryContext, playerAction?: string): string {
    const isInitialStory = !playerAction && context.relevantCharacters.length === 0;
    
    if (isInitialStory) {
      return this.buildInitialPrompt(context);
    }
    
    const basePrompt = `
Eres el narrador de un juego conversacional donde el jugador debe convertir $1 en la mayor cantidad de dinero posible en 10 días.

CONTEXTO ACTUAL:
${context.currentSituation}

PENSAMIENTOS DEL JUGADOR:
${context.playerThoughts}

MEMORIA DEL JUEGO:
${context.relevantCharacters.length > 0 ? `
PERSONAJES CONOCIDOS:
${context.relevantCharacters.map(c => `- ${c.name}: ${c.description} (Relación: ${c.relationship}, Interacciones: ${c.interactions})`).join('\n')}` : ''}

${context.relevantScenarios.length > 0 ? `
LUGARES CONOCIDOS:
${context.relevantScenarios.map(s => `- ${s.name}: ${s.description} (Riesgo: ${s.riskLevel}, Visitado: ${s.timesVisited} veces)`).join('\n')}` : ''}

${context.relevantObjects.length > 0 ? `
OBJETOS/CONTACTOS:
${context.relevantObjects.map(o => `- ${o.name}: ${o.description} (Valor: $${o.value}, Usado: ${o.usedCount} veces)`).join('\n')}` : ''}

ACCIÓN DEL JUGADOR: ${playerAction}

INSTRUCCIONES PARA EL CHAT:
- Responde como si fueras el narrador en una conversación
- Narra las consecuencias de la acción del jugador de forma inmersiva
- Mantén coherencia con todos los elementos ya establecidos
- Reutiliza personajes, lugares y objetos cuando sea apropiado
- Introduce nuevos elementos solo cuando enriquezcan la historia
- El tono debe ser envolvente y cinematográfico
- Describe las emociones y tensiones del momento
- Termina de forma que invite a la siguiente acción

FORMATO DE RESPUESTA (JSON):
{
  "narrative": "Narrativa inmersiva de 2-3 párrafos respondiendo a la acción del jugador",
  "newCharacters": [{"name": "Nombre", "description": "Descripción breve", "personality": "Personalidad", "relationship": "neutral/friendly/hostile/business/romantic", "relevantTo": ["tema1", "tema2"]}],
  "newScenarios": [{"name": "Lugar", "description": "Descripción del lugar", "type": "location/situation/event", "riskLevel": "low/medium/high", "relatedCharacters": ["id1"], "relatedObjects": ["id1"]}],
  "newObjects": [{"name": "Objeto/Contacto", "description": "Descripción", "type": "tool/weapon/document/money/information/contact", "value": 100, "usefulness": "Utilidad específica"}],
  "statusUpdates": {"reputation": "unknown/respected/feared/wanted/beloved/notorious", "legalStatus": "clean/suspicious/wanted/fugitive", "healthStatus": "healthy/tired/injured/sick", "mentalState": "confident/stressed/desperate/euphoric/paranoid"},
  "actionResults": {
    "success": true/false,
    "moneyChange": 50,
    "description": "Resultado específico de la acción",
    "consequences": ["Consecuencia inmediata", "Consecuencia futura"]
  }
}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;

    return basePrompt;
  }

  private buildInitialPrompt(context: StoryContext): string {
    return `
Eres el narrador de un juego conversacional donde el jugador debe convertir $1 en la mayor cantidad de dinero posible en 10 días.

SITUACIÓN INICIAL:
${context.currentSituation}

INSTRUCCIONES PARA LA HISTORIA INICIAL:
- Establece el escenario de forma cinematográfica y envolvente
- El jugador tiene solo $1 y está en una ciudad llena de oportunidades
- Describe el ambiente, las emociones y las primeras impresiones
- Introduce 1-2 personajes iniciales que puedan ser útiles
- Describe 1-2 lugares donde el jugador puede buscar oportunidades
- Menciona algunos objetos o contactos que podrían obtener
- Establece el tono: realista pero con posibilidades dramáticas
- Termina invitando al jugador a tomar su primera decisión

TONO:
- Narrativa rica y descriptiva
- Entre serio y aventurero
- Inspirador pero realista sobre los desafíos

FORMATO DE RESPUESTA (JSON):
{
  "narrative": "Historia inicial inmersiva estableciendo el escenario (3-4 párrafos)",
  "newCharacters": [{"name": "Nombre", "description": "Descripción del personaje", "personality": "Personalidad distintiva", "relationship": "neutral", "relevantTo": ["oportunidades", "negocios"]}],
  "newScenarios": [{"name": "Lugar", "description": "Descripción detallada", "type": "location", "riskLevel": "low/medium"}],
  "newObjects": [{"name": "Objeto/Oportunidad", "description": "Descripción", "type": "information/contact/tool", "value": 0, "usefulness": "Potencial uso"}],
  "statusUpdates": {},
  "actionResults": {
    "success": true,
    "moneyChange": 0,
    "description": "Inicio de la aventura",
    "consequences": []
  }
}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;
  }

  private async callGoogleAI(prompt: string): Promise<string> {
    // Verificar si tenemos una API key válida
    if (!this.apiKey || this.apiKey === 'dummy-key') {
      aiLogger.logAIUsage({
        aiType: 'texto',
        model: 'simulado',
        provider: 'Google Gemini',
        operation: 'generación de historia',
        success: true,
        metadata: { mode: 'simulado', reason: 'API key no válida' }
      });
      console.log('🤖 Usando modo simulado - configura NEXT_PUBLIC_GOOGLE_AI_API_KEY para usar Gemini real');
      return this.getFallbackSimulatedResponse(prompt);
    }

    return await aiLogger.measureAIOperation(
      'texto',
      'gemini-1.5-flash',
      'Google Gemini',
      'generación de historia',
      async () => {
        // Usar Gemini 1.5 Flash para respuestas rápidas
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent({
          contents: [
            {
              role: "user", 
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        });

        const response = await result.response;
        let text = response.text();
        
        // Limpiar el texto para extraer solo el JSON
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        text = text.trim();
        
        // Si no empieza con {, buscar donde empieza el JSON
        if (!text.startsWith('{')) {
          const jsonStart = text.indexOf('{');
          if (jsonStart !== -1) {
            text = text.substring(jsonStart);
          }
        }
        
        // Si no termina con }, buscar donde termina el JSON
        if (!text.endsWith('}')) {
          const jsonEnd = text.lastIndexOf('}');
          if (jsonEnd !== -1) {
            text = text.substring(0, jsonEnd + 1);
          }
        }
        
        return text;
      },
      {
        temperature: 0.8,
        maxTokens: 2048,
        promptLength: prompt.length
      }
    ).catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Error con Gemini, usando modo simulado:', errorMessage);
      
      // Loggear el fallback
      aiLogger.logAIUsage({
        aiType: 'texto',
        model: 'simulado',
        provider: 'Google Gemini',
        operation: 'fallback después de error',
        success: true,
        metadata: { originalError: errorMessage, mode: 'fallback' }
      });
      
      // Fallback con respuesta simulada si falla la API
      return this.getFallbackSimulatedResponse(prompt);
    });
  }

  private getFallbackSimulatedResponse(prompt: string): string {
    // Detectar si es historia inicial
    const isInitial = prompt.includes('HISTORIA INICIAL');
    
    if (isInitial) {
      return JSON.stringify({
        narrative: `El sol de la mañana se filtra entre los rascacielos mientras caminas por las bulliciosas calles del centro de la ciudad. En tu bolsillo, una sola moneda de dólar hace un sonido metálico solitario - todo lo que te queda en el mundo. Pero en tus ojos arde una determinación férrea: en 10 días, convertirás este dólar en una fortuna.

La ciudad pulsa con energía y oportunidades. Oficinistas elegantes pasan a tu lado hablando de grandes negocios, vendedores ambulantes gritan sus ofertas, y en los escaparates de las tiendas se reflejan tanto tus sueños como tus miedos. Cada esquina parece susurrar promesas de riqueza para aquellos lo suficientemente audaces como para tomarlas.

Cerca de una cafetería, notas a un hombre mayor en traje leyendo el periódico financiero, murmurando sobre oportunidades de inversión. En el callejón adyacente, un joven con laptop parece estar coordinando algún tipo de negocio en línea. Tus instintos te dicen que cada persona, cada lugar, cada momento podría ser la clave para tu transformación.

El reloj marca las 9:00 AM del día 1. Tu aventura hacia la riqueza... comienza ahora.`,
        newCharacters: [
          {
            name: "Ricardo Mendoza",
            description: "Hombre mayor en traje, aparenta ser un inversor experimentado leyendo el periódico financiero",
            personality: "Calculador y observador, parece conocer el mundo de las finanzas",
            relationship: "neutral",
            relevantTo: ["inversiones", "consejos financieros"]
          }
        ],
        newScenarios: [
          {
            name: "Cafetería 'El Punto de Encuentro'",
            description: "Lugar frecuentado por empresarios y profesionales, ideal para networking y escuchar oportunidades",
            type: "location",
            riskLevel: "low"
          }
        ],
        newObjects: [
          {
            name: "Periódico Financiero del Día",
            description: "Contiene información sobre oportunidades de inversión y tendencias del mercado",
            type: "information",
            value: 0,
            usefulness: "Conocimiento sobre mercados y oportunidades"
          }
        ],
        statusUpdates: {},
        actionResults: {
          success: true,
          moneyChange: 0,
          description: "Inicio de la aventura",
          consequences: []
        }
      });
    }
    
    // Respuesta simulada para acciones
    return JSON.stringify({
      narrative: `Tu acción genera una cascada de eventos inesperados. La ciudad responde a tu iniciativa de maneras que no habías anticipado. Cada decisión que tomas parece abrir nuevas puertas mientras cierra otras.

Sientes que estás aprendiendo a navegar este complejo mundo de oportunidades y riesgos. Tu determinación se fortalece con cada paso.`,
      newCharacters: [],
      newScenarios: [],
      newObjects: [],
      statusUpdates: {},
      actionResults: {
        success: true,
        moneyChange: Math.floor(Math.random() * 15) + 1,
        description: "Tu acción tuvo consecuencias interesantes",
        consequences: ["Aprendiste algo valioso sobre el mundo de los negocios"]
      }
    });
  }

  private parseAIResponse(response: string): AIResponse {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        narrative: "Algo inesperado sucede en tu aventura...",
        actionResults: {
          success: false,
          moneyChange: 0,
          description: "Error en la narración"
        }
      };
    }
  }

  private describeSituation(gameState: GameState): string {
    const { currentDay, money, actionsRemaining, playerStatus } = gameState;
    
    let situation = `Día ${currentDay} de 10. Tienes $${money} y ${actionsRemaining} acciones restantes hoy. `;
    
    situation += `Tu reputación es '${playerStatus.reputation}' y tu estado legal es '${playerStatus.legalStatus}'. `;
    situation += `Te sientes ${playerStatus.mentalState} y estás ${playerStatus.healthStatus}.`;

    if (gameState.gameHistory.length > 0) {
      const lastAction = gameState.gameHistory[gameState.gameHistory.length - 1];
      situation += ` Tu última acción fue: ${lastAction.action} (${lastAction.result})`;
    }

    return situation;
  }

  private generatePossibleActions(gameState: GameState): GameAction[] {
    const baseActions: GameAction[] = [
      {
        type: 'business',
        description: 'Buscar trabajo honesto o oportunidades de negocio',
        riskLevel: 'low',
        potentialReward: [5, 50]
      },
      {
        type: 'social',
        description: 'Hacer contactos y networking',
        riskLevel: 'low',
        potentialReward: [0, 20]
      },
      {
        type: 'investment',
        description: 'Investigar oportunidades de inversión',
        riskLevel: 'medium',
        potentialReward: [10, 200]
      }
    ];

    // Agregar acciones contextuales basadas en el estado del juego
    if (gameState.money > 50) {
      baseActions.push({
        type: 'investment',
        description: 'Hacer una inversión arriesgada',
        riskLevel: 'high',
        potentialReward: [gameState.money * -0.5, gameState.money * 2]
      });
    }

    if (gameState.playerStatus.legalStatus === 'clean') {
      baseActions.push({
        type: 'crime',
        description: 'Considerar actividades menos legales',
        riskLevel: 'high',
        potentialReward: [20, 500]
      });
    }

    return baseActions;
  }

  private generatePlayerThoughts(gameState: GameState): string {
    const { money, currentDay, playerStatus } = gameState;
    
    if (money < 5 && currentDay > 5) {
      return "La desesperación comienza a apoderarse de mí. El tiempo se agota y necesito hacer algo drástico.";
    }
    
    if (money > 1000) {
      return "Las cosas van bien, pero no puedo relajarme. Necesito pensar en grande si quiero llegar lejos.";
    }
    
    if (playerStatus.legalStatus !== 'clean') {
      return "Camino por la cuerda floja. Cada movimiento debe ser calculado cuidadosamente.";
    }
    
    return "Cada decisión cuenta. Necesito ser inteligente y mantenerme enfocado en el objetivo.";
  }

  private getFallbackResponse(gameState: GameState, playerAction?: string): AIResponse {
    return {
      narrative: `Día ${gameState.currentDay}: ${playerAction ? `Decidiste ${playerAction}.` : 'Contemplas tus opciones.'} La ciudad sigue su ritmo mientras tú planificas tu próximo movimiento. Las oportunidades están ahí, solo necesitas encontrarlas.`,
      actionResults: {
        success: true,
        moneyChange: 0,
        description: playerAction || "Reflexionas sobre tu situación"
      }
    };
  }
}
