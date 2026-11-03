---
tipo: adr
id: ADR-007
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-11, MAT-15, MAT-18
---

# ADR-007 — Conteúdo educativo: origem, revisão e papel da IA

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- O pilar de desenvolvimento precisa de tummy time e de atividades confiáveis desde o MVP (RF-08 e RF-09 de [Visão e escopo](../01_Produto/Visao_e_Escopo.md)).
- Todo conteúdo deve ter autoria, fontes, revisor, data de revisão e versão (RNF-07).
- O conteúdo precisa funcionar offline, e a retirada de um item errado precisa chegar aos aparelhos.
- As fontes de saúde divergem sobre a quantidade de tummy time. Por isso o produto não fixa meta ([Desenvolvimento e conteúdo, 3.2](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md)).
- As melhores fontes restringem a reprodução (AAP, Pathways, OMS e SBP), e o app pode vir a ter receita (decisão D6).
- A recomendação de MVP é não ter IA generativa respondendo a usuários (decisão D4).

## Opções consideradas

1. **Conteúdo próprio em pt-BR**, escrito a partir de fontes primárias e revisado por profissional registrado.
2. Licenciar conteúdo de terceiros (AAP, Pathways ou outro).
3. Parceria com instituição (universidade, sociedade médica, órgão de saúde).
4. Conteúdo gerado por IA, com revisão humana.
5. Assistente de IA respondendo às dúvidas das famílias.

## Evidências

Consultadas em 22/10/2026; detalhes na [pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md) e nas fichas.

- **Licenças das fontes:**
  - Termos da AAP: sem permissão escrita, não é possível reproduzir o conteúdo nem usá-lo com ferramentas de IA (https://www.aap.org/en/pages/terms-of-use/).
  - Pathways: uso pessoal e não comercial (https://pathways.org/terms-of-use).
  - Diretriz da OMS de 2019: CC BY-NC-SA 3.0 IGO (https://iris.who.int/items/677e3562-1deb-48ec-bb1e-4bc8aad3ea09).
  - CDC: prefere link e não permite editar os marcos (https://www.cdc.gov/other/agencymaterials.html; https://www.cdc.gov/act-early/resources/customization.html).
  - NHS: OGL v3.0, mas a tradução conta como adaptação e não pode ser atribuída ao NHS (https://www.nhs.uk/our-policies/terms-and-conditions/).
  - Bebbo (UNICEF): conteúdo proibido para uso comercial, cópia e modificação (https://www.bebbo.app/terms-and-conditions).
- **Divergência sobre tummy time:**
  - AAP: 15 a 30 min/dia até 7 semanas;
  - OMS e Ministério da Saúde: pelo menos 30 min/dia;
  - Pathways: pelo menos 60 min/dia aos 6 meses;
  - SBP: "Não há consenso".
- **Ciclo editorial público como referência:** o NHS mostra "Page last reviewed" e "Next review due"; o HealthyChildren declara revisão periódica, bloqueio de revisores com conflito e tradução revisada por pediatras nativos.
- **IA no mercado:**
  - Napper: assistente que usa dados e primeiros nomes do bebê, com envio possível a fornecedores de modelos de linguagem ([Napper](../08_Referencias/Concorrentes/Napper.md));
  - Peanut: o "Ask Peanut" agrega relatos da comunidade em resposta, sem salvaguardas publicadas ([Peanut](../08_Referencias/Concorrentes/Peanut.md));
  - Kinedu: assistente "Ana" no plano pago ([Kinedu](../08_Referencias/Concorrentes/Kinedu.md));
  - Bebbo: chatbot por roteiro fixo de perguntas frequentes, sem IA generativa no commit analisado ([Bebbo](../08_Referencias/Repositorios/Bebbo.md)).
- **Conteúdo offline na prática:** o Bebbo embute o conteúdo por idioma, sincroniza por data e apaga no aparelho os itens retirados ([Bebbo](../08_Referencias/Repositorios/Bebbo.md)).

## Recomendação

**Opção 1 no MVP.** Conteúdo próprio em pt-BR, revisado por profissional com registro no conselho, com o ciclo editorial e os campos de [Desenvolvimento e conteúdo, seção 8](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md):

- autoria e revisor visíveis;
- fontes com data;
- versão e próxima revisão;
- níveis de correção;
- retirada com prioridade.

**Distribuição:**

- pacote versionado e assinado, com a primeira versão embutida no app;
- lista de retirada processada antes de qualquer atualização;
- o pacote fica fora dos dados da família.

**Tom:**

- tummy time e atividades sem meta, estrelas, percentual ou "atrasado";
- seção "quando procurar um profissional" separada;
- referência de quantidade só como faixa com fontes.

**IA:**

- **sem IA generativa respondendo a famílias no MVP**;
- IA só como ferramenta interna de rascunho da equipe editorial, sem dados de usuários e com revisão humana e profissional obrigatória antes de publicar;
- o uso fica registrado no histórico do item.

**Opção 3** (parceria institucional) fica como candidata depois do piloto. **Opção 2** só se houver permissão escrita e custo conhecido.

Justificativa:

- Conteúdo de saúde de bebê exige responsabilidade identificável e licença limpa. Um texto próprio revisado atende os dois e permite o tom sem cobrança, que é diferencial hipotético (DF-3 em [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md)).
- A IA respondendo a famílias traz risco de erro plausível, transferência de dados sensíveis e custo de API, sem salvaguardas que o mercado tenha demonstrado publicamente.

## Consequências

- **Positivas:**
  - rastreabilidade de cada item;
  - funciona offline;
  - retirada rápida;
  - nenhuma dependência de licença de terceiros;
  - nenhum dado de família enviado a fornecedores de IA.
- **Negativas:**
  - custo e prazo de autor e revisor desde a fundação (D5);
  - catálogo menor no lançamento;
  - ciclo editorial contínuo;
  - sem resposta imediata para dúvidas fora do catálogo. A comunidade e o "quando procurar um profissional" cobrem esse espaço.

## Riscos e verificação que falta

- Sem revisor definido, não há conteúdo publicável. É bloqueio da MAT-19 via D5.
- Tempo no colo, idade corrigida e limites de faixa precisam de decisão do revisor.
- Conferir a Caderneta da Criança (7ª edição) e a versão final do Guia de Intervenção Precoce.
- Teste técnico da retirada offline ainda não executado; entra na MAT-17 ou na MAT-18.
- Se surgir parceria comercial, por exemplo com marcas de produtos infantis, avaliar conflito de interesse e as regras brasileiras sobre promoção de fórmulas [HIP].

## Quando revisar

- Aparecer uma fonte com licença compatível com reprodução comercial em pt-BR, ou uma parceria institucional.
- O piloto mostrar demanda forte por respostas fora do catálogo que a comunidade não cobre.
- Houver um fornecedor de IA com processamento no Brasil ou com contrato adequado, citações verificáveis, recusa de temas clínicos e avaliação documentada. Mesmo assim, a mudança entraria por novo ADR, com RIPD revisado e consentimento específico.
- Mudarem as diretrizes de tummy time das fontes citadas.

## Referências

- Tarefas: MAT-11, MAT-15 e MAT-18 em http://localhost:3001/oficina/MAT
- [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) · [Pesquisa de comunidade e conteúdo](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md) · [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) · [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md) · [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md) · [ADR-006](ADR-006_Comunidade_e_Moderacao.md)
