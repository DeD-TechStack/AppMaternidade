---
tipo: adr
id: ADR-008
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-12, MAT-13, MAT-14, MAT-15, MAT-17, MAT-18
---

# ADR-008 — Documentação, operação, custos e caminho de evolução

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- O produto vai ser construído e operado por uma equipe pequena, talvez uma pessoa só no início, com agentes de IA ajudando no desenvolvimento. As decisões precisam continuar legíveis por quem chegar depois, humano ou agente.
- O repositório remoto é público, e o cofre de documentação fica dentro dele (`docs/AppMaternidade`). Nada sensível pode ir para o Git.
- Os dados tratados são, por hipótese, de saúde de criança. Operação descuidada vira incidente ([Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)).
- Nas escalas ilustrativas, o custo de infraestrutura fica abaixo de US$ 350/mês, sem PITR e sem EAS Update. O custo de pessoas e de engenharia domina e não foi levantado ([Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- A pesquisa encontrou fornecedores com risco de mudança: o Realm Device Sync foi encerrado, o Replicache entrou em manutenção, e planos gratuitos pausam por inatividade ([Dados, sincronização e backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)). Toda dependência precisa de saída conhecida.

## Opções consideradas

**Documentação:**

1. **Markdown no repositório**, em cofre Obsidian, com ADRs e evidências; tarefas e estado no itsaplan.
2. Documentos dentro do itsaplan.
3. Wiki externo.

**Operação:**

1. **Serviços gerenciados com planos pagos desde a homologação**, mais um serviço próprio pequeno em container.
2. Auto-hospedar tudo (PostgreSQL, PowerSync Open Edition, serviço) desde o início.
3. Planos gratuitos até o lançamento.

**Evolução:**

1. **Fases com critério de saída e um ADR ou decisão por expansão** ([Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)).
2. Plano fixo de funcionalidades.

## Evidências

- Os planos Free do Supabase e do PowerSync pausam ou desativam após 1 semana sem uso. O Supabase Pro custa a partir de US$ 25/mês e o PowerSync Pro a partir de US$ 49/mês (https://supabase.com/pricing e https://www.powersync.com/pricing, consultados em 22/10/2026; [Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md)).
- O Supabase Pro tem backups diários com 7 dias de acesso; o PITR de 7 dias custa US$ 100/mês; os backups não incluem objetos do Storage (mesma fonte).
- O PowerSync Open Edition é auto-hospedável sob FSL-1.1-ALv2, e cada versão vira Apache-2.0 depois de dois anos (https://docs.powersync.com/intro/self-hosting; [Dados, sincronização e backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)).
- O itsaplan do projeto (http://localhost:3001/oficina/MAT) guarda tarefas, vínculos e um documento de estado. Os textos canônicos ficam no cofre ([Registro da organização](../00_Inicio/Registro_Organizacao.md)).
- Nesta etapa, a ficha do Finnberry e quatro documentos (este ADR incluído) tiveram de ser escritos pelo coordenador depois de falhas de subagentes ([Progresso](../00_Inicio/Progresso.md)). Isso só foi possível porque a evidência estava em disco, e não apenas no histórico da conversa.

## Recomendação

**Documentação:**

- O cofre `docs/AppMaternidade` é a fonte canônica de design docs, ADRs e evidências, com links Markdown relativos (legíveis no GitHub e no Obsidian).
- O itsaplan guarda tarefas, dependências, decisões pendentes e um documento de estado. Ele não duplica texto editável.
- Estados de ADR: Proposta, Aceita, Rejeitada e Substituída. "Aceita" só com aprovação registrada de Daniel, com data. Um ADR substituído aponta para o sucessor.
- Cada afirmação relevante leva sua classe de evidência ([EXEC], [CÓDIGO], [DOC], [HIP]) e a data da fonte ([Convenções](../00_Inicio/Convencoes.md)).
- O `.gitignore` exclui clones de referência, configuração local do Obsidian, capturas, pacotes de contexto e qualquer `.env`. Nenhum dado real de família entra no repositório, nem em teste.

**Operação:**

- Serviços gerenciados (Supabase e PowerSync) com planos pagos a partir da homologação contínua e no piloto; os gratuitos ficam para provas descartáveis.
- Serviço de domínio em container, com imagem reproduzível.
- PITR de 7 dias e ensaio de restauração antes do piloto. Depois de restaurar, as exclusões são reaplicadas.
- Monitoramento mínimo de disponibilidade, rejeições, atraso de sincronização, erros sem conteúdo, fila de moderação e gasto ([Custos e operação, seção 6](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- Acesso administrativo com MFA, contas nominais e trilha de auditoria.
- Plano de saída escrito para cada fornecedor ([Custos e operação, seção 7](../05_Privacidade_Operacao/Custos_e_Operacao.md)).

**Custos:**

- Preços sempre com data e fonte, revalidados antes de cada decisão de plano.
- Cenários sempre marcados como ilustrativos.
- Assinatura pessoal de IA nunca conta como crédito de API do produto.

**Evolução:**

- Fases F0 a F6 do roadmap, cada uma com critério de saída.
- Toda expansão (anexos, 0 a 24 meses, grupos por fase, app web, áudio ao vivo, IA) entra com ADR ou decisão própria.

Justificativa:

- **Documentação no repositório:** versiona junto com o código, sobrevive a falhas de ferramenta e de agente, e é lida tanto pelo Obsidian quanto por agentes.
- **Serviços gerenciados:** reduzem a operação que uma pessoa precisaria fazer sozinha, e os planos pagos evitam pausas que derrubariam o piloto.
- **Plano de saída:** mantém a escolha de fornecedor reversível sem reescrever o app.

## Consequências

- **Positivas:**
  - decisões rastreáveis entre tarefa, documento, ADR e evidência;
  - custo previsível na ordem de US$ 110 a 300 por mês até o piloto;
  - restauração e saída de fornecedor ensaiáveis.
- **Negativas:**
  - custo fixo desde a homologação, mesmo sem usuários;
  - dois fornecedores críticos;
  - disciplina de documentação que consome tempo;
  - cofre público, que exige revisão antes de cada commit para não expor nada sensível.

## Riscos e verificação que falta

- Preços das regiões do Brasil não confirmados [NC].
- RPO e RTO não decididos: eles definem o PITR e a janela de backup.
- Ensaio de restauração e de reconstrução do PowerSync a partir do PostgreSQL ainda não feito; entra na MAT-17 ou na MAT-18.
- Operação por uma pessoa só, sem plantão contínuo.
- Links do cofre conferidos por script nesta etapa; a navegação no Obsidian depende de registrar o cofre (MAT-3, aguardando Daniel).

## Quando revisar

- Mudança de preço ou de plano do Supabase, do PowerSync ou da Expo que altere a ordem de grandeza.
- O piloto mostrar que a operação não cabe no tempo disponível.
- Exigência de RPO menor que o PITR oferece, ou de retenção maior de backup.
- Entrada de mais pessoas na equipe, o que pode mudar a ferramenta de documentação ou de tarefas.
- Troca da stack no ADR-002 ou no ADR-003.

## Referências

- Tarefas: MAT-12, MAT-13, MAT-14, MAT-15, MAT-17 e MAT-18 em http://localhost:3001/oficina/MAT
- [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md) · [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) · [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) · [Roadmap e próxima fatia](../07_Roadmap/Roadmap_e_Proxima_Fatia.md) · [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [ADR-003](ADR-003_Backend_Persistencia_Autenticacao.md)
