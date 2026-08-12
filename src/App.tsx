import { Activity, ChevronLeft, ChevronRight, Radio, ShieldCheck, WifiOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { BottomDock } from './components/BottomDock';
import { FloatingEditor } from './components/FloatingEditor';
import { Inspector } from './components/Inspector';
import { ModuleBrowser } from './components/ModuleBrowser';
import { StudioCanvas } from './components/StudioCanvas';
import { TopBar } from './components/TopBar';
import { Welcome } from './components/Welcome';
import { selectActiveWorkspace, useStudioStore } from './store/studioStore';
import { exportProject, openProjectPicker, readAutosave, saveAutosave } from './utils/projectIO';

export default function App() {
  const project = useStudioStore((state) => state.project);
  const workspace = useStudioStore(selectActiveWorkspace);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const leftOpen = useStudioStore((state) => state.leftOpen);
  const rightOpen = useStudioStore((state) => state.rightOpen);
  const bottomOpen = useStudioStore((state) => state.bottomOpen);
  const status = useStudioStore((state) => state.status);
  const setPanel = useStudioStore((state) => state.setPanel);
  const loadProject = useStudioStore((state) => state.loadProject);
  const setStatus = useStudioStore((state) => state.setStatus);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      const autosave = readAutosave();
      if (autosave) loadProject(autosave);
    }
  }, [loadProject]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveAutosave(project), 450);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      audioEngine.syncProject(project).catch((error) => setStatus(error instanceof Error ? error.message : 'Error al actualizar el grafo'));
    }, 160);
    return () => window.clearTimeout(timer);
  }, [isPlaying, project, setStatus]);

  useEffect(() => {
    const keydown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.code === 'Space' && !typing) {
        event.preventDefault();
        const state = useStudioStore.getState();
        try {
          if (state.isPlaying) { audioEngine.pause(); state.setPlaying(false); }
          else { await audioEngine.syncProject(state.project); await audioEngine.play(); state.setPlaying(true); }
        } catch (error) { state.setStatus(error instanceof Error ? error.message : 'No se pudo iniciar el audio'); }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); exportProject(useStudioStore.getState().project); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        try { loadProject(await openProjectPicker()); } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo abrir'); }
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !typing) {
        const state = useStudioStore.getState();
        if (state.selectedEdgeId) state.removeEdge(state.selectedEdgeId);
        else state.removeSelected();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); useStudioStore.getState().undo(); }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) { event.preventDefault(); useStudioStore.getState().redo(); }
      if (event.key === 'Escape') {
        const state = useStudioStore.getState();
        state.closeDetail();
        state.selectEdge(null);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [loadProject, setStatus]);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    }
  }, []);

  const isDesktop = '__TAURI_INTERNALS__' in window;

  return (
    <div className={`auditorium-app ${leftOpen ? 'has-left' : ''} ${rightOpen ? 'has-right' : ''} ${bottomOpen ? 'has-bottom' : ''}`}>
      <TopBar />
      <div className="studio-layout">
        {leftOpen ? <ModuleBrowser /> : <button className="panel-reveal left" onClick={() => setPanel('left', true)} title="Mostrar biblioteca"><ChevronRight size={16} /></button>}
        <div className="canvas-column">
          <StudioCanvas />
          <div className="workspace-statusbar">
            <span className="status-message"><Radio size={11} />{status}</span>
            <span><Activity size={11} />{isPlaying ? 'Procesando audio' : 'Edición modular'}</span>
            <span>{workspace.nodes.length} módulos</span>
            <span><ShieldCheck size={11} />Motor protegido contra clipping</span>
            <span>{isDesktop ? <><Radio size={11} />Aplicación local</> : <><WifiOff size={11} />Sesión local y privada</>}</span>
            <span className="canvas-shortcut">Rueda: zoom · doble clic: encajar</span>
          </div>
        </div>
        {rightOpen ? <Inspector /> : <button className="panel-reveal right" onClick={() => setPanel('right', true)} title="Mostrar inspector"><ChevronLeft size={16} /></button>}
      </div>
      <BottomDock />
      <FloatingEditor />
      <Welcome />
    </div>
  );
}
