---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-4
adr: ADR-001
fontes_principais:
  - 08_Referencias/Concorrentes/Napper.md
  - 08_Referencias/Concorrentes/Huckleberry.md
  - 08_Referencias/Concorrentes/Baby_Daybook.md
  - 08_Referencias/Concorrentes/Nara_Baby.md
  - 08_Referencias/Concorrentes/Kinedu.md
  - 08_Referencias/Concorrentes/Pathways.md
  - 08_Referencias/Concorrentes/BabyCenter.md
  - 08_Referencias/Concorrentes/Peanut.md
  - 08_Referencias/Pesquisa_Comunidade_e_Conteudo.md
---

# Concorrentes e diferenciais

Síntese das oito fichas de concorrentes, consultadas em 22/10/2026. As fichas usaram só fontes públicas: sites, lojas, centrais de ajuda, políticas de privacidade, blogs e avaliações. Nenhum app foi instalado, nenhuma conta foi criada e não houve engenharia reversa. Por isso, as afirmações sobre os produtos são [DOC] (declarado pelo próprio produto) ou [HIP] (inferência, ausência nas fontes ou relato isolado). Nada aqui é [EXEC]. Os códigos entre colchetes (N01, H05, PW13…) remetem à tabela de fontes da ficha de cada produto.

"Não encontrado" significa ausência nas fontes consultadas, não prova de que o recurso não exista.

## Resumo

- **Nas fontes consultadas, nenhum dos oito cobre os quatro pilares de forma completa.** "Completa" quer dizer "Sim" nos quatro pilares da matriz.
  - O Kinedu é o que mais se aproxima: tem os quatro, mas a rotina e a comunidade são parciais, e o tummy time aparece só em artigo.
  - Nos rastreadores de rotina (Napper, Huckleberry, Baby Daybook, Nara), não foi identificada comunidade no app.
  - Os de comunidade (BabyCenter, Peanut) quase não têm rotina.
  - A Pathways tem rotina parcial.
- **Os mais fortes em cada pilar:**
  - Rotina: Huckleberry e Baby Daybook.
  - Desenvolvimento e tummy time: Pathways (Tummy Timer, widget, idade corrigida) e Kinedu (plano diário de atividades).
  - Comunidade: BabyCenter (grupos por mês de nascimento, moderação em camadas) e Peanut (rede social com salvaguardas).
  - Cuidado compartilhado: Pathways (três níveis de acesso, gratuito) e Kinedu (dois papéis e histórico por membro, pago).
- **Já é básico no mercado:** registro rápido com timer, tummy time registrável (4 dos 8), timer fora do app, sincronização entre cuidadores, exportação e idade corrigida.
- **Lacunas que sustentam diferenciais, ainda como hipóteses:**
  - os pilares integrados num produto só;
  - uma conta por pessoa, com papéis, autoria e passagem de turno;
  - desenvolvimento sem cobrança;
  - comunidade contextual e moderada;
  - offline declarado;
  - privacidade como posição do produto.

## Produtos analisados

| Produto | Foco | Responsável | Plataformas | Português | Modelo de preço (22/10/2026) | Ficha |
| --- | --- | --- | --- | --- | --- | --- |
| Napper | Sono do bebê | Napper AB, Suécia | Android, iPhone, Apple Watch | Sim, com mais 19 idiomas [DOC N05, N06] | Free e Unlimited a US$ 69,99/ano no site. Na App Store dos EUA: Sleep a US$ 14,99/mês e Complete a US$ 19,99/mês [DOC N05, N09] | [Napper](../08_Referencias/Concorrentes/Napper.md) |
| Huckleberry | Rotina completa e previsão de sono | Huckleberry Labs, EUA | Android, iPhone e iPad, Apple Watch | Não; só inglês na App Store [DOC H19] | Free; Plus a US$ 11,99/mês; Premium a US$ 14,99/mês [DOC H01, H02] | [Huckleberry](../08_Referencias/Concorrentes/Huckleberry.md) |
| Baby Daybook | Rotina configurável | BALTAPIS UAB, Lituânia | Android, Wear OS, iPhone, Apple Watch, Mac | Sim, entre 40 idiomas [DOC B07] | Grátis com anúncios; Premium de US$ 1,99 a 9,99/mês ou vitalício [DOC B07, B08] | [Baby Daybook](../08_Referencias/Concorrentes/Baby_Daybook.md) |
| Nara Baby | Rotina do bebê e cuidado da mãe | Nara Organics, EUA, que vende fórmula infantil | Android, iPhone, Apple Watch | Não confirmado; só inglês na App Store [DOC R04] [HIP R09] | US$ 9,99/mês ou US$ 99,99 vitalício; sem assinatura, a família fica só com leitura [DOC R02] | [Nara Baby](../08_Referencias/Concorrentes/Nara_Baby.md) |
| Kinedu | Desenvolvimento por atividades | Kinedu, EUA e México | iPhone, iPad, Android | Sim [DOC KN02] | Teste de 7 dias; cerca de US$ 7/mês no site; gratuito limitado [DOC KN01, KN02] | [Kinedu](../08_Referencias/Concorrentes/Kinedu.md) |
| Pathways.org | Marcos, atividades e tummy time | Pathways Foundation, ONG dos EUA | iPhone, Android, web | Parcial; contagens divergentes e folhetos em pt-BR [DOC PW05, PW20] | Gratuito, sem paywall; curso de tummy time à parte por US$ 20 [DOC PW05, PW17] | [Pathways](../08_Referencias/Concorrentes/Pathways.md) |
| BabyCenter | Conteúdo e comunidade, foco em gravidez | BabyCenter (Ziff Davis), EUA; site brasileiro próprio | iPhone, Android, web | Sim [DOC BC01, BC13] | Gratuito com anúncios e programa de pontos com marcas [DOC BC01] | [BabyCenter](../08_Referencias/Concorrentes/BabyCenter.md) |
| Peanut | Rede social de mães | Peanut App Limited | iPhone, Android | Sim; no Brasil desde 01/2025 [DOC PN01, PN19] | Gratuito; Peanut Plus de US$ 8,99 a 29,99 [DOC PN01] | [Peanut](../08_Referencias/Concorrentes/Peanut.md) |

Os preços são das lojas dos EUA, salvo indicação, e mudam com frequência.

## Matriz por pilar

| Produto | Rotina | Desenvolvimento e tummy time | Comunidade | Cuidado compartilhado |
| --- | --- | --- | --- | --- |
| Napper | **Sim.** Agenda de sono recalculada, 10 categorias de registro, registro retroativo [DOC N01, N02] | **Parcial.** Curso de sono e blog; tummy time não encontrado [DOC N02] [HIP] | Não encontrada [DOC/HIP N07] | **Sim, sem papéis.** Convite por QR code; bebê e assinatura compartilhados [DOC N02, N05, N13] |
| Huckleberry | **Sim, o mais completo.** Previsão SweetSpot no plano pago [DOC H02, H19] | **Sim.** "Activities" com timer de tummy time; marcos do CDC com idade corrigida [DOC H05, H08] | Não encontrada no app; conversa num subreddit externo [HIP H24] | **Parcial.** A família entra com a mesma conta; um cuidador inicia e outro encerra [DOC H12, H13] |
| Baby Daybook | **Sim.** Widgets, Live Activities, notificação fixa no Android, Wear OS [DOC B03, B04, B07] | **Parcial.** Tummy time como atividade personalizada; curvas OMS/CDC com idade corrigida [DOC B06, B07] | Não encontrada [HIP] | **Sim, no Premium.** Lista de cuidadores, sem papéis [DOC B01, B02] [HIP] |
| Nara Baby | **Sim.** Timers, Live Activities no iOS, alerta de timer acima de 24 h [DOC R02, R04] | **Parcial.** Tummy time como "rotina"; marcos do CDC; guias AAP/CDC sem autor nomeado [DOC R02, R04] [HIP] | Não encontrada [DOC R04] | **Sim, com acesso total.** Convite por e-mail, uma conta por pessoa, várias famílias por conta [DOC R02] |
| Kinedu | **Parcial.** Sono, mamada e fralda, com previsão [DOC KN01, KN02] | **Sim.** Plano diário em vídeo, 414 marcos em 4 áreas; tummy time só em artigo, sem timer [DOC KN06, KN09, KN13] [HIP] | **Parcial.** Comentários sob atividades e aulas ao vivo; sem diretrizes publicadas [DOC KN06, KN15] [HIP] | **Sim, pago.** Papéis "Main caretaker" e "Caretaker", histórico por membro [DOC KN02, KN06] |
| Pathways.org | **Parcial.** Fraldas e mamadas desde 04/2026; sono não encontrado [DOC PW01, PW12] [HIP] | **Sim.** Marcos CDC/AAP com vídeo, idade corrigida, Tummy Timer, widget e meta diária por idade [DOC PW05, PW13, PW14] | Não encontrada [HIP] | **Sim, gratuito.** Titular, cuidador e cuidador de acesso limitado; relação (profissional de saúde, creche); escolha de quais crianças compartilhar [DOC PW05] |
| BabyCenter | **Parcial.** Centrado na gravidez; registro de fraldas não encontrado [DOC BC01, BC02] [HIP] | **Parcial.** Artigos com revisão médica nomeada; sem ferramenta de tummy time [DOC BC16] | **Sim, carro-chefe.** Grupos por mês de nascimento com 121 a 146 mil membros, grupos por assunto, mensagem direta [DOC BC06, BC10] | Não encontrado; usuárias perguntam como incluir o parceiro [HIP BC19, BC20] |
| Peanut | Não encontrada [HIP] | **Não.** Marcos só para compartilhar com outras mães [DOC PN01] | **Sim, o núcleo.** Match por fase e proximidade, feed, grupos, posts anônimos, salas de áudio ao vivo, IA "Ask Peanut" [DOC PN11, PN22] | **Não.** Proíbe contas compartilhadas; só aceita mulheres [DOC PN06] |

Legenda da matriz:

- **Sim:** recurso dedicado, declarado nas fontes.
- **Parcial:** recurso limitado ou periférico.
- **Não:** a fonte declara que o recurso não existe ou o restringe.
- **Não encontrado:** não identificado nas fontes consultadas, o que não prova ausência.

Nenhum app foi instalado.

## Tummy time no mercado

| Produto | Como aparece | Meta | Tom | Evidência |
| --- | --- | --- | --- | --- |
| Napper | Não encontrado em site, sitemap, preços, suporte e lojas; uma avaliação pede um botão de exercício com tummy time | — | — | [DOC N01, N12] [HIP N07] |
| Huckleberry | Atividade com timer ou "feito", notas e relatórios; a versão 0.9.312 diz que o timer fica correto com a tela apagada | Não descrita nas fontes | Marcos "não são um checklist" | [DOC H05, H08, H19] |
| Baby Daybook | Atividade personalizada | Não encontrada | — | [DOC B07, B08] |
| Nara Baby | "Rotina" registrável | Não encontrada | — | [DOC R04, R05] |
| Kinedu | Artigo que cita a AAP (30 min/dia); sem timer | Não no app | Cobrança: "it is crucial to keep trying" | [DOC KN13] [HIP] |
| Pathways.org | Tummy Timer, widget com estrelas, gráfico semanal, entrada manual, vídeos mês a mês | Meta diária por idade; 60 min/dia aos 6 meses, mas outra página diz 1 h aos 3 meses | Misto: "Every minute counts", mas também metas e estrelas | [DOC PW13, PW14, PW15, PW16] |
| BabyCenter | Só artigo, com vídeos por idade | Não | Acolhedor: "If your little one doesn't like tummy time, it's okay" | [DOC BC16] |
| Peanut | Nenhum recurso; aparece em posts de mães preocupadas com a meta de 1 hora | — | Relato de culpa e pressão | [DOC PN24] [HIP] |

Conclusões:

- Registrar tummy time já existe em quatro dos oito produtos. Sozinho, não diferencia.
- As fontes de saúde divergem sobre a quantidade (AAP, OMS e Ministério da Saúde, Pathways, SBP), segundo a [pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md). Isso desaconselha uma meta numérica fixa no app.
- O que falta no mercado é juntar três coisas:
  - tummy time dentro da rotina do dia, registrado por qualquer cuidador e com autoria;
  - conteúdo revisado, com autor e revisor visíveis;
  - tom sem meta, sem estrelas e sem comparação.

## Cuidado compartilhado no mercado

| Produto | Identidade de cada cuidador | Papéis | Autoria visível | Remoção ou revogação | Custo |
| --- | --- | --- | --- | --- | --- |
| Napper | Convite por QR code | Não declarados | Não encontrada | Não encontrada | Não declarado; a assinatura passa para quem recebe o bebê |
| Huckleberry | Mesma conta para a família | Não | Não | Não individual | Free |
| Baby Daybook | Lista de cuidadores | Não encontrados | Não encontrada | Não encontrada | Premium |
| Nara Baby | Uma conta por pessoa | Não: acesso total | Não encontrada | Só o criador da família remove | Assinatura da família |
| Kinedu | Convite por e-mail | Main caretaker e Caretaker | Histórico por membro | Pela tela de família | Premium |
| Pathways.org | Link de convite, conta própria | Três níveis, mais a relação e a escolha de crianças | Não encontrada | Não encontrada | Gratuito |
| BabyCenter | — | — | — | — | Não encontrado |
| Peanut | Proíbe contas compartilhadas | — | — | — | — |

O conjunto "uma conta por pessoa, papéis, autoria visível em cada registro e revogação com efeito definido" não aparece completo em nenhum produto. Pathways tem os papéis mais finos, Kinedu tem o histórico por membro, e Nara tem a identidade por pessoa. A Huckleberry mostra o custo de não ter: relatos de registros fora de sincronia com login compartilhado [HIP H23].

## Comunidade e moderação no mercado

- **BabyCenter** [DOC BC05, BC06, BC07, BC10, BC11]:
  - **Escala:** grupos por mês de nascimento em grande escala.
  - **Moderação em camadas:** equipe paga, donas de grupo voluntárias e ajudantes temporárias.
  - **Regras:** 10 regras publicadas, incluindo "No medical misinformation".
  - **Denúncia:** com escolha do destino e canal de recurso.
  - **Limites declarados:** não monitora o que os membros postam; os posts são indexáveis por buscadores; o conteúdo fica no ar depois que a conta é encerrada.
- **Peanut** [DOC PN06, PN08, PN09, PN14, PN15, PN16, PN22] [HIP PN02, PN23]:
  - **Salvaguardas:**
    - selfie obrigatória, com revisão humana quando há dúvida;
    - denúncia não punitiva ("I'm worried about this person");
    - silenciar palavras e regra contra denúncia retaliatória;
    - áudio das salas guardado por 30 dias, só para apurar denúncias.
  - **Riscos relatados:** contas falsas e encontros presenciais.
  - **Riscos declarados:** "Peanut Pros" sem credenciais verificadas e uma IA que monta respostas de saúde a partir de relatos.
- **Kinedu** [DOC KN06, KN08]: comentários sob atividades, respondidos por especialistas; não publica diretrizes de comunidade para famílias.
- **Nos rastreadores de rotina,** não foi identificada comunidade no app nas fontes consultadas. A conversa entre pais aparece em redes externas, como o subreddit da Huckleberry [HIP H24].

O formato proposto para o AppMaternidade (fórum por tema e fase, só texto, sem mensagem direta, moderado) está em [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md).

## Privacidade e modelo de negócio

| Produto | Sinal encontrado | Evidência |
| --- | --- | --- |
| BabyCenter | A loja declara dado sensível usado para rastrear e para publicidade; a política prevê compartilhar nome, data provável do parto e endereço com parceiros; a ação coletiva *Reimer* (aberta em 22/09/2026) traz alegações ainda não julgadas | [DOC BC01, BC04, BC17, BC21] |
| Pathways.org | A política diz "We sell personal information", inclusive inferências sobre a saúde do bebê; as lojas dizem "never shares" | [DOC PW01, PW02, PW07] |
| Napper | Um assistente de IA usa dados do bebê e os primeiros nomes, com envio possível a fornecedores de modelos de linguagem | [DOC N10] |
| Baby Daybook | Anúncios no plano gratuito; a Play declara compartilhamento do ID do dispositivo para publicidade | [DOC B08, B10] |
| Kinedu | As duas lojas descrevem o compartilhamento de dados de forma diferente | [DOC KN02, KN05] [HIP] |
| Nara Baby | A empresa vende fórmula infantil; com a assinatura vencida, a família não registra nada novo | [DOC R01, R02] |
| Huckleberry | Dados de saúde vinculados ao usuário na App Store, mas não na Play | [DOC H19, H21] |
| Peanut | Publica uma tabela de retenção por tipo de dado; a fase de vida é tratada como dado sensível, com consentimento | [DOC PN15] |

Para um app com dados de crianças e de cuidado, privacidade tende a pesar na confiança [HIP]. Os compromissos estão em [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md), e a monetização é a decisão D6 em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

## O que já é básico

Requisitos de entrada. Ter isso não diferencia, mas faltar pesa contra.

1. Registro rápido de mamada (com lado), sono e fralda, com timer, registro retroativo e edição: todos os rastreadores de rotina.
2. Tummy time registrável: Huckleberry, Baby Daybook, Nara e Pathways.
3. Timer fora do app:
   - Live Activities no iOS: Baby Daybook, Huckleberry e Nara;
   - notificação fixa ou Live Updates no Android: Baby Daybook e Huckleberry;
   - widgets: Baby Daybook, Huckleberry (só iOS) e Pathways;
   - relógio: Baby Daybook, Huckleberry, Napper e Nara.
4. Sincronização entre cuidadores: todos os rastreadores, em níveis diferentes.
5. Exportação: CSV na Huckleberry e na Nara, PDF no Baby Daybook; o Napper ainda não tem (08/2026) [DOC N03].
6. Idade corrigida para prematuros: Huckleberry, Pathways e Baby Daybook.
7. Previsão de sono com ressalvas escritas e modo manual: Napper, Huckleberry e Baby Daybook. O Kinedu também prevê sono e mamada, mas as fichas não encontraram ressalvas. Se entra no MVP é decisão do [escopo](Visao_e_Escopo.md).

## Diferenciais hipotéticos

Nenhum foi validado com usuários. Cada um traz a evidência da lacuna, como validar e o principal risco.

| ID | Hipótese | Evidência da lacuna | Como validar | Risco |
| --- | --- | --- | --- | --- |
| DF-1 | Rotina, desenvolvimento e comunidade num produto só, em que cada pilar continua simples | Nas fontes consultadas, nenhum dos oito tem "Sim" nos quatro pilares. O Kinedu tem os quatro, dois deles parciais (matriz acima) | Entrevistas e piloto: uso de dois ou mais pilares por família e retenção comparada | Produto inchado; mitigar com a comunidade opcional e a rotina como entrada |
| DF-2 | Uma conta por pessoa, com papéis, autoria em cada registro e passagem de turno | Login compartilhado (Huckleberry), acesso total (Nara), sem papéis (Napper, Baby Daybook), papéis só no pago (Kinedu), autoria e revogação não encontradas (Pathways) | Teste de uso com casal e um terceiro cuidador (avó, babá); contagem de duplicidades e conflitos no piloto | Complexidade de permissões; mitigar com poucos papéis no MVP ([Modelo de dados](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)) |
| DF-3 | Desenvolvimento sem cobrança: tummy time na rotina, sem meta numérica, sem estrelas, sem percentil, com "ainda não" e com orientação de quando procurar um profissional | Estrelas e metas por idade com divergência interna (Pathways), "Adiantado" e percentis (Kinedu), relato de culpa (Peanut), fontes de saúde divergentes | Teste de tom e de compreensão com mães, pais e cuidadores; relatos qualitativos de pressão | Parecer menos completo; mitigar com histórico pessoal, sem comparação |
| DF-4 | Comunidade por tema e fase, moderada, só com texto no MVP e sem expor dados da família | Comunidade não identificada nos quatro rastreadores de rotina, nas fontes consultadas; BabyCenter não monitora e indexa os posts; Peanut mostra os riscos de contato direto e proximidade | Piloto pequeno com as métricas da [pesquisa de comunidade](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md): tempo até a primeira resposta, denúncias por mil posts, prazo de moderação | Custo de moderação (D5) e comunidade vazia; mitigar com faixas etárias largas e espaços curados |
| DF-5 | Registro offline declarado, com conflito explícito em vez de sincronia "mágica" | Napper relatado como inutilizável sem internet [HIP N08]; Huckleberry avisa que os registros podem sair de sincronia [DOC H14]; Baby Daybook reescreveu a sincronização e corrigiu duplicação vinda do relógio [DOC B07]; relato de perda de histórico na Pathways [HIP PW04] | Provas P1 a P9 em [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) | Custo técnico ([ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)) |
| DF-6 | Privacidade como posição verificável: sem anúncios com dados de rotina, sem venda de dados, sem IA generativa no MVP e dados no Brasil | Seção "Privacidade e modelo de negócio" | Rótulos das lojas coerentes com a política; teste de compreensão dos avisos | Monetização mais difícil (D6) |
| DF-7 | Produto pensado para o Brasil, com conteúdo referenciado a fontes brasileiras | Huckleberry e Nara só em inglês na App Store; mas Napper, Baby Daybook, Kinedu, BabyCenter e Peanut têm português | Entrevistas | Diferencial fraco: vários concorrentes já têm português |

## O que não copiar

- Login compartilhado entre cuidadores (Huckleberry) e acesso total para qualquer cuidador (Nara).
- Paywall que bloqueia o registro da família (Nara) ou interrompe o momento de cuidado (relatos na Huckleberry e no Kinedu) [DOC R02] [HIP H20, KN04].
- Metas de tummy time com estrelas e cobrança (Pathways); rótulos "Adiantado" e percentis comparados a outras crianças (Kinedu).
- Publicidade com dados de saúde e venda de dados (BabyCenter, Pathways).
- Especialistas com selo sem credencial verificada e IA que monta respostas de saúde a partir de relatos (Peanut).
- Dados do bebê enviados a provedores de IA (Napper).
- Mensagem direta e contato por proximidade no MVP (Peanut; mensagem direta no BabyCenter).
- Conteúdo da comunidade indexável e mantido depois da exclusão da conta (BabyCenter).
- Conteúdo de alimentação produzido por quem vende fórmula infantil (Nara). As regras brasileiras sobre promoção de fórmulas precisam de avaliação jurídica antes de qualquer parceria [HIP].

## Reutilização de conteúdo

- Nenhuma ficha encontrou licença de reuso publicada para Napper, Huckleberry, Baby Daybook, Nara Baby, Kinedu, BabyCenter ou Peanut. O conteúdo desses produtos deve ser tratado como proprietário.
- Pathways restringe o uso a fins pessoais e não comerciais. Incorporar, traduzir ou adaptar exige permissão escrita. Os folhetos dizem "COPY FREELY, DO NOT CHANGE, MUST ACKNOWLEDGE" [DOC PW06, PW18].
- Recomendação: conteúdo próprio, escrito a partir de fontes primárias e revisado por profissional registrado. Detalhes em [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md).

## Questões abertas

1. O Napper tem tummy time em algum plano? Confirmar exige abrir "Track → Edit" no app instalado, o que está fora desta etapa.
2. Pathways mostra quem registrou cada evento? Como revoga o acesso de um cuidador?
3. Há concorrentes brasileiros relevantes fora desta lista? Os oito foram definidos pelo pacote da tarefa.
4. Os grupos do Kinedu ainda existem em 2026?
5. Como as usuárias do BabyCenter resolvem a inclusão do parceiro? As respostas não foram capturadas.

## Limites desta análise

- Fontes públicas consultadas em 22/10/2026. Nenhum produto foi observado em uso.
- Avaliações de loja são relatos isolados [HIP]. Instagram e Reddit só foram lidos por trechos de busca.
- A segunda conferência da Data safety do Kinedu foi bloqueada (ver a ficha).
- Documento escrito pelo coordenador às 04:50, a partir das fichas, depois que o redator delegado parou por falta de resposta do provedor.

## Relação com outros documentos

[Visão e escopo](Visao_e_Escopo.md) · [Fluxos e telas](../02_Experiencia/Fluxos_e_Telas.md) · [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) · [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md) · [Home](../00_Inicio/Home.md)
