// Tipos para el sistema de juego

export interface GameState {
  currentDay: number;
  money: number;
  actionsRemaining: number;
  gameHistory: ActionHistory[];
  characters: Character[];
  scenarios: Scenario[];
  objects: GameObject[];
  playerStatus: PlayerStatus;
  isGameOver: boolean;
  gameResult?: GameResult;
}

export interface ActionHistory {
  day: number;
  action: string;
  result: string;
  moneyChange: number;
  timestamp: Date;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  relationship: 'neutral' | 'friendly' | 'hostile' | 'romantic' | 'business';
  firstMet: number; // día en que se conoció
  interactions: number;
  relevantTo: string[]; // temas o situaciones donde aparece
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'location' | 'situation' | 'event';
  riskLevel: 'low' | 'medium' | 'high';
  firstEncountered: number;
  timesVisited: number;
  relatedCharacters: string[];
  relatedObjects: string[];
}

export interface GameObject {
  id: string;
  name: string;
  description: string;
  type: 'tool' | 'weapon' | 'document' | 'money' | 'information' | 'contact';
  value: number;
  usefulness: string;
  obtainedOn: number; // día en que se obtuvo
  usedCount: number;
}

export interface PlayerStatus {
  reputation: 'unknown' | 'respected' | 'feared' | 'wanted' | 'beloved' | 'notorious';
  legalStatus: 'clean' | 'suspicious' | 'wanted' | 'fugitive';
  healthStatus: 'healthy' | 'tired' | 'injured' | 'sick';
  mentalState: 'confident' | 'stressed' | 'desperate' | 'euphoric' | 'paranoid';
}

export type GameResult = 
  | 'millionaire' 
  | 'rich' 
  | 'stable' 
  | 'broke' 
  | 'in_debt' 
  | 'arrested' 
  | 'dead' 
  | 'fugitive' 
  | 'legend';

export interface GameAction {
  type: 'business' | 'crime' | 'social' | 'investment' | 'survival' | 'special';
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  potentialReward: [number, number]; // min, max
  requirements?: string[];
}

export interface StoryContext {
  currentSituation: string;
  availableActions: GameAction[];
  relevantCharacters: Character[];
  relevantScenarios: Scenario[];
  relevantObjects: GameObject[];
  playerThoughts: string;
}

export interface AIResponse {
  narrative: string;
  newCharacters?: Partial<Character>[];
  newScenarios?: Partial<Scenario>[];
  newObjects?: Partial<GameObject>[];
  statusUpdates?: Partial<PlayerStatus>;
  actionResults: {
    success: boolean;
    moneyChange: number;
    description: string;
    consequences?: string[];
  };
  storyImage?: string; // URL de la imagen generada para esta parte de la historia
  assetsGenerated?: AssetGenerationSummary; // Información detallada de assets procesados
  compositeDescription?: string; // Descripción de la escena compuesta
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  gameData?: {
    day: number;
    money: number;
    moneyChange?: number;
    actionsRemaining: number;
    newElements?: {
      characters?: Partial<Character>[];
      scenarios?: Partial<Scenario>[];
      objects?: Partial<GameObject>[];
    };
    statusUpdates?: Partial<PlayerStatus>;
    storyImage?: string; // URL de la imagen para este mensaje
    assetsGenerated?: AssetGenerationSummary; // Información detallada de assets
    compositeDescription?: string; // Descripción de la escena compuesta
  };
}

export interface QuickAction {
  id: string;
  text: string;
  type: 'business' | 'crime' | 'social' | 'investment' | 'survival' | 'special';
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

// Nuevos tipos para el sistema de biblioteca de elementos

export interface ElementLibrary {
  characters: StoredCharacter[];
  scenarios: StoredScenario[];
  objects: StoredObject[];
  lastUpdated: Date;
}

export interface StoredCharacter extends Character {
  imageUrl?: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  tags: string[];
  appearance: string; // descripción física detallada
  background: string; // historia personal
}

export interface StoredScenario extends Scenario {
  imageUrl?: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  tags: string[];
  atmosphere: string; // ambiente y mood del lugar
  visualDetails: string; // detalles visuales específicos
}

export interface StoredObject extends GameObject {
  imageUrl?: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  tags: string[];
  appearance: string; // cómo se ve físicamente
  story: string; // historia u origen del objeto
}

export interface ExtractedElements {
  characters: {
    name: string;
    description: string;
    appearance: string;
    personality: string;
    role: string;
  }[];
  scenarios: {
    name: string;
    description: string;
    type: 'location' | 'situation' | 'event';
    atmosphere: string;
    visualDetails: string;
  }[];
  objects: {
    name: string;
    description: string;
    type: 'tool' | 'weapon' | 'document' | 'money' | 'information' | 'contact';
    appearance: string;
    importance: 'low' | 'medium' | 'high';
  }[];
}

export interface ElementGenerationResult {
  extractedElements: ExtractedElements;
  reusedElements: {
    characters: StoredCharacter[];
    scenarios: StoredScenario[];
    objects: StoredObject[];
  };
  newElements: {
    characters: StoredCharacter[];
    scenarios: StoredScenario[];
    objects: StoredObject[];
  };
  compositeImage?: string; // imagen que combina todos los elementos
  compositeDescription?: string; // descripción de la escena compuesta
  assetsGenerated: AssetGenerationSummary; // resumen de assets procesados
}

export interface AssetGenerationSummary {
  totalAssetsGenerated: number;
  totalAssetsReused: number;
  newAssets: AssetInfo[];
  reusedAssets: AssetInfo[];
  sceneComposition: {
    description: string;
    elements: string[];
    mood: string;
  };
}

export interface AssetInfo {
  id: string;
  name: string;
  type: 'character' | 'scenario' | 'object';
  description: string;
  imageUrl?: string;
  uniqueTraits: string[]; // características únicas para reconocimiento
  visualSignature: string; // firma visual distintiva
  createdAt?: Date;
  lastUsed?: Date;
  usageCount?: number;
}
