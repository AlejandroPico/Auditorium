import { beforeEach, describe, expect, it } from 'vitest';
import { selectActiveWorkspace, useStudioStore } from './studioStore';

describe('conexiones del lienzo', () => {
  beforeEach(() => {
    useStudioStore.getState().newProject();
    useStudioStore.setState({ showMinimap: false });
  });

  it('mantiene el minimapa oculto inicialmente y disponible como preferencia', () => {
    expect(useStudioStore.getState().showMinimap).toBe(false);
    useStudioStore.getState().setShowMinimap(true);
    expect(useStudioStore.getState().showMinimap).toBe(true);
  });

  it('elimina solo la conexión seleccionada y conserva sus dos módulos', () => {
    const initial = selectActiveWorkspace(useStudioStore.getState());
    const edge = initial.edges[0];
    const nodeIds = initial.nodes.map((node) => node.id);

    useStudioStore.getState().selectEdge(edge.id);
    useStudioStore.getState().removeEdge(edge.id);

    const result = selectActiveWorkspace(useStudioStore.getState());
    expect(result.edges).toHaveLength(initial.edges.length - 1);
    expect(result.edges.some((candidate) => candidate.id === edge.id)).toBe(false);
    expect(result.nodes.map((node) => node.id)).toEqual(nodeIds);
    expect(useStudioStore.getState().selectedEdgeId).toBeNull();

    useStudioStore.getState().undo();
    expect(selectActiveWorkspace(useStudioStore.getState()).edges.some((candidate) => candidate.id === edge.id)).toBe(true);
  });
});
