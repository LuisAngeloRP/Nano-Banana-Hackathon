import { ElementExtractor } from './elementExtractor';
import { ElementLibraryManager } from './elementLibrary';
import { ImageGenerator } from './imageGenerator';
import { 
  ExtractedElements, 
  ElementGenerationResult, 
  StoredCharacter, 
  StoredScenario, 
  StoredObject,
  AssetGenerationSummary,
  AssetInfo
} from '@/types/game';

export class ElementManager {
  private extractor: ElementExtractor;
  private library: ElementLibraryManager;
  private imageGenerator: ImageGenerator;

  constructor(googleAiKey: string, imageApiKey: string) {
    this.extractor = new ElementExtractor(googleAiKey);
    this.library = new ElementLibraryManager();
    this.imageGenerator = new ImageGenerator(imageApiKey);
  }

  /**
   * Proceso principal: extraer elementos del prompt, reutilizar existentes y generar nuevos
   */
  public async processStoryPrompt(
    prompt: string, 
    context?: string
  ): Promise<ElementGenerationResult> {
    console.log('🔍 Procesando historia para extraer elementos...');

    // 1. Extraer elementos del prompt
    const extractedElements = await this.extractor.extractElementsFromPrompt(prompt, context);
    
    // 2. Buscar elementos existentes para reutilizar
    const reusedElements = await this.findReusableElements(extractedElements);
    
    // 3. Crear nuevos elementos Y generar sus assets individuales
    const newElements = await this.createNewElementsWithAssets(extractedElements, reusedElements);
    
    // 4. Marcar elementos reutilizados como usados
    this.markElementsAsUsed(reusedElements);

    // 5. DESPUÉS generar imagen compuesta utilizando todos los assets ya creados
    const allCharacters = [...reusedElements.characters, ...newElements.characters];
    const allScenarios = [...reusedElements.scenarios, ...newElements.scenarios];
    const allObjects = [...reusedElements.objects, ...newElements.objects];
    
    const compositeResult = await this.generateCompositeImageFromAssets(
      allCharacters,
      allScenarios,
      allObjects,
      prompt
    );

    // 6. Crear resumen detallado de assets para visualización
    const assetsGenerated = this.createAssetsSummary(
      newElements,
      reusedElements,
      allCharacters,
      allScenarios,
      allObjects,
      prompt
    );

    const result: ElementGenerationResult = {
      extractedElements,
      reusedElements,
      newElements,
      compositeImage: compositeResult?.image,
      compositeDescription: compositeResult?.description,
      assetsGenerated
    };

    console.log(`📚 Assets procesados: ${assetsGenerated.totalAssetsGenerated} nuevos, ${assetsGenerated.totalAssetsReused} reutilizados`);

    return result;
  }

  /**
   * Buscar elementos existentes que puedan reutilizarse
   */
  private async findReusableElements(extracted: ExtractedElements): Promise<{
    characters: StoredCharacter[];
    scenarios: StoredScenario[];
    objects: StoredObject[];
  }> {
    const reused = {
      characters: [] as StoredCharacter[],
      scenarios: [] as StoredScenario[],
      objects: [] as StoredObject[]
    };

    // Buscar personajes similares
    for (const char of extracted.characters) {
      const similarChars = this.library.findSimilarElements(char.name, 'character') as StoredCharacter[];
      
      // Buscar coincidencias exactas o muy similares
      const exactMatch = similarChars.find(stored => 
        stored.name.toLowerCase() === char.name.toLowerCase() ||
        this.calculateSimilarity(stored.name, char.name) > 0.8
      );
      
      if (exactMatch) {
        reused.characters.push(exactMatch);
        console.log(`♻️ Reutilizando personaje: ${exactMatch.name}`);
      }
    }

    // Buscar escenarios similares
    for (const scenario of extracted.scenarios) {
      const similarScenarios = this.library.findSimilarElements(scenario.name, 'scenario') as StoredScenario[];
      
      const exactMatch = similarScenarios.find(stored => 
        stored.name.toLowerCase() === scenario.name.toLowerCase() ||
        this.calculateSimilarity(stored.name, scenario.name) > 0.7
      );
      
      if (exactMatch) {
        reused.scenarios.push(exactMatch);
        console.log(`♻️ Reutilizando escenario: ${exactMatch.name}`);
      }
    }

    // Buscar objetos similares
    for (const obj of extracted.objects) {
      const similarObjects = this.library.findSimilarElements(obj.name, 'object') as StoredObject[];
      
      const exactMatch = similarObjects.find(stored => 
        stored.name.toLowerCase() === obj.name.toLowerCase() ||
        this.calculateSimilarity(stored.name, obj.name) > 0.8
      );
      
      if (exactMatch) {
        reused.objects.push(exactMatch);
        console.log(`♻️ Reutilizando objeto: ${exactMatch.name}`);
      }
    }

    return reused;
  }

  /**
   * Crear nuevos elementos Y generar sus assets individuales
   */
  private async createNewElementsWithAssets(
    extracted: ExtractedElements,
    reused: { characters: StoredCharacter[]; scenarios: StoredScenario[]; objects: StoredObject[]; }
  ): Promise<{
    characters: StoredCharacter[];
    scenarios: StoredScenario[];
    objects: StoredObject[];
  }> {
    const newElements = {
      characters: [] as StoredCharacter[],
      scenarios: [] as StoredScenario[],
      objects: [] as StoredObject[]
    };

    console.log('🎨 Iniciando creación de assets individuales con Nano Banana...');

    // PASO 1: Crear personajes nuevos con sus assets individuales
    for (const char of extracted.characters) {
      const alreadyExists = reused.characters.some(reusedChar => 
        this.calculateSimilarity(reusedChar.name, char.name) > 0.7
      );
      
      if (!alreadyExists) {
        console.log(`✨ Creando personaje: ${char.name} + generando asset individual`);
        
        // Generar tags automáticamente
        const tags = this.library.generateTags(char.name, char.description, 'character');
        
        // Mejorar descripción con IA si es posible
        const enhancement = await this.extractor.enhanceElement(
          char.name,
          'character',
          char.description
        );
        
        // Generar características únicas para reconocimiento
        const uniqueTraits = this.generateUniqueTraits(char.name, char.description, 'character');
        const visualSignature = this.generateVisualSignature(char.name, enhancement?.appearance || char.appearance, 'character');
        
        const newCharacter = this.library.addCharacter({
          name: char.name,
          description: char.description,
          personality: char.personality,
          relationship: 'neutral',
          firstMet: 0, // Se actualizará cuando aparezca en el juego
          interactions: 0,
          relevantTo: [char.role],
          tags: [...tags, ...uniqueTraits],
          appearance: `${enhancement?.appearance || char.appearance}. DISTINCTIVE FEATURES: ${visualSignature}`,
          background: enhancement?.background || `Personaje relacionado con ${char.role}`
        });

        // 🍌 GENERAR ASSET INDIVIDUAL del personaje con Nano Banana
        console.log(`🍌 Generando asset individual para personaje: ${newCharacter.name}`);
        const characterAsset = await this.imageGenerator.generateLibraryElementImage(
          newCharacter.name,
          newCharacter.description,
          'character',
          newCharacter.appearance
        );
        
        if (characterAsset) {
          await this.library.updateElementImage(newCharacter.id, 'character', characterAsset);
          newCharacter.imageUrl = await this.library.getImageUrl(newCharacter.imageUrl || '') || undefined;
          console.log(`✅ Asset del personaje ${newCharacter.name} creado y almacenado`);
        }

        newElements.characters.push(newCharacter);
      }
    }

    // PASO 2: Crear escenarios nuevos con sus assets individuales
    for (const scenario of extracted.scenarios) {
      const alreadyExists = reused.scenarios.some(reusedScenario => 
        this.calculateSimilarity(reusedScenario.name, scenario.name) > 0.7
      );
      
      if (!alreadyExists) {
        console.log(`✨ Creando escenario: ${scenario.name} + generando asset individual`);
        
        const tags = this.library.generateTags(scenario.name, scenario.description, 'scenario');
        
        const enhancement = await this.extractor.enhanceElement(
          scenario.name,
          'scenario',
          scenario.description
        );
        
        // Generar características únicas para el escenario
        const uniqueTraits = this.generateUniqueTraits(scenario.name, scenario.description, 'scenario');
        const visualSignature = this.generateVisualSignature(scenario.name, enhancement?.visualDetails || scenario.visualDetails, 'scenario');
        
        const newScenario = this.library.addScenario({
          name: scenario.name,
          description: scenario.description,
          type: scenario.type,
          riskLevel: 'medium',
          firstEncountered: 0, // Se actualizará cuando aparezca en el juego
          timesVisited: 0,
          relatedCharacters: [],
          relatedObjects: [],
          tags: [...tags, ...uniqueTraits],
          atmosphere: enhancement?.atmosphere || scenario.atmosphere,
          visualDetails: `${enhancement?.visualDetails || scenario.visualDetails}. DISTINCTIVE FEATURES: ${visualSignature}`
        });

        // 🍌 GENERAR ASSET INDIVIDUAL del escenario con Nano Banana
        console.log(`🍌 Generando asset individual para escenario: ${newScenario.name}`);
        const scenarioAsset = await this.imageGenerator.generateLibraryElementImage(
          newScenario.name,
          newScenario.description,
          'scenario',
          newScenario.visualDetails
        );
        
        if (scenarioAsset) {
          await this.library.updateElementImage(newScenario.id, 'scenario', scenarioAsset);
          newScenario.imageUrl = await this.library.getImageUrl(newScenario.imageUrl || '') || undefined;
          console.log(`✅ Asset del escenario ${newScenario.name} creado y almacenado`);
        }

        newElements.scenarios.push(newScenario);
      }
    }

    // PASO 3: Crear objetos nuevos con sus assets individuales
    for (const obj of extracted.objects) {
      const alreadyExists = reused.objects.some(reusedObj => 
        this.calculateSimilarity(reusedObj.name, obj.name) > 0.8
      );
      
      if (!alreadyExists) {
        console.log(`✨ Creando objeto: ${obj.name} + generando asset individual`);
        
        const tags = this.library.generateTags(obj.name, obj.description, 'object');
        
        const enhancement = await this.extractor.enhanceElement(
          obj.name,
          'object',
          obj.description
        );
        
        // Generar características únicas para el objeto
        const uniqueTraits = this.generateUniqueTraits(obj.name, obj.description, 'object');
        const visualSignature = this.generateVisualSignature(obj.name, enhancement?.appearance || obj.appearance, 'object');
        
        const newObject = this.library.addObject({
          name: obj.name,
          description: obj.description,
          type: obj.type,
          value: this.estimateObjectValue(obj.importance),
          usefulness: `Relacionado con ${obj.description}`,
          obtainedOn: 0, // Se actualizará cuando aparezca en el juego
          usedCount: 0,
          tags: [...tags, ...uniqueTraits],
          appearance: `${enhancement?.appearance || obj.appearance}. DISTINCTIVE FEATURES: ${visualSignature}`,
          story: enhancement?.story || `Objeto importante en la historia`
        });

        // 🍌 GENERAR ASSET INDIVIDUAL del objeto con Nano Banana
        console.log(`🍌 Generando asset individual para objeto: ${newObject.name}`);
        const objectAsset = await this.imageGenerator.generateLibraryElementImage(
          newObject.name,
          newObject.description,
          'object',
          newObject.appearance
        );
        
        if (objectAsset) {
          await this.library.updateElementImage(newObject.id, 'object', objectAsset);
          newObject.imageUrl = await this.library.getImageUrl(newObject.imageUrl || '') || undefined;
          console.log(`✅ Asset del objeto ${newObject.name} creado y almacenado`);
        }

        newElements.objects.push(newObject);
      }
    }

    console.log(`🎨 Assets individuales completados: ${newElements.characters.length} personajes, ${newElements.scenarios.length} escenarios, ${newElements.objects.length} objetos`);
    
    return newElements;
  }

  /**
   * Generar imagen compuesta utilizando los assets ya creados
   */
  private async generateCompositeImageFromAssets(
    characters: StoredCharacter[],
    scenarios: StoredScenario[],
    objects: StoredObject[],
    originalPrompt: string
  ): Promise<{ image?: string; description: string } | undefined> {
    if (characters.length === 0 && scenarios.length === 0 && objects.length === 0) {
      console.log('🎨 No hay elementos para imagen compuesta, saltando...');
      return undefined;
    }

    console.log('🎨 Generando escena compuesta usando assets ya creados...');

    // Recopilar información de assets existentes
    const availableAssets = {
      characters: characters.filter(char => char.imageUrl).map(char => ({
        name: char.name,
        assetUrl: char.imageUrl!,
        appearance: char.appearance || char.description
      })),
      scenarios: scenarios.filter(scenario => scenario.imageUrl).map(scenario => ({
        name: scenario.name,
        assetUrl: scenario.imageUrl!,
        visualDetails: scenario.visualDetails || scenario.description,
        atmosphere: scenario.atmosphere || 'neutral atmosphere'
      })),
      objects: objects.filter(obj => obj.imageUrl && (obj.value > 50 || obj.type === 'money' || obj.type === 'weapon')).map(obj => ({
        name: obj.name,
        assetUrl: obj.imageUrl!,
        appearance: obj.appearance || obj.description
      }))
    };

    console.log(`🍌 Assets disponibles para composición: ${availableAssets.characters.length} personajes, ${availableAssets.scenarios.length} escenarios, ${availableAssets.objects.length} objetos`);

    // Preparar datos para composición (con referencia a assets)
    const characterData = characters.map(char => ({
      name: char.name,
      appearance: char.appearance || char.description,
      hasAsset: !!char.imageUrl
    }));

    const scenarioData = scenarios.map(scenario => ({
      name: scenario.name,
      visualDetails: scenario.visualDetails || scenario.description,
      atmosphere: scenario.atmosphere || 'neutral atmosphere',
      hasAsset: !!scenario.imageUrl
    }));

    const objectData = objects
      .filter(obj => obj.value > 50 || obj.type === 'money' || obj.type === 'weapon')
      .map(obj => ({
        name: obj.name,
        appearance: obj.appearance || obj.description,
        hasAsset: !!obj.imageUrl
      }));

    // 🍌 Generar imagen compuesta que combine los assets existentes
    console.log('🍌 Nano Banana: Componiendo escena final usando assets individuales...');
    const compositeImage = await this.imageGenerator.generateCompositeSceneImage(
      characterData,
      scenarioData,
      objectData,
      `${originalPrompt} - Componer usando assets existentes de personajes y escenarios ya creados`,
      this.determineMood(originalPrompt)
    );

    // Crear descripción detallada de la escena
    const sceneDescription = this.generateSceneDescription(characters, scenarios, objects, originalPrompt);

    if (compositeImage) {
      console.log('🎨✅ Escena compuesta generada exitosamente usando assets existentes');
      return { image: compositeImage, description: sceneDescription };
    } else {
      console.log('⚠️ No se pudo generar escena compuesta, pero assets individuales están disponibles');
      return { description: sceneDescription };
    }
  }

  /**
   * Marcar elementos como usados para estadísticas
   */
  private markElementsAsUsed(reused: {
    characters: StoredCharacter[];
    scenarios: StoredScenario[];
    objects: StoredObject[];
  }): void {
    reused.characters.forEach(char => {
      this.library.markAsUsed(char.id, 'character');
    });

    reused.scenarios.forEach(scenario => {
      this.library.markAsUsed(scenario.id, 'scenario');
    });

    reused.objects.forEach(obj => {
      this.library.markAsUsed(obj.id, 'object');
    });
  }

  /**
   * Calcular similaridad entre dos strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calcular distancia de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Estimar valor de objeto basado en importancia
   */
  private estimateObjectValue(importance: 'low' | 'medium' | 'high'): number {
    switch (importance) {
      case 'low': return Math.floor(Math.random() * 20) + 5;
      case 'medium': return Math.floor(Math.random() * 100) + 25;
      case 'high': return Math.floor(Math.random() * 500) + 100;
      default: return 10;
    }
  }

  /**
   * Determinar hora del día basada en atmósfera
   */
  private determineTimeOfDay(atmosphere: string): string {
    const lowerAtmosphere = atmosphere.toLowerCase();
    
    if (lowerAtmosphere.includes('noche') || lowerAtmosphere.includes('oscuro')) {
      return 'night';
    } else if (lowerAtmosphere.includes('mañana') || lowerAtmosphere.includes('amanecer')) {
      return 'morning';
    } else if (lowerAtmosphere.includes('tarde') || lowerAtmosphere.includes('atardecer')) {
      return 'evening';
    }
    
    return 'day';
  }

  /**
   * Determinar mood para la imagen basado en el prompt
   */
  private determineMood(prompt: string): 'dramatic' | 'tense' | 'hopeful' | 'mysterious' | 'exciting' {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('peligro') || lowerPrompt.includes('miedo') || lowerPrompt.includes('amenaza')) {
      return 'tense';
    } else if (lowerPrompt.includes('éxito') || lowerPrompt.includes('ganar') || lowerPrompt.includes('esperanza')) {
      return 'hopeful';
    } else if (lowerPrompt.includes('misterio') || lowerPrompt.includes('secreto') || lowerPrompt.includes('oculto')) {
      return 'mysterious';
    } else if (lowerPrompt.includes('acción') || lowerPrompt.includes('rápido') || lowerPrompt.includes('correr')) {
      return 'exciting';
    }
    
    return 'dramatic';
  }

  /**
   * Obtener estadísticas de la biblioteca
   */
  public getLibraryStats() {
    return this.library.getStats();
  }

  /**
   * Obtener biblioteca completa
   */
  public getLibrary() {
    return this.library.getLibrary();
  }

  /**
   * Buscar elementos en la biblioteca
   */
  public searchLibrary(query: string) {
    return {
      characters: this.library.findSimilarElements(query, 'character'),
      scenarios: this.library.findSimilarElements(query, 'scenario'),
      objects: this.library.findSimilarElements(query, 'object')
    };
  }

  /**
   * Limpiar biblioteca de elementos no utilizados
   */
  public async cleanupLibrary(days: number = 30) {
    await this.library.cleanupLibrary(days);
  }

  /**
   * Generar características únicas para reconocimiento durante la historia
   */
  private generateUniqueTraits(name: string, description: string, type: 'character' | 'scenario' | 'object'): string[] {
    const traits: string[] = [];
    const lowerName = name.toLowerCase();
    const lowerDesc = description.toLowerCase();

    // Características base por tipo
    switch (type) {
      case 'character':
        // Generar traits únicos para personajes
        if (lowerDesc.includes('joven')) traits.push('joven');
        if (lowerDesc.includes('mayor') || lowerDesc.includes('viejo')) traits.push('experimentado');
        if (lowerDesc.includes('alto')) traits.push('imponente');
        if (lowerDesc.includes('pequeño') || lowerDesc.includes('bajo')) traits.push('compacto');
        if (lowerDesc.includes('elegante') || lowerDesc.includes('traje')) traits.push('formal');
        if (lowerDesc.includes('casual')) traits.push('relajado');
        
        // Agregar profesión como trait
        if (lowerDesc.includes('chef')) traits.push('culinario');
        if (lowerDesc.includes('estudiante')) traits.push('académico');
        if (lowerDesc.includes('vendedor')) traits.push('comercial');
        if (lowerDesc.includes('artista')) traits.push('creativo');
        break;

      case 'scenario':
        // Generar traits únicos para escenarios
        if (lowerDesc.includes('bullicioso') || lowerDesc.includes('activo')) traits.push('dinámico');
        if (lowerDesc.includes('tranquilo') || lowerDesc.includes('silencioso')) traits.push('sereno');
        if (lowerDesc.includes('elegante') || lowerDesc.includes('lujoso')) traits.push('sofisticado');
        if (lowerDesc.includes('moderno')) traits.push('contemporáneo');
        if (lowerDesc.includes('antiguo') || lowerDesc.includes('clásico')) traits.push('tradicional');
        if (lowerDesc.includes('pequeño')) traits.push('íntimo');
        if (lowerDesc.includes('grande') || lowerDesc.includes('amplio')) traits.push('espacioso');
        break;

      case 'object':
        // Generar traits únicos para objetos
        if (lowerDesc.includes('antiguo') || lowerDesc.includes('viejo')) traits.push('vintage');
        if (lowerDesc.includes('nuevo') || lowerDesc.includes('moderno')) traits.push('contemporáneo');
        if (lowerDesc.includes('valioso') || lowerDesc.includes('caro')) traits.push('preciado');
        if (lowerDesc.includes('único') || lowerDesc.includes('raro')) traits.push('exclusivo');
        if (lowerDesc.includes('útil') || lowerDesc.includes('práctico')) traits.push('funcional');
        break;
    }

    // Generar trait único basado en el nombre
    const nameHash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const uniqueTraits = [
      'memorable', 'distintivo', 'especial', 'notable', 'característico', 
      'particular', 'singular', 'único', 'reconocible', 'emblemático'
    ];
    traits.push(uniqueTraits[nameHash % uniqueTraits.length]);

    return traits.slice(0, 3); // Máximo 3 traits
  }

  /**
   * Generar firma visual distintiva para Nano Banana
   */
  private generateVisualSignature(name: string, appearance: string, type: 'character' | 'scenario' | 'object'): string {
    const signatures: Record<string, string[]> = {
      character: [
        'distinctive scar on left cheek',
        'unique green eyes that stand out',
        'always wears a specific red scarf',
        'has a distinctive laugh wrinkle',
        'characteristic confident posture',
        'unique hand gesture when talking',
        'distinctive silver ring on right hand',
        'memorable curly hair texture',
        'specific way of tilting head when listening',
        'unique freckle pattern on nose'
      ],
      scenario: [
        'distinctive blue lighting in corners',
        'unique vintage clock on the wall',
        'characteristic worn wooden floor pattern',
        'specific plants by the entrance',
        'memorable red door with brass handle',
        'distinctive window arrangement',
        'unique ceiling fan design',
        'characteristic stone texture on walls',
        'specific graffiti art on one corner',
        'memorable chipped paint pattern'
      ],
      object: [
        'distinctive golden trim around edges',
        'unique scratches that form a pattern',
        'characteristic worn leather texture',
        'specific engravings on the surface',
        'memorable rust spots in corner',
        'distinctive purple ribbon attached',
        'unique geometric pattern engraved',
        'characteristic aged bronze color',
        'specific manufacturer logo visible',
        'memorable dent on the left side'
      ]
    };

    // Seleccionar firma basada en el nombre para consistencia
    const nameHash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const typeSignatures = signatures[type];
    return typeSignatures[nameHash % typeSignatures.length];
  }

  /**
   * Crear resumen detallado de assets para visualización
   */
  private createAssetsSummary(
    newElements: { characters: StoredCharacter[]; scenarios: StoredScenario[]; objects: StoredObject[]; },
    reusedElements: { characters: StoredCharacter[]; scenarios: StoredScenario[]; objects: StoredObject[]; },
    allCharacters: StoredCharacter[],
    allScenarios: StoredScenario[],
    allObjects: StoredObject[],
    originalPrompt: string
  ): AssetGenerationSummary {
    
    const newAssets: AssetInfo[] = [
      ...newElements.characters.map(char => this.createAssetInfo(char, 'character')),
      ...newElements.scenarios.map(scenario => this.createAssetInfo(scenario, 'scenario')),
      ...newElements.objects.map(obj => this.createAssetInfo(obj, 'object'))
    ];

    const reusedAssets: AssetInfo[] = [
      ...reusedElements.characters.map(char => this.createAssetInfo(char, 'character')),
      ...reusedElements.scenarios.map(scenario => this.createAssetInfo(scenario, 'scenario')),
      ...reusedElements.objects.map(obj => this.createAssetInfo(obj, 'object'))
    ];

    return {
      totalAssetsGenerated: newAssets.length,
      totalAssetsReused: reusedAssets.length,
      newAssets,
      reusedAssets,
      sceneComposition: {
        description: this.generateSceneDescription(allCharacters, allScenarios, allObjects, originalPrompt),
        elements: [
          ...allCharacters.map(c => `${c.name} (personaje)`),
          ...allScenarios.map(s => `${s.name} (escenario)`),
          ...allObjects.map(o => `${o.name} (objeto)`)
        ],
        mood: this.determineMood(originalPrompt)
      }
    };
  }

  /**
   * Crear información de asset para visualización
   */
  private createAssetInfo(element: StoredCharacter | StoredScenario | StoredObject, type: 'character' | 'scenario' | 'object'): AssetInfo {
    const baseInfo = {
      id: element.id,
      name: element.name,
      type,
      description: element.description,
      imageUrl: element.imageUrl,
      createdAt: element.createdAt,
      lastUsed: element.lastUsed,
      usageCount: element.usageCount
    };

    // Extraer traits únicos de los tags
    const uniqueTraits = element.tags.filter(tag => 
      ['memorable', 'distintivo', 'especial', 'notable', 'característico', 
       'particular', 'singular', 'único', 'reconocible', 'emblemático'].includes(tag)
    );

    // Extraer firma visual de la apariencia
    let visualSignature = 'Sin características distintivas especificadas';
    if ('appearance' in element && element.appearance) {
      const signatureMatch = element.appearance.match(/DISTINCTIVE FEATURES: (.+)/);
      if (signatureMatch) {
        visualSignature = signatureMatch[1];
      }
    } else if ('visualDetails' in element && element.visualDetails) {
      const signatureMatch = element.visualDetails.match(/DISTINCTIVE FEATURES: (.+)/);
      if (signatureMatch) {
        visualSignature = signatureMatch[1];
      }
    }

    return {
      ...baseInfo,
      uniqueTraits,
      visualSignature
    };
  }

  /**
   * Generar descripción detallada de la escena compuesta
   */
  private generateSceneDescription(
    characters: StoredCharacter[],
    scenarios: StoredScenario[],
    objects: StoredObject[],
    originalPrompt: string
  ): string {
    let description = '🎬 Escena Compuesta:\n\n';

    // Describir el escenario principal
    if (scenarios.length > 0) {
      const mainScenario = scenarios[0];
      description += `📍 Ubicación: ${mainScenario.name}\n`;
      description += `   ${mainScenario.description}\n`;
      description += `   Atmósfera: ${mainScenario.atmosphere}\n\n`;
    }

    // Describir personajes presentes
    if (characters.length > 0) {
      description += `👥 Personajes en escena:\n`;
      characters.forEach(char => {
        description += `   • ${char.name}: ${char.description}\n`;
        if (char.personality) {
          description += `     Personalidad: ${char.personality}\n`;
        }
      });
      description += '\n';
    }

    // Describir objetos importantes
    if (objects.length > 0) {
      const importantObjects = objects.filter(obj => obj.value > 50 || obj.type === 'money' || obj.type === 'weapon');
      if (importantObjects.length > 0) {
        description += `📦 Objetos destacados:\n`;
        importantObjects.forEach(obj => {
          description += `   • ${obj.name}: ${obj.description}\n`;
        });
        description += '\n';
      }
    }

    // Contexto de la acción
    description += `🎭 Contexto: ${originalPrompt}\n`;
    description += `🎨 Mood: ${this.determineMood(originalPrompt)}`;

    return description;
  }

  /**
   * Limpiar todos los assets existentes
   */
  public async clearAllAssets(): Promise<{
    indexedDBCleared: boolean;
    localStorageCleared: boolean;
    totalAssetsRemoved: number;
  }> {
    console.log('🗑️ ElementManager: Iniciando limpieza completa de assets...');
    const result = await this.library.clearAllAssets();
    console.log(`🧹 ElementManager: Limpieza completa: ${result.totalAssetsRemoved} assets eliminados`);
    return result;
  }

  /**
   * Limpiar solo assets de IndexedDB
   */
  public async clearIndexedDBAssets(): Promise<number> {
    console.log('🗑️ ElementManager: Limpiando assets de IndexedDB...');
    const removed = await this.library.clearIndexedDBAssets();
    console.log(`🧹 ElementManager: ${removed} assets eliminados de IndexedDB`);
    return removed;
  }

  /**
   * Limpiar TODA la biblioteca de elementos
   */
  public clearCompleteLibrary(): {
    charactersRemoved: number;
    scenariosRemoved: number;
    objectsRemoved: number;
    totalRemoved: number;
  } {
    console.log('🗑️ ElementManager: Limpiando biblioteca completa...');
    const result = this.library.clearCompleteLibrary();
    console.log(`🧹 ElementManager: ${result.totalRemoved} elementos eliminados de la biblioteca`);
    return result;
  }

  /**
   * Reset completo del sistema (biblioteca + assets)
   */
  public async resetCompleteSystem(): Promise<{
    libraryStats: {
      charactersRemoved: number;
      scenariosRemoved: number;
      objectsRemoved: number;
      totalRemoved: number;
    };
    assetStats: {
      indexedDBCleared: boolean;
      localStorageCleared: boolean;
      totalAssetsRemoved: number;
    };
  }> {
    console.log('🔄 ElementManager: Iniciando reset completo del sistema...');
    const result = await this.library.resetCompleteSystem();
    console.log(`🧹 ElementManager: Reset completo - ${result.libraryStats.totalRemoved} elementos + ${result.assetStats.totalAssetsRemoved} assets eliminados`);
    return result;
  }
}
