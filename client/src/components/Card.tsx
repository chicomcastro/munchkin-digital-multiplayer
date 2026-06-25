import type { Card as CardType } from '../types';
import { cardTypeLabels } from '../i18n';
import { CardTypeIcon } from './CardTypeIcon';

const typeStyles: Record<string, { bg: string; ring: string; accent: string; bar: string; glow: string }> = {
  monster:  { bg: 'bg-red-900/40',     ring: 'border-red-500/60',     accent: 'text-red-200',     bar: 'bg-red-500',     glow: '0 0 12px rgba(239,68,68,0.35)' },
  curse:    { bg: 'bg-violet-900/40',  ring: 'border-violet-500/60',  accent: 'text-violet-200',  bar: 'bg-violet-500',  glow: '0 0 12px rgba(139,92,246,0.35)' },
  race:     { bg: 'bg-emerald-900/40', ring: 'border-emerald-500/60', accent: 'text-emerald-200', bar: 'bg-emerald-500', glow: '0 0 12px rgba(16,185,129,0.35)' },
  class:    { bg: 'bg-indigo-900/40',  ring: 'border-indigo-500/60',  accent: 'text-indigo-200',  bar: 'bg-indigo-500',  glow: '0 0 12px rgba(99,102,241,0.35)' },
  item:     { bg: 'bg-amber-900/40',   ring: 'border-amber-500/60',   accent: 'text-amber-200',   bar: 'bg-amber-500',   glow: '0 0 12px rgba(245,158,11,0.35)' },
  oneShot:  { bg: 'bg-fuchsia-900/40', ring: 'border-fuchsia-500/60', accent: 'text-fuchsia-200', bar: 'bg-fuchsia-500', glow: '0 0 12px rgba(217,70,239,0.35)' },
  levelUp:  { bg: 'bg-yellow-800/40',  ring: 'border-yellow-400/60',  accent: 'text-yellow-200',  bar: 'bg-yellow-400',  glow: '0 0 12px rgba(250,204,21,0.35)' },
  helper:   { bg: 'bg-teal-900/40',    ring: 'border-teal-500/60',    accent: 'text-teal-200',    bar: 'bg-teal-500',    glow: '0 0 12px rgba(20,184,166,0.35)' },
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
  const style = typeStyles[card.type] ?? { bg: 'bg-slate-800', ring: 'border-slate-600', accent: 'text-slate-300', bar: 'bg-slate-500', glow: 'none' };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ boxShadow: disabled ? 'inset 0 0 0 2px rgba(0,0,0,0.2)' : `${style.glow}, inset 0 0 0 2px rgba(255,255,255,0.06)` }}
      className={[
        'text-left rounded-xl border-[3px] p-3 shadow-md transition-all flex flex-col overflow-hidden relative',
        style.bg,
        style.ring,
        selected ? 'ring-4 ring-amber-400 -translate-y-2 scale-[1.02]' : '',
        disabled ? 'opacity-50' : 'active:scale-95 hover:-translate-y-0.5 hover:shadow-lg',
        compact ? 'min-w-[8rem] max-w-[10rem] min-h-[6.5rem]' : 'min-w-[9rem] md:min-w-[10.5rem] max-w-[12rem] md:max-w-[13rem] min-h-[12rem] md:min-h-[13rem]',
      ].join(' ')}
    >
      <div className={['absolute top-0 left-0 right-0 h-1 rounded-t-xl', style.bar].join(' ')} />
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <div className={['text-[10px] uppercase tracking-wide font-semibold flex items-center gap-1', style.accent].join(' ')}>
          <CardTypeIcon type={card.type} size={12} />
          <span>{cardTypeLabels[card.type] ?? card.type}</span>
        </div>
        {card.type === 'monster' && (
          <div className="text-amber-300 font-bold whitespace-nowrap text-xs">nv {card.level}</div>
        )}
        {card.type === 'item' && card.bonus != null && (
          <div className="text-amber-300 font-bold text-xs">+{card.bonus}</div>
        )}
      </div>
      <div className="font-bold text-sm leading-tight mt-1 line-clamp-2 font-display">{card.name}</div>
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
