import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const db = getDatabase();
    
    const sessionSummary = await db.getSessionSummary(sessionId);
    
    if (!sessionSummary) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      sessionSummary,
      message: 'Resumen de sesión cargado exitosamente' 
    });
  } catch (error) {
    console.error('Error obteniendo resumen de sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const db = getDatabase();
    
    // Verificar que la sesión existe antes de eliminarla
    const session = await db.getGameSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' }, 
        { status: 404 }
      );
    }
    
    await db.deleteSession(sessionId);
    
    return NextResponse.json({ 
      message: 'Sesión eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error eliminando sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
