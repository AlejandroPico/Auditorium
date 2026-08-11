import {
  Activity,
  CircleDot,
  CloudDownload,
  Download,
  FolderOpen,
  Gauge,
  HardDriveDownload,
  Laptop,
  Menu,
  Mic2,
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  Radio,
  Redo2,
  Repeat2,
  RotateCcw,
  Save,
  Settings,
  SkipBack,
  Square,
  Undo2,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { selectActiveWorkspace, useStudioStore } from '../store/studioStore';
import { downloadBlob, exportProject, openProjectPicker } from '../utils/projectIO';

function TransportTime() {
  const playing = useStudioStore((state) => state.isPlaying);
  const bpm = useStudioStore((state) => state.project.transport.bpm);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const started = performance.now() - elapsed * 1000;
    const timer = window.setInterval(() => setElapsed((performance.now() - started) / 1000), 40);
    return () => window.clearInterval(timer);
  }, [playing]);
  const beats = elapsed * bpm / 60;
  const bar = Math.floor(beats / 4) + 1;
  const beat = Math.floor(beats % 4) + 1;
  const tick = Math.floor((beats % 1) * 960);
  return <div className="transport-time"><strong>{String(bar).padStart(3, '0')} · {beat} · {String(tick).padStart(3, '0')}</strong><span>{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{Math.floor(elapsed % 60).toString().padStart(2, '0')}.{Math.floor((elapsed % 1) * 1000).toString().padStart(3, '0')}</span></div>;
}

function MasterMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = useStudioStore((state) => state.isPlaying);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (canvas && context) {
        const data = new Uint8Array(audioEngine.analyser?.frequencyBinCount ?? 256);
        audioEngine.analyser?.getByteFrequencyData(data);
        context.clearRect(0, 0, canvas.width, canvas.height);
        const gradient = context.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#65d5b8'); gradient.addColorStop(0.74, '#f4bf55'); gradient.addColorStop(1, '#ff625f');
        context.fillStyle = gradient;
        const bars = 26;
        for (let index = 0; index < bars; index += 1) {
          const live = audioEngine.analyser ? data[Math.floor(index / bars * data.length * 0.15)] / 255 : 0;
          const synthetic = playing ? 0.25 + Math.sin(frame * 0.08 + index * 0.7) * 0.12 + (index % 4) * 0.02 : 0.05;
          const height = Math.max(live, synthetic) * canvas.height;
          context.fillRect(index * 3, canvas.height - height, 2, height);
        }
      }
      frame += 1;
      requestAnimationFrame(draw);
    };
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return <canvas className="master-mini-meter" ref={canvasRef} width="78" height="26" />;
}

function DownloadMenu({ close }: { close: () => void }) {
  return (
    <div className="top-popover download-popover">
      <header><div><span className="eyebrow">Auditorium Desktop</span><strong>Potencia local, misma sesión</strong></div><button onClick={close}><X size={14} /></button></header>
      <a href="https://github.com/AlejandroPico/Auditorium/releases/latest" target="_blank" rel="noreferrer"><span className="os-icon windows">⊞</span><span><strong>Windows</strong><small>Instalador .msi / .exe · x64</small></span><Download size={15} /></a>
      <a href="https://github.com/AlejandroPico/Auditorium/releases/latest" target="_blank" rel="noreferrer"><span className="os-icon apple">◆</span><span><strong>macOS</strong><small>.dmg · Apple Silicon e Intel</small></span><Download size={15} /></a>
      <a href="https://github.com/AlejandroPico/Auditorium/releases/latest" target="_blank" rel="noreferrer"><span className="os-icon linux">◈</span><span><strong>Linux</strong><small>AppImage / .deb · x64</small></span><Download size={15} /></a>
      <footer><HardDriveDownload size={14} /><span>Los instaladores se compilan en GitHub Actions con Tauri.</span></footer>
    </div>
  );
}

function SettingsMenu({ close }: { close: () => void }) {
  const project = useStudioStore((state) => state.project);
  const performanceMode = useStudioStore((state) => state.performanceMode);
  const setPerformanceMode = useStudioStore((state) => state.setPerformanceMode);
  const setMasterGain = useStudioStore((state) => state.setMasterGain);
  const setStatus = useStudioStore((state) => state.setStatus);
  return (
    <div className="top-popover settings-popover">
      <header><div><span className="eyebrow">Preferencias</span><strong>Audio y entorno</strong></div><button onClick={close}><X size={14} /></button></header>
      <label><span><b>Salida maestra</b><small>Ganancia posterior al grafo</small></span><output>{project.transport.masterGain.toFixed(1)} dB</output><input type="range" min="-60" max="6" step="0.5" value={project.transport.masterGain} onChange={(event) => { const value = Number(event.target.value); setMasterGain(value); audioEngine.setMasterGain(value); }} /></label>
      <div className="settings-row"><span><b>Frecuencia</b><small>Motor de audio</small></span><strong>{audioEngine.audioContext?.sampleRate ? `${audioEngine.audioContext.sampleRate / 1000} kHz` : '48 kHz'}</strong></div>
      <div className="settings-row"><span><b>Precisión interna</b><small>Grafo y sumadores</small></span><strong>32-bit float</strong></div>
      <label className="settings-toggle"><span><b>Modo actuación</b><small>Oculta paneles, conserva controles</small></span><input type="checkbox" checked={performanceMode} onChange={(event) => setPerformanceMode(event.target.checked)} /><i /></label>
      <button className="device-test" onClick={async () => { try { await audioEngine.init(); setStatus(`Motor activo · ${audioEngine.audioContext?.sampleRate ?? 48000} Hz · latencia interactiva`); } catch (error) { setStatus(String(error)); } }}><Zap size={14} />Probar motor de audio</button>
      <footer><Gauge size={13} />Latencia estimada por el sistema: {audioEngine.audioContext ? `${((audioEngine.audioContext.baseLatency ?? 0.006) * 1000).toFixed(1)} ms` : '—'}</footer>
    </div>
  );
}

export function TopBar() {
  const project = useStudioStore((state) => state.project);
  const workspace = useStudioStore(selectActiveWorkspace);
  const playing = useStudioStore((state) => state.isPlaying);
  const recording = useStudioStore((state) => state.isRecording);
  const leftOpen = useStudioStore((state) => state.leftOpen);
  const rightOpen = useStudioStore((state) => state.rightOpen);
  const historyPast = useStudioStore((state) => state.historyPast);
  const historyFuture = useStudioStore((state) => state.historyFuture);
  const setProjectName = useStudioStore((state) => state.setProjectName);
  const setBpm = useStudioStore((state) => state.setBpm);
  const toggleTransportOption = useStudioStore((state) => state.toggleTransportOption);
  const setPlaying = useStudioStore((state) => state.setPlaying);
  const setRecording = useStudioStore((state) => state.setRecording);
  const setStatus = useStudioStore((state) => state.setStatus);
  const setPanel = useStudioStore((state) => state.setPanel);
  const loadProject = useStudioStore((state) => state.loadProject);
  const newProject = useStudioStore((state) => state.newProject);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const [popover, setPopover] = useState<'download' | 'settings' | null>(null);

  const togglePlay = async () => {
    try {
      if (playing) { audioEngine.pause(); setPlaying(false); setStatus('Pausa · audio retenido en el grafo'); }
      else { await audioEngine.syncProject(project); await audioEngine.play(); setPlaying(true); setStatus('Reproduciendo · motor de baja latencia'); }
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo iniciar el audio'); }
  };

  const stop = () => { audioEngine.stop(); useStudioStore.getState().stopTransport(); };

  const record = async () => {
    try {
      if (!recording) {
        if (!playing) { await audioEngine.syncProject(project); await audioEngine.play(); setPlaying(true); }
        await audioEngine.startRecording();
        setRecording(true); setStatus('Grabando salida maestra · WAV PCM 24-bit');
      } else {
        const blob = audioEngine.stopRecording(24);
        setRecording(false);
        if (blob) downloadBlob(blob, `${project.metadata.name.replace(/[^\w-]+/g, '-') || 'auditorium'}-master.wav`);
        setStatus('Grabación finalizada y exportada en WAV 24-bit');
      }
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo grabar'); }
  };

  const open = async () => {
    try { loadProject(await openProjectPicker()); } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo abrir el proyecto'); }
  };

  const enableMidi = async () => {
    try {
      const midi = await navigator.requestMIDIAccess();
      let count = 0;
      for (const input of midi.inputs.values()) {
        count += 1;
        input.onmidimessage = (event) => {
          const [status, pitch, velocity] = Array.from(event.data ?? []);
          if ((status & 0xf0) === 0x90 && velocity > 0) audioEngine.triggerExternal(useStudioStore.getState().selectedNodeId ?? '', pitch, velocity / 127, 0.8);
        };
      }
      setStatus(`${count} entrada${count === 1 ? '' : 's'} MIDI conectada${count === 1 ? '' : 's'}`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Web MIDI no está disponible en este navegador'); }
  };

  return (
    <header className="topbar">
      <div className="brand-cluster">
        <button className="app-menu" title="Menú de Auditorium"><Menu size={17} /></button>
        <div className="app-logo"><span>A</span><i /></div>
        <div className="brand-name"><strong>AUDITORIUM</strong><small>MODULAR AUDIO STUDIO</small></div>
      </div>
      <div className="file-cluster">
        <button title="Nueva sesión" onClick={() => { if (window.confirm('¿Crear una sesión nueva? La sesión actual seguirá en el autoguardado.')) newProject(); }}><RotateCcw size={15} /></button>
        <button title="Abrir proyecto" onClick={open}><FolderOpen size={15} /></button>
        <button title="Guardar proyecto" onClick={() => { exportProject(project); setStatus('Proyecto guardado como archivo portable'); }}><Save size={15} /></button>
        <span />
        <button title="Deshacer" disabled={!historyPast.length} onClick={undo}><Undo2 size={15} /></button>
        <button title="Rehacer" disabled={!historyFuture.length} onClick={redo}><Redo2 size={15} /></button>
      </div>
      <label className="project-name"><i className={playing ? 'online' : ''} /><input value={project.metadata.name} onChange={(event) => setProjectName(event.target.value)} /><span>{workspace.name}</span></label>
      <div className="transport-cluster">
        <button title="Volver al inicio" onClick={stop}><SkipBack size={15} /></button>
        <button className={`record-button ${recording ? 'active' : ''}`} title={recording ? 'Detener y exportar grabación' : 'Grabar master'} onClick={record}><CircleDot size={16} fill={recording ? 'currentColor' : 'none'} /></button>
        <button className={`play-button ${playing ? 'active' : ''}`} title={playing ? 'Pausa' : 'Reproducir'} onClick={togglePlay}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
        <button title="Detener" onClick={stop}><Square size={14} fill="currentColor" /></button>
        <button className={project.transport.loop ? 'active' : ''} title="Bucle" onClick={() => toggleTransportOption('loop')}><Repeat2 size={15} /></button>
      </div>
      <TransportTime />
      <div className="tempo-cluster"><label><span>BPM</span><input type="number" min="20" max="400" value={project.transport.bpm} onChange={(event) => setBpm(Number(event.target.value))} /></label><button className={project.transport.metronome ? 'active' : ''} onClick={() => toggleTransportOption('metronome')} title="Metrónomo"><Radio size={15} /></button><span>4/4</span></div>
      <div className="master-cluster"><MasterMeter /><span><b>-1.4</b><small>dBTP</small></span><button title="Volumen maestro"><Volume2 size={15} /></button></div>
      <div className="utility-cluster">
        <button className={leftOpen ? 'active' : ''} onClick={() => setPanel('left', !leftOpen)} title="Biblioteca"><PanelLeft size={15} /></button>
        <button onClick={enableMidi} title="MIDI y hardware"><Mic2 size={15} /></button>
        <button className={rightOpen ? 'active' : ''} onClick={() => setPanel('right', !rightOpen)} title="Inspector"><PanelRight size={15} /></button>
        <button className={popover === 'settings' ? 'active' : ''} onClick={() => setPopover(popover === 'settings' ? null : 'settings')} title="Ajustes"><Settings size={15} /></button>
        <button className="download-button" onClick={() => setPopover(popover === 'download' ? null : 'download')}><CloudDownload size={15} /><span>Descargar</span></button>
      </div>
      <div className="topbar-status"><Activity size={12} /><span>{workspace.nodes.length} módulos</span><i /></div>
      {popover === 'download' && <DownloadMenu close={() => setPopover(null)} />}
      {popover === 'settings' && <SettingsMenu close={() => setPopover(null)} />}
    </header>
  );
}
