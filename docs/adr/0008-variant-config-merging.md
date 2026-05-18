# ADR-0008: Como `applyVariant` mescla preset + override

- **Status**: Accepted
- **Data**: 2026-05-16

## Contexto

`RoomConfig` tem ~25 campos. As 4 variantes (rápida / média / longa / cooperativa) querem setar defaults sensatos pra vários campos cada (ex: rápida força winLevel=6, mãos 5+5, timer 40s).

Quando o criador escolhe um preset (ex: "Coop: Chefão · 4P"), o preset envia um patch `{ playerCount: 4, variant: 'cooperative', coopObjective: 'bossFight' }`. O server aplica `applyVariant({...defaultConfig(), ...patch})` que então decide os defaults da variante por cima.

## Decisão

`applyVariant(config: RoomConfig): RoomConfig` aplica:

- **Quick**: força `startingHandDoors=5`, `startingHandTreasures=5`, `listeningAtTheDoor=true`. Cap `winLevel <= 6`. Default `turnTimerSeconds=40` se null.
- **Medium**: força `winLevel=10`, `listeningAtTheDoor=true`, `marketEnabled=true`, `marketSize=5`. Default `globalTimerMinutes=60` se null.
- **Long**: força `winLevel=10`, `twoPlayerDualCharacter=(playerCount===2)`, `globalTimerMinutes=null`.
- **Cooperative**: força `noOffensiveCurses=true`, `aggressionMinLevel=999`, `threatTrackEnabled=true`.

Tudo o que não é tocado pela variante fica como veio do patch.

## Consequências

- ✅ Presets são `Partial<RoomConfig>` super magros — só especificam o essencial
- ✅ `applyVariant` é determinístico e idempotente
- ❌ Variante muda config no `updateConfig` mesmo se o usuário não quis. Aceitamos: variante é fundadora dos defaults.
- ⚠️ `winLevel=8` é IMPOSSÍVEL: medium força 10, long força 10, quick caps a 6. Pra usar 8, tem que ser cooperative. Documentado nos tooltips.

## Alternativas avaliadas

- **Não aplicar `applyVariant` em `updateConfig`** (só em create): rejeitado — quebra a previsibilidade de presets que mudam variante.
- **`onlyIfUnset` flag por campo**: complexo demais pro valor.
