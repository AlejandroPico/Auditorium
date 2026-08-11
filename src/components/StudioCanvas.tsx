import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { ChevronRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { instrumentById } from '../data/instruments';
import { getModuleDefinition } from '../data/moduleCatalog';
import { selectActiveWorkspace, useStudioStore } from '../store/studioStore';
import { ModuleNode } from './nodes/ModuleNode';

const nodeTypes: NodeTypes = { auditorium: ModuleNode };

function CanvasInner() {
  const workspace = useStudioStore(selectActiveWorkspace);
  const showMinimap = useStudioStore((state) => state.showMinimap);
  const project = useStudioStore((state) => state.project);
  const activeWorkspaceId = useStudioStore((state) => state.activeWorkspaceId);
  const onNodesChange = useStudioStore((state) => state.onNodesChange);
  const onEdgesChange = useStudioStore((state) => state.onEdgesChange);
  const onConnect = useStudioStore((state) => state.onConnect);
  const selectNode = useStudioStore((state) => state.selectNode);
  const openNode = useStudioStore((state) => state.openNode);
  const addModule = useStudioStore((state) => state.addModule);
  const enterWorkspace = useStudioStore((state) => state.enterWorkspace);
  const performanceMode = useStudioStore((state) => state.performanceMode);
  const { screenToFlowPosition, fitView } = useReactFlow();

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
    const instrumentId = event.dataTransfer.getData('application/auditorium-instrument');
    const type = event.dataTransfer.getData('application/auditorium-module');
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    if (instrumentId) {
      const instrument = instrumentById.get(instrumentId);
      if (instrument) addModule({ definition: getModuleDefinition('instrument'), position, instrument });
      return;
    }
    if (type) addModule({ definition: getModuleDefinition(type), position });
  }, [addModule, screenToFlowPosition]);

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('react-flow__pane')) fitView({ padding: 0.2, duration: 450 });
  }, [fitView]);

  return (
    <main className={`studio-canvas ${performanceMode ? 'performance-mode' : ''}`} onDoubleClickCapture={handleCanvasDoubleClick}>
      <div className="canvas-breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id}>
            {index > 0 && <ChevronRight size={13} />}
            <button className={crumb.id === activeWorkspaceId ? 'active' : ''} onClick={() => enterWorkspace(crumb.id)}>{crumb.name}</button>
          </div>
        ))}
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
        onPaneClick={() => selectNode(null)}
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
        panOnScroll={false}
        zoomOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.1} color="#27313e" />
        {showMinimap && <MiniMap
          position="bottom-right"
          nodeColor={(node) => String(node.data.color ?? '#718096')}
          nodeStrokeColor={(node) => String(node.data.color ?? '#718096')}
          nodeStrokeWidth={2}
          nodeBorderRadius={4}
          maskColor="rgba(4, 6, 10, .74)"
          maskStrokeColor="rgba(111, 212, 255, .55)"
          maskStrokeWidth={1.5}
          pannable
          zoomable
          ariaLabel="Mapa general del lienzo"
        />}
      </ReactFlow>
      {!workspace.nodes.length && (
        <div className="canvas-empty">
          <h3>Este escenario está vacío</h3>
          <p>Arrastra aquí un módulo o un instrumento para comenzar.</p>
        </div>
      )}
    </main>
  );
}

export function StudioCanvas() {
  return <ReactFlowProvider><CanvasInner /></ReactFlowProvider>;
}
