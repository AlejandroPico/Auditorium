import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';

describe('exportador WAV', () => {
  it('genera un WAV PCM estéreo de 24 bits con cabecera válida', async () => {
    const left = new Float32Array([0, 0.5, -0.5, 1]);
    const right = new Float32Array([0, -0.5, 0.5, -1]);
    const blob = encodeWav([left], [right], 48000, 24);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

    expect(blob.type).toBe('audio/wav');
    expect(ascii(0, 4)).toBe('RIFF');
    expect(ascii(8, 12)).toBe('WAVE');
    expect(ascii(36, 40)).toBe('data');
    expect(new DataView(bytes.buffer).getUint16(22, true)).toBe(2);
    expect(new DataView(bytes.buffer).getUint16(34, true)).toBe(24);
    expect(bytes.byteLength).toBe(44 + left.length * 2 * 3);
  });
});
