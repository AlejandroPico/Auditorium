import { ChevronLeft, Plus, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { instruments } from '../data/instruments';
import { moduleCatalog, moduleCategories } from '../data/moduleCatalog';
import { useStudioStore } from '../store/studioStore';
import type { ModuleCategory, ModuleDefinition } from '../types';

const portLabel = (module: ModuleDefinition) => {
  if (!module.inputs) return `${module.outputs} salida${module.outputs === 1 ? '' : 's'}`;
  if (!module.outputs) return `${module.inputs} entrada${module.inputs === 1 ? '' : 's'}`;
  return `${module.inputs}→${module.outputs}`;
};

export function ModuleBrowser() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ModuleCategory | 'Todo'>('Todo');
  const addModule = useStudioStore((state) => state.addModule);
  const setPanel = useStudioStore((state) => state.setPanel);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return moduleCatalog.filter((module) => {
      const matchesCategory = category === 'Todo' || module.category === category;
      const haystack = [module.label, module.description, module.category, ...(module.tags ?? [])].join(' ').toLocaleLowerCase('es');
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, query]);

  const handleDrag = (event: React.DragEvent, definition: ModuleDefinition) => {
    event.dataTransfer.setData('application/auditorium-module', definition.type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="module-browser panel-surface">
      <div className="panel-heading">
        <div><span className="eyebrow">Biblioteca</span><h2>Módulos</h2></div>
        <button className="icon-button subtle" onClick={() => setPanel('left', false)} title="Ocultar biblioteca"><ChevronLeft size={16} /></button>
      </div>
      <label className="search-field">
        <Search size={15} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulo, efecto…" />
        <kbd>⌘ K</kbd>
      </label>
      <div className="category-strip">
        <button className={category === 'Todo' ? 'active' : ''} onClick={() => setCategory('Todo')}>Todo</button>
        {moduleCategories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="module-results-header">
        <span>{filtered.length} módulos</span>
        <span>Arrastra al lienzo</span>
      </div>
      <div className="module-list">
        {filtered.map((module) => (
          <article
            className="browser-module-card"
            draggable
            key={module.type}
            onDragStart={(event) => handleDrag(event, module)}
            style={{ '--module-color': module.color } as React.CSSProperties}
          >
            <span className="browser-module-mark" />
            <div>
              <strong>{module.label}</strong>
              <p>{module.description}</p>
              <small>{module.category} · {portLabel(module)}</small>
            </div>
            <button title={`Añadir ${module.label}`} onClick={() => addModule({ definition: module })}><Plus size={15} /></button>
          </article>
        ))}
        {!filtered.length && <div className="empty-browser"><Search size={26} /><strong>Sin coincidencias</strong><span>Prueba otra palabra o categoría.</span></div>}
      </div>
      <button className="instrument-count-card" onClick={() => useStudioStore.getState().setBottomTab('instruments')}>
        <Sparkles size={17} />
        <span><strong>{instruments.length} instrumentos</strong><small>Catálogo orquestal, mundial y electrónico</small></span>
        <ChevronLeft size={15} className="point-right" />
      </button>
    </aside>
  );
}
