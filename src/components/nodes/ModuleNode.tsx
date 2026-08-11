import { Handle, NodeToolbar, Position, useViewport, type NodeProps } from '@xyflow/react';
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
import { memo, useRef } from 'react';
import { getModuleDefinition } from '../../data/moduleCatalog';
import { useStudioStore } from '../../store/studioStore';
import type { ParamDefinition, StudioNode } from '../../types';

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
  return null;
};

function NodeParameter({ nodeId, param, value, detailed }: { nodeId: string; param: ParamDefinition; value: number | string | boolean; detailed: boolean }) {
  const updateNodeParam = useStudioStore((state) => state.updateNodeParam);
  const drag = useRef<{ y: number; value: number } | null>(null);
  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const numeric = Number(value);
  const ratio = max === min ? 0 : (numeric - min) / (max - min);
  const setNumeric = (next: number) => {
    const step = param.step ?? (max - min) / 100;
    const clamped = Math.max(min, Math.min(max, next));
    updateNodeParam(nodeId, param.key, Math.round(clamped / step) * step);
  };
  if (param.kind === 'toggle') return <button type="button" className={`node-param-switch nodrag ${value ? 'active' : ''}`} title={`${param.label}: ${value ? 'activado' : 'desactivado'}`} onClick={(event) => { event.stopPropagation(); updateNodeParam(nodeId, param.key, !value); }}><i />{detailed && <span>{param.label}</span>}</button>;
  if (param.kind === 'select') return <button type="button" className="node-param-select nodrag" title={`${param.label}: ${String(value)}. Pulsa para cambiar.`} onClick={(event) => { event.stopPropagation(); const options = param.options ?? []; const index = options.indexOf(String(value)); updateNodeParam(nodeId, param.key, options[(index + 1) % options.length] ?? value); }}><b>{String(value).slice(0, 5)}</b>{detailed && <span>{param.label}</span>}</button>;
  return (
    <div className="node-param nodrag" title={`${param.label}: ${numeric}${param.unit ? ` ${param.unit}` : ''}. Arrastra verticalmente.`}
      onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { y: event.clientY, value: numeric }; }}
      onPointerMove={(event) => { if (!drag.current) return; event.stopPropagation(); setNumeric(drag.current.value + (drag.current.y - event.clientY) / 90 * (max - min)); }}
      onPointerUp={(event) => { event.stopPropagation(); drag.current = null; }}
      onDoubleClick={(event) => { event.stopPropagation(); setNumeric(Number(param.default)); }}>
      <i className="node-param-knob" style={{ '--knob-angle': `${-135 + Math.max(0, Math.min(1, ratio)) * 270}deg` } as React.CSSProperties} />
      {detailed && <><span>{param.label}</span><output>{Number.isFinite(numeric) ? numeric.toFixed(param.step && param.step < 1 ? 1 : 0) : String(value)}{param.unit ?? ''}</output></>}
    </div>
  );
}

export const ModuleNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const definition = getModuleDefinition(data.moduleType);
  const { zoom } = useViewport();
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
      onPointerDown={(event) => {
        if (event.detail === 2) {
          event.stopPropagation();
          openNode(id);
        }
      }}
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
      {!!definition.params.length && <div className={`node-param-grid ${zoom >= 0.92 ? 'is-detailed' : ''}`}>
        {definition.params.map((param) => <NodeParameter key={param.key} nodeId={id} param={param} value={data.params[param.key] ?? param.default} detailed={zoom >= 0.92} />)}
      </div>}
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
