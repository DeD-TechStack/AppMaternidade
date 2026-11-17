---
tipo: produto
status: proposta
revisado_em: 2026-11-17
responsavel: lider-appmaternidade
base_conferida: ramo de integração do site (int/refazer), commit 56c21213, 17/11/2026
fontes_principais:
  - 01_Produto/Visao_e_Escopo.md
  - 06_ADRs/ADR-009_Site_Completo_Primeiro.md
  - 00_Inicio/PENDENCIAS.md
  - 07_Roadmap/Decisoes_para_Daniel.md
---

# Funcionalidades do site e do app

Esta nota lista tudo o que o AppMaternidade faz ou vai fazer, área por área, e diz em que lugar cada coisa fica: no site, no app de celular ou nos dois. Ela foi escrita para quem vai cuidar do produto sem precisar ler código. A lista de requisitos de origem (RF-01 a RF-14) está em [Visão e escopo](Visao_e_Escopo.md), seção 6.

## 1. Como ler esta nota

O AppMaternidade começa como um site completo, aberto pelo navegador, no computador ou no celular. Os apps de Android e iPhone vêm depois, feitos a partir do mesmo site, com as mesmas funções e o mesmo visual, mais o que só um aparelho consegue fazer (decisão de Daniel de 03/11/2026, no [ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)).

Cada funcionalidade leva uma marca:

| Marca | Quer dizer |
| --- | --- |
| SITE | Fica só no site. |
| APP | Fica só no app de celular, porque depende do aparelho. |
| AMBOS | Existe no site e vai existir igual no app. A coluna "Como fica no app" diz o que muda. |

A coluna "RF" traz o número do requisito em [Visão e escopo](Visao_e_Escopo.md). "Nenhum" quer dizer que o item não tem número próprio naquela lista. Os números com RNF são requisitos de qualidade (por exemplo, funcionar sem internet).

A coluna "Situação hoje no site" foi conferida em 17/11/2026 na versão do site que junta todo o trabalho já aprovado, e não de memória:

- **pronto**: a função existe e funciona nessa versão;
- **em ajuste**: existe, mas há correção aberta registrada;
- **falta**: ainda não existe no site;
- **a conferir**: não deu para confirmar só olhando as telas;
- **não se aplica**: o item é só do app.

Dois avisos valem para tudo:

- Todas as páginas estão passando por uma revisão visual desde 17/11, porque Daniel achou o site "muito vazio" e pediu que a cara dele combine com o app que vem depois. "Pronto" fala da função, não do visual final.
- O site ainda roda em modo de demonstração: os dados ficam num ambiente de teste, e só se usam nomes e datas fictícios. O próprio site avisa isso.

## 2. Funcionalidades por área

### Conta e acesso

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Criar conta | Cadastra nome, e-mail e senha e concorda com os Termos e a Política de privacidade. | Nenhum | AMBOS | Igual. | pronto |
| Entrar com e-mail e senha | Entra com o e-mail e a senha cadastrados. | Nenhum | AMBOS | Igual. Entrar com a digital ou o rosto é sugestão (seção 3). | pronto |
| Entrar com Google | Entra com a conta Google, sem criar senha nova. | Nenhum | AMBOS | Igual, se Daniel aprovar. | falta (decisão de Daniel em aberto, seção 5) |
| Recuperar e trocar a senha | Pede um link por e-mail e escolhe uma senha nova. | Nenhum | AMBOS | Igual; o link do e-mail pode abrir direto no app (sugestão). | pronto |
| Primeiro acesso | Diz o próprio nome e o fuso horário; depois cria uma família ou entra com um convite. | RF-05 | AMBOS | Igual. | pronto |
| Perfil da conta | Muda o nome que a família vê e o fuso. O e-mail não muda por ali. | Nenhum | AMBOS | Igual. | pronto |
| Id da conta | Copia um número que a equipe de moderação usa para dar um papel na equipe. | RF-11 | AMBOS | Igual. | pronto |
| Sair | Encerra o acesso naquele aparelho. | Nenhum | AMBOS | Igual. | pronto |

### Família e cuidadores

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Criar família | Dá um nome à família e escolhe o fuso em que os horários aparecem. Quem cria vira responsável. | RF-05 | AMBOS | Igual. | pronto |
| Cadastrar bebês | Cadastra nome ou apelido e data de nascimento. A data serve para mostrar atividades da fase e não aparece na comunidade. | RF-05 | AMBOS | Igual. | pronto |
| Editar e arquivar bebê | Corrige os dados do bebê ou tira ele da lista sem perder os registros; dá para desarquivar. | RF-05 | AMBOS | Igual. | pronto |
| Convidar cuidador | Cria um convite com papel (responsável, cuidador ou observador) e, se quiser, um prazo de acesso. Recebe um código e um link para mandar pelo canal que preferir. O convite vence em 7 dias. | RF-05 | AMBOS | Igual. Mandar o convite pelo menu de compartilhar do celular é sugestão (seção 3). | pronto |
| Aceitar convite | Cola o código ou o link, vê qual família convidou e com que papel, e aceita. | RF-05 | AMBOS | Igual; abrir o link do convite direto no app é sugestão (seção 3). | pronto |
| Papéis | Responsável administra tudo; cuidador registra e muda só o que ele mesmo fez; observador só lê. | RF-05 | AMBOS | Igual. | pronto |
| Mudar papel | O responsável muda o papel de alguém. Quem tira de si o papel de responsável recebe um aviso antes. | RF-06 | AMBOS | Igual. | pronto |
| Remover acesso | O responsável tira o acesso de alguém na hora (por exemplo, a babá que saiu). | RF-06 | AMBOS | Igual. | pronto |
| Cancelar convite | O responsável cancela um convite que ainda não foi usado. | RF-06 | AMBOS | Igual. | pronto |
| Sair da família | Qualquer pessoa sai; para voltar, precisa de convite novo. | RF-06 | AMBOS | Igual. | pronto |
| Editar família | O responsável muda o nome e o fuso da família. | RF-05 | AMBOS | Igual. | pronto |
| Mais de uma família | Quem participa de mais de uma família escolhe qual está vendo. | RF-05 | AMBOS | Igual. | pronto |

### Rotina do bebê

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Tela Hoje | Vê num lugar só: sessão em andamento, últimos registros, totais do dia (mamadas, fraldas, sono) e a última mamada com quem fez. | RF-01, RF-04 | AMBOS | Igual. A navegação entre as telas vira uma barra de abas no rodapé, decidida só quando o app for feito. | pronto |
| Registro rápido | Com um toque, inicia sono, mamada ou tummy time, ou registra fralda (xixi, cocô ou ambos). Pode desfazer logo depois. | RF-01 | AMBOS | Igual, com o botão principal na parte de baixo da tela, onde o polegar alcança. | pronto |
| Registro completo | Escolhe um dos sete tipos (sono, mamada, mamadeira, alimentação sólida, fralda, tummy time e observação) e preenche os detalhes, como lado, quantidade em ml ou alimento. | RF-01 | AMBOS | Abre como um painel que sobe do rodapé da tela. | pronto |
| Registrar depois | Registra algo que já aconteceu, escolhendo data e hora, com botões de 5 minutos para ajustar. | RF-03 | AMBOS | Igual. | pronto |
| Sessão cronometrada | Inicia e encerra mamada, sono ou tummy time com cronômetro. A sessão fica guardada: quem abrir depois, de outro aparelho, vê que ela está em andamento. | RF-02 | AMBOS | Igual. Além disso, o app pode mostrar o cronômetro na tela bloqueada (linha abaixo). | pronto |
| Encerrar em outro horário | Encerra uma sessão esquecida no horário em que ela de fato terminou. O site pergunta "Ainda em andamento?" quando uma sessão passa muito do normal. | RF-02, RF-03 | AMBOS | Igual. | pronto |
| Sessões ao mesmo tempo | Vê as outras sessões abertas (por exemplo, o bebê dormindo enquanto outra pessoa registra a fralda) e junta duas sessões iguais abertas por engano. | RF-02 | AMBOS | Igual. | pronto |
| Aviso de registro repetido | Quando duas pessoas registram a mesma coisa, o site mostra quem registrou e pergunta se mantém os dois ou exclui um. | RF-01 | AMBOS | Igual. | pronto |
| Detalhe do registro | Vê quem registrou, quem iniciou e quem encerrou, se foi registrado na hora ou depois, e o histórico de alterações. | RF-04 | AMBOS | Igual. | pronto |
| Corrigir e excluir | Edita ou exclui um registro. O cuidador só mexe no que ele mesmo fez. | RF-03 | AMBOS | Igual. | pronto |
| Lixeira | Recupera um registro excluído em até 30 dias. | RF-03 | AMBOS | Igual. | pronto |
| Histórico por dia e por semana | Navega pelos dias, vê os últimos 7 dias, filtra por tipo e vê o resumo do dia e da semana, com quem fez cada registro. | RF-04 | AMBOS | Igual. Gráficos mais ricos são uma expansão possível listada em Visão e escopo, sem compromisso. | pronto |
| Desde o seu último registro | Quem chega para o turno vê o que aconteceu desde a última vez que registrou algo. | RF-07 | AMBOS | Igual. | pronto |
| Notas da família | Escreve um recado ("pomada só à noite") sobre um bebê ou a família toda, com destaque por 12 horas, 24 horas ou 3 dias. As notas em destaque aparecem em Hoje. | RF-07 | AMBOS | Igual. | pronto |
| Fuso diferente | Quando o aparelho está em outro fuso, o site avisa que o dia segue o fuso da família. | RF-04 | AMBOS | Igual. | pronto |
| Registrar sem internet | Registra mesmo sem conexão; o registro sobe quando a internet volta. | RNF-02 | APP | Feito no app. No site essa parte foi tirada do escopo por Daniel em 10/11 (ele pediu "só o site"). | não se aplica |
| Cronômetro na tela bloqueada | Vê o tempo da mamada ou do sono sem desbloquear o celular. No iPhone é o contador que fica na tela bloqueada; no Android, uma notificação fixa com o cronômetro. | RF-02 | APP | Planejado para o app. Ainda falta confirmar como fazer isso tecnicamente (ADR-009, seção 4). | não se aplica |

### Madrugada

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Modo madrugada | Liga, pelo botão da lua no topo, uma tela escura para não acordar ninguém. Vale nas telas da rotina e desliga ao sair delas. | RF-01, RF-02 | AMBOS | Igual. O mesmo jeito escuro serve de base para o app. | em ajuste (correção de layout aberta para telas grandes) |
| Mamada com uma mão | Com o modo madrugada ligado, a tela Hoje mostra um botão redondo e grande "Iniciar mamada", para quem pode registrar. | RF-01, RF-02 | AMBOS | Igual, com o botão embaixo, ao alcance do polegar. | pronto |

### Desenvolvimento

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Ideias para brincar por fase | Escolhe o bebê ou a fase e vê ideias de brincadeira para cada faixa, do nascimento aos 12 meses. O texto avisa que as fases se sobrepõem e que nada é tarefa. | RF-08 | AMBOS | Igual. | pronto |
| Sessão de tummy time | Inicia e encerra o tummy time ou registra um que já fez, com o aviso de segurança na tela e o histórico dos últimos 7 dias. Não há meta. | RF-08 | AMBOS | Igual. | pronto |
| Artigos com fontes | Lê "O que as fontes dizem sobre tummy time" e "Marcos, sem cobrança". Cada item mostra as fontes (Ministério da Saúde, Sociedade Brasileira de Pediatria e outras) e a data em que foram consultadas. | RF-09 | AMBOS | Igual. | pronto |
| Autoria, revisão e versão | Cada conteúdo mostra quem escreveu, a situação da revisão profissional e a versão. Hoje aparece "Revisão profissional: pendente". | RF-09 | AMBOS | Igual. | em ajuste (a revisão profissional depende de decisão de Daniel, seção 5) |

### Comunidade e moderação

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Entrar na comunidade | Aceita os termos e as regras e cria um perfil público com apelido. O site pede para não usar o nome da pessoa nem o do bebê. | RF-10 | AMBOS | Igual. | pronto |
| Espaços por assunto | Navega por sete espaços temáticos (como Sono, Alimentação e Banho). | RF-10 | AMBOS | Igual. | pronto |
| Tópicos e respostas | Abre um tópico, responde a alguém e vê a prévia antes de publicar. Edita o que escreveu. | RF-10 | AMBOS | Igual. Avisar no celular quando alguém responder não está nos requisitos; o dono do site pode pedir isso na seção 4. | pronto |
| Incluir resumo da rotina | Só quem é responsável pelo bebê pode, se quiser, colar no texto um resumo com números da rotina de hoje ou dos últimos 7 dias. Vê a prévia e pode mudar ou apagar antes de publicar. | RF-12 | AMBOS | Igual. | pronto |
| Denunciar | Denuncia um tópico, uma resposta ou um perfil, com motivo. Quem foi denunciado não fica sabendo. | RF-11 | AMBOS | Igual. | pronto |
| Minhas denúncias | Acompanha em que pé está cada denúncia que fez. | RF-11 | AMBOS | Igual. | pronto |
| Bloquear | Bloqueia um perfil e desbloqueia depois, pela página do próprio perfil. | RF-11 | AMBOS | Igual. | pronto |
| Painel de moderação | A equipe vê a fila de denúncias com filtros e prioridade, abre cada caso, decide com motivo escrito e oculta, remove ou restaura o conteúdo. A moderação nunca vê a rotina das famílias. | RF-11 | SITE | Fica no site, como ferramenta interna da equipe. | pronto |
| Auditoria da moderação | Registra cada ação da equipe: quem fez, quando e por quê. | RF-11 | SITE | Fica no site. | pronto |
| Papéis da equipe | Quem é admin dá ou tira o papel de moderador ou admin, com prazo se quiser. | RF-11 | SITE | Fica no site. | pronto |
| Verificação em duas etapas da equipe | Para abrir o painel, a pessoa da equipe digita um código de 6 dígitos gerado por um app autenticador no celular dela. | RF-11 | SITE | Fica no site. | em ajuste (a tela existe; falta ligar a opção no painel do banco de dados, item de Daniel na seção 5) |

### Avisos

O requisito RF-14 fala em avisos opcionais entre cuidadores e lembretes desligados por padrão. No site, o líder do projeto decidiu, com a delegação de Daniel (que pode mudar isso), fazer avisos dentro do próprio site, sem lembretes e sem notificação no celular. A parte de notificar com o site fechado fica para o app.

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Avisos dentro do site | Vê os avisos da família numa tela própria do site. Liga ou desliga os avisos na página Conta. | RF-14 | AMBOS | No app, os mesmos avisos podem chegar como notificação (linha abaixo). | falta (desenho escolhido; construção ainda não começou) |
| Notificação no celular | Recebe um aviso no celular mesmo com o app fechado. A notificação não mostra dado sensível (RNF-06). | RF-14 | APP | Planejado para o app. | não se aplica |
| Lembretes no aparelho | Liga lembretes que o próprio celular dispara. Vêm desligados. | RF-14 | APP | Planejado para o app. | não se aplica |

### Privacidade e dados

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Baixar meus dados | Baixa um arquivo com os dados para guardar. Quem é responsável recebe a família inteira; os outros papéis recebem os próprios dados. | RF-13 | AMBOS | Igual; mandar o arquivo pelo menu de compartilhar do celular é sugestão (seção 3). | pronto |
| Excluir conta | Exclui a conta digitando a senha. Se a pessoa for a única responsável de uma família, o site pede antes que ela passe o papel para alguém ou exclua a família. Nos registros que ela fez, o autor vira "pessoa removida". | RF-13 | AMBOS | Igual. | pronto |
| Excluir família | O responsável apaga a família, os bebês, os registros e os convites, digitando o nome da família para confirmar. O site oferece baixar os dados antes. | RF-13 | AMBOS | Igual. | pronto |
| Comunidade separada da rotina | Nada da rotina vai para a comunidade sem a pessoa escolher (o resumo da Comunidade é a única porta, e tem prévia). | RNF-04, RF-12 | AMBOS | Igual. | pronto |
| Cada família vê só o que é dela | Uma família não enxerga dados de outra. | RNF-03 | AMBOS | Igual. | a conferir (é uma regra do servidor; as telas não mostram isso) |
| Dados guardados com segurança no aparelho | O que o app guarda no celular para funcionar sem internet fica protegido por criptografia. | RNF-02 | APP | Planejado para o app (ADR-009, seção 4). | não se aplica |

### Páginas públicas

São as páginas que qualquer pessoa vê sem entrar.

| Funcionalidade | O que a pessoa faz | RF | Onde | Como fica no app | Situação hoje no site |
| --- | --- | --- | --- | --- | --- |
| Página inicial | Conhece o produto antes de criar a conta. | Nenhum | SITE | O app é apresentado pela página dele na loja. | em ajuste (visual sendo refeito) |
| Como funciona | Entende os passos de uso. | Nenhum | SITE | Não vai para o app. | em ajuste (visual sendo refeito) |
| Cuidado compartilhado | Entende como dividir os cuidados com outros adultos. | Nenhum | SITE | Não vai para o app. | em ajuste (visual sendo refeito) |
| Desenvolvimento (página aberta) | Vê como funciona a área de desenvolvimento, com fontes. | RF-09 | SITE | Dentro do app, o conteúdo fica na área Desenvolvimento. | em ajuste (visual sendo refeito) |
| Sobre | Lê o que é o projeto. | Nenhum | SITE | Não vai para o app. | em ajuste (visual sendo refeito) |
| Regras da comunidade | Lê as regras antes de participar, com telefones de ajuda, como o CVV (188). | RF-10, RF-11 | AMBOS | Abre de dentro do app, na comunidade. | pronto |
| Política de privacidade | Lê como os dados são tratados e com quem falar. | RF-13 | AMBOS | As lojas exigem a política publicada; o app leva até ela. | em ajuste (texto final depende de Daniel, seção 5) |
| Termos de uso | Lê as regras de uso. | Nenhum | AMBOS | O app leva até a página. | em ajuste (texto final depende de Daniel, seção 5) |
| Exclusão de conta | Entende como excluir a conta, mesmo sem entrar. | RF-13 | AMBOS | A loja do Google exige essa página na internet; o app leva até ela. | pronto |
| Contato | Encontra o e-mail de contato. Hoje é um endereço provisório da demonstração. | Nenhum | AMBOS | O app leva até a página. | pronto |
| Endereço que não existe | Vê a página "Página não encontrada", com um botão de volta ao início. | Nenhum | SITE | No app não há endereços para digitar. | em ajuste (correção visual aberta) |

## 3. Ideias que só o app consegue fazer

São sugestões para conversar, sem compromisso. Nenhuma foi aprovada por Daniel. As que já aparecem em [Visão e escopo](Visao_e_Escopo.md) como expansão possível estão indicadas.

| Ideia | O que a pessoa ganha | Observação |
| --- | --- | --- |
| Quadrinho na tela inicial do celular (widget) | Vê a última mamada ou a sessão em andamento sem abrir o app. | Sugestão. Já listada em Visão e escopo como expansão possível. |
| Entrar com a digital ou o rosto | Abre o app sem digitar a senha. | Sugestão. |
| Foto do bebê e anexos | Guarda uma foto junto da nota ou do registro. | Sugestão. "Anexos e fotos" já está em Visão e escopo como expansão possível. Reconhecer coisas pela câmera está fora do produto inicial. |
| Atalho no ícone do app | Pressiona o ícone e já inicia uma mamada ou um sono. | Sugestão. |
| Compartilhar pelo menu do celular | Manda o convite da família ou o arquivo de dados pelo WhatsApp, e-mail etc., direto do menu de compartilhar. | Sugestão. |
| Link que abre direto no app | O link do convite ou de troca de senha abre no app, e não no navegador. | Sugestão. |
| Letra do tamanho que o celular usa | O app segue o tamanho de letra escolhido nas configurações do aparelho. | Sugestão; o site já é testado com letra em dobro. |
| Barra de abas no rodapé | Troca de tela pela barra embaixo, como na maioria dos apps. | Daniel decidiu em 17/11 que ela só será definida quando o app for feito. No site não haverá barra desse tipo. |

## 4. Espaço para o dono do site

Esta tabela é para o dono do site acrescentar o que ele quer que o produto tenha, principalmente no app. Escreva uma ideia por linha, com palavras do dia a dia; não precisa saber se é fácil ou difícil. A equipe confere se a ideia já está nas tabelas acima, marca SITE, APP ou AMBOS e leva a Daniel, que decide o que entra e quando.

| Funcionalidade | Para quem | Por que é importante | Prioridade (alta/média/baixa) | Observações |
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

## 5. Decisões em aberto

Só as que já estão registradas como pendentes de Daniel, em [Pendências](../00_Inicio/PENDENCIAS.md) e em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

**Antes de publicar o site (respondido por Daniel em 17/11/2026):**

1. **Entrar com Google.** Decidido: por enquanto o site entra só com e-mail e senha.
2. **Texto final da Política de privacidade e dos Termos.** Decidido: o líder do projeto escreve textos simples, próprios de uma demonstração completa, e preenche os itens "a definir" com a melhor escolha.
3. **Confirmação de e-mail ao criar conta.** Decidido: ligar.
4. **Aparecer nas buscas do Google.** Decidido: o site fica escondido das buscas. A entrega é o link direto, provavelmente no GitHub Pages.
5. **Segurança das contas técnicas.** Decidido: como é uma demonstração, não é preciso configurar mais nada no painel do banco. Segredos continuam fora do repositório.
6. **Publicar.** Decidido: quando todas as páginas estiverem aceitas, o líder do projeto publica no GitHub. Depois disso, cada correção é atualizar e publicar de novo.

**Sobre o produto:**

7. **Público e idade mínima.** O site sai com todas as funções, mas o público e a idade mínima de quem usa continuam abertos. A proposta registrada é bebês de 0 a 12 meses, Brasil em português e adultos de 18 anos ou mais.
8. **Pessoas para conteúdo, moderação e jurídico.** Falta definir quem revisa o conteúdo de desenvolvimento (por isso aparece "Revisão profissional: pendente"), quem modera a comunidade e quem dá a consultoria de proteção de dados.
9. **Como o produto se paga.** Em aberto. Já está registrado que não haverá anúncio direcionado com dados da rotina do bebê.

**Para quando o app for feito:**

10. **Quem publica nas lojas.** Pessoa jurídica ou física, e a abertura das contas na loja da Apple e na do Google.
11. **A tecnologia do app.** Foi adiada para quando o app começar. Se o cronômetro na tela bloqueada ou a proteção dos dados no aparelho não funcionarem com o caminho escolhido no ADR-009, essa escolha volta para a mesa.

## Limites desta nota

- A situação de cada item vem da versão do site conferida em 17/11/2026. Ela não diz nada sobre o visual final nem sobre o site publicado, que ainda não existe.
- "Cada família vê só o que é dela" ficou "a conferir": é uma regra do servidor que as telas não mostram.
- As colunas "Como fica no app" descrevem planos e sugestões. Nada do app foi construído.
