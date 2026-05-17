import type { Player } from '../types';
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
  return (
    <div
      className={[
        'card-shell p-3',
        active ? 'ring-4 ring-amber-400' : '',
        !player.isAlive ? 'opacity-40' : '',
      ].join(' ')}
      style={{ borderLeft: `6px solid ${player.color}` }}
    >
      <div className="flex items-baseline justify-between">
        <div className="font-bold text-lg truncate">{player.name}</div>
        <div className="text-sm opacity-70">{player.socketId ? t.online : t.offline}</div>
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
      {detailed && (
        <div className="mt-3">
          <div className="text-xs opacity-60 mb-1">{t.equipped}</div>
          <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
            {player.equipped.length === 0 && <span className="text-xs opacity-50">{t.none}</span>}
            {player.equipped.map((c) => (
              <CardView key={c.id} card={c} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
