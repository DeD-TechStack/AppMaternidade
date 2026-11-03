---
tipo: analise
status: rascunho
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
fontes_principais:
  - 08_Referencias/Repositorios/Finnberry.md
  - 08_Referencias/Repositorios/Baby_Buddy.md
  - 08_Referencias/Repositorios/Sprout_Track.md
  - 08_Referencias/Repositorios/Bebbo.md
  - 09_Evidencias/Execucao_Referencias/
---

# Análise dos repositórios de referência

Síntese das quatro fichas. Os detalhes, os permalinks por linha e as classes de evidência estão em cada ficha. Esta nota compara os quatro projetos e diz o que o AppMaternidade leva de cada um.

**Regra geral:** nenhum código, texto, imagem ou marca dos quatro projetos foi copiado. Só conceitos entram, implementados do zero ([Licenças e fontes](Licencas_e_Fontes.md)).

## 1. Identificação

| Projeto | Branch e commit | Data do commit | Licença raiz | Atividade | Stack | Ficha |
| --- | --- | --- | --- | --- | --- | --- |
| Finnberry | `main` `5e17b1a71e10735f0b6aaa22996ce37349d9402c` | 30/01/2026 | MIT | 104 commits entre 25 e 30/01/2026; nenhum depois | Next.js 15, tRPC (RC), Prisma, NextAuth (beta), Supabase Realtime; só web | [Finnberry](Repositorios/Finnberry.md) |
| Baby Buddy | `master` `09629cf633cf3a2059a21ade4cea7ea4d846422f` | 12/10/2026 | BSD-2-Clause | 2.013 commits; ativo | Django 5.2, DRF, SQLite/PostgreSQL; web renderizada no servidor | [Baby Buddy](Repositorios/Baby_Buddy.md) |
| Sprout Track | `main` `eb26949461bd0455cb8d6137dc5bc417a02adcf9` | 12/10/2026 | Própria: não comercial e compartilhamento igual | 1.982 commits; ativo | Next.js 16, Prisma 7, SQLite/PostgreSQL; casca Capacitor em outro repositório | [Sprout Track](Repositorios/Sprout_Track.md) |
| Bebbo (UNICEF) | `main` `5ec8c89198368638c8111b80c6159cfb12f5e9ad` | 15/09/2026 | GPL-3.0 | 10.987 commits; nos últimos 12 meses, 201 de 203 de uma pessoa | React Native 0.78, Realm 20, Firebase; app Android e iOS | [Bebbo](Repositorios/Bebbo.md) |

Os quatro commits são os mesmos da fotografia do pacote da task (`03_REPOSITORIOS_REFERENCIA.md`).

## 2. O que foi executado de verdade

| Projeto | Instalação | Testes | App rodando | Não executado e por quê |
| --- | --- | --- | --- | --- |
| Finnberry | `pnpm install` e `prisma generate` [EXEC] | 613 testes unitários e de integração, com Prisma simulado [EXEC] | Não. Só o schema aplicado num PostgreSQL local descartável | Servidor, E2E e chat: a segunda rodada passou a só ler código |
| Baby Buddy | venv e `pip install` [EXEC] | 528 testes mais 1 isolado, todos passaram [EXEC] | Sim, `runserver` em 127.0.0.1 com dados fictícios | Gunicorn, PostgreSQL e DEBUG=False |
| Sprout Track | `npm ci`, Prisma e seed [EXEC] | 1.753 de 1.755 testes passaram; as 2 falhas são de caminho do Windows [EXEC] | Sim, `next dev` em 127.0.0.1 com dados fictícios | Build, Docker, push e a casca nativa |
| Bebbo | `npm ci` [EXEC] | Nenhum teste existe; `tsc` com 154 erros [EXEC] | Não | Build Android e iOS: faltam SDK, macOS e arquivos de ambiente fora do repositório |

**Como a execução mudou no meio do caminho:**

1. **Primeira rodada.** Na execução do Baby Buddy e do Sprout Track, os subagentes também testaram acesso entre contas fictícias.
2. **Bloqueio do provedor.** As análises do Finnberry, do Sprout Track e do Baby Buddy foram interrompidas pelo filtro de conteúdo do provedor.
3. **Regra adotada depois disso:** nada de requisições que testem autorização. O isolamento por família passou a ser descrito só pela leitura do código, como pergunta de auditoria.
4. **Registros já feitos.** Os registros daqueles testes ficam no disco, fora do Git, até a decisão D7 ([Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)).

Detalhes em [Progresso](../00_Inicio/Progresso.md).

## 3. Comparação por tema

| Tema | Finnberry | Baby Buddy | Sprout Track | Bebbo |
| --- | --- | --- | --- | --- |
| Família e papéis | Família com 4 papéis; convite por e-mail com validade de 7 dias | Não existe família; permissão por tipo de registro, valendo para a instalação inteira | Família, cuidadores com PIN e papel admin ou member | Não há pessoas; um aparelho por família |
| Autoria dos registros | Não existe | Não existe | Um cuidador por registro (`caretakerId`) | Não se aplica |
| Sessão em andamento (timer) | Derivada do início, guardada no aparelho (`localStorage`) | No servidor, derivada do início; parar apaga; a checagem de dono não cobre reiniciar | No servidor, **uma por bebê garantida no banco**; pausa e acumulação por lado | Não existe |
| Offline | Não há fila nem cache persistente | Não há | O service worker não faz cache; não há fila. A documentação diz o contrário | Dados só locais; conteúdo embutido, com sincronização incremental e retirada |
| Validações de domínio | Schemas Zod | Boas regras: nada no futuro, início antes do fim, até 24 h, sem sobreposição; sem idempotência | Sessão única por bebê; outras não analisadas | Não analisadas |
| Fuso e "dia" | "Hoje" calculado no servidor | UTC no banco; fuso só por sessão; regras de dia diferentes entre telas | Utilitários de fuso no servidor, não analisados | Relógio do aparelho |
| Isolamento entre famílias | Perguntas de auditoria sobre o escopo das rotas | Inexistente por desenho (uma instalação por casa) | Regra "não confiar na família do cliente" e helper central; `familyId` opcional como pergunta de auditoria | Não se aplica: nada no servidor |
| Tummy time | Atividade com timer, sem meta | Registro com timer; total do dia no painel | `TUMMY_TIME` com timer e média diária no relatório, sem meta | Só conteúdo (atividades, marco, artigo) |
| Desenvolvimento e conteúdo | Não há conteúdo | Não há | Não há conteúdo educativo | Conteúdo por idade, faixas com margem, idade corrigida; marcos com percentual e rótulo "Pending" |
| Exportação e exclusão | Exclusão de conta com transferência de titularidade | Exportação por tipo, no admin; sem exclusão por família | Exportação declarada; encerramento de conta | Backup cifrado com chave do build; a importação substitui tudo |
| Testes e qualidade | 613 testes; dependências em RC e beta | 528 testes; CI de Python 3.10 a 3.14 | 1.755 testes; regra de teste por mudança | Sem testes; CI desligada; 97 alertas no `npm audit` |
| pt-BR | Não analisado na ficha | Sim, parcial (37 textos vazios e 70 pendentes de revisão) | Sim | Não |
| Mobile nativo | Não | Apps companheiros em outros repositórios (não analisados) | Casca WebView (Capacitor) | Sim, React Native |

## 4. Aprendizados para o AppMaternidade

| Aprendizado | De onde vem | Onde entrou |
| --- | --- | --- |
| Sessão em andamento derivada do horário de início, nunca de um contador | Os três com timer | [ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md); [Offline](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) |
| Sessões paralelas tratadas sem perder a intenção feita offline. O Sprout Track impede a segunda sessão no banco (`@unique`) e responde 409. Offline isso não dá: o AppMaternidade aceita as duas e mostra "duas sessões em andamento", com "unir" ou "encerrar uma". No banco ficam garantidos os ids do registro e da operação, o que evita duplicata por reenvio | Sprout Track; Baby Buddy (corrida na conversão) | [Offline, seção 7.2](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md); [Modelo de dados](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) |
| "Iniciado por" e "encerrado por" separados; encerrar não é apagar | Lacuna nos quatro | Modelo de dados; Q-03 |
| Regras de domínio aplicadas no servidor, com id de operação para reenvio. Fim antes do início é recusado. Horário no futuro, duração longa e sobreposição viram aviso, sem bloqueio, porque o registro offline já aconteceu | Baby Buddy (lá, as regras bloqueiam) | [Offline, seção 8](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md); Q-02 |
| Família e vínculo como autoridade em toda operação; nunca confiar na família enviada pelo cliente; conferir o escopo pelo SQL gerado | Sprout Track (regra e lição documentada); Baby Buddy (o que acontece sem família) | [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md); Q-06 |
| `familyId` obrigatório desde o início, sem estado "legado nulo" | Sprout Track | Modelo de dados, invariantes |
| Convite com validade curta e de uso único; nunca um token permanente num QR | Finnberry (convite de 7 dias); Baby Buddy (QR com token fixo) | Modelo de dados |
| Exclusão de conta com transferência de titularidade e exclusão da família quando não sobra ninguém | Finnberry | [Privacidade e segurança, seção 7](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) |
| Regra única para decidir a que dia um registro pertence, com o fuso gravado no evento | Baby Buddy (regras diferentes); Finnberry ("hoje" no servidor) | ADR-004; Q-09 |
| Offline declarado só quando há fila e banco local; PWA não basta | Sprout Track (documentação sem código correspondente) | ADR-004; [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) |
| Conteúdo embutido, sincronização incremental e **lista de retirada processada no aparelho** | Bebbo | [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md); [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) |
| Banco local cifrado; exportação sem chave igual para todas as instalações; nada de texto livre no analytics | Bebbo (o contrário) | Privacidade e segurança, seção 9 |
| Marcos sem percentual nem "Pending" | Bebbo (o contrário) | Desenvolvimento e conteúdo, seção 6 |
| Modo de tela para madrugada, com botões grandes e blocos de "há quanto tempo" | Sprout Track (Nursery) | [Fluxos e telas](../02_Experiencia/Fluxos_e_Telas.md) |
| Fila de saída (outbox) para eventos e notificações, com id para descartar repetições | Baby Buddy (webhooks); Bebbo (analytics) | [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md) |
| CI com tipos e testes desde a fundação, rodando também no Windows | Bebbo (sem testes); Sprout Track (falhas de caminho) | Qualidade e validação |
| Não depender de bibliotecas descontinuadas: Realm Sync e `react-native-push-notification` arquivado | Bebbo | [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) |

## 5. O que nenhum dos quatro resolve

- **Escrita offline com vários cuidadores e sincronização.** O Bebbo é offline, mas de um aparelho só. Os outros três dependem do servidor.
- **Revogação com aparelho offline,** incluindo a limpeza do que já foi baixado.
- **Autoria completa:** quem criou, alterou, iniciou e encerrou.
- **Comunidade e moderação:** nenhum dos quatro tem.
- **Conteúdo com autor, revisor, fontes e versão visíveis.** O Bebbo tem campos editoriais, mas o app não mostra revisão profissional.
- **Exportação e exclusão por família, com propagação para backups.**

Essas lacunas são o núcleo do desenho próprio. Estão no [ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md), no [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md), no [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md) e no [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).

## 6. Cenários Q-01 a Q-12

| Cenário | Finnberry | Baby Buddy | Sprout Track | Bebbo |
| --- | --- | --- | --- | --- |
| Q-01 offline | Sem fila | Sem offline | Sem fila nem cache | Funciona, mas só local |
| Q-02 reenvio | Sem id de operação; reenvio cria outro registro | Duplica | Sem id de operação | Fila de eventos sem id |
| Q-03 A inicia, B encerra | B encerra pelo banco; sem autoria; o segundo encerramento sobrescreve | Exige `delete_timer`; perde autoria | Qualquer cuidador encerra; um autor só | Não se aplica |
| Q-04 edição concorrente | Última gravação vence, sem versão | Último PATCH prevalece | Não analisado | Importação substitui tudo |
| Q-05 revogação | Remover membro apaga o vínculo; sem cache offline | Conferida em cada requisição | Lista de tokens revogados no logout | Não se aplica |
| Q-06 outra família | Perguntas de auditoria | Sem família por desenho | Regra central; perguntas de auditoria | Não se aplica |
| Q-07 comunidade | Não existe | Não existe | Não existe | Não existe |
| Q-08 tela bloqueada | Derivado do início | Derivado do início | Derivado dos registros | Sem timers |
| Q-09 fuso | "Hoje" no servidor | Depende do canal | Não analisado | Relógio do aparelho |
| Q-10 notificação | Não há notificações | Sem notificações; webhooks assinados | Push web e nativo | Lembretes locais e push remoto |
| Q-11 moderação | Não existe | Não existe | Não existe | Não existe |
| Q-12 exportar e excluir | Exclusão com transferência; exportação sem interface | Exportação por tipo no admin | Exportação declarada | Backup cifrado; importação substitui |

## 7. Limites desta análise

- **Leitura parcial:** nenhuma ficha leu todas as rotas, telas e componentes linha a linha.
- **Execução local:** feita com dados fictícios, em modo de desenvolvimento. Nenhum app rodou em aparelho móvel.
- **Isolamento sem testes:** os achados de isolamento por família são leitura de código, não testes. A expressão usada é "pergunta de auditoria, não vulnerabilidade demonstrada".
- **Quem escreveu:** as fichas do Finnberry, do Sprout Track e do Bebbo, e esta análise, são do coordenador, porque os subagentes pararam por falta de resposta do provedor. A ficha do Baby Buddy é do subagente, com uma revisão do coordenador por volta das 05:35 nos trechos de autorização.

## Relação com outros documentos

[Licenças e fontes](Licencas_e_Fontes.md) · [Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md) · [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) · [Home](../00_Inicio/Home.md)
