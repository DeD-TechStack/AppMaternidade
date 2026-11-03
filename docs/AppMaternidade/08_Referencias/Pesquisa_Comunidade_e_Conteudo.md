---
tipo: pesquisa
status: rascunho
responsavel: Hermes (subagente comunidade e conteúdo)
revisado_em: 2026-10-22
fontes_principais:
  - Apple App Review Guidelines, seção 1.2 (Last Updated 16/10/2026)
  - Google Play — User Generated Content e Child Safety Standards
  - AAP — Sleep-Related Infant Deaths, recomendações de 2022 (Pediatrics) e HealthyChildren.org
  - OMS — diretrizes de atividade física, comportamento sedentário e sono para menores de 5 anos (2019)
  - CDC — Learn the Signs. Act Early. (marcos revistos em 2022; páginas revisadas em 2026)
  - NHS — atividade do bebê e termos de reuso (OGL v3.0)
  - Pathways.org — Tummy Time e termos de uso
  - SBP — Departamento Científico de Medicina do Sono; SPSP
  - Ministério da Saúde — Guia de Intervenção Precoce (minuta em consulta pública, 2025); Guia de Atividade Física (2021); Caderneta da Criança
  - STF — art. 19 do Marco Civil (julgamento finalizado em 26/06/2025)
  - CVV 188, SAMU 192, Disque 100, Ligue 180
---

# Pesquisa — comunidade, moderação, tummy time e ciclo editorial

Nota de referência para a APP-001. Alimenta os futuros [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) e [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) (ambos a criar) e os ADR-006 (formato de comunidade e moderação) e ADR-007 (conteúdo educativo). Segue as [Convenções](../00_Inicio/Convencoes.md).

Como ler:

- Todas as fontes externas foram consultadas em 22/10/2026 (America/Sao_Paulo). Os números entre colchetes, como [1], remetem à seção "Fontes", logo antes das questões abertas. Cada fonte numerada tem trecho literal conferido no texto baixado.
- [DOC] indica conteúdo declarado em documentação, site ou norma. [HIP] indica proposta ou inferência do Hermes, ainda não validada com usuários, jurídico ou profissional de saúde.
- Esta nota não traz orientação clínica própria: só relata o que cada fonte diz, com citação curta.
- Fora do escopo desta nota, tratados por outros agentes: privacidade, LGPD e requisitos gerais das lojas, em [Pesquisa de privacidade, legal e lojas](Pesquisa_Privacidade_Legal_e_Lojas.md); concorrentes, em [BabyCenter](Concorrentes/BabyCenter.md), [Peanut](Concorrentes/Peanut.md), [Kinedu](Concorrentes/Kinedu.md) e [Pathways](Concorrentes/Pathways.md); preços consolidados, em [Preços datados](Tecnologias/Precos_Datados.md); conteúdo offline do Bebbo, em [Bebbo](Repositorios/Bebbo.md). Algumas dessas notas ainda estão sendo escritas em paralelo.

## Resumo

- **Formato do MVP [HIP]:** fórum assíncrono de tópicos e respostas, com espaços por assunto curados pela equipe e etiqueta opcional de faixa etária no tópico. No início: só texto, sem mensagem direta, sem chat e sem salas ao vivo. As rodas de conversa ficam registradas como etapa posterior, com critérios para ativação; não foram descartadas.
- **Segurança mínima:** denúncia com motivos, bloquear e silenciar, fila de moderação com prioridade para crise e criança, ações graduais com aviso ao usuário, apelação, auditoria, regras aceitas antes de publicar, limites para contas novas, identidade pública pseudônima e protocolo de crise com CVV 188 e SAMU 192. A Apple exige filtro, denúncia com resposta em tempo hábil, bloqueio e contato publicado [1]. O Google Play exige aceite dos termos, denúncia e bloqueio dentro do app [2]. O STF passou a exigir remoção rápida de alguns conteúdos graves e autorregulação com devido processo [55].
- **Tummy time:** as fontes convergem em bebê acordado e supervisionado e em sono sempre de barriga para cima [11][23]. As que tratam do início recomendam começar cedo e aumentar aos poucos [23][12][13]. Divergem na quantidade. AAP: 15 a 30 min/dia até 7 semanas [23]. OMS e Ministério da Saúde: ao menos 30 min/dia para quem ainda não se locomove [21][18]. Pathways: ao menos 60 min/dia aos 6 meses [13]. NHS: sem número [12]. A SBP registra que não há consenso sobre tempo e frequência [14]. Nenhum desses números deve virar meta no app.
- **Licenças:** citar e linkar é possível em todas as fontes. Reproduzir texto só vale para CDC (domínio público, com condições) [24], NHS (OGL, mas tradução conta como adaptação) [26] e OMS (somente uso não comercial) [21]. AAP, Pathways e SBP exigem permissão [29][27][31]. O texto em pt-BR precisa ser produção própria, com revisão profissional.

---

## Parte 1 — Comunidade e moderação

### 1.1 O que se sabe sobre comunidades de pais

- Uma revisão integrativa de 38 publicações concluiu que o apoio entre pares pela internet oferece suporte emocional e informativo. A evidência de efetividade foi "inconclusiva", mas nenhum efeito nocivo foi relatado nos estudos revisados [52]. Os autores descrevem esse apoio como complemento, e não substituto, do apoio profissional [52].
- Uma revisão de escopo do King's College London (preprint revisado em outubro de 2025) mapeou riscos dos conselhos online para pais de crianças pequenas: excesso de informação, recomendações conflitantes, informação pouco confiável e sentimento de inadequação diante de comparações [53]. Segundo um estudo citado nela, 71% dos pais buscavam informação online, mas só 26% sempre verificavam as fontes [53].
- Leitura [HIP]: a comunidade tem valor como apoio entre pares. Esse valor depende de três coisas: separar relato de orientação, dar destaque a conteúdo revisado e evitar mecânicas de comparação.

### 1.2 Comparação de formatos

| Formato | Pouco tempo e uso de madrugada | Descoberta e busca | Riscos de moderação | Custo e operação | Requisitos técnicos | Evidência em produtos reais |
| --- | --- | --- | --- | --- | --- | --- |
| Fórum por tópicos e respostas (assíncrono) | Alto: lê e responde quando puder, com uma mão; a pergunta fica disponível para respostas posteriores [HIP] | Alta: tópicos ficam pesquisáveis, e respostas antigas resolvem dúvidas repetidas [HIP] | Desinformação persiste se não for corrigida, mas pode ser corrigida, fixada ou ocultada; o assédio é menos imediato que em tempo real [HIP] | Fila assíncrona com prazo de atendimento; dá para começar com equipe pequena [HIP] | CRUD, busca, push opcional; sem tempo real | What to Expect organiza a comunidade em fóruns (grupos por mês de nascimento e por interesse) [46][45]; Mumsnet Talk é um fórum aberto com intervenção mínima e moderação a partir de denúncias [47] |
| Grupos por fase ou mês de nascimento | Alto quando há volume; com pouca gente vira sala vazia [HIP] | Média: fragmenta o conteúdo por grupo [HIP] | Expõe o mês de nascimento; favorece panelinhas e grupos privados difíceis de fiscalizar [HIP] | Cada grupo precisa de alguém responsável [HIP] | Igual ao fórum, mais associação ao grupo | What to Expect: grupos por mês de nascimento [46], uns geridos pela equipe e outros por membros donos do grupo [45] |
| Chat em grupo (texto em tempo real) | Companhia imediata de madrugada, mas exige estar presente; conversa rápida e sem estrutura [HIP] | Baixa: histórico corrido e difícil de pesquisar [HIP] | Alto: assédio, spam e aliciamento em tempo real; mensagem direta exige bloqueio [2] | Moderação perto do tempo real e cobertura de horário [HIP] | WebSocket, presença, push; serviço pago ou infraestrutura própria (Stream, Sendbird) [41][42] | Hipótese: no Brasil, cuidadores já usam grupos de mensageria; copiar esse formato dificilmente diferencia o produto [HIP] |
| Salas de áudio ou vídeo, rodas agendadas com mediação | Acolhimento por voz, mas depende de agenda; madrugada só com sala aberta [HIP] | Nula sem gravação ou transcrição, que por sua vez criam problema de privacidade [HIP] | Dano em tempo real não pode ser filtrado antes; gravação exige consentimento; mediador precisa estar presente [HIP] | Mediador por sessão e treinamento específico. A Peanut moderava os "Pods" de áudio com equipe interna; a equipe paga que moderava o resto do app (mais de duas dezenas de pessoas) só recebeu treinamento para áudio às vésperas do lançamento [50] | WebRTC/SFU; serviços como LiveKit e Agora [43][44] | Peanut lançou salas de áudio em 2021 [50] (situação atual não verificada). O Clubhouse cortou mais da metade da equipe em 2023; os fundadores escreveram que ficou mais difícil para muitas pessoas "to fit long conversations into their daily lives" [54] |
| AMA ou evento com profissional | Bom se assíncrono: perguntas coletadas antes e respostas publicadas depois [HIP] | Alta: vira tópico pesquisável [HIP] | Risco de tratar caso individual como consulta; exige verificação do profissional e aviso de limites [HIP] | Tempo do profissional, agenda e mediação [HIP] | Igual ao fórum, mais selo e agenda | Os webchats do Mumsnet seguem regras como "One question per member plus one follow-up", com mediação da equipe [49] |

Leitura [HIP]:

1. Para quem tem pouco tempo e usa o app de madrugada, o formato assíncrono atende melhor: a pergunta das 3h recebe resposta de manhã e continua útil para a próxima pessoa.
2. Formatos em tempo real cobram presença simultânea de usuários e de moderadores. O caso do Clubhouse mostra o problema de encaixar conversas longas na rotina [54]; o caso da Peanut mostra que áudio exige treinamento próprio de moderação [50].
3. Rodas de conversa continuam com valor potencial (acolhimento, voz, vínculo). Por isso entram como etapa posterior, com critérios para ativação.

### 1.3 Recomendação de formato e evolução por etapas [HIP]

| Etapa | O que entra | Critério para avançar (limiares calibrados no piloto, não metas inventadas) |
| --- | --- | --- |
| 0. Fundação | **Superado; ver a nota abaixo da tabela.** Modelo de dados com identidade pública separada do grupo familiar, tópico, resposta, denúncia, ação de moderação e auditoria. Painel web mínimo de moderação | O fluxo de tópico e resposta comprova que a comunidade não lê dados da família (requisito fixo do pacote da task: "Acesso à comunidade não concede acesso à rotina privada de uma criança") |
| 1. MVP de comunidade | Fórum assíncrono em espaços curados: sono, alimentação, banho, tummy time, organização da rotina, divisão dos cuidados, dificuldades do dia a dia. Etiqueta opcional de faixa etária no tópico. Busca. Tópico fixado em cada espaço com conteúdo revisado. Só texto. Sem mensagem direta. Primeiras publicações de contas novas passam por revisão prévia | Tempo até a primeira resposta humana; proporção de tópicos sem resposta; prazo de moderação cumprido por várias semanas seguidas; denúncias por mil publicações; reversões em apelação; pedidos explícitos por imagens, fases ou conversa ao vivo. Medir no piloto antes de fixar limiares |
| 2. Expansão assíncrona | Imagens com salvaguardas (seção 1.4). Grupos por faixa etária ampla, só se houver volume. "Roda assíncrona": tópico-evento com horário, tema e anfitriã ou anfitrião treinado. AMA assíncrono com profissional verificado | Moderação de imagem funcionando sem atraso; verificação de profissional operando; volume suficiente para que grupos não fiquem vazios |
| 3. Rodas ao vivo (áudio) | Salas agendadas, pequenas, com mediador treinado presente, regras próprias, sem gravação por padrão e com saída fácil | Demanda medida (inscrição em lista de interesse, presença nas rodas assíncronas); equipe treinada para áudio; protocolo de crise em tempo real; custo por minuto orçado [43][44] |
| 4. Chat ou mensagem direta | Só com demanda forte e bloqueio entre usuários desde o início [2] | Risco de aliciamento e assédio aceito e mitigado; capacidade de moderação comprovada |

**Nota do coordenador, depois da revisão independente:** a divisão em etapas foi ajustada ao roadmap.

- **Fundação (MAT-18):** só a prova de separação de dados, e só se couber no prazo.
- **MVP de comunidade (MAT-19):** denúncia, moderação, auditoria e painel.

Regra vigente em [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), seção 4.

Registro para o ADR-006: as rodas de conversa ao vivo não foram eliminadas. Ficam como etapa 3 condicionada aos critérios acima.

### 1.4 Mecanismos mínimos de segurança no MVP

| Mecanismo | Proposta para o MVP [HIP, salvo indicação] | Base |
| --- | --- | --- |
| Regras da comunidade | Aceite obrigatório antes de publicar pela primeira vez; regras curtas em pt-BR, com exemplos (relato pessoal x orientação; nada de diagnóstico; sem venda; sem expor terceiros) | A política do Google Play exige aceite dos termos antes de publicar UGC e definição do que é proibido [2] |
| Denúncia com motivos | Motivos sugeridos: ataque ou assédio; informação de saúde perigosa; conteúdo sexual; exposição de criança; dados pessoais; spam ou venda; risco de autolesão (aciona a rota de crise); outro | A Apple exige mecanismo de denúncia e resposta em tempo hábil [1]; o Google exige denúncia dentro do app [2] |
| Bloquear e silenciar | Bloquear: o conteúdo da pessoa bloqueada fica oculto para quem bloqueou, e ela não pode responder nem mencionar quem a bloqueou. Silenciar: oculta o conteúdo sem impedir interação. Ações sem aviso à outra parte. **Superado:** a regra vigente é o bloqueio mútuo. Nenhum dos dois vê o conteúdo do outro nem responde a ele ([Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), seção 7) | Bloqueio de usuários abusivos é exigido pela Apple [1] e pelo Google [2]; o Discourse dá a usuários de nível 1 a opção de silenciar outros [40] |
| Fila de moderação | Prioridade 1: risco de vida e conteúdo envolvendo criança. Prioridade 2: assédio e dados pessoais. Prioridade 3: desinformação e spam. Mostrar o contexto e o histórico do autor na comunidade, nunca dados da família | Requisito do pacote: moderador não lê dados infantis privados |
| Ações | Ocultar até a análise; remover; advertir; modo somente leitura temporário; suspender; banir. Cada ação informa a regra violada e o trecho afetado | Os Santa Clara Principles pedem aviso ao usuário com o motivo e a regra aplicada [51] |
| Apelação | Um pedido de revisão por ação, analisado por outra pessoa sempre que possível, com prazo publicado | Santa Clara: oportunidade significativa e tempestiva de apelação ("meaningful opportunity for timely appeal"), no idioma do usuário [51]; o STF exige devido processo na autorregulação [55] |
| Auditoria | Registro imutável de quem, quando, qual regra, qual ação e qual versão do conteúdo. Acesso restrito. Retenção a definir com o agente de privacidade | Base para relatório de transparência; o STF pede relatórios anuais sobre notificações extrajudiciais [55] |
| Filtros automáticos | Lista de termos em pt-BR (inclusive de crise); limite de publicações por hora; links bloqueados para contas novas; primeiras publicações revisadas antes de aparecer | O Discourse restringe contas novas: no máximo 1 imagem, 2 links e 3 tópicos, e nenhum anexo (padrões descritos em 2018 e configuráveis) [40] |
| Moderação automática por API (opcional) | Só depois de revisão de privacidade e contrato de tratamento de dados; nunca como decisão final sozinha | Ver seção 1.8 |
| Identidade pública pseudônima | Apelido e avatar genérico; nenhum vínculo visível com nome, cidade ou família; a conta da comunidade não carrega dados do bebê | What to Expect avisa que nome de usuário, avatar e posts são públicos e recomenda evitar dados pessoais [45] |
| Fotos de crianças | MVP sem imagens. Na etapa 2: aviso antes do envio; desestimular rosto da criança; proibir nudez infantil em qualquer contexto, inclusive banho; remover metadados no aparelho; revisar a imagem antes de publicar | A Apple informa que, com os Serviços de Localização ativos para a Câmera, as coordenadas ficam gravadas em cada foto e vídeo [57]; a AAP aponta o risco de expor localização e rotina ao compartilhar fotos de crianças [59] |
| Crise (autolesão, depressão pós-parto, violência) | Ver seção 1.5 | [4][6][7] |
| Contato publicado | Canal de contato e de denúncia fora da comunidade, sempre visível | Exigido pela Apple [1]; o STF pede canais de atendimento acessíveis e permanentes [55] |
| Selo de profissional verificado | Adiar para a etapa 2. Exige conferir o registro no conselho profissional e a identidade, renovar periodicamente e definir o escopo do selo | [HIP]; custo operacional manual |
| Separação entre relato e orientação | Tudo nasce como "relato pessoal". Selos distintos para "conteúdo revisado" (equipe editorial) e "profissional verificado: orientação geral, não substitui consulta". Aviso fixo de que a comunidade não é atendimento | What to Expect exige fonte para informação de saúde que não venha da experiência pessoal [45]; a Apple pede lembrar o usuário de consultar o médico [1] |
| Idade mínima | Decisão aberta. What to Expect exige 18 anos ou mais [45]. O ECA Digital alcança também serviços que possam ser acessados por crianças e adolescentes [56], e há mães adolescentes no público provável [HIP] | Encaminhar ao agente de privacidade e ao jurídico |

Fluxo mínimo de uma denúncia [HIP]:

```
denúncia (motivo) ─► triagem automática (crise? criança? volume?) ─► fila priorizada
      │                         │
      │                  crise ─► mensagem de apoio ao autor com 188/192 + revisão humana prioritária
      ▼
ação (ocultar/remover/advertir/suspender) ─► aviso ao autor (regra + trecho) ─► apelação ─► decisão final
      └──────────────────────── tudo registrado na auditoria ────────────────────────┘
```

### 1.5 Protocolo de crise e canais oficiais [DOC + HIP]

Canais confirmados nas fontes oficiais em 22/10/2026:

| Situação | Canal | O que a fonte diz |
| --- | --- | --- |
| Sofrimento emocional, ideação suicida | CVV, 188 | Ligação gratuita, 24 horas, de todo o território nacional; também atende por chat e e-mail [4]. Linha nacional gratuita implantada por cooperação com o Ministério da Saúde [5] |
| Urgência ou emergência de saúde | SAMU, 192 | Serviço gratuito, 24 horas por dia, 7 dias por semana [6] |
| Violência contra a mulher | Ligue 180 | Ligação gratuita, 24 horas, todos os dias [9] |
| Violação de direitos de crianças e adolescentes | Disque 100 | Funciona 24 horas, inclusive fins de semana e feriados; basta discar 100; crianças e adolescentes estão entre os grupos atendidos [8] |

Sobre depressão pós-parto, a página do Ministério da Saúde diz que ela "não é uma falha de caráter ou uma fraqueza" e que homens também podem desenvolvê-la [7]. Entre os sinais listados estão "pensamento na morte ou suicídio" e "vontade súbita de prejudicar ou fazer mal ao bebê" [7]. Casos com risco de suicídio ou infanticídio devem ser encaminhados para internação, e o tratamento é oferecido de forma integral e gratuita pelo SUS [7].

Proposta de comportamento do app [HIP]:

1. Gatilhos: denúncia com o motivo "risco de autolesão", termos de crise da lista em pt-BR ou categoria de autolesão de uma API de moderação, se adotada. A API da OpenAI, por exemplo, separa `self-harm`, `self-harm/intent` e `self-harm/instructions` [32].
2. Para quem escreveu: mensagem de acolhimento, sem julgamento, com o 188 (ligação, chat e e-mail) e o 192 para urgência. Nada de diagnóstico. A mensagem nunca diz que o conteúdo "violou regras".
3. Visibilidade: relato pessoal de sofrimento continua visível se não houver risco imediato, com recursos fixados abaixo. Conteúdo que induz ou instrui autolesão é removido na hora. O STF incluiu o induzimento, a instigação e o auxílio ao suicídio ou à automutilação entre os conteúdos que o provedor precisa tornar indisponíveis imediatamente [55].
4. Fora do horário coberto: o conteúdo com gatilho fica oculto do público, o autor continua vendo o próprio post e recebe os recursos, e a revisão humana acontece na abertura do turno.
5. Moderadores não são clínicos: o roteiro de resposta precisa ser escrito com profissional de saúde mental e revisado periodicamente.

Conteúdo sexual envolvendo criança [HIP + DOC]: remoção imediata, preservação de evidência conforme orientação jurídica e comunicação às autoridades. O STF incluiu "crimes sexuais contra pessoas vulneráveis, pornografia infantil e crimes graves contra crianças e adolescentes" no rol de remoção imediata [55]. A documentação da OpenAI pede que não se envie material suspeito de abuso sexual infantil à API de moderação [32]. Se o app for classificado na categoria "Social" do Google Play, a política de padrões de segurança infantil exige padrões publicados contra abuso e exploração sexual infantil, canal de retorno dentro do app, tratamento de material de abuso, cumprimento da lei e ponto de contato [3]. A política vale com ou sem crianças entre os usuários [3].

### 1.6 Operação mínima no MVP [HIP]

- **Quem modera:** equipe do produto mais uma ou duas pessoas treinadas em meio período, sem voluntários no começo. O papel de moderador não dá acesso a nenhum dado de família ou criança.
- **Prazos propostos (a validar no piloto):** crise e criança, triagem em até 1 hora dentro do horário coberto; demais denúncias, em até 24 horas. Referência: o Mumsnet declarou ao Parlamento britânico ter equipe profissional de moderação 7 dias por semana, 365 dias por ano, com tempo médio de resposta de 1h26 e mais da metade das denúncias respondidas em menos de 15 minutos [48]. Um MVP não alcança esse nível; a compensação vem de horário publicado, ocultação automática fora do turno, revisão prévia das contas novas e ausência de tempo real.
- **Horário:** publicar a cobertura (por exemplo, todos os dias, das 8h às 22h). Fora dela valem as regras automáticas da seção 1.5 e a ocultação provisória após várias denúncias de contas com histórico.
- **Ferramentas mínimas:** painel web com fila, contexto, ações, histórico do autor, modelos de mensagem, auditoria e exportação de evidência; roteiro de crise; métricas (tempo até a primeira ação, volume por motivo, reversões em apelação).
- **Transparência:** relatório periódico simples. O STF prevê autorregulação com sistema de notificações, devido processo e relatórios anuais de transparência [55].

### 1.7 Lojas: requisitos para conteúdo gerado por usuários [DOC]

| Loja | Versão consultada | Exigências |
| --- | --- | --- |
| Apple, App Review Guidelines 1.2 | "Last Updated: October 16, 2026" [1] | Método para filtrar material ofensivo; mecanismo de denúncia com resposta em tempo hábil; bloqueio de usuários abusivos; contato publicado [1]. Remover conteúdo que viole as regras é responsabilidade do desenvolvedor, e falha recorrente pode levar à remoção do app [1]. A seção 1.4.1 pede lembrar o usuário de consultar o médico antes de decisões médicas [1] |
| Google Play, política de UGC | Página da Central de Políticas, sem data de versão visível (consultada em 22/10/2026) [2] | Aceite dos termos antes de publicar; definição do conteúdo proibido; moderação contínua com denúncia e bloqueio de conteúdo e de usuários dentro do app; bloqueio obrigatório em recursos 1:1 [2]. Falhar continuamente em tratar reclamações é violação [2] |
| Google Play, padrões de segurança infantil | FAQ consultado em 22/10/2026 [3] | Vale para apps nas categorias "Social" e "Dating" e para chats anônimos ou aleatórios [3]. A categoria declarada (por exemplo, "Parenting" ou "Social") define se a política se aplica; adotar esses padrões mesmo fora do escopo é prudente [HIP] |

Contexto jurídico brasileiro, só sinalizado aqui e sem análise: (a) no julgamento finalizado em 26/06/2025, o STF declarou o art. 19 do Marco Civil parcialmente inconstitucional e fixou deveres de remoção e autorregulação [55]; (b) o ECA Digital (Lei 15.211/2025) vale para serviços digitais direcionados a crianças e adolescentes ou que possam ser acessados por eles [56]. O impacto nos dois casos fica com o agente de privacidade, legal e lojas e com o jurídico.

### 1.8 Ferramentas de referência (sem escolher stack)

Preços em USD, fotografia de 22/10/2026, sem impostos. Consolidar em [Preços datados](Tecnologias/Precos_Datados.md).

| Ferramenta | O que faz | Preço ou condição | Privacidade e encaixe [HIP, salvo citação] |
| --- | --- | --- | --- |
| OpenAI Moderation (`omni-moderation-latest`) | Classifica texto e imagem; não classifica áudio | Gratuita [32] | Pela tabela de controles de dados, `/v1/moderations` não usa dados para treino e não retém registros de monitoramento de abuso [37]. Ainda assim é um terceiro no exterior: exige base legal e contrato |
| Azure AI Content Safety | Texto e imagem | Gratuito até 5 mil registros de texto e 5 mil imagens por mês; plano Standard a US$ 0,38 por mil registros de texto (até 1.000 caracteres cada) e US$ 0,75 por mil imagens [34] | Avaliar a região de processamento e os termos |
| Google Cloud Natural Language, Text Moderation | Categorias de dano em texto [35] | Unidade de 100 caracteres [35]; a tabela mostra faixa gratuita até 50 mil unidades e US$ 5,00 na faixa seguinte. Confirmar a unidade de cobrança na calculadora | Idem |
| Amazon Rekognition (`DetectModerationLabels`, Grupo 2) | Moderação de imagem | O exemplo oficial do Grupo 2 cobra US$ 0,0010 por imagem no primeiro milhão [39] | Só se houver imagens (etapa 2) |
| Perspective API (Jigsaw) | Toxicidade em texto | Encerramento anunciado: o serviço termina depois de 2026, sem suporte à migração [33] | Não adotar |
| Discourse | Software de fórum | Licença GPL v2.0 ou posterior [38]. Hospedagem gerenciada: Pro a US$ 100/mês (5 vagas para equipe, plugin DiscourseConnect) e Business a US$ 500/mês (SSO OpenID/OAuth2); há plano Free com 2 vagas para equipe [36] | Útil como referência de funções (níveis de confiança, sinalização). Integrá-lo num app nativo significa WebView ou cliente próprio via API, além de outra base de dados para separar da família. No MVP, um módulo próprio mínimo de tópico, resposta e denúncia parece mais coerente; decisão com o agente de arquitetura |
| Stream Chat | Chat em tempo real | Plano Build gratuito (1.000 MAU); Start a US$ 399/mês no plano anual ou US$ 499 no mensal, para 10 mil MAU, com moderação e filtros avançados [41] | Só a partir da etapa 4 |
| Sendbird Chat | Chat em tempo real | Starter (5 mil MAU) a US$ 349/mês no plano anual ou US$ 399 no mensal; a página lista recursos como filtro de palavrões (disponibilidade por plano a conferir) [42] | Só a partir da etapa 4 |
| LiveKit Cloud | Salas de áudio e vídeo (WebRTC) | Build a US$ 0 com 5 mil minutos WebRTC; Ship a partir de US$ 50/mês com 150 mil minutos e depois US$ 0,0005 por minuto [43] | Etapa 3 |
| Agora RTC | Voz, vídeo e transmissão ao vivo [44] | A partir de US$ 0,59 por mil minutos; 10 mil minutos gratuitos por mês [44] | Etapa 3 |

### 1.9 Filtro por fase sem revelar a data de nascimento [HIP]

1. A data de nascimento fica só no espaço da família. O cliente calcula localmente uma **faixa larga** ("0–3 meses", "4–6 meses", "7–12 meses", "1–2 anos") e envia à comunidade apenas a faixa. O serviço da comunidade nunca recebe a data.
2. A faixa é **etiqueta opcional por tópico**, congelada no momento da publicação e editável ou removível pelo autor. Uma faixa que se atualizasse sozinha permitiria inferir a data pelas mudanças.
3. O filtro "minha fase" é calculado no aparelho e funciona como preferência de leitura, sem virar atributo público do perfil.
4. Grupos por mês e ano de nascimento, como os do What to Expect [46], revelam mais. Se surgirem grupos por período, usar janelas largas (trimestre ou semestre) e só com volume.
5. Idade corrigida de prematuro é informação sensível: usar apenas no cálculo local, nunca exibir na comunidade.
6. Mídia, a partir da etapa 2: remover EXIF e localização no aparelho antes do envio (as coordenadas ficam gravadas em cada foto [57]), recodificar a imagem, guardar num repositório próprio da comunidade, separado dos anexos da família, servir por URL assinada e nunca reaproveitar automaticamente anexos de registros familiares.

---

## Parte 2 — Tummy time, atividades e ciclo editorial

### 2.1 O que as fontes dizem sobre tummy time [DOC]

| Fonte (versão) | Início | Frequência e duração | Supervisão e sono | Quando procurar profissional |
| --- | --- | --- | --- | --- |
| AAP, recomendações de sono seguro de 2022 (Pediatrics) [23] | Logo após a alta, em períodos curtos [23] | Aumentar aos poucos: "at least 15 to 30 minutes total daily by 7 weeks of age" [23] | Acordado e supervisionado; "Back to sleep for every sleep" [23] | Não trata disso. No texto extraído da Tabela 2, o item aparece no bloco de nível A; conferir na versão formatada. A AAP observa que não há ensaios randomizados sobre morte súbita, e que estudos caso-controle são a melhor evidência disponível [23] |
| HealthyChildren.org (AAP, atualizado em 08/09/2026; no site, "9/8/2026") [10] | No dia em que o bebê chega em casa [10] | 2 a 3 vezes ao dia, 3 a 5 minutos; aumentar conforme o bebê mostra que gosta, até 15 a 30 minutos por dia com 7 semanas [10] | "Closely supervised"; dormir de costas, inclusive em sonecas [10] | Alguns bebês não gostam no início [10]; não substitui o pediatra [10] |
| CDC, Learn the Signs. Act Early. (2, 4 e 6 meses; atualizado em 16/5/2026) [11][61][62] | Não fixa | Sem minutos | Bebê de bruços acordado, com brinquedos na altura dos olhos; nunca sozinho; se ficar sonolento, colocar de barriga para cima em local de sono seguro [11] | Marcos são o que 75% ou mais das crianças fazem até certa idade [11]: 2 meses, segura a cabeça de bruços [11]; 4 meses, apoia-se nos antebraços [61]; 6 meses, rola de barriga para baixo para cima e apoia-se com braços estendidos [62]. Não substituem triagem validada; se o bebê não atinge marcos, perde habilidades ou há preocupação, "act early" e conversar com o médico [11] |
| NHS (última revisão em 9/3/2023; próxima prevista para 9/3/2026) [12] | Desde o nascimento, sobre o peito do adulto, se o adulto estiver bem acordado [12] | "Little and often" no início, aumentando dia a dia; sem número [12] | Só com o bebê acordado e alerta, e um adulto olhando [12] | Não trata disso. Em 22/10/2026, a data de revisão prevista já tinha passado |
| OMS, diretriz de 2019 [21][20] | Não fixa | Para quem ainda não se locomove: pelo menos 30 minutos de bruços por dia, distribuídos, acordado [21]; não ficar contido por mais de 1 hora seguida [20] | Acordado [21] | Recomendação forte ("strong recommendation"), com qualidade geral da evidência "very low" (GRADE) em atividade física [21]. Benefícios: desenvolvimento motor e menor chance de plagiocefalia [21]. Cerca de 30% dos bebês em estudos do Canadá e da Austrália já cumpriam a recomendação [21] |
| Pathways.org [13] | Quando o bebê chega do hospital [13] | Sessões de 2 a 5 minutos algumas vezes por dia; ao menos 15 a 30 min/dia aos 2 meses e ao menos 60 min/dia aos 6 meses; "More is always better" [13] | Parar se o bebê se irritar; se adormecer, virar de barriga para cima [13] | Se o bebê não atinge as habilidades esperadas ou não tolera o tummy time de forma persistente, conversar com o profissional de saúde [13] |
| SBP, Departamento Científico de Medicina do Sono [14][15] | Não fixa | "Não há consenso [...] qual o tempo e a frequência" [14]; a nota que resume a AAP 2022 menciona "30 minutos com sete semanas de vida" [15] | Posição prona acordada e supervisionada [14]; dormir de barriga para cima sempre, até completar um ano [15] | Não trata disso |
| SPSP (filiada à SBP) [16][17] | Períodos curtos após a alta [16] | Até 15 a 30 minutos por dia a partir de sete semanas [16] | Sempre acordado e supervisionado [16]; "Quando o bebê chorar, deve-se mudar a atividade" [17] | Não trata disso |
| Ministério da Saúde, Guia de Atividade Física (2021, descrito na RBAFS) [19] | Não fixa | Até 1 ano: pelo menos 30 min/dia de barriga para baixo, distribuídos [19] | Não detalhado no trecho | Qualidade das evidências "de baixa a moderada", segundo o quadro de justificativas [19] |
| Ministério da Saúde, Guia de Intervenção Precoce de 0 a 3 anos (minuta em consulta pública, 2025) [18] | "desde o primeiro mês de vida" [18] | 0–3 e 4–11 meses: no mínimo 30 min/dia distribuídos, enquanto acordado [18] | Acordado e supervisionado [18] | É documento preliminar; a versão final não foi verificada |
| Caderneta da Criança, 7ª edição revisada (2025) [60] | — | — | — | Edição listada pelo Ministério [60]. O PDF no BVS foi bloqueado nesta sessão (HTTP 503), e o conteúdo não foi conferido |

### 2.2 Divergências entre fontes

1. **Quantidade:** AAP, 15 a 30 min/dia até 7 semanas [23]. OMS e Ministério da Saúde, 30 min/dia ou mais para quem ainda não se locomove [21][18]. Pathways, 60 min/dia ou mais aos 6 meses, com o lema "more is always better" [13]. NHS, nenhum número [12]. SBP, sem consenso [14].
2. **O que conta como tummy time:** a AAP sugere deitar o bebê sobre o peito do adulto como brincadeira de bruços [10], e o NHS começa pelo peito [12]. A definição da OMS fala em estar de bruços acordado "with unrestricted movement of limbs" [21]. Somar o tempo no colo como tummy time é uma escolha de produto que precisa de revisão profissional [HIP].
3. **Força da evidência:** a OMS faz recomendação forte com evidência muito baixa [21]; o Guia brasileiro registra evidência de baixa a moderada [19]; a SBP não fixa tempo [14].
4. **Consequência para o produto [HIP]:** não escolher um número como meta. Se o app mostrar referência, mostrar a faixa, a fonte e o contexto, e não usar a referência para calcular atraso.

### 2.3 O que não pode virar meta ou cobrança [HIP]

- Minutos por dia como objetivo, anel de progresso, sequência de dias (streak), selo de duração ou "você não cumpriu hoje".
- Comparação entre bebês ou famílias, ranking ou percentil, na comunidade ou nas atividades.
- Marcos como prova de aprovação ou reprovação, ou a palavra "atrasado". Para o CDC, marcos são o que 75% ou mais das crianças fazem, e as listas não substituem triagem [11].
- Lembrete com tom de culpa. Lembretes, se existirem, são opcionais e neutros ("quer registrar o tummy time de agora?").
- Horas de sono "recomendadas" como meta diária.
- Em vez disso: registro opcional, resumo neutro ("hoje: 3 sessões, 12 min no total") e lembrete de parar se o bebê se incomodar [13][17]. A seção "quando conversar com o pediatra ou a UBS" fica separada, em tom neutro e baseada nas fontes [11][13].

### 2.4 Sono seguro na experiência de tummy time [HIP, derivado de DOC]

- O temporizador mostra o texto fixo: "Só com o bebê acordado e um adulto olhando. Se ele ficar com sono, coloque de barriga para cima no berço." Base: [11][13][10].
- Nenhum recurso, texto ou imagem sugere dormir de bruços. Fotos e ilustrações próprias não mostram travesseiros ou objetos soltos no berço, seguindo as recomendações de ambiente de sono [10][15].
- Encerramento por qualquer cuidador e registro retrospectivo seguem o modelo de sessão do D5; não pertencem a esta nota.

### 2.5 Licenciamento de conteúdo por fonte

| Fonte | Citar e linkar | Reproduzir texto | Imagens e vídeos | Observações |
| --- | --- | --- | --- | --- |
| AAP / HealthyChildren.org | Sim [HIP: citação curta com fonte] | Não sem permissão prévia por escrito [29] | Não sem permissão [29] | Os termos também proíbem usar o conteúdo com ferramentas de IA sem permissão expressa [29] |
| CDC | Sim; o CDC prefere link a republicação [24] | A maior parte é domínio público, com condições: atribuir, avisar que não há endosso, não mudar o conteúdo substantivo e informar que o material está disponível gratuitamente [24] | Algumas imagens e recursos de terceiros têm restrição; o logo do CDC exige permissão [24] | Na personalização do LTSAE, não editar os marcos e não usar logos CDC ou HHS [25] |
| NHS | Sim | Licença OGL v3.0, inclusive para uso comercial, com regras de atribuição e atualização [26] | Imagens e dados pessoais (pessoas identificáveis) ficam fora da OGL [26] | Tradução conta como adaptação: o conteúdo adaptado não pode ser atribuído ao NHS [26], e a adaptação pode invalidar a aprovação clínica [26] |
| OMS (diretriz de 2019) | Sim | Licença CC BY-NC-SA 3.0 IGO: só uso não comercial, com citação e compartilhamento pela mesma licença [21][22] | Uso do logo da OMS não permitido [21] | Se o app for comercial, não reproduzir; reescrever com citação [HIP] |
| Pathways.org | Sim | Uso pessoal não comercial; nenhum uso com fins lucrativos sem aprovação escrita [27]; formulário de permissão [28] | Idem [27] | A Pathways declara que seus marcos se baseiam em CDC e AAP e passam por revisão de especialistas [28] |
| SBP | Sim | "Todos os direitos reservados" [31]; pedir permissão | Idem | — |
| Ministério da Saúde / gov.br | Sim | A página do portal traz "©2025 - Ministério da Saúde \| Todos os direitos reservados" [7]. Publicações costumam ter licença própria na ficha catalográfica; conferir obra a obra [HIP] | Idem | O artigo da RBAFS que descreve o Guia de Atividade Física é CC BY 4.0 [19] |

Regras propostas [HIP, confirmar com jurídico]:

1. **Sempre:** linkar a fonte, citar trecho curto entre aspas com autoria e data e registrar a versão e a data da fonte no conteúdo.
2. **Fatos e recomendações** (por exemplo, "30 minutos por dia, distribuídos") podem ser reescritos em texto próprio com citação. A expressão (texto, ilustração, diagramação, vídeo) só com licença.
3. **Produção própria obrigatória** para: texto em pt-BR das telas e artigos, ilustrações de posições, vídeos, roteiros de atividades e mensagens de crise. Tudo passa por revisão de profissional com registro no conselho.
4. **Não usar** logos, ilustrações ou vídeos de terceiros sem licença escrita, nem "traduzir e publicar" material da AAP, da Pathways ou da OMS num app comercial.

### 2.6 Ciclo editorial proposto [HIP]

Exemplos de mercado: o NHS exibe "Page last reviewed" e "Next review due" [12], e o CDC exibe datas de publicação, atualização e revisão por especialistas [11]. O HealthyChildren revisa todo o conteúdo periodicamente, impede que revisores com conflito de interesse revisem o artigo e submete traduções a pediatras nativos no idioma [30].

Etapas: pauta → rascunho (autor) → checagem de fontes → revisão técnica por profissional credenciado e sem conflito declarado → revisão de linguagem (pt-BR simples, sem culpa, sem jargão) → aprovação editorial → publicação com número de versão → acompanhamento (botão "reportar erro no conteúdo") → revisão na data prevista → correção ou retirada → histórico.

Níveis de correção:

| Nível | Exemplo | Ação |
| --- | --- | --- |
| Crítica (segurança) | Texto que contradiz o sono de barriga para cima | Retirar na hora; o aparelho processa a lista de retirada antes de qualquer outra atualização; aviso ao usuário |
| Importante | Faixa etária errada ou fonte desatualizada | Nova versão com nota de mudança |
| Menor | Erro de digitação | Nova versão menor, sem aviso |

Campos mínimos de um item de conteúdo:

| Campo | Observação |
| --- | --- |
| `id` | Estável entre versões |
| `versao` | Inteiro crescente ou semver; mais `versao_anterior` |
| `status` | rascunho, em revisão, aprovado, publicado, retirado |
| `tipo` | artigo, atividade, dica de segurança, roteiro de crise |
| `titulo`, `resumo`, `corpo` | Markdown restrito, sem HTML arbitrário |
| `idioma`, `localidade` | pt-BR, BR |
| `faixa_etaria_inicio_dias`, `faixa_etaria_fim_dias` | Janelas sobrepostas; nunca "deve fazer até" |
| `considera_idade_corrigida` | Booleano, com texto revisado |
| `temas` | Ligam o item aos espaços da comunidade |
| `autores` | Nome e função |
| `revisores` | Nome, profissão, conselho, UF e número do registro, data da revisão, declaração de conflito |
| `fontes` | Organização, título, URL, versão ou data da fonte, data de consulta e tipo (diretriz, consenso, documento oficial) |
| `licenca_texto`, `licencas_midia` | Produção própria, CC ou permissão, com créditos por mídia |
| `aviso_de_limites` | Ex.: "não substitui consulta" |
| `avisos_de_seguranca` | Ex.: "somente acordado e supervisionado" |
| `publicado_em`, `revisado_em`, `proxima_revisao` | Mostrar "revisão vencida" internamente quando passar a data |
| `nota_de_mudanca`, `nivel_de_correcao` | Histórico legível |
| `retirado_em`, `motivo_retirada` | Lápide visível offline depois da sincronização |
| `midias` | id, texto alternativo, transcrição, checksum, créditos |
| `hash_conteudo` | Integridade do pacote |

Versionamento offline [HIP]:

1. Pacote de conteúdo com manifesto (versão do pacote, versão mínima do app, lista de itens com `id`, `versao` e `hash`, mais a lista de retirada), assinado pelo backend. A primeira versão vem embutida no app para uso sem rede.
2. Na sincronização, o app baixa o manifesto (com cache condicional), processa primeiro a lista de retirada, depois as atualizações por diferença, e mantém a última versão íntegra se a atualização falhar.
3. Cada item mostra "versão N, revisado em DD/MM/AAAA" e as fontes.
4. O conteúdo editorial fica somente leitura no aparelho e separado dos dados da família. Atividades marcadas como feitas guardam `id` e `versao` do conteúdo usado.
5. Comparar com o Bebbo, que oferece acesso offline a conteúdo; ver [Bebbo](Repositorios/Bebbo.md).

### 2.7 Atividades por fase sem competição [HIP]

- Apresentar como "ideias para brincar nesta fase", em janelas que se sobrepõem, sem lista de tarefas. Nada de pontos, porcentagem concluída ou "atrasado".
- Linguagem de cuidado, baseada nas fontes: mudar a atividade se o bebê chorar [17]; parar se ele se irritar [13]; ler o humor do bebê e fazer uma pausa para consolar quando ele estiver chateado [62].
- Registro opcional ("fizemos"), sem sequências. O histórico é visível só para a família e pode ser ocultado.
- A seção "quando conversar com o profissional" fica separada das atividades e usa a formulação do CDC e da Pathways [11][13], com encaminhamento ao pediatra ou à UBS e ao SAMU 192 para urgência [6].
- Ligação com tummy time e comunidade sem expor dados:
  - da atividade para "ver conversas sobre este tema": abre a comunidade filtrada por tema e, se a pessoa quiser, pela faixa calculada no aparelho (seção 1.9);
  - da comunidade para "salvar ideia": copia a sugestão para a lista da família, sem vínculo com o autor;
  - da rotina para a comunidade: só por um editor explícito, com prévia de exatamente o que será publicado. Números da rotina nunca são anexados automaticamente, e por padrão nada é incluído;
  - o perfil público não tem nenhum link para o bebê nem para a família.
- O espaço "Tummy time" da comunidade tem um tópico fixado com o conteúdo revisado e o aviso de sono seguro.

### 2.8 Estimativas de sono (fora do escopo principal)

- A OMS cita 14 a 17 horas (0–3 meses) e 12 a 16 horas (4–11 meses) de sono de boa qualidade, incluindo sonecas [20]. A minuta do Ministério da Saúde repete essas faixas [18].
- A AASM recomenda 12 a 16 horas para 4–12 meses e não faz recomendação para menores de 4 meses, por causa da grande variação normal e da evidência insuficiente [58]. Essa é uma divergência para a faixa de 0–3 meses.
- Premissas para qualquer estimativa no app [HIP]: mostrar faixa populacional com fonte, nunca meta; previsão de soneca só como estimativa baseada no histórico registrado, com aviso de que registros faltando e variações individuais afetam o resultado; nenhum alarme baseado em total de horas; sem promessa clínica.

## Fontes

Todas consultadas em 22/10/2026.

- [1] Apple — App Review Guidelines (Last Updated: October 16, 2026). <https://developer.apple.com/app-store/review/guidelines/>
- [2] Google Play Console Help — User Generated Content (política). <https://support.google.com/googleplay/android-developer/answer/9876937?hl=en>
- [3] Google Play Console Help — Learning more about our Child Safety Standards policy. <https://support.google.com/googleplay/android-developer/answer/14747720?hl=en>
- [4] CVV — Ligue 188. <https://cvv.org.br/ligue-188-3/>
- [5] CVV — O CVV (quem somos). <https://cvv.org.br/o-cvv/>
- [6] Ministério da Saúde — Serviço de Atendimento Móvel de Urgência (SAMU 192). <https://www.gov.br/saude/pt-br/composicao/saes/samu-192>
- [7] Ministério da Saúde — Depressão pós-parto (Saúde de A a Z). <https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/d/depressao-pos-parto>
- [8] gov.br — Denunciar violação de direitos humanos (Disque 100). <https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos>
- [9] Ministério das Mulheres — Ligue 180, Central de Atendimento à Mulher. <https://www.gov.br/mulheres/pt-br/ligue180>
- [10] HealthyChildren.org (AAP) — Back to Sleep, Tummy to Play (Last Updated 9/8/2026). <https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/back-to-sleep-tummy-to-play.aspx>
- [11] CDC — Important Milestones: Your Baby By Two Months (Learn the Signs. Act Early.). <https://www.cdc.gov/act-early/milestones/2-months.html>
- [12] NHS — How to keep your baby or toddler active. <https://www.nhs.uk/baby/babys-development/play-and-learning/keep-baby-or-toddler-active/>
- [13] Pathways.org — Tummy Time: Essential Guide for Parents. <https://pathways.org/topics-of-development/tummy-time>
- [14] SBP — Documento Científico 'Síndrome da Morte Súbita do Lactente' (Departamento Científico de Medicina do Sono). <https://www.sbp.com.br/fileadmin/user_upload/20226d-DocCient_-_Sindrome_Morte_Subita_do_Lactente.pdf>
- [15] SBP — Nota de Alerta 'Recomendações da AAP sobre sono seguro em menores de um ano' (DC Medicina do Sono, gestão 2022-2024). <https://www.sbp.com.br/fileadmin/user_upload/23990b-NotaAlerta-Recomend_AAP_SonoSeguro_1ano.pdf>
- [16] SPSP (filiada à SBP) — Atualize-se, Segurança Infantil (DC Segurança). <https://www.spsp.org.br/publicacao/AtualizeA11N1.pdf>
- [17] SPSP — Documento Científico sobre atividade física e estímulos por idade. <https://spsp.org.br/PDF/AtividadeFi%CC%81sicacompletookgrupo1junho.pdf>
- [18] Ministério da Saúde — Guia de Intervenção Precoce: de 0 a 3 anos (documento preliminar/minuta em consulta pública, 2025). <https://www.gov.br/saude/pt-br/acesso-a-informacao/participacao-social/consultas-publicas/2025/guia-de-intervencao-precoce-de-0-a-3-anos-de-idade/documento-preliminar-minuta>
- [19] RBAFS 2021 — Atividade física para crianças até 5 anos: Guia de Atividade Física para a População Brasileira (DOI 10.12820/rbafs.26e0213). <https://rbafs.org.br/RBAFS/article/download/14563/11171/57773>
- [20] OMS — To grow up healthy, children need to sit less and play more (24/04/2019). <https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more>
- [21] OMS (2019) — Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age (PDF, IRIS). <https://iris.who.int/server/api/core/bitstreams/60a1cbaa-2bef-4251-9557-e52ce22112b3/content>
- [22] OMS IRIS — registro da diretriz 2019 (licença CC BY-NC-SA 3.0 IGO). <https://iris.who.int/items/677e3562-1deb-48ec-bb1e-4bc8aad3ea09>
- [23] AAP (Moon, Carlin, Hand) — Sleep-Related Infant Deaths: Updated 2022 Recommendations (Pediatrics 2022;150(1):e2022057990). <https://publications.aap.org/pediatrics/article/150/1/e2022057990/188304/Sleep-Related-Infant-Deaths-Updated-2022>
- [24] CDC — Use of Agency Materials. <https://www.cdc.gov/other/agencymaterials.html>
- [25] CDC — Learn the Signs. Act Early.: Customization, Translations, and Ordering Online. <https://www.cdc.gov/act-early/resources/customization.html>
- [26] NHS website — Terms and conditions (licença OGL v3.0 e regras de reuso). <https://www.nhs.uk/our-policies/terms-and-conditions/>
- [27] Pathways.org — Terms of Use. <https://pathways.org/terms-of-use>
- [28] Pathways.org — Baby Experts Page (uso de conteúdo e revisão). <https://pathways.org/baby-experts-page>
- [29] AAP — Terms of Use (aplicável ao HealthyChildren.org). <https://www.aap.org/en/pages/terms-of-use/>
- [30] HealthyChildren.org — Editorial Policy. <https://www.healthychildren.org/English/Pages/Editorial-Policy.aspx>
- [31] SBP — portal (rodapé de direitos autorais). <https://www.sbp.com.br/>
- [32] OpenAI API — Moderation guide (omni-moderation-latest). <https://developers.openai.com/api/docs/guides/moderation>
- [33] Perspective API (Jigsaw/Google) — FAQ / aviso de encerramento. <https://www.perspectiveapi.com/faq/>
- [34] Microsoft Azure — Content Safety pricing. <https://azure.microsoft.com/en-us/pricing/details/content-safety/>
- [35] Google Cloud — Natural Language API pricing (Text Moderation). <https://cloud.google.com/natural-language/pricing>
- [36] Discourse — hosting plans (preços). <https://www.discourse.org/pricing>
- [37] OpenAI API — Data controls in the OpenAI platform. <https://developers.openai.com/api/docs/guides/your-data>
- [38] Discourse — repositório GitHub (licença). <https://github.com/discourse/discourse>
- [39] AWS — Amazon Rekognition pricing. <https://aws.amazon.com/rekognition/pricing/>
- [40] Discourse Blog — Understanding Discourse Trust Levels (2018). <https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/>
- [41] Stream — Chat pricing. <https://getstream.io/chat/pricing/>
- [42] Sendbird — Chat pricing. <https://sendbird.com/pricing/chat>
- [43] LiveKit Cloud — pricing. <https://livekit.io/pricing>
- [44] Agora — pricing overview. <https://www.agora.io/en/pricing/>
- [45] What to Expect — Community Guidelines. <https://www.whattoexpect.com/community-guidelines>
- [46] What to Expect — Help/FAQ (comunidade e grupos por mês de nascimento). <https://www.whattoexpect.com/home/help-landing.aspx>
- [47] Mumsnet — Talk Guidelines. <https://www.mumsnet.com/i/netiquette>
- [48] UK Parliament — Written Evidence Submitted by Mumsnet (OSB0031), Draft Online Safety Bill. <https://committees.parliament.uk/writtenevidence/39118/pdf/>
- [49] Mumsnet — Webchats & Live Events (fórum de Q&A). <https://www.mumsnet.com/talk/mumsnet_live_events>
- [50] TechCrunch (27/04/2021) — Social networking app for women, Peanut, adds live audio rooms. <https://techcrunch.com/2021/04/27/social-networking-app-for-women-peanut-adds-live-audio-rooms/>
- [51] The Santa Clara Principles on Transparency and Accountability in Content Moderation (2.0). <https://santaclaraprinciples.org/>
- [52] Niela-Vilén et al. (2014) — Internet-based peer support for parents: A systematic integrative review (Int J Nurs Stud). <https://www.sciencedirect.com/science/article/abs/pii/S0020748914001667>
- [53] Salazar de Pablo & Scott (KCL, rev. out/2025) — Hazards of Online Advice for Parents of Young Children: A Scoping Review (preprint). <https://www.kcl.ac.uk/ioppn/assets/hazards-of-online-parenting-kcl-revision-9-october-2025-1-002.pdf>
- [54] Fortune (28/04/2023) — Clubhouse cuts more than half its staff. <https://fortune.com/2023/04/28/clubhouse-layoffs-cuts-more-than-half-its-staff/>
- [55] STF — Julgamentos de especial relevância 2025: responsabilidade de plataformas (art. 19 do Marco Civil), julgamento finalizado em 26/06/2025. <https://portal.stf.jus.br/textos/verTexto.asp?servico=jurisprudenciaPesquisaGeral&pagina=casos_notorios_2025>
- [56] Ministério da Justiça — ECA Digital (Lei 15.211/2025). <https://www.gov.br/mj/pt-br/assuntos/sua-protecao/sedigi/eca-digital/eca-digital-1>
- [57] Apple Support — Manage location metadata in Photos (Personal Safety User Guide). <https://support.apple.com/guide/personal-safety/manage-location-metadata-in-photos-ips0d7a5df82/web>
- [58] AASM (Paruthi et al., J Clin Sleep Med 2016) — Recommended Amount of Sleep for Pediatric Populations. <https://aasm.org/resources/pdf/pediatricsleepdurationconsensus.pdf>
- [59] AAP Center of Excellence on Social Media — Sharing Photos and Videos of Children on Social Media ('Sharenting'). <https://www.aap.org/en/patient-care/media-and-children/center-of-excellence-on-social-media-and-youth-mental-health/qa-portal/qa-portal-library/qa-portal-library-questions/sharing-photos-and-videos-of-children-on-social-media/>
- [60] Ministério da Saúde/SAPS — Cadernetas e Cartões (lista de edições da Caderneta da Criança). <https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/cadernetas-e-cartoes>
- [61] CDC — Important Milestones: Your Baby By Four Months. <https://www.cdc.gov/act-early/milestones/4-months.html>
- [62] CDC — Important Milestones: Your Baby By Six Months. <https://www.cdc.gov/act-early/milestones/6-months.html>

---

## Questões abertas

1. **Idade mínima na comunidade:** exigir 18 anos ou mais, como o What to Expect [45], exclui mães e pais adolescentes. Como conciliar com o ECA Digital [56]? Fica com o agente de privacidade e o jurídico.
2. **Categoria nas lojas:** "Parenting" ou "Social" no Google Play? A escolha define se a política de padrões de segurança infantil se aplica [3].
3. **Operação:** quem modera no piloto, em que horário e com qual orçamento? Os prazos de 1h e 24h são viáveis?
4. **Imagens:** entram só na etapa 2 (recomendação) ou o MVP precisa delas para o tummy time ser útil na comunidade?
5. **Moderação por API de terceiros:** vale o ganho, considerando transferência internacional e contrato de tratamento? Qual provedor?
6. **Conteúdo de sofrimento:** manter visível com recursos ou ocultar até a revisão? O roteiro precisa de profissional de saúde mental.
7. **Profissionais:** verificação manual nos conselhos, remuneração de AMAs e limites éticos. O Código de Ética Médica (Res. CFM 2.217/2018) tem regras sobre consulta e prescrição por meios de comunicação; o portal do CFM não respondeu nesta sessão, e o texto precisa ser conferido.
8. **Caderneta da Criança, 7ª edição revisada (2025):** conferir o texto sobre bebê de bruços e sono, que não foi acessado [60].
9. **Guia de Intervenção Precoce:** saber se a versão final foi publicada e se mudou os 30 min/dia da minuta [18].
10. **Licenças:** pedir permissão à AAP ou à Pathways, ou produzir tudo internamente? Quem revisa (pediatra, fisioterapeuta ou terapeuta ocupacional pediátrico) e com qual credencial?
11. **Tempo no colo:** conta como tummy time no registro? Depende de revisão profissional, por causa da diferença de definição entre as fontes [10][21].

## Limites desta análise

- Fontes consultadas em 22/10/2026; páginas, políticas e preços mudam. Preços em USD, sem impostos nem câmbio.
- Inacessíveis nesta sessão: PDFs do BVS/Ministério da Saúde (Caderneta da Criança 7ª edição e Guia de Atividade Física, bloqueio HTTP 503), portal do CFM (tempo esgotado) e páginas da BabyCenter (extração recusada; tema do agente de concorrentes). O Guia de Atividade Física foi lido pelo artigo da RBAFS que o descreve [19].
- Na AAP 2022, o nível da recomendação de tummy time veio do texto extraído da Tabela 2 [23]; conferir no PDF formatado antes de citar a força da recomendação.
- Esta nota não contém parecer jurídico. As teses do STF [55] e o ECA Digital [56] foram apenas sinalizados.
- Esta nota não contém juízo clínico. Os números foram reportados como cada fonte os apresenta.
- As evidências de produto vêm de documentação e imprensa (TechCrunch, Fortune), não de medição própria. O status atual dos Pods da Peanut não foi verificado.
- A revisão do King's College [53] é preprint.
- A recomendação de formato e as etapas são hipóteses: nenhuma pesquisa com cuidadores foi feita nesta etapa.
