---
tipo: decisoes
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-11-03
tarefa: MAT-15
fontes_principais:
  - 03_Arquitetura/Comparacao_de_Arquiteturas.md
  - 08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md (seção 10)
  - 08_Referencias/Tecnologias/Precos_Datados.md
---

# Decisões para Daniel

Só as decisões que mudam de forma significativa o produto, o custo ou a manutenção. Cada uma traz opções, a recomendação do Hermes, o impacto, o que continua reversível e quando precisa ser tomada. D8 a D11 foram tomadas em 03/11/2026; D1 foi adiada até o port; as demais seguem abertas.

Para responder, basta indicar o número e a opção (por exemplo, "D1: A; D2: A; D3: A"), aqui na conversa ou num comentário da tarefa correspondente no itsaplan (coluna "Esperando Daniel", http://localhost:3001/oficina/MAT). Cada resposta volta ao ADR correspondente com data, e a tarefa muda de estado. As decisões D1, D2 e D3 bloqueiam a prova técnica, MAT-17 (no port); D4 bloqueia a fundação (MAT-18); D5 bloqueia a fatia da comunidade (MAT-19); D6 não bloqueia nada agora; D7 precisa de resposta antes do primeiro push do repositório, que é público.

## Resumo

| ID | Tarefa no itsaplan | Decisão | Recomendação | Antes de |
| --- | --- | --- | --- | --- |
| D1 | MAT-20 | Framework mobile | React Native + Expo | Prova técnica (MAT-17) |
| D2 | MAT-21 | Conjunto de dados, backend e região | Conjunto B: Supabase + PowerSync + serviço de domínio próprio, com dados de cuidado no Brasil | Prova técnica (MAT-17) |
| D3 | MAT-22 | Quem publica e contas nas lojas | Pessoa jurídica; abrir Apple Developer e Google Play quando a prova começar | Primeiro build de teste em iPhone |
| D4 | MAT-23 | Recorte do MVP | 0 a 12 meses, Brasil em pt-BR, adultos 18+, comunidade só texto, sem IA generativa para usuários, sem anúncios | Fundação (MAT-18) |
| D5 | MAT-24 | Pessoas para conteúdo, moderação e jurídico | Revisor de conteúdo registrado, 1 ou 2 moderadores de meio período no piloto, consultoria em LGPD e ECA Digital | Abertura da comunidade e do conteúdo |
| D6 | MAT-25 | Monetização | Em aberto; sem anúncios direcionados com dados de rotina | Antes do piloto público (não bloqueia a próxima etapa) |
| D7 | MAT-26 | Registros de testes de acesso em projetos de terceiros | Manter fora do Git; Daniel avisa os mantenedores em particular, pelo canal de segurança de cada projeto | Antes do primeiro push do repositório |
| D8 | MAT-28 | Stack do site | D8-A: React + TypeScript + Vite, Tailwind 4, shadcn/ui e Magic UI, Supabase e PWA; port pelo Capacitor | — (decidida) |
| D9 | MAT-29 | Domínio e hospedagem | GitHub Pages do próprio repositório, com Supabase Free na região São Paulo; domínio próprio depois | — (decidida) |
| D10 | MAT-30 | Detector Impeccable | Verificação local, não bloqueante e com versão fixa | — (decidida) |
| D11 | MAT-31 | REA e sala limpa | Sala limpa reduzida e declarada | — (decidida) |

## D1 — Framework mobile

- **Estado:** Adiada até o port (ADR-009).
- **Opções:** (A) React Native + Expo; (B) Flutter; (C) Kotlin Multiplatform com UI nativa.
- **Recomendação:** A. Detalhes no [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md).
  - Com o EAS, o ciclo de iOS inteiro roda a partir do Windows num fluxo integrado: build, assinatura, instalação no iPhone e TestFlight.
  - A Live Activity sai sem Swift.
  - Flutter e KMP também chegam ao TestFlight sem Mac próprio, por CI macOS, mas com o pipeline montado à parte e a Live Activity em Swift.
  - Sem Mac, a depuração nativa no iPhone fica limitada em todas as opções.
- **Impacto:** com A, não é preciso comprar Mac agora (Apple US$ 99/ano; EAS de US$ 0 a 19/mês, preços de 22/10/2026). Com B ou C, soma-se um Mac (a partir de US$ 899) ou Mac remoto ou CI.
- **Reversível:** sim, até a fundação (MAT-18). A prova técnica é descartável.
- **O que muda a recomendação:** a equipe passar a ter Mac, ou aceitar CI macOS e Swift para a Live Activity, e a prova favorecer Flutter; falha do `expo-widgets` ou da acessibilidade na prova.

## D2 — Conjunto de dados, backend e região

- **Estado:** Respondida em parte pela D8: backend Supabase na região São Paulo. A sincronização offline nativa volta a ser decidida no port.
- **Opções:** (A) Supabase + PowerSync + serviço de domínio próprio (Conjunto B); (B) API própria com sincronização própria (Conjunto C); (C) Firebase (Conjunto A).
- **Recomendação:** A. O protocolo de escrita (conflitos, permissões, revogação) fica sob nosso controle; a fila offline e o download parcial vêm prontos; a saída para a opção B não exige refazer o servidor. Detalhes no [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) e na [Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md).
- **Impacto:**
  - **Custo ilustrativo com 100 famílias:** de US$ 108 a 126 por mês, já com o serviço de domínio ([Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2).
  - **Fora desse valor:** o PITR, recomendado em produção (+US$ 100/mês), e a homologação (+US$ 10 a 50/mês).
  - **Comparação só de infraestrutura** ([Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), seção 10; preços de 22/10/2026): Conjunto B ~US$ 101, sem o serviço; Firebase ~US$ 27; API própria ~US$ 64, que já inclui a API em Cloud Run.
  - **Manutenção:** dois fornecedores críticos e um serviço próprio para manter.
- **Reversível:** sim, até a fundação. Depois, trocar o PowerSync pela opção B continua possível sem mudar o banco.
- **Região:** dados de cuidado no Brasil (Supabase em São Paulo e PowerSync na região BR; os dois oferecem essas regiões na consulta de 22/10/2026). Reduz transferência internacional de dados potencialmente sensíveis de crianças. Preços das regiões do Brasil não foram confirmados, e alguns subprocessadores (push, e-mail, relatório de falhas) podem continuar fora do Brasil ([Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)). Mudar de região depois exige mover o banco.
- **Sub-decisão de baixo impacto:** linguagem do serviço. Proposta: TypeScript, por manutenção com uma linguagem só; Django ou Spring Boot são alternativas legítimas.

## D3 — Quem publica e contas nas lojas

- **Estado:** Contas de loja: só no port.
- **Opções:** (A) pessoa jurídica; (B) pessoa física.
- **Recomendação:** A. A diretriz 5.1.1(ix) da Apple diz que apps de setores regulados, como saúde, ou que exigem informação sensível devem ser enviados por pessoa jurídica; o Google indica conta de organização para apps de saúde; o Marco Civil e a tese do STF também falam em pessoa jurídica. Se isso se aplica a este app precisa de validação jurídica. Ver [Pesquisa de privacidade, legal e lojas](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md).
- **Impacto:** conta de organização na Play não tem a exigência de teste fechado com 12 testadores por 14 dias, que vale para contas pessoais criadas depois de 13/11/2023. Contas de organização nas duas lojas exigem número D-U-N-S, e a da Apple pede também site e e-mail com domínio próprio. Como pessoa física, o nome legal de Daniel aparece como vendedor na App Store. Abrir a empresa tem custos próprios (abertura, contabilidade), não levantados. Custos das lojas em 22/10/2026: Apple US$ 99/ano; Google Play US$ 25 uma vez.
- **Reversível:** parcialmente; transferir apps entre contas é possível, mas trabalhoso.
- **Quando:** antes do primeiro build de teste em iPhone (a prova técnica precisa da conta Apple).

## D4 — Recorte do MVP

- **Estado:** Respondida em parte: o site sai com todas as funcionalidades; público e idade mínima continuam abertos.
- **Proposta:** bebês de 0 a 12 meses; Brasil, em pt-BR; usuários adultos de 18 anos ou mais; comunidade só com texto, sem mensagens diretas; sem IA generativa respondendo a usuários; sem anúncios; web com site público e painel interno, sem app web para famílias.
- **Por quê:** reduz riscos de saúde, de moderação e do ECA Digital enquanto o núcleo é validado. Detalhes em [Visão e escopo](../01_Produto/Visao_e_Escopo.md), [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md), [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md) e [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).
- **Impacto:** pais adolescentes ficam de fora no MVP; gestação fica para depois.
- **Reversível:** sim; cada item pode ser ampliado com decisão própria.

## D5 — Pessoas para conteúdo, moderação e jurídico

- **Proposta:** um revisor de conteúdo com registro profissional (por exemplo, pediatra ou fisioterapeuta pediátrico) para o tummy time e as atividades; um ou dois moderadores de meio período quando a comunidade abrir; consultoria em LGPD e ECA Digital antes do piloto; definição do encarregado de dados.
- **Por quê:** sem revisor, o conteúdo não pode ser publicado; sem moderação, a comunidade não atende às lojas nem às regras de remoção de conteúdo; os textos legais não podem ser publicados sem validação.
- **Impacto:** custo de pessoas, sem preço levantado nesta etapa ([Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- **Reversível:** sim; o formato (contratação, parceria, voluntariado supervisionado) é aberto.

## D6 — Monetização

- **Opções:** assinatura com plano gratuito; pagamento único; gratuito sustentado por parceria institucional.
- **Recomendação:** decidir antes do piloto público. Em qualquer caso, nada de anúncios direcionados com dados de rotina (a LGPD proíbe compartilhar dado de saúde para obter vantagem econômica, segundo a pesquisa de privacidade).
- **Impacto:** compras dentro do app exigem as regras das lojas e do Código de Defesa do Consumidor; não muda a fundação técnica.

## D7 — Registros de testes de acesso em projetos de terceiros

- **Situação.** Na primeira rodada das fichas, antes da regra de só ler código, dois subagentes fizeram sondagens de acesso em instâncias locais do Sprout Track e do Baby Buddy, com dados fictícios e só em 127.0.0.1.
  - Os registros estão no disco, em `09_Evidencias/Execucao_Referencias/Sprout_Track/` e `Baby_Buddy/`. Desde 05:05 estão no `.gitignore` e não entram em nenhum commit.
  - As fichas não detalham esses registros. Os pontos de acesso aparecem só como perguntas de auditoria.
  - No Finnberry e no Bebbo não houve sondagem de acesso.
- **Opções:**
  - (A) Manter os arquivos só no disco, fora do Git, sem contato com os mantenedores.
  - (B) Como em A, e Daniel avisa os mantenedores em particular, pelo canal de segurança de cada projeto, antes de publicar o cofre. O Baby Buddy indica o relato de vulnerabilidades pelo GitHub no `SECURITY.md` (https://github.com/babybuddy/babybuddy/security). O Sprout Track não tem `SECURITY.md` no commit analisado; o canal ainda precisa ser identificado.
  - (C) Apagar os registros agora.
- **Recomendação:** B. É o caminho de divulgação responsável, e os registros servem de base para um aviso preciso. O Hermes não contata ninguém: o aviso, se houver, sai de Daniel.
- **Impacto:** nenhum no AppMaternidade. As lições já estão nas fichas e nos cenários Q-06 de [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md).
- **Reversível:** A e B sim. C não.
- **Quando:** antes do primeiro push do repositório, porque o remoto é público.

## D8, stack do site (MAT-28): decidida

Decidida em 03/11/2026, por delegação de Daniel: opção A.

| Opção | O que é | Prós | Contras |
|---|---|---|---|
| A (escolhida) | React + TypeScript + Vite, Tailwind 4, shadcn/ui e Magic UI, Supabase e PWA; port pelo Capacitor | Usa os componentes da lista; hospedagem estática barata; o port reaproveita o código | Recursos nativos avançados pedem plugin |
| B | Next.js (App Router), com a mesma UI e o mesmo backend | Renderização no servidor e SEO | Mais peças para operar; a hospedagem ideal é a Vercel, cujo plano Hobby não permitiria uso comercial ("a confirmar": sem fonte datada no cofre) |
| C | Expo Router com React Native Web | Melhor reaproveitamento num app nativo | Não usa shadcn/ui nem Magic UI, que dependem do DOM; contraria a regra de componentes |

## D9, domínio e hospedagem (MAT-29): decidida

Decidida por Daniel em 03/11/2026.
- **Hospedagem:** GitHub Pages do próprio repositório, publicado por GitHub Actions. Custo zero.
- **Backend:** Supabase Free na região São Paulo, só para desenvolvimento e demonstração sem dados reais.
- **Domínio próprio:** depois.
- **Para publicar ainda faltam:** a D7 (MAT-26), a retirada de caminhos locais `C:/Users/...` de três documentos e o push autorizado.
- **Alternativas avaliadas:** Cloudflare Pages, Netlify ou Vercel nos planos grátis; Supabase Pro quando houver usuários reais.

## D10, detector Impeccable (MAT-30): decidida

Decidida por delegação de Daniel em 03/11/2026.
- O Impeccable entra como verificação local, não bloqueante e com versão fixa, no portão final (MAT-42).
- Antes, passa por avaliação na `skill-scouting`.
- **Alternativa avaliada:** não usar, porque G4 a G6 já cobrem o critério.

## D11, REA e sala limpa (MAT-31): decidida

Decidida em 03/11/2026: opção A, sala limpa reduzida e declarada.
- A REA roda pela CLI (`rea-agents@6.8.0`).
- O analista é o líder, com rede só para a referência.
- O reconstrutor recebe só a especificação filtrada.
- O verificador (revisor-appmaternidade) só relata.
- **Limite:** mesma conta do Windows; o isolamento é por instrução e permissão.
- **Alternativas avaliadas:** B, conta ou contêiner isolado; C, sem REA.

## O que não precisa de decisão agora

Nome definitivo do produto, identidade visual, tipos de registro além do MVP, widgets e expansões. Ficam no [Roadmap](Roadmap_e_Proxima_Fatia.md).

## Questões abertas

1. Há iPhone disponível para testes? Qual modelo e versão do iOS?
2. Há Mac disponível ou disposição de comprar ou alugar um? (muda D1)
3. Quem opera o sistema em produção e com que disponibilidade?

## Limites desta análise

Recomendações técnicas, não jurídicas nem financeiras. Preços são de 22/10/2026 e podem mudar.
