import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { GameScenario, GameSession, StoryEntry, GameWorld, Character, GameObject, Location, WorldRule } from '@/types/game';

class Database {
  private db: sqlite3.Database;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const dbPath = path.join(process.cwd(), 'game.db');
    this.db = new sqlite3.Database(dbPath);
    this.initPromise = this.init();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
  }

  private async init() {
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    // Tabla de escenarios
    await run(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        initial_prompt TEXT NOT NULL,
        rules TEXT NOT NULL,
        max_days INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de sesiones de juego
    await run(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        current_day INTEGER DEFAULT 1,
        is_completed BOOLEAN DEFAULT false,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (scenario_id) REFERENCES scenarios (id)
      )
    `);

    // Tabla de entradas de historia
    await run(`
      CREATE TABLE IF NOT EXISTS story_entries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        day INTEGER NOT NULL,
        type TEXT CHECK(type IN ('system', 'user', 'ai')) NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions (id)
      )
    `);

    // Tabla del mundo del juego
    await run(`
      CREATE TABLE IF NOT EXISTS game_worlds (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        characters TEXT NOT NULL,
        objects TEXT NOT NULL,
        locations TEXT NOT NULL,
        rules TEXT NOT NULL,
        current_state TEXT NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions (id)
      )
    `);

    // Insertar escenarios iniciales si no existen
    await this.insertInitialScenarios();
    this.initialized = true;
  }

  private async insertInitialScenarios() {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;

    const existing = await get('SELECT COUNT(*) as count FROM scenarios') as { count: number };
    if (existing.count === 0) {
      const scenarios: Omit<GameScenario, 'createdAt'>[] = [
        {
          id: 'millionaire-challenge',
          title: 'Conviértete en Millonario con $1',
          description: 'Tienes solo $1 dólar y 10 días para convertirte en millonario. Usa tu ingenio, creatividad y estrategia.',
          initialPrompt: `Eres un asistente de juego narrativo. El jugador tiene exactamente $1 dólar y debe convertirse en millonario en 10 días.

REGLAS DEL MUNDO:
- Realismo económico: las ganancias deben ser plausibles
- No se permiten trucos sobrenaturales o magia
- El jugador debe explicar cada paso de su estrategia
- Cada día debe mostrar progreso medible
- Los riesgos tienen consecuencias reales

ESTADO INICIAL:
- Dinero: $1 USD
- Ubicación: Ciudad mediana
- Recursos: Solo ropa básica, acceso a internet público
- Día: 1/10

Responde siempre en español y mantén el realismo.`,
          rules: [
            'Solo dinero real, nada de fantasía',
            'Máximo 10 días para completar el desafío',
            'Cada acción debe ser realista y factible',
            'El progreso debe ser medible cada día',
            'Los fracasos tienen consecuencias'
          ],
          maxDays: 10,
          isActive: true
        },
        {
          id: 'zombie-cure',
          title: 'Encuentra la Cura Zombie',
          description: 'El mundo está infestado de zombies. Eres un científico con recursos limitados que debe encontrar la cura.',
          initialPrompt: `Eres un asistente de juego narrativo. El mundo ha sido devastado por un virus zombie y el jugador es un científico que debe encontrar la cura en 10 días antes de que la humanidad se extinga.

REGLAS DEL MUNDO:
- Recursos limitados: comida, medicina, equipo científico escaso
- Zombies son peligrosos pero siguen patrones lógicos
- Otros supervivientes pueden ayudar o traicionar
- La investigación requiere tiempo y materiales específicos
- Decisiones tienen consecuencias permanentes

ESTADO INICIAL:
- Ubicación: Laboratorio abandonado
- Recursos: Equipo básico de laboratorio, 3 días de comida
- Conocimiento: Biología molecular avanzada
- Día: 1/10
- Amenaza zombie: Media en la zona

Responde siempre en español y mantén la tensión.`,
          rules: [
            'Recursos limitados y realistas',
            'Máximo 10 días antes del colapso total',
            'Los zombies siguen reglas biológicas',
            'Investigación requiere tiempo y materiales',
            'Otros supervivientes tienen sus propias agendas'
          ],
          maxDays: 10,
          isActive: true
        }
      ];

      for (const scenario of scenarios) {
        await run(`
          INSERT INTO scenarios (id, title, description, initial_prompt, rules, max_days, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          scenario.id,
          scenario.title,
          scenario.description,
          scenario.initialPrompt,
          JSON.stringify(scenario.rules),
          scenario.maxDays,
          scenario.isActive
        ]);
      }
    }
  }

  async getScenarios(): Promise<GameScenario[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    const rows = await all('SELECT * FROM scenarios WHERE is_active = true ORDER BY created_at DESC');
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      initialPrompt: row.initial_prompt,
      rules: JSON.parse(row.rules),
      maxDays: row.max_days,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at)
    }));
  }

  async createGameSession(scenarioId: string): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await run(`
      INSERT INTO game_sessions (id, scenario_id, current_day, is_completed)
      VALUES (?, ?, 1, false)
    `, [sessionId, scenarioId]);

    // Crear mundo inicial
    const worldId = `world_${sessionId}`;
    await run(`
      INSERT INTO game_worlds (id, session_id, characters, objects, locations, rules, current_state)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      worldId,
      sessionId,
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify({})
    ]);

    return sessionId;
  }

  async getGameSession(sessionId: string): Promise<GameSession | null> {
    await this.ensureInitialized();
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const row = await get('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);
    
    if (!row) return null;

    return {
      id: row.id,
      scenarioId: row.scenario_id,
      currentDay: row.current_day,
      isCompleted: Boolean(row.is_completed),
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  async addStoryEntry(sessionId: string, day: number, type: 'system' | 'user' | 'ai', content: string): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await run(`
      INSERT INTO story_entries (id, session_id, day, type, content)
      VALUES (?, ?, ?, ?, ?)
    `, [entryId, sessionId, day, type, content]);

    return entryId;
  }

  async getStoryEntries(sessionId: string): Promise<StoryEntry[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    const rows = await all(`
      SELECT * FROM story_entries 
      WHERE session_id = ? 
      ORDER BY day ASC, timestamp ASC
    `, [sessionId]);
    
    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      day: row.day,
      type: row.type,
      content: row.content,
      timestamp: new Date(row.timestamp)
    }));
  }

  async updateGameWorld(sessionId: string, world: Partial<GameWorld>): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    const updates: string[] = [];
    const values: any[] = [];

    if (world.characters) {
      updates.push('characters = ?');
      values.push(JSON.stringify(world.characters));
    }
    if (world.objects) {
      updates.push('objects = ?');
      values.push(JSON.stringify(world.objects));
    }
    if (world.locations) {
      updates.push('locations = ?');
      values.push(JSON.stringify(world.locations));
    }
    if (world.rules) {
      updates.push('rules = ?');
      values.push(JSON.stringify(world.rules));
    }
    if (world.currentState) {
      updates.push('current_state = ?');
      values.push(JSON.stringify(world.currentState));
    }

    updates.push('last_updated = CURRENT_TIMESTAMP');
    values.push(sessionId);

    await run(`
      UPDATE game_worlds 
      SET ${updates.join(', ')} 
      WHERE session_id = ?
    `, values);
  }

  async getGameWorld(sessionId: string): Promise<GameWorld | null> {
    await this.ensureInitialized();
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const row = await get('SELECT * FROM game_worlds WHERE session_id = ?', [sessionId]);
    
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      characters: JSON.parse(row.characters),
      objects: JSON.parse(row.objects),
      locations: JSON.parse(row.locations),
      rules: JSON.parse(row.rules),
      currentState: JSON.parse(row.current_state),
      lastUpdated: new Date(row.last_updated)
    };
  }

  async updateSessionDay(sessionId: string, day: number): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    await run('UPDATE game_sessions SET current_day = ? WHERE id = ?', [day, sessionId]);
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    await run(`
      UPDATE game_sessions 
      SET is_completed = true, completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [sessionId]);
  }
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

export default Database;
