import { useEffect, useRef } from 'react';
import { CircleDot, Ear, Link2, RotateCcw, Sparkles } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { useStudioStore } from '../store/studioStore';
import type { StudioNode } from '../types';

const stageColors = ['#f2a44b', '#6fd4ff', '#70e1c2', '#a88bff', '#ff7481', '#f5bf55'];

function drawSpectrum(canvas: HTMLCanvasElement, analyser: AnalyserNode | null, phase: number) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(111,212,255,.28)');
  gradient.addColorStop(1, 'rgba(111,212,255,0)');
  const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
  if (analyser && data) analyser.getByteFrequencyData(data);
  const points = 110;
  context.beginPath();
  for (let index = 0; index < points; index += 1) {
    const x = (index / (points - 1)) * width;
    const bin = data ? Math.min(data.length - 1, Math.floor((index / points) ** 2.2 * data.length)) : 0;
    const live = data ? data[bin] / 255 : 0;
    const synthetic = (Math.sin(index * 0.31 + phase) * 0.08 + Math.sin(index * 0.09 - phase * 0.6) * 0.12 + 0.42) * Math.exp(-index / 165);
    const amplitude = Math.max(live * 0.78, synthetic);
    const y = height - 12 - amplitude * (height - 20);
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.lineTo(width, height); context.lineTo(0, height); context.closePath();
  context.fillStyle = gradient; context.fill();
  context.beginPath();
  for (let index = 0; index < points; index += 1) {
    const x = (index / (points - 1)) * width;
    const bin = data ? Math.min(data.length - 1, Math.floor((index / points) ** 2.2 * data.length)) : 0;
    const live = data ? data[bin] / 255 : 0;
    const synthetic = (Math.sin(index * 0.31 + phase) * 0.08 + Math.sin(index * 0.09 - phase * 0.6) * 0.12 + 0.42) * Math.exp(-index / 165);
    const y = height - 12 - Math.max(live * 0.78, synthetic) * (height - 20);
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.strokeStyle = '#78dcff'; context.lineWidth = 1.7; context.stroke();
}

export function DynamicsLab({ node }: { node: StudioNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const updateNodeParam = useStudioStore((state) => state.updateNodeParam);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const p = node.data.params;

  useEffect(() => {
    let frame = 0;
    let animation = 0;
    const draw = () => {
      if (canvasRef.current) drawSpectrum(canvasRef.current, audioEngine.getAnalyser(node.id) ?? audioEngine.analyser, frame * 0.025);
      frame += isPlaying ? 1 : 0.12;
      animation = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animation);
  }, [isPlaying, node.id]);

  const crossoverValues = [Number(p.cross1), Number(p.cross2), Number(p.cross3)];
  const crossoverPosition = (frequency: number) => ((Math.log10(frequency) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * 100;

  return (
    <div className="dynamics-lab">
      <div className="dynamics-global">
        <div className="dynamics-title"><span className="polarity-glyph">P</span><div><strong>Polarity 4B</strong><small>dinámica multibanda // Auditorium</small></div></div>
        {[
          ['amount', 'AMOUNT'], ['down', 'GLOBAL DOWN'], ['up', 'GLOBAL UP'], ['clip', 'GLOBAL CLIP'],
        ].map(([key, label]) => (
          <label className="big-knob" key={key}>
            <span style={{ '--value': `${Number(p[key]) * 2.7 - 135}deg` } as React.CSSProperties}><i /></span>
            <input type="range" min="0" max="100" value={Number(p[key])} onChange={(event) => updateNodeParam(node.id, key, Number(event.target.value))} />
            <b>{label}</b><small>{Number(p[key]).toFixed(0)}%</small>
          </label>
        ))}
        <div className="dynamics-modes"><button className={p.oversampling ? 'active' : ''} onClick={() => updateNodeParam(node.id, 'oversampling', !p.oversampling)}>4× OS</button><button className={p.linearPhase ? 'active' : ''} onClick={() => updateNodeParam(node.id, 'linearPhase', !p.linearPhase)}>LIN PHASE</button><button>PRO</button></div>
      </div>

      <div className="spectrum-editor">
        <canvas ref={canvasRef} />
        <div className="spectrum-grid-lines">{[40, 100, 250, 500, 1000, 2500, 5000, 10000, 20000].map((frequency) => <i key={frequency} style={{ left: `${crossoverPosition(frequency)}%` }}><span>{frequency >= 1000 ? `${frequency / 1000}k` : frequency}</span></i>)}</div>
        {crossoverValues.map((frequency, index) => (
          <label className="crossover-marker" key={index} style={{ left: `${crossoverPosition(frequency)}%`, '--marker-color': stageColors[index + 1] } as React.CSSProperties}>
            <span>{frequency >= 1000 ? `${(frequency / 1000).toFixed(1)} kHz` : `${frequency} Hz`}</span>
            <input type="range" min={index === 0 ? 40 : index === 1 ? 300 : 2000} max={index === 0 ? 500 : index === 1 ? 4000 : 16000} value={frequency} onChange={(event) => updateNodeParam(node.id, `cross${index + 1}`, Number(event.target.value))} />
          </label>
        ))}
        <div className="spectrum-legend"><span><i className="input" />INPUT</span><span><i className="output" />OUTPUT</span><button><Sparkles size={12} />AUTO CROSSOVER</button></div>
      </div>

      <div className="stage-rack">
        {['PRE', 'B1', 'B2', 'B3', 'B4', 'POST'].map((stage, index) => (
          <article key={stage} style={{ '--stage-color': stageColors[index] } as React.CSSProperties}>
            <header><strong>{stage}</strong><span>{index === 0 ? 'FULL RANGE' : index === 5 ? 'MASTER' : index === 1 ? `< ${crossoverValues[0]} Hz` : index === 4 ? `> ${(crossoverValues[2] / 1000).toFixed(1)} kHz` : 'CROSS BAND'}</span><button><Ear size={12} /></button></header>
            <div className="stage-meter"><i className="down" style={{ height: `${38 + index * 6}%` }} /><i className="up" style={{ height: `${54 - index * 3}%` }} /><i className="clip" style={{ height: `${8 + (index % 2) * 6}%` }} /></div>
            <div className="stage-controls">
              <label><span>DOWN</span><input type="range" min="0" max="100" value={Math.max(0, Number(p.down) + (index - 2) * 3)} readOnly /></label>
              <label><span>UP</span><input type="range" min="0" max="100" value={Math.max(0, Number(p.up) - (index - 2) * 2)} readOnly /></label>
              <label><span>CLIP</span><input type="range" min="0" max="100" value={Number(p.clip)} readOnly /></label>
            </div>
            <footer><button>S</button><button className="delta"><CircleDot size={10} />Δ</button><span>{index % 2 ? '-2.4' : '-1.7'} dB</span></footer>
          </article>
        ))}
      </div>
      <div className="dynamics-footer"><button><RotateCcw size={13} />Normalize</button><button><Link2 size={13} />Match level</button><div><span>IN <b>-14.2 LUFS</b></span><span>OUT <b>-13.9 LUFS</b></span></div><small>LR24 · 48 kHz · 4× oversampling</small></div>
    </div>
  );
}
