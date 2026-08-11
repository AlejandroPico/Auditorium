import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import { moduleCatalog } from './moduleCatalog';

describe('catálogo de Auditorium', () => {
  it('ofrece un repertorio instrumental muy superior al mínimo de 300', () => {
    expect(instruments.length).toBeGreaterThanOrEqual(300);
    expect(new Set(instruments.map((instrument) => instrument.id)).size).toBe(instruments.length);
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
});
