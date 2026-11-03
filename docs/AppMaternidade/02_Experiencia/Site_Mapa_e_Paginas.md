---
tipo: design-doc
status: em revisão
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
tarefa: MAT-32
adr: ADR-009
fontes_principais:
  - 01_Produto/Visao_e_Escopo.md
  - 01_Produto/Concorrentes_e_Diferenciais.md
  - 02_Experiencia/Fluxos_e_Telas.md
  - 08_Referencias/Analise_dos_Repositorios.md
  - 08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md
---

# Mapa e páginas do site

Lista fechada das páginas do site completo ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Cada página diz de onde veio a ideia e o que muda na web. Nenhuma cria requisito novo: os RF são os de [Visão e escopo](../01_Produto/Visao_e_Escopo.md), seção 6.

Como ler as colunas:

- **Área:** Pública (sem login), Acesso (entrada e convite), Logada (família) ou Equipe (painel interno).
- **RF cobertos:** "—" quando a página não tem um RF natural.
- **Origem da ideia:** `Visao §n` é a seção de [Visão e escopo](../01_Produto/Visao_e_Escopo.md); `Diferencial DF-n` vem de [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md); `Fluxos x.y` vem de [Fluxos e telas](Fluxos_e_Telas.md); `Analise` cita o começo da linha na seção 4 de [Análise dos repositórios](../08_Referencias/Analise_dos_Repositorios.md); `Loja/LGPD` cita [Privacidade, legal e lojas](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md); `Padrao web` marca páginas que todo site tem.

## Páginas

| Página | Área | RF cobertos | Origem da ideia | Adaptação ao site |
| --- | --- | --- | --- | --- |
| Início | Pública | — | Visao §2; Diferencial DF-1 | Apresenta os quatro pilares e leva a "Entrar e criar conta". Abre bem no celular e não pede instalação. |
| Como funciona | Pública | — | Visao §5; Fluxos 4.1 | Mostra as jornadas principais (primeira semana, madrugada, troca de turno) com telas de exemplo e dados fictícios. |
| Cuidado compartilhado | Pública | — | Diferencial DF-2; Visao §4 | Explica conta por pessoa, papéis, autoria e passagem de turno, sem senha familiar única. |
| Desenvolvimento e tummy time | Pública | — | Diferencial DF-3; ADR-007 | Explica tummy time sem meta numérica e como o conteúdo é revisado. Não mostra dado de nenhuma família. |
| Regras da comunidade | Pública | RF-11 | Diferencial DF-4; ADR-006; Loja/LGPD (Apple 1.2 e Google Play UGC: regras, denúncia e contato publicados, seções 5 e 6) | Mostra só as regras e o contato de denúncia, nunca posts. A comunidade só é vista por quem entrou e não é indexada (DF-4). |
| Privacidade | Pública | RF-13 | Loja/LGPD (Apple 5.1.1(i) e Política de Dados do Usuário do Google Play: política publicada, seções 5 e 6); Diferencial DF-6 | Política em pt-BR, com link no rodapé de todas as páginas e na área logada. Diz onde os dados ficam (Supabase em São Paulo). |
| Termos | Pública | — | ADR-001; Loja/LGPD (Google Play UGC: aceite dos termos antes de publicar, seção 6) | Termos de uso em pt-BR; o aceite é pedido antes da primeira publicação na comunidade. |
| Exclusão de conta | Pública | RF-13 | Loja/LGPD (Google Play: link web de exclusão que funciona sem o app, seção 6); ADR-001 | Abre sem login e explica como pedir a exclusão, o que é apagado e em que prazo. O pedido em si exige provar que a conta é da pessoa. |
| Contato | Pública | — | Loja/LGPD (Apple 1.5 e 1.6: contato fácil e Support URL, seção 5) | Canal por e-mail para suporte, privacidade e denúncia, publicado também no rodapé. |
| Sobre | Pública | — | Visao §1; Diferencial DF-7 | Diz quem faz o produto, para quem é (Brasil, pt-BR) e o que ele não faz: diagnóstico e orientação médica. |
| Página não encontrada | Pública | — | Padrao web | Mensagem curta com links para Início e Entrar. |
| Entrar e criar conta | Acesso | — | Fluxos 4.1; Fluxos 4.2 | Abre pelo link, sem instalar. Depois do cadastro do bebê, o site oferece instalar a PWA quando houver benefício claro. |
| Recuperar acesso | Acesso | — | Padrao web | Recuperação pelo e-mail da conta, com resposta igual para conta existente ou não. |
| Aceitar convite | Acesso | RF-05 | Fluxos 4.3; Analise "Convite com validade curta e de" | O link do convite abre no navegador ou na PWA, inclusive sem login. Convite vencido, revogado ou já usado tem mensagem clara. |
| Hoje | Logada | RF-01; RF-07 | Fluxos 3.1; Analise "Modo de tela para madrugada" | Botões rápidos embaixo, ao alcance do polegar. O modo madrugada é uma variação desta tela: tema escuro, botões grandes e blocos de "há quanto tempo". |
| Sessão em andamento | Logada | RF-02; RF-08 | Fluxos 3.2; Analise "Sessão em andamento derivada do horário" | RF-02 vira "sobrevive a fechar a aba, com o horário de início guardado". Cronômetro na tela bloqueada fica para o port. |
| Histórico | Logada | RF-03; RF-04 | Fluxos 3.3; Fluxos 4.6; Analise "Regra única para decidir a" | Linha do tempo por dia e semana no fuso da família, com autoria; editar, excluir e restaurar no detalhe do registro. |
| Desenvolvimento | Logada | RF-08; RF-09 | Fluxos 3.4; Diferencial DF-3 | Tummy time e atividades da fase; artigos com autoria, fontes, revisor e data de revisão visíveis. |
| Comunidade | Logada | RF-10; RF-11; RF-12 | Fluxos 3.5; Fluxos 4.8; Fluxos 4.9; Diferencial DF-4 | Só para quem entrou e fora da indexação dos buscadores. O resumo da rotina só é compartilhado por ação consciente, com prévia. |
| Família e conta | Logada | RF-05; RF-06; RF-13; RF-14 | Fluxos 3.6; Fluxos 4.10; Analise "Exclusão de conta com transferência de titularidade" | Convites, papéis, exportar dados e excluir conta. RF-14 vira "lembretes por Web Push, dependentes do servidor"; as preferências de notificação ficam aqui. A exportação baixa um arquivo pelo navegador. |
| Estados globais | Logada | — | Padrao web; Fluxos 5; Analise "Offline declarado só quando há" | Sem conexão, acesso negado e erro, com a fila local à vista: "salvo neste aparelho", "aguardando sincronização", "sincronizado". |
| Painel de moderação | Equipe | RF-11 | ADR-001; ADR-006 | Rota separada do site das famílias, só para papéis de plataforma, com autenticação forte e auditoria. Não lê dados de cuidado ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md), seção 5). |

## Cobertura dos RF

| RF | Páginas |
| --- | --- |
| RF-01 | Hoje |
| RF-02 | Sessão em andamento |
| RF-03 | Histórico |
| RF-04 | Histórico |
| RF-05 | Aceitar convite; Família e conta |
| RF-06 | Família e conta |
| RF-07 | Hoje |
| RF-08 | Sessão em andamento; Desenvolvimento |
| RF-09 | Desenvolvimento |
| RF-10 | Comunidade |
| RF-11 | Regras da comunidade; Comunidade; Painel de moderação |
| RF-12 | Comunidade |
| RF-13 | Privacidade; Exclusão de conta; Família e conta |
| RF-14 | Família e conta |

## Questões abertas

1. Domínio próprio: fica para depois. A D9 (MAT-29), decidida em 03/11/2026, publica o site no GitHub Pages do próprio repositório.
2. Como a página Exclusão de conta confirma que a conta é da pessoa sem login (código por e-mail ou outro meio): fica para a fatia de conta.
3. Se as páginas públicas de conteúdo (Desenvolvimento e tummy time) devem ser indexadas: depende do ciclo editorial do [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).
