# ADR-0001: Arquitetura cliente-servidor com servidor autoritativo

- **Status**: Accepted
- **Data**: 2026-05-16

## Contexto

Munchkin Digital é multiplayer com regras complexas (combate, maldições, mercado, fases de turno). Duas alternativas:

1. **P2P (WebRTC)** — clientes se conectam diretamente, um vira host
2. **Cliente-servidor** — server autoritativo central, clientes thin

P2P economiza infra mas tem: trapaça óbvia (host vê tudo, modifica estado livremente), problemas de NAT traversal, dificuldade de implementar persistence/replay, sem garantia de consistência se host cair.

## Decisão

**Cliente-servidor com servidor autoritativo**. Todo estado mora no `GameRoom` no Node. Clientes recebem snapshots via `game:stateUpdate` (público) e `game:yourHand` (privado por jogador). Toda ação passa por validação no server antes de aplicar.

- Server: Node.js + TypeScript + socket.io
- Comunicação: WebSocket persistente
- Rooms: `Map<code, GameRoom>` em memória por default (extensível pra Firestore via ADR-0006)

## Consequências

- ✅ Anti-trapaça trivial: cliente só envia intenções, server decide
- ✅ Mão privada por design — cliente nunca recebe mão de outros
- ✅ Reconexão fácil — server tem o estado, cliente busca de novo
- ✅ Validação centralizada (turno, fase, ownership de cartas)
- ❌ Precisa hospedar server com WebSocket persistente (Cloud Run / Railway / Render). Não é serverless puro.
- ❌ Min-instances=1 pra evitar cold start matar conexões
- ⚠️ Memória cresce com salas ativas — limite implícito de quantas rodam por instância

## Pontos de revisão

- Se demanda crescer muito: sharding por código de sala (consistent hashing)
- Se ficar caro: rooms podem ser dormidos (snapshot pra Firestore) e despertados sob demanda
