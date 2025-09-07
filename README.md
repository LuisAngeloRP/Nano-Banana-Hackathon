# 🎮 Historias Evolutivas

Un juego narrativo evolutivo donde cada historia se construye con inteligencia artificial, manteniendo memoria persistente y coherencia del mundo del juego.

## 🌟 Características

- **Narrativas Evolutivas**: Historias que evolucionan dinámicamente usando Gemini AI
- **Memoria Persistente**: El mundo del juego recuerda cada acción y mantiene coherencia
- **Múltiples Escenarios**: Diferentes desafíos narrativos predefinidos
- **Interfaz Moderna**: Diseño elegante con shadcn/ui y Tailwind CSS
- **Base de Datos Local**: SQLite para almacenar progreso y estado del mundo

## 🎯 Escenarios Incluidos

### 1. Conviértete en Millonario con $1
- **Objetivo**: De $1 a millonario en 10 días
- **Restricciones**: Realismo económico, sin magia ni trucos sobrenaturales
- **Mecánicas**: Progreso medible, consecuencias reales

### 2. Encuentra la Cura Zombie
- **Objetivo**: Desarrollar la cura para el virus zombie en 10 días
- **Restricciones**: Recursos limitados, peligros constantes
- **Mecánicas**: Investigación científica, supervivencia, interacciones con NPCs

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **IA**: Google Gemini 1.5 Flash (AI Studio) - Capa gratuita
- **Base de Datos**: SQLite3
- **Styling**: CSS Variables, Gradientes, Animaciones

## 🚀 Instalación y Configuración

### 1. Clona el repositorio
\`\`\`bash
git clone <url-del-repositorio>
cd Nano-Banana-Hackathon
\`\`\`

### 2. Instala las dependencias
\`\`\`bash
npm install
\`\`\`

### 3. Configura las variables de entorno
\`\`\`bash
cp env.example .env.local
\`\`\`

Edita \`.env.local\` y agrega tu API key de Google AI Studio:
\`\`\`
GOOGLE_AI_API_KEY=tu_api_key_aqui
\`\`\`

### 4. Obtén tu API Key de Google AI Studio

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la key y pégala en tu archivo \`.env.local\`

### 5. Ejecuta el proyecto
\`\`\`bash
npm run dev
\`\`\`

El juego estará disponible en \`http://localhost:3000\`

## 🎮 Cómo Jugar

1. **Selecciona un Escenario**: Elige entre los desafíos disponibles
2. **Lee la Introducción**: Cada escenario tiene reglas y contexto específico
3. **Describe tus Acciones**: Escribe en lenguaje natural lo que quieres hacer
4. **Evoluciona la Historia**: La IA responde manteniendo coherencia con el mundo
5. **Progresa por Días**: Cada acción significativa puede avanzar el tiempo
6. **Completa el Desafío**: Alcanza tu objetivo antes de que se acabe el tiempo

## 🏗️ Arquitectura del Sistema

### Base de Datos
- **scenarios**: Escenarios de juego disponibles
- **game_sessions**: Sesiones activas de juego
- **story_entries**: Historial completo de la narrativa
- **game_worlds**: Estado persistente del mundo (personajes, objetos, reglas)

### Componentes Principales
- **GameMenu**: Selección de escenarios
- **GameChat**: Interfaz principal de chat
- **Database**: Gestión de SQLite
- **GeminiService**: Integración con IA

### Flujo de Datos
1. Usuario selecciona escenario → Crea sesión
2. Usuario envía acción → Consulta historial y estado del mundo
3. IA procesa con contexto completo → Genera respuesta coherente
4. Sistema actualiza estado del mundo → Persiste cambios
5. Respuesta se muestra al usuario → Ciclo se repite

## 🤖 Sistema de IA

### Contexto Evolutivo
- **Historial Completo**: Últimas 20 interacciones para contexto
- **Estado del Mundo**: Personajes, objetos, ubicaciones, reglas
- **Reglas del Escenario**: Restricciones específicas de cada desafío
- **Día Actual**: Progresión temporal del juego

### Prompts Inteligentes
- **Inicial**: Establece el mundo y las reglas base
- **Contextual**: Incluye estado actual y historial relevante
- **Estructurado**: Respuestas en JSON para procesamiento

### Memoria Persistente
- **Personajes**: Desarrollo y relaciones evolutivas
- **Objetos**: Creación, modificación y destrucción
- **Reglas**: Mecánicas emergentes del mundo
- **Estado**: Variables del juego en tiempo real

## 🔧 Personalización

### Agregar Nuevos Escenarios
1. Modifica \`src/lib/database.ts\` en la función \`insertInitialScenarios\`
2. Define título, descripción, reglas y prompt inicial
3. Especifica la duración máxima en días

### Modificar la IA
- Ajusta parámetros en \`src/lib/gemini.ts\`
- Modifica prompts para diferentes estilos narrativos
- Cambia la estructura de respuestas JSON

### Personalizar UI
- Modifica componentes en \`src/components/\`
- Ajusta estilos en \`src/app/globals.css\`
- Cambia colores en \`tailwind.config.js\`

## 📁 Estructura del Proyecto

\`\`\`
src/
├── app/
│   ├── api/chat/route.ts      # API para chat y gestión de sesiones
│   ├── layout.tsx             # Layout principal
│   ├── page.tsx               # Página home
│   └── globals.css            # Estilos globales
├── components/
│   ├── ui/                    # Componentes shadcn/ui
│   ├── GameChat.tsx           # Interfaz principal del juego
│   └── GameMenu.tsx           # Menú de selección
├── lib/
│   ├── database.ts            # Gestión de SQLite
│   ├── gemini.ts              # Servicio de IA
│   └── utils.ts               # Utilidades
└── types/
    └── game.ts                # Definiciones de tipos
\`\`\`

## 🚀 Características Avanzadas

### Sistema de Días
- Progresión temporal basada en acciones significativas
- Límite de tiempo para crear urgencia narrativa
- Eventos que pueden acelerar o ralentizar el tiempo

### Coherencia del Mundo
- Reglas emergentes basadas en acciones del jugador
- Personajes con memoria y desarrollo
- Consecuencias persistentes de las decisiones

### Narrativa Inteligente
- Respuestas contextualmente apropiadas
- Adaptación al estilo del jugador
- Manejo de acciones inválidas o contradictorias

## 🎯 Próximas Mejoras

- [ ] Múltiples finales basados en decisiones
- [ ] Sistema de logros y estadísticas
- [ ] Modo multijugador colaborativo
- [ ] Generación procedural de escenarios
- [ ] Exportación de historias completadas
- [ ] Integración con más modelos de IA

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver \`LICENSE\` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

**¡Disfruta creando historias únicas e irrepetibles!** 🎭✨