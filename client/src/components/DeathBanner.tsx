import { useEffect, useState } from 'react';
import { t } from '../i18n';

export function DeathBanner({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!visible) return null;
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center px-6 anim-fade"
    >
      <div className="text-center max-w-sm">
        <div className="text-8xl anim-pop" aria-hidden="true">☠️</div>
        <div className="text-4xl font-bold text-red-400 mt-4 tracking-wide">{t.deathBanner}</div>
        <div className="text-sm opacity-80 mt-3">{t.deathSub}</div>
      </div>
    </div>
  );
}
