import { GameState, Character, Scenario, GameObject, ActionHistory, PlayerStatus, GameResult } from '@/types/game';

export class GameManager {
  private gameState: GameState;

  constructor() {
    this.gameState = this.initializeGame();
  }

  private initializeGame(): GameState {
    return {
      currentDay: 1,
      money: 1,
      actionsRemaining: 3,
      gameHistory: [],
      characters: [],
      scenarios: [],
      objects: [],
      playerStatus: {
        reputation: 'unknown',
        legalStatus: 'clean',
        healthStatus: 'healthy',
        mentalState: 'confident'
      },
      isGameOver: false
    };
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public addAction(action: string, result: string, moneyChange: number): void {
    const actionHistory: ActionHistory = {
      day: this.gameState.currentDay,
      action,
      result,
      moneyChange,
      timestamp: new Date()
    };

    this.gameState.gameHistory.push(actionHistory);
    this.gameState.money += moneyChange;
    this.gameState.actionsRemaining--;

    // Verificar si el juego debe terminar
    this.checkGameEnd();
  }

  public nextDay(): boolean {
    if (this.gameState.currentDay >= 10) {
      this.endGame();
      return false;
    }

    this.gameState.currentDay++;
    this.gameState.actionsRemaining = 3;
    
    // Posibles eventos aleatorios al cambiar de día
    this.processEndOfDayEvents();
    
    return true;
  }

  public addCharacter(character: Partial<Character>): string {
    const id = this.generateId('char');
    const newCharacter: Character = {
      id,
      name: character.name || 'Desconocido',
      description: character.description || '',
      personality: character.personality || '',
      relationship: character.relationship || 'neutral',
      firstMet: this.gameState.currentDay,
      interactions: 0,
      relevantTo: character.relevantTo || [],
      ...character
    };

    this.gameState.characters.push(newCharacter);
    return id;
  }

  public addScenario(scenario: Partial<Scenario>): string {
    const id = this.generateId('scene');
    const newScenario: Scenario = {
      id,
      name: scenario.name || 'Lugar desconocido',
      description: scenario.description || '',
      type: scenario.type || 'location',
      riskLevel: scenario.riskLevel || 'low',
      firstEncountered: this.gameState.currentDay,
      timesVisited: 0,
      relatedCharacters: scenario.relatedCharacters || [],
      relatedObjects: scenario.relatedObjects || [],
      ...scenario
    };

    this.gameState.scenarios.push(newScenario);
    return id;
  }

  public addObject(object: Partial<GameObject>): string {
    const id = this.generateId('obj');
    const newObject: GameObject = {
      id,
      name: object.name || 'Objeto desconocido',
      description: object.description || '',
      type: object.type || 'tool',
      value: object.value || 0,
      usefulness: object.usefulness || '',
      obtainedOn: this.gameState.currentDay,
      usedCount: 0,
      ...object
    };

    this.gameState.objects.push(newObject);
    return id;
  }

  public updatePlayerStatus(updates: Partial<PlayerStatus>): void {
    this.gameState.playerStatus = {
      ...this.gameState.playerStatus,
      ...updates
    };
  }

  public getRelevantCharacters(limit: number = 5): Character[] {
    return this.gameState.characters
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, limit);
  }

  public getRelevantScenarios(limit: number = 3): Scenario[] {
    return this.gameState.scenarios
      .sort((a, b) => b.timesVisited - a.timesVisited)
      .slice(0, limit);
  }

  public getRelevantObjects(limit: number = 5): GameObject[] {
    return this.gameState.objects
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  public getGameSummary(): string {
    const { currentDay, money, playerStatus, gameHistory } = this.gameState;
    const recentActions = gameHistory.slice(-3);
    
    return `Día ${currentDay}/10. Dinero: $${money}. Estado: ${playerStatus.reputation}, ${playerStatus.legalStatus}. Últimas acciones: ${recentActions.map(a => a.action).join(', ')}`;
  }

  private checkGameEnd(): void {
    const { money, playerStatus } = this.gameState;

    // Condiciones de fin de juego
    if (money <= 0 && playerStatus.healthStatus === 'sick') {
      this.gameState.isGameOver = true;
      this.gameState.gameResult = 'dead';
    } else if (playerStatus.legalStatus === 'fugitive' && Math.random() < 0.3) {
      this.gameState.isGameOver = true;
      this.gameState.gameResult = 'arrested';
    } else if (money >= 1000000) {
      this.gameState.isGameOver = true;
      this.gameState.gameResult = 'millionaire';
    }
  }

  private endGame(): void {
    this.gameState.isGameOver = true;
    
    if (this.gameState.gameResult) return; // Ya se determinó antes

    const { money, playerStatus } = this.gameState;

    if (money >= 1000000) {
      this.gameState.gameResult = 'millionaire';
    } else if (money >= 100000) {
      this.gameState.gameResult = 'rich';
    } else if (money >= 10000) {
      this.gameState.gameResult = 'stable';
    } else if (money <= 0) {
      this.gameState.gameResult = 'broke';
    } else if (money < 0) {
      this.gameState.gameResult = 'in_debt';
    } else if (playerStatus.legalStatus === 'fugitive') {
      this.gameState.gameResult = 'fugitive';
    } else if (playerStatus.reputation === 'notorious') {
      this.gameState.gameResult = 'legend';
    }
  }

  private processEndOfDayEvents(): void {
    // Eventos que pueden ocurrir al final del día
    // Por ejemplo: pérdida de dinero por gastos básicos, eventos aleatorios, etc.
    
    if (this.gameState.money > 100) {
      // Gastos básicos de supervivencia
      this.gameState.money -= Math.floor(this.gameState.money * 0.02); // 2% de gastos
    }

    // Eventos aleatorios basados en el estado del jugador
    if (this.gameState.playerStatus.legalStatus === 'wanted' && Math.random() < 0.1) {
      this.gameState.playerStatus.mentalState = 'paranoid';
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public resetGame(): void {
    this.gameState = this.initializeGame();
  }

  public loadGame(savedState: GameState): void {
    this.gameState = { ...savedState };
  }

  public saveGame(): string {
    return JSON.stringify(this.gameState);
  }
}
