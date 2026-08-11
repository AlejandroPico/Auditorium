import { useEffect } from 'react';
import { useStudioStore } from '../store/studioStore';

const WELCOME_DURATION = 1650;

export function Welcome() {
  const show = useStudioStore((state) => state.showWelcome);
  const setWelcome = useStudioStore((state) => state.setWelcome);

  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(() => setWelcome(false), WELCOME_DURATION);
    return () => window.clearTimeout(timer);
  }, [setWelcome, show]);

  if (!show) return null;

  return (
    <div className="welcome-overlay" role="status" aria-label="Abriendo Auditorium" onClick={() => setWelcome(false)}>
      <section className="welcome-splash">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        <h1>AUDITORIUM</h1>
        <p>Del silencio a cualquier música.</p>
        <div className="welcome-progress"><i /></div>
        <small>Preparando el estudio local</small>
      </section>
    </div>
  );
}
