import type { ModuleDefinition, ParamDefinition } from '../types';

const knob = (
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step = 1,
  unit = '',
): ParamDefinition => ({ key, label, default: value, min, max, step, unit, kind: 'knob' });

const toggle = (key: string, label: string, value = false): ParamDefinition => ({
  key,
  label,
  default: value,
  kind: 'toggle',
});

const select = (key: string, label: string, value: string, options: string[]): ParamDefinition => ({
  key,
  label,
  default: value,
  kind: 'select',
  options,
});

const sourceParams = [knob('level', 'Nivel', 72, 0, 100, 1, '%'), knob('pan', 'Pan', 0, -100, 100, 1, '')];

export const moduleCatalog: ModuleDefinition[] = [
  {
    type: 'oscillator', label: 'Oscilador', description: 'Generador polifónico con formas clásicas y secuencia interna.', category: 'Fuentes', color: '#ffb54a', icon: 'Waves', inputs: 0, outputs: 1, source: true,
    params: [select('wave', 'Forma', 'sawtooth', ['sine', 'triangle', 'sawtooth', 'square']), knob('frequency', 'Frecuencia', 220, 20, 2000, 1, 'Hz'), ...sourceParams],
    tags: ['synth', 'onda', 'tono'],
  },
  {
    type: 'noise', label: 'Ruido', description: 'Ruido blanco, rosa o marrón para percusión y diseño sonoro.', category: 'Fuentes', color: '#f8a45c', icon: 'AudioWaveform', inputs: 0, outputs: 1, source: true,
    params: [select('color', 'Color', 'white', ['white', 'pink', 'brown']), knob('level', 'Nivel', 35, 0, 100, 1, '%')],
  },
  {
    type: 'sampler', label: 'Sampler', description: 'Carga una muestra, transpón, recorta y dispara por MIDI.', category: 'Fuentes', color: '#f38d67', icon: 'FileAudio', inputs: 0, outputs: 1, source: true, wide: true,
    params: [knob('pitch', 'Tono', 0, -24, 24, 1, 'st'), knob('start', 'Inicio', 0, 0, 100, 1, '%'), knob('end', 'Final', 100, 0, 100, 1, '%'), toggle('loop', 'Bucle', false), ...sourceParams],
  },
  {
    type: 'microphone', label: 'Micrófono', description: 'Entrada en directo desde un micrófono o interfaz de audio.', category: 'Fuentes', color: '#ef7b75', icon: 'Mic2', inputs: 0, outputs: 1, source: true,
    params: [knob('gain', 'Ganancia', 65, 0, 150, 1, '%'), toggle('monitor', 'Monitor', true)],
  },
  {
    type: 'audioInput', label: 'Entrada de audio', description: 'Canal de entrada para una interfaz, instrumento eléctrico o retorno.', category: 'Fuentes', color: '#ea6f82', icon: 'Cable', inputs: 0, outputs: 1, source: true,
    params: [knob('gain', 'Ganancia', 70, 0, 150, 1, '%'), select('channel', 'Canal', '1–2', ['1', '2', '1–2', '3–4'])],
  },
  {
    type: 'instrument', label: 'Instrumento', description: 'Motor interpretativo con más de 300 modelos instrumentales.', category: 'Instrumentos', color: '#ffca57', icon: 'Piano', inputs: 1, outputs: 1, source: true, wide: true,
    params: [knob('expression', 'Expresión', 78, 0, 100, 1, '%'), knob('attack', 'Ataque', 18, 0, 100, 1, '%'), knob('release', 'Cola', 38, 0, 100, 1, '%'), ...sourceParams],
    tags: ['piano', 'guitarra', 'orquesta', 'mundo'],
  },
  {
    type: 'drumMachine', label: 'Drum Matrix', description: 'Caja de ritmos de 16 pasos con pads asignables.', category: 'Instrumentos', color: '#ffc043', icon: 'Grid3X3', inputs: 1, outputs: 1, source: true, wide: true,
    params: [knob('swing', 'Swing', 8, 0, 75, 1, '%'), knob('tone', 'Tono', 55, 0, 100, 1, '%'), ...sourceParams],
    tags: ['batería', 'pads', 'ritmo'],
  },
  {
    type: 'granular', label: 'Sintetizador granular', description: 'Convierte una muestra en nubes de microfragmentos.', category: 'Instrumentos', color: '#f7a952', icon: 'Sparkles', inputs: 1, outputs: 1, source: true,
    params: [knob('grain', 'Grano', 80, 5, 500, 1, 'ms'), knob('density', 'Densidad', 48, 1, 100, 1, '%'), knob('spray', 'Dispersión', 24, 0, 100, 1, '%'), ...sourceParams],
  },
  {
    type: 'fmSynth', label: 'FM Matrix', description: 'Síntesis FM de cuatro operadores con enrutamiento flexible.', category: 'Instrumentos', color: '#f69d66', icon: 'Atom', inputs: 1, outputs: 1, source: true,
    params: [knob('ratio', 'Relación', 2, 0.25, 16, 0.25, '×'), knob('index', 'Índice', 3.2, 0, 20, 0.1, ''), knob('feedback', 'Feedback', 12, 0, 100, 1, '%'), ...sourceParams],
  },
  {
    type: 'wavetable', label: 'Wavetable', description: 'Barrido de tabla de ondas con posición modulable.', category: 'Instrumentos', color: '#ee8d7b', icon: 'ChartSpline', inputs: 1, outputs: 1, source: true,
    params: [knob('position', 'Posición', 32, 0, 100, 1, '%'), knob('warp', 'Warp', 18, -100, 100, 1, '%'), knob('unison', 'Unísono', 3, 1, 8, 1, 'v'), ...sourceParams],
  },
  {
    type: 'turntable', label: 'Platina', description: 'Deck con jog, pitch, cue, loop, hot cues y scratch.', category: 'DJ & directo', color: '#ff6e64', icon: 'Disc3', inputs: 0, outputs: 1, source: true, wide: true,
    params: [knob('pitch', 'Pitch', 0, -50, 50, 0.1, '%'), knob('torque', 'Par', 82, 0, 100, 1, '%'), toggle('vinyl', 'Vinilo', true), toggle('keyLock', 'Key lock', true), ...sourceParams],
    tags: ['deck', 'scratch', 'vinilo', 'virtual dj'],
  },
  {
    type: 'performancePads', label: 'Performance Pads', description: 'Matriz 4×4 para muestras, escenas, stems y comandos MIDI.', category: 'DJ & directo', color: '#ff7c69', icon: 'LayoutGrid', inputs: 1, outputs: 1, source: true, wide: true,
    params: [select('mode', 'Modo', 'samples', ['samples', 'hot cues', 'stems', 'loops']), knob('velocity', 'Velocidad', 84, 1, 127, 1, '')],
  },
  {
    type: 'stemDeck', label: 'Stems Deck', description: 'Canales independientes para voz, batería, bajo y resto musical.', category: 'DJ & directo', color: '#ff5f76', icon: 'ListMusic', inputs: 0, outputs: 1, source: true, wide: true,
    params: [knob('vocals', 'Voz', 100, 0, 100, 1, '%'), knob('drums', 'Batería', 100, 0, 100, 1, '%'), knob('bass', 'Bajo', 100, 0, 100, 1, '%'), knob('music', 'Música', 100, 0, 100, 1, '%')],
  },
  {
    type: 'looper', label: 'Looper', description: 'Grabación y capas sincronizadas para actuación en vivo.', category: 'DJ & directo', color: '#ed6689', icon: 'Repeat2', inputs: 1, outputs: 1,
    params: [knob('bars', 'Compases', 4, 1, 32, 1, ''), knob('feedback', 'Capas', 88, 0, 100, 1, '%'), toggle('reverse', 'Inversa', false)],
  },
  {
    type: 'pianoRoll', label: 'Piano Roll', description: 'Editor de notas, duración, expresión y automatización.', category: 'Secuenciación', color: '#8cb4ff', icon: 'GanttChart', inputs: 0, outputs: 1, source: true, wide: true,
    params: [knob('steps', 'Pasos', 16, 4, 64, 1, ''), knob('gate', 'Puerta', 72, 5, 100, 1, '%'), knob('octave', 'Octava', 4, 0, 8, 1, '')],
  },
  {
    type: 'score', label: 'Partitura', description: 'Notación sobre pentagrama con articulación, dinámica y tempo.', category: 'Secuenciación', color: '#7fa8ff', icon: 'Music2', inputs: 0, outputs: 1, source: true, wide: true,
    params: [select('clef', 'Clave', 'Sol', ['Sol', 'Fa', 'Do']), select('duration', 'Figura', 'Negra', ['Redonda', 'Blanca', 'Negra', 'Corchea', 'Semicorchea']), knob('velocity', 'Dinámica', 82, 1, 127, 1, '')],
  },
  {
    type: 'arpeggiator', label: 'Arpegiador', description: 'Transforma acordes en patrones rítmicos ordenados o aleatorios.', category: 'Secuenciación', color: '#739cff', icon: 'Waypoints', inputs: 1, outputs: 1,
    params: [select('mode', 'Orden', 'up', ['up', 'down', 'up/down', 'random']), knob('rate', 'División', 16, 1, 32, 1, ''), knob('octaves', 'Octavas', 2, 1, 5, 1, '')],
  },
  {
    type: 'stepSequencer', label: 'Step Sequencer', description: 'Secuenciador de 16 pasos para notas, control o disparos.', category: 'Secuenciación', color: '#788df3', icon: 'PanelTop', inputs: 0, outputs: 1, source: true,
    params: [knob('steps', 'Pasos', 16, 2, 64, 1, ''), knob('probability', 'Probabilidad', 100, 0, 100, 1, '%'), knob('swing', 'Swing', 0, 0, 75, 1, '%')],
  },
  {
    type: 'multiband', label: 'Polarity 4B', description: 'Dinámica ascendente/descendente de cuatro bandas con clipping por etapa.', category: 'Dinámica', color: '#6fd4ff', icon: 'SlidersHorizontal', inputs: 1, outputs: 1, wide: true,
    params: [knob('amount', 'Amount', 58, 0, 100, 1, '%'), knob('down', 'Down', 42, 0, 100, 1, '%'), knob('up', 'Up', 34, 0, 100, 1, '%'), knob('clip', 'Clip', 8, 0, 100, 1, '%'), knob('cross1', 'Cruce 1', 120, 40, 500, 1, 'Hz'), knob('cross2', 'Cruce 2', 1200, 300, 4000, 1, 'Hz'), knob('cross3', 'Cruce 3', 6500, 2000, 16000, 1, 'Hz'), select('slope', 'Pendiente', '24', ['12', '24', '48']), toggle('linearPhase', 'Fase lineal', false), toggle('oversampling', 'Sobremuestreo', true)],
    tags: ['polarity', 'ott', 'compressor', 'crossover'],
  },
  {
    type: 'compressor', label: 'Compresor', description: 'Control dinámico con ataque, liberación y mezcla paralela.', category: 'Dinámica', color: '#5dc8f4', icon: 'BetweenHorizontalStart', inputs: 1, outputs: 1,
    params: [knob('threshold', 'Umbral', -24, -80, 0, 1, 'dB'), knob('ratio', 'Ratio', 4, 1, 20, 0.1, ':1'), knob('attack', 'Ataque', 12, 0, 1000, 1, 'ms'), knob('release', 'Release', 180, 10, 2000, 1, 'ms'), knob('makeup', 'Make-up', 0, 0, 24, 0.5, 'dB')],
  },
  {
    type: 'limiter', label: 'Limitador', description: 'Techo final de pico con lectura de reducción.', category: 'Dinámica', color: '#50b8e5', icon: 'ShieldCheck', inputs: 1, outputs: 1,
    params: [knob('ceiling', 'Techo', -0.8, -12, 0, 0.1, 'dB'), knob('release', 'Release', 80, 5, 1000, 1, 'ms'), toggle('truePeak', 'True peak', true)],
  },
  {
    type: 'gate', label: 'Puerta / Expansor', description: 'Limpia fondo o expande transitorios por debajo del umbral.', category: 'Dinámica', color: '#5da9dc', icon: 'DoorOpen', inputs: 1, outputs: 1,
    params: [knob('threshold', 'Umbral', -48, -90, 0, 1, 'dB'), knob('range', 'Rango', -24, -80, 0, 1, 'dB'), knob('attack', 'Ataque', 4, 0, 250, 1, 'ms'), knob('release', 'Release', 140, 5, 2000, 1, 'ms')],
  },
  {
    type: 'transient', label: 'Transient Designer', description: 'Esculpe ataque y sustain sin cambiar el nivel estable.', category: 'Dinámica', color: '#639bd3', icon: 'Activity', inputs: 1, outputs: 1,
    params: [knob('attack', 'Ataque', 18, -100, 100, 1, '%'), knob('sustain', 'Sustain', -8, -100, 100, 1, '%'), knob('clip', 'Clip', 0, 0, 100, 1, '%')],
  },
  {
    type: 'eq3', label: 'EQ de 3 bandas', description: 'Ecualizador musical de graves, medios y agudos.', category: 'Filtros & EQ', color: '#61e0c0', icon: 'SlidersVertical', inputs: 1, outputs: 1,
    params: [knob('low', 'Graves', 0, -24, 24, 0.5, 'dB'), knob('mid', 'Medios', 0, -24, 24, 0.5, 'dB'), knob('high', 'Agudos', 0, -24, 24, 0.5, 'dB'), knob('midFreq', 'Frec. media', 1000, 100, 10000, 10, 'Hz')],
  },
  {
    type: 'parametricEq', label: 'EQ paramétrico', description: 'Ocho bandas totalmente paramétricas con espectro.', category: 'Filtros & EQ', color: '#58d4ad', icon: 'Spline', inputs: 1, outputs: 1, wide: true,
    params: [knob('frequency', 'Frecuencia', 1000, 20, 20000, 1, 'Hz'), knob('gain', 'Ganancia', 0, -24, 24, 0.1, 'dB'), knob('q', 'Q', 1.2, 0.1, 24, 0.1, '')],
  },
  {
    type: 'filter', label: 'Filtro multimodo', description: 'Paso bajo, alto, banda y notch con resonancia.', category: 'Filtros & EQ', color: '#52c89f', icon: 'ListFilter', inputs: 1, outputs: 1,
    params: [select('mode', 'Modo', 'lowpass', ['lowpass', 'highpass', 'bandpass', 'notch']), knob('frequency', 'Corte', 5200, 20, 20000, 1, 'Hz'), knob('q', 'Resonancia', 0.8, 0.1, 24, 0.1, '')],
  },
  {
    type: 'autoFilter', label: 'Auto Filter', description: 'Filtro animado por LFO y envolvente de entrada.', category: 'Filtros & EQ', color: '#55bd94', icon: 'ScanLine', inputs: 1, outputs: 1,
    params: [knob('frequency', 'Centro', 1400, 40, 14000, 1, 'Hz'), knob('depth', 'Profundidad', 62, 0, 100, 1, '%'), knob('rate', 'Velocidad', 1, 0.05, 20, 0.05, 'Hz'), knob('q', 'Q', 5, 0.1, 24, 0.1, '')],
  },
  {
    type: 'chorus', label: 'Chorus', description: 'Duplicación modulada para anchura y movimiento.', category: 'Modulación', color: '#b58cff', icon: 'Blend', inputs: 1, outputs: 1,
    params: [knob('rate', 'Velocidad', 0.8, 0.05, 12, 0.05, 'Hz'), knob('depth', 'Profundidad', 42, 0, 100, 1, '%'), knob('mix', 'Mezcla', 35, 0, 100, 1, '%')],
  },
  {
    type: 'flanger', label: 'Flanger', description: 'Retardo ultracorto modulado con realimentación.', category: 'Modulación', color: '#a87ef6', icon: 'GitCompareArrows', inputs: 1, outputs: 1,
    params: [knob('rate', 'Velocidad', 0.3, 0.01, 10, 0.01, 'Hz'), knob('depth', 'Profundidad', 56, 0, 100, 1, '%'), knob('feedback', 'Feedback', 32, -95, 95, 1, '%'), knob('mix', 'Mezcla', 45, 0, 100, 1, '%')],
  },
  {
    type: 'phaser', label: 'Phaser', description: 'Barrido de fase en múltiples etapas.', category: 'Modulación', color: '#9f74ec', icon: 'Orbit', inputs: 1, outputs: 1,
    params: [knob('rate', 'Velocidad', 0.2, 0.01, 12, 0.01, 'Hz'), knob('depth', 'Profundidad', 68, 0, 100, 1, '%'), knob('stages', 'Etapas', 6, 2, 12, 2, ''), knob('mix', 'Mezcla', 50, 0, 100, 1, '%')],
  },
  {
    type: 'tremolo', label: 'Tremolo', description: 'Modulación rítmica de amplitud con sincronía.', category: 'Modulación', color: '#966ce4', icon: 'AudioLines', inputs: 1, outputs: 1,
    params: [knob('rate', 'Velocidad', 4, 0.05, 20, 0.05, 'Hz'), knob('depth', 'Profundidad', 45, 0, 100, 1, '%'), select('shape', 'Forma', 'sine', ['sine', 'triangle', 'square'])],
  },
  {
    type: 'reverb', label: 'Reverb', description: 'Espacio algorítmico desde habitación hasta catedral.', category: 'Espacio', color: '#7f8cff', icon: 'Landmark', inputs: 1, outputs: 1,
    params: [knob('size', 'Tamaño', 64, 1, 100, 1, '%'), knob('decay', 'Decaimiento', 2.8, 0.1, 20, 0.1, 's'), knob('preDelay', 'Pre-delay', 22, 0, 250, 1, 'ms'), knob('mix', 'Mezcla', 28, 0, 100, 1, '%')],
  },
  {
    type: 'convolution', label: 'Convolution Space', description: 'Reverberación por respuesta impulsional cargable.', category: 'Espacio', color: '#7383ed', icon: 'Building2', inputs: 1, outputs: 1,
    params: [knob('stretch', 'Escala', 100, 25, 400, 1, '%'), knob('tone', 'Tono', 60, 0, 100, 1, '%'), knob('mix', 'Mezcla', 35, 0, 100, 1, '%')],
  },
  {
    type: 'delay', label: 'Delay', description: 'Eco estéreo sincronizable con filtro y feedback.', category: 'Espacio', color: '#6e7ee2', icon: 'TimerReset', inputs: 1, outputs: 1,
    params: [knob('time', 'Tiempo', 320, 1, 2000, 1, 'ms'), knob('feedback', 'Feedback', 34, 0, 94, 1, '%'), knob('filter', 'Filtro', 7800, 200, 20000, 10, 'Hz'), knob('mix', 'Mezcla', 24, 0, 100, 1, '%')],
  },
  {
    type: 'spatializer', label: 'Espacio 3D', description: 'Posicionamiento binaural en azimut, elevación y distancia.', category: 'Espacio', color: '#6579da', icon: 'Axis3D', inputs: 1, outputs: 1,
    params: [knob('azimuth', 'Azimut', 0, -180, 180, 1, '°'), knob('elevation', 'Elevación', 0, -90, 90, 1, '°'), knob('distance', 'Distancia', 1, 0.1, 20, 0.1, 'm')],
  },
  {
    type: 'distortion', label: 'Saturación', description: 'De calidez analógica a distorsión extrema.', category: 'Distorsión', color: '#ff706e', icon: 'Flame', inputs: 1, outputs: 1,
    params: [select('model', 'Modelo', 'tape', ['tape', 'tube', 'diode', 'fold']), knob('drive', 'Drive', 24, 0, 100, 1, '%'), knob('tone', 'Tono', 58, 0, 100, 1, '%'), knob('mix', 'Mezcla', 72, 0, 100, 1, '%')],
  },
  {
    type: 'bitcrusher', label: 'Bit Crusher', description: 'Reducción de bits y frecuencia de muestreo.', category: 'Distorsión', color: '#fa665f', icon: 'Binary', inputs: 1, outputs: 1,
    params: [knob('bits', 'Bits', 10, 1, 16, 1, 'bit'), knob('downsample', 'Muestreo', 4, 1, 32, 1, '×'), knob('mix', 'Mezcla', 55, 0, 100, 1, '%')],
  },
  {
    type: 'clipper', label: 'Clipper', description: 'Recorte suave o duro con escucha delta.', category: 'Distorsión', color: '#f45d5d', icon: 'ScissorsLineDashed', inputs: 1, outputs: 1,
    params: [knob('threshold', 'Umbral', -3, -24, 0, 0.1, 'dB'), knob('softness', 'Suavidad', 35, 0, 100, 1, '%'), toggle('delta', 'Delta', false)]
  },
  {
    type: 'mixer', label: 'Mezclador', description: 'Bus sumador con ganancia, pan, mute, solo y envíos.', category: 'Mezcla', color: '#f4ce6a', icon: 'SlidersVertical', inputs: 4, outputs: 1, wide: true,
    params: [knob('gain', 'Fader', 0, -60, 12, 0.1, 'dB'), knob('pan', 'Pan', 0, -100, 100, 1, ''), knob('sendA', 'Envío A', 0, 0, 100, 1, '%'), knob('sendB', 'Envío B', 0, 0, 100, 1, '%')],
  },
  {
    type: 'crossfader', label: 'Crossfader', description: 'Mezcla continua entre dos entradas con curvas DJ.', category: 'Mezcla', color: '#efc25e', icon: 'MoveHorizontal', inputs: 2, outputs: 1,
    params: [knob('position', 'Posición', 0, -100, 100, 1, ''), select('curve', 'Curva', 'smooth', ['smooth', 'sharp', 'linear'])],
  },
  {
    type: 'gain', label: 'Ganancia', description: 'Ajuste de nivel transparente con inversión de fase.', category: 'Mezcla', color: '#e7b956', icon: 'Volume2', inputs: 1, outputs: 1,
    params: [knob('gain', 'Ganancia', 0, -60, 24, 0.1, 'dB'), knob('pan', 'Pan', 0, -100, 100, 1, ''), toggle('phase', 'Invertir fase', false)],
  },
  {
    type: 'output', label: 'Master Output', description: 'Salida maestra hacia altavoces, grabación y exportación.', category: 'Mezcla', color: '#f0d47c', icon: 'Volume2', inputs: 2, outputs: 0, wide: true,
    params: [knob('gain', 'Nivel', -3, -60, 6, 0.1, 'dB'), toggle('mono', 'Mono', false), toggle('safe', 'Protección', true)],
  },
  {
    type: 'spectrum', label: 'Analizador de espectro', description: 'FFT en tiempo real con entrada/salida superpuestas.', category: 'Análisis', color: '#68d9ff', icon: 'ChartNoAxesCombined', inputs: 1, outputs: 1, wide: true,
    params: [select('size', 'Resolución', '4096', ['1024', '2048', '4096', '8192']), knob('smoothing', 'Suavizado', 72, 0, 100, 1, '%'), select('scale', 'Escala', 'log', ['log', 'linear'])],
  },
  {
    type: 'oscilloscope', label: 'Osciloscopio', description: 'Forma de onda, fase y correlación estéreo.', category: 'Análisis', color: '#5ecbfa', icon: 'ScanLine', inputs: 1, outputs: 1, wide: true,
    params: [knob('timebase', 'Base', 20, 1, 500, 1, 'ms'), knob('gain', 'Escala', 1, 0.1, 8, 0.1, '×'), toggle('trigger', 'Trigger', true)],
  },
  {
    type: 'loudness', label: 'LUFS & True Peak', description: 'Medición momentánea, corta e integrada con true peak.', category: 'Análisis', color: '#55c2ee', icon: 'Gauge', inputs: 1, outputs: 1,
    params: [select('target', 'Objetivo', '-14', ['-23', '-16', '-14', '-9']), toggle('truePeak', 'True peak', true), toggle('history', 'Historial', true)],
  },
  {
    type: 'tuner', label: 'Afinador', description: 'Afinación cromática, orquestal y microtonal.', category: 'Análisis', color: '#4cb8e5', icon: 'Crosshair', inputs: 1, outputs: 1,
    params: [knob('reference', 'La', 440, 380, 480, 0.1, 'Hz'), select('temperament', 'Temperamento', 'equal', ['equal', 'just', 'pythagorean'])],
  },
  {
    type: 'midiInput', label: 'MIDI / MPE Input', description: 'Teclado, pads, controladores y expresión MPE.', category: 'Control', color: '#ca8cff', icon: 'KeyboardMusic', inputs: 0, outputs: 1, source: true,
    params: [select('channel', 'Canal', 'Omni', ['Omni', '1', '2', '3', '4', '10']), knob('velocityCurve', 'Curva', 50, 0, 100, 1, '%'), toggle('mpe', 'MPE', true)],
  },
  {
    type: 'lfo', label: 'LFO', description: 'Modulación cíclica sincronizada o libre.', category: 'Control', color: '#bf7ff3', icon: 'SineWave', inputs: 0, outputs: 1, source: true,
    params: [select('shape', 'Forma', 'sine', ['sine', 'triangle', 'square', 'random']), knob('rate', 'Velocidad', 1, 0.01, 40, 0.01, 'Hz'), knob('depth', 'Profundidad', 100, 0, 100, 1, '%'), toggle('sync', 'Sync', false)],
  },
  {
    type: 'envelope', label: 'Envolvente ADSR', description: 'Curva de control de cuatro etapas y respuesta por velocidad.', category: 'Control', color: '#b675e9', icon: 'ChartSpline', inputs: 1, outputs: 1,
    params: [knob('attack', 'A', 20, 0, 5000, 1, 'ms'), knob('decay', 'D', 180, 0, 5000, 1, 'ms'), knob('sustain', 'S', 70, 0, 100, 1, '%'), knob('release', 'R', 450, 0, 10000, 1, 'ms')],
  },
  {
    type: 'macro', label: 'Macro ×8', description: 'Ocho controles asignables a cualquier parámetro.', category: 'Control', color: '#ab6ade', icon: 'CircleDotDashed', inputs: 0, outputs: 8, source: true, wide: true,
    params: [knob('macro1', 'Macro 1', 50, 0, 100, 1, '%'), knob('macro2', 'Macro 2', 50, 0, 100, 1, '%'), knob('macro3', 'Macro 3', 50, 0, 100, 1, '%'), knob('macro4', 'Macro 4', 50, 0, 100, 1, '%')],
  },
  {
    type: 'capsule', label: 'Cápsula', description: 'Componente anidado: abre otro lienzo modular dentro del actual.', category: 'Enrutamiento', color: '#80a3b8', icon: 'Box', inputs: 2, outputs: 2, wide: true,
    params: [knob('wet', 'Mezcla interna', 100, 0, 100, 1, '%'), toggle('latencyComp', 'Compensar latencia', true)],
    tags: ['grupo', 'contenedor', 'anidado'],
  },
  {
    type: 'splitter', label: 'Splitter', description: 'Divide una señal hacia cuatro destinos independientes.', category: 'Enrutamiento', color: '#789aac', icon: 'Split', inputs: 1, outputs: 4,
    params: [toggle('equalPower', 'Potencia constante', true)],
  },
  {
    type: 'merger', label: 'Merger', description: 'Suma cuatro señales de audio o control.', category: 'Enrutamiento', color: '#7290a2', icon: 'Combine', inputs: 4, outputs: 1,
    params: [knob('headroom', 'Headroom', -6, -24, 0, 0.5, 'dB')],
  },
  {
    type: 'sendReturn', label: 'Send / Return', description: 'Envío auxiliar para procesamiento paralelo externo o interno.', category: 'Enrutamiento', color: '#68899c', icon: 'Route', inputs: 2, outputs: 2,
    params: [knob('send', 'Envío', 0, -60, 6, 0.1, 'dB'), knob('return', 'Retorno', 0, -60, 6, 0.1, 'dB')],
  },
  {
    type: 'portalIn', label: 'Entrada de cápsula', description: 'Portal desde el lienzo superior.', category: 'Enrutamiento', color: '#607f91', icon: 'LogIn', inputs: 0, outputs: 1, params: [],
  },
  {
    type: 'portalOut', label: 'Salida de cápsula', description: 'Portal hacia el lienzo superior.', category: 'Enrutamiento', color: '#607f91', icon: 'LogOut', inputs: 1, outputs: 0, params: [],
  },
];

export const moduleCategories = Array.from(new Set(moduleCatalog.map((module) => module.category)));

export const moduleByType = new Map(moduleCatalog.map((module) => [module.type, module]));

export const getModuleDefinition = (type: string): ModuleDefinition =>
  moduleByType.get(type) ?? moduleCatalog.find((module) => module.type === 'gain')!;

export const defaultParams = (definition: ModuleDefinition): Record<string, number | string | boolean> =>
  Object.fromEntries(definition.params.map((param) => [param.key, param.default]));
