---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-11
adr: ADR-007
fontes_principais:
  - 08_Referencias/Pesquisa_Comunidade_e_Conteudo.md
  - 01_Produto/Concorrentes_e_Diferenciais.md
  - 08_Referencias/Repositorios/Bebbo.md
  - https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/back-to-sleep-tummy-to-play.aspx
  - https://www.cdc.gov/act-early/milestones/2-months.html
  - https://iris.who.int/items/677e3562-1deb-48ec-bb1e-4bc8aad3ea09
  - https://www.sbp.com.br/fileadmin/user_upload/20226d-DocCient_-_Sindrome_Morte_Subita_do_Lactente.pdf
---

# Desenvolvimento e conteúdo

> Nota de 03/11/2026: o rumo mudou para site completo primeiro e port Android e iOS depois ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Onde este texto fala em app nativo, leia como o port; o site cobre as mesmas funções.

Proposta para o pilar de desenvolvimento. Cobre:

- tummy time na rotina;
- atividades por fase;
- idade e idade corrigida;
- quando procurar um profissional;
- origem, revisão, versão e licença do conteúdo;
- distribuição offline;
- papel da IA.

Os números entre colchetes, como [10], remetem às fontes da [pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md), consultadas em 22/10/2026. Os códigos N10, PN22 e PN24 remetem às tabelas de fontes das fichas [Napper](../08_Referencias/Concorrentes/Napper.md) e [Peanut](../08_Referencias/Concorrentes/Peanut.md).

> **Não é orientação clínica.** Os números aparecem como cada fonte os apresenta. Nenhum texto deste documento vai para o app sem revisão de profissional de saúde com registro no conselho (decisão D5).

## 1. Problema

- **Querem saber o que fazer, e as fontes divergem.** Quem cuida quer saber o que fazer com o bebê em cada fase e se "está tudo bem". As fontes de saúde não concordam sobre quanto tummy time fazer (seção 3.2).
- **O mercado transforma desenvolvimento em cobrança** ([Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md); [Bebbo](../08_Referencias/Repositorios/Bebbo.md)):
  - Pathways: estrelas e "More is always better";
  - Kinedu: rótulos "Adiantado" e percentis;
  - Bebbo: percentual de marcos com o rótulo "Pending".
  - Na Peanut, mães relatam culpa por não cumprir a meta de uma hora [PN24].
- **Conteúdo de saúde de bebê precisa de rastreabilidade:**
  - quem escreveu, quem revisou, com quais fontes e em que versão;
  - retirada rápida quando houver erro;
  - funcionamento offline, com a retirada chegando ao aparelho.
- **A maior parte das boas fontes não pode ser reproduzida** num app que talvez tenha receita (seção 9).

## 2. Princípios

1. **Registrar sem cobrar:** o tummy time é registrado, nunca transformado em meta.
2. **Referência com faixa e fonte,** nunca um número único como objetivo.
3. **Segurança em primeiro lugar:** acordado e supervisionado; para dormir, sempre de barriga para cima.
4. **Fase como janela larga,** nunca prazo. "Ainda não" é resposta neutra.
5. **"Quando procurar um profissional" fica separado** das atividades, com tom neutro.
6. **Conteúdo próprio em pt-BR,** revisado por profissional registrado, com autoria, fontes e versão visíveis.
7. **Conteúdo offline versionado,** com a lista de retirada processada antes de qualquer outra atualização.
8. **Sem IA generativa respondendo a famílias no MVP** ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).

## 3. Tummy time na rotina

### 3.1 Registro

- **Formas de registrar:**
  - sessão com timer (iniciar e encerrar) ou "fizemos", com duração opcional;
  - registro retroativo com início e fim escolhidos.
- **Qualquer cuidador** com papel de registro inicia ou encerra a sessão, e o app guarda quem iniciou e quem encerrou ([Modelo de dados](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md); [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
- **Funciona sem rede.** A sessão é um registro em andamento salvo no aparelho, e o tempo é calculado pelo horário de início, não por um contador.
- **Resumo neutro:** "hoje: 3 sessões, 12 min no total" [pesquisa 2.3].
- **Fica de fora** [pesquisa 2.3]:
  - meta de minutos;
  - anel de progresso;
  - sequência de dias;
  - selo de duração;
  - "você não cumpriu hoje";
  - comparação com outros bebês.
- **Texto fixo no timer:** "Só com o bebê acordado e um adulto olhando. Se ele ficar com sono, coloque de barriga para cima no berço." [10][11][13]
- **Se o bebê se incomodar,** o texto sugere parar ou mudar a atividade [13][17]. Alguns bebês não gostam no início, e isso é esperado [10].
- **Lembrete opcional,** desligado por padrão e com tom neutro ("quer registrar o tummy time de agora?") [pesquisa 2.3].
- **Ponto em aberto:** se o tempo de bruços no colo ou sobre o peito do adulto conta como tummy time. A AAP e o NHS incluem essa posição [10][12]; a definição da OMS fala em movimento livre dos membros [21]. Decisão do revisor profissional.

### 3.2 O que as fontes dizem sobre quantidade [DOC]

| Fonte | Quantidade | Observação |
| --- | --- | --- |
| AAP, sono seguro 2022 [23] | "at least 15 to 30 minutes total daily by 7 weeks of age" | Aumentar aos poucos, acordado e supervisionado |
| HealthyChildren.org (AAP), 08/09/2026 [10] | 2 a 3 vezes ao dia, 3 a 5 minutos; até 15 a 30 min/dia com 7 semanas | Começar no dia em que o bebê chega em casa |
| CDC, Learn the Signs. Act Early. [11] | Sem minutos | Foco em supervisão e em marcos |
| NHS, revisão de 09/03/2023 [12] | "Little and often", sem número | A data de revisão prevista (09/03/2026) já passou |
| OMS, diretriz de 2019 [21] | Pelo menos 30 min/dia, distribuídos, para quem ainda não se locomove | Recomendação forte, com evidência "very low" (GRADE) |
| Pathways.org [13] | 15 a 30 min/dia aos 2 meses; pelo menos 60 min/dia aos 6 meses | "More is always better" |
| SBP, Medicina do Sono [14][15] | "Não há consenso [...] qual o tempo e a frequência" | Bruços só acordado e supervisionado; sono de barriga para cima até 1 ano |
| Ministério da Saúde, Guia de Atividade Física (2021) [19] | Até 1 ano: pelo menos 30 min/dia, distribuídos | Evidência "de baixa a moderada" |
| Ministério da Saúde, Guia de Intervenção Precoce (minuta, 2025) [18] | Pelo menos 30 min/dia, distribuídos | Documento preliminar; versão final não verificada |

**Consequência para o produto** [HIP; pesquisa 2.2]:

- nenhum número vira meta;
- se o app mostrar referência, mostra a faixa, as fontes e o contexto;
- a referência nunca serve para calcular "atraso".

### 3.3 Referência opcional

Um item de conteúdo "O que as fontes dizem sobre tummy time", revisado pelo profissional, com a tabela simplificada e os links. Fica acessível a partir do timer, mas não aparece como "meta de hoje".

## 4. Atividades por fase

- **Formato:** "Ideias para brincar nesta fase", em janelas de idade que se sobrepõem, sem lista de tarefas, pontos, porcentagem concluída ou "atrasado" [pesquisa 2.7].
- **"Fizemos" opcional,** sem sequências. O histórico é visível só para a família e pode ser ocultado. Cada marcação guarda o `id` e a `versao` do conteúdo usado.
- **Linguagem de cuidado** [13][17][62]: mudar a atividade se o bebê chorar, parar se ele se irritar e fazer pausa para consolar.
- **Ligação com a comunidade sem expor dados** [pesquisa 2.7]:
  - "ver conversas sobre este tema" abre a comunidade filtrada por tema e, se a pessoa quiser, pela faixa calculada no aparelho;
  - "salvar ideia" copia a sugestão para a família, sem vínculo com o autor;
  - nenhum dado da rotina vai para a comunidade sem edição e prévia ([Comunidade e moderação, seção 5](Comunidade_e_Moderacao.md)).
- **Escopo do MVP:** de 0 a 12 meses ([Visão e escopo](../01_Produto/Visao_e_Escopo.md)). Até 24 meses é a primeira expansão.

## 5. Idade e idade corrigida

- **Idade calculada no aparelho,** a partir da data de nascimento, no fuso da família.
- **Prematuros:** idade corrigida a partir da data prevista do parto, como fazem o Bebbo nas curvas de crescimento e a Pathways nos marcos ([Bebbo](../08_Referencias/Repositorios/Bebbo.md); [Pathways](../08_Referencias/Concorrentes/Pathways.md)).
  - O item de conteúdo indica se considera a idade corrigida (`considera_idade_corrigida`), com texto revisado.
  - Até que idade usar a correção é questão para o revisor.
- **Fora da comunidade:** a idade corrigida é informação sensível. É usada só no cálculo local e nunca aparece na comunidade [pesquisa 1.9].
- **Janelas de conteúdo** em dias ou semanas, sobrepostas. Elas nunca dizem "deve fazer até" [pesquisa 2.6].

## 6. Marcos

- **Fora do MVP.** Uma lista de marcos com marcação não está entre os requisitos do MVP ([Visão e escopo](../01_Produto/Visao_e_Escopo.md), RF-08 e RF-09).
- **No MVP, um texto "o que observar nesta fase":**
  - escrito pela equipe e revisado;
  - com links para o CDC e a Caderneta da Criança;
  - explica que marcos são o que 75% ou mais das crianças fazem até certa idade, e que as listas não substituem triagem [11].
- **Limite da licença:** o CDC não permite editar os marcos na personalização do material [25]. Usar a lista do CDC exige reproduzi-la sem mudança, ou então linkar.
- **Se entrar depois:**
  - respostas "já faz", "ainda não" e "não sei";
  - sem percentual, sem "Pending" (como no Bebbo), sem "Adiantado" e sem comparação (como no Kinedu);
  - texto de "quando procurar" sempre acessível, nunca disparado como alerta de atraso.

## 7. Quando procurar um profissional

Seção própria, separada das atividades, com tom neutro, baseada no CDC e na Pathways [11][13] e revisada pelo profissional:

- se o bebê não faz o que se espera para a fase, perde habilidades que já tinha ou há qualquer preocupação, conversar com o pediatra ou com a UBS [11];
- se o bebê não tolera o tummy time de forma persistente, conversar com o profissional de saúde [13];
- em urgência, SAMU 192 [6].

O app nunca calcula diagnóstico, risco ou atraso.

## 8. Conteúdo: origem, autoria e revisão

**Produção:**

- texto próprio em pt-BR, escrito a partir de fontes primárias;
- revisão por profissional com registro (pediatra, fisioterapeuta ou terapeuta ocupacional pediátrico), sem conflito de interesse declarado (D5).

**O que a família vê em cada item:**

- autor;
- revisor, com nome, profissão, conselho, UF e registro;
- fontes, com data;
- "versão N, revisado em DD/MM/AAAA";
- o aviso "não substitui consulta".

**Ciclo editorial** [pesquisa 2.6]:

1. pauta;
2. rascunho;
3. checagem de fontes;
4. revisão técnica;
5. revisão de linguagem (pt-BR simples, sem culpa, sem jargão);
6. aprovação editorial;
7. publicação com número de versão;
8. acompanhamento por "reportar erro no conteúdo";
9. revisão na data prevista;
10. correção ou retirada;
11. histórico.

Referências de mercado: o NHS mostra "Page last reviewed" e "Next review due" [12]; o CDC mostra datas de publicação e revisão [11]; o HealthyChildren revisa periodicamente e bloqueia revisores com conflito [30].

**Níveis de correção** [pesquisa 2.6]:

| Nível | Exemplo | Ação |
| --- | --- | --- |
| Crítica (segurança) | Texto que contradiz o sono de barriga para cima | Retirar na hora; o aparelho processa a retirada antes de qualquer outra atualização; aviso a quem abriu o item |
| Importante | Faixa etária errada ou fonte desatualizada | Nova versão com nota de mudança |
| Menor | Erro de digitação | Nova versão menor, sem aviso |

**Campos de um item** (lista completa na pesquisa, seção 2.6):

- **Identificação:** `id`, `versao`, `status` (rascunho, em revisão, aprovado, publicado, retirado) e `tipo` (artigo, atividade, dica de segurança, roteiro de crise).
- **Texto e alcance:** título, resumo e corpo em Markdown restrito; idioma; faixa etária em dias; `considera_idade_corrigida`; temas.
- **Responsabilidade:** autores; revisores com credencial e declaração de conflito; fontes com data de consulta; licenças de texto e de mídia.
- **Avisos:** de limites e de segurança.
- **Ciclo de vida:** datas de publicação, revisão e próxima revisão; nota de mudança; retirada com motivo.
- **Integridade:** mídias com texto alternativo e créditos; hash do conteúdo.

As entidades Conteúdo e Versão de conteúdo estão em [Modelo de dados, 3.3](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md).

## 9. Licenciamento das fontes

| Fonte | Linkar e citar | Reproduzir texto | Imagens e vídeos |
| --- | --- | --- | --- |
| AAP / HealthyChildren.org | Sim | Não sem permissão escrita; os termos também proíbem usar o conteúdo com ferramentas de IA sem permissão [29] | Não sem permissão |
| CDC | Sim; o CDC prefere link [24] | Domínio público na maior parte, com condições: atribuir, não sugerir endosso, não mudar o conteúdo [24]; marcos não editáveis [25] | Algumas restritas; logo exige permissão [24] |
| NHS | Sim | OGL v3.0, inclusive para uso comercial; tradução conta como adaptação, que não pode ser atribuída ao NHS [26] | Imagens fora da OGL [26] |
| OMS (diretriz de 2019) | Sim | CC BY-NC-SA 3.0 IGO: só uso não comercial [21][22] | Logo não permitido |
| Pathways.org | Sim | Só uso pessoal e não comercial, sem aprovação escrita [27][28] | Idem |
| SBP | Sim | "Todos os direitos reservados" [31] | Idem |
| Ministério da Saúde | Sim | Conferir obra a obra [7][19] | Idem |
| Bebbo (UNICEF) | Sim | Proibido: uso comercial, cópias digitais e modificações ([termos](https://www.bebbo.app/terms-and-conditions)) | Proibido |

**Regras propostas** [pesquisa 2.5; confirmar com o jurídico]:

1. Sempre linkar a fonte e registrar versão e data.
2. Fatos e recomendações podem ser reescritos em texto próprio, com citação. A expressão (texto, ilustração, vídeo) só entra com licença.
3. Texto, ilustrações, vídeos, roteiros de atividade e mensagens de crise são de produção própria.
4. Nada de logos, ilustrações ou vídeos de terceiros sem licença escrita.

## 10. Distribuição offline

Proposta da pesquisa (seção 2.6) [HIP]:

1. **Pacote de conteúdo com manifesto:** versão do pacote, versão mínima do app, itens com `id`, `versao` e `hash`, e lista de retirada. É assinado pelo backend, e a primeira versão vem embutida no app.
2. **Sincronização em ordem:**
   1. baixa o manifesto;
   2. **processa a lista de retirada primeiro**;
   3. aplica as atualizações por diferença;
   4. se algo falhar, mantém a última versão íntegra.
3. **Separação:** o conteúdo fica somente leitura no aparelho e fora dos dados da família. Não entra nos buckets de sincronização da família ([Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md)).
4. **Na tela:** cada item mostra a versão, a data de revisão e as fontes.

O Bebbo mostra o mecanismo funcionando: conteúdo embutido por idioma, sincronização incremental por data e um endpoint de itens retirados que os apaga do banco local ([Bebbo](../08_Referencias/Repositorios/Bebbo.md)).

## 11. IA

- **No MVP, sem IA generativa respondendo a famílias** (decisão D4; [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).
- **Por quê:**
  - o tema é saúde de bebê;
  - os exemplos de mercado envolvem dados e respostas sem salvaguarda publicada: o assistente do Napper usa dados e primeiros nomes do bebê e pode enviá-los a fornecedores de modelos de linguagem [N10], e o "Ask Peanut" agrega relatos de mães em resposta [PN22];
  - os termos da AAP proíbem usar o conteúdo dela com ferramentas de IA [29];
  - há exigências de transparência e revisão de decisões automatizadas (LGPD art. 20) e de transferência internacional;
  - tem custo próprio de API, e assinatura pessoal não conta ([Custos e operação, seção 4](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- **O que fica permitido:** IA como ferramenta interna de rascunho da equipe editorial, sem dados de usuários e sempre com revisão humana e profissional antes de publicar. O uso fica registrado no histórico editorial do item [HIP].
- **O que mudaria a decisão:** critérios em "Quando revisar" do [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).

## 12. Alternativas consideradas

| Alternativa | A favor | Contra | Situação |
| --- | --- | --- | --- |
| Texto próprio revisado por profissional registrado | Controle de tom, licença limpa, pt-BR, rastreável | Custo e prazo do revisor (D5) | **Recomendada** |
| Licenciar conteúdo pronto (AAP, Pathways) | Qualidade e reputação | Permissão escrita, custo desconhecido, tradução como adaptação; tom de meta na Pathways | Não no MVP |
| Parceria com instituição (universidade, sociedade médica, saúde pública) | Credibilidade e revisão | Prazo e governança | Candidata depois do piloto |
| Conteúdo gerado por IA com revisão | Velocidade | Erros plausíveis, revisão mais difícil, restrições de fontes [29] | Só como rascunho interno |
| Só links para fontes externas | Custo baixo | Não funciona offline, sai do app, fontes em inglês | Complemento, não base |

## 13. Consequências

- **Positivas:**
  - conteúdo confiável e com tom coerente com o DF-3;
  - licença limpa;
  - funciona offline;
  - retirada rápida.
- **Negativas:**
  - depende de pessoas especializadas desde a fundação;
  - menos conteúdo no lançamento;
  - ciclo editorial com custo contínuo.

## 14. Validação proposta [HIP]

- **Teste de tom** com mães, pais e cuidadores: compreensão do texto e sensação de pressão.
- **Uso no piloto:**
  - sessões de tummy time por família por semana, só como observação, nunca como meta;
  - sessões encerradas por outro cuidador;
  - uso de "ver conversas sobre este tema".
- **Qualidade editorial:**
  - itens com revisão vencida (alvo: zero);
  - tempo até retirar um conteúdo crítico em aparelhos que voltaram a ter rede;
  - erros reportados por item.
- **Teste técnico:** o pacote de conteúdo com retirada processada antes da atualização entra nos cenários de [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md).

## 15. Questões abertas

1. Quem revisa (pediatra, fisioterapeuta ou terapeuta ocupacional pediátrico), com que credencial e a que custo (D5)?
2. O tempo no colo conta como tummy time [10][21]?
3. Até que idade aplicar a idade corrigida?
4. A lista de marcos entra depois? Com quais fontes, dada a regra do CDC [25]?
5. Caderneta da Criança, 7ª edição: conferir o texto sobre bebê de bruços e sono, que não foi acessado [60].
6. Guia de Intervenção Precoce: a versão final mudou os 30 min/dia [18]?
7. Vale pedir permissão à AAP ou à Pathways, ou produzir tudo internamente?

## Limites desta análise

- Não há juízo clínico. Os números foram reportados como as fontes os apresentam, e algumas fontes brasileiras não foram acessadas (Caderneta da Criança e o PDF do Guia de Atividade Física).
- Nada foi testado com usuários.
- Documento escrito pelo coordenador, depois que duas tentativas de subagente pararam sem escrever: `deleg_a7e0449c` às 04:54 e `deleg_c292f0ff`, interrompida às 05:25.

## Relação com outros documentos

[ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md) · [Visão e escopo](../01_Produto/Visao_e_Escopo.md) · [Fluxos e telas, 3.4](../02_Experiencia/Fluxos_e_Telas.md) · [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) · [Comunidade e moderação](Comunidade_e_Moderacao.md) · [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md) · [Pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md)
