import { FileAudio, KeyRound, Link2, Pause, Play, RotateCcw, Save, SkipBack, SkipForward, Waves } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { useStudioStore } from '../store/studioStore';
import type { StudioNode } from '../types';
import { pickAudioFile } from '../utils/projectIO';

function Waveform({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; canvas.height = rect.height * 2;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(2, 2);
    const middle = rect.height / 2;
    const gradient = context.createLinearGradient(0, 0, rect.width, 0);
    gradient.addColorStop(0, '#ff6e64'); gradient.addColorStop(0.5, '#f4b85a'); gradient.addColorStop(1, '#6fd4ff');
    context.fillStyle = gradient;
    for (let x = 0; x < rect.width; x += 2) {
      const envelope = 0.35 + Math.sin(x * 0.014) * 0.12 + Math.sin(x * 0.079) * 0.24 + Math.random() * 0.22;
      const height = Math.max(2, envelope * middle * 0.78);
      context.fillRect(x, middle - height, 1.2, height * 2);
    }
  }, []);
  return <div className="deck-waveform"><canvas ref={canvasRef} /><i className={active ? 'moving' : ''} /><div className="waveform-time"><span>00:00.000</span><b>-03:42.186</b></div></div>;
}

export function DeckLab({ node }: { node: StudioNode }) {
  const updateNodeParam = useStudioStore((state) => state.updateNodeParam);
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  const setStatus = useStudioStore((state) => state.setStatus);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const [dragAngle, setDragAngle] = useState(0);
  const lastAngle = useRef<number | null>(null);

  const load = async () => {
    try {
      const file = await pickAudioFile();
      setStatus(`Analizando ${file.name}…`);
      const info = await audioEngine.loadAudioFile(node.id, file);
      updateNodeData(node.id, { fileName: file.name });
      setStatus(`${file.name} · ${info.duration.toFixed(1)} s · BPM preparado para análisis`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar el audio');
    }
  };

  const angleFromEvent = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    lastAngle.current = angleFromEvent(event);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (lastAngle.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const angle = angleFromEvent(event);
    let delta = angle - lastAngle.current;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    setDragAngle((value) => value + delta * 57.3);
    audioEngine.scratch(node.id, Math.max(-2, Math.min(2, delta * 10)));
    lastAngle.current = angle;
  };

  const release = (event: React.PointerEvent) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    lastAngle.current = null;
  };

  return (
    <div className="deck-lab">
      <header className="deck-header">
        <div className="deck-letter">A</div>
        <div className="track-info"><strong>{node.data.fileName ? String(node.data.fileName).replace(/\.[^.]+$/, '') : 'Arrastra una pista o carga un archivo'}</strong><span>— Auditorium local library</span></div>
        <div className="deck-readout"><span>BPM<b>122.00</b></span><span>KEY<b>8A · Am</b></span><span>GRID<b>1.1.1</b></span></div>
        <button className="load-track" onClick={load}><FileAudio size={16} />CARGAR</button>
      </header>
      <Waveform active={isPlaying} />
      <div className="deck-body">
        <section className="jog-section">
          <div
            className={`large-jog ${isPlaying ? 'is-spinning' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={release}
            onPointerCancel={release}
            style={{ '--scratch-angle': `${dragAngle}deg` } as React.CSSProperties}
          >
            <div className="jog-ring">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ transform: `rotate(${index * 7.5}deg)` }} />)}</div>
            <div className="jog-vinyl"><span /><b>AUDITORIUM</b><small>33⅓</small></div>
          </div>
          <div className="deck-transport"><button><SkipBack size={16} /></button><button className="cue">CUE</button><button className="deck-play">{isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button><button><SkipForward size={16} /></button></div>
        </section>

        <section className="deck-controls">
          <div className="deck-knobs">
            {['GAIN', 'HIGH', 'MID', 'LOW', 'FILTER'].map((label, index) => <label key={label}><span style={{ '--angle': `${-88 + index * 21}deg` } as React.CSSProperties}><i /></span><b>{label}</b></label>)}
          </div>
          <div className="loop-panel">
            <header><span>LOOP</span><div><button><RotateCcw size={12} />IN</button><button>OUT</button></div></header>
            <div>{['1/8', '1/4', '1/2', '1', '2', '4', '8', '16'].map((value) => <button className={value === '4' ? 'active' : ''} key={value}>{value}</button>)}</div>
          </div>
          <div className="deck-options"><button className={node.data.params.keyLock ? 'active' : ''} onClick={() => updateNodeParam(node.id, 'keyLock', !node.data.params.keyLock)}><KeyRound size={13} />KEY LOCK</button><button><Link2 size={13} />SYNC</button><button><Save size={13} />MEMORY</button></div>
        </section>

        <section className="pitch-section">
          <span>+50</span>
          <input type="range" min="-50" max="50" step="0.1" value={Number(node.data.params.pitch)} onChange={(event) => updateNodeParam(node.id, 'pitch', Number(event.target.value))} />
          <output>{Number(node.data.params.pitch) > 0 ? '+' : ''}{Number(node.data.params.pitch).toFixed(1)}%</output>
          <span>−50</span>
        </section>
      </div>
      <div className="performance-pad-bank">
        <div className="pad-modes">{['HOT CUE', 'STEMS', 'PAD FX', 'SAMPLER'].map((mode) => <button className={mode === 'HOT CUE' ? 'active' : ''} key={mode}>{mode}</button>)}</div>
        <div className="hot-pads">{Array.from({ length: 8 }, (_, index) => <button key={index} className={index < 4 ? 'loaded' : ''}><span>{index + 1}</span><small>{index === 0 ? 'INTRO' : index === 1 ? 'DROP' : index === 2 ? 'BREAK' : index === 3 ? 'OUTRO' : 'EMPTY'}</small></button>)}</div>
      </div>
      <footer className="deck-footer"><Waves size={14} /><span>Modo vinilo · scratch táctil activo</span><b>44.1 kHz / Stereo</b><span>LAT 5.3 ms</span></footer>
    </div>
  );
}
