import { ElementExtractor } from './elementExtractor';
import { ElementLibraryManager } from './elementLibrary';
import { ImageGenerator } from './imageGenerator';
import { 
  ExtractedElements, 
  ElementGenerationResult, 
  StoredCharacter, 
  StoredScenario, 
  StoredObject 
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
    
    // 3. Crear nuevos elementos para los que no se encontraron coincidencias
    const newElements = await this.createNewElements(extractedElements, reusedElements);
    
    // 4. Generar imagen compuesta de todos los elementos
    const compositeImage = await this.generateCompositeImage(
      [...reusedElements.characters, ...newElements.characters],
      [...reusedElements.scenarios, ...newElements.scenarios],
      [...reusedElements.objects, ...newElements.objects],
      prompt
    );

    // 5. Marcar elementos reutilizados como usados
    this.markElementsAsUsed(reusedElements);

    const result: ElementGenerationResult = {
      extractedElements,
      reusedElements,
      newElements,
      compositeImage
    };

    console.log(`📚 Resultado: ${newElements.characters.length} personajes nuevos, ${newElements.scenarios.length} escenarios nuevos, ${newElements.objects.length} objetos nuevos`);
    console.log(`♻️ Reutilizados: ${reusedElements.characters.length} personajes, ${reusedElements.scenarios.length} escenarios, ${reusedElements.objects.length} objetos`);

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
   * Crear nuevos elementos para los que no se encontraron coincidencias
   */
  private async createNewElements(
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

    // Crear personajes nuevos
    for (const char of extracted.characters) {
      const alreadyExists = reused.characters.some(reusedChar => 
        this.calculateSimilarity(reusedChar.name, char.name) > 0.7
      );
      
      if (!alreadyExists) {
        console.log(`✨ Creando nuevo personaje: ${char.name}`);
        
        // Generar tags automáticamente
        const tags = this.library.generateTags(char.name, char.description, 'character');
        
        // Mejorar descripción con IA si es posible
        const enhancement = await this.extractor.enhanceElement(
          char.name,
          'character',
          char.description
        );
        
        const newCharacter = this.library.addCharacter({
          name: char.name,
          description: char.description,
          personality: char.personality,
          relationship: 'neutral',
          relevantTo: [char.role],
          tags,
          appearance: enhancement?.appearance || char.appearance,
          background: enhancement?.background || `Personaje relacionado con ${char.role}`
        });

        // Generar imagen individual del personaje
        if (newCharacter.appearance) {
          const characterImage = await this.imageGenerator.generateCharacterImage(
            newCharacter.name,
            newCharacter.appearance,
            "urban environment"
          );
          
          if (characterImage) {
            this.library.updateElementImage(newCharacter.id, 'character', characterImage);
            newCharacter.imageUrl = characterImage;
          }
        }

        newElements.characters.push(newCharacter);
      }
    }

    // Crear escenarios nuevos
    for (const scenario of extracted.scenarios) {
      const alreadyExists = reused.scenarios.some(reusedScenario => 
        this.calculateSimilarity(reusedScenario.name, scenario.name) > 0.7
      );
      
      if (!alreadyExists) {
        console.log(`✨ Creando nuevo escenario: ${scenario.name}`);
        
        const tags = this.library.generateTags(scenario.name, scenario.description, 'scenario');
        
        const enhancement = await this.extractor.enhanceElement(
          scenario.name,
          'scenario',
          scenario.description
        );
        
        const newScenario = this.library.addScenario({
          name: scenario.name,
          description: scenario.description,
          type: scenario.type,
          riskLevel: 'medium',
          tags,
          atmosphere: enhancement?.atmosphere || scenario.atmosphere,
          visualDetails: enhancement?.visualDetails || scenario.visualDetails
        });

        // Generar imagen del escenario
        if (newScenario.visualDetails) {
          const scenarioImage = await this.imageGenerator.generateLocationImage(
            newScenario.name,
            newScenario.visualDetails,
            this.determineTimeOfDay(newScenario.atmosphere)
          );
          
          if (scenarioImage) {
            this.library.updateElementImage(newScenario.id, 'scenario', scenarioImage);
            newScenario.imageUrl = scenarioImage;
          }
        }

        newElements.scenarios.push(newScenario);
      }
    }

    // Crear objetos nuevos
    for (const obj of extracted.objects) {
      const alreadyExists = reused.objects.some(reusedObj => 
        this.calculateSimilarity(reusedObj.name, obj.name) > 0.8
      );
      
      if (!alreadyExists) {
        console.log(`✨ Creando nuevo objeto: ${obj.name}`);
        
        const tags = this.library.generateTags(obj.name, obj.description, 'object');
        
        const enhancement = await this.extractor.enhanceElement(
          obj.name,
          'object',
          obj.description
        );
        
        const newObject = this.library.addObject({
          name: obj.name,
          description: obj.description,
          type: obj.type,
          value: this.estimateObjectValue(obj.importance),
          usefulness: `Relacionado con ${obj.description}`,
          tags,
          appearance: enhancement?.appearance || obj.appearance,
          story: enhancement?.story || `Objeto importante en la historia`
        });

        newElements.objects.push(newObject);
      }
    }

    return newElements;
  }

  /**
   * Generar imagen compuesta que incluye todos los elementos relevantes
   */
  private async generateCompositeImage(
    characters: StoredCharacter[],
    scenarios: StoredScenario[],
    objects: StoredObject[],
    originalPrompt: string
  ): Promise<string | undefined> {
    if (characters.length === 0 && scenarios.length === 0 && objects.length === 0) {
      return undefined;
    }

    console.log('🎨 Generando imagen compuesta con todos los elementos...');

    // Preparar datos para el nuevo método de imagen compuesta
    const characterData = characters.map(char => ({
      name: char.name,
      appearance: char.appearance || char.description
    }));

    const scenarioData = scenarios.map(scenario => ({
      name: scenario.name,
      visualDetails: scenario.visualDetails || scenario.description,
      atmosphere: scenario.atmosphere || 'neutral atmosphere'
    }));

    const objectData = objects
      .filter(obj => obj.value > 50 || obj.type === 'money' || obj.type === 'weapon')
      .map(obj => ({
        name: obj.name,
        appearance: obj.appearance || obj.description
      }));

    // Generar la imagen compuesta usando el nuevo método especializado
    const compositeImage = await this.imageGenerator.generateCompositeSceneImage(
      characterData,
      scenarioData,
      objectData,
      originalPrompt,
      this.determineMood(originalPrompt)
    );

    if (compositeImage) {
      console.log('🎨 Imagen compuesta generada exitosamente');
    }

    return compositeImage || undefined;
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
  public cleanupLibrary(days: number = 30) {
    this.library.cleanupLibrary(days);
  }
}
