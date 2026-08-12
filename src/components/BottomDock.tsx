import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  FileAudio,
  FolderOpen,
  Library,
  Music2,
  Piano,
  Search,
  SlidersVertical,
  Upload,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { instrumentFamilies, instruments } from '../data/instruments';
import { selectActiveWorkspace, useStudioStore } from '../store/studioStore';
import { ScoreEditor } from './ScoreEditor';

const tabs = [
  { id: 'mixer' as const, label: 'Mezclador', icon: SlidersVertical },
  { id: 'arrangement' as const, label: 'Arreglo', icon: AudioLines },
  { id: 'instruments' as const, label: 'Instrumentos', icon: Piano },
  { id: 'score' as const, label: 'Partitura', icon: Music2 },
  { id: 'files' as const, label: 'Medios', icon: FolderOpen },
];

function Meter({ index, active }: { index: number; active: boolean }) {
  return <div className="mixer-meter"><i style={{ height: active ? `${45 + ((index * 17) % 43)}%` : `${8 + index * 3}%` }} /><i style={{ height: active ? `${38 + ((index * 23) % 48)}%` : `${6 + index * 2}%` }} /></div>;
}

function MixerView() {
  const workspace = useStudioStore(selectActiveWorkspace);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const updateNodeParam = useStudioStore((state) => state.updateNodeParam);
  const toggleNodeFlag = useStudioStore((state) => state.toggleNodeFlag);
  const selectNode = useStudioStore((state) => state.selectNode);
  const strips = workspace.nodes.filter((node) => !['portalIn', 'portalOut', 'score', 'pianoRoll', 'macro', 'lfo'].includes(node.data.moduleType));
  return (
    <div className="mixer-view">
      <div className="mixer-scroll">
        {strips.map((node, index) => {
          const gainKey = Object.hasOwn(node.data.params, 'gain') ? 'gain' : 'level';
          const raw = Number(node.data.params[gainKey] ?? (gainKey === 'gain' ? 0 : 75));
          const normalized = gainKey === 'gain' ? Math.max(0, Math.min(100, ((raw + 60) / 72) * 100)) : raw;
          return (
            <article className={`mixer-strip ${node.data.moduleType === 'output' ? 'master-strip' : ''}`} key={node.id} style={{ '--strip-color': node.data.color } as React.CSSProperties} onClick={() => selectNode(node.id)}>
              <header><span>{String(node.data.label)}</span><small>{node.data.moduleType.toUpperCase()}</small></header>
              <div className="mixer-pan"><i style={{ transform: `rotate(${Number(node.data.params.pan ?? 0) * 1.25}deg)` }} /><span>PAN</span></div>
              <div className="mixer-channel-body"><Meter index={index} active={isPlaying && !node.data.mute} /><div className="mixer-fader"><input type="range" min="0" max="100" value={normalized} onChange={(event) => { const value = Number(event.target.value); updateNodeParam(node.id, gainKey, gainKey === 'gain' ? (value / 100) * 72 - 60 : value); }} /><span>0</span><span>-12</span><span>-36</span><span>−∞</span></div></div>
              <div className="strip-buttons"><button className={node.data.solo ? 'active' : ''} onClick={(event) => { event.stopPropagation(); toggleNodeFlag(node.id, 'solo'); }}>S</button><button className={node.data.mute ? 'active danger' : ''} onClick={(event) => { event.stopPropagation(); toggleNodeFlag(node.id, 'mute'); }}>M</button></div>
              <footer><i /><span>{index + 1}</span></footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ArrangementView() {
  const workspace = useStudioStore(selectActiveWorkspace);
  const tracks = workspace.nodes.filter((node) => ['turntable', 'instrument', 'drumMachine', 'pianoRoll', 'score', 'stemDeck', 'sampler'].includes(node.data.moduleType));
  return (
    <div className="arrangement-view">
      <div className="arrangement-ruler"><span>1</span><span>5</span><span>9</span><span>13</span><span>17</span><span>21</span><span>25</span><span>29</span><span>33</span></div>
      <div className="arrangement-tracks">
        {tracks.map((node, index) => (
          <div className="arrangement-track" key={node.id}>
            <header style={{ '--track-color': node.data.color } as React.CSSProperties}><i /><strong>{String(node.data.label)}</strong><span>{index + 1}</span></header>
            <div className="track-lane">
              <article className={node.data.moduleType === 'drumMachine' ? 'pattern-clip' : 'audio-clip'} style={{ left: `${index % 3 * 6}%`, width: `${36 + (index % 4) * 12}%`, '--track-color': node.data.color } as React.CSSProperties}>
                <strong>{node.data.fileName ? String(node.data.fileName) : `${node.data.label} · toma 01`}</strong>
                {node.data.moduleType === 'drumMachine'
                  ? <div>{node.data.drumPattern?.map((hit, hitIndex) => <i className={hit ? 'hit' : ''} key={hitIndex} />)}</div>
                  : <svg viewBox="0 0 400 32" preserveAspectRatio="none"><path d="M0 17 L8 9 14 22 22 7 30 25 39 11 48 18 57 5 65 28 73 12 82 20 91 8 101 23 112 14 124 18 136 4 147 29 158 10 169 22 180 8 192 25 205 11 216 18 228 5 239 27 252 12 267 21 278 9 290 24 304 13 319 19 334 6 349 27 364 11 380 22 400 15" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>}
              </article>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstrumentLibrary() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('Todo');
  const [bankState, setBankState] = useState(audioEngine.instrumentEngineState);
  const setStatus = useStudioStore((state) => state.setStatus);
  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase('es').trim();
    return instruments.filter((instrument) => (family === 'Todo' || instrument.family === family) && (!normalized || `${instrument.name} ${instrument.family} ${instrument.sourcePreset}`.toLocaleLowerCase('es').includes(normalized)));
  }, [family, query]);

  useEffect(() => {
    if (audioEngine.instrumentEngineState === 'ready') { setBankState('ready'); return; }
    setBankState('loading');
    setStatus('Cargando GeneralUser GS · 201 presets muestreados únicos · motor AudioWorklet');
    audioEngine.prepareInstrumentLibrary()
      .then(() => { setBankState('ready'); setStatus('GeneralUser GS listo · 201 presets únicos cargados en el hilo de audio'); })
      .catch((error) => { setBankState('error'); setStatus(error instanceof Error ? error.message : 'No se pudo cargar el banco instrumental'); });
  }, [setStatus]);

  const preview = async (instrument: (typeof instruments)[number]) => {
    try {
      setStatus(`${bankState === 'ready' ? 'Escuchando' : 'Preparando'} ${instrument.name} · preset ${instrument.bankMSB}:${instrument.program} de GeneralUser GS`);
      await audioEngine.previewInstrument(instrument);
      setBankState('ready');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo reproducir la muestra');
    }
  };

  const handleDrag = (event: React.DragEvent, instrument: (typeof instruments)[number]) => {
    event.dataTransfer.setData('application/auditorium-instrument', instrument.id);
    event.dataTransfer.effectAllowed = 'copy';
    setStatus(`Arrastrando ${instrument.name} · suelta en el lienzo para añadirlo`);
  };

  return (
    <div className="instrument-library">
      <aside>
        <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entre instrumentos…" /></label>
        <nav><button className={family === 'Todo' ? 'active' : ''} onClick={() => setFamily('Todo')}><Library size={14} />Todos</button>{instrumentFamilies.map((item) => <button className={family === item ? 'active' : ''} key={item} onClick={() => setFamily(item)}><Music2 size={14} />{item}</button>)}</nav>
      </aside>
      <div className="instrument-grid-wrap">
        <div className="library-heading"><div><Piano size={15} /><strong>{family}</strong></div><span>{bankState === 'loading' ? 'Cargando banco muestreado…' : bankState === 'error' ? 'Banco no disponible · revisa la conexión' : 'GeneralUser GS muestreado · arrastra o escucha'}</span></div>
        <div className="instrument-grid">
          {filtered.map((instrument, index) => (
            <article className="instrument-preset-card" draggable key={instrument.id} onDragStart={(event) => handleDrag(event, instrument)} style={{ '--instrument-hue': `${(index * 29) % 360}` } as React.CSSProperties}>
              <strong>{instrument.name}</strong>
              <button draggable={false} disabled={bankState === 'loading'} title={`Escuchar el preset real ${instrument.sourcePreset}`} onClick={() => preview(instrument)}><Volume2 size={14} /></button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreView() {
  const workspace = useStudioStore(selectActiveWorkspace);
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);
  const selected = workspace.nodes.find((node) => node.id === selectedNodeId && node.data.sequence);
  const sequenceNode = selected ?? workspace.nodes.find((node) => node.data.sequence);
  if (!sequenceNode) return <div className="empty-score"><Music2 size={26} /><strong>No hay una voz seleccionada</strong><p>Arrastra una partitura desde Módulos para comenzar a escribir.</p></div>;
  return <ScoreEditor node={sequenceNode} />;
}

interface SessionMediaItem {
  id: string;
  file: File;
  name: string;
  format: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
}

const sessionMedia = new Map<string, SessionMediaItem>();
const audioExtensions = /\.(mp3|wav|flac|aiff?|aac|m4a|ogg|opus|wma|caf|au|mid|midi)$/i;

function FilesView() {
  const workspace = useStudioStore(selectActiveWorkspace);
  const projectMedia = workspace.nodes.filter((node) => node.data.fileName);
  const [media, setMedia] = useState<SessionMediaItem[]>(() => Array.from(sessionMedia.values()));
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const setStatus = useStudioStore((state) => state.setStatus);
  const visible = media.filter((item) => item.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));

  const ingest = async (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith('audio/') || audioExtensions.test(file.name));
    if (!accepted.length) { setStatus('La selección no contenía archivos de audio compatibles'); return; }
    setBusy(true);
    const items: SessionMediaItem[] = [];
    for (const file of accepted.slice(0, 1500)) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const item: SessionMediaItem = { id, file, name: file.name, format: file.name.split('.').pop()?.toUpperCase() ?? 'AUDIO' };
      try { Object.assign(item, await audioEngine.inspectAudioFile(file)); } catch { /* formatos que el navegador no decodifica siguen catalogados */ }
      sessionMedia.set(id, item); items.push(item);
    }
    setMedia(Array.from(sessionMedia.values()));
    setBusy(false); setStatus(`${items.length} medios añadidos a la biblioteca de esta sesión`);
  };

  const openDirectory = async () => {
    type Entry = { kind: 'file' | 'directory'; getFile?: () => Promise<File>; values?: () => AsyncIterable<Entry> };
    const picker = (window as typeof window & { showDirectoryPicker?: () => Promise<Entry> }).showDirectoryPicker;
    if (!picker) { folderInputRef.current?.click(); return; }
    try {
      const root = await picker(); const files: File[] = [];
      const walk = async (entry: Entry) => {
        if (entry.kind === 'file' && entry.getFile) files.push(await entry.getFile());
        else if (entry.values) for await (const child of entry.values()) await walk(child);
      };
      await walk(root); await ingest(files);
    } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; setStatus('No se pudo abrir esa carpeta'); }
  };

  const preview = (item: SessionMediaItem) => {
    const url = URL.createObjectURL(item.file); const player = new Audio(url);
    player.volume = 0.72; void player.play(); player.onended = () => URL.revokeObjectURL(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    setStatus(`Escuchando ${item.name}`);
  };
  return (
    <div className="files-view">
      <aside><strong><FileAudio size={15} />Biblioteca</strong><button className="active">Carpetas locales <span>{media.length}</span></button><button>Archivos del proyecto <span>{projectMedia.length}</span></button><button>Grabaciones <span>0</span></button><small>Los permisos de carpetas son privados y se conceden desde tu dispositivo.</small></aside>
      <div className="media-browser">
        <div className="media-actions"><button onClick={openDirectory}><FolderOpen size={14} />Abrir carpeta</button><button onClick={() => inputRef.current?.click()}><Upload size={14} />Añadir archivos</button><label><Search size={13} /><input placeholder="Buscar en la biblioteca…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{busy ? 'Analizando audio…' : `${visible.length} archivos`}</span></div>
        <input className="visually-hidden" ref={inputRef} type="file" accept="audio/*,.flac,.aiff,.aif,.wma,.caf,.au,.mid,.midi" multiple onChange={(event) => void ingest(Array.from(event.target.files ?? []))} />
        <input className="visually-hidden" ref={folderInputRef} type="file" accept="audio/*" multiple {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={(event) => void ingest(Array.from(event.target.files ?? []))} />
        <div className="file-table"><header><span>Nombre</span><span>Formato</span><span>Duración</span><span>Frecuencia</span><span>Escucha</span></header>{visible.map((item) => <div key={item.id}><span><i><FileAudio size={14} /></i><b>{item.name}</b></span><span>{item.format}</span><span>{item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : 'Sin decodificar'}</span><span>{item.sampleRate ? `${(item.sampleRate / 1000).toFixed(1)} kHz · ${item.channels} ch` : '—'}</span><span><button title={`Escuchar ${item.name}`} onClick={() => preview(item)}><Volume2 size={13} /></button></span></div>)}{!visible.length && <section><FolderOpen size={24} /><strong>{media.length ? 'No hay coincidencias' : 'Abre tu biblioteca de audio'}</strong><p>Selecciona una carpeta o varios archivos MP3, WAV, FLAC, AIFF, AAC, OGG y otros formatos compatibles.</p><button onClick={openDirectory}><FolderOpen size={14} />Elegir carpeta</button></section>}</div>
      </div>
    </div>
  );
}

export function BottomDock() {
  const open = useStudioStore((state) => state.bottomOpen);
  const tab = useStudioStore((state) => state.bottomTab);
  const setBottomTab = useStudioStore((state) => state.setBottomTab);
  const setPanel = useStudioStore((state) => state.setPanel);
  return (
    <section className={`bottom-dock panel-surface ${open ? 'open' : 'closed'}`}>
      <nav className="dock-tabs">
        <div className="dock-tab-group">{tabs.map((item) => <button key={item.id} className={tab === item.id && open ? 'active' : ''} onClick={() => { if (tab === item.id && open) setPanel('bottom', false); else setBottomTab(item.id); }}><item.icon size={14} />{item.label}</button>)}</div>
        <span className="dock-state"><i />AUTOGUARDADO</span>
        <button className="dock-toggle" onClick={() => setPanel('bottom', !open)}>{open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</button>
      </nav>
      {open && <div className="dock-content">{tab === 'mixer' ? <MixerView /> : tab === 'arrangement' ? <ArrangementView /> : tab === 'instruments' ? <InstrumentLibrary /> : tab === 'score' ? <ScoreView /> : <FilesView />}</div>}
    </section>
  );
}
