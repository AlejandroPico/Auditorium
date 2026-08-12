import { Cable, ChevronRight, Copy, FileAudio, Gauge, Mic2, SlidersHorizontal, Trash2, Unplug, Waves } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { instrumentById } from '../data/instruments';
import { getModuleDefinition } from '../data/moduleCatalog';
import { findNodeInProject, selectActiveWorkspace, useStudioStore } from '../store/studioStore';
import type { ParamDefinition } from '../types';
import { pickAudioFile } from '../utils/projectIO';

function NumericParam({ definition, value, onChange }: { definition: ParamDefinition; value: number; onChange: (value: number) => void }) {
  const min = definition.min ?? 0;
  const max = definition.max ?? 100;
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="inspector-param">
      <span><b>{definition.label}</b><output>{Number.isInteger(value) ? value : value.toFixed(1)} {definition.unit}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        step={definition.step ?? 1}
        value={value}
        style={{ '--range-progress': `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Inspector() {
  const project = useStudioStore((state) => state.project);
  const workspace = useStudioStore(selectActiveWorkspace);
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);
  const node = findNodeInProject(project, selectedNodeId);
  const updateNodeParam = useStudioStore((state) => state.updateNodeParam);
  const updateNodeData = useStudioStore((state) => state.updateNodeData);
  const toggleNodeFlag = useStudioStore((state) => state.toggleNodeFlag);
  const duplicateSelected = useStudioStore((state) => state.duplicateSelected);
  const removeSelected = useStudioStore((state) => state.removeSelected);
  const openNode = useStudioStore((state) => state.openNode);
  const setPanel = useStudioStore((state) => state.setPanel);
  const setBottomTab = useStudioStore((state) => state.setBottomTab);
  const setStatus = useStudioStore((state) => state.setStatus);

  if (!node) {
    return (
      <aside className="inspector panel-surface inspector-empty">
        <div className="panel-heading">
          <div><span className="eyebrow">Inspector</span><h2>Propiedades</h2></div>
          <button className="icon-button subtle" onClick={() => setPanel('right', false)} title="Ocultar inspector"><ChevronRight size={16} /></button>
        </div>
        <div className="inspector-placeholder">
          <div className="placeholder-orbit"><SlidersHorizontal size={24} /></div>
          <strong>Selecciona un módulo</strong>
          <p>Aquí aparecerán sus parámetros, conexiones, automatización y herramientas avanzadas.</p>
          <div className="shortcut-row"><kbd>doble clic</kbd><span>vista ampliada</span></div>
        </div>
      </aside>
    );
  }

  const definition = getModuleDefinition(node.data.moduleType);
  const instrument = node.data.instrumentId ? instrumentById.get(node.data.instrumentId) : undefined;
  const supportsFile = ['turntable', 'sampler', 'stemDeck'].includes(node.data.moduleType);
  const supportsMic = ['microphone', 'audioInput'].includes(node.data.moduleType);
  const incoming = workspace.edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => workspace.nodes.find((candidate) => candidate.id === edge.source))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const outgoing = workspace.edges
    .filter((edge) => edge.source === node.id)
    .map((edge) => workspace.nodes.find((candidate) => candidate.id === edge.target))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  const loadFile = async () => {
    try {
      const file = await pickAudioFile();
      setStatus(`Decodificando ${file.name}…`);
      const info = await audioEngine.loadAudioFile(node.id, file);
      updateNodeData(node.id, { fileName: file.name });
      setStatus(`${file.name} · ${info.duration.toFixed(1)} s · ${info.sampleRate / 1000} kHz · ${info.channels} ch`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar el audio');
    }
  };

  const enableMic = async () => {
    try {
      await audioEngine.syncProject(project);
      await audioEngine.enableMicrophone(node.id);
      setStatus('Entrada de audio activa · monitorización local');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo abrir la entrada');
    }
  };

  return (
    <aside className="inspector panel-surface">
      <div className="panel-heading">
        <div><span className="eyebrow">Inspector</span><h2>{definition.label}</h2></div>
        <button className="icon-button subtle" onClick={() => setPanel('right', false)} title="Ocultar inspector"><ChevronRight size={16} /></button>
      </div>
      <div className="inspector-scroll">
        <section className="inspector-identity" style={{ '--module-color': node.data.color } as React.CSSProperties}>
          <span className="identity-mark"><Waves size={18} /></span>
          <div>
            <input value={String(node.data.label)} onChange={(event) => updateNodeData(node.id, { label: event.target.value })} />
            <small>{definition.category} · {definition.inputs} in / {definition.outputs} out</small>
          </div>
          <span className="signal-led" />
        </section>

        <div className="inspector-switches">
          <button className={node.data.bypass ? 'active warning' : ''} onClick={() => toggleNodeFlag(node.id, 'bypass')}><Unplug size={14} />Bypass</button>
          <button className={node.data.solo ? 'active' : ''} onClick={() => toggleNodeFlag(node.id, 'solo')}>S Solo</button>
          <button className={node.data.mute ? 'active danger' : ''} onClick={() => toggleNodeFlag(node.id, 'mute')}>M Mute</button>
        </div>

        {supportsFile && (
          <section className="inspector-section media-loader">
            <div className="section-title"><span>Medio</span><small>Local</small></div>
            <button className="primary-action" onClick={loadFile}><FileAudio size={16} /><span>{node.data.fileName ? String(node.data.fileName) : 'Cargar archivo de audio'}</span></button>
            <p>WAV, MP3, FLAC, OGG, Opus, AAC, AIFF y formatos decodificables por el sistema.</p>
          </section>
        )}

        {supportsMic && (
          <section className="inspector-section media-loader">
            <div className="section-title"><span>Hardware</span><small>Entrada</small></div>
            <button className="primary-action" onClick={enableMic}><Mic2 size={16} /><span>Activar entrada física</span></button>
            <p>Solicita el dispositivo sin cancelación de eco, supresión ni ganancia automática.</p>
          </section>
        )}

        {instrument && (
          <section className="instrument-summary" onClick={() => setBottomTab('instruments')}>
            <span className="instrument-monogram">{instrument.name.slice(0, 2).toUpperCase()}</span>
            <div><strong>{instrument.name}</strong><small>{instrument.family} · {instrument.source} · banco {instrument.bankMSB}, programa {instrument.program}</small></div>
            <ChevronRight size={16} />
          </section>
        )}

        <section className="inspector-section connection-summary">
          <div className="section-title"><span>Conexiones</span><small>{incoming.length} entrada{incoming.length === 1 ? '' : 's'} · {outgoing.length} salida{outgoing.length === 1 ? '' : 's'}</small></div>
          <div><Cable size={14} /><span><b>Desde</b><small>{incoming.length ? incoming.map((candidate) => String(candidate.data.label)).join(', ') : 'Sin conexión de entrada'}</small></span></div>
          <div><Cable size={14} /><span><b>Hacia</b><small>{outgoing.length ? outgoing.map((candidate) => String(candidate.data.label)).join(', ') : 'Sin conexión de salida'}</small></span></div>
        </section>

        <section className="inspector-section">
          <div className="section-title"><span>Parámetros</span><small>{definition.params.length}</small></div>
          <div className="param-list">
            {definition.params.map((param) => {
              const value = node.data.params[param.key] ?? param.default;
              if (param.kind === 'toggle') {
                return (
                  <label className="toggle-param" key={param.key}>
                    <span>{param.label}</span>
                    <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateNodeParam(node.id, param.key, event.target.checked)} />
                    <i />
                  </label>
                );
              }
              if (param.kind === 'select') {
                return (
                  <label className="select-param" key={param.key}>
                    <span>{param.label}</span>
                    <select value={String(value)} onChange={(event) => updateNodeParam(node.id, param.key, event.target.value)}>
                      {param.options?.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                );
              }
              return <NumericParam key={param.key} definition={param} value={Number(value)} onChange={(next) => updateNodeParam(node.id, param.key, next)} />;
            })}
          </div>
        </section>

        <section className="inspector-section routing-summary">
          <div className="section-title"><span>Señal</span><small>Audio estéreo</small></div>
          <div><Gauge size={16} /><span><b>48 kHz / 32-bit float</b><small>Procesamiento interno</small></span></div>
          <div><Waves size={16} /><span><b>Compensación automática</b><small>Grafo de baja latencia</small></span></div>
        </section>

        <button className="advanced-button" onClick={() => openNode(node.id)}><SlidersHorizontal size={16} /><span>Abrir editor avanzado</span><ChevronRight size={16} /></button>
      </div>
      <footer className="inspector-actions">
        <button onClick={duplicateSelected}><Copy size={15} />Duplicar</button>
        <button className="danger-text" onClick={removeSelected}><Trash2 size={15} />Eliminar</button>
      </footer>
    </aside>
  );
}
