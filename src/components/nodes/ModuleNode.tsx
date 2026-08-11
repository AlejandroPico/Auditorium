import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import {
  Activity,
  AudioWaveform,
  Box,
  Cable,
  ChartNoAxesCombined,
  Disc3,
  Grid3X3,
  Mic2,
  Music2,
  Piano,
  Route,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  Waves,
  X,
  Copy,
} from 'lucide-react';
import { memo } from 'react';
import { getModuleDefinition } from '../../data/moduleCatalog';
import { useStudioStore } from '../../store/studioStore';
import type { StudioNode } from '../../types';

const iconByType: Record<string, typeof Waves> = {
  turntable: Disc3,
  stemDeck: Disc3,
  instrument: Piano,
  pianoRoll: Piano,
  drumMachine: Grid3X3,
  performancePads: Grid3X3,
  multiband: SlidersHorizontal,
  spectrum: ChartNoAxesCombined,
  oscilloscope: Activity,
  microphone: Mic2,
  audioInput: Cable,
  score: Music2,
  capsule: Box,
  output: Volume2,
  splitter: Route,
  merger: Route,
  granular: Sparkles,
  oscillator: Waves,
  noise: AudioWaveform,
};

const MiniDisplay = ({ type, color, active }: { type: string; color: string; active: boolean }) => {
  if (type === 'turntable' || type === 'stemDeck') {
    return (
      <div className={`node-turntable ${active ? 'is-spinning' : ''}`}>
        <div className="node-record"><span /></div>
        <div className="node-pitch"><i /></div>
      </div>
    );
  }
  if (type === 'drumMachine' || type === 'performancePads') {
    return <div className="node-pads">{Array.from({ length: 12 }, (_, index) => <i className={index % 3 === 0 ? 'lit' : ''} key={index} />)}</div>;
  }
  if (type === 'multiband') {
    return (
      <div className="node-bands">
        {[32, 62, 46, 78].map((height, index) => <i key={index} style={{ height: `${height}%`, background: index % 2 ? '#6fd4ff' : '#f6b44f' }} />)}
      </div>
    );
  }
  if (['spectrum', 'oscilloscope', 'loudness'].includes(type)) {
    return (
      <svg className="node-scope" viewBox="0 0 160 38" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 28 C12 26 16 8 28 22 S44 34 54 15 S72 3 81 24 S101 31 110 17 S125 9 137 22 S151 28 160 12" fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'output') {
    return <div className="node-master-meter"><i style={{ height: active ? '78%' : '32%' }} /><i style={{ height: active ? '68%' : '28%' }} /></div>;
  }
  return <div className="node-knob-row">{[0, 1, 2].map((index) => <i key={index} style={{ '--knob-angle': `${-125 + index * 68}deg` } as React.CSSProperties} />)}</div>;
};

export const ModuleNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const definition = getModuleDefinition(data.moduleType);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const openNode = useStudioStore((state) => state.openNode);
  const toggleNodeFlag = useStudioStore((state) => state.toggleNodeFlag);
  const removeSelected = useStudioStore((state) => state.removeSelected);
  const duplicateSelected = useStudioStore((state) => state.duplicateSelected);
  const Icon = iconByType[data.moduleType] ?? AudioWaveform;
  const inputs = Array.from({ length: definition.inputs });
  const outputs = Array.from({ length: definition.outputs });
  const disabled = Boolean(data.bypass || data.mute);

  return (
    <div
      className={`module-node ${definition.wide ? 'is-wide' : ''} ${selected ? 'is-selected' : ''} ${disabled ? 'is-bypassed' : ''}`}
      style={{ '--module-color': data.color } as React.CSSProperties}
      onDoubleClick={(event) => { event.stopPropagation(); openNode(id); }}
    >
      <NodeToolbar className="node-toolbar" isVisible={selected} position={Position.Top}>
        <button title="Duplicar módulo" onClick={duplicateSelected}><Copy size={13} /></button>
        <button title="Eliminar módulo" onClick={removeSelected}><X size={13} /></button>
      </NodeToolbar>
      {inputs.map((_, index) => (
        <Handle
          key={`in-${index}`}
          id={`in-${index}`}
          type="target"
          position={Position.Left}
          style={{ top: `${((index + 1) / (inputs.length + 1)) * 100}%` }}
          className="signal-handle input-handle"
        />
      ))}
      <header className="module-node-header">
        <span className="module-icon"><Icon size={15} strokeWidth={1.8} /></span>
        <span className="module-title" title={String(data.label)}>{String(data.label)}</span>
        <button
          className={`node-power nodrag ${data.bypass ? 'off' : ''}`}
          title={data.bypass ? 'Activar' : 'Bypass'}
          onClick={(event) => { event.stopPropagation(); toggleNodeFlag(id, 'bypass'); }}
        />
      </header>
      <MiniDisplay type={data.moduleType} color={data.color} active={isPlaying && !disabled} />
      <footer className="module-node-footer">
        <span>{definition.category}</span>
        <div className="module-flags">
          <button className={`nodrag ${data.solo ? 'active' : ''}`} onClick={() => toggleNodeFlag(id, 'solo')}>S</button>
          <button className={`nodrag ${data.mute ? 'active danger' : ''}`} onClick={() => toggleNodeFlag(id, 'mute')}>M</button>
        </div>
      </footer>
      {outputs.map((_, index) => (
        <Handle
          key={`out-${index}`}
          id={`out-${index}`}
          type="source"
          position={Position.Right}
          style={{ top: `${((index + 1) / (outputs.length + 1)) * 100}%` }}
          className="signal-handle output-handle"
        />
      ))}
    </div>
  );
});

ModuleNode.displayName = 'ModuleNode';
