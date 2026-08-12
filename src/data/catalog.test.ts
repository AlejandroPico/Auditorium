import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import { moduleCatalog } from './moduleCatalog';

describe('catálogo de Auditorium', () => {
  it('solo publica los 201 presets melódicos y acústicamente únicos de GeneralUser GS', () => {
    expect(instruments).toHaveLength(201);
    expect(new Set(instruments.map((instrument) => instrument.id)).size).toBe(instruments.length);
    expect(new Set(instruments.map((instrument) => `${instrument.bankMSB}:${instrument.bankLSB}:${instrument.program}`)).size).toBe(instruments.length);
    expect(instruments.every((instrument) => instrument.engine === 'soundfont' && instrument.source === 'GeneralUser GS 1.471')).toBe(true);
  });

  it('incluye fuentes, procesado, mezcla, análisis y enrutamiento', () => {
    const categories = new Set(moduleCatalog.map((module) => module.category));
    expect(moduleCatalog.length).toBeGreaterThanOrEqual(45);
    for (const category of ['Fuentes', 'Instrumentos', 'DJ & directo', 'Dinámica', 'Mezcla', 'Análisis', 'Enrutamiento']) {
      expect(categories.has(category as never)).toBe(true);
    }
  });

  it('mantiene identificadores de módulo únicos', () => {
    expect(new Set(moduleCatalog.map((module) => module.type)).size).toBe(moduleCatalog.length);
  });

  it('mantiene procedencia, licencia y registro de muestra para cada preset', () => {
    expect(new Set(instruments.map((instrument) => instrument.family)).size).toBe(15);
    expect(instruments.every((instrument) => instrument.license === 'GeneralUser GS License v2.0')).toBe(true);
    expect(instruments.every((instrument) => instrument.previewPitches.length >= 4)).toBe(true);
    expect(instruments.some((instrument) => instrument.name === 'Stereo Grand')).toBe(true);
    expect(instruments.some((instrument) => instrument.name === 'Nylon Guitar')).toBe(true);
    expect(instruments.some((instrument) => instrument.name === 'Shakuhachi')).toBe(true);
    expect(instruments.some((instrument) => instrument.name === 'Sitar')).toBe(true);
  });
});
