# Organização no itsaplan e no Obsidian normal

Estas ações são parte da execução futura do Hermes. Este documento não é recibo de criação.

## 1. Projeto novo no itsaplan

A imagem em contexto/referencia_itsaplan.png mostra a lista de projetos de um workspace identificado como Oficina, com BreakInv e Investment. O pedido é criar AppMaternidade como projeto independente nesse modelo de organização.

### Procedimento

1. Descubra a instância e a integração já utilizadas. Verifique workspace, identidade e acesso pela ferramenta disponível. A documentação pública do produto não revela o endereço da instância do Daniel.
2. Procure um projeto AppMaternidade já criado durante uma tentativa desta mesma task. Confira descrição e origem antes de reutilizar. Não crie duplicata por causa de uma interrupção.
3. Se não existir, crie AppMaternidade no workspace correspondente à referência. O rótulo Oficina do itsaplan é compatível com a imagem; a proibição de Oficina se refere ao Obsidian. Não confundir esses dois pedidos.
4. Use uma chave livre como MAT, se o sistema exigir e ela estiver disponível. Registre a chave devolvida. Não invente IDs ou URLs, nem trate IDs do JSON deste pacote como IDs do serviço.
5. Configure uma descrição curta: aplicativo Android/iOS de rotina, desenvolvimento e cuidado compartilhado do bebê, com comunidade temática; etapa atual de pesquisa e design docs; web e stack em avaliação.
6. Organize as frentes abaixo usando os recursos existentes na versão instalada. Se ela não oferecer iniciativas/épicos, use grupos ou etiquetas e descreva o mapeamento.
7. Crie as tarefas pertinentes da semente 07_BACKLOG_INICIAL.json, com descrição, dependências, entregável e aceite. O JSON é uma estrutura conceitual: mapeie seus campos para o esquema real da integração, sem enviar como importação não documentada.
8. Releia o projeto criado, registre URL/ID/chave e confirme a associação ao workspace correto.

### Frentes de trabalho

| Frente | Conteúdo |
| --- | --- |
| Descoberta e escopo | Problema, público, concorrentes, hipóteses e MVP |
| Experiência mobile | Navegação, fluxos, registro rápido, acessibilidade |
| Referências e licenças | Quatro repositórios, evidências e limites de reutilização |
| Arquitetura e dados | Stack, modelo, offline, sincronização e permissões |
| Comunidade e conteúdo | Formato, moderação, atividades e revisão editorial |
| Operação e entrega | Custos, privacidade, testes, roadmap e distribuição |

Estados conceituais: Backlog, Pronto, Em andamento, Em revisão, Concluído e Bloqueado. Adapte aos estados reais do projeto, preservando o significado. Não imponha prazos de calendário sem estimativa. Tarefas de implementação futura permanecem em backlog e não disparam executores automaticamente.

Use uma visão de quadro para progresso e uma visão de roadmap/timeline somente se houver utilidade e suporte na instância. Notas/canvas podem resumir decisões e apontar para os Markdown, evitando duplicar textos longos.

### Recibo mínimo

Registrar em 00_Inicio/Registro_Organizacao.md: instância, workspace nome/ID, projeto nome/ID/chave/URL, estados efetivos, IDs das tarefas, diferenças em relação à semente e forma de verificação. Uma captura da lista de projetos e a leitura do projeto constituem evidência útil; capture sem segredos.

A existência de ações, notas ou iniciativas na documentação pública não comprova que a versão instalada tenha todas elas. A descoberta da integração e a leitura do estado real prevalecem.

## 2. Cofre novo no Obsidian normal

### Localização proposta

C:/Projetos/AppMaternidade/docs/AppMaternidade

O diretório final se chama AppMaternidade para que o cofre também tenha esse nome. Ele reúne a documentação viva dentro do projeto, sem manter cópias divergentes. Não crie um cofre dentro de outro cofre. Confira primeiro a estrutura existente.

### Procedimento

1. Identifique o Obsidian normal por executável, perfil de configuração e interface. Diferencie qualquer launcher/perfil denominado Oficina. Não presuma que a associação de obsidian:// esteja ligada à instância correta.
2. No Obsidian normal, crie um cofre novo ou abra a pasta nova como cofre usando o seletor de cofres. Só criar a pasta e escrever Markdown não confirma registro no aplicativo.
3. Preserve os cofres existentes. Não altere diretamente o registro global em execução nem copie plugins, chaves e configurações de outro cofre.
4. Crie uma página inicial e a estrutura abaixo. Use recursos nativos, Markdown e Mermaid. Plugins comunitários e sincronização paga não são necessários para esta task.
5. Abra a página inicial no Obsidian normal e navegue para pelo menos um design doc e um ADR. Registre nome, caminho efetivo, perfil verificado e evidência visual.
6. Use links relativos compatíveis com leitura dos arquivos fora do Obsidian. Links de abertura do Obsidian são complementares aos caminhos, não a única referência.
7. Mantenha os documentos como fonte única de verdade. Se precisar usar outra localização por convenção prévia, documente a relação com o repositório e um processo de sincronização verificável, sem cópia silenciosa em duas direções.

A consulta de preparação encontrou dois registros no arquivo padrão do Obsidian e nenhum AppMaternidade. Esse inventário é apenas uma fotografia e não prova qual launcher estará em uso na execução. Verifique novamente sem expor configurações privadas.

### Estrutura proposta do cofre

| Pasta | Conteúdo |
| --- | --- |
| 00_Inicio | Home, mapa, progresso, registro de organização |
| 01_Produto | Visão, requisitos, concorrentes, escopo/MVP |
| 02_Experiencia | Jornadas, fluxos, telas e estados |
| 03_Arquitetura | Comparação, arquitetura proposta, dados, sincronização |
| 04_Comunidade_Conteudo | Comunidade, moderação e conteúdo/desenvolvimento |
| 05_Privacidade_Operacao | Acesso, dados, custos, operação e qualidade |
| 06_ADRs | Decisões com status explícito |
| 07_Roadmap | Etapas, backlog e questões para Daniel |
| 08_Referencias | Fontes, análise de código e inventário de licenças |
| 09_Evidencias | Capturas pertinentes, resultados de testes e limitações |

O progresso fica ligado na Home. Cada documento deve informar status, data de revisão, responsável, fontes e questões abertas. O registro de organização vincula tarefa do itsaplan, documento e ADR correspondente.

### Git e arquivos locais

Não versionar automaticamente estado de janela, caches, tokens, plugins ou configurações privadas do Obsidian. Definir exclusões adequadas para .obsidian, material temporário e segredos quando a estrutura de documentação for criada. Não alterar regras Git existentes sem leitura. A estrutura pública de docs pode ser preparada separadamente de evidências pessoais.

## 3. Em caso de bloqueio

Continue a pesquisa e prepare documentos/backlog locais. Registre a operação tentada, ferramenta, erro, horário e o que ainda falta. Não declare itsaplan ou Obsidian concluídos sem leitura de confirmação. Peça intervenção apenas para o impedimento específico que realmente exija o usuário; não repita pedidos de autorização já concedida.

## Fontes operacionais

- https://itsaplan.dev/features
- https://itsaplan.dev/features/initiatives
- https://itsaplan.dev/features/notes
- https://help.obsidian.md/manage-vaults
- https://help.obsidian.md/uri

Consultadas em 22/10/2026. A estrutura e o procedimento acima são propostas para este projeto; os recursos de produto são os descritos nas fontes.

