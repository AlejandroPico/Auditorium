import type { InstrumentPreset } from '../types';
import { generalUserPresets } from './generated/generalUserPresets';

const families = [
  'Pianos y teclas', 'Campanas y láminas', 'Órganos y acordeones', 'Guitarras', 'Bajos',
  'Cuerdas orquestales', 'Conjuntos y voces', 'Metales', 'Maderas', 'Flautas',
  'Sintetizadores lead', 'Pads', 'Texturas sintéticas', 'Instrumentos del mundo', 'Percusión melódica',
] as const;

const familyForProgram = (program: number) => families[Math.min(families.length - 1, Math.floor(program / 8))];

const previewForProgram = (program: number, bank: number) => {
  const group = Math.floor(program / 8);
  const phrases: number[][] = [
    [48, 55, 60, 64, 67, 72], [60, 64, 67, 72, 76], [48, 55, 60, 64], [52, 55, 59, 64, 67],
    [36, 43, 48, 46], [55, 59, 62, 67], [48, 55, 60, 64], [48, 55, 60, 64, 67],
    [55, 59, 62, 65], [72, 74, 76, 79, 81], [60, 63, 67, 70], [48, 55, 60, 67],
    [48, 61, 67, 74], [60, 62, 65, 69, 72], [60, 64, 67, 72],
  ];
  const transpose = bank > 0 ? (bank % 3) - 1 : 0;
  return phrases[Math.min(phrases.length - 1, group)].map((pitch) => pitch + transpose);
};

const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export const instruments: InstrumentPreset[] = generalUserPresets.map((preset) => ({
  id: `generaluser-${preset.bankMSB}-${preset.bankLSB}-${preset.program}-${slugify(preset.name)}`,
  name: preset.name,
  family: familyForProgram(preset.program),
  sourcePreset: preset.name,
  bankMSB: preset.bankMSB,
  bankLSB: preset.bankLSB,
  program: preset.program,
  engine: 'soundfont',
  source: 'GeneralUser GS 1.471',
  license: 'GeneralUser GS License v2.0',
  previewPitches: previewForProgram(preset.program, preset.bankMSB),
}));

export const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
export const instrumentFamilies = Array.from(new Set(instruments.map((instrument) => instrument.family)));
export const DEFAULT_INSTRUMENT_ID = instruments.find((instrument) => instrument.bankMSB === 0 && instrument.program === 0)!.id;
