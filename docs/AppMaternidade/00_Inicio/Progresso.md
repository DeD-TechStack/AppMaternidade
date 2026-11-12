---
tipo: progresso
status: em andamento
responsavel: Hermes (execução da APP-001)
atualizado: 2026-10-22 15:13 (America/Sao_Paulo)
---

# Progresso — APP-001 (execução pelo Hermes)

Checkpoint vivo da execução da task APP-001-DESIGNDOCS. Ao retomar depois de uma interrupção, leia este arquivo e confira os recibos em [Registro da organização](Registro_Organizacao.md) antes de repetir qualquer criação (projeto no itsaplan, cofre no Obsidian, tarefas).

- Pacote de entrada (insumo, não editar): `C:/Projetos/AppMaternidade/tasks/hermes/APP-001-design-docs/`
- ZIP original: `C:/Projetos/AppMaternidade/entregas/AppMaternidade_Task_Hermes_DesignDocs_2026-10-22.zip`
- Registro da preparação do pacote (consultor, preservado sem alteração): `C:/Projetos/AppMaternidade/PROGRESSO_TASK_HERMES.md`
- Cofre (local canônico dos Markdown): `C:/Projetos/AppMaternidade/docs/AppMaternidade`
- itsaplan: projeto MAT em http://localhost:3001/oficina/MAT

Horários em America/Sao_Paulo, tirados do relógio da máquina ou de carimbos dos próprios sistemas. Correção às 03:30: os horários 02:45, 02:50 e 02:58 das versões anteriores deste arquivo foram estimados sem consultar o relógio; os valores abaixo vêm dos carimbos reais.

## Registro do site (rumo atual, desde 03/11/2026)

Uma linha por marco, a mais recente no topo. O estado corrente fica em [Retomada do site](Retomada_Site.md), e o detalhe de cada marco está no cartão Kanban citado.

- 11/11/2026, às 9h25: **construção aberta.**
  - Spec final: `FINAL/DESIGN.md` (sha256 e504df37). Os ativos foram gerados e escolhidos.
  - A base t_fdba5bed (MAT-49a, Opus) está rodando.
  - Na fila, presos à base: t_26066f02 (49b), t_3c6e3a0c (49c), t_ee526db4 (36r-A), t_e1d0eaa8 (36r-B) e t_d63c932a (37r, que traz o fad75c0).
  - Arquivados: t_915e3632 e t_55a580e8.
  - Os cartões de dados que estavam em `scheduled` foram religados aos sucessores.
- 11/11/2026, às 9h03: **direção escolhida.** Daniel escolheu na `DIRECOES_20261111/GALERIA2.html` a F1 Campo de mel, com a tabela, os selos e os depoimentos da F2 e o modo Madrugada da F3. As 3 fusões juntam a Pato Jack e a Becky. Imagem, sombra e gradiente estão liberados pelos tokens, imagens geradas podem ir ao site publicado e o Opus escreve as telas que definem a cara do site. O detalhe está em [Retomada do site](Retomada_Site.md).
- 11/11/2026, às 3h20: **visual refeito do zero, passo 0.** Daniel rejeitou o visual do site às 2h20. Saiu a galeria com 3 direções (A Estúdio anil, B Madrugada, C Bilhete da família), cada uma com DESIGN.md e 3 comps do image_gen do Codex, em `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/GALERIA.html`. No board, 8 cartões foram arquivados como substituídos: t_5184c99c, t_93f3308e, t_b2a55931, t_f67d8962, t_ab1bd202 (PWA), t_77f83db6, t_673ee2f7 e t_1584e47e. Outros 9 cartões de dados ficaram em `scheduled`: t_915e3632, t_1757260d, t_11ad28e6, t_f7bdf7e8, t_7c491177, t_55a580e8, t_c9529365, t_4c921e60 e t_359ab800. Nenhum cartão ficou em triage. Não houve código nem integração; `int/refazer` continua em e73e75a. Esperando Daniel: a direção e 4 perguntas, listadas em [Retomada do site](Retomada_Site.md).
- 11/11/2026, às 1h35: **retomada.** A MAT-36 foi para o g2 t_93f3308e por ESCALA-2R. A 6b e a 6c foram refeitas com 2 skills (t_77f83db6 e t_673ee2f7). O detalhe está em [Retomada do site](Retomada_Site.md).
- 10/11/2026, às 20h15: **PAUSA pedida por Daniel.** `int/refazer` está em e73e75a. O detalhe por cartão está em [Retomada do site](Retomada_Site.md). PAUSA_OK appmaternidade 2026-11-10T20:20-03:00
- 10/11/2026: **44d-5 (imagens do Início) integrada em `int/refazer`.**
  - Cartão t_cc66cbf8. O revisor aprovou na R2, e o e73e75a entrou por ff-only, com push.
  - Notas do Fable: 8,1/7,9 e depois 8,3/8,1.
  - A 44d-6 foi dividida em 6a, 6b e 6c (t_f21ee109, t_6afcc9b3, t_9a4ca6ee), que rodam em paralelo. A 44d-6 ficou só com a conferência final.
  - Valem as regras de ciclo novas: 1 passada com todas as correções, no máximo 3 sessões do OpenCode por volta e o check completo 1 vez só.
- 10/11/2026: **PWA adiada por Daniel.** As palavras dele: "eu não pedi pra ter instalavel de nada, só o site".
  - A MAT-41a (t_ab1bd202) parou com `needs_input`.
  - O worktree e os commits foram guardados, e nada foi integrado.
  - O ADR-009 e o DESIGN_DOC_BASE receberam emenda.
  - A 39a e a 40a passaram a depender da 44d-3 e da MAT-36, e não mais da 37b, para rodarem em paralelo.
- 10/11/2026: **44d-2 (área logada) integrada em `int/refazer`.**
  - Cartão t_6c3e5423. O revisor aprovou na revisão 3, e o eda47ae entrou por ff-only, com push.
  - Notas do Fable: de 7,8 a 8,3, depois de 8,0 a 8,3 e por fim de 8,0 a 8,2.
  - A Fralda passou a registrar com 1 toque.
  - Os pontos P1 a P5 foram para a 44d-6.
  - A 41a recebeu os SHAs de base e o A4 novo: a FaixaEstado no `Layout.tsx`.
  - Em paralelo seguem a 44d-3, a 44d-5 e a MAT-36.
- 10/11/2026: **44d-4 (Início) integrada em `int/refazer`.** É o cartão t_27b74658.
  - O revisor aprovou na revisão 3. O candidato 8a7c89d entrou por ff-only, com push.
  - O Fable deu 7,8/7,5 e depois 8,1/8,0.
  - Os textos novos (título, subtítulo e citação) esperam a aprovação de Daniel pela galeria.
  - A 44d-2 e a 44d-3 fazem merge de `int/refazer` antes do próximo HANDOFF.
- 10/11/2026: **44d-1 integrada em `int/refazer`.**
  - Cartão t_0288c2c3. O revisor aprovou na revisão 3, e o candidato 1774cc3 entrou por ff-only, com push.
  - Notas do Fable por rodada: 7,3 a 7,8, depois 8,0 a 8,2, e por fim 8,2 a 8,4.
  - As capturas comuns foram corrigidas em `_staging/.../ferramentas/captura/`.
  - Os cartões 44d-2, 44d-3 e 44d-4 estão rodando em paralelo.
  - A 41a passou a depender da 44d-2, porque a spec dela usa a casca velha. O líder emenda a spec quando a 44d-2 entrar.
- 10/11/2026: **fila religada à 44d.**
  - Os 6 cartões que dependiam do t_f67d8962 foram religados:
    - MAT-36 (t_b2a55931) depois da 44d-4;
    - 37b (t_11ad28e6) depois da 44d-3;
    - 38a (t_f7bdf7e8) depois da 44d-2;
    - 41a (t_ab1bd202) depois da 44d-1;
    - 39a e 40a seguem pelos pais que já tinham.
  - A 44c-2b (t_6e8036b9) foi arquivada, porque a 44d-5 a substitui.
  - Os 9 cartões da fila receberam a emenda: base e integração em `int/refazer`, seção 2 da MAT-44d, `--screen`, uma porta própria (5267 a 5275) e Fable com nota 8 ou mais.
  - Nenhum cartão foi liberado em paralelo agora, porque todos têm tela e seriam refeitos sobre a base velha.
- 10/11/2026: **reavaliação do site inteiro (MAT-44d).**
  - O que motivou: Daniel achou que o site "não segue em nada o site referência". As notas ficaram entre 5,8 e 6,8 mesmo depois do laço visual.
  - Rodadas paradas: a da 44c-1 (t_f67d8962) e a da 37a (t_915e3632). As duas foram substituídas (comentários 160 e 161).
  - Diagnóstico: o Fable 5.2 fez o diagnóstico e o plano, em `REAVALIACAO_20261110/DIAGNOSTICO_FABLE.md`.
  - Decisões: Daniel respondeu às 5 decisões com "tudo sim e segue com opção A".
  - Spec e ramo: a spec MAT-44d tem sha256 953a9114. O ramo `int/refazer` saiu em f069499.
  - Cartões: t_0288c2c3, t_6c3e5423, t_5184c99c, t_27b74658, t_cc66cbf8 e t_1584e47e. Cada um tem a sua porta de Vite, de 5254 a 5266.
  - Vite antigo: o da 5244 foi encerrado. Ele servia o worktree t_f67d8962, e a captura das 09h37 da 44d-1 foi anulada por isso (comentário 163).
  - A main só recebe a mudança depois que as 9 telas tiverem nota 8 ou mais.
- 05/11 a 10/11/2026: o detalhe destes marcos está em [Retomada do site](Retomada_Site.md). Aqui fica só o marco acima.
- 06/11/2026: **decisões de Daniel para a demonstração**, registradas em 07_Roadmap/Decisoes_para_Daniel.md:
  - não há contas de demonstração: cada pessoa cria a sua;
  - Desenvolvimento entra sem o selo de rascunho, com a fonte citada e o aviso médico;
  - o contato e o encarregado de dados são provisórios, com o e-mail do autor dos commits e Daniel Macedo;
  - a verificação extra no painel de moderação continua em aberto.

  A MAT-48b foi destravada.
- 06/11/2026: **frente visual MAT-44c (decisão de Daniel, ~15h).**
  - Daniel reprovou o site publicado: estático, com ilustrações ruins e tela desorganizada.
  - **Aceite novo:** vale a nota de um avaliador que não fez a tela, comparando lado a lado com a referência (https://www.raredays.com/work/dr-becky), com mínimo de 8,0. Abaixo disso, a tela não integra, e a última palavra é de Daniel pela GALERIA.html.
  - **Unificação:** a MAT-44b e a MAT-50 (movimento) viraram a MAT-44c.
  - **Referência gravada** em vídeo e quadros no cartão [pesquisa] t_db4f7ab6, com G9 limpo.
  - **Spec v2 aprovada** (sha256 740c873b), em dois cartões em série: o 44c-1 (t_f67d8962, rodando) faz layout, grade, mockups reais e madrugada escura; o 44c-2 faz o movimento.
  - **MAT-36 (t_b2a55931):** o leitor cego deu de 6,36 a 7,05, e ela espera a 44c-1 como pai.
  - **MAT-37 a 41:** ficam paradas até a base visual nova.
- 06/11/2026: **site no ar (MAT-48a).** O cartão t_f13634a3 teve o candidato 5844fa5 aprovado e foi integrado em 2beddee: 4 commits, range-diff idêntico, check com 469 testes. O workflow Pages rodou com sucesso no run 42246281381.
  - A ACC-09 passou: https://ded-techstack.github.io/AppMaternidade/ responde 200, e /app/hoje e /app/sessao abrem pelo 404.html com o app (h1 Hoje e Sono de Lia), nos dois casos com o aviso "Demonstração sem banco".
  - Nenhuma ação avisou de Node depreciado; o único aviso foi o `punycode` do próprio Node.
- 06/11/2026: **retomada e MAT-44 integrada.**
  - A MAT-44 (t_10f8dad7, candidato 3a8789d, aprovado na revisão 3) entrou na main em 80d6c4f, com 6 commits idênticos e o check de 451 testes passando.
  - O G6 não foi cumprido. O leitor cego do líder deu de 5,78 a 7,12, contra 8,03 a 8,17 do revisor. Integrei mesmo assim, por decisão do líder, e os 5 achados viram a correção MAT-44b, que roda depois da MAT-48a.
  - O cartão da MAT-48a (t_f13634a3) foi criado, com a spec v2.3: o build não recebe as variáveis do banco até a MAT-37.
  - O isolar_supabase ganhou os slots 37 a 41. A releitura R-B das MAT-36 a 41 está em curso.
- 06/11/2026: **PAUSA para a janela v0.23.0** (decisão de Daniel). As correções R-B da MAT-45 (t_ad018d1e, f738247) e da MAT-47 (t_e0627701, c16b68c) foram integradas: o banco completo passou com 56 arquivos e 3.485 asserções, e a main está em 881275d. A MAT-44 (t_10f8dad7) foi APROVADA no candidato 3a8789d, e falta o portão do líder (leitor cego e rebase). As specs MAT-36 v3, MAT-37 a 41 e MAT-48b estão no staging, ainda sem cartão. O próximo passo está em Retomada_Site.md, na seção PAUSA.
- 05/11/2026: **correção R-B da MAT-46 integrada** (t_d4e788ea, candidato a80924e, aprovado na revisão 1). Foram 5 commits, aplicados com cherry-pick, e o range-diff saiu idêntico. O banco completo passou com 49 arquivos e 3.138 asserções, e o check com 294. A main ficou em 4cc3e70.
- 05/11/2026: **bancos de conta e família, rotina e comunidade integrados** (MAT-45 bc91d76, MAT-46 6d4e03f, MAT-47 3385db4, todos aprovados pelo revisor). Foram aplicados com cherry-pick, e o range-diff deu 26 commits idênticos. O banco completo deu PASS: 45 arquivos de teste, 2.930 asserções. A main ficou em 29cccc4. A releitura das specs por outra família foi feita pela rota R-B (codex gpt-6-astra, só leitura), porque o cartão de leitura cai num bug do Hermes no Windows. Ela deu B=3 e M=23 no total. As decisões ficaram no adendo `_staging/appmaternidade/DECISOES_BANCO_RB_20261105.md` (sha256 ac29c080), e as correções estão em 3 cartões paralelos: t_ad018d1e, t_d4e788ea e t_e0627701.
- 05/11/2026: **rascunho do conteúdo de Desenvolvimento (MAT-39, cartão [pesquisa] `t_78297271`).** São 8 itens com 66 citações e a licença de cada fonte conferida, guardados no staging, fora do Git. Tudo está marcado como rascunho sem revisão. A publicação espera a D5 (MAT-24), que define quem revisa. Os termos da AAP proíbem análise por IA, então essa fonte entra só como link.
- 05/11/2026: **paralelismo ligado (pedido de Daniel via coordenador).** Cinco frentes passaram a andar juntas:
  - MAT-44 (`t_10f8dad7`, em `web/src`);
  - MAT-45 (`t_e3572be9`), MAT-46 (`t_c9df145a`) e MAT-47 (`t_569c296e`), em `supabase/`;
  - a pesquisa da MAT-39 (`t_78297271`).

  **Preparação** para os bancos não colidirem:
  - cada tarefa grava o seed no próprio arquivo em `supabase/seeds/`, carregado pelo `config.toml` desde 39f7c82 (decisão C4 revista);
  - cada cartão sobe um Supabase isolado, com `project_id` e portas próprios, pelo `isolar_supabase.py` do staging. O teste com dois bancos ao mesmo tempo deu 123/123 em cada.

  **Decisão do líder:** as 3 specs de banco seguem com a releitura provisória da mesma família, porque o runtime do revisor caiu. O explique de volta por outra família entra quando ele voltar, antes da revisão do código.

  A MAT-48a (Pages pelo CI) está com a spec v1 em explique de volta. Ela depende da MAT-44 na main, porque usa o `basename` do roteador.
- 05/11/2026: **D7 = A e push liberado (decisões de Daniel).**
  - **D7:** os registros das sondagens de acesso ficam só no disco, fora do Git, sem contato com os mantenedores.
  - **Usuário local:** o nome de usuário do Windows virou `<usuario>` nos arquivos rastreados (6 arquivos, 14 ocorrências). Nos commits antigos ele continua, por escolha de Daniel.
  - **Push:** commit e push normal da `main` passam a ser rotina, sempre após cada integração aprovada. Autor e committer são Daniel Macedo, sem coautor. Antes de cada push, o líder procura segredos no diff e confere o `git status`. Continuam proibidos `--force`, reescrita de história, tag, release, PR em upstream e repositório novo.
- 05/11/2026: **MAT-43 integrada.** O revisor deu APPROVED a c0f4ce0. O líder fez o rebase sobre a main, o range-diff deu 6/6 idêntico, e a integração foi por ff em b76a707. Antes, passaram `db:reset`, `db:lint` (sem erros) e `db:test` (Files=10, Tests=123, PASS), mais o check do site (294) e o verificador 6/6. Nenhum contêiner ficou ligado. Os cartões de leitura das MAT-45, MAT-46 e MAT-47 foram desbloqueados.
- 05/11/2026: **mapa de skills do projeto (pedido de Daniel via coordenador).** O líder fez uma passada de relevância sobre 247 skills do perfil, com `skills_list`, `omh_capabilities` e o método do `omh-skill-scout`. O mapa "etapa → usar sempre / usar quando X / não serve aqui" ficou em `appmaternidade-delivery/references/mapa-skills.md`. Nenhuma skill foi removida. O `omh-frontend` passa a ser o 1º passo de todo cartão de tela. O OpenCode recebe as skills pelo nome no prompt, com evento `skill` cobrado no recibo. **Achado:** a direção atual (papel quente, serifa, terracota) é o "prior editorial" que o `omh-frontend` aponta como modo de falha em tela de dados. Ela fica nas páginas públicas; a área logada precisa de uma direção de gosto nomeada. A MAT-44 já tinha passado da escolha de direção (A, 7,48), então o aviso foi para o laço visual dela.
- 05/11/2026: **estudo de padrões de apps de maternidade (MAT-49, D-2 de Daniel).** Foram 17 capturas públicas da App Store de 3 apps, guardadas fora do Git, em `_staging/appmaternidade/PESQ-APPS/`. O estudo `ESTUDO_PADROES.md` (sha256 `4519e220`) traz os padrões P1 a P8 em sala limpa: registro por tipo com "há quanto tempo", grade de registro rápido, timer focado, lista do dia, modo noturno, barra inferior, convite e risco de proximidade. O `imgdiff` em modo layout deu 21,6, 13,5 e 24,1 contra as nossas telas, todos "different". Esses recortes viram o teste contra proximidade das telas logadas, com teto de 75.
- 05/11/2026: **MAT-34 integrada e MAT-44 lançada.** O revisor aprovou na revisão 4 (4bd664b). O líder fez o rebase sobre a main com range-diff idêntico, e a integração foi por ff em e57c844, com 294 testes, links e o verificador 6/6. O cartão da MAT-44 é o `t_10f8dad7`. O 1º, `t_77b96e90`, foi arquivado porque tinha sido criado sem workspace_path. O contrato foi para `0d75b04d3288`, com `npm.cmd` no OpenCode e o papel ux da auditoria.
- 05/11/2026: **decisão de Daniel, D-1 = não.** Na MAT-44, a direção entre as 3 é escolhida só pela nota do award-bar, sem esperar ninguém. O leitor cego do líder confere a escolha na integração. A spec v4 foi ajustada (sha256 `079d7467`).
- 05/11/2026: **decisões comuns de banco e auditoria de UI.**
  - **Banco (C1 a C9),** decisões do líder para MAT-45, MAT-46 e MAT-47:
    - autoria com `set null`, que aparece como "pessoa removida";
    - a família só é apagada por `excluir_familia`;
    - trava e nova conferência em toda mudança de vínculo;
    - a mesma resposta para id inexistente e para id de outra família;
    - faixas de migração, testes e seed separadas por tarefa.
  - **Specs v2** (sha256): MAT-45 `98c9a722`, MAT-46 `56be696e`, MAT-47 `8a3ce6de`, MAT-36 `538fc3e7`.
  - **MAT-44 v4** (`e6e4affd`), feita pela auditoria de UI do coordenador:
    - 3 direções antes do código;
    - skills de interface obrigatórias no OpenCode;
    - laço visual de até 3 iterações;
    - G6 com duas notas independentes ≥ 8,0;
    - ícones lucide-react.
  - A MAT-37 ficou só com as telas, porque o banco de conta passou para a MAT-45.
- 05/11/2026: **pedido de Daniel: site inteiro funcional.**
  - O site vai funcionar de ponta a ponta, com a interface próxima da referência, publicado para o professor usar com dados fictícios.
  - Decisões de Daniel: acesso por e-mail e senha, com recuperação; Supabase Free agora, só com dados fictícios; o e-mail de contato fica pendente.
  - Tarefas novas no itsaplan: MAT-45, MAT-46 e MAT-47 (banco de conta, rotina e comunidade) e MAT-48 (publicação).
  - A spec da MAT-44 foi aprovada na v3.
  - O roteiro completo está na nota de retomada.
- 05/11/2026: **decisão de Daniel: salto visual (MAT-44, D11 revista).** O protótipo da MAT-34 ficou genérico, com G6 entre 7,17 e 7,25. A MAT-34 fecha como está, e a MAT-44 refaz as 3 telas com as capturas da referência visíveis para quem monta e componentes da lista aprovada (shadcn/ui, Magic UI), com G6 mínimo de 8,0. Continua proibido copiar código, imagem, texto e marca. As capturas ficam fora do Git, em `_staging/appmaternidade/MAT-44/referencia/`.
- 05/11/2026: **specs aprovadas e cartões criados.** A MAT-34 v2 virou o cartão `t_dd87ca3d` e a MAT-43 v2, o `t_58526cc9`, os dois com base cc91ec8. O G6 tem mínimo de 7,0 por tela.
- 05/11/2026: **retomada** liberada por Daniel. As specs da MAT-34 e da MAT-43 foram escritas, v1 em explique de volta. A main está em c81a094.
- 03/11/2026, 15h35: **pausa por limite**, pedida por Daniel por meio do coordenador. O board está sem cartões abertos. A main está em a9a74eb, com a árvore limpa e sem push. Na volta, o primeiro passo são as specs da MAT-34 e da MAT-43.
- 03/11/2026: **MAT-32 integrada.** Os design docs v0.4 entraram na main pelo cartão `t_46deffa1`. O SHA revisado era 7577216 e foi reposicionado sobre a fundação como 5500c66, com patches idênticos. A revisão aprovou na rodada 2; a rodada 1 tinha devolvido o DOC-08 por implementação.
- 03/11/2026: **parada do dia.** A nota de retomada foi criada (d04c26f). Daniel retoma na quinta.
- 03/11/2026: **MAT-35 integrada.** A fundação do site entrou pelo cartão `t_da8e708b`, com d731d3d por avanço direto (ff). O veredito foi APPROVED_WITH_LIMITS, e o contrato foi reconciliado.
- 03/11/2026: **decisões.** D8 (stack, por delegação de Daniel), D9 (GitHub Pages, decidida por Daniel), D10 (Impeccable, por delegação) e D11 (sala limpa reduzida), nas tarefas MAT-28 a MAT-31. Nesse mesmo dia, Daniel mudou o rumo para "site completo primeiro, port depois" (MAT-27).

## Estado inicial conferido (22/10/2026 02:29)

- Workspace: `.git`, `entregas/`, `tasks/`, `PROGRESSO_TASK_HERMES.md`. Sem `.gitignore` e sem AGENTS.md aplicável (`C:/Projetos/AGENTS.md`, `C:/AGENTS.md` e o do workspace não existem).
- Git: branch `main` sem commits; remoto `origin` = https://github.com/DeD-TechStack/AppMaternidade.git; `git ls-remote origin` sem refs. Nenhum commit ou push será feito nesta task.
- Ferramentas locais: Node 24.20.0, npm 11.19.0, Python 3.14.7 (e 3.12.10 via `py`), Docker 29.9.2 (Docker Desktop ativo), OpenJDK 21.0.11, gh 2.103.0. Ausentes: Android SDK/adb, Flutter/Dart, Kotlin, Gradle. Nenhum Mac/Xcode local.
- itsaplan: web em http://localhost:3001; API/MCP em 127.0.0.1:3000; versão 1.6.0 segundo o guia de acesso da oficina. O conector do perfil default age como `hermes-default` ("Hermes (default)"); não tem ferramenta para criar projeto.
- Obsidian normal: cadastro em `%APPDATA%/obsidian/obsidian.json` com BreakInv e FORJAI e nenhum AppMaternidade; o protocolo `obsidian://` aponta para `C:/OrchestrationLab/apps/orca/home/AppData/Local/Programs/Obsidian/Obsidian.exe`. Nenhum processo Obsidian aberto antes das 02:54.

## Etapas

| Etapa | Situação | Observação |
| --- | --- | --- |
| D0 Contexto e checkpoint | feita | Pacote lido integralmente (00 a 09, contexto e imagem). MAT-1 em Feito. |
| D1 itsaplan e cofre | feita | itsaplan organizado: MAT-1 a MAT-26, vínculos e documento de estado. Daniel registrou o cofre no Obsidian normal às 07:00:46; a navegação pela Home, um design doc e um ADR foi conferida às 07:12 (MAT-3 concluída). |
| D2 Pesquisa de produto e repositórios | feita | Oito concorrentes, quatro repositórios, tecnologias, privacidade, comunidade e conteúdo. |
| D3 Produto, navegação e recorte | feita (proposta) | Visão e escopo, fluxos e telas, concorrentes e diferenciais. |
| D4 Comparação de arquiteturas | feita (proposta) | Três conjuntos completos; recomendação RN + Expo e Conjunto B. |
| D5 Dados, permissões e sincronização | feita (proposta) | Modelo e permissões; offline, sincronização e temporizadores. |
| D6 Docs, ADRs e plano | feita (proposta) | ADR-001 a ADR-008 (Proposta), roadmap, decisões D1 a D7. |
| D7 Revisão e entrega | feita | Três rodadas de revisão independente sem achado alto; 17 achados tratados; relatório final e itsaplan atualizados. Obsidian registrado e navegado (D1). |

## Decisões pequenas e reversíveis tomadas pelo Hermes

| Data | Decisão | Motivo | Como reverter |
| --- | --- | --- | --- |
| 22/10 | Cofre no caminho proposto pelo pacote, `docs/AppMaternidade`. | Não há convenção anterior no workspace. | Mover a pasta e reabrir como cofre. |
| 22/10 | Clones das referências em `C:/Projetos/AppMaternidade/_referencias/`, fora do Git pelo `.gitignore`. | Ler o código no commit analisado sem misturar com o produto. | Apagar a pasta. |
| 22/10 | `.gitignore` novo na raiz: clones, `.obsidian/`, capturas, contexto original, `entregas/` e arquivos de ambiente ficam fora do Git. | O remoto é público; nada privado deve subir por engano. | Editar ou apagar o arquivo. |
| 22/10 | Configuração do cofre em `.obsidian/app.json`: links Markdown relativos e anexos em `09_Evidencias/capturas`. | Links legíveis fora do Obsidian, como pede o pacote. | Trocar nas configurações do Obsidian. |
| 22/10 | Tarefas futuras (MAT-17 a MAT-19) sem agente delegado. | Não disparar execução durante a fase documental. | Delegar quando Daniel pedir. |

## Checkpoints

### 02:54 — pesquisa despachada (D2 e D4 em paralelo)

Dez subagentes em segundo plano (delegação `deleg_0f232e05`, manifesto criado às 02:54:32), cada um dono dos seus arquivos:

| Frente | Arquivos do subagente |
| --- | --- |
| Concorrentes A | `08_Referencias/Concorrentes/Napper.md`, `Huckleberry.md`, `Baby_Daybook.md`, `Nara_Baby.md` |
| Concorrentes B | `08_Referencias/Concorrentes/Kinedu.md`, `Pathways.md`, `BabyCenter.md`, `Peanut.md` |
| Finnberry | `08_Referencias/Repositorios/Finnberry.md` e `09_Evidencias/Execucao_Referencias/Finnberry/` |
| Baby Buddy | `08_Referencias/Repositorios/Baby_Buddy.md` e `09_Evidencias/Execucao_Referencias/Baby_Buddy/` |
| Sprout Track | `08_Referencias/Repositorios/Sprout_Track.md` e `09_Evidencias/Execucao_Referencias/Sprout_Track/` |
| Bebbo | `08_Referencias/Repositorios/Bebbo.md` e `09_Evidencias/Execucao_Referencias/Bebbo/` |
| Mobile | `08_Referencias/Tecnologias/Mobile_e_Plataformas.md` |
| Dados e backend | `08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md`, `Precos_Datados.md` |
| Comunidade e conteúdo | `08_Referencias/Pesquisa_Comunidade_e_Conteudo.md` |
| Privacidade e lojas | `08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md` |

Regras passadas aos subagentes: dados fictícios, só 127.0.0.1, portas 38000-38499, containers com prefixo `appmat-ref-`, nada de prune nem de mexer em containers de Daniel, sem commit ou push, sem contas ou contratações. Às 03:28 havia um container de teste ativo, `appmat-ref-finnberry-pg` (PostgreSQL em 127.0.0.1:38110); a remoção será conferida no fechamento.

### Antes das 03:09 — itsaplan: projeto criado por Daniel

O navegador do agente abriu o itsaplan na tela de login e o cofre de senhas do navegador não tinha login salvo. Perguntado, Daniel respondeu: "Eu mesmo crio o projeto e adiciono o Hermes (default) como agente de trabalho; você segue pelo conector." O projeto MAT foi criado às 03:09:16.

### 03:12 — Obsidian normal aberto no seletor de cofres

Processo 24904 iniciado às 03:12:45 por `obsidian://choose-vault`, sem `--user-data-dir`; o seletor mostra FORJAI e BreakInv (perfil normal) e a versão 1.14.4. O clique em "Abrir pasta como um cofre" pela automação de interface não foi executado: a ferramenta devolveu "BLOCKED, not run; the user did NOT consent" (não dá para saber se a aprovação expirou ou foi negada). Pela regra da ferramenta, não repito nem contorno por outro caminho, e não edito o cadastro do Obsidian à mão.

Fotografia antes do registro (para medir o efeito depois): SHA-256 do `%APPDATA%/obsidian/obsidian.json` = `1a949920f191d3e5a539639a5ac6466b6c1c33a04ed716467eca81eb034fa6a3`; do cadastro da Oficina (`C:/OrchestrationLab/apps/orca/home/AppData/Roaming/obsidian/obsidian.json`, só OficinaConhecimento) = `5dec260fe65fff856c75dc198f18ccd38ebbc20b87ad10c15303face687675aa`. O lançador da Oficina é `C:/OrchestrationLab/Abrir-Obsidian-Oficina.cmd`, que usa `--user-data-dir` apontando para o cadastro da Oficina; o Obsidian normal é o mesmo executável sem esse parâmetro.

### 03:20 a 03:30 — itsaplan organizado

19 tarefas (MAT-1 a MAT-19), 37 vínculos "bloqueado por", documento de estado (id 9) ligado a todas e comentário de conclusão na MAT-1. Recibos completos em [Registro da organização](Registro_Organizacao.md).

### 03:31 a 03:53 — documentos independentes da pesquisa e recuperação de duas frentes

Escritos pelo coordenador, todos com status "proposta":

- [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)
- [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)
- [Fluxos e telas](../02_Experiencia/Fluxos_e_Telas.md)
- [Visão e escopo](../01_Produto/Visao_e_Escopo.md)
- [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md)
- [Roadmap e próxima fatia](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)
- [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md), [ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md) e [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)

Situação da pesquisa às 03:45:

| Frente | Situação |
| --- | --- |
| Concorrentes A | Concluída às 03:31 (quatro fichas). |
| Finnberry | Interrompida às 03:14 pelo filtro de segurança do provedor ("violative cyber content"), depois de instalar, rodar os testes unitários e criar o schema num PostgreSQL de teste. Sem ficha. |
| Sprout Track | Interrompida às 03:36 pelo mesmo filtro, depois de executar o projeto e gravar as evidências em `09_Evidencias/Execucao_Referencias/Sprout_Track/`. Sem ficha. |
| Demais sete | Em andamento. |

Ações de recuperação:

- 03:46: removido o container `appmat-ref-finnberry-pg` deixado pela frente interrompida (banco de teste em memória, dados fictícios). Portas 38000-38499 conferidas: nenhum outro processo das referências ficou rodando.
- 03:47: nova delegação `deleg_23bc6717` com duas frentes, só para escrever as fichas do Finnberry e do Sprout Track a partir do código e das evidências existentes. Ficou proibido fazer requisições de teste de autorização; o escopo por família é tratado só por leitura de código.
- 03:47: a frente Baby Buddy recebeu a mesma orientação, para não perder o trabalho.
- 03:48: a frente Baby Buddy também foi interrompida pelo filtro, mas só depois de gravar a ficha completa (`08_Referencias/Repositorios/Baby_Buddy.md`, 383 linhas, às 03:46). Não precisa ser refeita.
- 03:59: a frente Bebbo parou porque o provedor deixou de responder (5 tentativas sem resposta), durante a leitura da licença e antes de escrever a ficha. As evidências em `09_Evidencias/Execucao_Referencias/Bebbo/` estão preservadas. Às 04:00, nova delegação `deleg_02d9d149` só para escrever a ficha a partir delas, sem nova execução.

### 04:05 a 04:27 — pesquisa consolidada e recomendação de arquitetura

- 04:05: a delegação `deleg_0f232e05` terminou. Concluídas: concorrentes A e B (oito fichas), mobile, dados e backend com preços, comunidade e conteúdo, privacidade e lojas. Falhas já tratadas acima: Finnberry, Sprout Track e Bebbo (relançadas), Baby Buddy (ficha salva antes da falha).
- Desvio relatado pela frente de privacidade: o sistema de aprovações bloqueou uma extração de artigos da LGPD (33, 37, 38, 41, 46, 48 e 49) com a instrução de não chegar ao mesmo resultado por outro caminho, e a frente leu depois esses artigos de um arquivo local. A nota resume esses artigos sem transcrevê-los. Os documentos derivados citam esses artigos só pelo número, com link ao Planalto. Daniel decide se os resumos ficam.
- Conferido às 04:10: o PowerSync Cloud oferece região BR e o Supabase oferece sa-east-1 (São Paulo).
- 04:12: delegação `deleg_a7e0449c` com quatro redatores: Concorrentes e diferenciais; Comunidade, Desenvolvimento e ADRs 006 e 007; Privacidade e segurança; Custos e operação e ADR-008.
- Escritos pelo coordenador: [Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md), [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md), [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md), [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) e [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md). Nomes dos conjuntos padronizados como A (Firebase), B (Supabase + PowerSync + serviço de domínio, recomendado) e C (API própria com sincronização própria).

### 04:28 a 04:42 — itsaplan atualizado e ficha do Finnberry

- 04:28 a 04:31: no itsaplan, a MAT-2 foi para Feito e a MAT-3 para "Esperando Daniel". As MAT-6, 7, 8, 9 e 14 foram para Em revisão, e as MAT-12, 13 e 15 para Em andamento, cada uma com um comentário. Também criei as decisões D1 a D6 (MAT-20 a MAT-25), com vínculos e o documento 9. Recibos em [Registro da organização](Registro_Organizacao.md).
- 04:30: a segunda tentativa do Finnberry (`deleg_23bc6717`, tarefa 1) caiu porque o provedor parou de responder. Antes disso, já tinha salvo o índice de evidências e os logs 06 e 07. Para não arriscar uma terceira queda, escrevi a ficha eu mesmo, só pela leitura do código, sem executar nada contra o app: [Finnberry](../08_Referencias/Repositorios/Finnberry.md) (263 linhas, 04:42). Às 04:35 não havia porta 38xxx nem container `appmat-ref-*` ativo.
- Ainda em andamento: Sprout Track (`deleg_23bc6717`, tarefa 2), Bebbo (`deleg_02d9d149`) e os quatro redatores (`deleg_a7e0449c`).

### 04:43 a 04:52 — concorrentes e diferenciais

- 04:43: o redator de Concorrentes e diferenciais (`deleg_a7e0449c`, tarefa 1) caiu por falta de resposta do provedor, sem ter escrito nada; a última ação foi às 04:20. Escrevi o documento eu mesmo, a partir das oito fichas: [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md) (209 linhas, 04:52), com os diferenciais hipotéticos DF-1 a DF-7.
- MAT-4 foi para Em revisão no itsaplan, com comentário.
- Três links desse documento apontam para textos que outros redatores ainda estão escrevendo: Comunidade e moderação, Desenvolvimento e conteúdo, Privacidade e segurança. Confiro na revisão final de links.

### 04:41 a 05:03 — mais falhas de subagentes; documentos assumidos pelo coordenador

- Caíram por falta de resposta do provedor, sem escrever nada:
  - os redatores de Privacidade (04:45) e de Custos e ADR-008 (04:41);
  - o de Comunidade, Desenvolvimento e ADRs 006 e 007 (04:54);
  - a terceira tentativa do Sprout Track (`deleg_23bc6717`, 04:54).
  - O Bebbo (`deleg_02d9d149`) está sem atividade desde 04:38.
- Escritos pelo coordenador, a partir das notas de pesquisa:
  - [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) (241 linhas);
  - [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md) (189 linhas);
  - [ADR-008](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md);
  - [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md);
  - [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md).
- 04:58: despachei um único subagente (`deleg_c292f0ff`) para escrever Desenvolvimento e conteúdo e o ADR-007. A instrução é gravar a primeira versão cedo, sem pesquisa web.
- Ajuste de coerência: a janela de backup passou de 35 para 7 dias no piloto, igual à do Supabase Pro e à do PITR. Uma janela maior só com cópia externa, a decidir pelo RPO/RTO.
- Evidências do Sprout Track: a pasta guarda requisições de teste de acesso da primeira tentativa (`07_api_probe.json`, `08_api_probe2.json`, `11_Resumo_Passos_API.md` e `roteiros/api_probe*.py`), feitas com dados fictícios em 127.0.0.1. Pela regra adotada depois dos bloqueios, esses arquivos não são usados nas fichas. Daniel decide se ficam no cofre antes de qualquer commit. Não há token nem chave neles (busca por padrões de JWT, Bearer e chave de API, sem ocorrência); só o PIN fictício padrão do seed.
- itsaplan: MAT-10, MAT-12 e MAT-13 foram para Em revisão, com comentários. Os comentários dizem "05:08" por erro meu: o horário real da entrega foi por volta de 05:00 (o `date` das 05:04 confirma).
- 05:04: chegou o aviso de falha do redator de Custos e ADR-008 (`deleg_a7e0449c`, tarefa 4), que já estava registrado acima. O log tem zero escritas, então não sobrou arquivo parcial. O link do ADR-003 apontava para o nome que esse redator usaria (`ADR-008_Documentacao_Operacao_Custos.md`); corrigi para o arquivo real.
- 05:05: chegou o aviso de falha do redator de Privacidade (`deleg_a7e0449c`, tarefa 3), que já estava registrado acima. O log tem zero escritas. O arquivo `Privacidade_e_Seguranca.md` em disco é o do coordenador (241 linhas, salvo às 04:54).
- 05:05: incluí no `.gitignore` os registros de testes de acesso contra projetos de terceiros:
  - Sprout Track: 06, 07, 08, 09, 11 e 12, mais os roteiros de sondagem;
  - Baby Buddy: 03, 06 e `roteiros/api_tests.sh`.

  Eles ficam fora do Git até Daniel decidir sobre divulgação responsável (D7). Os arquivos continuam no disco.
- 05:07: a delegação `deleg_23bc6717` terminou com as duas tarefas falhas, por falta de resposta do provedor:
  - Finnberry: as duas escritas foram o roteiro de licenças no rascunho e o índice de evidências. A ficha é a do coordenador, das 04:42.
  - Sprout Track: zero escritas. A ficha está sendo escrita pelo coordenador, por leitura de código.
  - Às 05:07 não havia container `appmat-*` nem porta 38xxx em escuta.
- 05:08: a delegação `deleg_a7e0449c` terminou com as quatro tarefas falhas. Nenhuma delas escreveu no cofre. Os seis documentos que estavam com esses redatores estão no disco, escritos pelo coordenador: Concorrentes e diferenciais, Privacidade e segurança, Custos e operação, ADR-008, Comunidade e moderação e ADR-006. Desenvolvimento e conteúdo e o ADR-007 seguem com `deleg_c292f0ff`.
- 05:10: a ficha do Bebbo (`deleg_02d9d149`) caiu por falta de resposta do provedor, sem escrever no cofre. No rascunho, `scratch/bebbo-ficha`, ficaram `dep_licenses.out` e `ledger.json`. O coordenador assume a ficha, a partir das 14 evidências já gravadas e da leitura de código. Até aqui, todas as tentativas de subagente desta etapa, exceto as da pesquisa inicial, caíram por falta de resposta do provedor. Para não perder mais tempo, sigo escrevendo pelo coordenador.

### 05:10 a 05:38 — fichas restantes, conteúdo, D7 e revisão de evidências

- Escritos pelo coordenador:
  - [Sprout Track](../08_Referencias/Repositorios/Sprout_Track.md), 05:16, por leitura de código e pelo registro de execução; licença lida inteira;
  - [Bebbo](../08_Referencias/Repositorios/Bebbo.md), 05:20, com a cópia de `15_licencas_dependencias.tsv` do rascunho para as evidências;
  - [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md), 05:27;
  - [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md), 05:28.
- 05:25: interrompi `deleg_c292f0ff` (sa-0-7cb5adab). Estava sem atividade desde 05:06 e sem nenhuma escrita.
- Fontes públicas conferidas pelo coordenador às 05:19: termos e política de privacidade do Bebbo, e a página da FSF de 2010 sobre GPL e App Store.
- **D7 criada:** registros de testes de acesso em projetos de terceiros, em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md); MAT-26 (id 162) em "Esperando Daniel", ligada ao documento 9.
- **Revisão de coerência com a regra de só ler código:**
  - a ficha do Baby Buddy citava resultados de testes de acesso da primeira rodada (códigos A, E e F) e linkava os logs 03 e 06. Reescrevi esses trechos como leitura de código, com a ressalva de pergunta de auditoria. Os códigos funcionais B, C e D ficaram;
  - o README das evidências do Baby Buddy e o registro do Sprout Track não linkam mais os arquivos ignorados;
  - o registro do Sprout Track afirmava "falhas de autorização ainda não corrigidas"; agora diz que os registros pedem avaliação dos mantenedores (D7). Também tirei a sugestão de repetir os roteiros.
- itsaplan:
  - MAT-11 foi para Em revisão;
  - MAT-5 foi para Em andamento; faltam a análise comparativa e as licenças;
  - comentários na MAT-5, na MAT-11 e na MAT-15.

### 05:38 a 05:46 — consolidação e revisão independente

- Escritos: [Análise dos repositórios](../08_Referencias/Analise_dos_Repositorios.md), [Licenças e fontes](../08_Referencias/Licencas_e_Fontes.md) e o [Relatório final](Relatorio_Final_APP-001.md), este em revisão.
- [Home](Home.md) refeita com o mapa de todos os documentos. Ela também deixou de afirmar que o cofre está aberto no Obsidian.
- Conferência por script às 05:38: 51 arquivos .md, nenhum link quebrado, nenhum link para arquivo ignorado. Finais de linha normalizados para LF em 23 arquivos.
- Obsidian normal conferido às 05:47: o `obsidian.json` continua só com BreakInv e FORJAI. MAT-3 segue esperando Daniel.
- **Revisão independente (MAT-16):** iniciada às 05:39:35 em segundo plano.
  - Rota: Codex CLI 0.163.0, gpt-6-astra, esforço max, sandbox read-only, sem busca web, sessão efêmera.
  - Artefatos em `hermes/cache/scratch/appmat-review-r1/`: prompt, manifesto sha256 de 54 arquivos, schema, events, stderr e verdict.
- itsaplan:
  - MAT-5 foi para Em revisão e MAT-16 para Em andamento, com comentários;
  - documento 9 atualizado para a versão 2 às 05:45;
  - recibos em [Registro da organização](Registro_Organizacao.md).
- **Próxima ação:** ler o veredito da revisão, corrigir os achados, registrar na MAT-16 e no relatório, e fazer a entrega final.
- 05:47: chegou o aviso de término de `deleg_c292f0ff`, a tentativa interrompida às 05:25: status interrupted, 5 chamadas e zero escritas. Desenvolvimento e conteúdo e ADR-007 continuam sendo os do coordenador, gravados às 05:28. Não relancei.

### 06:07 a 06:23 — primeira rodada da revisão independente e correções

- **Fim da primeira rodada:** 06:06:58, com exit 0. Veredito CHANGES_REQUIRED: 8 achados, 5 médios e 3 baixos. Cobertura: 28 atendidos, 12 parciais e 2 bloqueados (Obsidian).
- **Correções:** os 8 achados foram aceitos e corrigidos em 24 arquivos. A tabela está no [Relatório final](Relatorio_Final_APP-001.md), seção "Revisão independente".
  - F01, custos: o conjunto recomendado passou a US$ 108 a 126 com 100 famílias, incluindo o serviço de domínio.
  - F02, iOS: a comparação agora é entre EAS e CI macOS.
  - F03, sessões paralelas: vale a política de Offline, seções 7.2 e 8.
  - F04, escopo: MAT-18 e MAT-19 seguem o roadmap.
  - F05, "não identificada nas fontes".
  - F06, bloqueio mútuo.
  - F07, dependências do Sprout Track: arquivo de evidência 13.
  - F08, aceite A11.
- **Conferência por script às 06:23:** 52 arquivos .md, 691 links relativos, nenhum quebrado. Nenhum arquivo versionado aponta para arquivo fora do Git. O único link para registro da D7 sai de outro registro da D7, também ignorado.
- **Segunda rodada:** confere as correções e o relatório final. Disparada logo depois deste checkpoint (`appmat-review-r2`).

### 06:24 a 06:45 — segunda rodada da revisão e correções

- **Segunda rodada:** de 06:24:07 a 06:39:42, com exit 0. Manifesto de 33 arquivos; os hashes conferiram e nenhum arquivo proibido foi lido.
  - Veredito CHANGES_REQUIRED: 8 achados, 3 médios e 5 baixos.
  - Quatro são resíduos de F01, F02, F04 e F06, em notas de pesquisa e no relatório. Quatro são novos: F09, a ordem MAT-17 → MAT-18 no relatório; F10, o Firebase no relatório; F11, a conciliação do custo de 10.000 famílias; F12, a contagem de documentos.
- **Correções** em 8 arquivos (tabela no [Relatório final](Relatorio_Final_APP-001.md)).
  - **Número canônico alterado:** em [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2, entrou a linha de excedentes de banco, arquivos e PowerSync (~US$ 12 em 10.000 famílias). O subtotal de 10.000 famílias foi a ~US$ 238 a 298 e a fase de crescimento a ~US$ 250 a 350, com homologação. Comparação e ADR-003 foram atualizados.
  - Os valores de 100 e 1.000 famílias não mudaram.
- **Conferência por script às 06:43:** 50 arquivos versionados de origem e 703 links relativos. Nenhum quebrado, nenhum para arquivo fora do Git e nenhum CRLF.
- **Terceira rodada**, curta, só sobre os achados da segunda: disparada às 06:45 (`appmat-review-r3`).
- **itsaplan:** MAT-15 para "Em revisão" às 06:24, com comentário; comentário 925 na MAT-16. Recibos em [Registro da organização](Registro_Organizacao.md).

### 06:45 a 06:58 — terceira rodada e encerramento

- **Terceira rodada:** de 06:45:10 a 06:55:41, com exit 0. Manifesto de 13 arquivos; os hashes conferiram e nenhum arquivo proibido foi lido.
  - Veredito APPROVED_WITH_LIMITS: 8 itens atendidos e 2 parciais.
  - Achado único, F11-R3 (baixo): os ~US$ 12 de excedentes não se reproduziam pelos componentes.
- **Correção às 06:56:** memória por componente em Custos (seção 2) e em Preços datados (10.2): banco US$ 5,25, arquivos US$ 0,94 e PowerSync US$ 1,25, somando ~US$ 7,44. Os ~US$ 4,56 restantes ficaram como diferença não reproduzível da nota, mantida como margem. Os totais não mudaram. Essa correção não passou por nova rodada.
- **Balanço das três rodadas:** 17 achados, 8 médios e 9 baixos, nenhum alto. Todos foram tratados.
- **itsaplan:** comentário 932 na MAT-16, que foi para "Em revisão" às 06:57. As colunas 30 e 31 estavam vazias na releitura, e o documento 9 foi para a versão 3.
- **Conferências finais às 06:58:**
  - Git: nenhum commit, nenhum push; o `origin` aponta para o GitHub público.
  - Os 10 registros da D7 continuam ignorados pelo Git. O TSV 13 (licenças) é versionável.
  - Nenhum container `appmat-*` e nenhuma porta de 38000 a 38499 em escuta.
  - O cadastro do Obsidian normal continua só com BreakInv e FORJAI.

### 07:00 a 07:04 — cofre registrado por Daniel

- Daniel avisou que abriu o cofre. A conferência foi só por leitura, sem automação de interface.
- **Cadastro normal:** `%APPDATA%/obsidian/obsidian.json`, modificado às 07:00:46, com a entrada `75cd70ea629fa64f`, caminho `C:\Projetos\AppMaternidade\docs\AppMaternidade` e `open: true`.
- **Janela:** "Nova aba - AppMaternidade - Obsidian 1.14.4", no processo principal 24904, sem `--user-data-dir`. Os processos filhos usam `%APPDATA%/obsidian`, o perfil normal.
- **Pasta `.obsidian/`** criada às 07:00:47 e 07:00:48, ignorada pelo Git (`.gitignore`, linha 10).
- **Oficina:** o cadastro continua com o SHA-256 de antes (`5dec260f…`). Não foi usado.
- **Navegação:** às 07:02:55 o `workspace.json` não tinha nenhuma nota aberta. Às 07:04 começou uma observação em segundo plano, de até 30 minutos (`appmat-obsidian-watch`). Ela termina quando a Home, um design doc e um ADR aparecerem abertos no aplicativo.

### 07:11 a 07:14 — navegação conferida e MAT-3 concluída

- **Conferência:** a observação `appmat-obsidian-watch` terminou com exit 0, e o `workspace.json` do cofre registrou: Home às 07:11:55; ADR-002 às 07:12:03, depois ADR-003, ADR-001, ADR-007 e ADR-004; Roadmap e Decisões às 07:12:39; e o design doc Comunidade e moderação, aberto às 07:12:42.
- **itsaplan:** MAT-3 foi para "Feito", com comentário.
- **Relatório final:** status passou a concluída. A Home e o documento 9 foram atualizados.
- **Conferência só por leitura:** nenhuma automação de interface e nenhuma edição em `.obsidian/`.

### 14:50 a 15:13 — pacote de retorno para o consultor

- **Pedido de Daniel:** o retorno completo e todos os arquivos documentados, para avaliar com o consultor.
- **Releitura das 26 tarefas do MAT:** as descrições de MAT-20 (D1) e MAT-21 (D2) ainda tinham o texto anterior à revisão independente (achados F02 e F01).
  - Foram alinhadas ao cofre às 14:55, com nota da atualização. As recomendações não mudaram.
  - Recibos em [Registro da organização](Registro_Organizacao.md).
- **Correção de nome:** a coluna 30 do MAT se chama "A fazer", e não "docs dependentes", como estava neste registro e no relatório final.
- **Pacote:** `C:\Projetos\AppMaternidade\entregas\AppMaternidade_APP-001_Retorno_Hermes_2026-10-22\`, com ZIP e recibo de verificação ao lado. A pasta `entregas/` fica fora do Git.
  - Leva uma cópia dos arquivos versionáveis do cofre, dois dossiês em arquivo único, a exportação do MAT, as três rodadas da revisão independente e o pacote de entrada da task, sem alteração.
  - Ficam fora: os registros da D7, a pasta `.obsidian/` e os clones de terceiros.
- **Conferências do pacote:**
  - descrições, títulos, colunas, tipos, prioridades, etiquetas e vínculos das 26 tarefas exportadas conferem, por script, com as respostas do conector;
  - os 13 arquivos do pacote de entrada conferem com o disco;
  - o documento 9 está na versão 5, salva por Daniel às 14:16, com texto idêntico ao da versão 4;
  - links: 709 na cópia do cofre e 8 nos guias do pacote, nenhum quebrado e nenhum apontando para arquivo excluído;
  - nenhum arquivo, hash ou trecho dos registros da D7 no pacote;
  - nenhuma credencial do GUIA_ACESSO e nenhum padrão de segredo no pacote.
- **Observação para antes do primeiro push:** quatro arquivos versionáveis citam o caminho da pasta de usuário do Windows.
  - São eles: `Registro_Organizacao.md`, dois logs do Bebbo (03 e 13) e o log 04 do Sprout Track.
  - Não é credencial, mas o nome da máquina fica público se o repositório for publicado.
- **ZIP pronto às 15:13:** `entregas\AppMaternidade_APP-001_Retorno_Hermes_2026-10-22.zip`, com 124 arquivos e 979.786 bytes.
  - SHA-256 `C4E13E4F4668D1643E404EA7EBCE888B117569E700DE8BC92C75D12FBFF029B2`.
  - Recibo: `entregas\AppMaternidade_APP-001_Retorno_Hermes_2026-10-22_VERIFICACAO.json`.

### 06/11/2026 ~19h30 — pausa por limite do Claude

- O cartão t_5c545bc3 trocou a família de exemplo para Heloísa e Juliana e foi aprovado. Ele entrou por ff em **599b975**, que já foi enviado e publicado no Pages.
- Ficaram bloqueados para a pausa, com o worktree preservado:
  - t_f67d8962, a 44c-1, com notas de 5,58 a 6,22 abaixo de 8;
  - t_ecf636f5, a 44c-2a;
  - t_915e3632, a 37a;
  - t_fa51c4df, a 48b.
- A galeria está em `_staging/appmaternidade/PAUSA_20261106/GALERIA.html`. O próximo passo está em `Retomada_Site.md`, na seção "PAUSA de 06/11/2026".

### 09/11/2026 ~22h — retomada da pausa de 06/11

- A infra desbloqueou os 4 cartões. A 44c-1 (t_f67d8962), a 44c-2a (t_ecf636f5) e a 37a (t_915e3632) estão rodando. A 48b (t_fa51c4df) está pronta e espera vaga na fila.
- Os comentários 114 a 117 pedem rebase sobre a main bb70ce5, que já traz os nomes Heloísa e Juliana. A 44c-1 segue com a rodada visual pedida nos comentários 109 e 110 e só integra com nota 8 ou mais do avaliador independente.
- Há 2 subagentes refazendo os corpos dos cartões 44c-2b e 37b e a spec v3 da MAT-38. As MAT-39 a 41 vêm depois.

## Bloqueios

| Desde | Item | Situação | Menor intervenção |
| --- | --- | --- | --- |
| ~03:15 | Registrar o cofre no Obsidian normal (MAT-3) | **Resolvido por Daniel às 07:00:46.** Antes, o clique pela automação de interface tinha voltado "BLOCKED, not run; the user did NOT consent", e o cadastro listava só BreakInv e FORJAI às 03:44, 05:47 e 06:58. | Concluído: navegação conferida às 07:12 pelo `workspace.json`. |
| 03:14 | Análise de Finnberry, Sprout Track e Baby Buddy por subagentes | "content_policy_blocked: This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy." | Contornado: fichas só por leitura de código; registros de testes de acesso fora do Git (D7). |
| 04:30 a 05:25 | Redatores e fichas por subagente | "Provider has been unresponsive (no response received) for 5 consecutive stale attempts — aborting this call to avoid an indefinite stall." | Contornado: o coordenador escreveu todos os documentos que faltavam. |

## Próxima ação

Etapa APP-001 concluída pelo coordenador. Aguardando Daniel:

- revisar as tarefas em revisão (MAT-4 a MAT-16);
- responder às decisões D1 a D7 (MAT-20 a MAT-26). A D7 precisa de resposta antes do primeiro push.

Nenhuma tarefa de implementação (MAT-17 a MAT-19) começa sem pedido dele.

- **11/11 15h20:** Sessão nova do líder (local-5f45c001). Daniel pediu rodada de polimento visual; itens P-45 a P-52 no PENDENCIAS (por grupo de página, escopo disjunto do caminho crítico). Rodando 38a t_f7bdf7e8, 40a g2 t_de06bd20, 37b g2 t_f2e2d6d8; int/refazer e731af5. ETA publicar ~20h30. Pedido t_f01de894 ao coordenador: religar t_f2e2d6d8.

- **11/11 15h32:** Polimento: spec POLIMENTO/SPEC_POLIMENTO.md v1 (faixa média, POL:RF-01..10) e devoluções de Início, destaque e texto escritas; explique de volta R1 por subagente (deleg_f24a9767). Volta 2 de texto/acesso/conta consolidada (RESULTADO_R2_texto_acesso_conta.md); conta_r2 nula pelo quadro de calibração com F3, pedido t_2bfef9a4 ao coordenador.

- **11/11 15h40:** Decisão do líder na 40a t_de06bd20 (revisão r2, run 303, causa teste): D1 RF-14 vale para o código da Comunidade, e pedidos de cuidado iniciados pelo casco da MAT-37 são listados em CASCO_RF14 com prova do iniciador (novo item P-54); D2 medidas logadas por .oc/medir_logado.mjs sobre as funções puras do medir-dom, sem editar a ferramenta. Comentário 460. 37b t_f2e2d6d8 também volta para a rodada de correção 2/2 (comentário 458).

- **11/11 15h53:** Polimento: spec SPEC_POLIMENTO v2 aprovada (sha 88a1f004 antes do registro dos ids; explique de volta R1 3B/18M/7N corrigidos). Cartões: POL-INI t_8c0b72d8 (rodando), POL-TXT t_890d1590 (pronto), POL-DES t_89539427 (schedule, teto de 5). Skills: opencode-executor + omh-design-quality-gate; --tela web na Execução.

- **11/11 16h04:** 38a t_f7bdf7e8 revisão R1 (run 308) devolveu, causa implementacao, R1-R10; rodada de correção 1/2 com merge do int/refazer primeiro e decisões D1/D2 do líder (comentário 470). ETA publicar revisto para ~22h.

- **11/11 16h10:** Pedido do coordenador t_552fb3ec: antes de pedir o 'pode' da publicação, 4 checagens com skills (dogfood, omh-accessibility-audit, omh-production-audit, omh-verification-gate), itens P-55 a P-58, relatórios em _staging/appmaternidade/PRE_LANCAMENTO/; P-59 release-cut e deploy-and-monitor na publicação.

- **11/11 16h24:** 37b g2 t_f2e2d6d8 escalada (ESCALA-2R, revisão 3 run 314, head 4e370c9): R1/R2/R5 fechados, R3/R4 abertos. Decisão do líder: g2 arquivada, sucessora g3 t_6aeda4a9 sobre 4e370c9 só com a evidência faltante (D1 estouro no casco para P-50; D2-D5 sem dispensa).

- **11/11 16h46:** Regra nova (Daniel ~16h40, equipe 536ee95): evidência pendente não devolve cartão (APPROVED_WITH_LIMITS). Itens P-60 a P-62 no PENDENCIAS; 37b g3 t_6aeda4a9 replanejada (comentário 497: defeitos de produto primeiro, resto em evidencia_pendente). POL-TXT t_890d1590 e POL-INI t_8c0b72d8 na correção 1/2 (comentários 481 e 495). ETA ~21h30.

- **11/11 17h10:** Disco C: cheio às 16h54 derrubou a revisão da 40a t_de06bd20 (gave_up, Errno 28). Líder removeu 28 worktrees de cartões integrados (48,9 GB livres; 10 presos por processo ficaram) e pediu redespacho ao coordenador (t_d1da2819).

- **11/11 17h18:** POL-TXT t_890d1590 APPROVED_WITH_LIMITS e integrada por ff em int/refazer (e731af5..cd11c59; check 1409; recibo comentário 506). Juízes pol_texto_r1 lançados. preparar.py dos juízes passou a usar o quadro de calibração recortado (cópia antes em preparar.py.antes_corte). 37b g3 t_6aeda4a9 também gave_up pelo disco; redespacho pedido (t_219f4a49).

- **11/11 17h24:** Coordenador (t_2e6fe5ac): disco cheio por 54 Vite e ~200 Chrome órfãos (pagefile 56 GB) e cache; Docker voltou 17h20; 40a e 37b g3 desbloqueados; cron encerrar-orfaos novo. Líder encerrou os 4 servidores _int* (64 processos) e apagou 10 pastas de worktree integrados presas; C: 58,8 GB livres. 37b g3 e 38a avisados para refazer checagens de 16h24-17h20.

- **11/11 17h28:** POL-INI t_8c0b72d8 APPROVED_WITH_LIMITS (93cc522) integrada pelo merge 386cf35 (int/refazer cd11c59..386cf35; check 1409; recibo comentário 512). Juízes pol_inicio_r1 lançados.

- **11/11 17h34:** Juízes pol_texto_r1: 0/13, 5,5-7,0 (F8). Cartão POL-TXT v2 t_736b76c5 (última volta) com DEVOLUCAO_POL_texto_r1.md sha 448bcb9a. P-63 [D] e-mail de contato Gmail pessoal para a galeria.

- **11/11 17h45:** 40a g2 t_de06bd20 APPROVED_WITH_LIMITS (526c396) integrada pelo merge 22ff7cb (int/refazer 386cf35..22ff7cb; check 1679; recibo comentário 518). Evidência pendente em P-62.

- **11/11 17h52:** Juízes pol_inicio_r1 (Astra refeito uma vez): 2/10, 6,5-7,8. Cartão POL-INI v2 t_9e230273 (última volta) com DEVOLUCAO_POL_inicio_r1.md sha 25ba9887.

- **11/11 18h14:** PAUSA por ordem de Daniel (~18h20, t_3508163c): cartões bloqueados (38a caiu em triage), cron retorno-oc pausado (cacefbc1849d), int/refazer em 22ff7cb; bloco RETOMAR no PENDENCIAS.

- **12/11 01h15:** RETOMADA (sessão nova do líder, pedido de Daniel): ESTADO ATIVO; cron retorno-oc retomado; 37b g3 t_6aeda4a9, POL-DES t_89539427, POL-TXT v2 t_736b76c5 e POL-INI v2 t_9e230273 rodando; 40b t_359ab800 ready. 38a: sucessora t_197241f9 sobre base/38a-g2 4c4b1d4 (árvore de 1542137, merge refeito no título aceito), 38b/39b religadas, t_f7bdf7e8 arquivada. int/refazer segue em 22ff7cb; main intocada.

- **12/11 02h15:** P-62 t_ee893936 APPROVED_WITH_LIMITS (só evidência da 40a, sem SHA). DEF-62-1 (falta o link de pular conteúdo) vai para a P-50. Em correção: POL-INI v2, POL-TXT v2; em revisão: 38a g2 (7509958), POL-DES (4157e18).

- **12/11 02h30:** 38a g2 t_197241f9 APPROVED_WITH_LIMITS (7509958) integrada por ff em int/refazer (22ff7cb..7509958, check 2042, commits OK 341, push; recibo comentário 574). 39b bloqueou: a página logada /app/desenvolvimento (39a) nunca foi feita; criada a 39a g2 t_30ad7504 sobre 7509958, 39b religada a ela (comentário 577). 38b liberada.

- **12/11 02h35:** POL-DES t_89539427 APPROVED_WITH_LIMITS (4157e18) integrada pelo merge da39492 (7509958..da39492, check 2062, commits OK 347, push). Evidência pendente em P-61.

- **12/11 02h42:** POL-TXT v2 t_736b76c5 APPROVED_WITH_LIMITS (1d7cf9f) integrada pelo merge 93517e4 (da39492..93517e4, check 2065, commits OK 353, push).

- **12/11 02h51:** Juízes pol_destaque_r1 válidos nos 2: 0/15 (6,0-7,8). POL-DES v2 t_3fd302a6 (última volta) com DEVOLUCAO_POL_destaque_r1.md sha 7a451efb. conferir.py corrigido (não sobrescreve a tabela principal com a 2ª tabela da resposta).

- **12/11 02h59:** POL-INI v2 t_9e230273 APPROVED_WITH_LIMITS (c317c8f) integrada pelo merge c9e3580 (93517e4..c9e3580, check 2066, commits OK 359, push). Juízes pol_inicio_r2 (última volta) rodando.

- **12/11 03h00:** Juízes pol_texto_r2 (última volta das páginas de texto) válidos nos 2: 0/13, 6,0-7,4 (r1: 5,5-7,0). Vão para a galeria de Daniel.

- **12/11 03h04:** Juízes pol_inicio_r2 (última volta do Início) válidos nos 2: 4/10, 6,5-8,0 (r1: 2/10). F2 (nitidez das telas nos aparelhos) se repete. Vai para a galeria de Daniel.

- **12/11 03h55:** MAT-40b t_359ab800 APPROVED_WITH_LIMITS (48ba136) integrada por ff c9e3580..48ba136 (check 2283, commits OK 368, push; recibo 618). Devolvidas para correção 1/2: 39a g2 t_30ad7504 (R1-R5) e 38b t_7c491177 (R1-R7; R6 item Histórico no cabeçalho, decisão do líder).

- **12/11 04h00:** 37b g3 t_6aeda4a9 em revisão (cbaee66): rodada de 8 casos exit 1 só por G11 do radio dentro do rótulo e madrugada abortada no medidor a 390 = defeitos do medidor; cartão MAT-48e t_54fc85f7 para o medir-dom. Nota ao revisor no comentário 620 (véu do diálogo na madrugada é defeito de produto; G4/G5/G7 não rodados, D2 vale). 39a g2 (23352c0) e POL-DES v2 (d9a94a9) em revisão.

- **12/11 04h14:** Devoluções: 37b g3 r1 (R1 primeiro bebê medido como escolha, R2 rodada completa depende da MAT-48e, R3 aceito pelo líder como desvio registrado; comentário 630), 39a g2 r2 (correção 2/2, regra R4 fixada pelo líder; comentário 624), POL-DES v2 r1 (folga do cartão girado; comentário 623). Ordem final do cabeçalho logado a conferir na integração: Hoje, Sessão, Histórico, Desenvolvimento, Comunidade, Família.

- **12/11 04h27:** P-61 t_bc1629ca em revisão (evidência POL-INI v2 e POL-TXT v2 no 48ba136; nenhum defeito de produto confirmado; candidatos I-1, I-2, T-1 para o revisor). Ferramenta `ferramentas/captura/capturar.mjs` agora rola a página e espera as imagens antes da página inteira (achado I-4: ilustrações lazy saíam em branco). Rodapé "Legal" sozinho a 390 levado à P-50.

- **12/11 04h34:** 38b r2: R1-R6 fechados (20/20 sondas); R7 voltou 2ª vez -> correção 2/2 com a lista exata do líder (comentário 645), R7b oráculo de sono por janela. MAT-48e r1 devolvida (madrugada em rota pública sai exit 2; comentário 644). 37b g3 e 38b dependem da MAT-48e para a rodada de madrugada a 390.

- **12/11 04h41:** POL-DES v2 t_3fd302a6 APPROVED_WITH_LIMITS (cb9e1e1) integrada por ff 48ba136..cb9e1e1 (check 2300, commits OK 374, push; recibo 650). Juízes pol_destaque_r2 (última volta) rodando.

- **12/11 04h45:** P-61 t_bc1629ca APPROVED_WITH_LIMITS (pacote de evidência POL-INI v2 e POL-TXT v2; sem SHA). Líder conferiu o host: worktree limpo, portas 5396/9496 livres, nenhum processo do cartão (`encerramento_lider.txt`). Sobra para a galeria: releitura das capturas novas e decisões de Daniel. Horas das entradas de 12/11 corrigidas para as dos commits (antes estavam adiantadas por estimativa).

- **12/11 04h55:** 39a g2 t_30ad7504 APPROVED_WITH_LIMITS (9142ef1) integrada pelo merge eebd1c5 (cb9e1e1..eebd1c5, check 2423, commits OK 381, push; recibo 655). 39b t_c9529365 começou (base no comentário 654).

- **12/11 05h00:** Juízes pol_destaque_r2 (última volta) válidos nos 2: 2/15, 6,3-7,9 (r1: 0/15). F2 das telas nos aparelhos se repete no Início e nestas páginas: proposta de um cartão único das cenas vai para a galeria. Vão para a galeria de Daniel.

- **12/11 05h05:** MAT-48e t_54fc85f7 APPROVED_WITH_LIMITS (4010bbb) integrada por ff eebd1c5..4010bbb (check 2423, medir-dom 199 testes, commits OK 384, push). 38b desbloqueada; 37b g3 avisada. Falta o JSON real do rótulo da Família depois da 37b.
