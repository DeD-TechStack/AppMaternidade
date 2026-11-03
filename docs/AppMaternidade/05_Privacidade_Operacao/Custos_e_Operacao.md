---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-11-03
tarefa: MAT-13
adr: ADR-008
fontes_principais:
  - 08_Referencias/Tecnologias/Precos_Datados.md
  - 08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md
  - 08_Referencias/Tecnologias/Mobile_e_Plataformas.md
  - https://supabase.com/pricing
  - https://www.powersync.com/pricing
  - https://expo.dev/pricing
  - https://developer.apple.com/programs/enroll/
  - https://support.google.com/googleplay/android-developer/answer/14151465
---

# Custos e operação

## Site (rumo atual)

Custos do site completo ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)), por fase. Os preços do Supabase vêm de [Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), seção 3, fotografia de 22/10/2026.

| Fase | Serviço | Custo | Fonte |
| --- | --- | --- | --- |
| Desenvolvimento local e demonstração eventual, sem dados reais | GitHub Pages em repositório público | Grátis, a confirmar | O cofre não tem fonte datada |
| Desenvolvimento local e demonstração eventual, sem dados reais | Supabase Free | US$ 0; o projeto pausa após 1 semana sem uso; preço na região São Paulo a confirmar | Preços datados, seção 3 (22/10/2026) |
| Piloto com famílias reais | Supabase Pro | US$ 25/mês; preço na região São Paulo a confirmar | Preços datados, seção 3 (22/10/2026) |

A seção 6.1 deste documento diz: "Planos gratuitos não entram em produção nem em homologação contínua, porque pausam por inatividade." Por isso, o Free só serve para a primeira fase.

As seções seguintes descrevem a arquitetura da APP-001 (rumo anterior) e servem de base para o port.

Cenários de custo e o mínimo de operação para a arquitetura proposta: React Native + Expo e o Conjunto B (Supabase, PowerSync e serviço de domínio) ([Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md)).

Todos os preços vêm de [Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), uma fotografia das páginas oficiais em 22/10/2026. Os valores estão em USD, sem impostos, IOF nem câmbio. Preço de página não é contrato. **Plano gratuito não é garantia de produção, e assinatura pessoal de IA não é crédito de API.**

Os cenários de 100, 1.000 e 10.000 famílias são ilustrativos, não previsão de demanda.

## 1. Custo por fase (rumo anterior)

| Fase ([Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)) | Composição proposta | Custo mensal ilustrativo | Observações |
| --- | --- | --- | --- |
| F1 Prova técnica (MAT-17) | Stack local em Docker (PostgreSQL, PowerSync Open Edition e serviço); Supabase Free e PowerSync Free só se a prova precisar de nuvem; EAS Free; Apple Developer | **~US$ 8**: Apple, US$ 99/ano | Os planos Free do Supabase e do PowerSync pausam ou desativam após 1 semana sem uso. O EAS Free dá 15 builds iOS/mês, em fila de baixa prioridade ("90+ minutes" no pico). Um iPhone físico custa a partir de US$ 699 se a equipe não tiver; um aparelho antigo compatível serve [HIP] |
| F2 a F4 Fundação e MVP | Homologação em nuvem com planos pagos; EAS Starter | **~US$ 110 a 150** | Precisa de Supabase Pro e PowerSync Pro para não pausar, mais o serviço e o e-mail. Ver seção 2 |
| F5 Piloto fechado (~100 famílias) | Produção e homologação | **~US$ 120 a 180 sem PITR; ~US$ 220 a 280 com PITR** | Recomendo PITR para dado sensível em produção. A decisão depende do RPO/RTO desejado (seção 5) |
| Crescimento (~10.000 famílias) | Compute maior, mais clientes simultâneos no PowerSync | **~US$ 250 a 350 sem PITR e sem EAS Update, com homologação** | Somam-se US$ 100 de PITR e até US$ 85 de EAS Update acima de 3 mil MAU no Starter |

A Google Play cobra US$ 25 uma única vez, fora do mensal. Conta pessoal nova exige teste fechado com 12 testadores por 14 dias ([answer 14151465](https://support.google.com/googleplay/android-developer/answer/14151465)). Conta de organização exige D-U-N-S (decisão D3).

## 2. Composição do Conjunto B

O Conjunto B da nota de preços usa Supabase e PowerSync, sem serviço próprio separado. A arquitetura proposta acrescenta o serviço de domínio em container, então esta tabela soma a hospedagem dele.

| Item | 100 famílias | 1.000 | 10.000 | Fonte e premissa |
| --- | ---: | ---: | ---: | --- |
| Apple Developer (US$ 99/ano) | 8,25 | 8,25 | 8,25 | Preços datados, seção 1 |
| EAS Starter | 19 | 19 | 19 | Inclui US$ 45 de crédito de build; acima de 3 mil MAU, EAS Update cobra à parte |
| Supabase Pro | 25 | 25 | 75 | US$ 25 de base; em 10 mil, compute Medium (+US$ 50) |
| PowerSync Pro | 49 | 49 | 79 | US$ 49 de base; em 10 mil, +US$ 30 por mil clientes simultâneos acima de 1.000 |
| E-mail (Resend) | 0 | 20 | 20 | Free até 3 mil por mês e **100 por dia**; o limite diário pode travar picos de convite |
| Serviço de domínio (container) | 7 a 25 | 7 a 25 | 25 a 85 | Fly.io 1 GB a US$ 6,70; Render 1 CPU/2 GB a US$ 25 e 2 CPU/4 GB a US$ 85 (preços dos EUA; disponibilidade e preço no Brasil [NC]) |
| Push (FCM, APNs ou Expo Push) | 0 | 0 | 0 | Sem custo por mensagem; a Expo limita 600/s por projeto |
| Excedentes de banco, arquivos e volume do PowerSync | 0 | 0 | ~12 | Memória logo abaixo da tabela [HIP] |
| **Subtotal** | **~108 a 126** | **~128 a 146** | **~238 a 298** | — |
| PITR do Supabase (recomendado) | +100 | +100 | +100 | 7 dias de retenção |
| Homologação | +10 a 50 | +10 a 50 | +10 a 50 | Projeto extra no Supabase e instância extra no PowerSync [HIP] |
| EAS Update acima de 3 mil MAU | 0 | 0 | +85 | 20 mil MAU × US$ 0,005; o plano Production (US$ 199) pode compensar |

**Memória dos excedentes em 10.000 famílias.** Calculada pelas fórmulas da seção 10.2 de [Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), em GB decimais:

- **Banco:** 50 GB, US$ 5,25 acima dos 8 GB incluídos.
- **Arquivos:** 144 GB, US$ 0,94 acima dos 100 GB incluídos. Como o MVP proposto não tem fotos, este item fica superestimado.
- **PowerSync:** 11,25 GB hospedados, US$ 1,25 acima dos 10 GB incluídos. A sincronização mensal fica abaixo da franquia de 30 GB.
- **Soma reproduzível:** ~US$ 7,44.
- **Restante (~US$ 4,56):** é a diferença para o total da nota (~US$ 186). Ela não se reproduz pelas fórmulas publicadas, e o script original não foi guardado. Fica como margem conservadora até a nova coleta de preços (seção 3).

Premissas da nota de preços [HIP]:

- 2 cuidadores e 2 aparelhos por família;
- 25 escritas por família por dia e 8 aberturas por aparelho por dia;
- 0,5 KB por operação sincronizada, janela de 90 dias hospedada, pico de 10% dos aparelhos conectados;
- 3 e-mails por família por mês e 5 pushes por família por dia;
- 4 fotos por mês por família. O MVP proposto não tem fotos, então esse item fica superestimado.

Para comparação, os três conjuntos da nota de preços (infraestrutura mais EAS e Apple), sem o serviço de domínio do B:

| Conjunto | 100 famílias | 1.000 | 10.000 |
| --- | ---: | ---: | ---: |
| A: Firebase | ~27 | ~35 | ~139 |
| B: Supabase + PowerSync | ~101 | ~121 | ~214 |
| C: Cloud Run + Cloud SQL + R2 | ~64 | ~109 | ~202 |

Nessas escalas, a diferença de infraestrutura entre os conjuntos é menor do que algumas horas de engenharia por mês. Custo de infraestrutura não deve decidir a arquitetura [HIP; Preços datados, 10.5].

## 3. O que não tem preço confirmado

| Item | Por que importa | Situação |
| --- | --- | --- |
| Regiões do Brasil (Supabase sa-east-1, PowerSync região BR, hospedagem do serviço) | Os dados de cuidado ficariam no Brasil (decisão D2) | [NC]: repetir a coleta de preços para São Paulo |
| Monitoramento e relatórios de falha | Operação e incidentes | [NC]: ferramenta não escolhida |
| Domínio, DNS e site público | Política de privacidade, exclusão de conta por link web, suporte | [NC] |
| Cópia de backup fora do provedor | Janela de retenção maior que 7 dias (seção 5) | [NC] |
| Comissões das lojas sobre assinaturas | Monetização (decisão D6) | Não pesquisado |
| Abertura da empresa, contabilidade e D-U-N-S | Decisão D3 | Não levantado |
| Revisor de conteúdo, moderadores e assessoria jurídica | Decisão D5 | Não levantado |
| Engenharia e operação (horas) | Provavelmente o maior custo em todas as escalas [HIP] | Fora da conta |
| Mac (só se a stack mudar para Flutter, KMP ou nativo) | ADR-002 | Mac mini a partir de US$ 899; Mac remoto a partir de US$ 25/mês; Codemagic com 500 min/mês grátis |

## 4. IA: assinatura não é crédito de API

- As assinaturas pessoais de assistentes de IA usadas no desenvolvimento (por exemplo, Claude ou ChatGPT) servem a quem desenvolve. Elas não dão crédito de API para recursos do produto nem cobrem uso por usuários.
- O MVP proposto não tem IA generativa respondendo a usuários ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).
- Se algum recurso de IA entrar depois, ele terá custo de API próprio, contrato com o fornecedor, avaliação de transferência internacional e consentimento específico ([Privacidade e segurança](Privacidade_e_Seguranca.md), seção 4).

## 5. Backups e restauração

- **O que o Supabase Pro oferece:** backups diários com 7 dias de acesso. O PITR de 7 dias custa US$ 100/mês. O plano Team (US$ 599/mês) dá 14 dias. Os backups não incluem objetos do Storage ([Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), seção 3).
- **Proposta para o piloto:** PITR de 7 dias e janela de backup de 7 dias. Janela curta também ajuda a exclusão: o dado apagado some dos backups em até 7 dias.
- **Janela maior:** só com cópia externa cifrada, numa região do Brasil, com custo [NC]. A decisão depende do RPO e do RTO que Daniel aceitar.
- **Restauração:** ensaio registrado antes do piloto e depois de cada mudança de esquema relevante. Depois de restaurar, as exclusões são reaplicadas para não ressuscitar dados apagados (Q-12).
- **PowerSync:** guarda réplica e buckets, não é fonte de verdade. Depois de uma restauração do banco, ele se reconstrói a partir do PostgreSQL [HIP, a confirmar na prova].

## 6. Operação mínima

### 6.1 Ambientes

Local (Docker no Windows), homologação com dados fictícios e produção, conforme a [Arquitetura proposta, seção 7](../03_Arquitetura/Arquitetura_Proposta.md). Planos gratuitos não entram em produção nem em homologação contínua, porque pausam por inatividade.

### 6.2 Monitoramento e alertas

| Sinal | Por quê | Alerta proposto |
| --- | --- | --- |
| Disponibilidade do serviço e do endpoint de envio | Sem envio, a fila cresce nos aparelhos | Falha por mais de 5 minutos |
| Rejeições e conflitos por hora | Defeito de versão ou de permissão | Desvio do padrão da semana |
| Atraso de replicação do PowerSync | Cuidador B não vê o registro de A | Acima de 1 minuto [HIP] |
| Erros no app, sem conteúdo | Qualidade | Nova falha em mais de 1% das sessões [HIP] |
| Fila de moderação | Prazos da comunidade | Item de crise sem triagem no turno |
| Gasto | Evitar surpresa | Spend cap do Supabase ligado (é o padrão no Pro); alertas de orçamento nos demais |

Os limiares são hipóteses para calibrar no piloto.

### 6.3 Suporte

- Canal por e-mail, com endereço publicado no site e no app, mais uma página de perguntas frequentes.
- Meta proposta no piloto: primeira resposta em 1 dia útil [HIP].
- O suporte não acessa o espaço da família. Se for preciso diagnosticar, o próprio usuário envia dados técnicos sem conteúdo. Um acesso de emergência, se existir, segue a regra de auditoria de [Privacidade e segurança](Privacidade_e_Seguranca.md).

### 6.4 Moderação

A operação proposta está em [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) e na [pesquisa de comunidade](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md):

- um ou dois moderadores em meio período, sem acesso a dados de família;
- triagem de crise em até 1 hora dentro do horário coberto e demais denúncias em até 24 horas;
- fora do turno, o conteúdo com gatilho fica oculto do público até a revisão.

O custo de pessoas é a decisão D5.

### 6.5 Distribuição

| Item | Como | Custo e prazo |
| --- | --- | --- |
| iOS | EAS Build e EAS Submit a partir do Windows; TestFlight para o piloto | Apple US$ 99/ano; uma conta de organização exige D-U-N-S |
| Android | EAS Build; faixas de teste da Play | US$ 25 uma vez; conta pessoal nova: 12 testadores por 14 dias antes da produção |
| Atualizações de JavaScript | EAS Update | Starter: 3 mil MAU incluídos, depois US$ 0,005/MAU |
| Exigências técnicas das lojas | Xcode 26+ desde 28/04/2026; API 36 desde 31/08/2026 ([Mobile e plataformas](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)) | Revisar a cada ciclo anual das lojas |

### 6.6 Incidentes e plantão

- Roteiro e prazos em [Privacidade e segurança, seção 11](Privacidade_e_Seguranca.md).
- Com uma pessoa só operando, não há plantão contínuo. Isso é um risco aceito no piloto, que precisa ser declarado aos participantes [HIP].

## 7. Plano de saída por fornecedor

| Fornecedor | Para onde sair | O que facilita | Custo de sair |
| --- | --- | --- | --- |
| Supabase (banco e Auth) | Qualquer PostgreSQL gerenciado (RDS, Cloud SQL, Neon) e outro provedor de identidade | PostgreSQL padrão; esquemas e políticas versionados no repositório; serviço próprio com as regras | Migrar contas e trocar a emissão de JWT; o login por código de e-mail é simples de reproduzir |
| PowerSync | PowerSync Open Edition auto-hospedado, ou sincronização própria (Conjunto C) | O contrato de envio (`POST /v1/sync/operacoes`) e as regras são nossos ([Arquitetura proposta, seção 9](../03_Arquitetura/Arquitetura_Proposta.md)) | Escrever o pull por cursor e o cliente de sync próprio |
| Expo / EAS | Builds locais ou outro CI | O código é React Native padrão | iOS sem EAS exige Mac ou CI macOS |
| Provedor de e-mail | Qualquer SMTP ou API de e-mail | Envio isolado no serviço | Baixo |
| Push da Expo | FCM e APNs direto | Já são o transporte por baixo | Baixo |
| Hospedagem do serviço | Qualquer plataforma de container | Imagem de container | Baixo |

Os usuários também podem sair: a exportação completa por família faz parte do MVP ([Privacidade e segurança, seção 7](Privacidade_e_Seguranca.md)).

## 8. Riscos de custo

- **Plano gratuito tratado como produção:** os planos Free do Supabase e do PowerSync pausam ou desativam após 1 semana sem uso.
- **Teto do PowerSync Pro:** por padrão, no máximo 3.000 clientes simultâneos e 100 GB hospedados. Acima disso, vem o plano Team (US$ 599+) ou a auto-hospedagem.
- **EAS Update e OneSignal:** em 10 mil famílias, podem somar mais que todo o backend.
- **Câmbio:** todos os preços estão em USD.
- **Firebase (só se o Conjunto A for escolhido):** não há teto automático de gasto.

## 9. Questões abertas

1. Qual RPO e RTO aceitar? Decide o PITR e a janela de backup.
2. Quais são os preços das regiões do Brasil? Coletar antes da fundação.
3. Qual ferramenta de monitoramento e relatório de falhas usar, com limpeza de conteúdo?
4. Onde hospedar o serviço de domínio no Brasil, e a que preço?
5. Quem atende suporte e moderação no piloto, e em que horário?

## Limites desta análise

- Fotografia de preços de 22/10/2026 e premissas inventadas para ordem de grandeza; nada foi medido.
- O custo da hospedagem do serviço de domínio foi acrescentado pelo coordenador, com preços dos EUA.
- Custos de pessoas, jurídico e empresa não foram levantados.
- Documento escrito pelo coordenador, porque o redator delegado parou por falta de resposta do provedor.

## Relação com outros documentos

[Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md) · [Privacidade e segurança](Privacidade_e_Seguranca.md) · [Qualidade e validação](Qualidade_e_Validacao.md) · [ADR-008](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md) · [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)
