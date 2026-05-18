# ADR-0009: Habilidades de raça/classe: passivas vs ativas

- **Status**: Accepted
- **Data**: 2026-05-17

## Contexto

Munchkin tem habilidades de raça/classe que afetam o jogo. As "passivas" alteram cálculos (combate, venda) sem requerer ação explícita. As "ativas" exigem que o jogador escolha quando usar (descartar cartas pra X, rolar dado pra roubar).

Antes desta ADR, todas eram descritivas (texto na carta) e o servidor ignorava.

## Decisão

Separar em dois módulos:

### Passivas — `server/src/rules/abilities.ts`

Funções puras chamadas em pontos chave do `GameRoom`:

- `combatBonus(player) → number` — adicionado em `computePlayerCombatStrength`:
  - Elfo: +1
  - Orc: +1 SE tiver arma equipada (`slot in ['hand', 'twoHands']`)
  - Warrior: +1
- `sellMultiplier(player, isFirstSaleThisTurn) → number`:
  - Halfling primeira venda: 2x
  - Resto: 1x
- `sellBonus(player) → number` — gold flat:
  - Elfo: +100
- `winsTies(player) → bool`:
  - Warrior: true
  - Resto: false — usado em `resolveCombat` (`>` vs `>=`)

### Ativas — métodos em `GameRoom` + actions socket

- `clericVsUndead(playerId, cardIds)` → Clérigo descarta cartas, +3 por carta vs monstro tagueado `'undead'` no combate ativo
- `wizardCharm(playerId, cardIds)` → Mago descarta 3 cartas, monstro foge automaticamente
- `stealItem(thiefId, targetId)` → Ladrão d6 4+ pra roubar item pequeno (já existia)

Cada uma exige que o jogador tenha a classe correta e demais pré-condições.

### Tags

Cartas ganham `tags?: string[]`. Monstros tagueados como `'undead'`: Mr. Bones, Undead Horse, Wannabe Vampire.

## Consequências

- ✅ Habilidades passam a contar de verdade
- ✅ Passivas são triviais (funções puras)
- ✅ Ativas seguem o mesmo padrão das outras actions (event → método → ack)
- ❌ Halfling precisa de flag `usedHalflingThisTurn` no Player + reset em `endTurn`
- ❌ Cleric/Wizard expõem novos sockets — incremento contínuo
- ⚠️ Tags são strings livres — typo passa. Mitigado por const enum em `cards/tags.ts`

## Pontos de revisão

- Mais classes/raças (expansões): cada uma vira função em `abilities.ts` + método se ativa
- Habilidades que somam (multi-class)? Não no MVP. Single race + single class garante simplicidade.
