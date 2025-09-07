import { GameManager } from './gameManager';
import { StoryGenerator } from './storyGenerator';
import { ImageGenerator } from './imageGenerator';
import { ElementManager } from './elementManager';
import { GameState, AIResponse, StoryContext, ElementGenerationResult } from '@/types/game';

export class GameEngine {
  private gameManager: GameManager;
  private storyGenerator: StoryGenerator;
  private imageGenerator: ImageGenerator;
  private elementManager: ElementManager;

  constructor(googleAIKey: string, falAIKey?: string) {
    this.gameManager = new GameManager();
    this.storyGenerator = new StoryGenerator(googleAIKey);
    this.imageGenerator = new ImageGenerator(falAIKey || 'dummy-key');
    this.elementManager = new ElementManager(googleAIKey, falAIKey || 'dummy-key');
  }

  public async startNewGame(): Promise<AIResponse> {
    this.gameManager.resetGame();
    return await this.generateCurrentStory();
  }

  public async executeAction(actionDescription: string): Promise<AIResponse> {
    const gameState = this.gameManager.getGameState();
    
    if (gameState.actionsRemaining <= 0) {
      throw new Error('No tienes acciones restantes para hoy');
    }

    if (gameState.isGameOver) {
      throw new Error('El juego ha terminado');
    }

    console.log('🎮 Procesando acción del usuario:', actionDescription);

    // PASO 1: Procesar elementos del prompt del usuario PRIMERO
    const elementResult = await this.processUserPromptElements(actionDescription);

    // PASO 2: Generar narrativa usando el contexto enriquecido
    const aiResponse = await this.storyGenerator.generateStory(gameState, actionDescription);

    // PASO 3: Procesar la respuesta de la IA (agregar elementos al juego)
    await this.processAIResponse(aiResponse, actionDescription);

    // PASO 4: Generar escena usando todos los assets disponibles
    try {
      if (elementResult?.compositeImage) {
        aiResponse.storyImage = elementResult.compositeImage;
        console.log('🎨 Usando escena compuesta generada con assets de Nano Banana');
      } else {
        // Fallback a la generación tradicional de imagen
        const imageUrl = await this.generateSceneImage(aiResponse.narrative, actionDescription);
        aiResponse.storyImage = imageUrl || this.imageGenerator.getPlaceholderImage('story');
      }

      // PASO 5: Agregar información detallada de assets al AIResponse
      if (elementResult) {
        aiResponse.assetsGenerated = elementResult.assetsGenerated;
        aiResponse.compositeDescription = elementResult.compositeDescription;
        
        console.log(`📚 Elementos procesados:
          - ${elementResult.newElements.characters.length} personajes nuevos
          - ${elementResult.newElements.scenarios.length} escenarios nuevos  
          - ${elementResult.newElements.objects.length} objetos nuevos
          - ${elementResult.reusedElements.characters.length} personajes reutilizados
          - ${elementResult.reusedElements.scenarios.length} escenarios reutilizados
          - ${elementResult.reusedElements.objects.length} objetos reutilizados`);
      }

    } catch (error) {
      console.warn('Error procesando elementos, usando imagen tradicional:', error);
      const imageUrl = await this.generateSceneImage(aiResponse.narrative, actionDescription);
      aiResponse.storyImage = imageUrl || this.imageGenerator.getPlaceholderImage('story');
    }

    return aiResponse;
  }

  public async nextDay(): Promise<AIResponse> {
    const success = this.gameManager.nextDay();
    
    if (!success) {
      // El juego ha terminado
      return await this.generateGameEndStory();
    }

    return await this.generateCurrentStory();
  }

  public async generateCurrentStory(): Promise<AIResponse> {
    const gameState = this.gameManager.getGameState();
    const aiResponse = await this.storyGenerator.generateStory(gameState);
    
    // NO generar imagen inicial automáticamente - solo texto de bienvenida
    // Las imágenes se generarán después del primer prompt del usuario
    
    return aiResponse;
  }

  private async processAIResponse(aiResponse: AIResponse, actionDescription: string): Promise<void> {
    const { actionResults, newCharacters, newScenarios, newObjects, statusUpdates } = aiResponse;

    // Registrar la acción en el historial
    this.gameManager.addAction(
      actionDescription,
      actionResults.description,
      actionResults.moneyChange
    );

    // Agregar nuevos personajes
    if (newCharacters && newCharacters.length > 0) {
      for (const character of newCharacters) {
        this.gameManager.addCharacter(character);
      }
    }

    // Agregar nuevos escenarios
    if (newScenarios && newScenarios.length > 0) {
      for (const scenario of newScenarios) {
        this.gameManager.addScenario(scenario);
      }
    }

    // Agregar nuevos objetos
    if (newObjects && newObjects.length > 0) {
      for (const object of newObjects) {
        this.gameManager.addObject(object);
      }
    }

    // Actualizar estado del jugador
    if (statusUpdates) {
      this.gameManager.updatePlayerStatus(statusUpdates);
    }
  }

  private async generateGameEndStory(): Promise<AIResponse> {
    const gameState = this.gameManager.getGameState();
    const finalMoney = gameState.money;
    const gameResult = gameState.gameResult;

    let endingNarrative = '';
    
    switch (gameResult) {
      case 'millionaire':
        endingNarrative = `¡Increíble! Has logrado convertir tu único dólar en más de un millón. Te has convertido en una leyenda de los negocios. Las calles que una vez caminaste con apenas unas monedas ahora te ven pasar en tu nuevo automóvil. Tu historia inspirará a otros durante años.`;
        break;
      case 'rich':
        endingNarrative = `¡Excelente trabajo! Con $${finalMoney}, has demostrado que se puede triunfar con determinación y astucia. No eres millonario, pero definitivamente has cambiado tu vida para siempre.`;
        break;
      case 'stable':
        endingNarrative = `Has logrado establecerte con $${finalMoney}. No es una fortuna, pero es un buen comienzo para una nueva vida. Tu perseverancia ha dado frutos.`;
        break;
      case 'broke':
        endingNarrative = `Los 10 días han terminado y te encuentras sin dinero. Las calles de la ciudad parecen más frías ahora, pero al menos has aprendido valiosas lecciones sobre la vida.`;
        break;
      case 'arrested':
        endingNarrative = `El sonido de las sirenas marca el final de tu aventura. Las decisiones que tomaste te han llevado por un camino peligroso, y ahora debes enfrentar las consecuencias.`;
        break;
      case 'fugitive':
        endingNarrative = `Vives en las sombras ahora, constantemente mirando por encima del hombro. El dinero que ganaste tiene un precio que quizás no valía la pena pagar.`;
        break;
      default:
        endingNarrative = `Tu aventura de 10 días ha llegado a su fin con $${finalMoney}. Cada decisión que tomaste te trajo hasta aquí.`;
    }

    return {
      narrative: endingNarrative,
      actionResults: {
        success: true,
        moneyChange: 0,
        description: 'Fin del juego'
      }
    };
  }

  public getGameState(): GameState {
    return this.gameManager.getGameState();
  }

  public saveGame(): string {
    return this.gameManager.saveGame();
  }

  public loadGame(savedData: string): void {
    try {
      const gameState = JSON.parse(savedData);
      this.gameManager.loadGame(gameState);
    } catch (error) {
      throw new Error('Datos de guardado inválidos');
    }
  }

  public getGameSummary(): string {
    return this.gameManager.getGameSummary();
  }

  public canPerformAction(): boolean {
    const gameState = this.gameManager.getGameState();
    return !gameState.isGameOver && gameState.actionsRemaining > 0;
  }

  public getAvailableActions(): string[] {
    const gameState = this.gameManager.getGameState();
    
    const baseActions = [
      'Buscar trabajo o oportunidades de negocio',
      'Hacer networking y contactos',
      'Investigar inversiones',
      'Explorar la ciudad buscando oportunidades'
    ];

    if (gameState.money > 50) {
      baseActions.push('Hacer una inversión arriesgada');
    }

    if (gameState.money > 100) {
      baseActions.push('Iniciar un pequeño negocio');
    }

    if (gameState.playerStatus.legalStatus === 'clean' && gameState.money < 10) {
      baseActions.push('Considerar métodos menos convencionales');
    }

    if (gameState.characters.length > 0) {
      baseActions.push('Contactar a alguien que conoces');
    }

    if (gameState.objects.length > 0) {
      baseActions.push('Usar uno de tus recursos');
    }

    return baseActions;
  }

  /**
   * Procesar elementos del prompt del usuario (ANTES de generar narrativa)
   */
  private async processUserPromptElements(userPrompt: string): Promise<ElementGenerationResult | null> {
    try {
      console.log('🔍 Analizando prompt del usuario para extraer elementos...');
      
      // Construir contexto del estado actual del juego
      const gameState = this.gameManager.getGameState();
      const context = this.buildUserPromptContext(gameState, userPrompt);
      
      // Procesar el prompt del usuario para extraer, reutilizar y generar elementos
      const result = await this.elementManager.processStoryPrompt(userPrompt, context);
      
      return result;
    } catch (error) {
      console.warn('Error procesando elementos del prompt del usuario:', error);
      return null;
    }
  }

  /**
   * Construir contexto específico para procesar prompt del usuario
   */
  private buildUserPromptContext(gameState: GameState, userPrompt: string): string {
    let context = `Juego "De $1 a Millonario" - Día ${gameState.currentDay} de 10. Dinero actual: $${gameState.money}.
    
Prompt del usuario: "${userPrompt}"

Elementos ya existentes en la biblioteca:`;
    
    if (gameState.characters.length > 0) {
      context += `\nPersonajes existentes: ${gameState.characters.slice(0, 5).map(c => c.name).join(', ')}.`;
    }
    
    if (gameState.scenarios.length > 0) {
      context += `\nLugares existentes: ${gameState.scenarios.slice(0, 5).map(s => s.name).join(', ')}.`;
    }

    if (gameState.objects.length > 0) {
      context += `\nObjetos existentes: ${gameState.objects.slice(0, 5).map(o => o.name).join(', ')}.`;
    }
    
    context += `\n\nInstrucciones: Analiza el prompt del usuario para identificar qué elementos menciona. Reutiliza elementos existentes cuando sea apropiado y crea nuevos assets con Nano Banana solo para elementos realmente nuevos.`;
    
    return context;
  }

  /**
   * Construir contexto para el procesamiento de elementos (método legacy)
   */
  private buildStoryContext(gameState: GameState, action: string): string {
    let context = `Día ${gameState.currentDay} de 10. Dinero actual: $${gameState.money}. Acción: ${action}.`;
    
    if (gameState.characters.length > 0) {
      context += ` Personajes conocidos: ${gameState.characters.slice(0, 3).map(c => c.name).join(', ')}.`;
    }
    
    if (gameState.scenarios.length > 0) {
      context += ` Lugares visitados: ${gameState.scenarios.slice(0, 3).map(s => s.name).join(', ')}.`;
    }
    
    return context;
  }

  /**
   * Obtener estadísticas de la biblioteca de elementos
   */
  public getElementLibraryStats() {
    return this.elementManager.getLibraryStats();
  }

  /**
   * Obtener biblioteca completa de elementos
   */
  public getElementLibrary() {
    return this.elementManager.getLibrary();
  }

  /**
   * Buscar elementos en la biblioteca
   */
  public searchElementLibrary(query: string) {
    return this.elementManager.searchLibrary(query);
  }

  /**
   * Limpiar biblioteca de elementos no utilizados
   */
  public cleanupElementLibrary(days: number = 30) {
    this.elementManager.cleanupLibrary(days);
  }

  private async generateSceneImage(narrative: string, action: string): Promise<string | null> {
    try {
      // Determinar el mood basado en palabras clave en la narrativa y acción
      let mood: 'dramatic' | 'tense' | 'hopeful' | 'mysterious' | 'exciting' = 'dramatic';
      
      const text = (narrative + ' ' + action).toLowerCase();
      
      if (text.includes('peligro') || text.includes('riesgo') || text.includes('policía')) {
        mood = 'tense';
      } else if (text.includes('éxito') || text.includes('ganancia') || text.includes('oportunidad')) {
        mood = 'hopeful';
      } else if (text.includes('secreto') || text.includes('sombra') || text.includes('misterio')) {
        mood = 'mysterious';
      } else if (text.includes('acción') || text.includes('correr') || text.includes('rápido')) {
        mood = 'exciting';
      }

      return await this.imageGenerator.generateStoryMomentImage(narrative, mood);
    } catch (error) {
      console.warn('Error generando imagen de escena:', error);
      return null;
    }
  }
}
