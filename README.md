# Auditorium

**Del silencio a cualquier música.** Auditorium es un estudio musical modular que reúne composición, interpretación, mezcla, diseño sonoro y actuación DJ sobre un único lienzo conectable. La misma sesión funciona como aplicación web instalable y como programa de escritorio para Windows, macOS y Linux.

[Abrir Auditorium en la web](https://alejandropico.github.io/Auditorium/) · [Descargar versiones de escritorio](https://github.com/AlejandroPico/Auditorium/releases/latest)

## Qué incluye esta primera versión

- Lienzo con desplazamiento, zoom, minimapa, conexiones animadas y más de 50 módulos de audio, control, análisis y enrutamiento.
- Motor Web Audio funcional: síntesis polifónica, caja de ritmos, secuenciación, filtrado, EQ, compresión, delay, reverb, modulación, saturación, mezcla, limitación, análisis FFT y salida.
- Procesador **Polarity 4B**: cuatro bandas, tres cruces editables, dinámica descendente y compensación ascendente, clipping, sobremuestreo y un editor de espectro ampliado.
- Platina DJ con carga de audio, pitch, jog interactivo, scratch, hot cues, loops y performance pads.
- Piano roll y partitura interactivos, teclado interpretable y grabación del master como WAV PCM de 24 bits.
- Catálogo de más de **500 modelos instrumentales** organizados por familia, región y época. Son modelos sintetizados ligeros; la capa de bibliotecas muestreadas multisample es una ampliación posterior.
- Micrófono e interfaz de audio mediante permisos del sistema; control MIDI desde teclados, pads y superficies compatibles.
- Cápsulas anidadas: un módulo puede contener otro lienzo completo y se navega mediante migas de pan.
- Proyecto portable `.auditorium.json`, autoguardado local, funcionamiento sin cuenta y PWA para uso sin conexión.
- Interfaz de escritorio con Tauri 2 y compilación automática de instaladores mediante GitHub Actions.

## Referencias de diseño

Auditorium combina ideas de tres familias de herramientas sin copiar su interfaz:

- [Polarity-MD](https://polarity.productions/polarity-md/) aporta el enfoque visual de dinámica multibanda: superposición de espectros, cruces directos y cadena Pre/B1–B4/Post.
- [VirtualDJ](https://virtualdj.com/stems/) inspira la actuación con platinas, jog, pads, hardware MIDI y mezcla en directo.
- [Bitwig Grid](https://www.bitwig.com/userguide/latest/welcome_to_the_grid/) inspira el sistema de módulos, cables, ayuda contextual, visores y contenedores reutilizables.

La arquitectura web usa el grafo modular de [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). El empaquetado sigue la canalización oficial de [Tauri para GitHub](https://v2.tauri.app/distribute/pipelines/github/).

## Ejecutar en desarrollo

Requiere Node.js 24 o una versión LTS compatible.

```bash
npm install
npm run dev
```

La compilación web se verifica con:

```bash
npm run typecheck
npm run build
npm run preview
```

Para el escritorio también se necesita la cadena estable de Rust y las dependencias de Tauri:

```bash
npm run tauri dev
npm run tauri build
```

## Persistencia y privacidad

Los proyectos y medios permanecen en el equipo. El autoguardado web utiliza almacenamiento local; al pulsar Guardar se descarga un archivo de proyecto legible y versionado. Auditorium no exige cuenta, no envía telemetría y no sube audio a un servidor.

Los medios cargados se decodifican con las capacidades del navegador o del WebView del sistema. WAV, MP3, OGG, Opus, AAC/M4A y otros formatos habituales dependen del códec instalado. La futura capa nativa incorporará decodificación FFmpeg para FLAC, AIFF, archivos heredados, extracción de CD y conversión por lotes con comportamiento uniforme.

## Arquitectura

```text
React + TypeScript
  ├─ estado de proyecto y espacios anidados (Zustand)
  ├─ lienzo modular y cables (XYFlow)
  ├─ motor de audio y grabación WAV (Web Audio)
  ├─ persistencia local / proyecto portable
  └─ interfaz Tauri 2
       └─ instaladores Windows, macOS y Linux
```

El formato del proyecto separa transporte, metadatos y espacios de trabajo. Cada cápsula referencia su propio espacio, de modo que el anidamiento no depende de la interfaz y podrá compilarse en el futuro hacia un grafo nativo de audio.

## Camino hacia el estudio profesional

Esta entrega establece la experiencia y un motor audible, pero no pretende fingir que el navegador ya reemplaza un DAW consolidado. Las siguientes capas previstas son:

1. Motor nativo Rust/C++ con audio por bloques, AudioWorklet en web y compensación de latencia por plugin.
2. Host CLAP/VST3/AU en escritorio, escaneo aislado y sandbox por plugin.
3. Línea temporal multipista completa, automatización por curvas, takes, comping, warping y edición espectral no destructiva.
4. Bibliotecas multisample, articulaciones, round robins, streaming desde disco y compatibilidad SF2/SFZ.
5. Separación local de stems, detección de BPM/tonalidad, transcripción audio→MIDI y restauración asistida.
6. Drivers ASIO/CoreAudio/JACK/PipeWire, selección multicanal, rutas externas, SMPTE, MTC, Ableton Link, OSC, MIDI 2.0 y MPE.
7. Render offline determinista a WAV/FLAC/AIFF, DDP, MP3/AAC/Opus y exportación por stems.

## Automatización

- `pages.yml`: valida y publica la versión web al actualizar `main`.
- `ci.yml`: ejecuta tipado y compilación en ramas y pull requests.
- `desktop.yml`: bajo etiqueta `v*` o ejecución manual, crea borradores de versión con instaladores para Windows, Linux, macOS Intel y Apple Silicon.

Auditorium se encuentra en una fase inicial ambiciosa. El objetivo del proyecto es que cada entrega añada profundidad real sin perder el lienzo modular que define su identidad.
