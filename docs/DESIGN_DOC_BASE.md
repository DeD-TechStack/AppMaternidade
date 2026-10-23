# Design doc base de escopo (AppMaternidade)

**Versão:** 0.3  
**Status:** proposta em revisão  
**Data:** 23 de outubro de 2026  
**Etapa:** definição de produto e escopo, antes de qualquer implementação  
**Histórico de versões:** no fim do documento.

Esta base consolida o pedido original do projeto e a documentação da primeira etapa (APP-001, em `docs/AppMaternidade`). Serve para discutir o que o produto deve fazer, qual recorte vale testar primeiro e o que ainda precisa de decisão. As propostas de plataforma, público e tecnologia não representam aprovação definitiva nem substituem automaticamente os ADRs existentes.

## 1. Resumo para a primeira leitura

O AppMaternidade é um aplicativo de acompanhamento da rotina do bebê e de coordenação entre mães, pais e outros cuidadores autorizados. Sua proposta é reunir registros do dia, atividades de desenvolvimento e conversas por assunto em uma experiência simples de usar no celular.

O problema central é a informação espalhada: um cuidador não sabe quando o outro registrou uma mamada, se uma soneca ainda está em andamento ou que observação ficou para o próximo turno. O aplicativo deve tornar essas informações fáceis de registrar e consultar, com autoria e estado de sincronização claros.

A direção proposta é começar com um **piloto web feito para celular**, acessível por link e com instalação opcional na tela inicial. Android e iOS continuam previstos como aplicativos de loja, com compartilhamento de código quando adequado. A prioridade ao iPhone aparece desde os testes do piloto, sem depender de um aplicativo de loja já pronto.

O piloto reúne quatro pilares:

| Pilar | Entrega inicial proposta |
| --- | --- |
| Rotina | Os sete tipos de registro da APP-001 (sono, amamentação, mamadeira, alimentação sólida, fralda, tummy time e observação curta) e histórico diário com registro rápido. |
| Desenvolvimento | Sessões de tummy time, registro retrospectivo e um pequeno conjunto de atividades com fontes e revisão. |
| Cuidado compartilhado | Família, bebê, convite de outro cuidador, autoria e atividades em andamento. |
| Comunidade | Tópicos por assunto, publicações e respostas em texto, denúncia, bloqueio e moderação. |

O público inicial proposto é de cuidadores adultos, no Brasil, em português, acompanhando bebês de 0 a 12 meses. Esse recorte ainda precisa ser confirmado. O nome AppMaternidade permanece provisório e a linguagem deve incluir pais e outros cuidadores.

A primeira experiência deve permitir que uma família entre pelo link, cadastre o bebê, convide outro cuidador, registre cuidados e consulte o histórico. Também deve permitir uma sessão de tummy time e uma conversa temática sem publicar automaticamente informações privadas da criança.

**Próximo passo:** revisar escopo, público e prioridades. Depois dessa revisão e da autorização para avançar, a prova técnica avalia os riscos de plataforma. Nenhum código ou prova técnica é parte desta entrega documental.

## 2. O que está estabelecido e o que continua em proposta

| Tema | Situação nesta base |
| --- | --- |
| Rotina, desenvolvimento, comunidade e cuidado compartilhado | Pilares trazidos no pedido original. |
| Android e iOS | Destinos previstos para o produto; sequência de lançamento em revisão. |
| Revisão deste documento antes de implementar | Restrição expressa da rodada atual. |
| Piloto web/PWA primeiro | Direção recomendada, ainda em revisão. |
| Expo com saída web | Candidato preferido, condicionado à viabilidade dos fluxos críticos. |
| Supabase, PowerSync e serviço de domínio TypeScript | Proposta técnica da APP-001; não aprovada por esta base. |
| Brasil, pt-BR, 0–12 meses e contas de adultos | Recorte proposto; confirmar público e tratamento das exceções. |
| Comunidade em texto, sem mensagens diretas | Simplificação proposta para a primeira versão. |
| Ausência de anúncios e de IA respondendo às famílias | Limite proposto para o início. |
| Monetização, escala, cronograma e responsabilidades operacionais | Decisões abertas. |

A conclusão da APP-001 corresponde à entrega da pesquisa e dos documentos. Ela não converte todas as recomendações em decisões aceitas.

## 3. Objetivos de produto

1. Facilitar registros durante os cuidados, inclusive com uma mão e em baixa luminosidade.
2. Ajudar cuidadores a entender o que aconteceu e o que está em andamento.
3. Integrar tummy time e atividades à rotina, sem cobrança por desempenho.
4. Permitir troca de experiências por assunto, com privacidade e moderação.
5. Validar se o uso recorrente da solução ajuda as famílias antes de ampliar funcionalidades e canais.

O aplicativo organiza informações e oferece conteúdo educativo. O escopo inicial não inclui diagnóstico, atendimento médico, prescrição ou avaliação individual do desenvolvimento.

A integração dos quatro pilares é uma hipótese de valor a validar. Esta base não afirma que algum recurso seja exclusivo do produto nem que o Napper, referência citada no pedido original, não possua determinada função. A comparação com oito concorrentes está em `01_Produto/Concorrentes_e_Diferenciais.md`: nas fontes consultadas, nenhum cobre os quatro pilares de forma completa; o Kinedu tem os quatro, dois deles parciais.

## 4. Quem usa e com quais responsabilidades

| Papel | Necessidades e acesso propostos |
| --- | --- |
| Responsável pela família | Cadastrar o bebê, gerenciar convites e participantes, registrar e consultar cuidados. |
| Cuidador autorizado | Registrar e consultar a rotina dos bebês aos quais recebeu acesso. |
| Participante da comunidade | Publicar, responder, denunciar e bloquear, sem receber acesso às famílias de outros participantes. |
| Moderador | Tratar denúncias e aplicar regras da comunidade; o papel não concede acesso automático à rotina privada. |
| Operador do serviço | Manter o produto, atender solicitações e tratar incidentes dentro de permissões definidas. |

Cada adulto usa sua própria conta. O compartilhamento ocorre por vínculo autorizado, sem depender de uma senha familiar única.

O modelo da APP-001 já define três papéis na família: responsável (pode haver mais de um), cuidador (edita e exclui só o que criou e pode encerrar qualquer sessão em andamento) e observador (só lê). Qualquer vínculo pode ter validade, como o da babá (`03_Arquitetura/Modelo_de_Dados_e_Permissoes.md`, seção 5). Para manter o piloto pequeno, propõe-se expor no início só responsável e cuidador; confirmar se o observador entra. O mesmo modelo já admite vários bebês por família (RF-05); falta decidir se a interface do piloto mostra a troca de bebê. Cada registro identifica explicitamente a família e o bebê, sem associação implícita ao bebê errado.

## 5. Escopo funcional proposto para o piloto

| Área | O que entra | Como reconhecer a entrega |
| --- | --- | --- |
| Acesso e conta | Cadastro, entrada, recuperação de acesso e saída da conta. | A pessoa entra pelo link, identifica a própria conta e consegue sair com tratamento claro das pendências locais. |
| Família e bebê | Grupo de cuidado e perfil mínimo do bebê, evitando campos sem finalidade definida. | Os cuidadores reconhecem qual bebê está selecionado e quais dados são privados. |
| Convites | Convidar, aceitar, consultar participantes e revogar acesso. | A entrada de outro adulto exige autenticação e convite válido; links vencidos ou revogados têm resposta compreensível. |
| Sono | Início/fim de sessão e lançamento de um período já ocorrido. | Uma sessão pode ser recuperada ao retornar ao aplicativo e aparece no histórico. |
| Alimentação e mamadas | Amamentação, mamadeira e alimentação sólida: horário, modalidade e informações pertinentes, com detalhes opcionais. | O registro não exige preencher campos que não se aplicam ao cuidado realizado. |
| Fraldas | Horário, tipo e observação opcional. | A pessoa consegue registrar rapidamente e corrigir um engano. |
| Tummy time | Início/fim, duração, lançamento retrospectivo e histórico. | A sessão aparece junto à rotina e na área de desenvolvimento, sem meta clínica automática. |
| Histórico e passagem de cuidados | Linha do tempo, autoria, atividades em andamento, observações, a visão "desde que você saiu" (RF-07) e notas de passagem com destaque e validade. | Outro cuidador distingue informação recente, pendente ou já sincronizada. |
| Correção de registros | Editar e excluir registros conforme as permissões definidas. | Erros podem ser corrigidos sem criar duplicatas nem ocultar conflitos entre alterações. |
| Conteúdo educativo | Pequeno conjunto de atividades selecionadas, com origem e revisão identificadas. | O conteúdo informa a fase a que se destina e seus limites; textos não revisados não são publicados como orientação validada. |
| Comunidade | Assuntos, tópicos, respostas em texto, denúncia e bloqueio. | Uma conversa funciona sem expor os dados privados do bebê e existe alguém capaz de tratar denúncias. |
| Operação mínima | Suporte, pedidos de exportação/exclusão e administração da comunidade. | Há um procedimento viável e um responsável; pedidos não dependem de acessar dados de outras famílias. |

A primeira versão do histórico prioriza compreensão do dia e correção dos registros. Relatórios avançados, comparações entre bebês e previsões de sono não são condição de entrada no piloto.

### Notificações

A proposta é que o núcleo do piloto funcione sem permissão de notificação. Push pode ser acrescentado ao recorte validado, com ativação opcional e texto que não revele detalhes sensíveis na tela bloqueada. Atraso ou ausência de uma notificação não pode impedir o registro ou alterar a duração de uma sessão.

No iPhone, apps web adicionados à tela inicial podem solicitar Web Push desde o iOS 16.4, por interação direta da pessoa. Isso torna a função possível no piloto web, mas não demonstra sua confiabilidade no aplicativo ainda não construído. [F1]

Na APP-001, o RF-14 previa notificações entre cuidadores e lembretes locais desligados por padrão. Na web, o lembrete agendado pelo próprio aparelho não está disponível da mesma forma (a confirmar na MAT-17): os lembretes passariam a ser push enviados pelo servidor e dependeriam de rede.

## 6. O que fica para fases posteriores

- Aplicativos publicados nas lojas e integrações específicas de Android/iOS.
- Live Activities, widgets e apresentação contínua de atividades na tela bloqueada.
- Chat ao vivo, rodas de conversa síncronas, mensagens diretas e envio de mídia na comunidade. As rodas ao vivo não foram descartadas: o ADR-006 as deixa como etapa 3, condicionada à demanda medida.
- Gestação e acompanhamento de faixas etárias além do recorte inicial.
- Previsão sofisticada de sonecas, planos personalizados e IA respondendo às famílias.
- Câmera, reconhecimento de atividades, sensores e wearables.
- Telemedicina e marketplace.
- Anúncios, assinaturas, pagamentos e outras formas de monetização.
- Uma biblioteca extensa de conteúdo, gamificação ou comparação de desempenho entre bebês.
- Escalas complexas de cuidadores e relatórios profissionais.

Essas exclusões reduzem o primeiro recorte. Não eliminam os quatro pilares nem atribuem prioridade permanente às expansões.

## 7. Jornadas que o piloto precisa sustentar

### 7.1 Entrar pelo link e iniciar uma família

A pessoa abre o endereço no celular, entende a proposta, cria sua conta e cadastra o bebê com os dados necessários. Ela chega à rotina sem precisar instalar a PWA. A instalação é apresentada depois, quando houver benefício claro.

### 7.2 Convidar e dividir os cuidados

O responsável cria um convite. O segundo cuidador abre o link, entra com sua própria conta e aceita o vínculo. Os dois enxergam os registros autorizados e sua autoria. O fluxo precisa ser compreensível tanto no navegador quanto na PWA, inclusive quando a pessoa ainda não está autenticada.

### 7.3 Registrar com a internet indisponível

Um cuidador registra uma fralda ou uma mamada sem conexão. O aplicativo confirma que a informação foi salva naquele aparelho e está pendente de envio. Ao reconectar, a operação é validada e enviada sem duplicação. Só depois da confirmação remota ela é apresentada como sincronizada.

### 7.4 Usar o temporizador e retomar depois

Um cuidador inicia uma soneca ou sessão de tummy time, bloqueia a tela e volta mais tarde. O aplicativo recupera a sessão pelos instantes registrados. Outro cuidador pode encerrar a mesma sessão quando ela estiver disponível para ele e as permissões permitirem. Alterações simultâneas têm uma regra definida e visível.

### 7.5 Conversar sobre um cuidado

Uma pessoa abre um assunto, publica uma pergunta e recebe respostas. Participar dessa conversa não revela o perfil privado do bebê. Conteúdos inadequados podem ser denunciados e participantes podem ser bloqueados. Publicar exige conexão no recorte inicial proposto.

## 8. Organização inicial das telas

| Área | Conteúdo principal |
| --- | --- |
| Hoje | Bebê selecionado, registros rápidos, sessões em andamento e últimos cuidados. |
| Histórico | Linha do tempo e consulta por dia/tipo, com detalhes e correção. |
| Desenvolvimento | Tummy time, atividades e conteúdo revisado. |
| Comunidade | Assuntos, tópicos, respostas e recursos de proteção. |
| Família e conta | Bebê, participantes, convites, permissões, preferências e dados da conta. |

Esta navegação é uma hipótese de trabalho. Os desenhos devem mostrar também estado vazio, salvamento, falta de conexão, pendência, conflito, erro e acesso negado.

Botões de registro precisam ser alcançáveis com uma mão. Texto ampliado, leitor de tela, contraste e uso em baixa luminosidade devem ser considerados desde os fluxos iniciais.

## 9. Offline e sincronização como parte do escopo

“Funcionar offline” tem um alcance concreto:

| Operação | Comportamento proposto sem conexão |
| --- | --- |
| Abrir o aplicativo já preparado para offline | Abrir a interface e as funções previamente armazenadas, após preparação online bem-sucedida e enquanto o armazenamento necessário estiver disponível. |
| Primeiro acesso, criação de conta ou novo login | Exigir conexão. |
| Consultar histórico | Mostrar os dados disponíveis no aparelho, com indicação de atualização. |
| Criar registros privados essenciais | Persistir no aparelho e manter pendência até a aceitação pelo servidor. |
| Iniciar/encerrar sessão disponível localmente | Persistir a intenção e reconciliar ao reconectar. |
| Convidar, aceitar convite ou alterar permissões | Exigir conexão e confirmação do servidor. |
| Publicar na comunidade e efetivar ações de moderação | Exigir conexão; rascunho offline não é requisito do piloto. |
| Trocar de conta ou sair com pendências | Aplicar uma política explícita que preserve privacidade e evite perda silenciosa. |

Os estados mínimos de um registro são **salvo neste aparelho**, **aguardando sincronização**, **sincronizado** e, quando necessário, **conflito ou envio rejeitado**. O aplicativo deve orientar a recuperação quando houver rejeição.

Um registro ainda não enviado pode ter sua única cópia no aparelho. Ele não pode ser tratado como cache descartável. O servidor consolida as operações aceitas; a persistência local protege as intenções ainda pendentes.

Reenvio após falha não deve criar duas atividades. Exclusão versus edição, relógio alterado, mudança de fuso e ações concorrentes de cuidadores precisam de regras. A pessoa deve entender quando o outro cuidador ainda não recebeu uma alteração.

A revogação precisa bloquear novas operações remotas não autorizadas. Dados já armazenados em um aparelho desconectado não desaparecem instantaneamente; o desenho deve definir o tratamento na reconexão.

Para a web, armazenar a interface para abertura offline é um trabalho próprio, com política de atualização de service worker. O Expo documenta essa configuração e alerta para os efeitos de cache sobre atualizações. Não basta produzir uma saída web para concluir esse requisito. [F2]

O armazenamento do navegador tem limites e pode sofrer remoção de dados. Solicitar persistência não é garantia de concessão nem substitui sincronização e recuperação. O teste deve incluir armazenamento indisponível ou insuficiente; o aplicativo não pode informar “salvo” após uma gravação que falhou. [F3]

## 10. Privacidade, comunidade e operação

A rotina familiar e a identidade da comunidade têm finalidades e permissões diferentes. Entrar em um tópico não deve conceder acesso a um bebê. O compartilhamento de uma informação privada, se futuramente existir, precisará de escolha explícita e prévia do conteúdo (o RF-12 da APP-001 já previa isso: resumo da rotina só por ação consciente, com prévia). Ele não é condição do piloto.

A proposta inicial usa texto simples na comunidade e limita dados armazenados no aparelho ao necessário para o uso offline. A análise técnica deve tratar conteúdo malicioso, acesso ao perfil do navegador, troca de conta e arquivos locais. Uma vulnerabilidade de script pode atingir dados acessíveis pela mesma origem; separar tabelas ou telas não resolve sozinho essa fronteira. [F4]

Na proposta nativa da APP-001, o banco local é cifrado (PowerSync com op-sqlite e SQLCipher), com chave no Keychain ou no Keystore (`05_Privacidade_Operacao/Privacidade_e_Seguranca.md`, seção 9). O SQLCipher do `expo-sqlite` não cobre a web (`08_Referencias/Tecnologias/Mobile_e_Plataformas.md`), então a web precisa de um desenho próprio de proteção local.

Não se deve concluir, nesta fase, que a web não admite criptografia ou que qualquer armazenamento local oferece a mesma proteção de uma aplicação nativa. Proteção de dados e gestão de chaves exigem desenho específico para cada ambiente. [F4]

Antes de coletar dados reais no piloto, a proposta exige:

- Identificar quem opera o serviço e responde pelo tratamento dos dados; decidir a forma adequada de atuação com avaliação jurídica pertinente. Hoje isso está junto com as contas das lojas na D3 (MAT-22); a proposta é separar em duas decisões.
- Definir finalidade, dados mínimos, informação às famílias, acesso, retenção, exportação e exclusão.
- Validar a política de contas adultas e o tratamento de situações fora do recorte; não assumir que a passagem por uma loja resolveu esse ponto. A D4 (MAT-23) propõe 18 anos ou mais; o parecer sobre o ECA Digital e a consultoria em LGPD estão na D5 (MAT-24).
- Definir responsável por suporte, moderação e incidentes.
- Validar isolamento entre famílias, recuperação dos dados e proteção das operações administrativas.

Esses itens são requisitos de preparação do piloto, não uma declaração de conformidade jurídica. A decisão sobre contas Apple/Google pertence à distribuição e pode ocorrer em outra etapa.

## 11. Etapas e critérios para avançar

| Etapa | Entrega | Condição para avançar |
| --- | --- | --- |
| Revisão documental — agora | Escopo, jornadas, fases e decisões abertas compreensíveis. | O documento é lido e corrigido, o que for aceito fica registrado e a finalidade da web é esclarecida com o interessado. |
| Prova técnica — após autorização | Evidências dos riscos de plataforma, usando dados fictícios e o recorte da MAT-17. | Registro e recuperação local, sincronização, contas/convites e isolamento funcionam nos ambientes-alvo; limitações conhecidas têm decisão. |
| Piloto web com grupo convidado | Os quatro pilares no recorte inicial, com operação e suporte definidos. | Uso observado demonstra utilidade; problemas relevantes de integridade/acesso são resolvidos e as prioridades são revisadas. |
| MVP estabilizado | Fluxos essenciais consolidados, conteúdo e moderação sustentáveis. | Capacidade de ampliar o público sem depender de correções manuais recorrentes para usar o núcleo do produto. |
| Aplicativos de loja | Android/iOS com adaptações de plataforma e validação própria. | Demanda, limitações da web ou recursos necessários justificam a entrega; há capacidade de teste, assinatura, revisão e manutenção. |

Na APP-001, a sequência era outra: fundação técnica (MAT-18), MVP utilizável em Android e iOS e piloto fechado com poucas famílias, pelo TestFlight e pelo teste fechado da Play (`07_Roadmap/Roadmap_e_Proxima_Fatia.md`, F5). O app web para cuidadores ficava entre as evoluções posteriores (F6; `01_Produto/Visao_e_Escopo.md`, seções 9 e 11). Esta base propõe o piloto web antes do MVP estabilizado e das lojas. As tarefas MAT-17 (prova técnica), MAT-18 (fundação e primeira fatia de cuidados) e MAT-19 (fatia da comunidade) continuam no backlog e só começam com autorização explícita.

Piloto e MVP são fases de maturidade do produto. Lojas são também uma decisão de canal: se o piloto revelar que uma limitação compromete o uso essencial no iPhone, a entrada do app nativo pode ser antecipada. Não é necessário manter uma ordem rígida que contrarie as evidências.

### MAT-17: evidências planejadas, ainda não executadas

A futura prova técnica deve cobrir, em iPhone real e Android representativo:

1. Registro offline, encerramento, reabertura e sincronização sem perda ou duplicação nos cenários testados.
2. Duas abas, sessões concorrentes e duas pessoas editando a mesma atividade.
3. Troca de conta, revogação e impossibilidade de acessar outra família.
4. Atualização da PWA preservando registros pendentes.
5. Convite, autenticação e passagem entre navegador e app instalado, sem presumir compartilhamento de sessão ou armazenamento.
6. Temporizador após bloqueio, retomada, alteração de relógio e mudança de fuso.
7. Negação de notificações, ausência de push e falha de armazenamento.
8. Abertura offline após preparação inicial e distinção entre dados presentes e ausentes.

Se uma combinação falhar, identificar se a causa está no SDK, na persistência, no navegador, no desenho de sincronização ou na implementação. Isso orienta a alternativa; mudar de framework não resolve automaticamente todas essas classes de problema.

## 12. Direção técnica proposta

| Camada | Candidato ou princípio | Condição de decisão |
| --- | --- | --- |
| Interface | React Native + Expo, Expo Router e saída web. | Validar experiência web mobile e os recursos necessários em iPhone/Android. |
| Dados remotos e identidade | Supabase (PostgreSQL) em São Paulo, no Conjunto B da D2 (MAT-21). | Confirmar permissões, operação, região efetivamente contratada e custo. |
| Persistência e sincronização | PowerSync como candidato, com implementação própria por ambiente quando necessária. | O SDK Web do PowerSync é GA (`03_Arquitetura/Comparacao_de_Arquiteturas.md`), mas o suporte a React Native Web, usado pela opção A, consta como beta; a MAT-17 avalia a combinação real. [F5] |
| Regras de domínio | Serviço/camada TypeScript proposto na APP-001. | Definir responsabilidades e evitar serviços adicionais sem necessidade concreta. |
| Alternativa web | React web com PWA e Capacitor para empacotamento posterior. | Reavaliar se a web predominar ou se a opção A falhar por motivo que a alternativa consiga resolver. |
| Distribuição iOS futura | Build e submissão em nuvem, com testes em aparelho. | O EAS permite esse fluxo a partir de Windows; isso não elimina adaptação, testes nem revisão da loja. [F6] |

“Uma base” significa compartilhar regras, componentes e organização quando fizer sentido. Armazenamento, notificações, instalação e recursos de sistema podem exigir implementações próprias por plataforma.

O Capacitor deve continuar como alternativa comparável, sem promessa de que seu uso resolva por si só qualquer limitação observada no Safari. Live Activities e outros recursos nativos precisam de avaliação específica.

A decisão de stack deve vir depois dos requisitos que justificam a escolha. Este documento não contrata serviços, fixa versões de dependências nem fecha o orçamento.

### Custos por etapa

No piloto, estimar hospedagem, banco, sincronização, autenticação/e-mail, monitoramento, suporte, moderação e acesso aos aparelhos de teste. Nas lojas, acrescentar contas, build, distribuição e manutenção específica.

As estimativas da APP-001 foram feitas para nativo primeiro e estão em `05_Privacidade_Operacao/Custos_e_Operacao.md` e na D2 (MAT-21); precisam ser refeitas para o piloto web.

Evitar converter o adiamento de Apple/EAS em uma economia mensal fixa sem antes definir quais planos seriam necessários. O acesso a um iPhone de teste é um requisito de validação, que pode ser atendido sem assumir imediatamente a compra de um aparelho.

## 13. Critérios de sucesso e aceite do piloto

O piloto deve permitir observar:

- Se as famílias conseguem começar pelo link e registrar cuidados com pouca orientação.
- Se outro cuidador entende o que aconteceu, quem registrou e o que ainda está pendente.
- Se o histórico ajuda na passagem de cuidados.
- Se tummy time e atividades se encaixam na rotina sem gerar cobrança.
- Se tópicos por assunto produzem conversas úteis e podem ser moderados.
- Se o produto continua compreensível quando há falha de conexão ou de notificação.

Antes do recrutamento, definir tamanho do grupo, duração, dispositivos representados e critérios mensuráveis de avaliação. Esta base não inventa resultados, metas comerciais ou números de adoção.

Para aceitar a primeira entrega utilizável, exigir demonstração dos fluxos essenciais nos aparelhos-alvo, correção dos defeitos de perda/duplicação conhecidos e ausência de falhas de autorização pendentes que permitam acesso entre famílias. Resultado de um conjunto de testes não equivale a garantia absoluta contra falhas futuras.

## 14. Decisões em aberto

| Decisão | Proposta de partida | O que a resposta altera |
| --- | --- | --- |
| O que o interessado quis dizer com “web”? | Perguntar se quer uma demonstração por link ou uso diário pelas famílias. | Canal inicial, necessidades offline e importância de instalar a PWA. |
| Quem participará do piloto? | Pequeno grupo convidado, com presença de usuários de iPhone e Android. | Recrutamento, suporte, dispositivos e validação de uso. |
| Qual o recorte de público? | Brasil, pt-BR, bebês de 0–12 meses e contas de adultos. | Conteúdo, regras de entrada e tratamento de casos fora da faixa. |
| Um ou vários bebês por família? | O modelo já admite vários; decidir se o piloto mostra a troca de bebê. | Seleção de bebê, convites, histórico e esforço do piloto. |
| Quem opera e modera? | Nomear responsáveis antes de receber dados reais e abrir conversas. | Viabilidade do piloto e capacidade de suporte. |
| Este recorte inicial está aceito? | Quatro pilares, os sete tipos de registro e comunidade textual simples. | Ordem de implementação e critérios da primeira versão. |
| Há acesso a iPhone para validar? | Garantir aparelho real desde a prova técnica. | Capacidade de manter o iPhone como prioridade efetiva. |

Relação com as decisões já abertas (D1 a D7): o recorte de público e o recorte inicial ficam na D4 (MAT-23); quem opera e modera, na D3 (MAT-22) e na D5 (MAT-24); a stack, na D1 (MAT-20) e na D2 (MAT-21); a monetização, na D6 (MAT-25). A D7 (MAT-26), sobre registros fora do Git, continua necessária antes de publicar o restante da documentação. As perguntas sobre o interessado, o grupo do piloto e o iPhone são novas.

A recomendação é resolver essas perguntas antes de discutir mais bibliotecas. Elas definem o produto que a arquitetura precisa sustentar.

## 15. Relação com os documentos existentes

Esta base é uma referência de leitura e discussão. A atualização dos documentos de origem deve preservar o histórico das propostas.

Os documentos da APP-001 ficam em `docs/AppMaternidade`, com entrada em `00_Inicio/Home.md`, e ainda não estão no repositório. Eles descrevem a proposta da APP-001 (nativo primeiro). Esta base registra a proposta revista de 22/10 para canal, fases e web; nos demais temas, valem os documentos da APP-001. A reconciliação acontece nas partes abaixo, depois da revisão deste documento.

| Documento da APP-001 | Ajuste a reconciliar após a revisão |
| --- | --- |
| ADR-001 e D4 | Canal do piloto, recorte funcional, fases e condições de entrada nas lojas. |
| Offline e ADR-004 | Operações pendentes, abertura offline, conflitos, atualização e notificações. |
| Privacidade e ADR-005 | Riscos por ambiente, separação da comunidade e política de contas adultas. |
| Comparação e ADR-002 | Expo web condicionado à prova técnica e Capacitor como alternativa fundamentada. |
| D3 | Separar distribuição nas lojas de responsabilidade pela operação/tratamento dos dados. |
| Custos, qualidade e fluxos | Orçamento por fase, iPhone real, instalação opcional e convites entre contextos. |

**Resultado esperado da revisão:** escopo compreendido e corrigido, decisões registradas e definição de quando a MAT-17 poderá começar. Até lá, o trabalho permanece documental.

## Fontes e origem

**Origem do produto e das propostas:** pedido original do projeto, consulta sobre plataformas de 22/10/2026 e documentação da APP-001, conferida em 22/10/2026. As referências a arquivos apontam para essa documentação, em `docs/AppMaternidade`: `01_Produto/Visao_e_Escopo.md`, `01_Produto/Concorrentes_e_Diferenciais.md`, `03_Arquitetura/Modelo_de_Dados_e_Permissoes.md`, `03_Arquitetura/Comparacao_de_Arquiteturas.md`, `05_Privacidade_Operacao/Privacidade_e_Seguranca.md`, `05_Privacidade_Operacao/Custos_e_Operacao.md`, `06_ADRs/ADR-006_Comunidade_e_Moderacao.md`, `07_Roadmap/Roadmap_e_Proxima_Fatia.md`, `08_Referencias/Tecnologias/Mobile_e_Plataformas.md` e a lista das decisões D1 a D7, em `07_Roadmap/`.

**Fontes técnicas consultadas em 22/10/2026:**

- **[F1] WebKit — Web Push for Web Apps on iOS and iPadOS:** [https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- **[F2] Expo — Progressive web apps:** [https://docs.expo.dev/guides/progressive-web-apps/](https://docs.expo.dev/guides/progressive-web-apps/)
- **[F3] WebKit — Updates to Storage Policy:** [https://webkit.org/blog/14403/updates-to-storage-policy/](https://webkit.org/blog/14403/updates-to-storage-policy/)
- **[F4] OWASP — HTML5 Security Cheat Sheet:** [https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- **[F5] PowerSync — React Native Web Support:** [https://docs.powersync.com/client-sdks/frameworks/react-native-web-support](https://docs.powersync.com/client-sdks/frameworks/react-native-web-support)
- **[F6] Expo — FAQ, desenvolvimento iOS a partir de Windows:** [https://docs.expo.dev/faq/](https://docs.expo.dev/faq/)

As fontes sustentam capacidades e limites técnicos específicos. O recorte de produto, a sequência de fases e os critérios de aceite são propostas desta versão, ainda em revisão.

## Histórico de versões

| Versão | Data | O que mudou |
| --- | --- | --- |
| 0.1 | 22/10/2026 | Versão-base: escopo, jornadas, telas, offline, privacidade, fases e decisões. |
| 0.2 | 22/10/2026 | Conferida com a documentação da APP-001: sete tipos de registro, papéis e vários bebês do modelo, lembretes na web, cifra local do nativo, sequência original da APP-001, ligação com D1 a D7 e MAT-17 a MAT-19, caminhos dos documentos; formatação e links limpos. |
| 0.3 | 23/10/2026 | Texto focado no projeto, sem menções a pessoas nem ao processo de elaboração; publicado também no GitHub. |

## Como manter este documento

Toda mudança de escopo, decisão ou fase atualiza este documento no mesmo passo, com uma linha no histórico. As decisões entram também na tarefa correspondente (MAT-20 a MAT-26).
