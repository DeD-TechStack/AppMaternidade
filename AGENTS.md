# AppMaternidade: entrada para agentes

Antes de trabalhar neste repositório, leia `PROGRESSO_TASK_HERMES.md` (objetivo autorizado, evidências e entrega do pacote de design docs), depois `docs/AppMaternidade/00_Inicio` e o tema pertinente em `docs/AppMaternidade/`, além de `tasks/hermes/` (backlog e pacote APP-001). Confronte com o estado atual do Git antes de agir.

**Executor:** Hermes perfil `lider-appmaternidade` desde 29/10/2026 (aba "Hermes — AppMaternidade"; cadastro `C:/OrchestrationLab/equipe/projetos/appmaternidade.toml`; board Kanban `appmaternidade`). A rota legada no perfil default continua recuperável, com sessão e comando em `C:/OrchestrationLab/exports/Atualizacao_Geral_20261029/onboarding_projetos/appmaternidade/HANDOFF_LEGADO.md`. Não a retome pelo perfil novo.

**Consultor interativo de Daniel:** aba "Consultor ChatGPT Web - AppMaternidade". Não é o revisor autônomo (`revisor-appmaternidade`, outra família, só leitura).

Este projeto é separado do Investment e do BreakInv: não copie arquitetura, dados nem permissões deles. O produto começa como site completo; Android e iOS vêm depois, por port (ADR-009, em `docs/AppMaternidade/06_ADRs/`). A stack do site está no ADR-009.

Esta entrada não autoriza implementação, processamento do backlog, gasto, publicação nem commit/push. Um pedido explícito de Daniel delimita o trabalho. Preserve as edições locais existentes (`.gitignore`, `PROGRESSO_TASK_HERMES.md`, `docs/AppMaternidade/`, `tasks/`).

## Conventions (conv-id: appmat-566249)
Rules that came back in review more than once. The check that enforces each one is in brackets.
1. Commit title: 72 chars or less, starts with a capital letter; author and e-mail exactly as in scripts/verificar-commits.mjs; no merge or empty commits. [node scripts/verificar-commits.mjs <base>..HEAD]
2. Text must survive 200% zoom and a 320 px viewport: no clipping, overlap or horizontal scroll; long pt-BR words wrap. [reviewer gate; web/DESIGN.md "Faça"]
3. Any screen change ships captures at 390x844 and 1440x900, DPR 2, every theme the route supports, made with C:/OrchestrationLab/equipe/ferramentas/capturar_web.py; list the PNG paths in the HANDOFF.
4. Internal links, assets and auth redirects use import.meta.env.BASE_URL (the Pages build base comes from BASE_SITE); never a hard-coded "/".
5. Colours, spacing and type come from the tokens in web/DESIGN.md; no raw hex/rgb in components.
6. Before changing a shared component or contract, find the tests that use it; update them in scope, or report the one that pins the old contract. Never leave it red.
7. Tests that depend on time zone, clock or locale pin them; pt-BR word boundaries use (?<![\p{L}])…(?![\p{L}]) with the u flag.
8. Only VITE_SUPABASE_URL and the anon/publishable key in the site; never service_role, .env or secrets in Git.
End your final handoff with: CONVENTIONS_ACK appmat-566249
