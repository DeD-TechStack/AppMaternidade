# Repositórios de referência — verificação preliminar

Consulta: 22/10/2026. Os quatro repositórios estavam acessíveis, públicos e não arquivados. Foram lidos metadados, árvores, licenças raiz, READMEs e trechos de implementação. Nenhum deles foi clonado, instalado ou executado durante esta preparação.

## Fotografia dos commits analisados

| Repositório | Branch | Commit | Data do commit | Licença raiz |
| --- | --- | --- | --- | --- |
| [Finnberry](https://github.com/bckenstler/finnberry) | main | 5e17b1a71e10735f0b6aaa22996ce37349d9402c | 2026-01-30 | [MIT](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/LICENSE) |
| [Baby Buddy](https://github.com/babybuddy/babybuddy) | master | 09629cf633cf3a2059a21ade4cea7ea4d846422f | 2026-10-12 | [BSD-2-Clause](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/LICENSE) |
| [Sprout Track](https://github.com/Oak-and-Sprout/sprout-track) | main | eb26949461bd0455cb8d6137dc5bc417a02adcf9 | 2026-10-12 | [Licença própria Sprout Track: Non-Commercial + Share-Alike](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md) |
| [Bebbo — UNICEF](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile) | main | 5ec8c89198368638c8111b80c6159cfb12f5e9ad | 2026-09-15 | [GPL-3.0](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/LICENSE) |

As datas são dos commits analisados; não são datas de publicação do relatório nem necessariamente a última atividade em todas as branches. Revalidar ao iniciar a execução e preservar os permalinks usados nas conclusões.

## Finnberry

**Licença:** [MIT](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/LICENSE), lida diretamente no arquivo raiz.

**Stack/evidência:** README declara Next.js, TypeScript, tRPC, Prisma, PostgreSQL/Supabase, NextAuth, Zustand e Turborepo. A leitura confirmou modelos Prisma, middleware tRPC, armazenamento de timers e uso de Realtime. Versões/compatibilidade não foram validadas por instalação. [README no commit](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/README.md).

| Arquivo confirmado | Relevância |
| --- | --- |
| [packages/db/prisma/schema.prisma](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma) | Família, membros, convites, crianças e registros; atividades/sono com início e fim. |
| [packages/api/src/trpc.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts) | Procedimentos autenticados e resolução de família/associação do usuário. |
| [apps/web/src/stores/timer-store.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts) | Zustand com localStorage; duração derivada do instante de início. |
| [apps/web/src/hooks/use-realtime.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts) | Eventos de alteração invalidam consultas, com filtros de contexto. |

**Aprendizado:** Referência útil de domínio, convites e recuperação do temporizador. localStorage para timer e assinatura Realtime não comprovam fila persistente de mutações offline, deduplicação nem reconciliação de conflitos.

**Investigação do Hermes:** Examinar os consumidores de householdProcedure: o trecho lido permite continuar quando não resolve uma família. Conferir quais rotas dependem dessa resolução e seus testes. Isso é uma pergunta de auditoria, não uma vulnerabilidade demonstrada. Filtros de assinatura também precisam ser acompanhados de autorização no banco.

**Reaproveitamento:** Código candidato a reutilização sob MIT, preservando avisos exigidos e verificando dependências/assets. Conceitos de produto podem orientar implementação própria.

## Baby Buddy

**Licença:** [BSD-2-Clause](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/LICENSE), lida diretamente no arquivo raiz.

**Stack/evidência:** Python, Django e Django REST Framework confirmados em requirements/código. O timer de interface lido usa JavaScript/jQuery. README descreve sono, alimentação, fraldas, tummy time e português brasileiro. [README no commit](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/README.md).

| Arquivo confirmado | Relevância |
| --- | --- |
| [core/models.py](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py) | Modelos de cuidados e validações de datas, duração e períodos. |
| [api/permissions.py](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py) | Permissões Django por modelo mapeadas para operações HTTP. |
| [api/views.py](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py) | Viewsets e filtros por criança/data; vários querysets começam com objects.all(). |
| [core/static_src/js/timer.js](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js) | Atualização visual e consulta à API ao voltar o foco. |

**Aprendizado:** Boa referência para regras de domínio, histórico e API. Os trechos lidos não comprovam isolamento SaaS entre famílias independentes; permissões por modelo não são equivalentes a autorização por família/objeto.

**Investigação do Hermes:** Investigar filtros de queryset, permissões efetivas e pressuposto de uma instalação familiar. Verificar validações de períodos e fuso em core/models.py. Testes presentes na árvore não significam testes executados nesta análise.

**Reaproveitamento:** Código candidato sob BSD-2-Clause, observando suas condições. Adaptar o isolamento ao produto pretendido em vez de herdar o modelo operacional sem análise.

## Sprout Track

**Licença:** [Licença própria Sprout Track: Non-Commercial + Share-Alike](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md), lida diretamente no arquivo raiz.

**Stack/evidência:** Next.js, React, TypeScript, Prisma e Tailwind confirmados. O schema lido usa SQLite; package.json contém adaptadores SQLite/PostgreSQL. PWA, Nursery Mode e múltiplas famílias são descritos no README. [README no commit](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/README.md).

| Arquivo confirmado | Relevância |
| --- | --- |
| [prisma/schema.prisma](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma) | Famílias, cuidadores e logs; campos familyId opcionais em partes ligadas à migração. |
| [app/api/utils/family-scope.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts) | resolveFamilyScope usa família autenticada e distingue administrador do sistema. |
| [src/utils/nursery/timerBlocks.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/utils/nursery/timerBlocks.ts) | Deriva estados visuais de cuidados a partir de registros e tempo. |
| [package.json](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/package.json) | Dependências, scripts, testes, adaptadores e envio de web push. |

**Aprendizado:** Referência conceitual de visão diária, botões grandes, uso durante a madrugada e coordenação. Instalação como PWA não demonstra escrita offline confiável ou resolução de conflitos.

**Investigação do Hermes:** Ler public/sw.js e verificar o alcance real do cache. Revisar rotas que usam family-scope e tratamento dos registros legados sem família. Não concluir segurança ou vulnerabilidade a partir de um helper ou campo isolado.

**Reaproveitamento:** A licença raiz restringe uso comercial, inclusive geração de receita direta/indireta, e exige condições de compartilhamento. Não incorporar código ao produto comercial sob suposição de licença permissiva. Estudar conceitos de UX e implementar uma solução própria; eventual reutilização depende de termos compatíveis.

## Bebbo — UNICEF

**Licença:** [GPL-3.0](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/LICENSE), lida diretamente no arquivo raiz.

**Stack/evidência:** React Native 0.78.2, TypeScript, Realm, Redux e módulos Firebase de analytics/mensagens/crash reporting conferidos no package.json. README/scripts indicam RN CLI, sem Expo, e dependência de CMS/API para conteúdo. [README no commit](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/README.md).

| Arquivo confirmado | Relevância |
| --- | --- |
| [package.json](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/package.json) | Dependências mobile, scripts Android/iOS e flavors. |
| [app/database/config/dbConfig.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/config/dbConfig.ts) | Persistência Realm de perfis infantis, medidas e lembretes, com versão/migração. |
| [app/database/config/dataDbConfig.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/config/dataDbConfig.ts) | Banco local de artigos, atividades, desenvolvimento e taxonomias. |
| [app/services/periodicSync.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/periodicSync.ts) | Busca periódica de conteúdo segundo última atualização e faixa etária. |
| [app/services/EventSyncService.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/EventSyncService.ts) | Fila/envio de eventos Firebase Analytics; não é sync de cuidados familiares. |

**Aprendizado:** Referência de localização, personalização, conteúdo por idade e cache editorial. Download de conteúdo e envio de analytics não comprovam compartilhamento de cuidados entre aparelhos nem backend completo para famílias.

**Investigação do Hermes:** Mapear contratos/dependências do CMS, offline de perfis versus conteúdo e manutenção das bibliotecas. A presença de Realm em um projeto existente não é recomendação de tecnologia para um projeto novo.

**Reaproveitamento:** GPL-3.0 é copyleft. Reutilização/distribuição de código derivado exige análise das obrigações e compatibilidade com a distribuição pretendida. Verificar separadamente textos, ilustrações, traduções e marcas.

## Como avançar a análise

Para cada projeto, produzir uma ficha com: versão/commit; fluxo analisado; arquivos envolvidos; comportamento confirmado; comportamento apenas declarado; execução feita ou não; licença de cada material que se pretenda reutilizar; conceito aproveitável; adaptações; riscos e perguntas em aberto.

A seleção não depende de estrelas. Relevância do domínio, legibilidade, validações, manutenção e evidências de execução importam mais para esta tarefa.

Os cenários prioritários são offline após encerramento, ações concorrentes de cuidadores, revogação de acesso, isolamento familiar, separação da comunidade, temporizadores e fusos. Não tratar nomes de arquivos como prova do propósito da implementação: EventSyncService do Bebbo é um exemplo concreto dessa diferença.

Nenhum trecho de código desses projetos foi incluído no pacote. Código, dependências, textos educativos, imagens, fontes, traduções e marcas exigem avaliações separadas. As classificações de licença acima não equivalem a uma aprovação de incorporação de todo o repositório.

