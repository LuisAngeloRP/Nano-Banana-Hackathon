import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { GameScenario, GameSession, StoryEntry, GameWorld, Character, GameObject, Location, WorldRule, FinancialTransaction, FinancialSummary } from '@/types/game';

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
        current_hour INTEGER DEFAULT 8,
        current_minute INTEGER DEFAULT 0,
        total_minutes_elapsed INTEGER DEFAULT 0,
        in_game_start_time TEXT DEFAULT '08:00',
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
        type TEXT CHECK(type IN ('system', 'user', 'ai', 'world_change')) NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT, -- JSON string para metadata adicional
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions (id)
      )
    `);

    // Migración: Agregar columna metadata si no existe
    try {
      await run(`ALTER TABLE story_entries ADD COLUMN metadata TEXT`);
    } catch (error) {
      // La columna ya existe, ignorar el error
    }

    // Migraciones: Agregar nuevas columnas de tiempo si no existen
    try {
      await run(`ALTER TABLE game_sessions ADD COLUMN current_hour INTEGER DEFAULT 8`);
    } catch (error) {
      // La columna ya existe, ignorar el error
    }
    
    try {
      await run(`ALTER TABLE game_sessions ADD COLUMN current_minute INTEGER DEFAULT 0`);
    } catch (error) {
      // La columna ya existe, ignorar el error
    }
    
    try {
      await run(`ALTER TABLE game_sessions ADD COLUMN total_minutes_elapsed INTEGER DEFAULT 0`);
    } catch (error) {
      // La columna ya existe, ignorar el error
    }
    
    try {
      await run(`ALTER TABLE game_sessions ADD COLUMN in_game_start_time TEXT DEFAULT '08:00'`);
    } catch (error) {
      // La columna ya existe, ignorar el error
    }

    // Tabla de transacciones financieras
    await run(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        day INTEGER NOT NULL,
        balance_after REAL NOT NULL,
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
      INSERT INTO game_sessions (id, scenario_id, current_day, current_hour, current_minute, total_minutes_elapsed, in_game_start_time, is_completed)
      VALUES (?, ?, 1, 8, 0, 0, '08:00', false)
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
      currentHour: row.current_hour || 8,
      currentMinute: row.current_minute || 0,
      totalMinutesElapsed: row.total_minutes_elapsed || 0,
      inGameStartTime: row.in_game_start_time || '08:00',
      isCompleted: Boolean(row.is_completed),
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  async addStoryEntry(sessionId: string, day: number, type: 'system' | 'user' | 'ai' | 'world_change', content: string, metadata?: Record<string, any>): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    
    await run(`
      INSERT INTO story_entries (id, session_id, day, type, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [entryId, sessionId, day, type, content, metadataJson]);

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
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
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

  async updateGameTime(sessionId: string, minutesToAdd: number): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    // Obtener tiempo actual
    const session = await this.getGameSession(sessionId);
    if (!session) return;
    
    const newTotalMinutes = session.totalMinutesElapsed + minutesToAdd;
    const currentTotalMinutesInDay = (session.currentHour * 60) + session.currentMinute;
    const newTotalMinutesInDay = currentTotalMinutesInDay + minutesToAdd;
    
    // Calcular el nuevo día y tiempo
    let newDay = session.currentDay;
    let newHour = session.currentHour;
    let newMinute = session.currentMinute;
    
    // Si supera las 24 horas (1440 minutos), avanzar días
    if (newTotalMinutesInDay >= 1440) {
      const daysToAdd = Math.floor(newTotalMinutesInDay / 1440);
      newDay += daysToAdd;
      const remainingMinutes = newTotalMinutesInDay % 1440;
      newHour = Math.floor(remainingMinutes / 60);
      newMinute = remainingMinutes % 60;
    } else {
      newHour = Math.floor(newTotalMinutesInDay / 60);
      newMinute = newTotalMinutesInDay % 60;
    }
    
    await run(`
      UPDATE game_sessions 
      SET current_day = ?, current_hour = ?, current_minute = ?, total_minutes_elapsed = ?
      WHERE id = ?
    `, [newDay, newHour, newMinute, newTotalMinutes, sessionId]);
  }

  async getCurrentGameTime(sessionId: string): Promise<{
    day: number;
    hour: number;
    minute: number;
    timeString: string;
    totalMinutesElapsed: number;
  } | null> {
    const session = await this.getGameSession(sessionId);
    if (!session) return null;
    
    const hourStr = session.currentHour.toString().padStart(2, '0');
    const minuteStr = session.currentMinute.toString().padStart(2, '0');
    
    return {
      day: session.currentDay,
      hour: session.currentHour,
      minute: session.currentMinute,
      timeString: `${hourStr}:${minuteStr}`,
      totalMinutesElapsed: session.totalMinutesElapsed
    };
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

  // Métodos para historial de sesiones
  async getSessionHistory(limit: number = 20): Promise<(GameSession & { scenario: GameScenario, messageCount: number, lastActivity: Date })[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    
    const query = `
      SELECT 
        gs.*,
        s.title as scenario_title,
        s.description as scenario_description,
        s.rules as scenario_rules,
        s.max_days as scenario_max_days,
        COUNT(se.id) as message_count,
        MAX(se.timestamp) as last_activity
      FROM game_sessions gs
      JOIN scenarios s ON gs.scenario_id = s.id
      LEFT JOIN story_entries se ON gs.id = se.session_id
      GROUP BY gs.id
      ORDER BY gs.started_at DESC
      LIMIT ?
    `;
    
    const rows = await all(query, [limit]);
    
    return rows.map((row: any) => ({
      id: row.id,
      scenarioId: row.scenario_id,
      currentDay: row.current_day,
      currentHour: row.current_hour || 8,
      currentMinute: row.current_minute || 0,
      totalMinutesElapsed: row.total_minutes_elapsed || 0,
      inGameStartTime: row.in_game_start_time || '08:00',
      isCompleted: Boolean(row.is_completed),
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      scenario: {
        id: row.scenario_id,
        title: row.scenario_title,
        description: row.scenario_description,
        initialPrompt: '',
        rules: JSON.parse(row.scenario_rules || '[]'),
        maxDays: row.scenario_max_days,
        isActive: true,
        createdAt: new Date()
      },
      messageCount: row.message_count || 0,
      lastActivity: new Date(row.last_activity || row.started_at)
    }));
  }

  async getSessionSummary(sessionId: string): Promise<{
    session: GameSession;
    scenario: GameScenario;
    messageCount: number;
    dayProgress: number;
    lastMessage: string;
    totalPlayTime: number; // en minutos
  } | null> {
    await this.ensureInitialized();
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    
    // Obtener sesión y escenario
    const sessionRow = await get(`
      SELECT 
        gs.*,
        s.title as scenario_title,
        s.description as scenario_description,
        s.initial_prompt as scenario_initial_prompt,
        s.rules as scenario_rules,
        s.max_days as scenario_max_days
      FROM game_sessions gs
      JOIN scenarios s ON gs.scenario_id = s.id
      WHERE gs.id = ?
    `, [sessionId]);
    
    if (!sessionRow) return null;
    
    // Obtener estadísticas de mensajes
    const messageStats = await get(`
      SELECT 
        COUNT(*) as message_count,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
      FROM story_entries 
      WHERE session_id = ?
    `, [sessionId]);
    
    // Obtener último mensaje del usuario o IA
    const lastMessageRow = await get(`
      SELECT content, type 
      FROM story_entries 
      WHERE session_id = ? AND type IN ('user', 'ai')
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [sessionId]);
    
    // Calcular tiempo total de juego
    const firstMessageTime = messageStats?.first_message ? new Date(messageStats.first_message) : sessionRow.started_at;
    const lastMessageTime = messageStats?.last_message ? new Date(messageStats.last_message) : new Date(sessionRow.started_at);
    const totalPlayTime = Math.round((lastMessageTime.getTime() - new Date(firstMessageTime).getTime()) / (1000 * 60));
    
    return {
      session: {
        id: sessionRow.id,
        scenarioId: sessionRow.scenario_id,
        currentDay: sessionRow.current_day,
        currentHour: sessionRow.current_hour || 8,
        currentMinute: sessionRow.current_minute || 0,
        totalMinutesElapsed: sessionRow.total_minutes_elapsed || 0,
        inGameStartTime: sessionRow.in_game_start_time || '08:00',
        isCompleted: Boolean(sessionRow.is_completed),
        startedAt: new Date(sessionRow.started_at),
        completedAt: sessionRow.completed_at ? new Date(sessionRow.completed_at) : undefined
      },
      scenario: {
        id: sessionRow.scenario_id,
        title: sessionRow.scenario_title,
        description: sessionRow.scenario_description,
        initialPrompt: sessionRow.scenario_initial_prompt,
        rules: JSON.parse(sessionRow.scenario_rules),
        maxDays: sessionRow.scenario_max_days,
        isActive: true,
        createdAt: new Date()
      },
      messageCount: messageStats?.message_count || 0,
      dayProgress: Math.round((sessionRow.current_day / sessionRow.scenario_max_days) * 100),
      lastMessage: lastMessageRow?.content || 'Sin mensajes',
      totalPlayTime
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    // Eliminar en orden debido a las foreign keys
    await run('DELETE FROM financial_transactions WHERE session_id = ?', [sessionId]);
    await run('DELETE FROM story_entries WHERE session_id = ?', [sessionId]);
    await run('DELETE FROM game_worlds WHERE session_id = ?', [sessionId]);
    await run('DELETE FROM game_sessions WHERE id = ?', [sessionId]);
  }

  // Funciones para transacciones financieras
  async addFinancialTransaction(
    sessionId: string, 
    type: 'income' | 'expense',
    amount: number,
    description: string,
    category: string,
    day: number
  ): Promise<string> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Obtener balance actual
    const currentBalance = await this.getCurrentBalance(sessionId);
    const balanceAfter = type === 'income' ? currentBalance + amount : currentBalance - amount;
    
    await run(`
      INSERT INTO financial_transactions (id, session_id, type, amount, description, category, day, balance_after)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [transactionId, sessionId, type, amount, description, category, day, balanceAfter]);

    return transactionId;
  }

  async getCurrentBalance(sessionId: string): Promise<number> {
    await this.ensureInitialized();
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    const result = await get(`
      SELECT balance_after FROM financial_transactions 
      WHERE session_id = ? 
      ORDER BY timestamp DESC, id DESC 
      LIMIT 1
    `, [sessionId]);
    
    // Si no hay transacciones, obtener balance inicial del escenario (para millonario es $1)
    if (!result) {
      const session = await this.getGameSession(sessionId);
      if (session?.scenarioId === 'millionaire-challenge') {
        return 1; // $1 inicial para el desafío millonario
      }
      return 0;
    }
    
    return result.balance_after || 0;
  }

  async getFinancialSummary(sessionId: string): Promise<FinancialSummary> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: any[]) => Promise<any>;
    
    // Obtener todas las transacciones
    const transactions = await all(`
      SELECT * FROM financial_transactions 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `, [sessionId]);
    
    // Obtener totales
    const totals = await get(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
      FROM financial_transactions 
      WHERE session_id = ?
    `, [sessionId]);
    
    const currentBalance = await this.getCurrentBalance(sessionId);
    const totalIncome = totals?.total_income || 0;
    const totalExpenses = totals?.total_expenses || 0;
    
    // Obtener balance inicial
    const session = await this.getGameSession(sessionId);
    const initialBalance = session?.scenarioId === 'millionaire-challenge' ? 1 : 0;
    
    const netChange = currentBalance - initialBalance;
    
    return {
      currentBalance,
      totalIncome,
      totalExpenses,
      netChange,
      transactions: transactions.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        type: row.type,
        amount: row.amount,
        description: row.description,
        category: row.category,
        day: row.day,
        balanceAfter: row.balance_after,
        timestamp: new Date(row.timestamp)
      }))
    };
  }

  async getFinancialTransactionsByDay(sessionId: string, day?: number): Promise<FinancialTransaction[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    
    let query = `
      SELECT * FROM financial_transactions 
      WHERE session_id = ?
    `;
    const params = [sessionId];
    
    if (day !== undefined) {
      query += ` AND day = ?`;
      params.push(day.toString());
    }
    
    query += ` ORDER BY timestamp ASC`;
    
    const rows = await all(query, params);
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      amount: row.amount,
      description: row.description,
      category: row.category,
      day: row.day,
      balanceAfter: row.balance_after,
      timestamp: new Date(row.timestamp)
    }));
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
