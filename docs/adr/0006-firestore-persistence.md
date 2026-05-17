# ADR-0006: Persistência opcional via Firestore

- **Status**: Accepted
- **Data**: 2026-05-17

## Contexto

Por default, salas vivem em memória (`Map<code, GameRoom>`). Se o server reinicia (deploy, OOM, crash), todas as partidas em andamento somem. Isso é aceitável pra MVP "jogue com amigos rapidinho" mas problemático pra:

- Partidas longas (a variante Longa pode passar de 60min)
- Cloud Run com instance scaling
- Histórico/replay
- Stats por player

## Decisão

Introduzir uma camada de **persistence repository** com interface `RoomRepository`:

```ts
interface RoomRepository {
  save(room: GameRoom): Promise<void>;
  load(code: string): Promise<GameRoom | null>;
  delete(code: string): Promise<void>;
  list(): Promise<string[]>;
}
```

Duas implementações:
- `InMemoryRoomRepository` — default, comportamento atual
- `FirestoreRoomRepository` — usa `@google-cloud/firestore`, ativada quando `PERSISTENCE=firestore`

Init lazy: a lib `@google-cloud/firestore` só é carregada se o env var pedir. O package fica em `dependencies` (não `optionalDependencies`) pra evitar headaches de install, mas o código tolera ausência.

**Estratégia de persistência**: save após qualquer ação que mutar estado (debounced ~500ms pra não martelar com cada `subscribe` callback). Load on `room:join` se a sala não está em memória. Delete na transição pra `phase === 'ended'` (ou após N horas inativa via TTL no Firestore).

## Como configurar

1. Provisionar projeto GCP, ativar Firestore (modo native)
2. Criar service account com `roles/datastore.user`
3. Baixar JSON, exportar `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
4. `PERSISTENCE=firestore`
5. (Opcional) `FIRESTORE_PROJECT_ID` se não vier do default credentials

Sem essas envs, comportamento é idêntico ao atual.

## Consequências

- ✅ Permite restart de server sem perder partidas
- ✅ Foundation pra histórico/replay (snapshots gravados no Firestore podem ser consultados)
- ✅ Opcional — devs locais não precisam configurar
- ❌ Adiciona latência (~50-200ms) em ações se save for síncrono. Mitigado por debounce.
- ❌ Custo Firestore: ~$0.06 / 100k writes. Estimativa de 1000 writes / partida → $0.0006 por jogo. OK.
- ⚠️ Serialização: `GameRoom` é classe; precisa de toJSON/fromJSON. Adicionado em `GameRoom.serialize() / GameRoom.deserialize()`.

## Pontos de revisão

- Em escala: trocar Firestore por Redis se latência importar mais que durabilidade
- Replay/audit log: pode ser uma collection separada `gameEvents` com append-only
