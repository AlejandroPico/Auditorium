import { Eraser, Link2, Minus, Music, Plus } from 'lucide-react';
import { useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { useStudioStore } from '../store/studioStore';
import type { NoteEvent, StudioNode } from '../types';

const staffPitches = [77, 76, 74, 72, 71, 69, 67, 65, 64, 62, 60];
const values = [
  { label: 'Redonda', glyph: '𝅝', length: 4 }, { label: 'Blanca', glyph: '𝅗𝅥', length: 2 },
  { label: 'Negra', glyph: '♩', length: 1 }, { label: 'Corchea', glyph: '♪', length: 0.5 },
  { label: 'Semicorchea', glyph: '𝅘𝅥𝅯', length: 0.25 }, { label: 'Fusa', glyph: '𝅘𝅥𝅰', length: 0.125 },
  { label: 'Semifusa', glyph: '𝅘𝅥𝅱', length: 0.0625 },
];

const glyphFor = (note: NoteEvent) => {
  if (note.rest) return note.length >= 4 ? '𝄻' : note.length >= 2 ? '𝄼' : note.length >= 1 ? '𝄽' : note.length >= 0.5 ? '𝄾' : note.length >= 0.25 ? '𝄿' : '𝅀';
  return values.reduce((closest, value) => Math.abs(value.length - note.length) < Math.abs(closest.length - note.length) ? value : closest).glyph;
};

export function ScoreEditor({ node }: { node: StudioNode }) {
  const setSequence = useStudioStore((state) => state.setSequence);
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  const sequence = node.data.sequence ?? [];
  const measures = Math.max(1, Math.min(64, Number(node.data.scoreMeasures ?? 4)));
  const totalSteps = measures * 16;
  const [length, setLength] = useState(1);
  const [dotted, setDotted] = useState(false);
  const [tie, setTie] = useState(false);
  const [rest, setRest] = useState(false);
  const [accidental, setAccidental] = useState<NoteEvent['accidental']>();
  const [articulation, setArticulation] = useState<NonNullable<NoteEvent['articulation']>>('normal');

  const addNote = (step: number, pitch: number) => {
    const existing = sequence.find((note) => note.step === step && note.pitch === pitch && Boolean(note.rest) === rest);
    const eventLength = length * (dotted ? 1.5 : 1);
    const next = existing ? sequence.filter((note) => note !== existing) : [...sequence, {
      step, pitch, velocity: articulation === 'accent' ? 0.95 : 0.8, length: eventLength, rest, dotted, tie, accidental, articulation,
    }];
    setSequence(node.id, next.sort((a, b) => a.step - b.step || a.pitch - b.pitch));
    if (!existing && !rest) audioEngine.triggerExternal(node.id, pitch, 0.82, Math.min(1.2, eventLength * 0.5));
  };

  return (
    <div className="score-editor">
      <div className="score-toolbar">
        <div className="score-title"><strong>Partitura</strong><span>Clave de sol · 4/4 · {measures} compases</span></div>
        <div className="notation-tools" aria-label="Valores de nota">
          {values.map((value) => <button key={value.label} className={length === value.length && !rest ? 'active' : ''} title={value.label} onClick={() => { setLength(value.length); setRest(false); }}>{value.glyph}</button>)}
          <button className={rest ? 'active' : ''} title="Silencio" onClick={() => setRest((value) => !value)}>𝄽</button>
          <button className={dotted ? 'active' : ''} title="Puntillo" onClick={() => setDotted((value) => !value)}>·</button>
          <button className={tie ? 'active' : ''} title="Ligadura" onClick={() => setTie((value) => !value)}><Link2 size={13} /></button>
        </div>
        <div className="notation-tools modifiers" aria-label="Alteraciones y articulación">
          {(['sharp', 'flat', 'natural'] as const).map((item) => <button key={item} className={accidental === item ? 'active' : ''} title={item === 'sharp' ? 'Sostenido' : item === 'flat' ? 'Bemol' : 'Becuadro'} onClick={() => setAccidental(accidental === item ? undefined : item)}>{item === 'sharp' ? '♯' : item === 'flat' ? '♭' : '♮'}</button>)}
          {(['staccato', 'tenuto', 'accent'] as const).map((item) => <button key={item} className={articulation === item ? 'active' : ''} title={item} onClick={() => setArticulation(articulation === item ? 'normal' : item)}>{item === 'staccato' ? '•' : item === 'tenuto' ? '—' : '>'}</button>)}
        </div>
        <button title="Limpiar partitura" onClick={() => setSequence(node.id, [])}><Eraser size={14} /></button>
      </div>
      <div className="staff-scroll">
        <div className="staff-wrap" style={{ '--score-steps': totalSteps, '--score-width': `${Math.max(680, totalSteps * 24)}px` } as React.CSSProperties}>
          <div className="staff-clef">𝄞</div>
          <div className="staff-grid">
            <div className="staff-lines">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
            {staffPitches.map((pitch, row) => (
              <div className="staff-click-row" key={pitch} style={{ top: `${row * 9.05}%` }}>
                {Array.from({ length: totalSteps }, (_, step) => {
                  const notes = sequence.filter((event) => event.step === step && event.pitch === pitch);
                  return <button key={step} className={`${notes.length ? 'has-note' : ''} ${step % 16 === 0 ? 'measure' : step % 4 === 0 ? 'beat' : ''}`} onClick={() => addNote(step, pitch)}>
                    {notes.map((note, index) => <span className={`score-glyph ${note.tie ? 'tied' : ''} ${note.articulation ?? ''}`} key={`${note.step}-${note.pitch}-${index}`}>{note.accidental === 'sharp' ? '♯' : note.accidental === 'flat' ? '♭' : note.accidental === 'natural' ? '♮' : ''}{glyphFor(note)}{note.dotted ? '·' : ''}</span>)}
                  </button>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <footer className="score-footer"><Music size={14} /><span>{rest ? 'Modo silencio' : `${values.find((value) => value.length === length)?.label ?? 'Nota'}${dotted ? ' con puntillo' : ''}`} · haz clic para escribir o retirar.</span><div className="measure-controls"><button title="Quitar compás" disabled={measures <= 1} onClick={() => updateNodeData(node.id, { scoreMeasures: measures - 1 })}><Minus size={12} /></button><b>{measures} compases</b><button title="Añadir compás" onClick={() => updateNodeData(node.id, { scoreMeasures: measures + 1 })}><Plus size={12} /></button></div></footer>
    </div>
  );
}
