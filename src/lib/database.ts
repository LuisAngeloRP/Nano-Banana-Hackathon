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

    // Tabla de biblioteca de personajes reutilizables
    await run(`
      CREATE TABLE IF NOT EXISTS character_library (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        traits TEXT NOT NULL,
        backstory TEXT,
        personality TEXT,
        category TEXT DEFAULT 'general',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de biblioteca de objetos reutilizables
    await run(`
      CREATE TABLE IF NOT EXISTS object_library (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        properties TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        rarity TEXT DEFAULT 'common',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de biblioteca de ubicaciones reutilizables
    await run(`
      CREATE TABLE IF NOT EXISTS location_library (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        atmosphere TEXT,
        connections_info TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar escenarios iniciales si no existen
    await this.insertInitialScenarios();
    
    // Insertar contenido inicial en la biblioteca
    await this.insertInitialLibraryContent();
    
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

  private async insertInitialLibraryContent() {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;

    // Verificar si ya hay contenido en la biblioteca
    const existingChars = await get('SELECT COUNT(*) as count FROM character_library') as { count: number };
    
    if (existingChars.count === 0) {
      // Personajes iniciales
      const initialCharacters = [
        {
          id: 'char_001',
          name: 'Alex Blackwood',
          description: 'Un empresario carismático con una misteriosa red de contactos',
          traits: JSON.stringify(['carismático', 'misterioso', 'ambicioso', 'manipulador']),
          backstory: 'Construyó su imperio desde la nada, pero nadie sabe exactamente cómo',
          personality: 'Encantador en público, calculador en privado',
          category: 'business'
        },
        {
          id: 'char_002',
          name: 'Dr. Elena Vasquez',
          description: 'Científica brillante especializada en virología',
          traits: JSON.stringify(['inteligente', 'determinada', 'obsesiva', 'perfeccionista']),
          backstory: 'Perdió a su familia en una pandemia anterior, lo que la motivó a dedicarse a la ciencia',
          personality: 'Metódica y dedicada, a veces sacrifica lo personal por su trabajo',
          category: 'science'
        },
        {
          id: 'char_003',
          name: 'Marcus "The Wolf" Rodriguez',
          description: 'Ex-militar convertido en superviviente urbano',
          traits: JSON.stringify(['valiente', 'leal', 'pragmático', 'protector']),
          backstory: 'Veterano de guerra que ahora usa sus habilidades para proteger a otros',
          personality: 'Directo y honesto, siempre dispuesto a ayudar a los necesitados',
          category: 'survival'
        }
      ];

      for (const char of initialCharacters) {
        await run(`
          INSERT INTO character_library (id, name, description, traits, backstory, personality, category)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [char.id, char.name, char.description, char.traits, char.backstory, char.personality, char.category]);
      }

      // Objetos iniciales
      const initialObjects = [
        {
          id: 'obj_001',
          name: 'Smartphone con conexión satelital',
          description: 'Un dispositivo de comunicación avanzado que funciona incluso sin torres de telefonía',
          properties: JSON.stringify({ durability: 'alta', signal: 'satellite', battery: 'solar' }),
          category: 'technology',
          rarity: 'rare'
        },
        {
          id: 'obj_002',
          name: 'Kit de laboratorio portátil',
          description: 'Conjunto básico de equipos para análisis químicos y biológicos',
          properties: JSON.stringify({ accuracy: 'alta', portability: 'media', power: 'battery' }),
          category: 'science',
          rarity: 'uncommon'
        },
        {
          id: 'obj_003',
          name: 'Mochila de supervivencia',
          description: 'Mochila táctica equipada con herramientas esenciales para supervivencia',
          properties: JSON.stringify({ capacity: '50L', waterproof: true, contents: ['cuerda', 'linterna', 'navaja', 'botiquín'] }),
          category: 'survival',
          rarity: 'common'
        }
      ];

      for (const obj of initialObjects) {
        await run(`
          INSERT INTO object_library (id, name, description, properties, category, rarity)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [obj.id, obj.name, obj.description, obj.properties, obj.category, obj.rarity]);
      }

      // Ubicaciones iniciales
      const initialLocations = [
        {
          id: 'loc_001',
          name: 'Centro Comercial Abandonado',
          description: 'Un gran centro comercial con múltiples pisos, ahora vacío pero lleno de recursos potenciales',
          type: 'urban',
          atmosphere: 'Silencioso y polvoriento, con ecos lejanos y sombras largas',
          connections_info: 'Conectado a estacionamiento subterráneo, oficinas corporativas y estación de metro'
        },
        {
          id: 'loc_002',
          name: 'Laboratorio Universitario',
          description: 'Complejo de investigación bien equipado con tecnología de punta',
          type: 'science',
          atmosphere: 'Ambiente sterile y profesional, con el zumbido constante de equipos especializados',
          connections_info: 'Conectado a biblioteca, dormitorios estudiantiles y hospital universitario'
        },
        {
          id: 'loc_003',
          name: 'Azotea de Rascacielos',
          description: 'La cima de un edificio alto con vista panorámica de la ciudad',
          type: 'strategic',
          atmosphere: 'Viento constante y vista espectacular, sensación de libertad y exposición',
          connections_info: 'Acceso por escaleras de emergencia, helipuerto, antenas de comunicación'
        }
      ];

      for (const loc of initialLocations) {
        await run(`
          INSERT INTO location_library (id, name, description, type, atmosphere, connections_info)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [loc.id, loc.name, loc.description, loc.type, loc.atmosphere, loc.connections_info]);
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

  // Métodos para la biblioteca de personajes
  async saveCharacterToLibrary(character: {
    name: string;
    description: string;
    traits: string[];
    backstory?: string;
    personality?: string;
    category?: string;
  }): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const characterId = `char_lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await run(`
      INSERT INTO character_library (id, name, description, traits, backstory, personality, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      characterId,
      character.name,
      character.description,
      JSON.stringify(character.traits),
      character.backstory || '',
      character.personality || '',
      character.category || 'general'
    ]);

    return characterId;
  }

  async getCharactersFromLibrary(category?: string, limit: number = 10): Promise<any[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    
    let query = 'SELECT * FROM character_library';
    let params: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY usage_count DESC, created_at DESC LIMIT ?';
    params.push(limit);
    
    const rows = await all(query, params);
    
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      traits: JSON.parse(row.traits),
      backstory: row.backstory,
      personality: row.personality,
      category: row.category,
      usageCount: row.usage_count
    }));
  }

  // Métodos para la biblioteca de objetos
  async saveObjectToLibrary(object: {
    name: string;
    description: string;
    properties: Record<string, any>;
    category?: string;
    rarity?: string;
  }): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const objectId = `obj_lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await run(`
      INSERT INTO object_library (id, name, description, properties, category, rarity)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      objectId,
      object.name,
      object.description,
      JSON.stringify(object.properties),
      object.category || 'general',
      object.rarity || 'common'
    ]);

    return objectId;
  }

  async getObjectsFromLibrary(category?: string, limit: number = 10): Promise<any[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    
    let query = 'SELECT * FROM object_library';
    let params: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY usage_count DESC, created_at DESC LIMIT ?';
    params.push(limit);
    
    const rows = await all(query, params);
    
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      properties: JSON.parse(row.properties),
      category: row.category,
      rarity: row.rarity,
      usageCount: row.usage_count
    }));
  }

  // Métodos para la biblioteca de ubicaciones
  async saveLocationToLibrary(location: {
    name: string;
    description: string;
    type?: string;
    atmosphere?: string;
    connectionsInfo?: string;
  }): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const locationId = `loc_lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await run(`
      INSERT INTO location_library (id, name, description, type, atmosphere, connections_info)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      locationId,
      location.name,
      location.description,
      location.type || 'general',
      location.atmosphere || '',
      location.connectionsInfo || ''
    ]);

    return locationId;
  }

  async getLocationsFromLibrary(type?: string, limit: number = 10): Promise<any[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    
    let query = 'SELECT * FROM location_library';
    let params: any[] = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY usage_count DESC, created_at DESC LIMIT ?';
    params.push(limit);
    
    const rows = await all(query, params);
    
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      atmosphere: row.atmosphere,
      connectionsInfo: row.connections_info,
      usageCount: row.usage_count
    }));
  }

  // Incrementar contador de uso
  async incrementUsageCount(table: 'character_library' | 'object_library' | 'location_library', id: string): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    await run(`UPDATE ${table} SET usage_count = usage_count + 1 WHERE id = ?`, [id]);
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
