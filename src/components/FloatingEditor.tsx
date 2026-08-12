import { Expand, GripHorizontal, Minimize2, Pin, Settings2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { instrumentById } from '../data/instruments';
import { getModuleDefinition } from '../data/moduleCatalog';
import { findNodeInProject, useStudioStore } from '../store/studioStore';
import type { StudioNode } from '../types';
import { DeckLab } from './DeckLab';
import { DynamicsLab } from './DynamicsLab';
import { ScoreEditor } from './ScoreEditor';
import { SequenceEditor } from './SequenceEditor';

const TOPBAR_HEIGHT = 46;

function AnalyzerLab({ node }: { node: StudioNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  useEffect(() => {
    let raf = 0;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== rect.width * dpr) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; }
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.strokeStyle = '#1f2b35'; context.lineWidth = 1;
      for (let x = 0; x < rect.width; x += rect.width / 12) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke(); }
      for (let y = 0; y < rect.height; y += rect.height / 8) { context.beginPath(); context.moveTo(0, y); context.lineTo(rect.width, y); context.stroke(); }
      const analyser = audioEngine.getAnalyser(node.id) ?? audioEngine.analyser;
      const buffer = new Uint8Array(analyser?.frequencyBinCount ?? 2048);
      if (analyser) analyser.getByteFrequencyData(buffer);
      const gradient = context.createLinearGradient(0, 0, rect.width, 0);
      gradient.addColorStop(0, '#f6b44f'); gradient.addColorStop(0.45, '#70e1c2'); gradient.addColorStop(1, '#6fd4ff');
      context.beginPath();
      for (let x = 0; x < rect.width; x += 1) {
        const index = Math.min(buffer.length - 1, Math.floor((x / rect.width) ** 2.4 * buffer.length));
        const base = analyser && isPlaying ? buffer[index] / 255 : 0.22 + Math.sin(x * 0.025) * 0.08 + Math.sin(x * 0.087) * 0.04;
        const y = rect.height - 18 - Math.max(0.01, base) * (rect.height - 35);
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = gradient; context.lineWidth = 2; context.stroke();
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, node.id]);
  return (
    <div className="analyzer-lab">
      <div className="analyzer-readouts"><div><span>PEAK</span><b>-1.4 dBFS</b></div><div><span>RMS</span><b>-16.8 dB</b></div><div><span>LUFS-I</span><b>-14.1</b></div><div><span>TRUE PEAK</span><b>-0.8 dBTP</b></div><div><span>CORR</span><b>+0.83</b></div></div>
      <div className="analyzer-canvas"><canvas ref={canvasRef} /><div className="frequency-labels"><span>20</span><span>50</span><span>100</span><span>250</span><span>500</span><span>1k</span><span>2.5k</span><span>5k</span><span>10k</span><span>20k Hz</span></div><div className="db-labels"><span>0</span><span>−12</span><span>−24</span><span>−48</span><span>−72 dB</span></div></div>
      <footer><span><i className="cyan" />Salida</span><span><i className="amber" />Entrada</span><button>Freeze</button><button>Peak hold</button><button>1/24 oct</button></footer>
    </div>
  );
}

function ComposerLab({ node }: { node: StudioNode }) {
  const [mode, setMode] = useState<'roll' | 'score'>('roll');
  const instrument = node.data.instrumentId ? instrumentById.get(node.data.instrumentId) : undefined;
  const whiteNotes = Array.from({ length: 49 }, (_, index) => 48 + index).filter((pitch) => ![1, 3, 6, 8, 10].includes(pitch % 12));
  const blackNotes = Array.from({ length: 48 }, (_, index) => 49 + index).filter((pitch) => [1, 3, 6, 8, 10].includes(pitch % 12)).map((pitch) => {
    const whiteBefore = whiteNotes.filter((white) => white < pitch).length;
    return { pitch, left: (whiteBefore / whiteNotes.length) * 100 - 50 / whiteNotes.length };
  });
  return (
    <div className="composer-lab">
      <header className="composer-header">
        <div><span className="instrument-avatar">{instrument?.name.slice(0, 2).toUpperCase() ?? 'AU'}</span><div><strong>{instrument?.name ?? node.data.label}</strong><small>{instrument ? `${instrument.family} · ${instrument.source} · preset muestreado ${instrument.bankMSB}:${instrument.program}` : 'Motor polifónico Auditorium'}</small></div></div>
        <nav><button className={mode === 'roll' ? 'active' : ''} onClick={() => setMode('roll')}>Piano roll</button><button className={mode === 'score' ? 'active' : ''} onClick={() => setMode('score')}>Partitura</button></nav>
      </header>
      <div className="playable-keyboard">
        {whiteNotes.map((pitch) => <button key={pitch} onPointerDown={() => audioEngine.triggerExternal(node.id, pitch, 0.82, 0.8)}><span>{pitch % 12 === 0 ? `C${pitch / 12 - 1}` : ''}</span></button>)}
        {blackNotes.map((note) => <button className="black-key" key={note.pitch} style={{ left: `${note.left}%` }} onPointerDown={() => audioEngine.triggerExternal(node.id, note.pitch, 0.74, 0.65)} />)}
      </div>
      {mode === 'roll' ? <SequenceEditor node={node} /> : <ScoreEditor node={node} />}
    </div>
  );
}

function GenericLab({ node }: { node: StudioNode }) {
  const definition = getModuleDefinition(node.data.moduleType);
  const updateNodeParam = useStudioStore((state) => state.updateNodeParam);
  return (
    <div className="generic-lab">
      <div className="generic-hero" style={{ '--module-color': node.data.color } as React.CSSProperties}><Settings2 size={28} /><div><strong>{definition.label}</strong><p>{definition.description}</p></div></div>
      <div className="generic-params">
        {definition.params.map((param) => {
          const value = node.data.params[param.key] ?? param.default;
          if (param.kind === 'toggle') return <button className={value ? 'active' : ''} key={param.key} onClick={() => updateNodeParam(node.id, param.key, !value)}><span>{param.label}</span><b>{value ? 'ON' : 'OFF'}</b></button>;
          if (param.kind === 'select') return <label key={param.key}><span>{param.label}</span><select value={String(value)} onChange={(event) => updateNodeParam(node.id, param.key, event.target.value)}>{param.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
          const min = param.min ?? 0; const max = param.max ?? 100;
          return <label key={param.key}><span>{param.label}<b>{Number(value).toFixed(param.step && param.step < 1 ? 1 : 0)} {param.unit}</b></span><input type="range" min={min} max={max} step={param.step} value={Number(value)} onChange={(event) => updateNodeParam(node.id, param.key, Number(event.target.value))} /></label>;
        })}
      </div>
      <footer><span>Procesamiento nativo Web Audio</span><span>32-bit float</span><span>Compensación automática</span></footer>
    </div>
  );
}

export function FloatingEditor() {
  const project = useStudioStore((state) => state.project);
  const nodeId = useStudioStore((state) => state.detailNodeId);
  const closeDetail = useStudioStore((state) => state.closeDetail);
  const node = findNodeInProject(project, nodeId);
  const [position, setPosition] = useState({ x: 96, y: 26 });
  const [maximized, setMaximized] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  if (!node) return null;
  const definition = getModuleDefinition(node.data.moduleType);
  const isDynamics = node.data.moduleType === 'multiband';
  const isDeck = ['turntable', 'stemDeck'].includes(node.data.moduleType);
  const isComposer = ['instrument', 'pianoRoll', 'score', 'oscillator', 'fmSynth', 'wavetable'].includes(node.data.moduleType);
  const isAnalyzer = ['spectrum', 'oscilloscope', 'loudness', 'tuner'].includes(node.data.moduleType);

  const pointerDown = (event: React.PointerEvent) => {
    if (maximized || (event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    drag.current = {
      x: event.clientX - (bounds?.left ?? position.x),
      y: event.clientY - (bounds?.top ?? position.y + TOPBAR_HEIGHT),
    };
  };
  const pointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    setPosition({
      x: Math.max(0, event.clientX - drag.current.x),
      y: Math.max(0, event.clientY - TOPBAR_HEIGHT - drag.current.y),
    });
  };
  const pointerUp = () => { drag.current = null; };

  return (
    <div className="floating-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
      <section role="dialog" aria-modal="true" aria-label={`Editor de ${String(node.data.label)}`} className={`floating-editor ${maximized ? 'maximized' : ''} ${isDynamics ? 'dynamics-window' : ''}`} style={maximized ? undefined : { left: position.x, top: position.y }}>
        <header className="floating-titlebar" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
          <GripHorizontal size={16} />
          <span className="window-color" style={{ background: node.data.color }} />
          <strong>{node.data.label}</strong><small>{definition.category} · Editor avanzado</small>
          <div onPointerDown={(event) => event.stopPropagation()}><button type="button" title="Mantener encima"><Pin size={14} /></button><button type="button" title={maximized ? 'Restaurar' : 'Maximizar'} onClick={() => setMaximized((value) => !value)}>{maximized ? <Minimize2 size={14} /> : <Expand size={14} />}</button><button type="button" title="Cerrar" aria-label="Cerrar editor" onClick={(event) => { event.stopPropagation(); closeDetail(); }}><X size={15} /></button></div>
        </header>
        <div className="floating-content">
          {isDynamics ? <DynamicsLab node={node} /> : isDeck ? <DeckLab node={node} /> : isComposer ? <ComposerLab node={node} /> : isAnalyzer ? <AnalyzerLab node={node} /> : <GenericLab node={node} />}
        </div>
      </section>
    </div>
  );
}
