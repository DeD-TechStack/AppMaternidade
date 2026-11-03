---
tipo: pesquisa-tecnologia
status: rascunho
responsavel: Hermes (subagente dados e backend)
revisado_em: 2026-10-22
fontes_principais:
  - https://cloud.google.com/firestore/pricing
  - https://firebase.google.com/pricing
  - https://supabase.com/pricing
  - https://www.powersync.com/pricing
  - https://expo.dev/pricing
  - https://developer.apple.com/programs/enroll/
  - https://cloud.google.com/run/pricing
  - https://developers.cloudflare.com/r2/pricing/
---

# Preços datados (fotografia de 22/10/2026)

Esta nota lista preços e limites exibidos nas páginas oficiais em 22/10/2026 (America/Sao_Paulo). Valores em USD, sem impostos, IOF ou câmbio. Preço de página não é contrato. **Plano gratuito não é garantia de produção.** **Assinatura pessoal de IA não é crédito de API.**

A análise técnica que usa estes números está em [Dados, sincronização e backend](Dados_Sincronizacao_e_Backend.md). Convenções em [Convenções](../../00_Inicio/Convencoes.md).

Legenda das observações:
- **[NC]**: preço não confirmado nesta rodada (tabela dinâmica não capturada ou não consultada).
- **[HIP]**: estimativa ou inferência.

## 1. Lojas e build

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Apple Developer Program | Anual | "99 USD per membership year"; "Prices may vary by region" | https://developer.apple.com/programs/enroll/ | 22/10/2026 | Isenção possível para ONGs, instituições de ensino e governo. Necessário para distribuir via TestFlight/App Store [HIP: não reverificado nesta rodada]. |
| Google Play Console | Registro | "US$25 one-time registration fee" | https://support.google.com/googleplay/android-developer/answer/6112435 | 22/10/2026 | Pode exigir documento e cartão no nome legal. Taxa não reembolsada se os dados forem inválidos. Contas pessoais novas têm requisito de testes (ver nota do outro subagente). |
| Expo EAS | Free | US$ 0; 15 builds Android + 15 iOS/mês; fila de baixa prioridade; updates para 1 mil MAU | https://expo.dev/pricing | 22/10/2026 | Fila de baixa prioridade pode esperar "90+ minutes" em pico. |
| Expo EAS | Starter | US$ 19/mês + uso; US$ 45 de crédito de build; fila prioritária; updates para 3 mil MAU | https://expo.dev/pricing | 22/10/2026 | Builds avulsos: Android US$ 1 (medium) / US$ 2 (large); iOS US$ 2 / US$ 4. Updates acima de 3 mil MAU: US$ 0,005/MAU (faixa 3.001–200.000). Banda 100 GiB, depois US$ 0,10/GiB. |
| Expo EAS | Production | US$ 199/mês + uso; US$ 225 de crédito; updates para 50 mil MAU; suporte prioritário | https://expo.dev/pricing | 22/10/2026 | Storage 1 TiB incluído. |
| Expo EAS | Enterprise | Sob consulta; a partir de US$ 1.000 de crédito | https://expo.dev/pricing | 22/10/2026 | — |

## 2. Firebase e Google Cloud

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Firebase | Spark | Sem custo, sem meio de pagamento | https://firebase.google.com/pricing | 22/10/2026 | Sem Cloud Storage (402/403). Login por link de e-mail limitado a 5 e-mails/dia. Inviável para produção do app. |
| Firebase | Blaze | Pay-as-you-go; as cotas sem custo continuam valendo | https://firebase.google.com/pricing | 22/10/2026 | Exige conta de faturamento. Não há teto automático de gasto (alertas de orçamento não bloqueiam) [HIP: não reverificado]. |
| Firestore Standard (us-central1 exibido) | Cota grátis | 1 GiB armazenado; 50.000 leituras/dia; 20.000 escritas/dia; 20.000 exclusões/dia; 10 GiB/mês de saída | https://cloud.google.com/firestore/pricing | 22/10/2026 | "No free quota for named databases": só o banco `(default)` tem cota. |
| Firestore Standard | Uso | Leitura US$ 0,03/100 mil; escrita US$ 0,09/100 mil; exclusão US$ 0,01/100 mil; TTL US$ 0,01/100 mil | https://cloud.google.com/firestore/pricing | 22/10/2026 | Listener desconectado > 30 min relê como consulta nova. Mínimo de 1 leitura por consulta. `get()`/`exists()` nas regras cobram leituras (https://firebase.google.com/docs/firestore/pricing). Preço de São Paulo [NC]. |
| Firestore Standard | Armazenamento/backup | Dados US$ 0,000205479/GiB-hora (≈ US$ 0,15/GiB-mês); PITR, mesmo valor; backup US$ 0,000041096/GiB-hora (≈ US$ 0,03/GiB-mês); restauração e clone US$ 0,20/GiB | https://cloud.google.com/firestore/pricing | 22/10/2026 | Saída de rede acima de 10 GiB segue a tabela de rede do Google Cloud [NC: taxa exata não capturada]. |
| Firebase Authentication | Spark e Blaze | 50 mil MAU sem custo; SAML/OIDC 50 MAU | https://firebase.google.com/pricing | 22/10/2026 | Limites de e-mail: link de login 5/dia no Spark, 25.000/dia no Blaze (https://firebase.google.com/docs/auth/limits). |
| Identity Platform (acima de 50 mil MAU) | Tier 1 (e-mail, social, anônimo) | 0–50 mil: grátis; 50 mil–100 mil: US$ 0,0055/MAU; 100 mil–1 milhão: US$ 0,0046/MAU | https://cloud.google.com/identity-platform/pricing | 22/10/2026 | Tier 2 (SAML/OIDC): US$ 0,015/MAU acima de 50. SMS por mensagem: Brasil US$ 0,02 (as 10 primeiras/dia não são cobradas). |
| Cloud Storage for Firebase | Blaze (obrigatório) | Buckets `*.firebasestorage.app`: sem custo até 5 GB-mês, 100 GB/mês de download, 5 mil uploads e 50 mil downloads/mês; depois, tabela do Cloud Storage | https://firebase.google.com/pricing | 22/10/2026 | Cotas grátis só em us-central1, us-west1 e us-east1. Buckets legados `*.appspot.com`: 5 GB, depois US$ 0,026/GB; 1 GB/dia de download, depois US$ 0,12/GB. |
| Cloud Functions (via Firebase) | Blaze | 2 milhões de invocações/mês grátis, depois US$ 0,40/milhão; 400 mil GB-s; 200 mil CPU-s; 5 GB de saída, depois US$ 0,12/GB | https://firebase.google.com/pricing | 22/10/2026 | Cloud Build: 120 min/dia grátis. |
| Firebase Cloud Messaging | Todos | "No-cost" | https://firebase.google.com/pricing | 22/10/2026 | APIs InstanceId e device groups desligam em 29/09/2027. |
| Cloud Run | Request-based (Tier 1) | CPU ativa US$ 0,000024/vCPU-s; memória US$ 0,0000025/GiB-s; US$ 0,40/milhão de requisições; ocioso de instância mínima US$ 0,0000025 | https://cloud.google.com/run/pricing | 22/10/2026 | Grátis/mês: 180 mil vCPU-s, 360 mil GiB-s, 2 milhões de requisições. Saída: 1 GiB/mês grátis na América do Norte, depois tabela de rede. |
| Cloud Run | Instance-based | US$ 0,000018/vCPU-s; US$ 0,000002/GiB-s | https://cloud.google.com/run/pricing | 22/10/2026 | Grátis: 240 mil vCPU-s, 450 mil GiB-s. |
| Cloud SQL para PostgreSQL | Enterprise (us-central1) | vCPU US$ 0,0413/h; memória US$ 0,007/GiB-h; HA em dobro. Compartilhadas: db-f1-micro US$ 0,0105/h; db-g1-small US$ 0,035/h | https://cloud.google.com/sql/pricing | 22/10/2026 | Instâncias compartilhadas "are not covered by the Cloud SQL SLA". SSD US$ 0,000232877/GiB-h (≈ US$ 0,17/GiB-mês), HA US$ 0,000465753; backup US$ 0,000109589/GiB-h (≈ US$ 0,08/GiB-mês). Clientes novos: US$ 300 em créditos. |
| Cloud Storage (GCS) | Standard (us-central1) | US$ 0,000027397/GiB-h (≈ US$ 0,020/GiB-mês); Classe A US$ 0,005/mil; Classe B US$ 0,0004/mil | https://cloud.google.com/storage/pricing | 22/10/2026 | Saída para "Worldwide": US$ 0,12/GiB (0–10 TiB). Always Free: 5 GB-mês, 5 mil Classe A e 50 mil Classe B, só em regiões dos EUA. São Paulo [NC]. |

## 3. Supabase

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Supabase | Free | US$ 0; 50 mil MAU; banco de 500 MB; CPU compartilhada com 500 MB de RAM; 5 GB de egress + 5 GB em cache; 1 GB de arquivos | https://supabase.com/pricing | 22/10/2026 | **"Free projects are paused after 1 week of inactivity. Limit of 2 active projects."** Sem backups automáticos (só Pro/Team/Enterprise). SMTP padrão: 2 mensagens/hora e só para a equipe. |
| Supabase | Pro | A partir de US$ 25/mês; 100 mil MAU, depois US$ 0,00325/MAU; disco de 8 GB/projeto, depois US$ 0,125/GB; 250 GB de egress, depois US$ 0,09/GB; 250 GB em cache, depois US$ 0,03/GB; 100 GB de arquivos, depois US$ 0,0213/GB | https://supabase.com/pricing | 22/10/2026 | Backups diários com 7 dias de acesso; logs de 7 dias. US$ 10/mês de crédito de compute (cobre um Micro). Projetos extras a partir de US$ 10/mês. Spend cap ligado por padrão. |
| Supabase | Team | A partir de US$ 599/mês | https://supabase.com/pricing | 22/10/2026 | SOC 2 e ISO 27001; "HIPAA available as paid add-on"; backups de 14 dias; logs de 28 dias. |
| Supabase compute | Add-on | Micro US$ 10 (1 GB); Small US$ 15 (2 GB); Medium US$ 60 (4 GB); Large US$ 110 (2 vCPU dedicadas, 8 GB); XL US$ 210 | https://supabase.com/pricing | 22/10/2026 | Valores por projeto/mês. |
| Supabase PITR | Add-on | US$ 100/mês por 7 dias de retenção | https://supabase.com/pricing | 22/10/2026 | Não disponível no Free. Backups não incluem objetos do Storage (https://supabase.com/docs/guides/platform/backups). |
| Supabase Realtime | Pro | 500 conexões de pico, depois US$ 10/mil; 5 milhões de mensagens, depois US$ 2,50/milhão | https://supabase.com/pricing | 22/10/2026 | Free: 200 conexões e 2 milhões de mensagens. |
| Supabase Edge Functions | Pro | 2 milhões de invocações, depois US$ 2/milhão | https://supabase.com/pricing | 22/10/2026 | Free: 500 mil. |
| Supabase extras | Pro | Domínio próprio US$ 10/mês; log drain US$ 60/drain + US$ 0,20/milhão de eventos; MFA por telefone US$ 75/mês; transformação de imagem: 100 grátis, depois US$ 5/mil | https://supabase.com/pricing | 22/10/2026 | — |

## 4. Camadas de sincronização

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| PowerSync Cloud | Free | US$ 0; 2 GB sincronizados/mês; 500 MB hospedados; 50 clientes simultâneos no pico; 2 instâncias | https://www.powersync.com/pricing | 22/10/2026 | **"Free projects are deactivated after 1 week of inactivity."** Logs de 24 h. |
| PowerSync Cloud | Pro | A partir de US$ 49/mês; 30 GB sincronizados, depois US$ 1/GB; 10 GB hospedados, depois US$ 1/GB (máx. 100 GB por padrão); 1.000 clientes simultâneos, depois US$ 30 por mil (máx. 3.000 por padrão); 2 instâncias, depois US$ 25/mês cada | https://www.powersync.com/pricing | 22/10/2026 | Sem desativação. Logs de 7 dias. |
| PowerSync Cloud | Team | A partir de US$ 599/mês; hospedagem até 500 GB; 10 mil clientes (configurável para 50 mil+) | https://www.powersync.com/pricing | 22/10/2026 | Logs de 30 dias. A página lista relatório SOC 2 e "HIPAA compliance available" na grade de recursos (plano exato [NC]). |
| PowerSync self-host | Open Edition | Sem preço de licença (FSL-1.1-ALv2) | https://docs.powersync.com/intro/self-hosting | 22/10/2026 | Custo é a infraestrutura própria: serviço + banco de bucket storage (Postgres ou MongoDB). Enterprise Self-Hosted sob consulta. |
| Electric Cloud | PAYG | US$ 1 por milhão de escritas; US$ 0,10/GB-mês de retenção; leitura, egress e fan-out grátis | https://electric.ax/pricing | 22/10/2026 | Contas abaixo de US$ 5/mês são isentas. Pro US$ 249/mês (−10%); Scale US$ 1.999/mês (−20%). Electric não faz escrita. |
| Cloud Zero | — | Sem preço público confirmado | https://zero.rocicorp.dev/docs/cloud-zero | 22/10/2026 | Acesso por formulário; roadmap 2026 prevê "full public availability" [NC]. |

## 5. Hospedagem e PostgreSQL gerenciado

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Render | Workspace | Hobby US$ 0; Pro US$ 25/mês; Scale US$ 499/mês; Enterprise sob consulta | https://render.com/pricing | 22/10/2026 | Banda incluída: 5 GB (Hobby), 25 GB (Pro), 1 TB (Scale). |
| Render | Web service | Free (com limitações); 0,5 CPU/512 MB US$ 7/mês; 1 CPU/2 GB US$ 25/mês; 2 CPU/4 GB US$ 85/mês | https://render.com/pricing | 22/10/2026 | SSD US$ 0,25/GB-mês. |
| Render Postgres | Instância | Free (com limitações); 256 MB US$ 6/mês; 1 GB US$ 19/mês; 1 CPU/2 GB US$ 40/mês; 1 CPU/4 GB US$ 55/mês; 2 CPU/4 GB US$ 75/mês | https://render.com/pricing | 22/10/2026 | Armazenamento US$ 0,30/GB. PITR listado. "Logical backup for paid instances". |
| Railway | Planos | Free US$ 0 (US$ 1 de crédito/mês); Hobby US$ 5/mês (inclui US$ 5 de uso); Pro US$ 20/mês (inclui US$ 20 de uso) | https://docs.railway.com/reference/pricing/plans | 22/10/2026 | Uso: RAM US$ 10/GB-mês; CPU US$ 20/vCPU-mês; egress US$ 0,05/GB; volume US$ 0,15/GB-mês. Trial de 30 dias com US$ 5. |
| Fly.io | Machines | shared-cpu-1x: 256 MB US$ 2,19/mês; 512 MB US$ 3,69; 1 GB US$ 6,70. shared-cpu-2x 2 GB US$ 13,39 | https://docs.fly.io/about/pricing | 22/10/2026 | Volume US$ 0,15/GB-mês. Saída US$ 0,02/GB (América do Norte/Europa) e US$ 0,04/GB (América do Sul). Suporte padrão US$ 29/mês. |
| Fly.io | Managed Postgres | US$ 38/mês (Basic) a US$ 1.922/mês | https://docs.fly.io/about/pricing | 22/10/2026 | Armazenamento US$ 0,28/GB-mês. |
| Neon | Free | US$ 0; 100 CU-horas/projeto; scale-to-zero após 5 min; 1 GB/projeto; restauração de até 6 h ou 1 GB de mudanças; 5 GB de egress | https://neon.com/pricing | 22/10/2026 | Free sem cartão e sem prazo. Não é garantia de produção. |
| Neon | Launch | US$ 0,106/CU-hora; US$ 0,35/GB-mês; histórico US$ 0,20/GB-mês; restauração de até 7 dias | https://neon.com/pricing | 22/10/2026 | "Typical spend: $15/mo". Até 16 CU. |
| Neon | Scale | US$ 0,222/CU-hora; US$ 0,35/GB-mês; restauração de até 30 dias | https://neon.com/pricing | 22/10/2026 | "Typical spend: $701/mo". |
| Amazon RDS for PostgreSQL | On-demand | db.t4g.micro US$ 0,016/h; db.t4g.small US$ 0,032/h (Single-AZ); Multi-AZ db.t4g.micro US$ 0,032/h | https://aws.amazon.com/rds/postgresql/pricing/ | 22/10/2026 | Região da tabela não identificada no texto extraído [NC]. gp2/gp3 US$ 0,115/GB-mês. Backup sem custo até 100% do armazenamento do banco, depois US$ 0,095/GiB-mês. Free Tier: 750 h/mês por 12 meses para clientes novos. |
| Cloud SQL / Cloud Run | — | Ver seção 2 | — | — | — |
| Supabase (como Postgres) | — | Ver seção 3 | — | — | — |

## 6. Autenticação

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Supabase Auth | Free/Pro | 50 mil MAU (Free); 100 mil MAU (Pro), depois US$ 0,00325/MAU | https://supabase.com/pricing | 22/10/2026 | Passkeys experimentais/beta. Exige SMTP próprio em produção. |
| Firebase Auth | Spark/Blaze | 50 mil MAU sem custo; acima, Identity Platform | https://firebase.google.com/pricing | 22/10/2026 | Ver seção 2. |
| Clerk | Hobby | Grátis; "50,000 MRU limit per app" | https://clerk.com/pricing | 22/10/2026 | MRU = usuário retido mensal, conforme a página. |
| Clerk | Pro | US$ 20/mês com cobrança anual; 50 mil MRU incluídos, depois US$ 0,02/MRU | https://clerk.com/pricing | 22/10/2026 | Valor mensal sem cobrança anual [NC]. |
| Auth0 | Free | US$ 0; até 25 mil MAU | https://auth0.com/pricing | 22/10/2026 | Passkeys e passwordless incluídos em todos os planos. |
| Auth0 | Essentials (B2C) | US$ 35/mês para até 500 MAU | https://auth0.com/pricing | 22/10/2026 | Professional US$ 240/mês. Faixas maiores sob consulta ("Custom Tiers"). |
| Amazon Cognito | Lite/Essentials | Free tier de 10 mil MAU (diretos + social) sem expiração; Essentials US$ 0,015/MAU acima disso | https://aws.amazon.com/cognito/pricing/ | 22/10/2026 | Plus US$ 0,020/MAU. SAML/OIDC: 50 MAU grátis. Lite tem tabela por faixas mais barata [NC: faixas completas]. |

## 7. Push

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| FCM (HTTP v1) | — | Sem custo | https://firebase.google.com/pricing | 22/10/2026 | Payload de dados até 4 KB. |
| APNs | — | Sem tabela de preço por mensagem; incluído na adesão ao Apple Developer Program [HIP] | https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns | 22/10/2026 | Chave .p8; token renovado ao menos de hora em hora. |
| Expo Push Service | — | "There is no cost"; limite de 600 notificações/s por projeto | https://docs.expo.dev/push-notifications/faq/ | 22/10/2026 | Entrega at-least-once. Não funciona no Expo Go (SDK 53+). |
| OneSignal | Free | US$ 0; push ilimitado "for organizations with up to 1,000 monthly active users"; e-mail 10 mil envios/mês | https://onesignal.com/pricing | 22/10/2026 | Acima de 1 mil MAU, sai do Free. |
| OneSignal | Growth | A partir de US$ 19/mês; push US$ 0,012/MAU; e-mail 20 mil grátis, depois US$ 1,50/mil | https://onesignal.com/pricing | 22/10/2026 | Com 20 mil MAU ≈ US$ 240/mês só de push [HIP: cálculo]. |

## 8. E-mail transacional

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Resend | Free | US$ 0; 3.000 e-mails/mês; **100/dia**; 3 domínios; retenção de 30 dias | https://resend.com/pricing | 22/10/2026 | O limite diário pode travar picos de convite. |
| Resend | Pro | US$ 20/mês; 50.000 e-mails/mês; extra US$ 0,90/mil | https://resend.com/pricing | 22/10/2026 | 10 domínios. |
| Resend | Scale | US$ 90/mês; 100.000 e-mails/mês; extra US$ 0,90/mil | https://resend.com/pricing | 22/10/2026 | IP dedicado como add-on. |
| Postmark | Free | US$ 0; 100 e-mails/mês, sem excedente | https://postmarkapp.com/pricing | 22/10/2026 | Para teste. |
| Postmark | Basic / Pro | Basic US$ 15/mês (10 mil, extra US$ 1,80/mil); Pro US$ 16,50/mês (10 mil, extra US$ 1,30/mil) | https://postmarkapp.com/pricing | 22/10/2026 | Platform US$ 18/mês. |
| Amazon SES | À la carte | US$ 0,10 por mil e-mails; US$ 0,12/GB de anexo | https://aws.amazon.com/ses/pricing/ | 22/10/2026 | Planos novos: Essentials US$ 0,16/mil; Pro US$ 0,22/mil + US$ 105/mês; Enterprise US$ 0,23/mil + US$ 500/mês. Clientes novos: até US$ 200 em créditos do Free Tier. |

## 9. Armazenamento de objetos

| Item | Plano | Preço/limite exibido | URL | Data | Observações |
| --- | --- | --- | --- | --- | --- |
| Cloudflare R2 | Standard | US$ 0,015/GB-mês; Classe A US$ 4,50/milhão; Classe B US$ 0,36/milhão; **egress grátis** | https://developers.cloudflare.com/r2/pricing/ | 22/10/2026 | Grátis/mês: 10 GB-mês, 1 milhão Classe A, 10 milhões Classe B. Infrequent Access US$ 0,01/GB-mês + US$ 0,01/GB de recuperação. |
| Google Cloud Storage | Standard us-central1 | ≈ US$ 0,020/GiB-mês; saída US$ 0,12/GiB | https://cloud.google.com/storage/pricing | 22/10/2026 | Ver seção 2. |
| Supabase Storage | Pro | 100 GB incluídos, depois US$ 0,0213/GB | https://supabase.com/pricing | 22/10/2026 | Egress dentro da cota do plano. |
| Cloud Storage for Firebase | Blaze | Ver seção 2 | https://firebase.google.com/pricing | 22/10/2026 | — |
| Amazon S3 | Standard | [NC]: a tabela dinâmica não foi capturada | https://aws.amazon.com/s3/pricing/ | 22/10/2026 | Saída para internet aparece nos exemplos da página (ex.: US$ 0,09/GB a partir da Irlanda). Usar a calculadora. |

## 10. Custo mensal ilustrativo dos três conjuntos

**Cenário ilustrativo, não previsão.** Calculado com os preços acima e as premissas abaixo. O script ficou só na área temporária do agente; as fórmulas estão nesta seção para que o cálculo possa ser refeito. O custo de engenharia (horas de desenvolvimento e operação) **não** está incluído e provavelmente supera a infraestrutura em todas as escalas. [HIP]

### 10.1 Premissas [HIP]

| Premissa | Valor |
| --- | --- |
| Famílias ativas no mês | 100 / 1.000 / 10.000 |
| Cuidadores (e aparelhos) por família | 2 → MAU = 2 × famílias |
| Escritas de rotina | 25 por família/dia (20 registros + 5 edições/exclusões). No Firestore, 30 (com atualização de resumo/sessão) |
| Aberturas/sincronizações | 8 por aparelho/dia |
| Leituras Firestore | ~515 por família/dia: 18 docs por abertura (listener relido após > 30 min), 12,5 atualizações em tempo real, 25 leituras de regras em escritas, 32 em consultas, 140 de histórico de 7 dias e 18 de comunidade |
| Volume estruturado após 12 meses | Postgres 5 MB por família/ano; Firestore 10 MB por família/ano (documentos + índices) |
| Anexos | 4 fotos/mês de 300 KB (sem EXIF) por família; cada foto baixada 3×; retenção de 12 meses |
| Sync PowerSync | ~0,5 KB por operação; janela de 90 dias hospedada; pico de 10% dos aparelhos conectados |
| API própria (Cloud Run) | 40 requisições por família/dia; 0,06 vCPU-s por requisição; 1 instância mínima |
| E-mails | 3 por família/mês (login por link/OTP + convites). No conjunto A, o login por link sai pelo Firebase Auth e o Resend envia só convites |
| Push | 5 por família/dia via FCM/APNs ou Expo Push (sem custo). OneSignal só como opcional |
| Comunidade | 30% dos usuários leem 30 itens/dia; postagem desprezível |
| Builds | EAS Starter (US$ 19) + Apple (US$ 99/12 = US$ 8,25/mês). Google Play é taxa única (fora do mensal) |
| Região | Preços exibidos dos EUA (us-central1 etc.). Brasil [NC] |

### 10.2 Resultado (USD/mês)

| Conjunto | 100 famílias | 1.000 famílias | 10.000 famílias | Itens que dominam |
| --- | ---: | ---: | ---: | --- |
| A: Firebase (infra) | ~0 | ~7,50 | ~112 | Leituras Firestore (US$ 46 em 10 mil), armazenamento (US$ 14,50), saída de rede (US$ 16,50, taxa [NC]), Resend Pro para convites (US$ 20) |
| A + fixos (EAS Starter + Apple) | ~27 | ~35 | ~139 | — |
| B: Supabase + PowerSync (infra) | ~74 | ~94 | ~186 | Supabase Pro US$ 25 + PowerSync Pro US$ 49 desde o início; em 10 mil: compute Medium (+US$ 50), concorrência PowerSync (+US$ 30), Resend (US$ 20) |
| B + fixos | ~101 | ~121 | ~214 | — |
| C: Cloud Run + Cloud SQL + R2 (infra) | ~37 | ~82 | ~175 | Cloud SQL: compartilhada em 100; 1 vCPU em 1 mil; HA em 10 mil (US$ 99) + disco HA (US$ 20) |
| C + fixos | ~64 | ~109 | ~202 | — |

**O conjunto B desta tabela é um subtotal sem o serviço de domínio** que a arquitetura proposta acrescenta, com hospedagem de US$ 7 a 85/mês. A composição do conjunto recomendado está em [Custos e operação](../../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2.

Em 10.000 famílias, as fórmulas abaixo dão ~US$ 7,44 de excedentes para B: banco, arquivos e dados hospedados no PowerSync. Somados aos itens que dominam (US$ 174), chegam a ~US$ 181, e não aos ~186 da tabela. Os ~US$ 4,56 de diferença não se reproduzem pelas fórmulas, e o script original não foi guardado. A composição canônica os mantém como margem conservadora.

Notas do coordenador, acrescentadas depois da revisão independente.

Fórmulas usadas (por mês, 30 dias):
- **Firestore:**
  - leituras: `max(0, leituras_dia − 50.000) × 30 × 0,03/100.000`;
  - escritas: `max(0, escritas_dia − 20.000) × 30 × 0,09/100.000`;
  - armazenamento: `max(0, GiB − 1) × 0,15`;
  - saída: `max(0, GiB − 10) × 0,12` (taxa proxy [NC]).
- **PowerSync:**
  - US$ 49 + `max(0, GB_sync − 30)` + `max(0, GB_hosp − 10)`;
  - mais US$ 30 por mil clientes de pico acima de 1.000.
- **Supabase:**
  - US$ 25 + compute acima do crédito;
  - `max(0, GB_banco − 8) × 0,125` + `max(0, GB_arquivos − 100) × 0,0213`;
  - `max(0, invocações − 2 M) × 2/M`.
- **Cloud Run:**
  - `max(0, vCPU-s − 180 mil) × 0,000024` + `max(0, req − 2 M) × 0,40/M`;
  - mais o ocioso de 1 instância mínima (~US$ 9,86).
- **Cloud SQL:**
  - instância (db-g1-small, 1 vCPU/3,75 GiB, ou o dobro em HA) + disco SSD (HA em 10 mil) + backup ≈ 2 × banco.
- **R2:** `max(0, GB − 10) × 0,015`.
- **Resend:** Free abaixo de 3.000 e-mails/mês; senão, Pro US$ 20.

### 10.3 Opcionais que mudam muito a conta

| Opcional | 100 | 1.000 | 10.000 | Observação |
| --- | ---: | ---: | ---: | --- |
| EAS Update no Starter (MAU acima de 3 mil × US$ 0,005) | 0 | 0 | +85 | Em 10 mil famílias (20 mil MAU), o plano Production (US$ 199, 50 mil MAU) pode compensar. Só RN/Expo. |
| OneSignal Growth em vez de FCM/Expo Push | 0 | +24 | +240 | US$ 0,012/MAU acima do Free de 1.000 MAU. |
| Supabase PITR (7 dias) | +100 | +100 | +100 | Recomendável para dado sensível em produção (decisão de RPO). |
| Ambiente de homologação | [HIP] +10 a +50 | idem | idem | Projeto Supabase extra (compute), segunda instância Cloud SQL ou outro projeto Firebase. |
| PowerSync Free/Supabase Free no protótipo | −74 | n/a | n/a | Só protótipo: desativa ou pausa após 1 semana sem uso. |

### 10.4 O que não está incluído

- Engenharia e operação (horas).
- Monitoramento e erros (ex.: Sentry): [NC], não consultado.
- Nome de domínio do site e DNS.
- Hospedagem do serviço de domínio do conjunto B recomendado ([Custos e operação](../../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2).
- Suporte pago.
- Moderação de conteúdo assistida (APIs de classificação).
- Backup externo (cópia fora do provedor).
- Impostos e câmbio.
- Assessoria jurídica.
- Testes em farm (outra nota).
- Hardware Mac para iOS (outra nota).
- Taxa única do Google Play (US$ 25).

### 10.5 Leitura dos números

- Até ~1.000 famílias, os custos fixos dominam: EAS e Apple (~US$ 27) e, no conjunto B, os dois planos pagos (US$ 74). Nessa faixa o conjunto A é o mais barato, mas exige o plano Blaze (cartão).
- Em 10 mil famílias, os três ficam entre ~US$ 140 e ~US$ 215/mês. A diferença é menor que o custo de algumas horas de engenharia por mês. **Custo de infraestrutura não deve decidir a arquitetura nessas escalas.** [HIP]
- O conjunto A é sensível ao padrão de leitura. Dobrar aberturas ou consultas de histórico dobra o item principal. B e C leem do SQLite local e são pouco sensíveis a isso.

## Fatores que mudariam a escolha

- **Residência de dados no Brasil:** os preços regionais (São Paulo) não foram capturados e podem ser maiores, sobretudo Cloud SQL, GCS e Firestore.
- **Uso intenso de histórico e relatórios no cliente** encarece o Firestore (leituras) e favorece B/C.
- **Mudança de plano ou preço do PowerSync** (Pro a US$ 49 hoje) ou do Supabase Pro altera B diretamente.
- **Uso de EAS Update e OneSignal** pode somar mais que todo o backend em 10 mil famílias.
- **Exigência de PITR/HIPAA-like** empurra B para o Team (US$ 599+) e C para HA com retenção maior.

## Questões abertas

1. Qual região será usada? Rodar de novo a coleta de preços para São Paulo.
2. Qual o RPO/RTO desejado? Define PITR e HA.
3. EAS Update será usado? Com quantos MAU?
4. A taxa de saída de rede do Firestore deve ser confirmada na tabela de rede do Google Cloud.
5. Preço do S3 e das faixas completas do Cognito Lite: coletar se forem candidatos.
6. Monitoramento e observabilidade: escolher ferramenta e precificar.

## Limites desta análise

- Fotografia de 22/10/2026. Páginas de preço mudam sem aviso; revalidar antes de decidir.
- Os cenários usam premissas inventadas para ilustrar a ordem de grandeza. Não houve medição de uso real nem de tamanho de documento ou linha.
- Onde a tabela da página é dinâmica (S3, região do RDS, egress do Firestore), o valor ficou marcado [NC] ou foi substituído por proxy declarado.
- Os valores com "a partir de" (Supabase, PowerSync, EAS) podem crescer com o uso. Foram considerados só os excedentes modelados.
