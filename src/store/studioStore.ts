import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { create } from 'zustand';
import { DEFAULT_INSTRUMENT_ID } from '../data/instruments';
import { defaultParams, getModuleDefinition } from '../data/moduleCatalog';
import type {
  AddModuleOptions,
  AuditoriumProject,
  ModuleData,
  NoteEvent,
  StudioEdge,
  StudioNode,
  Workspace,
} from '../types';

const uid = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

const edgeStyle = (color = '#6fd4ff') => ({
  stroke: color,
  strokeWidth: 2.1,
  filter: `drop-shadow(0 0 3px ${color}55)`,
});

const makeEdge = (source: string, target: string, id = uid('cable')): StudioEdge => ({
  id,
  source,
  target,
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6fd4ff', width: 14, height: 14 },
  style: edgeStyle(),
  data: { signalType: 'audio' },
});

const defaultSequence: NoteEvent[] = [
  { step: 0, pitch: 60, velocity: 0.8, length: 0.8 },
  { step: 3, pitch: 64, velocity: 0.68, length: 0.7 },
  { step: 6, pitch: 67, velocity: 0.82, length: 0.8 },
  { step: 10, pitch: 72, velocity: 0.74, length: 1.2 },
  { step: 14, pitch: 67, velocity: 0.62, length: 0.8 },
];

const makeNode = (
  moduleType: string,
  position: XYPosition,
  options: Partial<ModuleData> = {},
  id = uid(moduleType),
): StudioNode => {
  const definition = getModuleDefinition(moduleType);
  return {
    id,
    type: 'auditorium',
    position,
    data: {
      moduleType,
      label: options.label ?? definition.label,
      color: definition.color,
      params: { ...defaultParams(definition), ...(options.params ?? {}) },
      bypass: false,
      solo: false,
      mute: false,
      ...(definition.source && ['instrument', 'oscillator', 'pianoRoll', 'score'].includes(moduleType)
        ? { sequence: options.sequence ?? defaultSequence }
        : {}),
      ...(moduleType === 'drumMachine'
        ? { drumPattern: options.drumPattern ?? [true, false, false, false, true, false, true, false, true, false, false, true, true, false, true, false] }
        : {}),
      ...(moduleType === 'instrument' ? { instrumentId: options.instrumentId ?? DEFAULT_INSTRUMENT_ID } : {}),
      ...options,
    },
    selected: false,
    draggable: !['portalIn', 'portalOut'].includes(moduleType),
  };
};

export const createInitialProject = (): AuditoriumProject => {
  const now = new Date().toISOString();
  const deck = makeNode('turntable', { x: 20, y: 50 }, { label: 'Deck A' }, 'deck-a');
  const dynamics = makeNode('multiband', { x: 292, y: 28 }, {}, 'polarity-4b');
  const instrument = makeNode('instrument', { x: 20, y: 320 }, { label: 'Piano de concierto' }, 'instrument-main');
  const reverb = makeNode('reverb', { x: 292, y: 326 }, {}, 'reverb-main');
  const drums = makeNode('drumMachine', { x: 20, y: 570 }, {}, 'drums-main');
  const mixer = makeNode('mixer', { x: 580, y: 220 }, { label: 'Bus musical' }, 'mixer-main');
  const spectrum = makeNode('spectrum', { x: 850, y: 216 }, {}, 'spectrum-main');
  const output = makeNode('output', { x: 1135, y: 218 }, {}, 'master-output');
  const capsule = makeNode('capsule', { x: 292, y: 545 }, { label: 'Color paralelo', workspaceId: 'capsule-color' }, 'capsule-color-node');

  const root: Workspace = {
    id: 'root',
    name: 'Escenario principal',
    nodes: [deck, dynamics, instrument, reverb, drums, mixer, spectrum, output, capsule],
    edges: [
      makeEdge(deck.id, dynamics.id, 'deck-to-dynamics'),
      makeEdge(dynamics.id, mixer.id, 'dynamics-to-mixer'),
      makeEdge(instrument.id, reverb.id, 'instrument-to-reverb'),
      makeEdge(reverb.id, mixer.id, 'reverb-to-mixer'),
      makeEdge(instrument.id, capsule.id, 'instrument-to-capsule'),
      makeEdge(capsule.id, mixer.id, 'capsule-to-mixer'),
      makeEdge(drums.id, mixer.id, 'drums-to-mixer'),
      makeEdge(mixer.id, spectrum.id, 'mixer-to-spectrum'),
      makeEdge(spectrum.id, output.id, 'spectrum-to-output'),
    ],
  };

  const portalIn = makeNode('portalIn', { x: 40, y: 190 }, { label: 'Desde escenario' }, 'capsule-in');
  const filter = makeNode('filter', { x: 310, y: 120 }, { params: { frequency: 6200, q: 1.2, mode: 'lowpass' } }, 'capsule-filter');
  const chorus = makeNode('chorus', { x: 580, y: 120 }, {}, 'capsule-chorus');
  const portalOut = makeNode('portalOut', { x: 860, y: 190 }, { label: 'Hacia escenario' }, 'capsule-out');
  const child: Workspace = {
    id: 'capsule-color',
    name: 'Color paralelo',
    parentWorkspaceId: 'root',
    parentNodeId: capsule.id,
    nodes: [portalIn, filter, chorus, portalOut],
    edges: [makeEdge(portalIn.id, filter.id), makeEdge(filter.id, chorus.id), makeEdge(chorus.id, portalOut.id)],
  };

  return {
    format: 'auditorium-project',
    version: 1,
    metadata: { name: 'Sesión sin título', author: '', createdAt: now, updatedAt: now },
    rootWorkspaceId: 'root',
    workspaces: { root, [child.id]: child },
    transport: { bpm: 122, timeSignature: [4, 4], masterGain: -6, loop: true, metronome: false },
  };
};

interface HistorySnapshot {
  project: AuditoriumProject;
  activeWorkspaceId: string;
}

interface StudioState {
  project: AuditoriumProject;
  activeWorkspaceId: string;
  selectedNodeId: string | null;
  isPlaying: boolean;
  isRecording: boolean;
  performanceMode: boolean;
  showMinimap: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  bottomTab: 'mixer' | 'arrangement' | 'instruments' | 'score' | 'files';
  detailNodeId: string | null;
  showWelcome: boolean;
  status: string;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  onNodesChange: (changes: NodeChange<StudioNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StudioEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addModule: (options: AddModuleOptions) => string;
  removeSelected: () => void;
  duplicateSelected: () => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeParam: (nodeId: string, key: string, value: number | string | boolean) => void;
  updateNodeData: (nodeId: string, data: Partial<ModuleData>) => void;
  toggleNodeFlag: (nodeId: string, key: 'bypass' | 'solo' | 'mute') => void;
  setSequence: (nodeId: string, sequence: NoteEvent[]) => void;
  enterWorkspace: (workspaceId: string) => void;
  leaveWorkspace: () => void;
  openNode: (nodeId: string) => void;
  closeDetail: () => void;
  setProjectName: (name: string) => void;
  setBpm: (bpm: number) => void;
  setMasterGain: (gain: number) => void;
  toggleTransportOption: (key: 'loop' | 'metronome') => void;
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  stopTransport: () => void;
  setPanel: (panel: 'left' | 'right' | 'bottom', open: boolean) => void;
  setBottomTab: (tab: StudioState['bottomTab']) => void;
  setPerformanceMode: (enabled: boolean) => void;
  setShowMinimap: (enabled: boolean) => void;
  setWelcome: (show: boolean) => void;
  setStatus: (status: string) => void;
  loadProject: (project: AuditoriumProject) => void;
  newProject: () => void;
  undo: () => void;
  redo: () => void;
}

const cloneProject = (project: AuditoriumProject): AuditoriumProject => structuredClone(project);

const updateTimestamp = (project: AuditoriumProject) => ({
  ...project,
  metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
});

const getActiveWorkspace = (state: StudioState) => state.project.workspaces[state.activeWorkspaceId];

const mutateWorkspace = (
  state: StudioState,
  transform: (workspace: Workspace) => Workspace,
  withHistory = false,
): Partial<StudioState> => {
  const workspace = getActiveWorkspace(state);
  const project = updateTimestamp({
    ...state.project,
    workspaces: { ...state.project.workspaces, [workspace.id]: transform(workspace) },
  });
  return {
    project,
    ...(withHistory
      ? {
          historyPast: [...state.historyPast.slice(-39), { project: cloneProject(state.project), activeWorkspaceId: state.activeWorkspaceId }],
          historyFuture: [],
        }
      : {}),
  };
};

export const useStudioStore = create<StudioState>((set, get) => ({
  project: createInitialProject(),
  activeWorkspaceId: 'root',
  selectedNodeId: null,
  isPlaying: false,
  isRecording: false,
  performanceMode: false,
  showMinimap: true,
  leftOpen: true,
  rightOpen: true,
  bottomOpen: true,
  bottomTab: 'mixer',
  detailNodeId: null,
  showWelcome: true,
  status: 'Motor listo · 48 kHz',
  historyPast: [],
  historyFuture: [],

  onNodesChange: (changes) => set((state) => mutateWorkspace(state, (workspace) => ({
    ...workspace,
    nodes: applyNodeChanges(changes, workspace.nodes),
  }), changes.some((change) => change.type === 'remove'))),

  onEdgesChange: (changes) => set((state) => mutateWorkspace(state, (workspace) => ({
    ...workspace,
    edges: applyEdgeChanges(changes, workspace.edges),
  }), changes.some((change) => change.type === 'remove'))),

  onConnect: (connection) => set((state) => mutateWorkspace(state, (workspace) => ({
    ...workspace,
    edges: addEdge({
      ...connection,
      id: uid('cable'),
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6fd4ff', width: 14, height: 14 },
      style: edgeStyle(),
      data: { signalType: 'audio' },
    }, workspace.edges),
  }), true)),

  addModule: ({ definition, position, instrument }) => {
    const nodeId = uid(definition.type);
    set((state) => {
      const workspace = getActiveWorkspace(state);
      const offset = workspace.nodes.length * 17;
      const nodePosition = position ?? { x: 180 + (offset % 350), y: 120 + (offset % 240) };
      let data: Partial<ModuleData> = instrument
        ? { instrumentId: instrument.id, label: instrument.name }
        : {};
      let workspaces = state.project.workspaces;
      if (definition.type === 'capsule') {
        const childId = uid('workspace');
        data = { ...data, workspaceId: childId };
        const inNode = makeNode('portalIn', { x: 40, y: 170 }, { label: 'Entrada' });
        const outNode = makeNode('portalOut', { x: 590, y: 170 }, { label: 'Salida' });
        const gain = makeNode('gain', { x: 310, y: 160 }, { label: 'Interior limpio' });
        workspaces = {
          ...workspaces,
          [childId]: {
            id: childId,
            name: instrument?.name ?? 'Nueva cápsula',
            parentWorkspaceId: state.activeWorkspaceId,
            parentNodeId: nodeId,
            nodes: [inNode, gain, outNode],
            edges: [makeEdge(inNode.id, gain.id), makeEdge(gain.id, outNode.id)],
          },
        };
      }
      const node = makeNode(definition.type, nodePosition, data, nodeId);
      const project = updateTimestamp({
        ...state.project,
        workspaces: {
          ...workspaces,
          [workspace.id]: { ...workspace, nodes: [...workspace.nodes, node] },
        },
      });
      return {
        project,
        selectedNodeId: nodeId,
        historyPast: [...state.historyPast.slice(-39), { project: cloneProject(state.project), activeWorkspaceId: state.activeWorkspaceId }],
        historyFuture: [],
        status: `${definition.label} añadido al escenario`,
      };
    });
    return nodeId;
  },

  removeSelected: () => set((state) => {
    if (!state.selectedNodeId) return state;
    const selected = state.selectedNodeId;
    const workspace = getActiveWorkspace(state);
    const node = workspace.nodes.find((item) => item.id === selected);
    const result = mutateWorkspace(state, (current) => ({
      ...current,
      nodes: current.nodes.filter((item) => item.id !== selected),
      edges: current.edges.filter((edge) => edge.source !== selected && edge.target !== selected),
    }), true);
    const workspaces = { ...(result.project ?? state.project).workspaces };
    if (node?.data.workspaceId) delete workspaces[node.data.workspaceId];
    return {
      ...result,
      project: { ...(result.project ?? state.project), workspaces },
      selectedNodeId: null,
      detailNodeId: null,
      status: 'Módulo eliminado',
    };
  }),

  duplicateSelected: () => {
    const state = get();
    if (!state.selectedNodeId) return;
    const node = getActiveWorkspace(state).nodes.find((item) => item.id === state.selectedNodeId);
    if (!node) return;
    const definition = getModuleDefinition(node.data.moduleType);
    const newId = state.addModule({ definition, position: { x: node.position.x + 42, y: node.position.y + 42 } });
    get().updateNodeData(newId, { ...structuredClone(node.data), workspaceId: undefined, label: `${node.data.label} copia` });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateNodeParam: (nodeId, key, value) => set((state) => mutateWorkspace(state, (workspace) => ({
    ...workspace,
    nodes: workspace.nodes.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, params: { ...node.data.params, [key]: value } } }
      : node),
  }))),

  updateNodeData: (nodeId, data) => set((state) => mutateWorkspace(state, (workspace) => ({
    ...workspace,
    nodes: workspace.nodes.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node),
  }))),

  toggleNodeFlag: (nodeId, key) => set((state) => mutateWorkspace(state, (workspace) => ({
    ...workspace,
    nodes: workspace.nodes.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, [key]: !node.data[key] } }
      : node),
  }))),

  setSequence: (nodeId, sequence) => get().updateNodeData(nodeId, { sequence }),

  enterWorkspace: (workspaceId) => {
    if (!get().project.workspaces[workspaceId]) return;
    set({ activeWorkspaceId: workspaceId, selectedNodeId: null, detailNodeId: null, status: 'Cápsula abierta' });
  },

  leaveWorkspace: () => set((state) => {
    const current = state.project.workspaces[state.activeWorkspaceId];
    return current.parentWorkspaceId
      ? { activeWorkspaceId: current.parentWorkspaceId, selectedNodeId: current.parentNodeId ?? null, detailNodeId: null, status: 'Nivel superior' }
      : state;
  }),

  openNode: (nodeId) => {
    const node = getActiveWorkspace(get()).nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (node.data.moduleType === 'capsule' && node.data.workspaceId) {
      get().enterWorkspace(node.data.workspaceId);
      return;
    }
    set({ detailNodeId: nodeId, selectedNodeId: nodeId });
  },

  closeDetail: () => set({ detailNodeId: null }),
  setProjectName: (name) => set((state) => ({ project: updateTimestamp({ ...state.project, metadata: { ...state.project.metadata, name } }) })),
  setBpm: (bpm) => set((state) => ({ project: updateTimestamp({ ...state.project, transport: { ...state.project.transport, bpm: Math.max(20, Math.min(400, bpm)) } }) })),
  setMasterGain: (masterGain) => set((state) => ({ project: updateTimestamp({ ...state.project, transport: { ...state.project.transport, masterGain } }) })),
  toggleTransportOption: (key) => set((state) => ({ project: updateTimestamp({ ...state.project, transport: { ...state.project.transport, [key]: !state.project.transport[key] } }) })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setRecording: (isRecording) => set({ isRecording }),
  stopTransport: () => set({ isPlaying: false, isRecording: false, status: 'Transporte detenido' }),
  setPanel: (panel, open) => set(panel === 'left' ? { leftOpen: open } : panel === 'right' ? { rightOpen: open } : { bottomOpen: open }),
  setBottomTab: (bottomTab) => set({ bottomTab, bottomOpen: true }),
  setPerformanceMode: (performanceMode) => set({ performanceMode, leftOpen: !performanceMode, rightOpen: !performanceMode, bottomOpen: !performanceMode }),
  setShowMinimap: (showMinimap) => set({ showMinimap }),
  setWelcome: (showWelcome) => {
    set({ showWelcome });
  },
  setStatus: (status) => set({ status }),

  loadProject: (project) => set({
    project,
    activeWorkspaceId: project.rootWorkspaceId,
    selectedNodeId: null,
    detailNodeId: null,
    isPlaying: false,
    isRecording: false,
    historyPast: [],
    historyFuture: [],
    status: `Proyecto «${project.metadata.name}» cargado`,
  }),

  newProject: () => set({
    project: createInitialProject(),
    activeWorkspaceId: 'root',
    selectedNodeId: null,
    detailNodeId: null,
    isPlaying: false,
    isRecording: false,
    historyPast: [],
    historyFuture: [],
    status: 'Nueva sesión creada',
  }),

  undo: () => set((state) => {
    const previous = state.historyPast.at(-1);
    if (!previous) return { status: 'No hay más acciones que deshacer' };
    return {
      project: previous.project,
      activeWorkspaceId: previous.activeWorkspaceId,
      selectedNodeId: null,
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [{ project: cloneProject(state.project), activeWorkspaceId: state.activeWorkspaceId }, ...state.historyFuture.slice(0, 39)],
      status: 'Acción deshecha',
    };
  }),

  redo: () => set((state) => {
    const next = state.historyFuture[0];
    if (!next) return { status: 'No hay acciones que rehacer' };
    return {
      project: next.project,
      activeWorkspaceId: next.activeWorkspaceId,
      selectedNodeId: null,
      historyPast: [...state.historyPast.slice(-39), { project: cloneProject(state.project), activeWorkspaceId: state.activeWorkspaceId }],
      historyFuture: state.historyFuture.slice(1),
      status: 'Acción rehecha',
    };
  }),
}));

export const selectActiveWorkspace = (state: StudioState) => state.project.workspaces[state.activeWorkspaceId];

export const findNodeInProject = (project: AuditoriumProject, nodeId: string | null): StudioNode | null => {
  if (!nodeId) return null;
  for (const workspace of Object.values(project.workspaces)) {
    const node = workspace.nodes.find((item) => item.id === nodeId);
    if (node) return node;
  }
  return null;
};
