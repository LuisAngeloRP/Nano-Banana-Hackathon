# 💰 De $1 a Millonario

Un juego narrativo donde tienes 10 días para convertir $1 en la mayor cantidad de dinero posible usando IA generativa.

## 🎯 Concepto del Juego

- **Objetivo**: Convertir $1 en la mayor cantidad de dinero en 10 días
- **Mecánica**: Máximo 3 acciones por día
- **IA Narrativa**: Historia generada dinámicamente
- **Elementos Persistentes**: Personajes, lugares y objetos se guardan y reutilizan
- **Múltiples Finales**: Millonario, quebrado, buscado por la policía, etc.

## 🛠️ Tecnologías Utilizadas

- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Google AI Studio** - Generación de narrativa (Gemini)
- **Nano Banana** - Generación de imágenes (Google AI)
- **ElevenLabs** - Generación de audio (próximamente)

## 🚀 Instalación y Configuración

### 1. Clonar y configurar el proyecto

\`\`\`bash
cd money-game
npm install
\`\`\`

### 2. Configurar variables de entorno

Crea un archivo \`.env.local\` en la raíz del proyecto:

\`\`\`env
# Google AI Studio API Key - Para generación de texto y Nano Banana
NEXT_PUBLIC_GOOGLE_AI_API_KEY=tu_clave_de_google_ai_aqui

# ElevenLabs API Key - Para síntesis de voz (opcional)
ELEVENLABS_API_KEY=tu_clave_de_elevenlabs_aqui
\`\`\`

### 3. Obtener las claves de API

#### Google AI Studio - Para Narrativa y Nano Banana
1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. Crea una nueva API key
3. Copia la clave en \`NEXT_PUBLIC_GOOGLE_AI_API_KEY\`

**¿Qué incluye esta clave?**
- ✅ Generación de narrativa con Gemini
- 🍌 Generación de imágenes con Nano Banana (cuando esté disponible)
- ✅ Una sola configuración para todo

#### ElevenLabs (Opcional - para audio)
1. Ve a [ElevenLabs](https://elevenlabs.io/)
2. Regístrate y obtén tu API key
3. Copia la clave en \`ELEVENLABS_API_KEY\`

### 4. Ejecutar el juego

\`\`\`bash
npm run dev
\`\`\`

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎮 Cómo Jugar

1. **Inicio**: Empiezas con $1 en el día 1 con una historia inicial inmersiva
2. **Chat Interactivo**: La historia se desarrolla como una conversación con la IA
3. **Acciones**: Tienes máximo 3 acciones por día - puedes usar botones rápidos o escribir acciones personalizadas
4. **Memoria Persistente**: La IA recuerda todos los personajes, lugares y objetos que encuentras
5. **Decisiones**: Cada acción que escribas genera una respuesta narrativa única
6. **Progreso**: Avanza día a día viendo cómo evoluciona tu historia
7. **Final**: Tu resultado depende del dinero acumulado y las decisiones tomadas

### Interfaz de Chat
- **Mensajes de IA**: Narrativa inmersiva con información del juego
- **Tus Mensajes**: Escribe cualquier acción que quieras realizar
- **Acciones Rápidas**: Botones con opciones contextuales según tu situación
- **Barra de Estado**: Información en tiempo real sobre tu progreso
- **Historial Completo**: Todos los mensajes se conservan durante la partida

## 🧩 Arquitectura del Sistema

### Componentes Principales

- **GameEngine**: Motor principal que coordina todo el juego
- **GameManager**: Maneja el estado del juego y la lógica de negocio
- **StoryGenerator**: Genera narrativa usando Google AI con contexto completo
- **ChatGameInterface**: Interfaz principal de chat conversacional
- **Componentes UI**: ChatMessage, ChatInput, GameStatusBar, etc.

### Sistema de Persistencia

El juego mantiene memoria de:
- **Personajes**: Nombres, personalidades, relaciones
- **Lugares**: Ubicaciones visitadas, niveles de riesgo
- **Objetos**: Items obtenidos, valores, utilidades
- **Historia**: Todas las acciones y sus resultados

### Sistema de IA

- **Prompt Contextual**: La IA recibe contexto completo del juego
- **Narrativa Coherente**: Mantiene consistencia con elementos anteriores
- **Generación Dinámica**: Crea nuevos elementos según sea necesario
- **Múltiples Resultados**: Diferentes finales basados en las decisiones

## 📁 Estructura del Proyecto

\`\`\`
src/
├── app/
│   ├── page.tsx                 # Página principal
│   └── layout.tsx              # Layout base
├── components/
│   ├── ChatGameInterface.tsx   # Interfaz principal de chat
│   ├── ChatMessage.tsx         # Componente de mensaje individual
│   ├── ChatInput.tsx          # Input de chat con acciones
│   ├── GameStatusBar.tsx      # Barra de estado superior
│   └── [otros componentes...]  # Componentes adicionales
├── lib/
│   ├── gameEngine.ts          # Motor principal del juego
│   ├── gameManager.ts         # Gestión de estado y lógica
│   └── storyGenerator.ts      # Generación de narrativa con IA
└── types/
    └── game.ts                # Tipos TypeScript y interfaces
\`\`\`

## 🎯 Próximas Características

### Fase 2: Imágenes
- Generación de imágenes con Fal.ai
- Visuales para personajes y lugares
- Scenes dinámicas basadas en la historia

### Fase 3: Audio
- Narración con ElevenLabs
- Efectos de sonido
- Música ambiental

### Fase 4: Mejoras
- Sistema de logros
- Múltiples modos de juego
- Leaderboards
- Historias compartibles

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (\`git checkout -b feature/AmazingFeature\`)
3. Commit tus cambios (\`git commit -m 'Add some AmazingFeature'\`)
4. Push a la rama (\`git push origin feature/AmazingFeature\`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **Google AI** por Nano Banana
- **Fal.ai** por la generación de imágenes
- **ElevenLabs** por la síntesis de voz
- **Next.js** por el framework
- **Tailwind CSS** por los estilos