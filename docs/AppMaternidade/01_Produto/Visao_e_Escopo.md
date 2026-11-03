---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-4
adr: ADR-001
fontes_principais:
  - tasks/hermes/APP-001-design-docs/contexto/Contexto_AppMaternidade_Consultor_Hermes.md
  - tasks/hermes/APP-001-design-docs/01_TASK_HERMES.md
  - 01_Produto/Concorrentes_e_Diferenciais.md
---

# Visão e escopo

Proposta do Hermes. O nome AppMaternidade é provisório; escopo etário, mercado inicial, monetização e papel da web aguardam decisão de Daniel (ver [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)).

## 1. Problema

Nos primeiros meses, a rotina do bebê fica espalhada entre memória, papel e mensagens. Quem assume o turno pergunta "quando ele mamou?", "a soneca começou que horas?", "passou a pomada?". Quem cuida sozinha de madrugada tem dúvidas práticas e pouca gente para perguntar. Conteúdo sobre desenvolvimento existe em muitos lugares, com qualidade desigual e, às vezes, num tom que cobra metas.

Os produtos de mercado resolvem partes disso, em geral separadas: rastreadores de rotina, programas de atividades por fase e comunidades de pais. A comparação, com fontes, está em [Concorrentes e diferenciais](Concorrentes_e_Diferenciais.md).

## 2. Proposta

Um aplicativo Android e iOS em que a família registra a rotina rapidamente, divide os cuidados com outros adultos autorizados, acompanha o desenvolvimento com atividades confiáveis (tummy time desde o início) e conversa numa comunidade organizada por assunto, sem que a comunidade tenha acesso à rotina privada.

Hipótese de valor: ligar rotina, desenvolvimento e conversa contextualizada reduz a carga mental de quem cuida, desde que cada pilar continue simples e nada vire cobrança.

## 3. Público e escopo etário

- Usuários: adultos. Mães, pais e outros cuidadores autorizados (avós, babás, outros responsáveis). Não há contas de criança.
- Escopo etário proposto para o MVP: do nascimento aos 12 meses. O modelo de dados não fixa limite; conteúdo e atividades cobrem 0 a 12 meses no lançamento, com extensão para 24 meses como primeira expansão. Gestação fica fora do MVP: muda conteúdo, comunidade e riscos de saúde, e merece decisão própria.
- Mercado inicial proposto: Brasil, em português. Afeta conteúdo, moderação, LGPD e preço; é decisão de Daniel.

## 4. Personas

| Persona | Situação | O que precisa | O que atrapalha |
| --- | --- | --- | --- |
| Ana, mãe de primeira viagem em licença | Mama de 2 em 2 horas, registra de madrugada no escuro | Saber a última mamada e o lado, registrar com uma mão, tirar dúvidas | Telas claras, formulários longos, tom de cobrança |
| Bruno, pai que voltou ao trabalho | Faz o turno da noite e os fins de semana | Saber o que aconteceu e o que está em andamento sem perguntar | Mensagens espalhadas; não saber se a soneca já começou |
| Dona Carmem, avó que cuida duas tardes por semana | Usa celular com fonte grande | Registrar sem aprender um app complexo; ler os avisos da família | Ícones sem texto; muitos passos |
| Dora, babá | Acesso temporário | Registrar e ver as notas do dia | Ver dados além do necessário; ficar com acesso depois de sair |

Personas são hipóteses de projeto, a validar em entrevistas.

## 5. Jornadas principais

1. **Primeira semana:** criar conta, cadastrar o bebê, convidar o outro responsável, registrar as primeiras mamadas e fraldas.
2. **Madrugada:** abrir o app no escuro, ver a última mamada, iniciar e encerrar a mamada com uma mão, voltar a dormir.
3. **Troca de turno:** Bruno abre "Desde que você saiu" e vê registros, a soneca em andamento e a nota "pomada só à noite".
4. **Tummy time diário:** iniciar uma sessão curta, ver uma atividade da fase, registrar sem meta.
5. **Dúvida do dia a dia:** perguntar no espaço "Sono" como outras famílias dividem a madrugada; receber respostas; denunciar uma resposta com desinformação.
6. **Fim do contrato da babá:** o responsável remove o acesso; a babá perde o acesso ao reconectar.

## 6. Requisitos funcionais

| ID | Requisito | Pilar | Documento que detalha |
| --- | --- | --- | --- |
| RF-01 | Registrar sono, amamentação, mamadeira, alimentação sólida, fralda, tummy time e observação curta | Rotina | [Fluxos e telas](../02_Experiencia/Fluxos_e_Telas.md) |
| RF-02 | Iniciar e encerrar sessões cronometradas que sobrevivem ao encerramento do app | Rotina, Desenvolvimento | [Offline e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) |
| RF-03 | Registrar retroativamente, corrigir, excluir e restaurar registros | Rotina | Fluxos e telas |
| RF-04 | Ver histórico por dia e semana, com autoria | Rotina, Cuidado compartilhado | Fluxos e telas |
| RF-05 | Criar família, cadastrar bebês e convidar cuidadores com papel e validade | Cuidado compartilhado | [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) |
| RF-06 | Revogar acesso e mudar papel | Cuidado compartilhado | Modelo de dados e permissões |
| RF-07 | Ver passagem de cuidados ("desde que você saiu") e escrever notas com destaque | Cuidado compartilhado | Fluxos e telas |
| RF-08 | Sessões de tummy time com histórico e atividades sugeridas por fase | Desenvolvimento | [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) |
| RF-09 | Conteúdo educativo com autoria, fontes, revisor, data de revisão e versão | Desenvolvimento | Desenvolvimento e conteúdo |
| RF-10 | Espaços temáticos com tópicos e respostas | Comunidade | [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) |
| RF-11 | Denunciar, bloquear e moderar | Comunidade | Comunidade e moderação |
| RF-12 | Compartilhar resumo da rotina na comunidade só por ação consciente, com prévia | Comunidade, Rotina | Offline e temporizadores, seção 13 (S5) |
| RF-13 | Exportar dados da família e excluir conta e família | Todos | [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) |
| RF-14 | Notificações opcionais entre cuidadores e lembretes locais desligados por padrão | Cuidado compartilhado | Offline e temporizadores, seção 10 |

## 7. Requisitos não funcionais

| ID | Requisito | Como verificar |
| --- | --- | --- |
| RNF-01 | Android e iOS com o mesmo conjunto de funções do MVP | Testes em aparelhos físicos das duas plataformas |
| RNF-02 | Registros essenciais funcionam sem conexão (alcance definido no documento de sincronização) | Cenários Q-01, Q-02 e Q-08 de [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) |
| RNF-03 | Isolamento entre famílias em consultas, escritas, arquivos, sincronização e notificações | Cenário Q-06 e testes de autorização por rota |
| RNF-04 | Comunidade sem acesso à rotina privada | Cenário Q-07 |
| RNF-05 | Acessibilidade: fonte ampliada, leitor de tela, contraste e alvos de toque | Checklist de acessibilidade em aparelho |
| RNF-06 | Privacidade por padrão: minimização, logs sem conteúdo sensível, pushes sem dado sensível | Revisão de código e de logs; cenário Q-12 |
| RNF-07 | Conteúdo educativo rastreável (fonte, revisão, versão) | Revisão editorial antes da publicação |

## 8. Critérios de sucesso propostos

Métricas a medir num piloto; os alvos são hipóteses para discussão, não resultados.

| Critério | Medida | Alvo inicial proposto |
| --- | --- | --- |
| Registro rápido | Toques e segundos do botão ao registro salvo | Até 2 toques e 5 segundos nos tipos com botão rápido |
| Cuidado compartilhado real | Famílias com 2 ou mais adultos registrando na semana | Acompanhar; sem alvo antes do piloto |
| Confiança nos dados | Registros perdidos ou duplicados por falha de sync | Zero nos testes de Q-01 a Q-05 |
| Comunidade útil | Tópicos com pelo menos uma resposta em 24 horas | Acompanhar no piloto |
| Moderação | Denúncias decididas dentro do prazo publicado | Prazo a definir com a operação |
| Sem cobrança | Relatos de culpa ou pressão nas entrevistas | Nenhum padrão recorrente |

## 9. Recorte em etapas

| Etapa | O que entra | O que prova |
| --- | --- | --- |
| Fundação técnica | Projeto mobile nas duas plataformas, autenticação, família, vínculo, bebê, banco local com fila, sincronização mínima, autorização no servidor, testes de isolamento | Que a arquitetura escolhida aguenta offline, troca de turno e revogação |
| MVP utilizável | Os sete tipos de registro, sessões, histórico, passagem de cuidados, tummy time com atividades revisadas, comunidade com tópicos e respostas, denúncia, bloqueio, painel de moderação, exportação e exclusão | Que famílias reais usam os quatro pilares juntos |
| Expansões candidatas | Faixa até 24 meses, widgets e Live Activities (se não couberem no MVP), anexos e fotos, gráficos mais ricos, grupos por fase, rodas de conversa agendadas, conteúdo em vídeo, app web para cuidadores | Decididas por uso e demanda |

A próxima fatia funcional a implementar está em [Roadmap e próxima fatia](../07_Roadmap/Roadmap_e_Proxima_Fatia.md).

## 10. Fora do MVP

Previsão de sono, IA generativa, reconhecimento por câmera, wearables e monitores, chat em tempo real, salas de áudio ou vídeo, telemedicina, marketplace, anúncios e gestação. Qualquer um volta só com utilidade demonstrada, avaliação de privacidade e custo justificado.

## 11. Web: três perguntas separadas

| Papel da web | Proposta | Quando |
| --- | --- | --- |
| Site público | Necessário: página do produto, política de privacidade, termos e a página de exclusão de conta que o Google Play exige como link web | Antes da primeira publicação nas lojas |
| Painel de moderação e operação | Necessário quando a comunidade abrir: fila de denúncias, ações, auditoria e gestão de conteúdo editorial; uso interno | Junto com a comunidade do MVP |
| App web para cuidadores | Não no MVP. Reavaliar com dados de uso (por exemplo, pedidos de avós sem smartphone ou uso em computador) | Depois do MVP |

A decisão e as consequências estão no [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md).

## 12. Monetização

Em aberto. Opções a avaliar (assinatura com plano gratuito, pagamento único, gratuito sustentado por parceria institucional) têm consequências de privacidade e de produto; anúncio direcionado com dados de rotina de bebê não é proposto. Decisão de Daniel, sem impacto na fundação técnica além de prever compras dentro do app.

## Questões abertas

1. Escopo etário (proposta 0 a 12 meses no MVP) e gestação fora.
2. Mercado inicial (proposta Brasil, pt-BR).
3. Monetização.
4. Nome definitivo do produto.

## Limites desta análise

Personas, jornadas e alvos são hipóteses sem pesquisa com usuários. A comparação com o mercado depende das fontes listadas em [Concorrentes e diferenciais](Concorrentes_e_Diferenciais.md).
