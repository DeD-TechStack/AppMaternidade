---
tipo: pesquisa
status: rascunho
responsavel: Hermes (subagente privacidade e lojas)
revisado_em: 2026-10-22
fontes_principais:
  - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/Decreto/D12880.htm
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396
  - https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12975.htm
  - https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/06/17180658/MCI_tese.pdf
  - https://developer.apple.com/app-store/review/guidelines/
  - https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
  - https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
  - https://support.google.com/googleplay/android-developer/answer/14738291?hl=en
---

# Pesquisa — privacidade, proteção de dados, segurança e requisitos das lojas

Pesquisa de referência da APP-001 sobre o que verificar, com fonte oficial, antes de lançar o AppMaternidade no Brasil. Todas as fontes foram consultadas em **22/10/2026** (America/Sao_Paulo). As marcas seguem as [Convenções do cofre](../00_Inicio/Convencoes.md): **[DOC]** é texto oficial (lei, decreto, resolução, decisão, política da loja); **[HIP]** é interpretação ou inferência do Hermes. Os códigos F01…F50 remetem à tabela de [Fontes](#fontes) e são estáveis.

> **Isto não é parecer jurídico.** O documento lista obrigações e riscos para orientar o design e a conversa com um advogado. Nenhuma linha aqui declara que o produto está conforme. Itens marcados [HIP] precisam de validação profissional antes de virarem decisão.

Documentos relacionados: [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) e [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md). Moderação da comunidade e fontes de conteúdo são de outro subagente (doc previsto `04_Comunidade_Conteudo/Comunidade_e_Moderacao.md`); aqui só entra o mínimo legal. A síntese operacional deste material deve alimentar os docs previstos `05_Privacidade_Operacao/Privacidade_e_Seguranca.md` e `07_Roadmap/Decisoes_para_Daniel.md`, que ainda não existiam em 22/10/2026.

## Resumo

- **Dados do bebê provavelmente são dados de saúde.** A LGPD inclui "dado referente à saúde" entre os sensíveis, mas não o define; a ANPD ainda está regulamentando o conceito [DOC F01 art. 5º II; F10 item 12]. Hipótese conservadora: tratar todos os registros de cuidado (sono, mamadas, fraldas, peso, temperatura, medicação, notas) como sensíveis e de criança, com consentimento específico e em destaque de um dos pais ou do responsável legal [DOC F01 arts. 11 I e 14 §1º; HIP].
- **O bebê é o titular dos dados dele**; os direitos são exercidos por representante legal. Cuidadores convidados são titulares dos próprios dados (conta, autoria), não representantes do bebê [DOC F01 arts. 5º V e 18 §3º; HIP].
- **ECA Digital (Lei 15.211/2025) está em vigor desde 17/03/2026**, regulamentado pelo Decreto 12.880/2026, com a ANPD como autoridade [DOC F13 art. 41-A; F02; F14; F15]. O app não é direcionado a crianças, mas a comunidade e a possibilidade de mães e pais adolescentes tornam discutível o "acesso provável" [DOC F13 art. 1º p.ú.; HIP]. Algumas obrigações valem para qualquer serviço disponível no Brasil, como remover e comunicar conteúdo de exploração ou abuso sexual infantil [DOC F13 art. 27; F15 arts. 36-39].
- **Incidente com dados de crianças** tende a ser "relevante": comunicar à ANPD e aos titulares em 3 dias úteis (6 para agente de pequeno porte) e manter registro de todo incidente por 5 anos [DOC F04 arts. 5º, 6º, 9º, 10].
- **Transferência internacional**: União Europeia reconhecida como adequada desde 27/01/2026; para EUA e demais países, cláusulas-padrão da ANPD sem alteração e página de transparência em português [DOC F08; F07 arts. 16-17].
- **Comunidade**: depois do STF (Temas 987/533, tese final de 17/06/2026) e dos Decretos 12.975 e 12.976/2026, o provedor responde após notificação por crimes e ilícitos (exceto honra), tem dever de cuidado sobre crimes graves contra mulheres e crianças e deve ter notificações, devido processo, relatório anual de transparência e prazos curtos, como **2 horas** para conteúdo íntimo não autorizado [DOC F20; F18; F19 art. 7º].
- **Lojas**: exclusão de conta iniciável dentro do app (Apple) e também por link web (Google); denúncia e bloqueio na comunidade; Data safety, rótulos de privacidade e manifesto de privacidade; declaração de apps de saúde obrigatória na Play [DOC F23 5.1.1(v) e 1.2; F35; F33; F25; F27; F36].
- **Pessoa física x jurídica**: a Apple diz que apps de saúde ou que exigem informação sensível "devem" ser enviados por pessoa jurídica, e a Google orienta conta de organização para apps de saúde como os médicos [DOC F23 5.1.1(ix); F42]. Somado ao Marco Civil e à tese do STF, isso aponta para publicar por uma PJ [HIP].

## 1. Premissas usadas nesta análise

| Item | Premissa | Classe |
| --- | --- | --- |
| Usuários | Adultos: mães, pais e outros cuidadores autorizados. | HIP (decisão de idade mínima pendente) |
| Titulares | Bebê (criança, art. 2º do ECA); cuidadores; participantes da comunidade. | HIP |
| Controlador | Quem opera o app: Daniel como pessoa física ou uma PJ (decisão pendente). Provedores de nuvem atuam como operadores. | HIP |
| País | Brasil no lançamento; expansão não decidida. | HIP |
| Dados | Conta do adulto; perfil do bebê (apelido, data de nascimento); registros de cuidado; notas livres; fotos opcionais; autoria e horários; vínculos e papéis; comunidade (perfil público, tópicos, respostas, denúncias); registros técnicos (IP, porta, horários); tokens de push; consentimentos. | HIP |
| Monetização e IA | Em aberto. Esta nota aponta só as restrições conhecidas. | HIP |

## 2. LGPD (Lei 13.709/2018)

### 2.1 Âmbito, papéis e autoridade

- A LGPD se aplica independentemente do país da sede ou de onde estão os dados, nas hipóteses do art. 3º [DOC F01 art. 3º]. Não se aplica ao tratamento por pessoa natural para fins exclusivamente particulares e não econômicos [DOC F01 art. 4º I]; isso pode alcançar o uso pessoal feito pelos cuidadores, mas não o operador do app [HIP].
- Controlador decide sobre o tratamento; operador trata em nome dele [DOC F01 art. 5º VI e VII].
- A ANPD passou a ser a **Agência Nacional de Proteção de Dados**, autarquia de natureza especial (Lei 15.352/2026, conversão da MP 1.317/2025) [DOC F02 art. 1º].

### 2.2 Dado sensível: os registros do bebê são "dado referente à saúde"?

- Dado sensível inclui "dado referente à saúde" [DOC F01 art. 5º II]. O tratamento de sensíveis só ocorre com consentimento específico e destacado do titular ou do responsável legal, ou nas hipóteses do inciso II [DOC F01 art. 11 I e II]. A regra também vale para tratamento que revele dado sensível e possa causar dano [DOC F01 art. 11 §1º].
- A LGPD não define "dado referente à saúde". A ação regulatória da ANPD sobre dados de saúde, **em andamento e sem consulta pública até 20/10/2026**, pretende tratar justamente "o conceito de dado pessoal sensível referente à saúde" [DOC F10 item 12].
- Referência comparada: o GDPR define dado relativo à saúde como o que revela informação sobre o estado de saúde [DOC F48 art. 4(15)].
- **[HIP]** Temperatura, medicação, peso, sintomas e notas clínicas são dados de saúde sem muita dúvida. Sono, volume de mamadas e fraldas, isolados, são discutíveis, mas em série e combinados revelam estado de saúde (desidratação, refluxo, infecção). Recomendação: projetar todo o espaço privado do bebê como sensível. Também é o enquadramento mais provável nas lojas ("Health info" na Play; regras de saúde da Apple) [DOC F33; F23 5.1.3].
- É vedado comunicar ou compartilhar dados de saúde entre controladores com objetivo de vantagem econômica, salvo exceções ligadas a serviços de saúde [DOC F01 art. 11 §4º]. **Impacto na monetização [HIP]:** nada de vender ou repassar dados do bebê a marcas, anunciantes, seguradoras ou planos de saúde.

### 2.3 Dados de crianças (art. 14) e Enunciado CD/ANPD nº 1/2023

| Dispositivo | Texto oficial (resumo) [DOC F01] | Consequência para o produto [HIP] |
| --- | --- | --- |
| art. 14 caput | Tratamento no melhor interesse da criança e do adolescente. | Justificar cada finalidade pelo interesse do bebê; registrar a avaliação no RIPD. |
| art. 14 §1º | Dados de crianças: consentimento específico e em destaque de pelo menos um dos pais ou do responsável legal. | Tela própria de consentimento ao criar o bebê, fora dos termos de uso. Só pai, mãe ou responsável legal cria o perfil e consente; avós e babás não. |
| art. 14 §2º | Manter pública a informação sobre tipos de dados, uso e procedimentos de direitos. | Política pública e acessível sem login. |
| art. 14 §3º | Coleta sem consentimento só para contatar os pais (uma vez, sem armazenar) ou para proteção. | Não se aplica ao uso normal do app. |
| art. 14 §4º | Não condicionar a participação a dados além dos estritamente necessários. | Apelido no lugar do nome; foto opcional; nenhum documento. |
| art. 14 §5º | Esforços razoáveis para verificar que o consentimento veio do responsável. | Declaração explícita de ser pai, mãe ou responsável legal, com prova guardada (quem, quando, versão do texto). Avaliar com advogado se basta. |
| art. 14 §6º | Informação simples, clara e acessível. | Textos curtos, em pt-BR, com acessibilidade. |

- O **Enunciado CD/ANPD nº 1/2023** diz que dados de crianças e adolescentes podem ser tratados com base nas hipóteses do art. 7º ou do art. 11, "desde que observado e prevalecente o seu melhor interesse" [DOC F03]. Ou seja, o consentimento parental não é a única base possível.
- Requisitos gerais do consentimento: cláusula destacada quando escrito; ônus da prova do controlador; finalidades determinadas (autorizações genéricas são nulas); revogação gratuita e facilitada; aviso destacado se a finalidade mudar [DOC F01 art. 8º §§1º, 2º, 4º, 5º e 6º; art. 9º §2º].

### 2.4 Bases legais por finalidade (proposta para validar)

| Finalidade | Dados | Base proposta [HIP] | Fundamento [DOC F01] |
| --- | --- | --- | --- |
| Conta e autenticação do adulto | nome, e-mail, credenciais | Execução de contrato | art. 7º V |
| Perfil do bebê e registros de cuidado | apelido, nascimento, registros, notas, fotos privadas | Consentimento específico e em destaque do responsável (arts. 14 §1º e 11 I), conservador. Alternativas a validar: art. 7º V para dados não sensíveis e art. 11 II "d" | arts. 7º, 11 e 14; Enunciado [F03] |
| Compartilhamento com cuidadores convidados | registros do bebê; nome e autoria do convidado | Parte do consentimento do responsável (ele escolhe quem vê); dados do convidado por contrato aceito no convite | arts. 7º V, 9º e 14 |
| Comunidade | perfil público, tópicos, respostas, denúncias | Contrato (termos da comunidade); moderação por obrigação legal (ECA Digital, Marco Civil) e legítimo interesse | arts. 7º II, V e IX; 10 |
| Segurança e registros de acesso | IP, porta, horários | Obrigação legal (Marco Civil art. 15, para PJ) e legítimo interesse | arts. 7º II e IX; 10 |
| Analytics de produto | eventos de uso | Consentimento (opt-in); a Apple exige consentimento para coletar dados de uso [DOC F23 5.1.1(ii)] | art. 7º I |
| Relatórios de falha | pilha, aparelho, versão | Legítimo interesse com limpeza de conteúdo, ou consentimento; validar | arts. 7º I ou IX |
| Notificações | token do aparelho | Execução de contrato, mais a permissão do sistema | art. 7º V |
| Marketing por e-mail | e-mail | Consentimento | art. 7º I |
| IA futura | a definir | Consentimento específico, RIPD revisto, transferência avaliada | arts. 7º, 11, 20 e 33 |

### 2.5 Direitos do titular e quem é o titular

- Direitos: confirmação, acesso, correção, anonimização, bloqueio ou eliminação de excessivos, portabilidade, eliminação do que foi tratado com consentimento, informação sobre compartilhamento, informação sobre não consentir e revogação [DOC F01 art. 18 I a IX]. São exercidos pelo titular ou por "representante legalmente constituído", sem custo [DOC F01 art. 18 §§3º e 5º]. O controlador deve avisar a quem compartilhou dados corrigidos ou eliminados [DOC F01 art. 18 §6º].
- Prazos: acesso simplificado imediato; declaração completa em até 15 dias; cópia eletrônica integral em formato reutilizável quando a base for consentimento ou contrato [DOC F01 art. 19 I, II e §3º]. Agente de pequeno porte tem prazo em dobro [DOC F05 art. 14 I e III].
- A portabilidade depende de regulamentação da ANPD [DOC F01 art. 18 V], ainda pendente: a ação "Direitos dos titulares" (arts. 9º, 18, 19 e 20) estava em elaboração interna em 20/10/2026 [DOC F10 item 1].
- **Quem é o titular quando vários cuidadores registram [HIP]:**
  - Conteúdo do registro (o bebê dormiu de 14h a 15h): titular é o bebê [DOC F01 art. 5º V]. Pedidos sobre esses dados vêm de pai, mãe ou responsável legal. Cuidador convidado não pede eliminação do histórico do bebê.
  - Autoria e horário do registro: dado pessoal do cuidador autor. Ele pode pedir acesso aos próprios dados e sair do grupo.
  - Dois responsáveis em desacordo (um pede eliminação, outro quer manter; guarda compartilhada; separação): a LGPD fala em "pelo menos um dos pais" para consentir, mas não resolve a revogação por um só. Questão jurídica.
  - Saída ou exclusão de conta de um cuidador: proposta de remover os dados pessoais dele e trocar a autoria por um rótulo neutro ("ex-cuidador"), mantendo o histórico do bebê no espaço da família. Precisa de validação jurídica e de aviso claro no convite e na exclusão.
  - Exclusão da conta do último responsável: excluir o espaço do bebê inteiro, depois de oferecer exportação.
  - Quando o filho crescer, passa a exercer os próprios direitos sobre os dados da infância. Questão aberta.

### 2.6 Transferência internacional

- Só é permitida nas hipóteses do art. 33, entre elas país adequado, cláusulas-padrão contratuais e consentimento específico e em destaque [DOC F01 art. 33 I, II "b" e VIII].
- **Resolução CD/ANPD nº 19/2024:** quem usa cláusulas contratuais tinha até 12 meses da publicação para incorporar as cláusulas-padrão da ANPD (prazo já encerrado) [DOC F07 art. 2º p.ú.]. Elas valem só se adotadas integralmente e sem alteração [DOC F07 art. 16]. O controlador entrega o texto ao titular em 15 dias e publica, em português, página sobre a transferência: forma, duração, finalidade, país de destino, responsabilidades e direitos [DOC F07 art. 17 §§1º a 3º]. A resolução segue vigente, com retificação de 18/08/2025 [DOC F09].
- **Resolução CD/ANPD nº 32/2026:** reconhece a União Europeia (mais Islândia, Liechtenstein e Noruega) como adequada para transferências a partir do Brasil, com reavaliação em quatro anos [DOC F08 arts. 1º e 4º §1º].
- **[HIP] Consequências:**
  - Região no Brasil (São Paulo) reduz, mas não elimina, a transferência: suporte, subprocessadores e serviços globais (autenticação, push, crash) podem tratar dados fora.
  - Região na UE dispensa cláusulas como mecanismo, mas não o contrato de operador.
  - Região nos EUA exige verificar se o provedor aceita as cláusulas-padrão da ANPD sem alteração.
  - APNs (Apple) e FCM (Google) passam pelo exterior; por isso o push não leva dado sensível (seção 7).

### 2.7 Incidentes de segurança (Resolução CD/ANPD nº 15/2024)

- Comunicar à ANPD e aos titulares o incidente que possa causar risco ou dano relevante [DOC F01 art. 48; F04 art. 4º].
- É relevante quando pode afetar significativamente interesses e direitos fundamentais **e** envolve ao menos um critério: dados sensíveis; **dados de crianças, adolescentes ou idosos**; dados financeiros; autenticação; sigilo; larga escala [DOC F04 art. 5º]. **[HIP]** Quase todo vazamento do espaço privado do bebê cumpre os dois requisitos.
- Prazo: **3 dias úteis** desde o conhecimento de que o incidente afetou dados pessoais, para a ANPD e para os titulares; complementação em 20 dias úteis; **em dobro para agente de pequeno porte** [DOC F04 art. 6º caput, §§1º, 3º e 8º; art. 9º e §6º].
- A comunicação à ANPD informa, entre outros dados, o número de titulares afetados, "discriminando, quando aplicável, o número de crianças, de adolescentes ou de idosos" [DOC F04 art. 6º §2º II]. **[HIP]** O modelo de dados precisa permitir contar rapidamente bebês e adultos afetados.
- Titulares: linguagem simples, comunicação direta e individual. Se inviável, aviso público por pelo menos três meses [DOC F04 art. 9º §§1º a 3º].
- **Registro de todo incidente, comunicado ou não, por no mínimo 5 anos** [DOC F04 art. 10].

### 2.8 Encarregado (DPO) e agente de pequeno porte

- O controlador indica encarregado e publica identidade e contato [DOC F01 art. 41 §1º]. A indicação é feita por ato formal [DOC F06 art. 3º]. O encarregado pode ser pessoa natural (interna ou externa) ou jurídica, deve se comunicar em português e não precisa de certificação [DOC F06 arts. 12 a 14]. Divulgação clara no site [DOC F06 art. 9º].
- **Pequeno porte (Res. 2/2022):** inclui microempresas, EPP, startups e também **pessoas naturais** que tratam dados como controlador [DOC F05 art. 2º I]. Benefícios: registro simplificado das operações, dispensa de encarregado (com canal de comunicação obrigatório) e prazos em dobro [DOC F05 arts. 9º, 11 e 14].
- **Perde o benefício** quem faz tratamento de **alto risco** [DOC F05 art. 3º I]. Alto risco exige um critério geral (larga escala ou afetar significativamente direitos) **e** um específico, entre eles "dados pessoais sensíveis ou de crianças" [DOC F05 art. 4º].
- **[HIP]** O critério específico está presente desde o início. O geral depende de escala e impacto, avaliação a fazer e documentar. Planejar como se o regime simplificado pudesse não valer: indicar encarregado, manter registro completo e fazer RIPD.

### 2.9 Registro das operações e RIPD

- Controlador e operador mantêm registro das operações de tratamento [DOC F01 art. 37]; pequeno porte pode fazê-lo de forma simplificada [DOC F05 art. 9º].
- A ANPD pode exigir RIPD, inclusive de dados sensíveis [DOC F01 arts. 5º XVII e 38]. Recomenda fazê-lo em contexto de alto risco, **antes de iniciar o tratamento**, usando o art. 4º da Res. 2/2022 enquanto não houver regulamento próprio [DOC F11]. O regulamento de RIPD ainda está em elaboração [DOC F10 item 2].
- Se o ECA Digital se aplicar, há também mapeamento de riscos e relatório de impacto, compartilhado sob requisição da ANPD [DOC F13 art. 16 p.ú. I e II], e avaliação de impacto à segurança e à saúde de crianças, com versão resumida pública [DOC F15 art. 47 e §1º].

### 2.10 Retenção, eliminação e segurança

- O tratamento termina quando a finalidade é alcançada, por revogação do titular ou por determinação da ANPD; depois, eliminar, salvo obrigação legal, pesquisa, transferência regular ou uso exclusivo do controlador com dados anonimizados [DOC F01 arts. 15 e 16].
- O Marco Civil garante exclusão definitiva dos dados fornecidos, a pedido, ao fim da relação, ressalvada a guarda obrigatória [DOC F16 art. 7º X]. O decreto regulamentador manda reter o mínimo e excluir ao atingir a finalidade ou ao vencer o prazo legal [DOC F17 art. 13 §2º].
- Segurança técnica e administrativa desde a concepção; dever que continua após o fim do tratamento; sistemas estruturados para segurança e boas práticas [DOC F01 arts. 46 §2º, 47 e 49]. Padrões mínimos de segurança da ANPD ainda em elaboração [DOC F10 item 5].
- Sanção máxima por infração: multa de até 2% do faturamento, limitada a R$ 50 milhões [DOC F01 art. 52 II].

## 3. ECA Digital (Lei 15.211/2025)

### 3.1 Identificação, vigência e regulamentação [DOC]

- **Lei nº 15.211, de 17/09/2025**, Estatuto Digital da Criança e do Adolescente [F13].
- **Em vigor desde 17/03/2026**: art. 41-A incluído pela Lei 15.352/2026, que revogou a MP 1.319/2025 (a MP fixava seis meses) [F13 art. 41-A; F02].
- **Decreto 12.622/2025**: designa a ANPD como autoridade administrativa autônoma do ECA Digital [F14 art. 2º].
- **Decreto 12.880, de 18/03/2026**: regulamenta a lei; a ANPD regulamenta e fiscaliza [F15 art. 1º p.ú.].
- **Ainda pendente** (consultado na Agenda da ANPD de 20/10/2026) [DOC F10 itens 13, 14 e 15]:
  - guia sobre escopo e "acesso provável": tomada de subsídios de abril a junho de 2026, versão preliminar;
  - guia de aferição de idade: tomada de subsídios de maio a julho de 2026; havia "Orientações Preliminares" de março de 2026;
  - revisão das normas de fiscalização e sanção.
- Também dependem de regulamento ou ato futuro: padrões de supervisão parental [F13 art. 17 §1º], requisitos e prazos para comunicar conteúdo de abuso à autoridade [F13 art. 27 §1º; F15 art. 37 §4º] e segurança por padrão [F15 art. 10].

### 3.2 A quem se aplica

- A todo produto ou serviço de tecnologia da informação **direcionado** a crianças e adolescentes no Brasil **ou de acesso provável** por eles [DOC F13 art. 1º].
- "Acesso provável" é: (I) suficiente probabilidade de uso e atratividade; (II) considerável facilidade de acesso; (III) significativo grau de risco à privacidade, segurança ou desenvolvimento, "especialmente" em serviços de interação social e compartilhamento em larga escala [DOC F13 art. 1º p.ú.].
- Definições úteis: "monitoramento infantil" é o acompanhamento, pelos pais, das **ações das crianças em ambientes digitais**; "rede social" é aplicação cuja **principal** finalidade é compartilhar opiniões e informações entre usuários conectados [DOC F13 art. 2º II e III]. A ANPD pode reenquadrar um serviço como rede social [DOC F15 art. 19 §2º].

### 3.3 O ECA Digital toca o AppMaternidade? [HIP]

1. **Bebês não são usuários.** O app não é direcionado a crianças nem é "monitoramento infantil" no sentido legal, porque registra cuidados físicos, não ações digitais da criança. Integrar câmera ou babá eletrônica no futuro exigiria nova análise (art. 19 da lei).
2. **O ponto sensível são adolescentes usuários.** Mães e pais adolescentes existem e podem procurar um app como este. A comunidade é exatamente o fator III ("interação social"). É defensável dizer que o app é de "acesso provável" por adolescentes, sobretudo na comunidade. Não é conclusivo: depende do guia de escopo da ANPD e de parecer.
3. **Dois caminhos (decisão de Daniel):**
   - **(A) Só maiores de 18**, com idade mínima nos termos, sinais de idade das lojas e restrição de menores na Play. Reduz a probabilidade de acesso, mas o ônus de demonstrar eficácia fica com o fornecedor.
   - **(B) Aceitar adolescentes.** Atrai obrigações como configuração mais protetiva por padrão, gestão de riscos e supervisão parental [DOC F13 arts. 7º, 8º, 17 e 18] e **vínculo da conta de quem tem até 16 anos à conta de um responsável legal** [DOC F13 art. 24].
4. **Valem em qualquer caminho** (aplicam-se a fornecedores disponíveis no Brasil ou a provedores em geral):
   - remover e comunicar às autoridades conteúdo de aparente exploração, abuso sexual, sequestro e aliciamento, retendo dados do relatório pelo prazo do art. 15 do Marco Civil [DOC F13 art. 27 e §2º];
   - a Polícia Federal recebe os relatórios; remoção imediata com preservação; exclusão após confirmação de recebimento [DOC F15 arts. 36, 37 e 39 §§1º e 2º];
   - vedação de monetizar ou impulsionar conteúdo que retrate crianças de forma erotizada [DOC F13 art. 23];
   - vedação de veicular conteúdo que exponha crianças a situações vexatórias ou degradantes [DOC F15 art. 35];
   - autorização judicial para conteúdo monetizado ou impulsionado que explore habitualmente a imagem ou a rotina de uma criança [DOC F15 art. 34];
   - medidas contra uso abusivo das denúncias [DOC F13 art. 32].
   - **[HIP]** Na comunidade do MVP: sem fotos de bebês, sem monetização de criadores e com fluxo de abuso infantil pronto.
5. **Sanções** [DOC F13 art. 35]: advertência; multa de até 10% do faturamento no Brasil ou, sem faturamento, de R$ 10 a R$ 1.000 por usuário cadastrado, limitada a R$ 50 milhões por infração; suspensão e proibição pelo Judiciário. Obrigações modulam-se por funcionalidades, número de usuários e porte [DOC F13 art. 39].

### 3.4 Sinais de idade das lojas

- Lojas e sistemas operacionais devem aferir idade e fornecer sinal de idade por API, só com o mínimo necessário, sem data de nascimento nem identidade [DOC F13 art. 12; F15 art. 25 §1º]. Se a aferição própria divergir do sinal, vale a alternativa mais protetiva [DOC F15 art. 25 §4º]. Receber o sinal não isenta o fornecedor [DOC F15 art. 26 §3º].
- **Apple:** Declared Age Range API fornece a categoria de idade de usuários no Brasil quando o usuário ou o responsável aceita compartilhar. Desde 24/02/2026, a App Store bloqueia download de apps 18+ no Brasil por quem não for confirmado adulto [DOC F31].
- **Google:** Play Age Signals API retorna sinais para usuários no Brasil desde 17/03/2026, para uso só em experiências adequadas à idade (nada de anúncios, perfilamento ou analytics). A Play bloqueia ou filtra apps 18+ para menores no Brasil [DOC F46; F47].

## 4. Marco Civil da Internet, STF e decretos de 2026 (relevante para a comunidade)

### 4.1 Registros de acesso

- O provedor de aplicações **constituído como pessoa jurídica**, que atue de forma organizada, profissional e com fins econômicos, guarda os registros de acesso **por 6 meses**, sob sigilo, em ambiente controlado e seguro [DOC F16 art. 15]. Para outros provedores, ordem judicial pode exigir guarda por tempo certo [DOC F16 art. 15 §1º].
- A guarda inclui a **porta lógica de origem** quando necessária para identificar o terminal (Decreto 12.975/2026) [DOC F17 art. 15-A; F18].
- Padrões de segurança: controle estrito de acesso, autenticação forte para acessar registros, inventário detalhado dos acessos (momento, duração, responsável, arquivo) e encriptação ou medida equivalente [DOC F17 art. 13 I a IV].
- **[HIP]** Como pessoa física, o art. 15 talvez não obrigue, mas o ECA Digital manda reter dados de relatórios de abuso pelo mesmo prazo [F13 art. 27 §2º]. Guardar 6 meses é recomendável em qualquer caso.

### 4.2 Responsabilidade por conteúdo de terceiros: art. 19 e STF

- O art. 19 previa responsabilidade civil só após descumprir ordem judicial específica [DOC F16 art. 19].
- STF, **Temas 987 e 533**: mérito em 26/06/2025, ata publicada em 05/08/2025; **embargos concluídos em 17/06/2026, com trânsito em julgado** [DOC F21]. A redação final da tese [DOC F20]:
  - art. 19 **parcialmente inconstitucional**; até nova lei, o provedor responde nos termos do art. 21 por crimes ou atos ilícitos de terceiros, **salvo dúvida razoável após diligência qualificada** (item 3); a mesma regra vale para contas não autênticas (3.1);
  - **crimes ou ilícitos contra a honra**: continua a exigência de ordem judicial (art. 19), sem impedir remoção por notificação extrajudicial (3.2);
  - **dever de cuidado** contra circulação de crimes graves, em rol taxativo que inclui crimes contra a mulher (e) e crimes sexuais contra vulneráveis, pornografia infantil e crimes graves contra crianças (f). A responsabilidade nasce de **falha sistêmica**; medidas adequadas são as que dão "os níveis mais elevados de segurança" para o tipo de atividade (5, 5.1 a 5.3);
  - deveres adicionais: autorregulação com **sistema de notificações, devido processo e relatórios anuais de transparência**; canais para usuários e não usuários; regras publicadas e revisadas; **sede e representante no Brasil, que deve ser pessoa jurídica** (7 a 10);
  - efeitos desde 05/08/2025, alcançando atos continuados; **60 dias**, contados da ata dos embargos, para implementar o dever de cuidado do item 5 (13 e 14);
  - o art. 19 continua valendo para provedores "que não possuam interferência no fluxo comunicativo e informacional" (3.4 "d"). **[HIP]** Uma comunidade com moderação e ordenação de conteúdo dificilmente se encaixa aí.

### 4.3 Decretos 12.975 e 12.976/2026

Ambos de 20/05/2026, publicados no DOU de 21/05/2026, com vigência 60 dias após a publicação: **em vigor em 22/10/2026** [DOC F18 art. 2º; F19 art. 15]. A ANPD regula e fiscaliza [DOC F17 art. 19-A; F19 art. 14].

- **Decreto 12.975** inclui no Decreto 8.771 os deveres dos provedores [DOC F18]:
  - sede e representante legal no País, constituído como PJ, e canal de denúncia permanente (art. 16-A);
  - falha sistêmica (art. 16-B) e gestão de riscos sistêmicos (art. 16-C);
  - requisitos da notificação, sob pena de nulidade (art. 16-D);
  - confirmação e comunicação da decisão ao notificante e ao autor, com meio de contestação (art. 16-E);
  - medidas contra abuso das notificações (art. 16-F);
  - indisponibilizar, após notificação, conteúdo criminoso, salvo crimes contra a honra (art. 16-G), e encaminhar ao Poder Público o que identificar como crime (art. 16-H);
  - honra depende de ordem judicial (art. 16-J);
  - termos e autorregulação com sistema de notificações, devido processo e relatório anual (art. 20-A);
  - a autoridade **pode** fixar critérios diferenciados para pequenos provedores, o que ainda depende de regulamento (art. 16-P).
- **Decreto 12.976** (proteção de mulheres; a comunidade terá muitas mães) [DOC F19]:
  - aviso do **Ligue 180** no espaço de notificação (art. 5º §1º);
  - remoção de conteúdo íntimo não autorizado em **até 2 horas** após notificação, com marcação para bloquear reenvio e espaço específico de denúncia (art. 7º);
  - redução de alcance de ataques coordenados, de ofício (art. 8º);
  - até regulamentação: **6 horas** para conteúdo manifestamente ilegal contra mulheres, **24 horas** para os demais casos e 24 horas para decidir contestação (art. 12).
- **[HIP]** Prazos de horas exigem plantão ou remoção cautelar automática ao receber denúncia qualificada. Isso pesa no dimensionamento da moderação, que fica no doc previsto `04_Comunidade_Conteudo/Comunidade_e_Moderacao.md`.

### 4.4 Código de Defesa do Consumidor (se houver assinatura)

- Na contratação fora do estabelecimento, o consumidor pode desistir em **7 dias** e recebe de volta o que pagou [DOC F22 art. 49].
- **[HIP]** Com cobrança pelas lojas, o reembolso segue o fluxo da Apple ou da Google, mas o app continua fornecedor perante o CDC. Validar a redação dos termos.
- Na Play, quem vende no Brasil informa dados da empresa, beneficiários e CPF ou CNPJ para receber repasses [DOC F47].

## 5. Apple App Store

Diretrizes consultadas com "Last Updated: October 16, 2026" [F23].

| Requisito | Texto oficial (resumo) [DOC] | Aplicação ao AppMaternidade [HIP] |
| --- | --- | --- |
| 1.2 UGC | Filtro de conteúdo censurável; denúncia com resposta em tempo hábil; bloqueio de usuários abusivos; contato publicado. O desenvolvedor remove o que viola as regras [F23]. | Obrigatório para a comunidade no MVP. |
| 1.3 Kids Category | Para apps feitos para crianças, com portão parental e sem analytics ou anúncios de terceiros, salvo exceções; as exigências continuam mesmo após desmarcar a categoria [F23]. | **Não se aplica e não deve ser escolhida**: usuários são adultos. 2.3.8 reserva "For Kids" e "For Children" à categoria, então a ficha deve falar com pais e cuidadores [F23 2.3.8]. |
| 1.4.1 Saúde | Apps médicos com risco de dado impreciso têm revisão mais rigorosa; divulgar dados e metodologia de alegações de precisão; lembrar de consultar um médico [F23]. | Estimativas de sono ou alertas devem expor premissas e limites e sugerir procurar profissional. |
| 1.5 e 1.6 | Contato fácil no app e no Support URL; segurança adequada contra uso ou acesso não autorizado [F23]. | Canal de suporte e de privacidade. |
| 2.3.6 Classificação etária | Responder honestamente ao questionário [F23]. O questionário inclui conteúdo gerado por usuários, informação médica ou de bem-estar, controles parentais e garantia de idade; há classificação regional do Brasil (MJSP) [F32]. | Declarar comunidade e conteúdo de saúde. A nota resultante afeta quem pode baixar. |
| 4.8 Login | Se usar login social para a conta principal, oferecer opção equivalente que limite dados a nome e e-mail, permita ocultar o e-mail e não rastreie sem consentimento. Dispensa se o app usa só conta própria [F23]. | Login com Google exige Sign in with Apple ou equivalente; e-mail ou passkey próprios dispensam. |
| 5.1.1(i) Política | Link no App Store Connect e no app; dados coletados, usos, terceiros com proteção equivalente, retenção e exclusão, como revogar consentimento [F23]. | Política única pt-BR cobrindo LGPD e lojas. |
| 5.1.1(ii) Permissão | Consentimento para coletar dados do usuário ou de uso, mesmo "anônimos"; retirada fácil; funcionalidade paga não depende disso [F23]. | Analytics em opt-in. |
| 5.1.1(iii) e (iv) Minimização | Só dados relevantes à função central; preferir seletor do sistema para Fotos; não forçar consentimentos [F23]. | Seletor de fotos; nada de acesso completo à galeria. |
| 5.1.1(v) Conta | Quem cria conta deve oferecer exclusão no app [F23]. A exclusão apaga o registro e os dados associados, inclusive UGC compartilhado; desativar não basta; processo demorado é aceito se informado; reautenticação permitida; revogar tokens do Sign in with Apple; avisar sobre assinaturas [F24]. | Exclusão iniciável em Configurações; posts da comunidade apagados; prazos informados. |
| 5.1.1(ix) Setores regulados | Apps de setores regulados (inclui *healthcare*) "ou que exigem informação sensível" **devem ser enviados por pessoa jurídica**, não por desenvolvedor individual [F23]. | Forte motivo para publicar como organização. |
| 5.1.2 Uso e compartilhamento | Permissão antes de usar ou compartilhar, **inclusive com IA de terceiros**; ATT para rastrear; não exigir push, localização ou rastreamento para usar o app; sem novo uso sem consentimento [F23]. | Push opcional; IA futura só com permissão explícita. |
| 5.1.3 Saúde | Dados no contexto de saúde não servem para publicidade ou mineração; **não armazenar informação pessoal de saúde no iCloud** [F23]. | Não usar CloudKit ou iCloud para registros do bebê. Avaliar excluir o banco local do backup do iCloud. |
| 5.1.4 Crianças | Cuidado com dados de menores; quem coleta dados pessoais de um menor precisa de política e de cumprir leis de privacidade infantil [F23]. | Cumprir LGPD art. 14; sem SDKs de anúncios. |
| Rótulos de privacidade | Declarar no App Store Connect os dados coletados, inclusive por SDKs; "coletar" é transmitir para fora do aparelho além do atendimento em tempo real; texto livre entra como "Other User Content"; fotos enviadas devem ser declaradas [F25]. | Preencher a partir do inventário de dados e de SDKs. |
| Manifesto de privacidade | `PrivacyInfo.xcprivacy` com tipos de dados, rastreamento e *required reason APIs* [F27]; motivos por categoria de API; *fingerprinting* proibido [F28]. SDKs listados (Firebase, Flutter, `hermes` do React Native, OneSignal e outros) exigem manifesto e assinatura [F29]. | A escolha de stack e de SDKs afeta essa exigência. Conferir versões com manifesto. |
| ATT | Permissão para rastrear (cruzar dados com os de outras empresas para publicidade ou repassar a *data brokers*); sem permissão, o identificador de publicidade fica zerado [F26]. | Sem anúncios ou rastreamento, não há prompt de ATT e `NSPrivacyTracking` fica falso. |
| Conta de desenvolvedor | **Individual**: nome legal pessoal aparece como vendedor. **Organização**: entidade jurídica (sem nome fantasia), **D-U-N-S**, site público com domínio próprio, e-mail do domínio. 99 USD por ano [F30]. | Ver decisão 1. |

## 6. Google Play

| Requisito | Texto oficial (resumo) [DOC] | Aplicação ao AppMaternidade [HIP] |
| --- | --- | --- |
| Data safety | Obrigatório para todo app publicado, inclusive em teste fechado ou aberto. Declara coleta, compartilhamento, criptografia em trânsito e exclusão, incluindo SDKs. Tipos incluem "Health info". Distingue prestador de serviço de terceiro e processamento efêmero [F33]. | Declarar dados de saúde, fotos, identificadores, falhas. Prestadores de nuvem como *service providers*. |
| Política de Dados do Usuário | Uso limitado ao esperado; **criptografia moderna em trânsito**; **não vender** dados pessoais e sensíveis; política no Console e no app com contato, tipos de dados, terceiros, segurança, retenção e exclusão; vale para integrações de IA de terceiros [F34]. | Política pública fora de PDF; nenhuma venda; IA futura coberta. |
| Exclusão de conta | Caminho no app **e** link web que funcione sem reinstalar o app; excluir os dados associados; congelar não basta; informar retenções; pedir eliminação aos prestadores; perguntas de exclusão no Data safety [F35; F34]. | Página web de exclusão com nome do app e do desenvolvedor. |
| Declaração de apps de saúde | Obrigatória para **todos** os apps, mesmo sem recurso de saúde. Categorias incluem Sleep Management, Nutrition and Weight Management e outras médicas [F36]. | Declarar categorias de sono e nutrição. Não é dispositivo médico. |
| Saúde: conteúdo e serviços | Política de privacidade e divulgação destacada; sem permissões de saúde desnecessárias; apps de saúde que não são dispositivo médico incluem aviso de que **"not a medical device and does not diagnose, treat, cure, or prevent any medical condition"** e lembrança de procurar profissional [F37]. Saúde e fitness são distintos de médicos e de pesquisa [F38]. | Aviso na descrição e no app. |
| Tipo de conta | Pessoal e organização têm as mesmas funções. **Organização é indicada** para serviços financeiros e "Health apps, such as Medical apps and Human Subjects Research apps"; exige **D-U-N-S** [F42]. | O app tende a "saúde e fitness", não "médico". Organização ainda é a escolha mais segura. |
| Teste para conta pessoal nova | Contas pessoais criadas após 13/11/2023: **teste fechado com pelo menos 12 testadores, inscritos continuamente por 14 dias**, antes de pedir produção [F43]. | Com conta pessoal, planejar 12 testadores reais. |
| Público-alvo | Público com crianças segue a Política de Famílias. Público só 18+ permite ativar **Restrict Minor Access**. Ficha com elementos que atraiam crianças pode ser rejeitada [F40]. | Se 18+, ativar a restrição. Arte da ficha sem estética infantil. |
| UGC | Aceite dos termos antes de publicar; definição de conteúdo censurável; moderação contínua; denúncia e bloqueio dentro do app; salvaguardas para monetização [F39]. | Igual ao 1.2 da Apple. |
| Padrões de segurança infantil | Obrigatória para apps nas categorias **Social** ou **Dating** e chats anônimos ou aleatórios: padrões publicados contra abuso infantil, mecanismo no app, tratamento de material de abuso, contato de segurança infantil [F41]. | Se a categoria for Social, entra no escopo. Mesmo fora dela, adotar porque o ECA Digital art. 27 exige algo semelhante. |
| API alvo | Desde **31/08/2026**, apps novos e atualizações precisam mirar **Android 16 (API 36)**; extensão até 01/11/2026 [F44]. | Considerar a exigência de 2027 no cronograma. |
| Verificação de desenvolvedor Android | Desde **30/09/2026**, no **Brasil**, Indonésia, Singapura e Tailândia, apps instalados em aparelhos certificados precisam ser registrados por desenvolvedor verificado [F45]. | Afeta APKs de teste distribuídos fora da Play. |
| ECA Digital na Play | O desenvolvedor determina como o ECA Digital se aplica. Play Age Signals disponível; reclassificação IARC/ClassInd pode ser necessária [F47]. | Ver seção 3.4. |

## 7. Segurança e operação: o que muda na arquitetura

| Tema | Base [DOC] | Proposta [HIP] |
| --- | --- | --- |
| Minimização | Necessidade [F01 art. 6º III]; não pedir além do necessário [F01 art. 14 §4º]; Apple 5.1.1(iii) [F23] | Apelido do bebê; data de nascimento só no espaço privado; comunidade mostra faixa de fase, nunca a data; nenhum CPF; nenhuma localização; texto livre limitado e com aviso. |
| Criptografia em trânsito | Play exige criptografia moderna [F34]; Apple 1.6 [F23] | TLS em tudo, inclusive downloads de anexos com URLs assinadas e de curta duração. |
| Criptografia em repouso (servidor) | Segurança [F01 art. 46]; encriptação dos registros [F17 art. 13 IV] | Criptografia do provedor ativa; chaves gerenciadas; bucket privado separado por família. |
| Criptografia no aparelho | Segurança [F01 art. 46]; Apple 5.1.3(ii) [F23] | Proteção de dados do iOS e armazenamento cifrado do Android; avaliar banco local cifrado; não usar iCloud para dados do bebê. |
| Segregação por família | Segurança e sistemas estruturados [F01 arts. 46 e 49] | Autorização no servidor em toda operação, inclusive canais de sync, arquivos e push; testes de acesso cruzado (cenário Q-06). |
| Backups e restauração | Guia de segurança da ANPD: backups regulares, completos, em local separado [F12] | Backups automáticos com janela definida (por exemplo, 35 dias); teste de restauração registrado; **reaplicar exclusões** depois de restaurar para não ressuscitar dados apagados. |
| Logs | Registros de acesso por 6 meses, sob sigilo [F16 art. 15]; inventário de acessos [F17 art. 13 III]; reter o mínimo [F17 art. 13 §2º] | Separar registros de acesso (IP, porta, horário; 6 meses; acesso restrito) de logs da aplicação **sem conteúdo** (sem nomes, notas ou payloads); limpar relatórios de falha. |
| Acesso administrativo | Controle estrito, autenticação dupla e inventário [F17 art. 13 I a III]; menor privilégio e contas não compartilhadas [F12] | MFA obrigatório; papéis mínimos; trilha de auditoria; **moderador não vê o espaço da família**; acesso de emergência registrado e revisado. |
| Incidentes | 3 dias úteis, conteúdo mínimo e registro de 5 anos [F04] | Roteiro de resposta; contagem rápida de bebês e adultos afetados; modelos de aviso; responsável nomeado. |
| Notificações push | APNs e FCM passam por servidores das lojas; LGPD arts. 6º III e 46 [F01] | Texto genérico ("Novo registro em Família"), sem nome do bebê nem conteúdo de saúde; detalhe só após abrir o app autenticado; preferência configurável. |
| Exportação | Acesso e cópia integral em formato reutilizável [F01 arts. 18 e 19 §3º] | Exportação JSON e CSV mais anexos, pedida pelo responsável legal; cuidador exporta só os próprios dados e o que pode ver (validar). |
| Exclusão propagada | Eliminação [F01 art. 16]; avisar compartilhamentos [F01 art. 18 §6º]; Apple [F24]; Play [F35] | Tarefa de exclusão que cobre banco, arquivos, índices, caches e CDN, analytics, subprocessadores e backups (que expiram); marcadores de exclusão para aparelhos offline; prazos publicados (por exemplo, 30 dias na base principal e 35 nos backups); comprovante ao usuário. |
| Comunidade após excluir a conta | Apple pede apagar UGC compartilhado [F24]; retenções legais [F16 art. 15; F13 art. 27 §2º] | Apagar posts e respostas do autor; manter o tópico de terceiros com "[removido]"; reter só o necessário por obrigação legal (registros de acesso, relatórios de abuso, ordem judicial), isolado e com prazo. |
| Filho adulto | Titular é o bebê [F01 art. 5º V] | Questão aberta: permitir no futuro que o filho acesse, receba ou apague os dados da própria infância? |

## 8. Consentimentos e transparência a avaliar

| Momento | O que mostrar ou pedir | Base [DOC] e observação [HIP] |
| --- | --- | --- |
| Criação de conta | Termos e política (resumo em camadas); idade mínima; quem é o controlador e como falar com o encarregado. | F01 arts. 9º e 41; F23 5.1.1(i); F34. |
| Cadastro do bebê | Tela própria: o que será registrado, para quê, quem verá, por quanto tempo, como revogar; declaração de ser pai, mãe ou responsável legal; registro da prova. | F01 arts. 8º, 11 I e 14 §§1º, 5º e 6º. Não juntar com aceite dos termos. |
| Convite a cuidador | Para quem convida: o que o convidado verá e fará conforme o papel, e que dados já baixados podem continuar no aparelho dele mesmo após revogação. Para o convidado: que nome e autoria ficam visíveis à família e o que acontece se sair. | F01 art. 9º. Limite técnico da revogação offline: ver [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) (cenário Q-05). |
| Publicar na comunidade | Prévia exata do que será publicado; nada da rotina entra automaticamente; remoção de metadados de imagens; aviso de que o conteúdo é visível a outros. | Requisito fixo da task; F13 art. 23 e F15 art. 35 para imagens de crianças. |
| Analytics e falhas | Opt-in separado e reversível; sem dados do bebê nos eventos. | F23 5.1.1(ii); F34. |
| Notificações | Explicar antes do pedido do sistema; o app funciona sem push. | F23 5.1.2(i). |
| Fotos | Seletor do sistema, por item. | F23 5.1.1(iii). |
| IA futura | Consentimento explícito antes de enviar dados a IA de terceiros; revisão do RIPD e da transferência; possível revisão de decisões automatizadas. | F23 5.1.2(i); F34; F01 art. 20; ação regulatória de IA da ANPD em andamento [F10 item 6]. |
| Mudança de finalidade | Aviso destacado e opção de revogar. | F01 arts. 8º §6º e 9º §2º. |

## 9. Checklist pré-lançamento

Cada item é verificável e tem fonte. "Verificar" significa produzir evidência (documento, tela, teste ou registro), não declarar conformidade.

**Governança e LGPD**
- [ ] Controlador definido (PF ou PJ) e identificado com contato na política [F01 art. 9º III e IV].
- [ ] Enquadramento como pequeno porte avaliado diante do alto risco e documentado [F05 arts. 3º e 4º].
- [ ] Encarregado indicado por ato formal e divulgado, ou canal equivalente se a dispensa for válida [F06 arts. 3º e 9º; F05 art. 11].
- [ ] Registro das operações de tratamento pronto [F01 art. 37; F05 art. 9º].
- [ ] RIPD concluído **antes** do tratamento real, cobrindo dados do bebê, comunidade e transferências [F01 art. 38; F11].
- [ ] Mapa de bases legais por finalidade validado por advogado [F01 arts. 7º e 11; F03].
- [ ] Tela de consentimento parental específico, com prova guardada e revogação gratuita [F01 arts. 8º e 14 §1º].
- [ ] Política de privacidade pública, em pt-BR, com dados de crianças e procedimentos de direitos [F01 art. 14 §2º; F23 5.1.1(i); F34].
- [ ] Fluxos de direitos testados: acesso imediato, declaração em 15 dias, correção, eliminação, revogação [F01 arts. 18 e 19].
- [ ] Inventário de provedores, regiões e subprocessadores, com mecanismo de transferência e página em português [F01 art. 33; F07 arts. 16 e 17; F08].
- [ ] Contratos com operadores cobrindo instruções, segurança e eliminação [F01 art. 39; F12].
- [ ] Política de retenção e eliminação publicada, coerente com o Marco Civil [F01 arts. 15 e 16; F16 arts. 7º X e 15].
- [ ] Nenhum compartilhamento de dados de saúde por vantagem econômica e nenhum SDK de anúncios [F01 art. 11 §4º; F34].

**ECA Digital**
- [ ] Parecer sobre "acesso provável" e decisão registrada de idade mínima [F13 art. 1º p.ú.; F10 item 13].
- [ ] Se 18+: sinais de idade integrados e restrição de menores na Play [F31; F46; F40].
- [ ] Se aceitar adolescentes: configuração protetiva, supervisão parental, vínculo de quem tem até 16 anos e avaliação de impacto [F13 arts. 7º, 17, 18 e 24; F15 art. 47].
- [ ] Fluxo de remoção, preservação e comunicação de conteúdo de abuso infantil à Polícia Federal [F13 art. 27; F15 arts. 36 a 39].
- [ ] Regra sobre imagens de crianças na comunidade, sem monetização de conteúdo com crianças [F13 art. 23; F15 arts. 34 e 35].
- [ ] Medidas contra uso abusivo de denúncias [F13 art. 32].

**Comunidade e Marco Civil**
- [ ] Termos, regras, sistema de notificações, devido processo e relatório anual publicados [F20 itens 7 a 9; F17 art. 20-A].
- [ ] Canal de denúncia permanente para usuários e não usuários [F20 item 8; F17 art. 16-A II].
- [ ] Fluxos e prazos por tipo: crimes em geral, crimes graves, honra, conteúdo íntimo em 2 h, aviso Ligue 180 e prazos de 6 h e 24 h [F20 itens 3 e 5; F17 arts. 16-G e 16-J; F19 arts. 5º, 7º e 12].
- [ ] Registros de acesso guardados por 6 meses, com porta lógica, sob sigilo [F16 art. 15; F17 art. 15-A].
- [ ] Sede e representante no Brasil, conforme a forma de operação [F20 item 10; F17 art. 16-A I].

**Segurança e operação**
- [ ] TLS em tudo e criptografia em repouso confirmada no provedor [F34; F17 art. 13 IV].
- [ ] Testes automatizados de isolamento entre famílias, incluindo anexos, sync e push [F01 arts. 46 e 49].
- [ ] Backups automáticos e restauração testada e registrada [F12].
- [ ] MFA e trilha de auditoria para todo acesso administrativo [F17 art. 13 I a III].
- [ ] Logs e push sem conteúdo sensível, verificados por amostragem [F01 arts. 6º III e 46].
- [ ] Exclusão propagada e exportação testadas de ponta a ponta, com prazos publicados (cenário Q-12) [F01 arts. 16 e 18; F24; F35].
- [ ] Roteiro de incidente ensaiado, com registro de incidentes ativo [F04 arts. 6º, 9º e 10].

**Apple**
- [ ] Conta de organização com D-U-N-S, ou risco aceito e documentado [F23 5.1.1(ix); F30].
- [ ] Exclusão de conta iniciável no app, UGC apagado, prazos informados, tokens do Sign in with Apple revogados [F24].
- [ ] Rótulos de privacidade coerentes com o inventário [F25].
- [ ] `PrivacyInfo.xcprivacy` com *required reason APIs*; SDKs com manifesto e assinatura [F27; F28; F29].
- [ ] Sem rastreamento, ou ATT implementado [F26].
- [ ] Comunidade com filtro, denúncia, bloqueio e contato [F23 1.2].
- [ ] Login equivalente se houver login social [F23 4.8].
- [ ] Textos de saúde com metodologia e aviso de procurar profissional; nada de saúde no iCloud [F23 1.4.1 e 5.1.3].
- [ ] Questionário etário respondido com honestidade; sem Kids Category; metadados sem "para crianças" [F23 1.3, 2.3.6 e 2.3.8; F32].

**Google Play**
- [ ] Conta de organização com D-U-N-S, ou conta pessoal com teste fechado de 12 testadores por 14 dias [F42; F43].
- [ ] Data safety completo, com exclusão e criptografia [F33].
- [ ] Exclusão no app e por link web, com dados associados apagados [F35].
- [ ] Declaração de apps de saúde e aviso de que não é dispositivo médico [F36; F37].
- [ ] Público-alvo declarado e ficha sem apelo infantil [F40].
- [ ] Requisitos de UGC atendidos [F39].
- [ ] Categoria escolhida conscientemente: se Social, padrões de segurança infantil [F41].
- [ ] `targetSdk` 36 ou o vigente na data [F44].
- [ ] Verificação de desenvolvedor Android para builds fora da Play [F45].
- [ ] Requisitos de comerciante no Brasil, se houver vendas [F47].

**Consumo**
- [ ] Se houver assinatura: direito de arrependimento e cancelamento descritos, alinhados às lojas [F22 art. 49; F24].

## 10. Decisões que dependem de Daniel

| # | Decisão | Opções | Recomendação do Hermes [HIP] e impacto |
| --- | --- | --- | --- |
| 1 | Quem publica e controla os dados | Pessoa física x pessoa jurídica | **PJ antes de abrir ao público.** Motivos: Apple 5.1.1(ix) [F23]; Play indica organização para saúde [F42]; o Marco Civil fala em PJ [F16 art. 15]; o STF exige representante PJ [F20 item 10]. Custos: abertura, contabilidade, D-U-N-S, site com domínio. Como PF, o nome legal de Daniel aparece como vendedor na Apple [F30]. |
| 2 | País inicial | Só Brasil x vários | **Só Brasil no lançamento**, para evitar GDPR, COPPA e leis estaduais dos EUA antes de haver estrutura. |
| 3 | Onde ficam os dados | Brasil x UE x EUA | **Região Brasil**, com transparência sobre serviços globais. UE é alternativa adequada [F08]. EUA exige cláusulas-padrão sem alteração [F07]. |
| 4 | Idade mínima dos usuários | 18+ x aceitar adolescentes | **18+ no MVP**, com sinais de idade e restrição nas lojas. Registrar que mães e pais adolescentes ficam fora até haver desenho próprio [F13 art. 24]. |
| 5 | Comunidade no MVP | Texto x com imagens | **Só texto, sem fotos de bebês**, até haver moderação capaz de cumprir prazos de horas [F19 art. 7º; F13 art. 27]. |
| 6 | Monetização | Anúncios x assinatura x gratuito | **Sem anúncios comportamentais** (art. 11 §4º, ATT, ECA Digital). Assinatura pelas lojas exige CDC art. 49 e dados de comerciante no Brasil [F22; F47]. |
| 7 | Analytics e falhas | Nenhum x opt-in x padrão | **Opt-in** para analytics; falhas com limpeza de conteúdo, base a validar. |
| 8 | Encarregado | Daniel x externo x empresa | Pessoa com tempo e independência, ou serviço externo [F06 arts. 10 e 12]. |
| 9 | Prazos de retenção | Definir | Proposta inicial: dados enquanto a conta estiver ativa; aviso e exclusão após inatividade longa; backups de 35 dias; registros de acesso 6 meses. Validar. |

## Fontes

Consulta de todas: 22/10/2026 (America/Sao_Paulo). Todas são fontes oficiais; o que vem delas está marcado [DOC].

| ID | Fonte | Tipo | URL |
| --- | --- | --- | --- |
| F01 | Lei nº 13.709/2018 (LGPD), texto compilado — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm |
| F02 | Lei nº 15.352/2026 (ANPD como Agência; vigência do ECA Digital) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/Lei/L15352.htm |
| F03 | Enunciado CD/ANPD nº 1/2023 (dados de crianças e adolescentes) — DOU | Ato da ANPD no DOU | https://www.in.gov.br/en/web/dou/-/enunciado-cd/anpd-n-1-de-22-de-maio-de-2023-485306934 |
| F04 | Resolução CD/ANPD nº 15/2024 (comunicação de incidente) — DOU | Ato da ANPD no DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024 |
| F05 | Resolução CD/ANPD nº 2/2022 (agentes de pequeno porte) — DOU | Ato da ANPD no DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019 |
| F06 | Resolução CD/ANPD nº 18/2024 (encarregado) — DOU | Ato da ANPD no DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-18-de-16-de-julho-de-2024-572632074 |
| F07 | Resolução CD/ANPD nº 19/2024 (transferência internacional e cláusulas-padrão) — DOU | Ato da ANPD no DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396 |
| F08 | Resolução CD/ANPD nº 32/2026 (adequação da União Europeia) — DOU | Ato da ANPD no DOU | https://www.in.gov.br/web/dou/-/resolucao-n-32-de-26-de-janeiro-de-2026-683334547 |
| F09 | Regulamentações da ANPD (lista e status) — gov.br/anpd | Página oficial da ANPD | https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd |
| F10 | Agenda Regulatória 2025-2026, acompanhamento atualizado em 20/10/2026 — gov.br/anpd | Página oficial da ANPD | https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1 |
| F11 | Perguntas e respostas sobre RIPD — gov.br/anpd | Página oficial da ANPD | https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd |
| F12 | Guia orientativo de segurança da informação para agentes de pequeno porte (2021) — gov.br/anpd | Página oficial da ANPD | https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf/@@display-file/file |
| F13 | Lei nº 15.211/2025 (ECA Digital) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm |
| F14 | Decreto nº 12.622/2025 (ANPD como autoridade do ECA Digital) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Decreto/D12622.htm |
| F15 | Decreto nº 12.880/2026 (regulamenta o ECA Digital) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/Decreto/D12880.htm |
| F16 | Lei nº 12.965/2014 (Marco Civil da Internet) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm |
| F17 | Decreto nº 8.771/2016 (regulamento do Marco Civil, com alterações de 2026) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8771.htm |
| F18 | Decreto nº 12.975/2026 (deveres dos provedores de aplicações) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12975.htm |
| F19 | Decreto nº 12.976/2026 (proteção de mulheres na internet) — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12976.htm |
| F20 | STF — redação final da tese dos Temas 987/533 (17/06/2026) | STF (tese ou notícia oficial) | https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/06/17180658/MCI_tese.pdf |
| F21 | STF — notícia de 17/06/2026 sobre embargos e prazo de 60 dias | STF (tese ou notícia oficial) | https://noticias.stf.jus.br/postsnoticias/plataformas-terao-60-dias-para-implementar-medidas-estruturais-decide-stf |
| F22 | Lei nº 8.078/1990 (CDC), texto compilado — Planalto | Lei ou decreto (texto oficial) | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm |
| F23 | Apple — App Review Guidelines (última atualização 16/10/2026) | Apple (diretriz ou documentação) | https://developer.apple.com/app-store/review/guidelines |
| F24 | Apple — 5.1.1(v) Offering account deletion in your app | Apple (diretriz ou documentação) | https://developer.apple.com/support/offering-account-deletion-in-your-app |
| F25 | Apple — App privacy details on the App Store (Privacy Nutrition Labels) | Apple (diretriz ou documentação) | https://developer.apple.com/app-store/app-privacy-details |
| F26 | Apple — User privacy and data use (App Tracking Transparency) | Apple (diretriz ou documentação) | https://developer.apple.com/app-store/user-privacy-and-data-use |
| F27 | Apple — Privacy manifest files | Apple (diretriz ou documentação) | https://developer.apple.com/documentation/bundleresources/privacy-manifest-files |
| F28 | Apple — Describing use of required reason API | Apple (diretriz ou documentação) | https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api |
| F29 | Apple — Third-party SDK requirements | Apple (diretriz ou documentação) | https://developer.apple.com/support/third-party-SDK-requirements |
| F30 | Apple — Apple Developer Program: Become a member (pessoa física x organização) | Apple (diretriz ou documentação) | https://developer.apple.com/programs/enroll |
| F31 | Apple — Age requirements for apps distributed in Brazil, Australia, Singapore, Utah, and Louisiana (24/02/2026) | Apple (diretriz ou documentação) | https://developer.apple.com/news/?id=f5zj08ey |
| F32 | Apple — Age ratings values and definitions | Apple (diretriz ou documentação) | https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions |
| F33 | Google Play — Data safety section | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/10787469?hl=en |
| F34 | Google Play — User Data policy | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/10144311?hl=en |
| F35 | Google Play — App account deletion requirements | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/13327111?hl=en |
| F36 | Google Play — Health apps declaration form | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/14738291?hl=en |
| F37 | Google Play — Health Content and Services policy | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/12261419?hl=en |
| F38 | Google Play — Health app categories and additional information | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/13996367?hl=en |
| F39 | Google Play — User Generated Content policy | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/9876937?hl=en |
| F40 | Google Play — Target audience and app content settings | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/9867159?hl=en |
| F41 | Google Play — Child Safety Standards policy (FAQ) | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/14747720?hl=en |
| F42 | Google Play — Choose a developer account type | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/13634885?hl=en |
| F43 | Google Play — App testing requirements for new personal developer accounts | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/14151465?hl=en |
| F44 | Google Play — Target API level requirements | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/11926878?hl=en |
| F45 | Android — Android developer verification (guia) | Google Play ou Android (política ou ajuda) | https://developer.android.com/developer-verification/guides |
| F46 | Android — Play Age Signals overview | Google Play ou Android (política ou ajuda) | https://developer.android.com/google/play/age-signals/overview |
| F47 | Google Play — Requirements for distributing apps in specific countries/regions (Brasil, ECA Digital) | Google Play ou Android (política ou ajuda) | https://support.google.com/googleplay/android-developer/answer/6223646?hl=en |
| F48 | Regulamento (UE) 2016/679 (GDPR) — EUR-Lex | Regulamento da UE | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 |
| F49 | FTC — Children's Online Privacy Protection Rule (COPPA) | FTC (regra ou FAQ) | https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa |
| F50 | FTC — Complying with COPPA: Frequently Asked Questions | FTC (regra ou FAQ) | https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions |

## Questões para validação jurídica

1. Registros de sono, mamadas e fraldas são "dado referente à saúde" (art. 5º II)? Qual base usar para eles e para notas de saúde: consentimento (arts. 11 I e 14 §1º) ou execução de contrato e exercício de direitos (arts. 7º V e 11 II "d"), à luz do Enunciado CD/ANPD nº 1/2023?
2. Consentimento de "pelo menos um dos pais": como tratar revogação ou eliminação pedida por um responsável contra a vontade do outro (guarda compartilhada, separação), e qual o papel de quem tem guarda de fato sem poder familiar?
3. Cuidadores convidados são só usuários ou também controladores (art. 4º I)? A família convidando terceiros cria "uso compartilhado"?
4. Ao excluir a conta de um cuidador, manter os registros do bebê com autoria anonimizada é compatível com a LGPD e com Apple 5.1.1(v) e a política da Play?
5. O app, com comunidade, é de "acesso provável" por adolescentes (ECA Digital, art. 1º p.ú.)? Idade mínima 18 com sinais das lojas basta para afastar a aplicação? Que nível de aferição seria exigido?
6. O operador pode usar o regime de pequeno porte, dado o critério de alto risco (Res. 2/2022, arts. 3º e 4º)?
7. Operar como pessoa física é viável diante do Marco Civil art. 15, da tese do STF (item 10) e do Decreto 12.975 (art. 16-A I)?
8. Quais deveres do STF e dos Decretos 12.975 e 12.976 se aplicam a um provedor pequeno enquanto os critérios diferenciados (art. 16-P) não forem regulamentados? Os prazos de 2 h, 6 h e 24 h valem integralmente?
9. Os aditivos de proteção de dados dos provedores escolhidos incorporam as cláusulas-padrão da ANPD sem alteração (Res. 19/2024, art. 16)?
10. Como redigir o direito de arrependimento (CDC art. 49) quando a cobrança é feita pela Apple ou pela Google?
11. Que direitos o filho terá, ao crescer, sobre os dados da própria infância, e como isso afeta retenção e exportação?
12. Fotos de bebês no espaço privado e, se um dia permitido, na comunidade: direito de imagem da criança e limites do ECA Digital (art. 23 da lei; arts. 34 e 35 do decreto).

## Questões abertas

- Quais dados de saúde entram no MVP: temperatura, medicação, peso, ou só rotina?
- Prazos concretos de exclusão e de backup que o provedor escolhido consegue cumprir e comprovar.
- Cifrar o banco local e como lidar com chaves quando um vínculo é revogado offline.
- Qual provedor de falhas e analytics (ou nenhum) e com que limpeza de conteúdo.
- Formato de exportação e quem pode exportar o histórico do bebê.
- Como verificar, de forma razoável, que quem cria o bebê é pai, mãe ou responsável legal (art. 14 §5º).
- Capacidade de moderação para os prazos de horas e plano para fins de semana.
- Categoria nas lojas (Parenting, Health & Fitness ou outra) e efeito na classificação etária e nas políticas aplicáveis.
- Expansão: se ocorrer, revisar GDPR (arts. 3º(2), 8, 9 e 27) [F48] e COPPA. A COPPA alcança serviços direcionados a menores de 13 ou com conhecimento efetivo de coleta deles [F49]. O FAQ da FTC diz que ela **não** se aplica a informações sobre crianças coletadas de pais ou adultos [F50]. Por isso a COPPA provavelmente não se aplicaria a um app só para adultos [HIP], mas um serviço pode ser considerado direcionado a crianças mesmo que os termos as proíbam [F50]. Leis estaduais dos EUA não foram pesquisadas. No GDPR, a idade do art. 8º (16 anos, ou até 13 por lei nacional) só importa se o serviço for oferecido diretamente a crianças [F48 art. 8º].

## Limites desta análise

- Não é parecer jurídico. Interpretações marcadas [HIP] precisam de advogado com experiência em LGPD, ECA Digital e plataformas.
- Os resumos dos arts. 33, 37 a 41 e 46 a 49 da LGPD devem ser conferidos diretamente no texto do Planalto [F01] antes de uso. Nesta execução, a extração automatizada desses artigos foi bloqueada pelo controle de aprovação e o texto acabou lido por outro meio; isso foi relatado ao coordenador.
- Fontes oficiais consultadas em 22/10/2026. Políticas das lojas e a Agenda da ANPD mudam com frequência; conferir na data de submissão.
- Algumas notícias da ANPD estavam restritas no período eleitoral (por exemplo, a da tomada de subsídios sobre aferição de idade retornou "Conteúdo Restrito"). O estado dessas ações veio da página da Agenda Regulatória [F10].
- Não li integralmente o anexo de cláusulas-padrão da Res. 19/2024, o Estatuto da Criança e do Adolescente (Lei 8.069/1990), o Código Civil (capacidade e poder familiar), o Decreto 7.962/2013 nem a Lei 14.852/2024. A página da Política de Famílias da Play não carregou; usei a página de público-alvo [F40].
- Não verifiquei contratos, aditivos, regiões e subprocessadores de provedores de nuvem, nem preços.
- Não avaliei leis de outros países além de GDPR e COPPA, e só pontualmente.
- Guias da ANPD sobre escopo do ECA Digital e aferição de idade ainda não são definitivos; as conclusões sobre "acesso provável" podem mudar quando forem publicados.
