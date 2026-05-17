import type { CombatState, Player } from '../types';
import { CardView } from './Card';
import { t } from '../i18n';

export function CombatArena({ combat, players }: { combat: CombatState; players: Player[] }) {
  const attacker = players.find((p) => p.id === combat.attackerId);
  const ally = combat.alliedPlayerId ? players.find((p) => p.id === combat.alliedPlayerId) : null;
  const winning = combat.playerPower > combat.monsterPower;

  return (
    <div className="card-shell p-4">
      <div className="text-center text-xs uppercase tracking-widest opacity-60">{t.combat}</div>
      <div className="grid grid-cols-2 gap-3 mt-3 items-stretch">
        <div className="rounded-xl bg-slate-900/50 p-3">
          <div className="text-xs opacity-60">{t.playerSide}</div>
          <div className="text-3xl font-bold text-emerald-300">{combat.playerPower}</div>
          <div className="text-sm mt-1">
            {attacker?.name}
            {ally ? ` + ${ally.name}` : ''}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {combat.cardsPlayedThisRound
              .filter((p) => p.side === 'player')
              .map((p, i) => (
                <CardView key={`${p.card.id}-${i}`} card={p.card} compact />
              ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900/50 p-3">
          <div className="text-xs opacity-60">{t.monsterSide}</div>
          <div className="text-3xl font-bold text-red-300">{combat.monsterPower}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {combat.monsters.map((m) => (
              <CardView key={m.id} card={m} compact />
            ))}
            {combat.cardsPlayedThisRound
              .filter((p) => p.side === 'monster')
              .map((p, i) => (
                <CardView key={`${p.card.id}-${i}`} card={p.card} compact />
              ))}
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-sm">
        {combat.resolved ? (
          <span className="font-bold">{t.result}: {t.resultLabel(combat.result)}</span>
        ) : winning ? (
          <span className="text-emerald-300">{t.playersWinning(combat.playerPower - combat.monsterPower)}</span>
        ) : (
          <span className="text-red-300">{t.monstersWinning(combat.monsterPower - combat.playerPower)}</span>
        )}
      </div>
    </div>
  );
}
