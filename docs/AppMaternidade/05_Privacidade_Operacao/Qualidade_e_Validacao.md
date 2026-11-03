---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-14
adr: ADR-008
fontes_principais:
  - tasks/hermes/APP-001-design-docs/06_CRITERIOS_DE_ACEITE.md (cenários Q-01 a Q-12)
  - https://support.google.com/googleplay/android-developer/answer/14151465 (consulta 22/10/2026)
  - https://developer.apple.com/testflight/ (consulta 22/10/2026)
  - https://developer.apple.com/design/human-interface-guidelines/accessibility (consulta 22/10/2026)
  - https://support.google.com/accessibility/android/answer/7101858 (consulta 22/10/2026)
---

# Qualidade e validação

Proposta do Hermes. Define como provar, nas próximas etapas, que o aplicativo faz o que os documentos prometem. Nada aqui foi executado: os cenários são requisitos de teste, e as metas numéricas são hipóteses a confirmar ou ajustar na prova técnica (MAT-17).

## 1. Problema

O que mais destrói a confiança neste produto não é uma tela feia, e sim:

- um registro que some, duplica ou muda sem aviso;
- dados de uma família aparecendo para outra;
- a comunidade revelando a rotina de um bebê;
- um temporizador que mostra a duração errada depois que o app foi fechado;
- conteúdo de desenvolvimento sem fonte ou com orientação inadequada;
- um app difícil de usar com uma mão, no escuro ou com fonte ampliada.

A estratégia concentra o esforço de teste nesses riscos, nas duas plataformas.

## 2. Estratégia por risco

| Risco | Impacto | Onde se previne | Como se prova | Evidência exigida |
| --- | --- | --- | --- | --- |
| Perda ou duplicação de registro | Alto | Fila local transacional; id de operação; idempotência no servidor | Testes de integração com falhas injetadas (resposta perdida, timeout, app encerrado) e teste em aparelho físico | Contagens no servidor e no aparelho; registro do teste |
| Vazamento entre famílias | Crítico | Autorização pelo vínculo atual em toda rota, canal de sync, arquivo e push | Testes automáticos com ids de outra família para cada rota e canal, gerados a partir da lista de rotas | Relatório de cobertura por rota; falha bloqueia a publicação |
| Comunidade expondo a rotina | Crítico | Contextos separados; perfil público sem chave de família | Teste de esquema (nenhuma tabela da comunidade referencia Cuidado) e revisão das consultas | Teste automático e revisão registrada |
| Revogação ineficaz | Alto | Época do vínculo; recusa no servidor; limpeza local | Cenário com aparelho offline revogado (Q-05) | Registro do teste nos dois aparelhos |
| Conflito silencioso | Médio | Versão-base; mescla por campo; selo de revisão | Dois aparelhos offline editando o mesmo campo (Q-04) | Histórico com as versões |
| Temporizador errado | Médio | Duração derivada do início gravado | Encerrar o app, reiniciar o aparelho, trocar fuso (Q-08, Q-09) | Comparação com relógio de referência |
| Conteúdo inadequado | Alto | Ciclo editorial com revisor qualificado | Checklist editorial por versão | Registro de revisão na versão do conteúdo |
| Acessibilidade insuficiente | Médio | Componentes com rótulos; fonte escalável; alvos de toque | TalkBack, VoiceOver e fonte ampliada em aparelho | Checklist por tela |
| Dado sensível em log, push ou analytics | Alto | Política de logs; textos de push neutros | Busca automática por campos sensíveis em logs de teste; revisão de SDKs | Relatório da varredura |

## 3. Escada de testes

Cada tarefa de implementação diz quais degraus valem para ela; um degrau que falte no projeto vira lacuna registrada, não degrau pulado.

1. **Análise estática:** lint, tipos, varredura de segredos e de licenças de dependências.
2. **Unitários:** regras de domínio (durações, meia-noite, fusos, validação de registros, matriz de permissões).
3. **Integração:** servidor com banco real descartável; protocolo de sincronização; autorização por rota e canal; idempotência; conflitos.
4. **Interface em aparelho ou emulador:** fluxos críticos automatizados nas duas plataformas, com captura de tela e rastro só das falhas.
5. **Manual em aparelho físico:** cenários que a automação não cobre bem (app encerrado pelo sistema, notificações, leitor de tela, quarto escuro).
6. **Revisão independente:** outra família de modelo revisa design e evidências, só leitura; revisão humana de conteúdo; revisão jurídica antes do lançamento.

Dados de teste são sempre fictícios. Nenhum dado real de criança entra em teste, captura ou log.

## 4. Cenários Q-01 a Q-12

As regras de cada cenário estão em [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) (seções 5 a 13), [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) e [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md).

| ID | Cenário | Resultado esperado | Degraus | Plataformas | Evidência |
| --- | --- | --- | --- | --- | --- |
| Q-01 | Registro offline, app encerrado e reaberto | Registro presente, com estado "aguardando envio" e depois "sincronizado" | 3, 4, 5 | Android e iOS físicos | Capturas antes e depois; contagem no servidor |
| Q-02 | Reenvio depois de timeout ou resposta perdida | Uma operação vira um registro | 3 | Servidor | Teste com proxy que descarta a resposta; tabela de operações processadas |
| Q-03 | A inicia, B encerra a mesma sessão | Uma sessão, "iniciado por A, encerrado por B"; duplo encerramento tratado | 3, 4 | Dois aparelhos, um de cada plataforma | Detalhe do registro e histórico |
| Q-04 | A e B editam offline o mesmo registro | Campos diferentes: mescla; mesmo campo: selo de revisão com as duas versões | 3, 4 | Dois aparelhos | Histórico com as versões; captura da tela de revisão |
| Q-05 | Revogação com aparelho offline | Operações recusadas ao reconectar; dados locais da família apagados; aviso honesto | 3, 5 | Dois aparelhos | Respostas do servidor; captura do aviso; banco local conferido |
| Q-06 | Ids e anexos de outra família | Resposta igual à de id inexistente, em rotas, sync, URLs de arquivo e push | 2, 3 | Servidor | Relatório de cobertura por rota e canal |
| Q-07 | Publicar e ler na comunidade | Nenhum acesso à família; resumo de rotina só com prévia e confirmação | 3, 4 | Android e iOS | Teste de esquema; captura da prévia |
| Q-08 | Tela bloqueada, app suspenso ou encerrado durante sessão | Duração correta ao reabrir | 2, 5 | Android e iOS físicos | Comparação com cronômetro de referência |
| Q-09 | Troca de fuso, troca manual de relógio, meia-noite | Instantes, duração e agrupamento segundo as regras | 2, 5 | Android e iOS | Testes unitários com fusos e horário de verão; teste manual de troca de fuso |
| Q-10 | Notificação negada ou push não recebido | Registro e sincronização normais; mensagem compreensível | 4, 5 | Android 13 ou superior e iOS | Capturas com permissão negada |
| Q-11 | Denunciar, bloquear, excluir postagem | Visibilidade conforme as regras de moderação ([Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), seções 7, 8 e 11). O bloqueio é mútuo: nenhum dos dois vê o conteúdo do outro nem responde a ele. A postagem excluída sai de listas e busca na hora | 3, 4 | Android, iOS e painel de moderação | Registro da ação de moderação; capturas |
| Q-12 | Exportar, excluir e restaurar backup | Exportação só da família e por responsável; exclusão propagada aos aparelhos; restauração de backup não ressuscita dados excluídos | 3, 5 | Servidor e aparelhos | Arquivo exportado com dados fictícios; registro do expurgo; ensaio de restauração em ambiente de teste |

Q-12 tem um ponto que costuma ser esquecido: ao restaurar um backup, as exclusões feitas depois da cópia precisam ser reaplicadas. A proposta é manter uma lista de exclusões (só ids e datas, sem conteúdo) fora do backup e reaplicá-la em toda restauração. Detalhes em [Privacidade e segurança](Privacidade_e_Seguranca.md).

## 5. Requisitos mensuráveis

Metas propostas para discussão. Todas são hipóteses até a prova técnica; nenhuma foi medida.

| Requisito | Meta proposta | Premissa | Método de validação |
| --- | --- | --- | --- |
| Registro rápido | Botão rápido salva em até 2 toques e 5 segundos | Botões rápidos em Hoje | Teste de usabilidade com 5 a 8 cuidadores, cronometrado |
| Gravação local | Registro visível na tela em até 300 ms depois do toque, em aparelho de entrada | Banco local na mesma transação da fila | Instrumentação na prova técnica, percentil 95 |
| Perda e duplicação | Zero em 200 ciclos de envio com falhas injetadas | Fila transacional e idempotência | Teste de integração automatizado |
| Isolamento | 100% das rotas e canais cobertos por teste de outra família | Lista de rotas gerada do código | Relatório de cobertura; publicação bloqueada se faltar rota |
| Temporizador | Diferença de até 1 segundo em relação ao cronômetro de referência após encerrar e reabrir | Duração derivada do início gravado | Teste manual nas duas plataformas |
| Sincronização entre cuidadores | Mudança de outro cuidador visível em até 10 segundos com os dois apps abertos e rede boa | Canal de aviso mais pedido de mudanças | Medição com dois aparelhos na prova técnica |
| Abertura | Hoje aberto em até 2 segundos a frio com 90 dias de dados, em aparelho de entrada | Leitura local | Medição na prova técnica |
| Acessibilidade | Registro rápido completo com TalkBack e VoiceOver; fonte a 200% sem cortar ações principais | Rótulos e layout flexível | Checklist por tela |
| Contraste | Texto comum com pelo menos 4,5:1, no tema claro e no escuro | Paleta definida no design | Ferramenta de contraste sobre as capturas |
| Alvos de toque | Pelo menos 48 x 48 dp (Android) e 44 x 44 pt (iOS) | Componentes padronizados | Accessibility Scanner e Accessibility Inspector |

As metas de contraste e alvos de toque vêm das diretrizes das plataformas (fontes no cabeçalho). As demais são propostas do Hermes.

## 6. Android e iOS

### Aparelhos

- Proposta mínima de laboratório: um Android de entrada, um Android intermediário e um iPhone na versão mínima suportada, mais um na versão atual. As versões mínimas saem do [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md).
- Emulador Android roda no Windows. O simulador de iOS só roda em macOS. Por isso, a validação de iOS a partir do ambiente atual depende de iPhone físico com distribuição de teste, de um Mac (local ou alugado) ou de um serviço de build e teste em nuvem. O caminho por alternativa de stack está em [Mobile e plataformas](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md).
- Testes com o sistema encerrando o app, notificações e leitor de tela exigem aparelho físico.

### Distribuição de teste

| Loja | Mecanismo | Limites e exigências (consulta 22/10/2026) |
| --- | --- | --- |
| Google Play | Testes interno, fechado e aberto | Conta pessoal criada depois de 13/11/2023 precisa de teste fechado com pelo menos 12 testadores inscritos continuamente por 14 dias antes de pedir acesso à produção; conta de organização não tem essa exigência. |
| App Store | TestFlight | Até 100 testadores internos (membros da equipe) e até 10.000 externos; o primeiro build para testadores externos passa por revisão da Apple. |

O tipo de conta de desenvolvedor (pessoal ou organização) muda prazos e custos; está em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

## 7. Provas técnicas previstas (MAT-17)

A prova técnica é pequena e descartável. Ela existe para escolher a stack com evidência, não para virar o produto.

| Prova | Pergunta | Passa se |
| --- | --- | --- |
| P1 Offline e reabertura | A fila local sobrevive ao encerramento? | Q-01 passa nas duas plataformas |
| P2 Reenvio idempotente | Reenvio duplica? | Q-02 passa com 200 ciclos |
| P3 Dois cuidadores | Conflito e autoria funcionam? | Q-03 e Q-04 passam |
| P4 Revogação offline | O servidor recusa e o aparelho limpa? | Q-05 passa |
| P5 Isolamento no canal de sync | O canal de sincronização respeita o vínculo atual? | Q-06 passa no canal de sync |
| P6 Cronômetro fora do app | Notificação contínua no Android e Live Activity no iOS são viáveis na stack? | Funcionam com o app encerrado, ou o custo de não ter fica registrado |
| P7 Build de iOS a partir do Windows | Quanto tempo e custo leva do código ao iPhone? | Build instalado via TestFlight com tempo e custo registrados |
| P8 Acessibilidade básica | Os componentes da stack expõem rótulos e escala de fonte? | Registro rápido com TalkBack e VoiceOver |
| P9 Tamanho e abertura | O app cabe nas metas da seção 5? | Medidas registradas em aparelho de entrada |

Critério de decisão: se a stack recomendada falhar em P1 a P5 sem correção razoável, a alternativa principal do [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md) e do [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) é testada antes de seguir.

## 8. Observabilidade

- Logs de servidor e de aparelho sem conteúdo de registros, notas, nomes ou datas de nascimento; ids e tipos de operação bastam.
- Relatório de falhas sem dados pessoais; SDKs de terceiros avaliados um a um e declarados nas lojas.
- Métricas do protocolo: operações pendentes por aparelho, idade da operação mais antiga, rejeições por motivo e conflitos por semana.
- Alerta para filas paradas, taxa de rejeição anormal e falhas de autorização em série.

## 9. Lacunas conhecidas

| Lacuna | Efeito | Menor intervenção |
| --- | --- | --- |
| Sem Android SDK, Flutter, Kotlin ou Gradle instalados nesta máquina | Nenhuma prova mobile foi feita nesta etapa | Instalar o necessário na MAT-17, depois da escolha de stack |
| Sem Mac nem iPhone de teste conhecido | Validação de iOS depende de serviço em nuvem ou aparelho | Decisão de Daniel sobre conta Apple e aparelho |
| Sem contas de desenvolvedor | Sem TestFlight nem teste fechado na Play | Decisão de Daniel |
| Sem revisor de conteúdo nem consultoria jurídica | Conteúdo e textos legais não podem ser publicados | Decisão de Daniel |

## Questões abertas

1. Versões mínimas de Android e iOS (dependem do ADR-002 e do público).
2. Quem serão os 12 testadores do teste fechado, se a conta da Play for pessoal.
3. Orçamento para aparelhos de teste ou laboratório em nuvem.

## Limites desta análise

Plano sem execução. As metas são propostas, não medidas; as exigências das lojas foram lidas em 22/10/2026 e podem mudar.
