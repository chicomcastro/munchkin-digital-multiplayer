# Architecture Decision Records

Decisões arquiteturais relevantes do projeto. Cada ADR é um arquivo numerado descrevendo **contexto**, **decisão** e **consequências**.

Quando precisar de uma decisão nova:

1. Copie o arquivo abaixo, incremente o número
2. Marque como `Status: Proposed`
3. PR com a justificativa
4. Após merge, mude `Status: Accepted` (ou `Superseded by ADR-NNNN`)

## Índice

- [ADR-0001](./0001-client-server-architecture.md) — Arquitetura cliente-servidor com servidor autoritativo
- [ADR-0002](./0002-stack-typescript-vite-react.md) — Stack TypeScript + React + Vite + Tailwind v4
- [ADR-0003](./0003-vitest-cypress-coverage.md) — Vitest + Cypress + threshold de cobertura no CI
- [ADR-0004](./0004-sticky-coverage-pr-comment.md) — Sticky PR comment com cobertura via marocchino
- [ADR-0005](./0005-visual-evidence-via-branch.md) — Visual evidence catalog via branch `ci-evidence`
- [ADR-0006](./0006-firestore-persistence.md) — Persistência opcional via Firestore
- [ADR-0007](./0007-amplitude-analytics.md) — Analytics via Amplitude (opcional, client + server)
- [ADR-0008](./0008-variant-config-merging.md) — Como `applyVariant` mescla preset + override
- [ADR-0009](./0009-passive-active-abilities.md) — Habilidades de raça/classe: passivas vs ativas
- [ADR-0010](./0010-i18n.md) — i18n com 3 idiomas via dictionaries
- [ADR-0011](./0011-pwa.md) — PWA manifest + service worker mínimo

## Template

```markdown
# ADR-NNNN: <título>

- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Data**: YYYY-MM-DD

## Contexto
Qual era o problema, o que estava em jogo.

## Decisão
O que decidimos fazer.

## Consequências
- Trade-offs aceitos
- Riscos conhecidos
- Pontos de revisão futuros
```
