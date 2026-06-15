import { useEffect } from 'react';
import type { Card } from '../types';
import { cardTypeLabels } from '../i18n';
import { t } from '../i18n';

const typeColors: Record<string, string> = {
  monster: 'bg-red-900 border-red-700',
  curse: 'bg-purple-900 border-purple-700',
  race: 'bg-emerald-900 border-emerald-700',
  class: 'bg-sky-900 border-sky-700',
  item: 'bg-amber-900 border-amber-700',
  oneShot: 'bg-rose-900 border-rose-700',
  levelUp: 'bg-yellow-900 border-yellow-700',
  helper: 'bg-cyan-900 border-cyan-700',
};

const typeGlow: Record<string, string> = {
  monster: '0 0 24px rgba(239,68,68,0.4)',
  curse: '0 0 24px rgba(139,92,246,0.4)',
  race: '0 0 24px rgba(16,185,129,0.4)',
  class: '0 0 24px rgba(99,102,241,0.4)',
  item: '0 0 24px rgba(245,158,11,0.4)',
  oneShot: '0 0 24px rgba(217,70,239,0.4)',
  levelUp: '0 0 24px rgba(250,204,21,0.4)',
  helper: '0 0 24px rgba(20,184,166,0.4)',
};

const typeIcons: Record<string, string> = {
  monster: '👹',
  curse: '💀',
  race: '🧝',
  class: '⚔️',
  item: '🛡️',
  oneShot: '🧪',
  levelUp: '⬆️',
  helper: '🤝',
};

export function CardPreview({
  card,
  onClose,
}: {
  card: Card | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  if (!card) return null;
  const color = typeColors[card.type] ?? 'bg-slate-900 border-slate-700';
  const glow = typeGlow[card.type] ?? 'none';
  const icon = typeIcons[card.type] ?? '🎴';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 anim-fade"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={['rounded-2xl border-4 p-5 w-full max-w-xs shadow-2xl anim-card-glow', color].join(' ')}
        style={{ boxShadow: glow }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="text-xs uppercase opacity-80 flex items-center gap-1.5">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <span>{cardTypeLabels[card.type] ?? card.type}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
            aria-label={t.closePreview}
          >
            ×
          </button>
        </div>
        <div className="font-bold text-2xl mt-3 leading-tight font-display">{card.name}</div>
        {card.type === 'monster' && (
          <div className="text-amber-300 text-lg font-bold mt-2">{t.monsterStats(card.level ?? 1, card.treasures ?? 1, card.levelsAwarded ?? 1)}</div>
        )}
        {card.type === 'item' && (
          <div className="text-amber-300 text-lg font-bold mt-2">
            +{card.bonus ?? 0}{card.value != null ? ` · ${card.value}gp` : ''}
            {card.bigItem ? ` · ${t.bigItemLabel}` : ''}
          </div>
        )}
        {(card.type === 'oneShot' || card.type === 'helper') && card.combatBonus != null && (
          <div className="text-amber-300 text-lg font-bold mt-2">+{card.combatBonus} {t.combatBonusSuffix}</div>
        )}
        <div className="text-sm mt-3 leading-snug opacity-90">{card.description}</div>
        {card.badStuff && (
          <div className="mt-3 rounded-lg bg-black/30 p-2">
            <div className="text-[10px] uppercase opacity-60">{t.badStuffLabel}</div>
            <div className="text-sm">{card.badStuff}</div>
          </div>
        )}
        {card.slot && card.slot !== 'none' && (
          <div className="mt-3 text-[10px] uppercase opacity-60">{t.slotLabel(card.slot)}</div>
        )}
      </div>
    </div>
  );
}
