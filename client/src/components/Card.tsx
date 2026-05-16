import type { Card as CardType } from '../types';

const typeColors: Record<string, string> = {
  monster: 'bg-red-900/70 border-red-700',
  curse: 'bg-purple-900/70 border-purple-700',
  race: 'bg-emerald-900/70 border-emerald-700',
  class: 'bg-sky-900/70 border-sky-700',
  item: 'bg-amber-900/70 border-amber-700',
  oneShot: 'bg-rose-900/70 border-rose-700',
  levelUp: 'bg-yellow-900/70 border-yellow-700',
  helper: 'bg-cyan-900/70 border-cyan-700',
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
  const color = typeColors[card.type] ?? 'bg-slate-800 border-slate-700';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'text-left rounded-2xl border-2 p-3 shadow-md transition-all',
        color,
        selected ? 'ring-4 ring-amber-400 -translate-y-1' : '',
        disabled ? 'opacity-50' : 'active:scale-95',
        compact ? 'min-w-[8rem] max-w-[10rem]' : 'min-w-[10rem] max-w-[14rem]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-70">{card.type}</div>
        {card.type === 'monster' && (
          <div className="text-amber-300 font-bold">lv {card.level}</div>
        )}
        {card.type === 'item' && card.bonus != null && (
          <div className="text-amber-300 font-bold">+{card.bonus}</div>
        )}
      </div>
      <div className="font-bold text-base leading-tight mt-1">{card.name}</div>
      {!compact && (
        <div className="text-xs opacity-80 mt-1 line-clamp-3">{card.description}</div>
      )}
      <div className="mt-2 flex gap-1 flex-wrap text-[10px]">
        {card.slot && card.slot !== 'none' && (
          <span className="bg-black/30 px-1.5 py-0.5 rounded">{card.slot}</span>
        )}
        {card.bigItem && <span className="bg-black/30 px-1.5 py-0.5 rounded">BIG</span>}
        {card.value != null && card.value > 0 && (
          <span className="bg-black/30 px-1.5 py-0.5 rounded">{card.value}gp</span>
        )}
      </div>
    </button>
  );
}
