# ADR-0005: Visual evidence catalog via branch `ci-evidence`

- **Status**: Accepted
- **Data**: 2026-05-16

## Contexto

Cypress captura screenshots de cada estado relevante (~18 por PR). Queremos que reviewers vejam essas imagens **inline no PR comment**, sem precisar baixar artifact ZIP.

GitHub não dá API pública pra upload de imagens em comments. URLs do `raw.githubusercontent.com` retornam 404 em repos privados sem auth, mas URLs `github.com/owner/repo/blob/branch/file.png?raw=true` funcionam pra usuários logados via cookies de sessão.

## Decisão

Cada PR run faz:

1. Cypress gera PNGs em `e2e/cypress/screenshots/`
2. Step "Publish screenshots to ci-evidence branch" clona a branch `ci-evidence` (ou cria orphan se não existir), substitui `pr-{N}/{shortSha}/` pelos screenshots novos, faz commit + push.
3. `scripts/build-evidence-comment.mjs` gera markdown com tabela 2-colunas embed de `<img>` apontando pra `github.com/.../blob/ci-evidence/pr-N/sha/file.png?raw=true`.
4. Sticky comment com header `visual-evidence` posta/atualiza o markdown.

Cleanup: workflow `ci-cleanup.yml` no evento `pull_request.closed` apaga `pr-N/` da branch.

## Consequências

- ✅ Reviewers veem screenshots renderizados inline no PR
- ✅ Funciona em repos privados (URLs pro `github.com` em vez de `raw.githubusercontent.com`)
- ✅ Cada commit num PR aberto gera um novo `{sha}/` (bust de cache CDN garantido)
- ✅ Cleanup automático ao fechar PR
- ❌ Branch `ci-evidence` polui o repo (visualmente em listagens, não no histórico de `main`)
- ❌ Cada PR commit cria um commit na evidência → histórico longo. Aceito por simplicidade.
- ❌ Se `ci-cleanup` falhar, fica lixo até run manual
