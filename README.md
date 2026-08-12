# Auditorium

**Del silencio a cualquier música.** Auditorium es un estudio musical modular que reúne composición, interpretación, mezcla, diseño sonoro y actuación DJ sobre un único lienzo conectable. La misma sesión funciona como aplicación web instalable y como programa de escritorio para Windows, macOS y Linux.

[Abrir Auditorium en la web](https://alejandropico.github.io/Auditorium/) · [Descargar versiones de escritorio](https://github.com/AlejandroPico/Auditorium/releases/latest)

## Qué incluye esta primera versión

- Lienzo con desplazamiento, zoom, minimapa, conexiones animadas y más de 50 módulos de audio, control, análisis y enrutamiento.
- Motor Web Audio funcional: instrumentos SoundFont ejecutados en AudioWorklet, síntesis polifónica, caja de ritmos, secuenciación, filtrado, EQ, compresión, delay, reverb, modulación, saturación, mezcla, limitación, análisis FFT y salida.
- Procesador **Polarity 4B**: cuatro bandas, tres cruces editables, dinámica descendente y compensación ascendente, clipping, sobremuestreo y un editor de espectro ampliado.
- Platina DJ con carga de audio, pitch, jog interactivo, scratch, hot cues, loops y performance pads.
- Piano roll y partitura interactivos, teclado interpretable y grabación del master como WAV PCM de 24 bits.
- Catálogo de **201 presets muestreados y acústicamente únicos** procedentes de GeneralUser GS 1.471. Cada entrada publicada resuelve a un preset real del banco; una auditoría elimina duplicados exactos y bloquea instrumentos sin muestras.
- Micrófono e interfaz de audio mediante permisos del sistema; control MIDI desde teclados, pads y superficies compatibles.
- Cápsulas anidadas: un módulo puede contener otro lienzo completo y se navega mediante migas de pan.
- Proyecto portable `.auditorium.json`, autoguardado local, funcionamiento sin cuenta y PWA para uso sin conexión.
- Interfaz de escritorio con Tauri 2 y compilación automática de instaladores mediante GitHub Actions.

## Referencias de diseño

Auditorium combina ideas de tres familias de herramientas sin copiar su interfaz:

- [Polarity-MD](https://polarity.productions/polarity-md/) aporta el enfoque visual de dinámica multibanda: superposición de espectros, cruces directos y cadena Pre/B1–B4/Post.
- [VirtualDJ](https://virtualdj.com/stems/) inspira la actuación con platinas, jog, pads, hardware MIDI y mezcla en directo.
- [Bitwig Grid](https://www.bitwig.com/userguide/latest/welcome_to_the_grid/) inspira el sistema de módulos, cables, ayuda contextual, visores y contenedores reutilizables.

La arquitectura web usa el grafo modular de [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). Los instrumentos se renderizan mediante [SpessaSynth Lib](https://github.com/spessasus/spessasynth_lib) en un AudioWorklet y el banco [GeneralUser GS](https://schristiancollins.com/generaluser.php). El empaquetado sigue la canalización oficial de [Tauri para GitHub](https://v2.tauri.app/distribute/pipelines/github/).

## Ejecutar en desarrollo

Requiere Node.js 24 o una versión LTS compatible.

```bash
npm install
npm run dev
```

La compilación web se verifica con:

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

El catálogo no se mantiene a mano. Para regenerarlo y volver a auditar el banco instalado:

```bash
npm run catalog:soundfont
npm test
```

Para el escritorio también se necesita la cadena estable de Rust y las dependencias de Tauri:

```bash
npm run tauri dev
npm run tauri build
```

## Persistencia y privacidad

Los proyectos y medios permanecen en el equipo. El autoguardado web utiliza almacenamiento local; al pulsar Guardar se descarga un archivo de proyecto legible y versionado. Auditorium no exige cuenta, no envía telemetría y no sube audio a un servidor.

Los medios cargados se decodifican con las capacidades del navegador o del WebView del sistema. WAV, MP3, OGG, Opus, AAC/M4A y otros formatos habituales dependen del códec instalado. El banco instrumental de unos 31 MB se carga una sola vez por sesión y queda disponible para la caché offline de la PWA. La futura capa nativa incorporará decodificación FFmpeg para FLAC, AIFF, archivos heredados, extracción de CD y conversión por lotes con comportamiento uniforme.

## Arquitectura

```text
React + TypeScript · interfaz y estado
  ├─ Zustand · proyecto y espacios anidados
  ├─ XYFlow · lienzo modular y cables
  └─ Web Audio · grafo, efectos y grabación WAV
       └─ AudioWorklet · SpessaSynth + GeneralUser GS

Tauri 2 + Rust · aplicación de escritorio
  └─ instaladores Windows, macOS y Linux
```

El formato del proyecto separa transporte, metadatos y espacios de trabajo. Cada cápsula referencia su propio espacio, de modo que el anidamiento no depende de la interfaz y podrá compilarse en el futuro hacia un grafo nativo de audio.

### Decisión técnica

No se ha sustituido React por Angular porque ambos ejecutan la interfaz en JavaScript/TypeScript y ese cambio no reduce los cortes de audio. La corrección relevante es sacar la interpretación instrumental del hilo visual: SpessaSynth procesa el SoundFont dentro de AudioWorklet. Python se reserva para análisis, conversión y tareas offline; no es la ruta de tiempo real. La edición de escritorio ya tiene una capa nativa Rust mediante Tauri y el siguiente salto de rendimiento será trasladar allí el grafo por bloques y el alojamiento de plugins, sin reescribir innecesariamente toda la interfaz.

Los créditos y condiciones del banco y del motor están en [`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt).

## Camino hacia el estudio profesional

Esta entrega establece la experiencia y un motor audible, pero no pretende fingir que el navegador ya reemplaza un DAW consolidado. Las siguientes capas previstas son:

1. Motor nativo Rust/C++ con audio por bloques en escritorio y compensación de latencia por plugin; la web ya utiliza AudioWorklet para los instrumentos.
2. Host CLAP/VST3/AU en escritorio, escaneo aislado y sandbox por plugin.
3. Línea temporal multipista completa, automatización por curvas, takes, comping, warping y edición espectral no destructiva.
4. Bibliotecas especializadas SFZ/multisample, articulaciones, round robins y streaming desde disco, ampliando la compatibilidad SF2 ya disponible.
5. Separación local de stems, detección de BPM/tonalidad, transcripción audio→MIDI y restauración asistida.
6. Drivers ASIO/CoreAudio/JACK/PipeWire, selección multicanal, rutas externas, SMPTE, MTC, Ableton Link, OSC, MIDI 2.0 y MPE.
7. Render offline determinista a WAV/FLAC/AIFF, DDP, MP3/AAC/Opus y exportación por stems.

## Automatización

- `pages.yml`: valida y publica la versión web al actualizar `main`.
- `ci.yml`: ejecuta tipado y compilación en ramas y pull requests.
- `desktop.yml`: bajo etiqueta `v*` o ejecución manual, crea borradores de versión con instaladores para Windows, Linux, macOS Intel y Apple Silicon.

Auditorium se encuentra en una fase inicial ambiciosa. El objetivo del proyecto es que cada entrega añada profundidad real sin perder el lienzo modular que define su identidad.
