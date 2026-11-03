# Critérios de aceite da task APP-001

A conclusão exige evidências de pesquisa, documentos preenchidos e organização efetivamente criada. Uma aprovação de stack por Daniel não é necessária para terminar a análise; recomendações ainda não aprovadas ficam identificadas como propostas.

## A. Contexto e escopo

- [ ] Resumo original lido e a diferença entre design docs atuais e implementação posterior registrada.
- [ ] Android e iOS tratados como requisitos.
- [ ] Web avaliada separando site público, painel operacional e produto para famílias.
- [ ] Rotina, tummy time/desenvolvimento, comunidade e cuidado compartilhado contemplados.
- [ ] Nenhuma tecnologia apresentada como previamente aprovada.

## B. Pesquisa

- [ ] Napper e demais referências de produto comparados com fontes e data.
- [ ] Suposta ausência de tummy time no Napper não afirmada sem evidência suficiente.
- [ ] Quatro repositórios analisados com branch, SHA, licença e arquivos relevantes.
- [ ] Código, conteúdo educativo, imagens e dependências avaliados separadamente para reutilização.
- [ ] Achados distinguem execução observada, código, documentação e hipótese.
- [ ] Limites de execução das referências explicitados, sem testes fictícios.

## C. Arquitetura e design docs

- [ ] Pelo menos três arquiteturas completas comparadas.
- [ ] Alternativas mobile incluem RN/Expo, Flutter, KMP e nativo, com motivo para shortlist.
- [ ] Recomendação provisória, alternativa principal e condições de mudança documentadas.
- [ ] Fluxo iOS partindo do ambiente Windows, infraestrutura Apple e testes em aparelhos tratados.
- [ ] Modelo, matriz de permissões e fronteiras de domínio consistentes.
- [ ] Offline, conflitos, duplicidade, exclusão, revogação e relógios/fusos especificados.
- [ ] Temporizadores não dependem de execução contínua em segundo plano.
- [ ] Comunidade inclui denúncias, bloqueio, moderação e separação da rotina privada.
- [ ] Tummy time e conteúdo educativo possuem ciclo editorial e limites definidos.
- [ ] Custos possuem premissas e fontes datadas; cotas gratuitas não são tratadas como permanentes.
- [ ] ADRs e roadmap preenchidos, com decisão proposta diferente de aprovação efetiva.
- [ ] Próxima fatia funcional tem escopo e aceite, identificada como ainda não implementada.

## D. Organização

- [ ] Projeto AppMaternidade criado/reutilizado corretamente no itsaplan.
- [ ] Workspace, chave, URL e ID conferidos por releitura.
- [ ] Tarefas com entregáveis, dependências e estados; implementação futura permanece em backlog.
- [ ] Cofre novo registrado e aberto no Obsidian normal.
- [ ] Caminho e perfil conferidos; ausência de uso do Obsidian Oficina verificada.
- [ ] Home, links e pelo menos um design doc e um ADR navegados no aplicativo.
- [ ] Markdown tem local canônico; não existem duas cópias silenciosamente divergentes.
- [ ] Recibos/checkpoint permitem continuar sem duplicar projeto ou cofre.
- [ ] Outros projetos e cofres preservados.

## E. Relato e revisão

- [ ] Links e referências relativos conferidos; fontes externas com data.
- [ ] Backlog e documentos concordam sobre decisões abertas.
- [ ] Relatório diferencia concluído, parcial, proposta e não testado.
- [ ] Questões para Daniel são poucas, com recomendação e consequências.
- [ ] Nenhuma alegação de implementação/teste sem evidência.

## Cenários que a arquitetura deve resolver

Os resultados abaixo são requisitos para o design e para futuros testes, não testes executados neste pacote.

| ID | Cenário | Resultado esperado a especificar |
| --- | --- | --- |
| Q-01 | Criar registro offline, encerrar e reabrir o app | Registro permanece; estado local/sync é visível |
| Q-02 | Reenviar após timeout ou perda da resposta | Uma intenção não vira duas atividades |
| Q-03 | Cuidador A inicia; B encerra a mesma sessão | Uma sessão coerente, autoria preservada e conflito tratado |
| Q-04 | A e B editam offline o mesmo registro | Política explícita; informação não desaparece silenciosamente |
| Q-05 | Revogar vínculo enquanto aparelho está offline | Novas operações são reavaliadas; limites do cache são honestos |
| Q-06 | Consultar IDs/anexos de outra família | Acesso negado por autoridade do servidor, inclusive canais de sync |
| Q-07 | Publicar/ler comunidade | Sem concessão automática de acesso ao bebê ou à rotina |
| Q-08 | Bloquear tela, suspender ou encerrar durante cronômetro | Duração recuperável a partir de estado persistido |
| Q-09 | Mudar fuso/relógio e atravessar meia-noite | Instantes, duração e agrupamento no histórico têm regra definida |
| Q-10 | Negar notificação ou não receber push | Registro e reconciliação continuam possíveis; UX compreensível |
| Q-11 | Denunciar/bloquear e excluir postagem | Fluxo de moderação e efeito sobre visibilidade definidos |
| Q-12 | Exportar/excluir dados e restaurar backup | Escopo, acesso e propagação descritos, inclusive anexos e caches |

## Como encerrar

Concluído: documentos preenchidos, comparações e decisões propostas consistentes, itsaplan e cofre verificados, relatório entregue.

Parcial: documentos podem estar prontos, mas uma integração obrigatória ou evidência essencial permanece bloqueada. Informar o que falta e o erro concreto. Não substituir “criado” por “planejado”.

Pendente de decisão: a análise está pronta e aguarda escolha de produto/stack; isso não impede considerar a etapa documental entregue. Tarefas futuras de implementação não contam como falhas desta task.

