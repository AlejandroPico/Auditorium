import { Eraser, Music, Plus } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { useStudioStore } from '../store/studioStore';
import type { StudioNode } from '../types';

const staffPitches = [77, 76, 74, 72, 71, 69, 67, 65, 64, 62, 60];

export function ScoreEditor({ node }: { node: StudioNode }) {
  const setSequence = useStudioStore((state) => state.setSequence);
  const sequence = node.data.sequence ?? [];

  const addNote = (step: number, pitch: number) => {
    const existing = sequence.find((note) => note.step === step && note.pitch === pitch);
    const next = existing
      ? sequence.filter((note) => note !== existing)
      : [...sequence.filter((note) => note.step !== step), { step, pitch, velocity: 0.8, length: 1 }];
    setSequence(node.id, next);
    if (!existing) audioEngine.triggerExternal(node.id, pitch, 0.82, 0.5);
  };

  return (
    <div className="score-editor">
      <div className="score-toolbar">
        <div><strong>Partitura</strong><span>Clave de sol · 4/4 · Do mayor</span></div>
        <div className="note-values">
          <button className="active" title="Negra">♩</button><button title="Corchea">♪</button><button title="Blanca">𝅗𝅥</button><button title="Ligadura">⌒</button>
        </div>
        <button title="Limpiar" onClick={() => setSequence(node.id, [])}><Eraser size={14} /></button>
      </div>
      <div className="staff-wrap">
        <div className="staff-clef">𝄞</div>
        <div className="staff-grid">
          <div className="staff-lines">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
          {staffPitches.map((pitch, row) => (
            <div className="staff-click-row" key={pitch} style={{ top: `${row * 9.05}%` }}>
              {Array.from({ length: 16 }, (_, step) => {
                const note = sequence.find((event) => event.step === step && event.pitch === pitch);
                return (
                  <button key={step} className={`${note ? 'has-note' : ''} ${step % 4 === 0 ? 'measure' : ''}`} onClick={() => addNote(step, pitch)}>
                    {note && <span className="staff-note"><i />{note.length <= 0.5 && <b />}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <footer className="score-footer"><Music size={14} /><span>Haz clic sobre el pentagrama para escribir o retirar notas.</span><button><Plus size={13} />Compás</button></footer>
    </div>
  );
}
