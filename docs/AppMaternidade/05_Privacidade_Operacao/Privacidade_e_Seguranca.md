---
tipo: design-doc
status: proposta
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-12
adr: ADR-005, ADR-008
fontes_principais:
  - 08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md
  - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396
  - https://developer.apple.com/app-store/review/guidelines/
  - https://support.google.com/googleplay/android-developer/answer/13327111
---

# Privacidade e segurança

> **Não é parecer jurídico.** Este documento transforma a [pesquisa de privacidade, legal e lojas](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md) em propostas de produto e de arquitetura. Ele não declara que o AppMaternidade está em conformidade com nenhuma lei ou política de loja. Toda obrigação listada precisa ser conferida no texto oficial e validada por profissional antes do lançamento.

Os códigos F01 a F50 remetem à tabela de fontes da pesquisa, consultada em 22/10/2026. As marcas [DOC] e [HIP] seguem as [Convenções](../00_Inicio/Convencoes.md).

## 1. Problema

- **Dado sensível de criança.** O app guarda a rotina de um bebê: sono, mamadas, fraldas, tummy time e observações no MVP; depois, também medicação, temperatura e crescimento. A LGPD trata "dado referente à saúde" como sensível, mas não define o termo, e a ANPD ainda está regulamentando o conceito [DOC F01 art. 5º II; F10 item 12]. A hipótese conservadora é tratar todo o espaço privado do bebê como dado sensível de criança [HIP].
- **Vários adultos com acesso.** Mãe, pai, avó e babá veem os mesmos dados, cada um no próprio aparelho, às vezes offline.
- **Comunidade aberta no mesmo app.** Nada do espaço privado pode vazar para ela.
- **Impacto de um vazamento.** Com dados de crianças, o incidente tende a ser "relevante", com prazo curto para comunicar [DOC F04 art. 5º].

## 2. Princípios

1. **Minimizar:** coletar só o que o cuidado exige.
2. **Isolar no servidor:** o vínculo vigente decide o acesso em toda operação, inclusive no canal de sincronização, nos arquivos e no push ([ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
3. **Separar a comunidade:** identidade pública pseudônima, sem nenhuma referência a família, bebê ou registro.
4. **Nada sensível fora do app:** push, logs, analytics e relatórios de falha não levam conteúdo de cuidado.
5. **Excluir de verdade:** a exclusão alcança banco, arquivos, caches, subprocessadores e backups, com prazo publicado.
6. **Transparência em camadas:** cada consentimento tem tela própria e prova guardada.
7. **Acesso administrativo mínimo e auditado:** quem modera a comunidade não lê dados de família.

## 3. Inventário de dados

A classificação técnica está em [Modelo de dados e permissões, seção 7](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md). Aqui entra o tratamento proposto, com bases legais a validar com advogado (mapa completo na seção 2.4 da pesquisa).

| Categoria | Exemplos | Classe | Base proposta [HIP] | Onde fica |
| --- | --- | --- | --- | --- |
| Conta do adulto | nome, e-mail, credenciais | Pessoal | Execução de contrato [F01 art. 7º V] | Supabase Auth (região Brasil) |
| Perfil do bebê | apelido, data de nascimento | Sensível de criança | Consentimento específico e em destaque do responsável [F01 arts. 11 I e 14 §1º]; outras bases admitidas pelo Enunciado CD/ANPD nº 1/2023 [F03] | Banco (região Brasil) e aparelhos com vínculo |
| Registros de cuidado | MVP: sono, amamentação, mamadeira, sólidos, fralda, tummy time, observação curta. Depois: medicação, temperatura, crescimento | Sensível de criança | Idem | Idem |
| Autoria e horários | quem registrou, encerrou ou editou | Pessoal do cuidador | Execução de contrato aceito no convite [F01 art. 7º V] | Idem |
| Vínculos, papéis e convites | papel, estado, época, código de convite (hash) | Pessoal | Execução de contrato | Banco |
| Comunidade | perfil público, tópicos, respostas, denúncias, ações de moderação | Pública no app e pessoal | Contrato; moderação por obrigação legal e legítimo interesse [F01 arts. 7º II, V e IX] | Banco, esquema `comunidade`, fora da sincronização |
| Registros de acesso | IP, porta, horário | Pessoal técnico | Obrigação legal (Marco Civil art. 15, para pessoa jurídica) [F16] | Armazenamento separado, acesso restrito |
| Logs da aplicação | erros, latências, ids técnicos | Técnico, sem conteúdo | Legítimo interesse | Provedor de logs |
| Tokens de push | token por aparelho | Pessoal | Execução de contrato e permissão do sistema | Banco |
| Prova de consentimento | quem, quando, versão do texto | Pessoal | Obrigação de provar o consentimento [F01 art. 8º §2º] | Banco |
| Analytics e falhas | eventos de uso; pilha e versão | Técnico | Opt-in para analytics [F23 5.1.1(ii)]; falhas com limpeza de conteúdo, base a validar | Fornecedor a definir |
| Fotos privadas | anexos de registro | Sensível de criança | Igual aos registros | Fora do MVP; depois, bucket privado por família ([Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md), seção 9) |

## 4. Minimização

- Apelido do bebê no lugar do nome completo; nenhum CPF, documento ou localização [HIP; F01 art. 14 §4º].
- Data de nascimento só no espaço privado. A comunidade mostra, no máximo, uma faixa de fase calculada no aparelho, nunca a data ([Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md)).
- Sem fotos no MVP: anexos privados e foto do bebê ficam fora, e a comunidade aceita só texto (decisão D4). Sexo e peso do bebê, medicamentos, temperatura e medidas de crescimento também ficam fora do MVP ([Modelo de dados](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md), seção 3.2).
- Texto livre limitado, com aviso para não escrever dado de saúde de terceiros.
- Nenhum SDK de anúncios e nenhum rastreamento entre apps; sem ATT porque não há rastreamento [F23; F26].
- Sem IA generativa respondendo a usuários no MVP ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)). Se vier depois, exigirá consentimento explícito, revisão do RIPD e avaliação da transferência [F01 art. 20; F23 5.1.2(i)].

## 5. Isolamento e fronteira com a comunidade

Resumo do [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md) e do [Modelo de dados](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md):

- Todo dado de cuidado pertence a uma família. O serviço de domínio confere o vínculo vigente (estado, papel, validade e época) em cada operação recebida, e não uma lista de permissões guardada no token.
- O canal de sincronização calcula a família a partir da tabela de vínculos. Revogar o vínculo tira a família do que o aparelho recebe ([Arquitetura proposta, 4.2](../03_Arquitetura/Arquitetura_Proposta.md)).
- O perfil público da comunidade se liga à conta só no servidor e não carrega família, bebê nem registro.
- Moderador e suporte não leem o espaço da família. Um acesso de emergência, se existir, é registrado e revisado.
- Os repositórios de referência mostram por que isso precisa de teste próprio ([Finnberry](../08_Referencias/Repositorios/Finnberry.md), [Baby Buddy](../08_Referencias/Repositorios/Baby_Buddy.md)). Por isso, Q-06 testa ids de outra família em todas as rotas, no canal de sincronização, nas URLs de arquivo e no push ([Qualidade e validação](Qualidade_e_Validacao.md)).

## 6. Consentimentos e transparência a avaliar

| Momento | O que mostrar ou pedir | Fundamento |
| --- | --- | --- |
| Criar conta | Termos e política em camadas; idade mínima; quem é o controlador e como falar com o encarregado | F01 arts. 9º e 41; F23 5.1.1(i) |
| Cadastrar o bebê | Tela própria: o que será registrado, para quê, quem verá, por quanto tempo e como revogar. Declaração de ser pai, mãe ou responsável legal, com prova guardada | F01 arts. 8º, 11 I e 14 §§1º, 5º e 6º. Não juntar com o aceite dos termos |
| Convidar cuidador | Para quem convida: o que o convidado verá e fará conforme o papel, e que dados já baixados podem ficar no aparelho dele mesmo após a revogação. Para o convidado: que nome e autoria ficam visíveis à família | F01 art. 9º; limites em [Offline, seção 11](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) |
| Publicar na comunidade | Prévia exata; nada da rotina entra automaticamente; aviso de que outros verão | Requisito da task; F13 art. 23 |
| Analytics e falhas | Opt-in separado e reversível; sem dados do bebê nos eventos | F23 5.1.1(ii) |
| Notificações | Explicar antes do pedido do sistema; o app funciona sem push | F23 5.1.2(i) |
| Mudança de finalidade | Aviso destacado e opção de revogar | F01 arts. 8º §6º e 9º §2º |

Só pai, mãe ou responsável legal cria o perfil do bebê e consente. Avós e babás entram como convidados e não consentem pelo bebê [HIP; F01 art. 14 §1º].

## 7. Direitos, exportação e exclusão

**Quem é o titular** [HIP; F01 arts. 5º V e 18 §3º]:

- **Conteúdo de cuidado:** o titular é o bebê, representado pelo responsável legal.
- **Autoria e conta:** cada cuidador é titular dos próprios dados.
- **Cuidador convidado:** não pede a eliminação do histórico do bebê.

**Exportação:**

- O responsável pede a exportação completa da família, em JSON e CSV (com anexos, quando existirem) [F01 arts. 18 e 19 §3º].
- O cuidador exporta os próprios dados.
- O pedido é registrado, e o arquivo sai por link de curta duração.

**Exclusão de conta:**

- Iniciável dentro do app (Apple 5.1.1(v)) e também por um endereço web (Google Play, [answer 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)).
- Apaga posts e respostas do autor na comunidade [F24]. Tópicos de terceiros ficam com "[removido]".

**Propagação** (detalhes em [Offline, seção 12](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)):

- uma tarefa de exclusão cobre banco, arquivos, índices, caches, subprocessadores e analytics;
- marcadores de exclusão chegam aos aparelhos offline;
- os backups expiram dentro da janela publicada;
- depois de qualquer restauração, as exclusões são reaplicadas;
- o usuário recebe um comprovante.

**Casos difíceis** [HIP, todos a validar com o jurídico]:

- **Saída de um cuidador:** os dados pessoais dele são removidos, e a autoria vira um rótulo neutro ("ex-cuidador"). O histórico do bebê fica com a família.
- **Último responsável sai:** o espaço do bebê inteiro é excluído, depois de oferecer a exportação.
- **Dois responsáveis em desacordo:** um pede a eliminação e o outro quer manter (separação, guarda compartilhada). A LGPD exige o consentimento de "pelo menos um dos pais", mas não resolve a revogação por um só.
- **O filho, quando adulto:** pode acessar ou apagar os dados da própria infância? Questão aberta.

## 8. Retenção proposta

| Dado | Prazo proposto | Fundamento | Situação |
| --- | --- | --- | --- |
| Dados de cuidado | Enquanto a família estiver ativa; aviso e exclusão após inatividade longa | F01 arts. 15 e 16 | Prazo de inatividade a definir |
| Cache no aparelho | Janela de 90 dias e licença de acesso de 14 dias por aparelho, renovada a cada sincronização | [Offline, seção 11](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) | Proposta técnica |
| Backups | 7 dias no piloto (backups diários do Supabase Pro e PITR de 7 dias); janela maior só com cópia externa | F12 (guia de segurança da ANPD); [Custos e operação, seção 5](Custos_e_Operacao.md) | Proposta; depende do RPO/RTO |
| Registros de acesso | 6 meses, sob sigilo | F16 art. 15 | Obrigação legal, para pessoa jurídica |
| Logs da aplicação, sem conteúdo | O mínimo necessário (proposta: 30 dias) | F17 art. 13 §2º | Proposta |
| Registro de incidentes | 5 anos, no mínimo | F04 art. 10 | Obrigação |
| Prova de consentimento | Enquanto durar o tratamento, mais o prazo que o jurídico indicar | F01 art. 8º §2º | A validar |
| Denúncias e ações de moderação | Prazo a definir, com relatório anual de transparência | F20; F17 | A definir |
| Conteúdo de abuso infantil | Preservação e comunicação às autoridades conforme a lei | F13 art. 27; F15 arts. 36 a 39 | Obrigação; fluxo próprio |

## 9. Segurança técnica

| Tema | Proposta | Verificação |
| --- | --- | --- |
| Em trânsito | TLS em tudo, inclusive downloads de anexos por URL assinada e curta [F34; F23 1.6] | Teste de configuração e inspeção de rede |
| Em repouso, servidor | Criptografia do provedor ativa; segredos fora do código | Configuração conferida no provedor |
| No aparelho | Banco local cifrado (PowerSync com op-sqlite e SQLCipher), chave no Keychain ou Keystore; nada de saúde no iCloud [F23 5.1.3] | `PRAGMA cipher_version` no build de release e o arquivo do banco ilegível sem a chave ([ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md)). Sem SQLCipher no binário, a chave é ignorada sem erro |
| Autenticação | Código de uso único por e-mail; JWT curto; sessões por aparelho, revogáveis ([ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)) | Teste de expiração e revogação |
| Acesso administrativo | MFA obrigatório, papéis mínimos, contas nominais, trilha de auditoria [F17 art. 13 I a III; F12] | Revisão periódica da trilha |
| Push | Texto genérico ("Novo registro na família"), sem nome do bebê nem dado de saúde; detalhe só dentro do app autenticado | Amostragem dos payloads enviados |
| Logs e falhas | Sem nomes, notas nem payloads; limpeza antes do envio | Amostragem e teste com dados fictícios marcados |
| Dependências | Sem SDK de anúncios; manifestos de privacidade da Apple (`PrivacyInfo.xcprivacy`) [F27; F28] | Inventário de SDKs a cada versão |
| Backups | Automáticos; restauração ensaiada e registrada; exclusões reaplicadas depois | Ensaio de restauração em ambiente de teste (Q-12) |

## 10. Subprocessadores e transferência internacional

| Serviço | Papel | Região proposta | Dados | Situação |
| --- | --- | --- | --- | --- |
| Supabase (PostgreSQL, Auth) | Banco e contas | sa-east-1 (São Paulo) | Todos os dados persistidos | Região oferecida segundo a consulta de 22/10/2026; contrato de operador a revisar |
| PowerSync Cloud | Sincronização | Região BR | Réplica de família e cuidado | Região oferecida segundo a consulta de 22/10/2026; contrato a revisar |
| Serviço de domínio (container) | Regras de escrita, comunidade, moderação | Brasil (proposta) | Todos | Hospedagem a escolher |
| FCM e APNs | Entrega de push | Global | Token e texto genérico | Há transferência; por isso o push não leva dado sensível |
| Expo (EAS Build e Submit; Push, se usado) | Build e distribuição | EUA | Código e binários; tokens, se usar o Push da Expo | Avaliar contrato e mecanismo de transferência |
| Provedor de e-mail | Códigos de acesso e avisos | A definir | E-mail e código | A escolher |
| Relatórios de falha e analytics | Qualidade | A definir | Técnicos, sem conteúdo; analytics só com opt-in | A escolher |

- Para a União Europeia não são necessárias cláusulas-padrão: ela é considerada adequada desde a Resolução CD/ANPD nº 32/2026 [F08].
- Para os EUA e os demais países valem as cláusulas-padrão da ANPD, sem alteração [F07 art. 16].
- Em qualquer caso, publicar uma página em português sobre as transferências [F07 art. 17].
- A região no Brasil reduz a transferência, mas não a elimina (push, build, e-mail) [HIP].

## 11. Incidentes

- **Relevância:** com dados de crianças, quase todo vazamento do espaço privado tende a ser relevante [HIP; F04 art. 5º].
- **Prazo:** planejar para 3 dias úteis até comunicar à ANPD e aos titulares, contados de quando se soube que o incidente afetou dados pessoais. A complementação vem em 20 dias úteis [F04 art. 6º]. O prazo em dobro de agente de pequeno porte pode não valer, porque dados de crianças contam como critério de alto risco [F05 arts. 3º e 4º]. Validar com o jurídico.
- **Conteúdo da comunicação:** número de titulares afetados, separando o de crianças [F04 art. 6º §2º II]. O modelo de dados precisa contar rapidamente bebês e adultos por família.
- **Registro:** todo incidente, comunicado ou não, fica registrado por 5 anos [F04 art. 10].
- **Roteiro:**
  - detectar, conter, avaliar, comunicar, corrigir e registrar;
  - responsável nomeado e modelos de aviso prontos;
  - ensaio antes do piloto.
- **Conteúdo de abuso infantil na comunidade:** remover, preservar e comunicar às autoridades [F13 art. 27; F15 arts. 36 a 39]. É um fluxo próprio, separado da moderação comum.

## 12. Requisitos das lojas ligados a privacidade

**Apple** [F23; F24; F25; F27]:

- exclusão de conta iniciável no app, apagando também o conteúdo publicado pelo usuário (5.1.1(v));
- apps de saúde ou com dado sensível enviados por pessoa jurídica (5.1.1(ix); decisão D3);
- nada de saúde no iCloud (5.1.3);
- rótulos de privacidade coerentes com o inventário e manifesto de privacidade;
- comunidade com filtro, denúncia, bloqueio e contato (1.2).

**Google Play** [F33; F35; F36; F37; F39; F40]:

- formulário Data safety completo;
- exclusão no app e por link web;
- declaração de apps de saúde e aviso de que o app não é dispositivo médico;
- público-alvo declarado, sem apelo infantil;
- regras de conteúdo gerado por usuários.

## 13. Antes do piloto

Recorte do checklist completo (seção 9 da pesquisa) para a fundação e o piloto. Alguns itens já entram nos aceites da MAT-18 (A7 e A10) e da MAT-19 (Q-07 e Q-11). Os demais são condição para o piloto (fase F5 do [Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)).

1. Controlador definido (decisão D3) e encarregado indicado (decisão D5).
2. Registro das operações e RIPD **antes** do tratamento real [F01 arts. 37 e 38; F11].
3. Tela de consentimento parental com prova e revogação gratuita.
4. Política de privacidade pública, em pt-BR, acessível sem login.
5. Inventário de subprocessadores e página de transferência.
6. Testes de isolamento (Q-06), exclusão e exportação (Q-12) passando.
7. Logs e push conferidos por amostragem, sem conteúdo sensível.
8. MFA e trilha de auditoria no acesso administrativo.
9. Roteiro de incidente ensaiado.
10. Parecer sobre o ECA Digital ("acesso provável") e idade mínima registrada (decisão D4).

## 14. Questões para validação jurídica

1. Bases legais por finalidade: consentimento parental, ou outra base admitida pelo Enunciado nº 1/2023?
2. A declaração de ser responsável legal, com prova guardada, basta como "esforço razoável" [F01 art. 14 §5º]?
3. Desacordo entre responsáveis e saída de cuidador: o que acontece com o histórico e com a autoria?
4. O ECA Digital se aplica, considerando a comunidade e a existência de mães e pais adolescentes?
5. O enquadramento como agente de pequeno porte vale, diante do alto risco?
6. Quais são os prazos de retenção e de inatividade?
7. Há regras brasileiras sobre promoção de fórmulas infantis a considerar em qualquer parceria?

## 15. Registro de desvio de processo

A pesquisa de privacidade resume os arts. 33, 37, 38, 41, 46, 48 e 49 da LGPD. Esses artigos foram lidos de um arquivo local salvo, depois que o sistema de aprovações bloqueou a extração com a instrução de não chegar ao mesmo resultado por outro caminho ([Progresso](../00_Inicio/Progresso.md), 04:05). Este documento cita esses artigos só pelo número, com o texto oficial no [Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), onde devem ser conferidos. Daniel decide se os resumos continuam na nota de pesquisa.

## Limites desta análise

- Proposta de design sem validação jurídica; nada foi implementado nem testado.
- Fontes consultadas em 22/10/2026 pela pesquisa. Regulamentos da ANPD sobre dados de saúde, RIPD, direitos dos titulares, segurança e IA estavam em elaboração [F10].
- Regiões e planos dos fornecedores podem mudar, e os contratos de operador não foram lidos.
- Documento escrito pelo coordenador, porque o redator delegado parou por falta de resposta do provedor.

## Relação com outros documentos

[Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) · [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md) · [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Custos e operação](Custos_e_Operacao.md) · [Qualidade e validação](Qualidade_e_Validacao.md) · [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md) · [ADR-008](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md) · [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md)
