---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-7
adr: ADR-002, ADR-003
fontes_principais:
  - 08_Referencias/Tecnologias/Mobile_e_Plataformas.md (103 fontes, consulta 22/10/2026)
  - 08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md (consulta 22/10/2026)
  - 08_Referencias/Tecnologias/Precos_Datados.md (fotografia de 22/10/2026)
  - tasks/hermes/APP-001-design-docs/02_PESQUISA_TECNOLOGIAS.md (critérios de desempate)
  - https://supabase.com/docs/guides/platform/regions (consulta 22/10/2026)
  - https://docs.powersync.com/integrations/supabase/guide (consulta 22/10/2026)
  - https://docs.powersync.com/resources/feature-status (consulta 22/10/2026)
  - https://docs.powersync.com/client-sdks/advanced/data-encryption (consulta 22/10/2026)
---

# Comparação de arquiteturas

Proposta do Hermes. Nenhuma tecnologia está aprovada e nada foi construído ou medido: as comparações vêm de documentação oficial, de consultas aos registros de pacotes e de inferências marcadas como [HIP]. A decisão fica nos [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md) e [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md), que dependem de Daniel e da prova técnica (MAT-17).

Regras do pacote seguidas aqui:

- Escolher pelo produto e pela manutenção, não por familiaridade, por uso num repositório de referência ou por sugestões anteriores (React Native + Spring Boot e Flutter + Firebase foram citadas antes e não estão aprovadas).
- Não acoplar Flutter a Firebase nem React Native a backend TypeScript por conveniência: mobile e dados têm justificativas próprias.
- Nomear o SDK real de cada combinação. Persistência offline documentada para SDK nativo não vale automaticamente para biblioteca JavaScript em React Native.

## 1. O que a arquitetura precisa resolver

| Necessidade | Onde está especificada |
| --- | --- |
| Registrar sem conexão, sobreviver ao encerramento do app, reenviar sem duplicar | [Offline, sincronização e temporizadores](Offline_Sincronizacao_e_Temporizadores.md), seções 2 a 6 |
| Conflitos explícitos entre cuidadores; nada some sem aviso | Mesmo documento, seção 7 |
| Revogação reavaliada no servidor, com limpeza local | Mesmo documento, seção 11; [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md) |
| Isolamento entre famílias em consultas, sync, arquivos e push | [Modelo de dados e permissões](Modelo_de_Dados_e_Permissoes.md), seção 6 |
| Comunidade sem caminho para a rotina | Mesmo documento, seções 2 e 6 |
| Cronômetro sem processo rodando, visível fora do app | [Offline e temporizadores](Offline_Sincronizacao_e_Temporizadores.md), seção 9 |
| Android e iOS desde um ambiente Windows, sem Mac hoje | [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md), seção 9 |
| Equipe pequena: poucas linguagens, poucos fornecedores, saída possível | Este documento, seção 5 |
| Web em três papéis separados | [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md) |

## 2. Critérios

Prioridades sugeridas no pacote (`02_PESQUISA_TECNOLOGIAS.md`, seção 4), usadas sem pontuação somada:

1. Integridade e recuperação dos registros offline.
2. Autorização e separação entre famílias e comunidade.
3. Experiência de registro e histórico em Android e iOS.
4. Viabilidade de construir, depurar e testar iOS a partir do ambiente disponível.
5. Esforço da equipe e manutenção das dependências.
6. Operação e custo total, incluindo moderação.
7. Exportar dados e substituir fornecedores.
8. Papel efetivamente necessário da web.

## 3. Peças avaliadas e peças descartadas

### Mobile

Cinco alternativas comparadas em [Mobile e plataformas](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md). Versões consultadas nos registros oficiais em 22/10/2026 [EXEC E1 a E8 daquela nota]: Expo SDK 58 (`expo` 58.0.17) com React Native 0.88.0; Flutter 3.47.7 com Dart 3.13.5; Kotlin 2.4.21 e Compose Multiplatform 1.12.2; Xcode 27.1 com Swift 6.4.

| Alternativa | Situação | Motivo principal |
| --- | --- | --- |
| React Native + Expo | Recomendada (ADR-002) | Compila, assina, instala no iPhone e envia ao TestFlight a partir do Windows num fluxo integrado, via EAS Build e EAS Submit (https://docs.expo.dev/faq/). As outras chegam ao TestFlight por CI macOS, com o pipeline montado à parte ([Mobile e plataformas, 2.1](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)). Live Activity no iOS com o pacote oficial `expo-widgets`, sem Swift (https://docs.expo.dev/versions/latest/sdk/widgets/). |
| Flutter | Alternativa principal | Persistência madura (drift) e cronômetro Android pronto no plugin de notificações; compila o iOS só no macOS (https://docs.flutter.dev/platform-integration/ios/setup): sem Mac próprio, por CI macOS e TestFlight. Pede Swift na extensão da Live Activity (https://pub.dev/packages/live_activities). |
| KMP com UI nativa | Condicional | Bom se houver competência em iOS. Tem duas UIs; compila no macOS e, na prática, pede Mac para escrever e testar a UI em Swift [HIP] (https://kotlinlang.org/docs/multiplatform/quickstart.html). |
| KMP + Compose Multiplatform | Fora por ora | Compila no macOS (Mac ou CI); lacunas de acessibilidade documentadas no iOS (https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html). |
| Swift + Kotlin nativos | Fora por ora | Dois apps completos e duas implementações do protocolo offline para uma equipe pequena. |

### Dados e sincronização

| Peça | Situação | Motivo |
| --- | --- | --- |
| Firestore com SDK nativo (React Native Firebase ou FlutterFire) | Conjunto A | Offline por padrão nos SDKs nativos; última escrita vence (https://firebase.google.com/docs/firestore/manage-data/enable-offline). |
| Firebase JS SDK em React Native | Descartado para dados | A tabela oficial de ambientes marca o Firestore em React Native como "except persistence" (https://firebase.google.com/docs/web/environments-js-sdk). |
| PowerSync (PostgreSQL ↔ SQLite) | Conjunto B | Fila local de envio para um endpoint nosso; download por Sync Streams; remoção no aparelho quando o acesso sai (https://docs.powersync.com/handling-writes/writing-client-changes, https://docs.powersync.com/architecture/powersync-protocol). |
| Sincronização própria (outbox e pull por cursor) | Conjunto C | Controle total, mais esforço. |
| ElectricSQL | Descartado sozinho | Só leitura: "does not do write-path sync" (https://electric.ax/docs/sync/guides/writes). |
| Zero | Descartado | "Zero does not support offline writes" (https://zero.rocicorp.dev/docs/connection). |
| Replicache | Descartado | Em modo de manutenção (https://replicache.dev/). |
| Atlas Device Sync (Realm) | Descartado | Encerrado em 30/09/2025 (https://www.mongodb.com/docs/atlas/app-services/sync/device-sync-deprecation/). |
| WatermelonDB, RxDB | Descartados agora | Mais de um ano sem publicação no npm; SQLite de produção só na versão paga, respectivamente (nota de dados, seção 5.4). |

## 4. Três conjuntos completos

Cada conjunto inclui app, banco local, sincronização, servidor, autenticação, arquivos, push, e-mail, site e painel. O mobile aparece com React Native + Expo para comparar só a parte de dados; Flutter funciona nos três com os SDKs equivalentes indicados.

### Conjunto B — PostgreSQL gerenciado + PowerSync + serviço de domínio próprio (recomendado)

| Peça | Escolha e SDK real |
| --- | --- |
| App | React Native 0.88 com Expo SDK 58, TypeScript, development build pelo EAS (Expo Go não serve) |
| Banco local | SQLite gerenciado pelo `@powersync/react-native` 2.3.3 (GA), que usa `@op-engineering/op-sqlite` (suporte marcado como Beta, "production-ready for tested use cases") e permite SQLCipher (https://docs.powersync.com/client-sdks/reference/react-native-and-expo, https://docs.powersync.com/resources/feature-status, https://docs.powersync.com/client-sdks/advanced/data-encryption) |
| Sincronização | PowerSync Cloud, região BR (https://docs.powersync.com/integrations/supabase/guide): download por Sync Streams filtrados pelo vínculo ativo; fila de envio para o serviço de domínio |
| Servidor | Serviço de domínio próprio (monólito modular em container): recebe todas as escritas de cuidado, convites, comunidade, moderação, exportação, exclusão e push |
| Banco remoto | Supabase PostgreSQL na região sa-east-1, São Paulo (https://supabase.com/docs/guides/platform/regions), com esquemas separados por contexto e RLS negando escrita direta dos clientes |
| Autenticação | Supabase Auth com código de uso único por e-mail, enviado por SMTP próprio (o SMTP padrão não serve para produção) |
| Arquivos (depois do MVP) | Supabase Storage com prefixo por família e URLs curtas emitidas pelo serviço |
| Push | FCM e APNs, direto ou pelo Expo Push Service (decisão aberta) |
| Web | Site estático; painel interno web falando com o serviço de domínio |

### Conjunto A — Firebase

| Peça | Escolha e SDK real |
| --- | --- |
| App | React Native + Expo com `@react-native-firebase/*` 27.0.0 (SDK nativo, development build), ou Flutter com FlutterFire (`cloud_firestore` 7.0.0) |
| Banco local e sincronização | Cache persistente do SDK nativo do Firestore; última escrita vence; transações falham offline |
| Servidor | Cloud Functions para convites, conflitos, moderação, EXIF e push |
| Autorização | Regras de segurança com leitura do documento de vínculo; Functions com Admin SDK ignoram as regras e precisam de checagem própria |
| Autenticação, arquivos, push | Firebase Auth, Cloud Storage for Firebase, FCM |
| Web | Site estático; painel próprio |

### Conjunto C — API própria + PostgreSQL gerenciado + sincronização própria

| Peça | Escolha e SDK real |
| --- | --- |
| App | React Native + Expo com `expo-sqlite` 58 (SQLCipher por config plugin) ou `op-sqlite`; Flutter com drift |
| Sincronização | Construída pelo projeto: outbox, envio em lote, pull por cursor, tombstones, purga local na revogação |
| Servidor | Monólito modular em container; PostgreSQL gerenciado (Supabase, Neon, Cloud SQL, RDS ou outro) |
| Autenticação | Biblioteca do framework ou provedor externo |
| Arquivos, push, e-mail, web | Object storage com URLs assinadas; FCM e APNs; provedor de e-mail; site estático e painel |

### Como cada conjunto trata os cenários mais difíceis

| Cenário | Conjunto B (recomendado) | Conjunto A (Firebase) | Conjunto C (API própria) |
| --- | --- | --- | --- |
| Q-02 reenvio sem duplicar | O serviço deduplica pelo id da operação; o PowerSync manda operações com id e exige endpoint idempotente (https://docs.powersync.com/handling-writes/handling-update-conflicts) | Id gerado no aparelho evita duplicar a criação | Construído pelo projeto |
| Q-04 conflito explícito | Implementado no serviço (versão-base, mescla por campo, proposta pendente) | Construir sobre "última escrita vence". Escrita recusada pelas regras é desfeita no cache local [DOC B01 + HIP, nota de dados]; mostrar a versão perdida depois de um reinício do app precisa de prova | Implementado no serviço |
| Q-05 revogação offline | O serviço recusa o envio; o vínculo apagado tira os dados da família dos buckets e o cliente os remove na sincronização seguinte (https://docs.powersync.com/sync/rules/parameter-queries) | Regras negam na reconexão; limpar o cache é código do app | Protocolo próprio responde "acesso encerrado" e o app purga |
| Q-06 isolamento no canal de sync | Duas autoridades a manter coerentes: o serviço (escrita) e os Sync Streams (leitura); testes nos dois | Regras por coleção; Functions precisam da própria checagem | Uma autoridade: o serviço |
| Q-07 comunidade separada | Esquema próprio, fora do sync, sem permissão de banco sobre as tabelas de cuidado | Coleções separadas com regras próprias | Módulo e esquema separados |

## 5. Quadro pelos critérios

Sem pontuação somada. "Forte", "adequado" e "fraco" com o motivo.

| Critério | Conjunto B (recomendado) | Conjunto A (Firebase) | Conjunto C (API própria) |
| --- | --- | --- | --- |
| 1. Integridade offline | **Forte:** SQLite local e fila prontos; endpoint idempotente | **Adequado:** cache do SDK nativo; persistência das escritas pendentes após reinício a confirmar | **Forte se bem construído; risco alto de erro** |
| 2. Autorização e separação | **Adequado:** escrita centralizada no serviço; leitura nos Sync Streams precisa espelhar as regras | **Adequado:** regras por documento; lógica espalhada entre regras e Functions | **Forte:** uma autoridade só |
| 3. Experiência de registro e histórico | **Forte:** leitura local, histórico sem custo de rede | **Adequado:** leitura do cache; histórico longo gera leituras cobradas | **Forte:** leitura local |
| 4. iOS a partir do Windows | Igual nos três: decidido pelo mobile (ADR-002) | Igual | Igual |
| 5. Esforço e manutenção | **Adequado:** construir o serviço de domínio e manter os Sync Streams; dois fornecedores | **Forte no começo, fraco depois:** pouco código inicial; regras e índices crescem | **Fraco:** protocolo e cliente de sync próprios |
| 6. Operação e custo | **Adequado:** custo fixo maior no início (seção 6) | **Forte:** o mais barato nas três escalas | **Adequado:** mais operação própria |
| 7. Exportação e saída | **Adequado:** PostgreSQL portátil; PowerSync tem edição aberta auto-hospedável (licença FSL-1.1-ALv2, que vira Apache-2.0 após dois anos: https://github.com/powersync-ja/powersync-service/blob/main/LICENSE); sair do PowerSync leva ao Conjunto C | **Fraco:** modelo documental e reescrita da camada de dados | **Forte:** tudo padrão |
| 8. Papel da web | **Forte:** PowerSync tem SDK Web GA, se um dia houver app web | **Adequado:** outro SDK na web | **Adequado:** cliente de sync a mais |
| Dados no Brasil | **Forte:** Supabase sa-east-1 e PowerSync região BR | Região em São Paulo a confirmar nesta etapa | Depende do provedor escolhido |

## 6. Custos ilustrativos

Fotografia de 22/10/2026, em USD por mês, sem impostos, incluindo EAS Starter e a anuidade da Apple rateada. Cenários ilustrativos, não previsão de demanda. Premissas em [Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), seção 10.

| Famílias | Conjunto B recomendado, com o serviço de domínio | Conjunto B, só infraestrutura | Conjunto A (Firebase) | Conjunto C (API própria em Cloud Run) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | ~108 a 126 | ~101 | ~27 | ~64 |
| 1.000 | ~128 a 146 | ~121 | ~35 | ~109 |
| 10.000 | ~238 a 298 | ~214 | ~139 | ~202 |

A primeira coluna é a composição canônica do conjunto recomendado ([Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2): soma o container do serviço de domínio aos valores da pesquisa. Nenhuma coluna inclui o PITR (+US$ 100/mês, recomendado em produção) nem a homologação (+US$ 10 a 50/mês). Nessas escalas, a diferença de infraestrutura entre os conjuntos é pequena perto do custo de engenharia, que não foi estimado [HIP].

## 7. Recomendação provisória

**Conjunto B com React Native + Expo.** Justificativa pelas necessidades do app:

1. **O protocolo de escrita é nosso desde o primeiro dia.** Idempotência, conferência do vínculo atual, versão-base, conflitos explícitos e histórico ficam no serviço de domínio, que é o mesmo contrato que o PowerSync exige do endpoint de envio (https://docs.powersync.com/handling-writes/writing-client-changes). Isso atende ADR-004 e ADR-005 sem lutar contra uma política de "última escrita vence".
2. **A parte mais trabalhosa e menos diferenciadora vem pronta:** banco local, fila durável, download parcial por família e remoção no aparelho quando o acesso sai.
3. **Saída planejada:** o esquema PostgreSQL e o serviço são os mesmos do Conjunto C. Se o PowerSync falhar na prova, mudar de preço ou de licença, troca-se só o download e a fila do cliente.
4. **Dados no Brasil:** Supabase em São Paulo e PowerSync na região BR reduzem transferência internacional dos dados de cuidado (análise em [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)).
5. **Mobile:** React Native + Expo fecha o ciclo de iOS a partir do Windows num fluxo integrado e faz a Live Activity sem Swift; justificativa completa no [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md), independente da escolha de dados (PowerSync tem SDK GA também para Flutter).

A linguagem do serviço de domínio é uma decisão separada (ADR-003, seção "Linguagem do serviço"); ela não decorre do uso de React Native.

## 8. Alternativa principal e condições de mudança

| Eixo | Alternativa principal | Muda para ela se |
| --- | --- | --- |
| Dados | Conjunto C (mesmo PostgreSQL e mesmo serviço, sincronização própria) | O PowerSync falhar nas provas P1, P2, P4 ou P5; a revogação não remover os dados do aparelho como documentado; mudar a licença ou o preço; Sync Streams e serviço não puderem ser mantidos coerentes por testes |
| Mobile | Flutter | A equipe passar a ter Mac, ou aceitar CI macOS e Swift na Live Activity, e o desempate da prova favorecer Flutter; `expo-widgets` não atender; acessibilidade com fonte a 200% falhar em React Native; mudança de preço ou condição do EAS |
| Conjunto inteiro | Conjunto A (Firebase) | Prazo de piloto muito curto, aceitando conflitos simplificados e saída difícil; só com decisão explícita de Daniel |

Outros fatores que mudariam a recomendação:

- Exigência de hospedar tudo no Brasil com controle próprio: Conjunto C, ou Conjunto B com PowerSync e Supabase auto-hospedados.
- Entrada de alguém com Swift: KMP com UI nativa vira candidata.
- App web para cuidadores no MVP: reforça React Native e o Conjunto B (SDK Web do PowerSync).
- Escala acima dos limites do plano Pro do PowerSync (3.000 clientes simultâneos e 100 GB, segundo a nota de dados): reavaliar custo do plano Team ou auto-hospedagem.

## 9. O que a prova técnica precisa mostrar

As provas P1 a P9 estão em [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md), seção 7. Para esta comparação, as decisivas são:

- P1 e P2 com o PowerSync e o serviço: fila sobrevive ao encerramento; reenvio não duplica.
- P4: revogação offline remove os dados da família no aparelho ao reconectar.
- P5: Sync Streams e serviço recusam a mesma coisa (testes com ids de outra família nos dois caminhos).
- P6 e P7: `expo-widgets` e o módulo Kotlin do cronômetro funcionam; build de iOS sai do Windows até o TestFlight.
- SQLCipher ativo no build de release (conferir com `PRAGMA cipher_version`, já que a chave pode ser ignorada sem erro quando a biblioteca não está no binário).

## Questões abertas

1. Linguagem do serviço de domínio (ADR-003).
2. Expo Push Service ou FCM e APNs direto.
3. Região do Firestore em São Paulo e preços das regiões do Brasil: não capturados nesta etapa.
4. Divergência na documentação do PowerSync sobre a validade máxima do JWT (60 minutos ou 24 horas): confirmar na prova.

## Limites desta análise

Nada foi instalado, construído ou medido. Comportamentos vêm da documentação oficial ou são inferências [HIP]; versões e preços são de 22/10/2026 e mudam rápido. O custo de engenharia não foi estimado.
