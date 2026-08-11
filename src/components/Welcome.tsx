import { AudioLines, Box, Disc3, Download, Headphones, Layers3, Mic2, Music2, Play, Sparkles, Waves, X } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { instruments } from '../data/instruments';
import { moduleCatalog } from '../data/moduleCatalog';
import { useStudioStore } from '../store/studioStore';

export function Welcome() {
  const show = useStudioStore((state) => state.showWelcome);
  const setWelcome = useStudioStore((state) => state.setWelcome);
  const setStatus = useStudioStore((state) => state.setStatus);
  if (!show) return null;

  const enter = async () => {
    try { await audioEngine.init(); setStatus('Motor de audio desbloqueado · pulsa Play para escuchar'); }
    catch { setStatus('Puedes explorar el estudio; el motor se activará al pulsar Play'); }
    setWelcome(false);
  };

  return (
    <div className="welcome-overlay">
      <div className="welcome-aurora one" /><div className="welcome-aurora two" />
      <section className="welcome-card">
        <button className="welcome-close" onClick={() => setWelcome(false)}><X size={16} /></button>
        <div className="welcome-brand"><div className="welcome-logo"><span>A</span><svg viewBox="0 0 90 28"><path d="M0 17 C8 16 9 5 17 16 S29 24 36 10 S49 6 55 18 S69 25 75 11 S84 8 90 16" /></svg></div><span>INTRODUCING</span><h1>AUDITORIUM</h1><p>Del silencio a cualquier música.</p></div>
        <div className="welcome-visual">
          <div className="welcome-node source"><Disc3 size={20} /><span>PLATINA A</span><i /></div>
          <div className="welcome-node dynamics"><Waves size={20} /><span>POLARITY 4B</span><i /></div>
          <div className="welcome-node instrument"><Music2 size={20} /><span>INSTRUMENTO</span><i /></div>
          <div className="welcome-node mixer"><Layers3 size={20} /><span>MEZCLADOR</span><i /></div>
          <div className="welcome-node master"><Headphones size={20} /><span>MASTER</span></div>
          <svg className="welcome-cables" viewBox="0 0 700 230"><path d="M120 67 C190 67 183 62 260 62"/><path d="M120 170 C194 170 184 75 260 75"/><path d="M362 67 C425 67 405 113 472 113"/><path d="M362 170 C425 170 410 126 472 126"/><path d="M567 120 C610 120 612 120 648 120"/></svg>
        </div>
        <div className="welcome-features">
          <article><Box size={18} /><div><strong>Lienzo sin límites</strong><p>Conecta, encapsula y entra dentro de tus propios componentes.</p></div></article>
          <article><AudioLines size={18} /><div><strong>Audio que funciona</strong><p>Síntesis, secuencias, efectos, análisis y WAV de 24 bits en local.</p></div></article>
          <article><Mic2 size={18} /><div><strong>Estudio abierto</strong><p>Archivos, micrófonos, interfaces, controladores MIDI y escritorio.</p></div></article>
        </div>
        <div className="welcome-stats"><span><b>{moduleCatalog.length}</b> módulos iniciales</span><span><b>{instruments.length}</b> instrumentos</span><span><b>∞</b> cápsulas anidadas</span><span><b>3</b> sistemas de escritorio</span></div>
        <div className="welcome-actions"><button className="enter-studio" onClick={enter}><Play size={17} fill="currentColor" />Entrar al estudio</button><a href="https://github.com/AlejandroPico/Auditorium/releases/latest" target="_blank" rel="noreferrer"><Download size={16} />Versiones de escritorio</a></div>
        <footer><Sparkles size={13} /><span>Primera sesión preparada: platina, instrumento, batería, dinámica multibanda, mezcla y master.</span></footer>
      </section>
    </div>
  );
}
