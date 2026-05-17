# ADR-0004: Sticky PR comment com cobertura via marocchino

- **Status**: Accepted
- **Data**: 2026-05-16

## Contexto

Threshold de cobertura é enforçado pelo Vitest, mas reviewers se beneficiam de ver o número direto na PR sem precisar baixar artifact. Queremos um comment único que atualiza a cada push (não cria 12 comments numa PR ativa).

## Decisão

Usar [`marocchino/sticky-pull-request-comment@v2`](https://github.com/marocchino/sticky-pull-request-comment) com header `coverage-summary`. Após `server-tests` e `client-tests` rodarem, um job `coverage-comment` baixa os `coverage-summary.json` (gerados pelo `json-summary` reporter do Vitest) e roda `scripts/build-coverage-comment.mjs` que gera o markdown.

Tabela com 4 colunas (Lines / Statements / Functions / Branches) × 3 linhas (Server / Client / Combined). Cores 🟢🟡🟠🔴 por threshold.

## Consequências

- ✅ Reviewer vê cobertura sem sair do PR
- ✅ Combined row dá uma noção do projeto inteiro
- ✅ Marocchino actualiza o comment existente, não cria novos
- ❌ Requer `pull-requests: write` permission no workflow
- ❌ Sticky header é por-PR; se quisermos comments por commit, precisa de outra approach

Veja também ADR-0005 pra visual evidence usando a mesma técnica de sticky comment.
