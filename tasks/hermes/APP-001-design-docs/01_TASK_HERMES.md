# APP-001 — Pesquisa, design docs e organização do AppMaternidade

Responsável pela execução: Hermes. Destinatário das decisões de produto: Daniel Macedo Silva.
Workspace: C:/Projetos/AppMaternidade
Repositório: https://github.com/DeD-TechStack/AppMaternidade

## 1. Missão e interpretação do pedido

Investigue o produto e as alternativas técnicas, proponha uma arquitetura coerente e produza documentação suficiente para orientar a próxima etapa de implementação. Crie efetivamente o projeto novo no itsaplan e o cofre novo no Obsidian normal. Trabalhe com os Markdown nesse cofre e mantenha a organização atualizada.

A instrução direta de Daniel para esta etapa é preparar os design docs. O resumo original da outra IA também menciona construir uma base funcional. Preserve essa intenção como etapa seguinte do roadmap; não interprete o resumo como aprovação de stack nem como ordem para implementar o aplicativo inteiro nesta task.

Nesta execução, pode examinar código, rodar referências isoladas com dados fictícios quando viável e realizar investigação técnica proporcional a uma dúvida concreta. O entregável principal é pesquisa, decisões propostas, design docs e organização. Scaffold de produto, serviços pagos, publicação e desenvolvimento de MVP não são pré-requisitos para concluir esta etapa.

## 2. Premissas do produto

O nome AppMaternidade é provisório. O produto inclui mães, pais e outros cuidadores autorizados. O ponto de partida é a rotina após o nascimento; gestação e faixa etária máxima precisam de proposta explícita.

Os quatro pilares são:

1. Rotina: sono, sonecas, mamadas, alimentação, fraldas e registros rápidos com histórico compreensível.
2. Desenvolvimento: tummy time, atividades por fase e conteúdo educativo com origem e revisão identificáveis.
3. Comunidade: conversas por assunto e, se fizer sentido, por fase do bebê.
4. Cuidado compartilhado: convites, permissões, autoria dos registros, atividades em andamento e passagem de cuidados.

A hipótese de valor é conectar esses pilares sem aumentar a carga mental dos cuidadores. Não reduzir a comunidade a uma tela futura sem modelo, nem transformar desenvolvimento em metas competitivas.

### Requisitos fixos

- Android e iOS.
- Registros essenciais utilizáveis sem conexão; definir precisamente o alcance do modo offline.
- Recuperação de registros e sessões após encerrar e reabrir o aplicativo.
- Separação entre famílias em consultas, escritas, arquivos, sincronização e notificações.
- Acesso à comunidade não concede acesso à rotina privada de uma criança.
- Compartilhamento de dados privados na comunidade exige ação consciente e prévia clara.
- Tummy time, participação de vários cuidadores e comunidade constam do planejamento.
- itsaplan: projeto separado.
- Obsidian: cofre novo no aplicativo/perfil normal, não no ambiente Oficina.

### Decisões abertas

Framework e linguagem mobile; backend; banco; autenticação; armazenamento local; sincronização; notificações; mídia; busca; moderação; infraestrutura; distribuição; monetização; escopo da web. Não assumir que as interfaces precisam ser iguais nem que todo o código será compartilhado.

Compare fórum assíncrono, salas em tempo real e evolução por etapas. Recomendar começar com tópicos/respostas é aceitável se fundamentado em utilidade e operação; não remover a possibilidade de rodas de conversa sem registrá-la como decisão.

## 3. Sequência de execução

### D0 — Recuperar contexto e criar checkpoint

Leia este pacote e eventuais AGENTS.md aplicáveis. Inspecione Git, arquivos existentes e alterações de terceiros. Confira o remoto antes de qualquer operação Git. Em 22/10/2026 o repositório estava público e sem commits; isso é uma fotografia, não garantia do estado atual.

Crie ou atualize um registro de progresso dentro do projeto antes de iniciar tarefas longas. Registre etapa, arquivos produzidos, fontes, decisões, bloqueios e próxima ação concreta. Preserve trabalho existente. Não altere Investment, BreakInv, GLOBAL ou configurações de outros projetos.

Descubra as ferramentas já configuradas para itsaplan e Obsidian. Use integrações disponíveis e suas instruções reais. Não invente URLs locais, credenciais, IDs, comandos de importação ou endpoints. A ausência de um conector não prova indisponibilidade do aplicativo: verifique os meios já autorizados.

### D1 — Organizar o projeto e os documentos

Siga 04_ITSAPLAN_E_OBSIDIAN.md. Crie um projeto próprio chamado AppMaternidade no workspace correto do itsaplan. Reutilize uma criação parcial desta mesma task se ela já existir, evitando duplicatas.

Crie um cofre novo e registre-o no Obsidian normal. A proposta padrão deste pacote é C:/Projetos/AppMaternidade/docs/AppMaternidade, com os Markdown como fonte única de verdade e a pasta final denominada AppMaternidade. Essa localização é uma escolha operacional reversível; adapte somente se houver convenção existente melhor, registrando o caminho efetivo.

Preencha a página inicial, o mapa de documentos, o backlog e os links cruzados. O itsaplan organiza tarefas/estado; o Obsidian concentra os textos completos. Uma pasta de arquivos sem registro/verificação no aplicativo não encerra o requisito de cofre.

### D2 — Pesquisar produto e referências reais

Revise as funcionalidades públicas atuais do Napper e compare Huckleberry, Baby Daybook, Nara Baby, Kinedu, Pathways.org, BabyCenter e Peanut. Para cada afirmação relevante, anote URL, data de consulta, plataforma/versão quando disponível e tipo de evidência. Não confunda alegação de marketing com resultado clínico demonstrado.

A suposta ausência de tummy time no Napper continua uma hipótese. Falta de menção em uma página não comprova ausência no produto. Compare diferenças concretas: quantidade de passos para registrar, colaboração, atividade em andamento, interpretação do histórico, conteúdo por fase, comunidade e moderação.

Analise prioritariamente os quatro repositórios fornecidos. Use 03_REPOSITORIOS_REFERENCIA.md como ponto de partida, atualize branch/commit e leia código relevante, não apenas README. Examine modelos, validações, permissões, endpoints, temporizadores, persistência, sincronização, componentes, testes e configuração de execução.

Classifique cada conclusão como:
- observado em execução;
- confirmado em código no commit indicado;
- declarado em documentação;
- hipótese/inferência ainda não verificada.

Para cada referência, explique o conceito aproveitável, o código potencialmente reutilizável conforme sua licença, a adaptação necessária e o que não deve ser reproduzido. Diferencie licença de código, dependências, imagens, identidade visual e conteúdo educativo. Não execute scripts de instalação de terceiros sem primeiro ler sua finalidade.

Se rodar uma referência, use ambiente isolado, banco e credenciais de teste, sem dados familiares reais e sem interferir em projetos existentes. Registre o que funcionou e o impedimento exato quando não for possível. REA é opcional; para apps proprietários, priorize material e comportamento publicamente acessíveis.

### D3 — Definir produto, navegação e recorte

Proponha personas, jornadas, requisitos funcionais, restrições, critérios de sucesso e recorte de MVP. Rotina, desenvolvimento, comunidade e família precisam aparecer no modelo de produto. Diferencie fundação técnica, MVP utilizável e expansões.

Avalie a navegação Hoje/Rotina, Histórico, Desenvolvimento, Comunidade e Família/Perfil como hipótese. Apresente mapa de telas e fluxos de onboarding, cadastro de bebê, convite, registro rápido, temporizador, correção/exclusão, histórico, postagem/resposta, denúncia/bloqueio e revogação.

Desenhe estados de vazio, carregamento, conexão ausente, sincronização pendente, conflito, permissão negada e erro. Inclua uso com uma mão, baixa luminosidade, fonte ampliada, leitor de tela e recuperação de enganos. Utilize wireframes simples quando ajudarem; não copie identidade visual de concorrentes.

Separe três perguntas sobre web: site público/institucional, painel administrativo/moderação e aplicativo web para cuidadores. Cada uma pode ter resposta e fase diferentes. Uma área administrativa pode ser necessária operacionalmente sem fechar a decisão sobre produto web para famílias.

### D4 — Comparar arquiteturas completas

Use 02_PESQUISA_TECNOLOGIAS.md como pesquisa preliminar, não como decisão. Compare React Native + Expo, Flutter, Kotlin Multiplatform (lógica compartilhada e opção de UI compartilhada) e apps Swift/Kotlin separados. Escolha pelo produto e pela capacidade de manutenção, documentando fatores que poderiam mudar a recomendação.

Apresente pelo menos três combinações completas: mobile + backend + banco remoto + persistência local + protocolo de sincronização + autenticação/permissões + notificações + arquivos + operação. Explore BaaS documental, PostgreSQL gerenciado e API própria com monólito modular. Não acrescente todas as ferramentas encontradas ao mesmo projeto.

Para cada combinação, explique:
- caminho de registro local até confirmação remota;
- comportamento em conflitos, duplicidade e revogação;
- isolamento familiar e separação da comunidade;
- linguagens e conhecimento exigidos;
- desenvolvimento em Windows e acesso à cadeia iOS/macOS;
- testes em Android e iOS, build, assinatura e distribuição;
- esforço de desenvolvimento, manutenção e operação;
- custo de protótipo, lançamento e crescimento;
- dependência do fornecedor, exportação e saída;
- bibliotecas/versões compatíveis efetivamente verificadas.

Evite pontuações numéricas que ocultem suposições. Se usar pesos, declare-os e mostre como a recomendação muda com prioridades diferentes. Apresente uma recomendação provisória, uma alternativa principal e critérios de desempate.

Não acople Flutter a Firebase nem React Native a backend TypeScript por conveniência de apresentação. Essas combinações podem ser comparadas, mas as escolhas mobile e dados devem ter justificativas próprias dentro de um conjunto compatível.

Nomeie o SDK/runtime real de cada combinação. Persistência offline documentada para SDK nativo não deve ser atribuída automaticamente a uma biblioteca JavaScript em React Native. Confirme se a integração exige development build, módulos nativos ou outra configuração, e inclua isso no esforço comparado.

### D5 — Especificar dados, permissões e sincronização

Inclua um modelo lógico inicial com usuário adulto, família/grupo de cuidado, vínculo/permissão, bebê, convite, registro de cuidado, sessão temporizada, atividade/conteúdo, tópico, postagem, resposta, denúncia e ação de moderação. Não transformar toda sugestão em tabela obrigatória; justificar fronteiras.

Defina identidade única de operação, idempotência, autoria, instante observado, instante recebido, fuso de exibição, edição/versionamento e exclusão propagada. Explique tratamento de ordenação, conflitos e relógios divergentes. O servidor precisa conferir autorização atual nas operações recebidas.

Detalhe cinco situações de ponta a ponta:
1. Registro offline, encerramento do app, reabertura e envio posterior sem perda/duplicação.
2. Um cuidador inicia uma sessão e outro encerra; ambos podem também editar.
3. Convite/vínculo revogado enquanto um aparelho está offline.
4. Duas famílias usam simultaneamente o sistema, inclusive anexos e notificações.
5. Um usuário publica na comunidade sem expor automaticamente a rotina privada.

Revogação remota não consegue apagar instantaneamente dados já vistos ou armazenados em aparelho desconectado. Defina limites de cache, política na reconexão, expiração e rejeição de operações sem prometer garantias impossíveis.

Temporizadores devem sobreviver à suspensão sem depender de um contador visual executando continuamente. Modele início/fim/estado e reconciliação. Notificação local, push remoto e sincronização são mecanismos diferentes.

### D6 — Consolidar docs, ADRs e plano de implementação

Produza os documentos de 05_DESIGN_DOCS_E_ADRS.md. Nos ADRs, distinga proposta, aceita, rejeitada e substituída. Apenas uma aprovação real de Daniel pode ser atribuída a Daniel. A recomendação técnica do Hermes deve ser apresentada como tal.

Planeje uma próxima fatia funcional: família/bebê, segundo cuidador, tummy time com histórico e sincronização; uma fatia de tópico/resposta pode validar a separação da comunidade. Especifique critérios dessa implementação futura, sem registrar protótipo ou tela estática como funcionalidade pronta.

Para custos, use premissas de famílias ativas, operações, anexos, retenção, tráfego, builds, e-mails, moderação e suporte. Cite valores atuais e data quando quantificar. Não trate plano gratuito como garantia de produção nem assinatura de assistente pessoal como crédito de API.

Descreva minimização de dados, retenção, exportação/exclusão, backups/restauração, logs sem conteúdo sensível, acesso administrativo e incidentes. Liste as obrigações legais/lojas a verificar em fontes oficiais para o lançamento, sem declarar conformidade apenas com base no documento.

Conteúdo educativo deve ter autoria, fonte, revisão e versão. Estimativas de sono precisam de premissas e limites. IA, câmera, wearables e chat ao vivo são hipóteses posteriores até haver utilidade e viabilidade demonstradas.

### D7 — Revisar e entregar

Verifique links, consistência de nomes/IDs, rastreabilidade dos requisitos, completude dos documentos e coerência entre backlog e roadmap. Atualize o itsaplan conforme trabalho efetivamente feito e registre checkpoint final.

Entregue um relatório seguindo 09_MODELO_RELATORIO_FINAL.md, com link real do projeto, caminho real do cofre, documentos, recomendação, alternativas, lacunas e perguntas de decisão. Confira a lista de aceite. Se uma integração estiver bloqueada, descreva o erro real e entregue o restante; classifique a tarefa como parcial, sem fingir que a integração foi criada.

## 4. Autonomia e limites

A criação do projeto itsaplan e do cofre normal faz parte desta tarefa. Não peça confirmação novamente para ações rotineiras já autorizadas. Prossiga com hipóteses reversíveis documentadas para questões menores.

Respeite aprovações técnicas exigidas pelo ambiente. Não realize contratações, publique o app, envie convites/mensagens a terceiros, altere projetos existentes nem inicie automaticamente outros agentes configurados no itsaplan como efeito colateral desta organização.

Não copie configurações, segredos ou automações de Investment/BreakInv para “ganhar tempo”. Não leve arquivos pessoais, contexto original ou capturas privadas a um repositório público automaticamente. A versão pública da documentação, se solicitada, deve ser preparada com revisão do conteúdo.

Questões para Daniel devem ser poucas, concretas e acompanhadas da recomendação e de suas consequências. A falta de uma decisão de produto não impede terminar a análise e deixar os ADRs como propostas.

