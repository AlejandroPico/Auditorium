import type { Edge, Node, XYPosition } from '@xyflow/react';

export type ModuleCategory =
  | 'Fuentes'
  | 'Instrumentos'
  | 'DJ & directo'
  | 'Secuenciación'
  | 'Dinámica'
  | 'Filtros & EQ'
  | 'Modulación'
  | 'Espacio'
  | 'Distorsión'
  | 'Mezcla'
  | 'Análisis'
  | 'Control'
  | 'Enrutamiento';

export type ParamKind = 'knob' | 'fader' | 'toggle' | 'select';

export interface ParamDefinition {
  key: string;
  label: string;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  kind?: ParamKind;
  options?: string[];
}

export interface ModuleDefinition {
  type: string;
  label: string;
  shortLabel?: string;
  description: string;
  category: ModuleCategory;
  color: string;
  icon: string;
  inputs: number;
  outputs: number;
  params: ParamDefinition[];
  tags?: string[];
  source?: boolean;
  wide?: boolean;
}

export interface NoteEvent {
  step: number;
  pitch: number;
  velocity: number;
  length: number;
}

export interface ModuleData extends Record<string, unknown> {
  moduleType: string;
  label: string;
  color: string;
  params: Record<string, number | string | boolean>;
  bypass?: boolean;
  solo?: boolean;
  mute?: boolean;
  instrumentId?: string;
  fileName?: string;
  workspaceId?: string;
  sequence?: NoteEvent[];
  drumPattern?: boolean[];
}

export type StudioNode = Node<ModuleData, 'auditorium'>;
export type StudioEdge = Edge<{ signalType?: 'audio' | 'midi' | 'control' }>;

export interface Workspace {
  id: string;
  name: string;
  parentWorkspaceId?: string;
  parentNodeId?: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
}

export interface TransportState {
  bpm: number;
  timeSignature: [number, number];
  masterGain: number;
  loop: boolean;
  metronome: boolean;
}

export interface AuditoriumProject {
  format: 'auditorium-project';
  version: 1;
  metadata: {
    name: string;
    author: string;
    createdAt: string;
    updatedAt: string;
  };
  rootWorkspaceId: string;
  workspaces: Record<string, Workspace>;
  transport: TransportState;
}

export interface InstrumentPreset {
  id: string;
  name: string;
  family: string;
  region: string;
  era: string;
  waveform: OscillatorType;
  attack: number;
  release: number;
  filter: number;
  detune?: number;
  brightness: number;
}

export interface AddModuleOptions {
  definition: ModuleDefinition;
  position?: XYPosition;
  instrument?: InstrumentPreset;
}
