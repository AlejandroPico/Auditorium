import type { AuditoriumProject } from '../types';

const AUTOSAVE_KEY = 'auditorium:autosave:v1';

export const saveAutosave = (project: AuditoriumProject) => {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
  } catch (error) {
    console.warn('No se pudo actualizar el autoguardado', error);
  }
};

export const readAutosave = (): AuditoriumProject | null => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? parseProject(raw) : null;
  } catch {
    return null;
  }
};

export const parseProject = (raw: string): AuditoriumProject => {
  const parsed = JSON.parse(raw) as AuditoriumProject;
  if (
    parsed?.format !== 'auditorium-project'
    || parsed.version !== 1
    || !parsed.rootWorkspaceId
    || !parsed.workspaces?.[parsed.rootWorkspaceId]
  ) {
    throw new Error('El archivo no es un proyecto Auditorium compatible.');
  }
  return parsed;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safeFileName = (name: string) =>
  name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'sesion';

export const exportProject = (project: AuditoriumProject) => {
  const payload = JSON.stringify({
    ...project,
    metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
  }, null, 2);
  downloadBlob(new Blob([payload], { type: 'application/json' }), `${safeFileName(project.metadata.name)}.auditorium.json`);
};

export const openProjectPicker = () => new Promise<AuditoriumProject>((resolve, reject) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.auditorium,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return reject(new Error('No se seleccionó ningún archivo.'));
    try {
      resolve(parseProject(await file.text()));
    } catch (error) {
      reject(error);
    }
  };
  input.click();
});

export const pickAudioFile = () => new Promise<File>((resolve, reject) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = [
    'audio/*', '.mp3', '.wav', '.wave', '.flac', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.aiff', '.aif', '.caf', '.webm', '.mka', '.wma', '.au', '.snd', '.mid', '.midi',
  ].join(',');
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) resolve(file);
    else reject(new Error('No se seleccionó ningún audio.'));
  };
  input.click();
});
