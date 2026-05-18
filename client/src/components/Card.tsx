import type { Card as CardType } from '../types';
import { cardTypeLabels } from '../i18n';

// Unified palette: each type uses the same lightness/saturation pair so all
// cards share a "look" — the hue is the only differentiator.
//   bg: <color>-900/40   (tinted dark surface)
//   ring: <color>-500/60 (border + glow)
const typeStyles: Record<string, { bg: string; ring: string; accent: string }> = {
  monster:  { bg: 'bg-red-900/40',     ring: 'border-red-500/60',     accent: 'text-red-200' },
  curse:    { bg: 'bg-violet-900/40',  ring: 'border-violet-500/60',  accent: 'text-violet-200' },
  race:     { bg: 'bg-emerald-900/40', ring: 'border-emerald-500/60', accent: 'text-emerald-200' },
  class:    { bg: 'bg-indigo-900/40',  ring: 'border-indigo-500/60',  accent: 'text-indigo-200' },
  item:     { bg: 'bg-amber-900/40',   ring: 'border-amber-500/60',   accent: 'text-amber-200' },
  oneShot:  { bg: 'bg-fuchsia-900/40', ring: 'border-fuchsia-500/60', accent: 'text-fuchsia-200' },
  levelUp:  { bg: 'bg-yellow-800/40',  ring: 'border-yellow-400/60',  accent: 'text-yellow-200' },
  helper:   { bg: 'bg-teal-900/40',    ring: 'border-teal-500/60',    accent: 'text-teal-200' },
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

export function CardView({
  card,
  compact = false,
  onClick,
  selected = false,
  disabled = false,
}: {
  card: CardType;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const style = typeStyles[card.type] ?? { bg: 'bg-slate-800', ring: 'border-slate-600', accent: 'text-slate-300' };
  const icon = typeIcons[card.type] ?? '🎴';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'text-left rounded-2xl border-2 p-3 shadow-md transition-all flex flex-col',
        style.bg,
        style.ring,
        selected ? 'ring-4 ring-amber-400 -translate-y-1' : '',
        disabled ? 'opacity-50' : 'active:scale-95 hover:brightness-110',
        compact ? 'min-w-[8rem] max-w-[10rem] min-h-[6.5rem]' : 'min-w-[10rem] max-w-[14rem] min-h-[9rem]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1">
        <div className={['text-[10px] uppercase tracking-wide font-semibold flex items-center gap-1', style.accent].join(' ')}>
          <span aria-hidden="true">{icon}</span>
          <span>{cardTypeLabels[card.type] ?? card.type}</span>
        </div>
        {card.type === 'monster' && (
          <div className="text-amber-300 font-bold whitespace-nowrap text-xs">nv {card.level}</div>
        )}
        {card.type === 'item' && card.bonus != null && (
          <div className="text-amber-300 font-bold text-xs">+{card.bonus}</div>
        )}
      </div>
      <div className="font-bold text-sm leading-tight mt-1 line-clamp-2">{card.name}</div>
      {!compact && (
        <div className="text-xs opacity-80 mt-1 line-clamp-3 flex-1">{card.description}</div>
      )}
      <div className="mt-auto pt-2 flex gap-1 flex-wrap text-[10px]">
        {card.slot && card.slot !== 'none' && (
          <span className="bg-black/30 px-1.5 py-0.5 rounded">{card.slot}</span>
        )}
        {card.bigItem && <span className="bg-black/30 px-1.5 py-0.5 rounded">GRANDE</span>}
        {card.value != null && card.value > 0 && (
          <span className="bg-black/30 px-1.5 py-0.5 rounded">{card.value}gp</span>
        )}
      </div>
    </button>
  );
}
