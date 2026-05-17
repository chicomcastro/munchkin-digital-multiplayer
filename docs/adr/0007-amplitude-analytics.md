# ADR-0007: Analytics via Amplitude (opcional, client + server)

- **Status**: Accepted
- **Data**: 2026-05-17

## Contexto

Sem dados não dá pra saber:
- Quantas partidas acontecem por dia
- Qual variante é mais usada (foi por isso que adicionamos os presets)
- Funnel: chega no Home → cria sala → jogo começa → termina
- Onde o usuário desiste

Queremos isso sem acoplar fortemente (privacy, hability de desabilitar, dev local sem precisar configurar).

## Decisão

**Amplitude** via SDK browser e Node. Razões:

- Free tier generoso (10M events/mês)
- Dashboard pronto pra funnels, retention, segmentos
- SDKs estáveis em JS e Node

Wrapper em `client/src/analytics.ts` e `server/src/analytics.ts` que expõem:

```ts
interface Analytics {
  identify(userId: string, traits?: Record<string, unknown>): void;
  track(event: string, props?: Record<string, unknown>): void;
}
```

**No-op por default**. Apenas inicializa quando:
- Client: `import.meta.env.VITE_AMPLITUDE_KEY` está set
- Server: `process.env.AMPLITUDE_KEY` está set

## Eventos rastreados

| Evento | Onde | Props |
|---|---|---|
| `home_viewed` | client mount | `has_deep_link` |
| `room_created` | client após emit | `variant`, `player_count` |
| `room_joined` | client após emit | via deep-link? |
| `game_started` | server | `variant`, `player_count`, `presets_used` |
| `kick_door` | server | `result` (monster/curse/card) |
| `combat_resolved` | server | `outcome`, `monster_level`, `player_power` |
| `level_up` | server | `new_level`, `reason` |
| `game_ended` | server | `outcome`, `duration_ms`, `winner_id` |
| `preset_applied` | client | `preset_id` |
| `share_clicked` | client | `method` (share/clipboard) |

Identidade: `playerId` (gerado server-side, persiste em localStorage).

## Como configurar

1. Criar projeto no Amplitude
2. Copiar API key
3. Client: `VITE_AMPLITUDE_KEY=xxx` no build
4. Server: `AMPLITUDE_KEY=xxx` no env

Sem essas envs, comportamento é idêntico ao atual (zero requests).

## Privacidade

- Não rastreamos nome do jogador (só `playerId` UUID)
- Não rastreamos conteúdo de mensagens (não temos chat ainda)
- Não rastreamos device fingerprint além do que o SDK do Amplitude pega default (IP, user-agent)
- Documentar em README quando o app pegar analytics

## Consequências

- ✅ Dashboard pronto, baixo custo
- ✅ Wrapper torna troca futura pra outro provedor barata
- ❌ Adiciona um SDK no bundle do client (~30kb gzipped). Tolerável.
- ❌ Tracking via SDK browser pode ser bloqueado por adblockers. Pra eventos críticos, o server-side complementa.

## Pontos de revisão

- Se evento volume explodir: amostragem ou eventos server-only
- Pra opt-out do usuário: adicionar um setting que chama `setOptOut(true)`
