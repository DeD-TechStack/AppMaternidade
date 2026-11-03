---
tipo: adr
id: ADR-006
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-10, MAT-15, MAT-18, MAT-19
---

# ADR-006 — Formato de comunidade e capacidade de moderação

> Nota de 03/11/2026: o rumo mudou para site completo primeiro e port Android e iOS depois ([ADR-009](ADR-009_Site_Completo_Primeiro.md)). Onde este texto fala em app nativo, leia como o port; o site cobre as mesmas funções.

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- Comunidade é um dos quatro pilares e precisa estar no planejamento desde o início (requisito da task).
- Acesso à comunidade não pode dar acesso à rotina privada de nenhuma criança, e moderador não lê dados de família ([ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
- O uso típico é com pouco tempo, muitas vezes de madrugada.
- Requisitos externos:
  - **Apple 1.2:** filtro, denúncia, bloqueio e contato.
  - **Google Play:** aceite dos termos, denúncia e bloqueio dentro do app.
  - **Tese do STF e decretos de 2026:** remoção imediata de alguns conteúdos, devido processo e relatório anual.
  - **Conteúdo íntimo não autorizado:** remoção em 2 horas.
- A capacidade de moderação no início é pequena: uma ou duas pessoas em meio período (decisão D5).

## Opções consideradas

1. **Fórum assíncrono de tópicos e respostas em espaços curados, só texto, sem mensagem direta.**
2. Grupos por mês de nascimento.
3. Chat em grupo em tempo real.
4. Salas de áudio ao vivo.
5. Comentários sob o conteúdo editorial, como única forma de comunidade.
6. Nenhuma comunidade no app (link para grupos externos).
7. Software de fórum pronto integrado ao app.

## Evidências

Consultadas em 22/10/2026; detalhes em [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) e na [pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md).

- Apple App Review Guidelines 1.2, "Last Updated: October 16, 2026" (https://developer.apple.com/app-store/review/guidelines/): filtro, denúncia com resposta em tempo hábil, bloqueio e contato publicado.
- Política de UGC do Google Play: aceite dos termos, denúncia e bloqueio dentro do app; bloqueio obrigatório em recursos 1:1 (fonte [2] da pesquisa).
- Revisão integrativa: apoio entre pares é complemento do apoio profissional, e a efetividade é inconclusiva [52]. Os riscos são informação conflitante e comparação [53].
- **BabyCenter:**
  - grupos por mês de nascimento com 121 a 146 mil membros cada, e moderação em camadas;
  - a empresa declara que não monitora o que os membros postam, e os posts são indexáveis ([ficha](../08_Referencias/Concorrentes/BabyCenter.md)).
- **Peanut:**
  - salas de áudio exigiram treinamento próprio de moderação [50];
  - há relatos de contas falsas e de encontros presenciais ([ficha](../08_Referencias/Concorrentes/Peanut.md)).
- **Clubhouse:** os fundadores relataram que ficou difícil para muitas pessoas "to fit long conversations into their daily lives" [54].
- **Rastreadores de rotina:** nas fontes consultadas, não foi identificada comunidade no app em nenhum dos quatro analisados. Nenhum app foi instalado ([Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md)).

## Recomendação

Opção 1 no MVP, com evolução por etapas:

- **MVP:** fórum assíncrono em espaços curados, só texto, sem mensagem direta.
- **Etapa 2:** imagens com salvaguardas, grupos por faixa larga, rodas assíncronas e AMA com profissional verificado.
- **Etapa 3:** rodas ao vivo de áudio, agendadas e mediadas.
- **Etapa 4:** mensagem direta.

Cada etapa só abre quando cumprir os critérios medidos no piloto. **As rodas de conversa ao vivo não foram descartadas:** ficam registradas como etapa 3, condicionada à demanda medida e a moderação treinada para áudio.

Capacidade mínima de moderação exigida antes de abrir a comunidade (MAT-19):

- regras publicadas e aceitas antes da primeira publicação;
- denúncia com motivos, bloquear e silenciar;
- fila priorizada com ações graduais, aviso ao autor, apelação e auditoria;
- protocolo de crise com CVV 188 e SAMU 192, mais um fluxo próprio para conteúdo sexual envolvendo criança;
- horário de cobertura publicado e ocultação automática fora dele;
- primeiras publicações de contas novas revisadas antes de aparecer;
- painel web interno de moderação, sem acesso a dados de família.

Justificativa: é o formato que encaixa no uso de madrugada e pode ser moderado por uma equipe pequena com prazo. Ele também evita os riscos mais caros (imagens de crianças, contato direto, tempo real) até haver capacidade comprovada.

## Consequências

- **Positivas:**
  - comunidade útil desde o MVP, com conteúdo pesquisável;
  - moderação possível sem plantão 24 horas;
  - menor exposição a prazos de horas.
- **Negativas:**
  - menos "companhia imediata" que um chat;
  - sem fotos, a experiência fica mais pobre;
  - risco de comunidade vazia no começo;
  - custo de pessoas (moderadores e roteiro de crise) desde o piloto.

## Riscos e verificação que falta

- Comunidade vazia: mitigar com espaços curados, conteúdo fixado e convite a famílias do piloto. Medir o tempo até a primeira resposta.
- Prazos legais (2 horas para conteúdo íntimo; remoção imediata para crimes graves) com equipe pequena: validar com o jurídico o que basta no MVP só de texto.
- Roteiro de crise sem profissional de saúde mental: precisa ser escrito com um antes do piloto.
- Idade mínima e ECA Digital: decisão D4 e parecer jurídico.
- Teste Q-07 (nenhum acesso à família) e Q-11 (denúncia, bloqueio e exclusão) ainda não executados.

## Quando revisar

- O piloto mostrar demanda por imagens, grupos ou conversa ao vivo, com os critérios da etapa cumpridos.
- A moderação não cumprir os prazos por várias semanas: rever o formato ou reduzir o escopo.
- Mudança nas regras das lojas ou na legislação sobre plataformas.
- Mudança na decisão de idade mínima.

## Referências

- Tarefas: MAT-10, MAT-15, MAT-18 e MAT-19 em http://localhost:3001/oficina/MAT
- [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md) · [Pesquisa de privacidade, legal e lojas](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md) · [ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md) · [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md) · [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)
