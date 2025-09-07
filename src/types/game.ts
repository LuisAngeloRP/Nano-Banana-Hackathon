export interface GameScenario {
  id: string;
  title: string;
  description: string;
  initialPrompt: string;
  rules: string[];
  maxDays: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GameSession {
  id: string;
  scenarioId: string;
  currentDay: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface StoryEntry {
  id: string;
  sessionId: string;
  day: number;
  type: 'system' | 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface GameWorld {
  id: string;
  sessionId: string;
  characters: Character[];
  objects: GameObject[];
  locations: Location[];
  rules: WorldRule[];
  currentState: Record<string, any>;
  lastUpdated: Date;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  traits: string[];
  relationships: Record<string, string>;
  status: 'alive' | 'dead' | 'unknown';
}

export interface GameObject {
  id: string;
  name: string;
  description: string;
  properties: Record<string, any>;
  location?: string;
  owner?: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  connections: string[];
  properties: Record<string, any>;
}

export interface WorldRule {
  id: string;
  description: string;
  type: 'constraint' | 'mechanic' | 'lore';
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  day?: number;
}
