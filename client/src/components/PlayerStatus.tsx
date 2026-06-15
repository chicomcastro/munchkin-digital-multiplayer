import { useMemo, useState } from 'react';
import type { Card, Player } from '../types';
import { CardView } from './Card';
import { t } from '../i18n';

export function PlayerStatus({
  player,
  active,
  detailed = false,
}: {
  player: Player;
  active: boolean;
  detailed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const showSlots = expanded || detailed;

  const slotMap = useMemo(() => {
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
      else if (s === 'none') others.push(c);
      else others.push(c);
    }
    return { slots: map, others };
  }, [player.equipped]);

  return (
    <div
      className={[
        'card-shell p-3 cursor-pointer transition-all',
        active ? 'ring-4 ring-amber-400' : '',
        !player.isAlive ? 'opacity-40' : '',
      ].join(' ')}
      style={{ borderLeft: `6px solid ${player.color}` }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-baseline justify-between">
        <div className="font-bold text-lg truncate">{player.name}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">{player.socketId ? t.online : t.offline}</span>
          <span className="text-xs opacity-40">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      <div className="flex gap-4 mt-1 text-sm">
        <div>
          <div className="text-xs opacity-60">{t.level}</div>
          <div className="text-2xl font-bold text-amber-300">{player.level}</div>
        </div>
        <div>
          <div className="text-xs opacity-60">{t.power}</div>
          <div className="text-2xl font-bold">{player.combatPower}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs opacity-60">{t.race} / {t.klass}</div>
          <div className="text-sm">
            {player.race?.name ?? '—'} / {player.class?.name ?? '—'}
          </div>
        </div>
      </div>

      {showSlots && (
        <div className="mt-3 anim-fade" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-3 gap-1 text-[10px] max-w-[220px]">
            <div />
            <SlotBox label="head" card={slotMap.slots.head} />
            <div />
            <SlotBox label="hand" card={slotMap.slots.handL} />
            <SlotBox label="body" card={slotMap.slots.body} />
            <SlotBox label="hand" card={slotMap.slots.handR} twoHands={slotMap.slots.handL === slotMap.slots.handR && !!slotMap.slots.handL} />
            <div />
            <SlotBox label="feet" card={slotMap.slots.feet} />
            <div />
          </div>
          {slotMap.others.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {slotMap.others.map((c) => (
                <span key={c.id} className="bg-amber-900/40 border border-amber-800/40 px-1.5 py-0.5 rounded text-[10px]">
                  {c.name} +{c.bonus ?? 0}
                </span>
              ))}
            </div>
          )}
          {player.equipped.length === 0 && (
            <div className="text-xs italic opacity-40 mt-1">{t.emptyEquipped}</div>
          )}
        </div>
      )}
    </div>
  );
}

function SlotBox({ label, card, twoHands }: { label: string; card: Card | null; twoHands?: boolean }) {
  return (
    <div className={[
      'rounded border px-1 py-1 text-center min-h-[2rem] flex flex-col justify-center',
      card
        ? 'bg-amber-900/40 border-amber-700/50 text-amber-200'
        : 'bg-amber-950/50 border-dashed border-amber-600/50 text-amber-500/60 italic',
    ].join(' ')}>
      <div className="uppercase text-[7px] tracking-wider opacity-60">{twoHands ? '2H' : label}</div>
      {card ? (
        <div className="text-[9px] truncate font-bold">{card.name}</div>
      ) : (
        <div className="text-[8px]">--</div>
      )}
    </div>
  );
}
