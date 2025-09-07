/**
 * Servicio centralizado para registrar el uso de IA
 */

export type AIType = 'texto' | 'imagen' | 'audio' | 'video';

export interface AIUsageLog {
  timestamp: Date;
  aiType: AIType;
  model: string;
  provider: string;
  operation: string;
  success: boolean;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AILogger {
  private static instance: AILogger;
  private logs: AIUsageLog[] = [];

  private constructor() {}

  public static getInstance(): AILogger {
    if (!AILogger.instance) {
      AILogger.instance = new AILogger();
    }
    return AILogger.instance;
  }

  /**
   * Registra el uso de una IA
   */
  public logAIUsage(log: Omit<AIUsageLog, 'timestamp'>): void {
    const fullLog: AIUsageLog = {
      ...log,
      timestamp: new Date()
    };

    this.logs.push(fullLog);

    // Imprimir el log en consola con formato colorido
    this.printLog(fullLog);
  }

  /**
   * Imprime un log en consola con formato atractivo
   */
  private printLog(log: AIUsageLog): void {
    const time = log.timestamp.toLocaleTimeString();
    const aiTypeEmoji = this.getAITypeEmoji(log.aiType);
    const statusEmoji = log.success ? '✅' : '❌';
    
    console.log(
      `${aiTypeEmoji} [${time}] ${statusEmoji} IA ${log.aiType.toUpperCase()} usada`,
      {
        Proveedor: log.provider,
        Modelo: log.model,
        Operación: log.operation,
        Duración: log.duration ? `${log.duration}ms` : 'N/A',
        ...(log.errorMessage && { Error: log.errorMessage }),
        ...(log.metadata && { Metadata: log.metadata })
      }
    );
  }

  /**
   * Obtiene el emoji correspondiente al tipo de IA
   */
  private getAITypeEmoji(aiType: AIType): string {
    const emojis = {
      texto: '🤖',
      imagen: '🎨',
      audio: '🎵',
      video: '🎬'
    };
    return emojis[aiType] || '🔮';
  }

  /**
   * Wrapper para ejecutar y medir el tiempo de una operación de IA
   */
  public async measureAIOperation<T>(
    aiType: AIType,
    model: string,
    provider: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.logAIUsage({
        aiType,
        model,
        provider,
        operation,
        success: true,
        duration,
        metadata
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logAIUsage({
        aiType,
        model,
        provider,
        operation,
        success: false,
        duration,
        errorMessage,
        metadata
      });
      
      throw error;
    }
  }

  /**
   * Obtiene todos los logs
   */
  public getLogs(): AIUsageLog[] {
    return [...this.logs];
  }

  /**
   * Obtiene estadísticas de uso
   */
  public getUsageStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    byAIType: Record<AIType, number>;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
  } {
    const stats = {
      totalCalls: this.logs.length,
      successfulCalls: this.logs.filter(log => log.success).length,
      failedCalls: this.logs.filter(log => !log.success).length,
      averageDuration: 0,
      byAIType: {} as Record<AIType, number>,
      byProvider: {} as Record<string, number>,
      byModel: {} as Record<string, number>
    };

    if (this.logs.length === 0) return stats;

    // Calcular duración promedio
    const durationsWithTime = this.logs.filter(log => log.duration);
    if (durationsWithTime.length > 0) {
      stats.averageDuration = durationsWithTime.reduce((sum, log) => sum + (log.duration || 0), 0) / durationsWithTime.length;
    }

    // Contar por tipo de IA
    this.logs.forEach(log => {
      stats.byAIType[log.aiType] = (stats.byAIType[log.aiType] || 0) + 1;
      stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
      stats.byModel[log.model] = (stats.byModel[log.model] || 0) + 1;
    });

    return stats;
  }

  /**
   * Limpia los logs
   */
  public clearLogs(): void {
    this.logs = [];
    console.log('🧹 Logs de IA limpiados');
  }
}

// Exportar instancia singleton
export const aiLogger = AILogger.getInstance();
