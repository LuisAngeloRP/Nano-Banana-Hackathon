import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const sessions = await db.getSessionHistory(50); // Obtener últimas 50 sesiones
    
    return NextResponse.json({ 
      sessions,
      message: 'Historial cargado exitosamente' 
    });
  } catch (error) {
    console.error('Error obteniendo historial de sesiones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
