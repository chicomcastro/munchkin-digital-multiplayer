import { useEffect, useMemo } from 'react';
import type { Card, Player } from '../types';
import { CardView } from './Card';
import { SlotIcon } from './SlotIcon';
import { t } from '../i18n';

/**
 * Modal showing a player's public set — race, class, level, force, equipped
 * items, carried items. Triggered by tapping a player's name or avatar.
 * Same UX language as CardPreview (full-screen backdrop, click outside or
 * Esc to dismiss).
 */
export function PlayerDetailModal({
  player,
  onClose,
}: {
  player: Player | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, onClose]);

  const slotMap = useMemo(() => {
    if (!player) return null;
    const map: Record<string, Card | null> = { head: null, body: null, feet: null, handL: null, handR: null };
    const others: Card[] = [];
    for (const c of player.equipped) {
      const s = c.slot ?? 'none';
      if (s === 'twoHands') { map.handL = c; map.handR = c; }
      else if (s === 'hand') {
        if (!map.handL) map.handL = c;
        else if (!map.handR) map.handR = c;
        else others.push(c);
      } else if (s in map && !map[s]) { map[s] = c; }
      else others.push(c);
    }
    return { slots: map, others };
  }, [player]);

  if (!player || !slotMap) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 anim-fade"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      data-testid={`player-detail-modal-${player.id}`}
    >
      <div
        className="card-shell p-5 w-full max-w-md shadow-2xl"
        style={{ borderLeft: `4px solid ${player.color}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-xs uppercase opacity-60">{player.isBot ? t.bot : (player.socketId ? t.online : t.offline)}</div>
            <div className="text-2xl font-bold font-display truncate" style={{ color: player.color }}>{player.name}</div>
            <div className="text-sm flex gap-2 mt-1">
              <span><span className="opacity-60">{t.level}</span> <span className="text-amber-300 font-bold">{player.level}</span></span>
              <span><span className="opacity-60">{t.power}</span> <span className="font-bold">{player.combatPower}</span></span>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 text-xs px-2 py-0.5 rounded-full">
                {player.race?.name ?? t.noRace}
              </span>
              <span className="bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-xs px-2 py-0.5 rounded-full">
                {player.class?.name ?? t.noClass}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
            aria-label={t.closePreview}
          >×</button>
        </div>

        <div className="text-xs uppercase opacity-60 mb-1">{t.equipment}</div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px] max-w-[280px] mb-2">
          <div />
          <SlotPreview label="head" card={slotMap.slots.head} />
          <div />
          <SlotPreview label="hand" card={slotMap.slots.handL} />
          <SlotPreview label="body" card={slotMap.slots.body} />
          <SlotPreview label="hand" card={slotMap.slots.handR} twoHands={slotMap.slots.handL === slotMap.slots.handR && !!slotMap.slots.handL} />
          <div />
          <SlotPreview label="feet" card={slotMap.slots.feet} />
          <div />
        </div>

        {slotMap.others.length > 0 && (
          <>
            <div className="text-xs uppercase opacity-60 mt-3 mb-1">{t.otherItems}</div>
            <div className="flex gap-2 flex-wrap">
              {slotMap.others.map((c) => (<CardView key={c.id} card={c} compact />))}
            </div>
          </>
        )}

        {player.carried.length > 0 && (
          <>
            <div className="text-xs uppercase opacity-60 mt-3 mb-1">{t.carried}</div>
            <div className="flex gap-2 flex-wrap">
              {player.carried.map((c) => (<CardView key={c.id} card={c} compact />))}
            </div>
          </>
        )}

        {player.equipped.length === 0 && player.carried.length === 0 && (
          <div className="text-xs italic opacity-50">{t.emptyEquipped}</div>
        )}
      </div>
    </div>
  );
}

function SlotPreview({ label, card, twoHands }: { label: string; card: Card | null; twoHands?: boolean }) {
  const kind = (twoHands ? 'twoHands' : label) as 'head' | 'body' | 'hand' | 'feet' | 'twoHands';
  return (
    <div className={[
      'rounded border px-1 py-1.5 text-center min-h-[3.5rem] flex flex-col items-center justify-center gap-0.5',
      card
        ? 'bg-amber-900/40 border-amber-700/60 text-amber-200'
        : 'bg-amber-950/60 border-dashed border-amber-600/40 text-amber-300/70',
    ].join(' ')}>
      <SlotIcon slot={kind} size={20} className={card ? 'opacity-40' : 'opacity-80'} />
      <div className="uppercase text-[8px] tracking-wider opacity-75">{twoHands ? '2H' : label}</div>
      {card && (
        <div className="text-[9px] truncate font-bold leading-tight max-w-full px-0.5">{card.name}</div>
      )}
    </div>
  );
}
