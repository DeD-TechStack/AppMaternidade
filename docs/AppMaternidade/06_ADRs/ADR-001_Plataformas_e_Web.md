---
tipo: adr
id: ADR-001
status: Substituída em parte pelo ADR-009 (plataformas); as regras do painel interno continuam valendo
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-4, MAT-6, MAT-15
---

# ADR-001 — Plataformas, papéis da web e limites do MVP

> Nota de 03/11/2026: Daniel mudou o rumo para site completo primeiro e port depois. Ver [ADR-009](ADR-009_Site_Completo_Primeiro.md). O texto abaixo fica como registro da APP-001.

**Status:** Substituída em parte pelo ADR-009 (plataformas); as regras do painel interno continuam valendo

## Contexto e requisitos

- Android e iOS são obrigatórios; a web e a stack estão em aberto (pedido de Daniel e requisitos fixos da task).
- O pacote pede que a web seja avaliada em três papéis separados: site público, painel operacional e produto para famílias (critério A de `06_CRITERIOS_DE_ACEITE.md`).
- As lojas exigem endereços web: política de privacidade publicada e, no Google Play, um link web onde a pessoa pede a exclusão da conta e dos dados; a Apple exige exclusão iniciável dentro do app (diretriz 5.1.1(v)). Fontes: https://developer.apple.com/app-store/review/guidelines/ e https://support.google.com/googleplay/android-developer/answer/13327111 (consulta 22/10/2026), resumidas em [Privacidade, legal e lojas](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md).
- Apps com conteúdo gerado por usuários precisam de filtro, denúncia, bloqueio e contato publicado (diretriz 1.2 da App Store). Isso exige gente operando e uma ferramenta para operar.
- O moderador da comunidade não pode ganhar acesso aos dados privados do bebê ([ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md)).

## Opções consideradas

### Aplicativo para famílias

| Opção | Avaliação |
| --- | --- |
| Android e iOS nativos de loja | Obrigatório. |
| Android, iOS e app web no MVP | Terceira interface para manter; offline na web é mais frágil (armazenamento do navegador pode ser apagado) e navegadores compartilhados aumentam o risco de exposição. Sem evidência de demanda. |
| Android e iOS no MVP; app web avaliado depois com dados de uso | Recomendada. |

### Site público

| Opção | Avaliação |
| --- | --- |
| Nenhum site | Inviável: política de privacidade e exclusão de conta precisam de URL. |
| Site estático mínimo: apresentação, política, termos, regras da comunidade, exclusão de conta, contato | Recomendada. Custo e risco baixos. |
| Site com conteúdo editorial aberto (artigos indexáveis) | Possível depois; exige o ciclo editorial completo e mais revisão. |

### Painel de moderação e operação

| Opção | Avaliação |
| --- | --- |
| Operar pelo console do provedor ou direto no banco | Rejeitada: dá acesso amplo a dados de cuidado, sem trilha de auditoria e sem separação de papéis. |
| Painel interno mínimo, com papéis de plataforma e auditoria | Recomendada. Fila de denúncias, ações de moderação, gestão de conteúdo editorial e suporte limitado. |
| Ferramenta terceirizada de moderação | Avaliar só se o volume justificar; exige análise de privacidade do fornecedor. |

## Evidências

- Requisitos e critérios do pacote: `tasks/hermes/APP-001-design-docs/01_TASK_HERMES.md` e `06_CRITERIOS_DE_ACEITE.md`.
- Diretrizes das lojas (consulta 22/10/2026): links no contexto acima; resumo em [Privacidade, legal e lojas](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md), seções 5 e 6.
- Concorrentes: a maior parte dos produtos analisados é mobile, e alguns têm web complementar (fichas em `08_Referencias/Concorrentes/` e matriz em [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md)).

## Recomendação

1. **Aplicativo:** Android e iOS de loja, com o mesmo conjunto de funções no MVP.
2. **Site público:** estático e mínimo, pronto antes da primeira publicação nas lojas.
3. **Painel interno:** mínimo, para moderação, conteúdo editorial e suporte, pronto quando a comunidade abrir. Acesso só com papéis de plataforma, autenticação forte e auditoria; sem leitura de dados de cuidado.
4. **App web para famílias:** fora do MVP. Reavaliar com dados do piloto.
5. **Limites do MVP:** os de [Visão e escopo](../01_Produto/Visao_e_Escopo.md), seções 9 e 10.

Se a stack escolhida permitir reaproveitar componentes na web (por exemplo, a mesma linguagem no painel), isso reduz custo do painel, mas não muda a recomendação sobre o app web: a complexidade está no offline e na segurança, não nas telas.

## Consequências

- Positivas: foco nas duas plataformas obrigatórias; exigências das lojas atendidas desde o início; moderação com trilha e sem acesso a dados infantis.
- Negativas: o painel é um terceiro produto pequeno a manter; cuidadores sem smartphone ficam de fora no MVP; o site precisa de alguém para manter textos legais atualizados.

## Riscos e verificação que falta

- Confirmar com o piloto se há demanda real de uso em computador ou por cuidadores sem smartphone.
- Validar juridicamente os textos do site (política, termos, regras da comunidade).
- Dimensionar quem opera o painel (ver [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md)).

## Quando revisar

- Pedidos recorrentes de acesso por computador ou de avós sem smartphone no piloto.
- Mudança nas exigências das lojas sobre exclusão de conta ou conteúdo gerado por usuários.
- Decisão de publicar conteúdo editorial aberto para atrair público.

## Referências

[Visão e escopo](../01_Produto/Visao_e_Escopo.md) · [Fluxos e telas](../02_Experiencia/Fluxos_e_Telas.md) · [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [ADR-006](ADR-006_Comunidade_e_Moderacao.md) · tarefas MAT-4, MAT-6 e MAT-15.
