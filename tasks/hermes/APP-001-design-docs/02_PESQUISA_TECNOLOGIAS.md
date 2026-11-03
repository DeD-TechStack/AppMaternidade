# Pesquisa preliminar de tecnologias

Consulta: 22/10/2026. Status: subsídio para decisão, sem stack aprovada.
Método: documentação oficial e leitura de repositórios; nenhum aplicativo candidato foi implementado ou medido nesta preparação.

## 1. Direção sugerida para a investigação

A recomendação provisória é comparar **React Native + Expo e Flutter como finalistas mobile**, sem descartar Kotlin Multiplatform nem desenvolvimento nativo por pressupostos desatualizados. Para dados, comparar **Firebase/Firestore, PostgreSQL gerenciado com sincronização local explícita e API própria com PostgreSQL**.

Isso é julgamento técnico a validar. A justificativa da shortlist é buscar manutenção viável para equipe pequena e experiência consistente em Android/iOS. O resultado pode mudar com competência real da equipe, orçamento, integrações, testes de offline e viabilidade do fluxo iOS. Não é uma ordem para adotar React, Flutter, Firebase, Supabase ou Java.

## 2. Mobile

| Candidato | Adequação a investigar | Custo/limite a verificar | Quando pode ser preferível |
| --- | --- | --- | --- |
| React Native + Expo / TypeScript | Uma base compartilhada e ferramentas de build/distribuição; módulos para recursos de dispositivo | Compatibilidade dos módulos, mudanças de versão, acessibilidade e comportamento nativo; development builds para integrações | Experiência TypeScript/React e valor operacional do fluxo iniciado em Windows |
| Flutter / Dart | UI consistente, navegação e visualização de histórico em uma base | Aprendizado/manutenção Dart, plugins, acessibilidade, desempenho em aparelhos modestos e toolchain iOS | UI própria e consistência visual forem prioridades e a equipe conseguir sustentar Dart |
| KMP com UI nativa | Domínio/dados compartilhados, interfaces SwiftUI e Compose Android | Duas interfaces e interoperabilidade; capacidade iOS da equipe | Experiência Kotlin e requisitos de plataforma justificarem a divisão |
| KMP + Compose Multiplatform | Compartilhamento também da UI | Avaliar bibliotecas concretas, integrações e experiência iOS, além do status do framework | Competência Kotlin e validação dos recursos essenciais nas duas plataformas |
| Swift/SwiftUI + Kotlin/Compose | Integração direta com cada plataforma | Duas bases, esforço de testes e manutenção | Requisitos nativos fortes compensarem duplicação |

A documentação do React Native recomenda um framework para apps novos, citando Expo; isso sustenta considerar Expo dentro da opção React Native, não prova que essa opção seja a melhor para este produto. [M01](https://reactnative.dev/docs/environment-setup)

A documentação Kotlin distingue KMP de Compose Multiplatform e classifica Android/iOS como estáveis em ambos. Não eliminar a alternativa sob o argumento genérico de “iOS experimental”. Maturidade de cada dependência ainda precisa ser verificada. [M04](https://kotlinlang.org/docs/multiplatform/supported-platforms.html)

### Windows e iOS

Expo documenta EAS Build em nuvem e EAS Submit a partir de Windows, com teste em iPhone físico usando Expo Go ou development build. Isso não cria um Xcode local em Windows. [M02](https://docs.expo.dev/faq/)

Flutter e KMP documentam a infraestrutura Xcode/macOS na etapa iOS. Uma equipe em Windows pode planejar Mac remoto/CI, mas precisa resolver também depuração, assinatura e teste em aparelho. Produzir um arquivo de instalação sem testar iOS não valida o requisito. [M03](https://docs.flutter.dev/platform-integration/ios/setup), [M05](https://kotlinlang.org/docs/multiplatform/quickstart.html)

### Notificações e segundo plano

Separar lembretes locais, push remoto e sincronização. No Expo, notificações locais e tokens nativos/Expo são recursos documentados; push remoto no Expo Go Android exige development build desde SDK 53. Conferir os recursos na build real, não apenas no ambiente de demonstração. [M07](https://docs.expo.dev/versions/latest/sdk/notifications/)

Tarefas periódicas de background não são relógios de execução garantida. Expo usa WorkManager no Android, com intervalo mínimo de 15 minutos, e BGTaskScheduler no iOS, que decide o momento de execução; esse mecanismo iOS exige aparelho físico para avaliação. A duração de uma sessão deve ser reconstruída de dados persistidos. [M08](https://docs.expo.dev/versions/latest/sdk/background-task/)

## 3. Três arquiteturas completas para aprofundar

Os conjuntos abaixo são exemplos coerentes para comparação, não escolhas aprovadas nem limitações de compatibilidade. Hermes deve verificar SDKs e versões antes de recomendar o conjunto final.

| Camada | A — BaaS documental | B — PostgreSQL gerenciado | C — API própria modular |
| --- | --- | --- | --- |
| Mobile ilustrativo | Flutter + integração Firebase compatível | RN + Expo development build | RN + Expo development build |
| Alternativa mobile a comparar | RN + integração nativa Firebase; validar runtime | Flutter com bibliotecas locais equivalentes | Flutter se o critério de UI/manutenção favorecer |
| Linguagem mobile | Dart; TypeScript na alternativa RN | TypeScript; Dart na alternativa Flutter | TypeScript; Dart na alternativa Flutter |
| Identidade | Firebase Auth | Supabase Auth | Provedor/implementação de autenticação explicitamente selecionado |
| Banco remoto | Firestore | PostgreSQL via Supabase | PostgreSQL |
| Persistência local | Cache persistente do SDK realmente adotado; política de dados disponíveis | SQLite | SQLite |
| Sincronização | SDK Firestore + política de domínio para conflitos e operações rejeitadas | Uma estratégia: outbox/API própria OU camada como PowerSync | Outbox + protocolo/API de sincronização próprio |
| Operações privilegiadas | Functions/backend com autorização própria | API/RPC/Functions para comandos sensíveis | Serviços do monólito |
| Mídia | Cloud Storage com regras coerentes | Supabase Storage com política por escopo | Armazenamento de objetos com autorização |
| Push | Entrega por FCM/APNs; configuração validada para cada plataforma | APNs/FCM diretamente ou serviço compatível escolhido | APNs/FCM via processo de tarefas do projeto |
| Administração/comunidade | Interface de moderação a projetar | Interface de moderação e conteúdo a projetar | Administração do framework escolhido ou painel mínimo |
| Operação | Serviços gerenciados e observabilidade proporcional | Banco gerenciado + operação da sincronização escolhida | API, banco, backups, logs e tarefas sob responsabilidade da equipe |

Para C, comparar NestJS/TypeScript, Django/Python e Spring Boot/Java, escolhendo um por requisitos, equipe e operação. Não compor os três. A indicação desses frameworks é uma pauta de avaliação, não uma auditoria realizada nesta preparação. Não há motivo demonstrado para microsserviços, vários bancos principais ou uma plataforma de IA no MVP.

### A — O que Firestore realmente entrega

A documentação descreve persistência dos dados usados pelo app, leitura/escrita sobre cache e sincronização ao reconectar. Alterações no mesmo documento seguem a política de última escrita; cache não equivale a todo o histórico disponível no aparelho. [B01](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

Transações falham offline, enquanto escritas em lote têm comportamento diferente. Portanto, “A iniciou, B encerrou e A editou offline” ainda exige uma política de domínio e de apresentação de conflitos. [B02](https://firebase.google.com/docs/firestore/manage-data/transactions)

As garantias documentadas para SDKs Android/Apple não se transferem automaticamente a qualquer biblioteca JavaScript executada em React Native. Expo distingue Firebase JS SDK e React Native Firebase. Hermes deve nomear o SDK/runtime exato, validar persistência após matar o processo e explicar o uso de development builds quando necessário. [M11](https://docs.expo.dev/guides/using-firebase/)

Operações feitas por bibliotecas de servidor precisam de autorização no próprio backend; não presumir que as regras dos clientes protegem esses caminhos. [B03](https://firebase.google.com/docs/firestore/security/rules-conditions)

### B — Realtime não é protocolo offline

O catálogo oficial Supabase apresenta PowerSync como camada PostgreSQL–SQLite com fila de upload e resolução de conflitos no backend. É uma integração candidata; usar Supabase sozinho não comprova essa capacidade. [B06](https://supabase.com/partners/catalog/powersync)

PowerSync distingue filtros de download e autorização de upload: Sync Streams controlam dados enviados ao cliente, enquanto escritas devem passar pelas regras do backend/RLS. Conferir ambos os caminhos e a política de remoção de dados do cache após revogação. [B07](https://docs.powersync.com/integrations/supabase/rls-and-sync-streams)

A documentação Supabase alerta que informações de associação em JWT podem permanecer antigas até renovação. Avaliar vínculo vigente no servidor nas operações sensíveis, em vez de tratar a lista antiga de famílias do token como autorização permanente. [B05](https://supabase.com/docs/guides/database/postgres/row-level-security)

A decisão é entre protocolo próprio e uma camada escolhida, após comparar custo e manutenção. Não adicionar PowerSync, outro motor de sync e um segundo outbox sem motivo documentado. Licença e condições de operação de cada componente devem ser conferidas no momento da escolha.

### C — Controle tem custo de manutenção

Uma API própria permite regras de domínio e interfaces explícitas, mas a equipe assume sincronização, autorização, implantação, backups, observabilidade e atualizações. PostgreSQL oferece níveis de isolamento; o nível padrão e um upsert não resolvem sozinhos as intenções concorrentes de dois cuidadores. [B10](https://www.postgresql.org/docs/current/transaction-iso.html)

Essa alternativa vence se o controle ou a experiência operacional da equipe justificar o trabalho adicional. Não escolhê-la apenas porque Daniel tem projetos em Java.

## 4. Critérios para o desempate

A avaliação deve usar os cenários Q-01 a Q-12 de 06_CRITERIOS_DE_ACEITE.md. Nesta etapa, especifique o teste, a entrada, o comportamento esperado e a evidência necessária. Uma prova isolada pode esclarecer uma dúvida concreta; criar o aplicativo inteiro não é uma obrigação disfarçada para concluir os docs.

Prioridades sugeridas, sujeitas a discussão:

1. Integridade e recuperação dos registros offline.
2. Autorização e separação entre famílias/comunidade.
3. Experiência de registro e histórico em Android/iOS.
4. Viabilidade de construir, depurar e testar iOS desde o ambiente disponível.
5. Esforço da equipe e manutenção das dependências.
6. Operação e custo total, incluindo moderação.
7. Possibilidade de exportar dados e substituir fornecedores.
8. Papel efetivamente necessário da web.

A arquitetura offline deve tratar armazenamento local, filas e conflitos explicitamente, como também orienta o guia Android. [M06](https://developer.android.com/topic/architecture/data-layer/offline-first)

## 5. Custos: fotografia de consulta

Os valores seguintes foram consultados em 22/10/2026, em USD, sem conversão cambial, impostos ou promessa de permanência. Não constituem orçamento total nem autorização de contratação.

| Item | Valor/limite exibido | Implicação |
| --- | --- | --- |
| Expo EAS Free | 15 builds Android + 15 iOS; fila de baixa prioridade | Avaliar se a frequência de builds cabe no limite vigente |
| Expo EAS Starter | US$ 19/mês + uso adicional | Serviço opcional; diferenciar custo de EAS do framework |
| Apple Developer Program | US$ 99 por ano; preço local pode variar | Planejar distribuição/assinatura, sem confundir com todo teste local |
| Supabase Pro | A partir de US$ 25/mês | Verificar banco, tráfego, autenticação e excedentes |
| PowerSync Pro | A partir de US$ 49/mês | Se combinado com Supabase, soma outra base e unidades de consumo |

Fontes: [M09](https://expo.dev/pricing), [M10](https://developer.apple.com/programs/enroll/), [B08](https://supabase.com/pricing), [B09](https://powersync.com/pricing).

Supabase e PowerSync informam pausa/desativação por inatividade no gratuito. Para Firestore, calcular leituras/escritas, índices, armazenamento, tráfego e listeners, inclusive reconexões; não estimar apenas pelo número de usuários. [B04](https://firebase.google.com/docs/firestore/pricing)

O orçamento ainda precisa incluir aparelhos/infraestrutura Apple, hospedagem quando própria, arquivos, backups, e-mails, domínio, observabilidade, suporte, moderação e eventuais taxas de loja. Preço de APIs de IA só entra se houver uma funcionalidade justificada. Assinaturas pessoais não devem ser lançadas como créditos gratuitos do aplicativo.

## 6. Web e recomendação final esperada

Web deve ser analisada em três recortes: site público, painel administrativo/moderação e aplicativo de cuidadores. Suportar web tecnicamente não implica ter demanda nem aprovar esse escopo.

Recomendação preliminar deste consultor: aprofundar RN/Expo e Flutter em mobile; comparar o caminho relacional com Firestore usando os mesmos cenários de integridade; manter API própria como alternativa quando controle justificar operação. A decisão final do Hermes deve nomear um conjunto compatível, sua alternativa principal, custos, lacunas e os fatos que fariam mudar de ideia.

