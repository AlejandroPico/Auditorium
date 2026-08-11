import { Minus, Plus, RotateCcw } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { useStudioStore } from '../store/studioStore';
import type { NoteEvent, StudioNode } from '../types';

const pitches = [72, 71, 69, 67, 65, 64, 62, 60, 59, 57, 55, 53, 52, 50, 48];
const names: Record<number, string> = { 72: 'C5', 71: 'B4', 69: 'A4', 67: 'G4', 65: 'F4', 64: 'E4', 62: 'D4', 60: 'C4', 59: 'B3', 57: 'A3', 55: 'G3', 53: 'F3', 52: 'E3', 50: 'D3', 48: 'C3' };

export function SequenceEditor({ node, compact = false }: { node: StudioNode; compact?: boolean }) {
  const setSequence = useStudioStore((state) => state.setSequence);
  const sequence = node.data.sequence ?? [];

  const toggle = (step: number, pitch: number) => {
    const existing = sequence.find((note) => note.step === step && note.pitch === pitch);
    const next: NoteEvent[] = existing
      ? sequence.filter((note) => note !== existing)
      : [...sequence, { step, pitch, velocity: 0.78, length: 0.85 }];
    setSequence(node.id, next);
    if (!existing) audioEngine.triggerExternal(node.id, pitch, 0.78, 0.24);
  };

  return (
    <div className={`sequence-editor ${compact ? 'compact' : ''}`}>
      <div className="sequence-toolbar">
        <div><strong>Piano roll</strong><span>16 pasos · 1/16</span></div>
        <div>
          <button title="Reducir rejilla"><Minus size={14} /></button>
          <button title="Ampliar rejilla"><Plus size={14} /></button>
          <button title="Restablecer patrón" onClick={() => setSequence(node.id, [])}><RotateCcw size={14} /></button>
        </div>
      </div>
      <div className="piano-roll-grid">
        <div className="piano-labels">
          {pitches.map((pitch) => <button key={pitch} className={names[pitch]?.includes('#') ? 'black' : ''} onClick={() => audioEngine.triggerExternal(node.id, pitch)}>{names[pitch]}</button>)}
        </div>
        <div className="piano-cells">
          {pitches.map((pitch) => (
            <div className="piano-row" key={pitch}>
              {Array.from({ length: 16 }, (_, step) => {
                const note = sequence.find((event) => event.step === step && event.pitch === pitch);
                return <button key={step} className={`${note ? 'active' : ''} ${step % 4 === 0 ? 'beat' : ''}`} onClick={() => toggle(step, pitch)} aria-label={`${names[pitch]} paso ${step + 1}`} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="velocity-lane">
        <span>VEL</span>
        {Array.from({ length: 16 }, (_, step) => {
          const velocity = Math.max(...sequence.filter((note) => note.step === step).map((note) => note.velocity), 0.08);
          return <i key={step} style={{ height: `${velocity * 100}%` }} />;
        })}
      </div>
    </div>
  );
}
