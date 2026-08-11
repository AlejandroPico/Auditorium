import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { ChevronRight, MousePointer2, Plus, ScanSearch, Sparkles, Undo2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { getModuleDefinition } from '../data/moduleCatalog';
import { selectActiveWorkspace, useStudioStore } from '../store/studioStore';
import { ModuleNode } from './nodes/ModuleNode';

const nodeTypes: NodeTypes = { auditorium: ModuleNode };

interface CanvasMenu {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

function CanvasInner() {
  const workspace = useStudioStore(selectActiveWorkspace);
  const project = useStudioStore((state) => state.project);
  const activeWorkspaceId = useStudioStore((state) => state.activeWorkspaceId);
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);
  const onNodesChange = useStudioStore((state) => state.onNodesChange);
  const onEdgesChange = useStudioStore((state) => state.onEdgesChange);
  const onConnect = useStudioStore((state) => state.onConnect);
  const selectNode = useStudioStore((state) => state.selectNode);
  const openNode = useStudioStore((state) => state.openNode);
  const addModule = useStudioStore((state) => state.addModule);
  const enterWorkspace = useStudioStore((state) => state.enterWorkspace);
  const performanceMode = useStudioStore((state) => state.performanceMode);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [menu, setMenu] = useState<CanvasMenu | null>(null);

  const breadcrumbs = useMemo(() => {
    const result = [];
    let current = project.workspaces[activeWorkspaceId];
    while (current) {
      result.unshift(current);
      current = current.parentWorkspaceId ? project.workspaces[current.parentWorkspaceId] : undefined!;
    }
    return result;
  }, [activeWorkspaceId, project.workspaces]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/auditorium-module');
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addModule({ definition: getModuleDefinition(type), position });
  }, [addModule, screenToFlowPosition]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setMenu({ x: event.clientX, y: event.clientY, flowX: flow.x, flowY: flow.y });
  };

  const addFromMenu = (type: string) => {
    if (!menu) return;
    addModule({ definition: getModuleDefinition(type), position: { x: menu.flowX, y: menu.flowY } });
    setMenu(null);
  };

  return (
    <main className={`studio-canvas ${performanceMode ? 'performance-mode' : ''}`} onContextMenu={handleContextMenu}>
      <div className="canvas-breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id}>
            {index > 0 && <ChevronRight size={13} />}
            <button className={crumb.id === activeWorkspaceId ? 'active' : ''} onClick={() => enterWorkspace(crumb.id)}>{crumb.name}</button>
          </div>
        ))}
        <span className="canvas-mode"><i className={isPlaying ? 'online' : ''} />{isPlaying ? 'Procesando audio' : 'Edición modular'}</span>
      </div>
      <ReactFlow
        nodes={workspace.nodes}
        edges={workspace.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeDoubleClick={(_, node) => openNode(node.id)}
        onPaneClick={() => { selectNode(null); setMenu(null); }}
        onDrop={handleDrop}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
        fitView
        fitViewOptions={{ padding: 0.24, minZoom: 0.48, maxZoom: 1.05 }}
        minZoom={0.12}
        maxZoom={2.8}
        snapToGrid
        snapGrid={[12, 12]}
        deleteKeyCode={null}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        panOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.1} color="#27313e" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => String(node.data.color ?? '#718096')}
          maskColor="rgba(4, 6, 10, .74)"
          pannable
          zoomable
        />
      </ReactFlow>
      {!workspace.nodes.length && (
        <div className="canvas-empty">
          <div><Sparkles size={24} /></div>
          <h3>Este escenario está vacío</h3>
          <p>Arrastra un módulo desde la biblioteca o abre el menú contextual.</p>
          <button onClick={() => addModule({ definition: getModuleDefinition('instrument'), position: { x: 200, y: 160 } })}><Plus size={15} />Añadir instrumento</button>
        </div>
      )}
      <div className="canvas-help"><MousePointer2 size={13} /><span>Arrastra para mover · rueda para navegar · conecta los puertos · doble clic para profundizar</span></div>
      <button className="fit-canvas-button" title="Encuadrar todos los módulos" onClick={() => fitView({ padding: 0.2, duration: 500 })}><ScanSearch size={15} /></button>
      {menu && (
        <div className="canvas-context-menu" style={{ left: menu.x, top: menu.y }}>
          <span>Insertar en este punto</span>
          <button onClick={() => addFromMenu('instrument')}><Piano size={14} />Instrumento</button>
          <button onClick={() => addFromMenu('multiband')}><SlidersHorizontal size={14} />Polarity 4B</button>
          <button onClick={() => addFromMenu('spectrum')}><Activity size={14} />Analizador</button>
          <button onClick={() => addFromMenu('capsule')}><Box size={14} />Cápsula anidada</button>
          <hr />
          <button onClick={() => { useStudioStore.getState().undo(); setMenu(null); }}><Undo2 size={14} />Deshacer</button>
        </div>
      )}
      {selectedNodeId && <span className="selection-status">Módulo seleccionado · doble clic para editor avanzado</span>}
    </main>
  );
}

// Imports kept local to avoid making every module card depend on the complete icon set.
import { Activity, Box, Piano, SlidersHorizontal } from 'lucide-react';

export function StudioCanvas() {
  return <ReactFlowProvider><CanvasInner /></ReactFlowProvider>;
}
