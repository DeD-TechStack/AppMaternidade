---
tipo: ficha-repositorio
status: rascunho
responsavel: Hermes (subagente Baby Buddy)
revisado_em: 2026-10-22
repositorio: https://github.com/babybuddy/babybuddy
branch: master
commit: 09629cf633cf3a2059a21ade4cea7ea4d846422f
licenca_raiz: BSD-2-Clause
fontes_principais:
  - https://github.com/babybuddy/babybuddy/tree/09629cf633cf3a2059a21ade4cea7ea4d846422f
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/LICENSE
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js
  - https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md
  - ../../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md
---

# Baby Buddy

Ficha de repositório de referência da APP-001. As marcas seguem as [Convenções do cofre](../../00_Inicio/Convencoes.md):

- **[EXEC]**: observado na execução local de 22/10/2026 (Windows 11, Python 3.12.10, SQLite, dados fictícios).
- **[CÓDIGO]**: confirmado no commit `09629cf`, com permalink e linhas.
- **[DOC]**: declarado no README ou na documentação do próprio repositório.
- **[HIP]**: hipótese.

As evidências brutas estão em [09_Evidencias/Execucao_Referencias/Baby_Buddy](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md). Os códigos B, C e D remetem aos passos funcionais do log 03. "Log 04" a "log 08" remetem aos arquivos de mesmo número na pasta. O log 03, o log 06 e o roteiro `api_tests.sh` também registram testes de acesso da primeira rodada. Por isso, ficam fora do Git até a decisão D7 ([Decisões para Daniel](../../07_Roadmap/Decisoes_para_Daniel.md)), e esta ficha descreve autorização só pela leitura do código (revisão do coordenador, 22/10/2026 por volta das 05:35).

Nenhum trecho de código do Baby Buddy foi copiado para o AppMaternidade.

## Resumo

- O Baby Buddy é um aplicativo web Django pensado para uma instalação por casa. Não existe entidade família: toda criança e todo registro ficam visíveis para qualquer usuário que tenha a permissão daquele tipo de registro. Isso é coerente com o aviso da documentação de que um cuidador tem acesso a todas as crianças da instância [DOC], mas não serve para um produto com várias famílias [CÓDIGO].
- As permissões valem por tipo de registro, nunca por objeto, criança ou família. O perfil "padrão" é criado como superusuário [CÓDIGO].
- Os registros não guardam autor, data de criação ou alteração, nem versão. Uma edição feita por outro cuidador não deixa rastro [CÓDIGO][DOC][EXEC D-01/D-02].
- O timer tem uma boa ideia de base: o estado fica no servidor e a duração é calculada a partir do início. Os problemas:
  - parar um timer significa apagá-lo;
  - não existe fim, pausa nem registro de quem encerrou;
  - pela leitura do código, a checagem de dono cobre converter o timer e trocar o dono, mas não alterar o início nem reiniciar. Uma mudança dessas apagaria o tempo já contado sem deixar rastro [CÓDIGO]. Pergunta de auditoria, não vulnerabilidade demonstrada.
- As validações de domínio são boas regras para reaproveitar como ideia: nada no futuro, início antes do fim, no máximo 24 h calculadas em UTC e nenhuma sobreposição para a mesma criança e o mesmo tipo [CÓDIGO][EXEC C-01 a C-08]. No AppMaternidade, que funciona offline, só "fim antes do início" é recusado; as demais viram aviso ([Offline, seção 8](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)). Falta idempotência: reenviar uma troca de fralda cria um segundo registro [EXEC C-10/C-11].
- Fuso: o banco guarda tudo em UTC. O fuso do usuário só é aplicado em acesso por sessão. Por token, a API devolve as datas em UTC e decide se o sono foi soneca usando o horário UTC [EXEC C-09, log 04].
- Não há modo offline (o projeto não tem service worker) [CÓDIGO]. A revogação, por expiração ou desativação da conta, é conferida em cada requisição [CÓDIGO].
- 528 testes e mais 1 teste isolado passaram localmente [EXEC log 05]. A licença BSD-2-Clause permite reutilizar com aviso; a recomendação é aproveitar só os conceitos.

## Identificação

| Item | Valor | Classe |
| --- | --- | --- |
| URL | https://github.com/babybuddy/babybuddy | — |
| Branch | `master` | [EXEC] `git rev-parse --abbrev-ref HEAD` ([log 01](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/01_setup.log)) |
| SHA | `09629cf633cf3a2059a21ade4cea7ea4d846422f` | [EXEC] `git rev-parse HEAD` |
| Data do commit | 2026-10-12 11:42:30 -0700 ("fix(dashboard): apply the hide-data-age setting to the notes card") | [EXEC] `git log -1` |
| Comparação com a fotografia do pacote | Mesmo SHA do `03_REPOSITORIOS_REFERENCIA.md` do pacote da task (`tasks/hermes/APP-001-design-docs/`, fora do cofre); nenhum commit novo em `master` até o clone de 22/10/2026 02:56 | [EXEC] |
| Tamanho do histórico | 2013 commits em `master` | [EXEC] `git log --oneline` |
| Licença raiz | BSD-2-Clause, "Copyright (c) 2017 - 2022, Baby Buddy's Contributors" | [CÓDIGO] [LICENSE L1-L25](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/LICENSE#L1-L25) |
| Clone local | `C:/Projetos/AppMaternidade/_referencias/babybuddy` (fora do Git do produto) | [EXEC] |
| Data da consulta | 22/10/2026, America/Sao_Paulo | — |

## Stack confirmada

| Camada | Componente | Versão | Classe e fonte |
| --- | --- | --- | --- |
| Linguagem | Python | CI testa de 3.10 a 3.14; `runtime.txt` pede 3.11.9; execução feita com 3.12.10 | [CÓDIGO] [ci.yml L13-L14](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/.github/workflows/ci.yml#L13-L14); [EXEC] log 01 |
| Web | Django, com templates renderizados no servidor | 5.2.17 | [CÓDIGO] [requirements.txt](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/requirements.txt); [EXEC] `pip freeze` |
| API | Django REST Framework e django-filter | 3.18.1 e 25.2 | idem |
| Banco | SQLite por padrão; PostgreSQL e outros via `DATABASE_URL`/`DB_*` | psycopg2-binary 2.9.13 | [CÓDIGO] [base.py L114-L133](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L114-L133) |
| Autenticação | Sessão e token DRF (um token fixo por usuário); django-axes bloqueia após 5 falhas, por 1 h | axes 7.1.0 | [CÓDIGO] [base.py L346-L362](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L346-L362), [L376-L386](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L376-L386) |
| Configuração em banco | django-dbsettings (faixa de horário da soneca, entre outras) | 1.4.0 | [CÓDIGO] [site_settings.py L22-L38](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/site_settings.py#L22-L38) |
| Importação/exportação | django-import-export, dentro do admin | 4.4.1 | [CÓDIGO] [core/admin.py L5-L21](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/admin.py#L5-L21) |
| Gráficos | Plotly (Python) e plotly.js | 6.9.0 e ^4.1.0 | [CÓDIGO] requirements.txt, [package.json](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/package.json) |
| Front-end | Bootstrap 5.3, jQuery 3.7, Popper, Masonry e pulltorefreshjs; build com gulp (Node 24); os bundles compilados ficam versionados em `static/` | — | [CÓDIGO] package.json, [gulpfile.config.js L27-L71](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/gulpfile.config.js#L27-L71) |
| Arquivos | FileSystemStorage ou S3 (django-storages e boto3) | 1.14.6 e 1.43.97 | [CÓDIGO] [base.py L236-L277](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L236-L277) |
| Integrações | Webhooks assinados com fila de saída no banco (outbox). Servidor MCP e apps móveis ficam em outros repositórios | — | [CÓDIGO] `webhooks/`; [DOC] [README L54-L78](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/README.md#L54-L78) |

## Fluxos analisados

1. Registro de período (sono e tummy time) pela API, com validações e fuso: [EXEC] C-01 a C-09 e log 04; [CÓDIGO].
2. Timer: iniciar, ver como outro usuário, alterar, reiniciar, converter em registro e converter em paralelo: [EXEC] B-01 a B-17; [CÓDIGO] modelo, serializer e `timer.js`.
3. Vários usuários: perfis padrão, cuidador (`caregiver`) e somente leitura, com uma "outra família" na mesma instalação: [EXEC] A-01 a A-10 e D-01 a D-03.
4. Revogação: expiração de acesso e desativação da conta, usando o mesmo token: [EXEC] F-01 a F-08.
5. Anexo (imagem de uma nota) e acesso à URL do arquivo sem credencial: [EXEC] E-01 a E-03.
6. Histórico, linha do tempo, painel e relatórios: [CÓDIGO] (sem abrir no navegador).
7. Exportação/importação e webhooks: [CÓDIGO][DOC] (não executados).

## Achados por tema

### Modelo de domínio

- **Sem família, dono ou vínculo.** `Child` tem nome, data e hora de nascimento, data prevista do parto, slug e foto; não há chave estrangeira para usuário ou grupo [CÓDIGO [core/models.py L197-L266](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L197-L266)]. O slug é único na instalação inteira [CÓDIGO [L215-L222](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L215-L222)]. Ao cadastrar uma segunda criança chamada "Ana Exemplo", a API respondeu HTTP 500 `UNIQUE constraint failed: core_child.slug` [EXEC log 08].
- **Tipos de registro**:
  - troca de fralda, temperatura e medicação são instantâneos; a medicação tem intervalo até a próxima dose;
  - mamada, sono, tummy time e extração de leite têm início, fim e duração;
  - peso, altura, perímetro cefálico e IMC são registrados por data;
  - notas aceitam imagem opcional;
  - qualquer registro pode receber tags.

  [CÓDIGO [L269-L887](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L269-L887)]
- **Sem autoria nem histórico.** Nenhum modelo de registro tem usuário, `created_at`, `updated_at`, versão ou exclusão lógica. O único modelo ligado a um usuário é `Timer` [CÓDIGO [L643-L665](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L643-L665)]. A documentação confirma: "Baby Buddy does not record which user created an entry" [DOC [managing-users.md L71-L76](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L71-L76)]. A cuidadora_b editou o sono criado por resp_a, e a resposta não traz autor nem data de alteração [EXEC D-01/D-02].
- **Timer.** Guarda início, usuário, nome e, opcionalmente, a criança. O campo `active` não é usado de fato, e `stop()` apaga a linha [CÓDIGO [L643-L718](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L643-L718)].
- **Tummy time.** É um período com `milestone` (texto livre) e notas. Não há catálogo de atividades, faixa etária nem conteúdo educativo [CÓDIGO [L721-L767](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L721-L767)].
- **Soneca calculada.** Quando o campo `Sleep.nap` não é enviado, o sistema marca como soneca o sono que começa entre 06:00 e 18:00 no horário local (faixa configurável) [CÓDIGO [L593-L602](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L593-L602)].
- **Percentis de crescimento.** São carregados de arquivos CSV nas migrações, sem fonte declarada no repositório [CÓDIGO `core/migrations/*_percentile_*.csv`]. As colunas L, M e S sugerem as tabelas da OMS [HIP].

### Validações

- **Nada no futuro.** `validate_time` recusa registros com horário futuro pelo relógio do servidor, sem tolerância [CÓDIGO [L89-L99](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L89-L99)]. A API respondeu 400 "Date/time can not be in the future." [EXEC C-05]. Com o relógio do aparelho adiantado, um registro feito "agora" seria recusado [HIP].
- **Início, fim e duração.** `validate_duration` exige início antes do fim e duração de até 24 h. O cálculo é feito em UTC, o que evita erro na mudança de horário de verão [CÓDIGO [L35-L51](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L35-L51); [core/utils.py L72-L79](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/utils.py#L72-L79)] [EXEC C-06, C-07].
- **Sobreposição.** `validate_unique_period` recusa um período que se sobrepõe a outro do mesmo tipo e da mesma criança [CÓDIGO [L58-L86](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L58-L86)]. Na execução, o período sobreposto foi recusado (C-03), e o mesmo período foi aceito para crianças diferentes (C-04 e C-04b). A regra existe só na aplicação; o banco não a garante [CÓDIGO]. A mensagem de erro inclui HTML (`<a href=...>`) marcado como seguro, que aparece também na resposta JSON da API [EXEC C-02].
- **Datas antes do nascimento** são aceitas. Um sono em 15/10 foi gravado para uma criança nascida em 17/10 [EXEC C-04].
- **Mesmas regras na web e na API.** O serializer monta a instância e chama `clean()`, inclusive em PATCH parcial [CÓDIGO [api/serializers.py L29-L39](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L29-L39)]. É um bom padrão: uma única regra vale para todos os canais.
- **Sem idempotência.** O cliente não envia identificador de operação, e os IDs são inteiros sequenciais criados pelo servidor [CÓDIGO [base.py L397](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L397)]. Reenviar a mesma troca de fralda criou dois registros, 110 e 111 [EXEC C-10 a C-12]. Reenviar o mesmo sono devolveu 400 por sobreposição em vez do registro já existente [EXEC C-02].

### Autorização e isolamento

- **Permissão por tipo de registro, não por objeto.** `BabyBuddyDjangoModelPermissions` associa cada método HTTP a uma permissão do modelo: GET → view, POST → add, PATCH → change, DELETE → delete e OPTIONS → add. PUT fica de fora [CÓDIGO [api/permissions.py L5-L14](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py#L5-L14)]. Todos os viewsets de registro partem de `objects.all()`, sem filtro por usuário [CÓDIGO [api/views.py L18-L167](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L18-L167)]. O campo `child` aceita qualquer criança cadastrada [CÓDIGO [serializers.py L27](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L27), [L47-L52](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L47-L52)].
- **Perfis.**
  - Padrão: o comando de criação e o formulário gravam o usuário como `is_superuser=True` [CÓDIGO [createuser.py L145-L157](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/management/commands/createuser.py#L145-L157); [babybuddy/forms.py L87-L90](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/forms.py#L87-L90)]. Salvar um usuário sem "caregiver" nem "read only" marcados torna a conta superusuário [DOC [managing-users.md L78-L83](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L78-L83)].
  - Cuidador (`caregiver`): pode ver, criar e alterar os registros de cuidado. Não pode excluir, não acessa extração de leite nem medidas de crescimento e não administra nada [CÓDIGO [core/apps.py L6-L40](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/apps.py#L6-L40), [L80-L87](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/apps.py#L80-L87)].
  - Somente leitura (`read_only`): pode ver todos os tipos [CÓDIGO [L71-L77](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/apps.py#L71-L77)].
  - Permissões só podem ser acrescentadas, nunca retiradas de um usuário individualmente [DOC [L44-L58](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L44-L58)].
- **Consequência do desenho.** Qualquer conta com a permissão de um tipo de registro alcança esse tipo em todas as crianças da instalação [CÓDIGO]. Os resultados da execução de acesso da primeira rodada ficam fora do Git (D7).
- **Anexos.** Com DEBUG ligado, o próprio Django serve `/media/` sem conferir permissão [CÓDIGO [babybuddy/urls.py L60-L61](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/urls.py#L60-L61)]. Em produção, o comportamento depende do servidor web configurado [HIP]. Pergunta de auditoria, não vulnerabilidade demonstrada: como os anexos ficam protegidos numa instalação exposta à internet?
- **Credenciais.**
  - Cada usuário tem um único token DRF fixo, guardado em texto como chave primária [CÓDIGO [babybuddy/models.py L145-L153](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/models.py#L145-L153); `rest_framework/authtoken/models.py` L12 do DRF 3.18.1 instalado no venv].
  - A tela "Add a device" coloca esse token num QR code de login [DOC [login-qr-code.md L16-L29](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/login-qr-code.md#L16-L29)].
  - O `migrate` cria o usuário `admin`, com senha `admin`, quando não existe superusuário [CÓDIGO [migrate.py L9-L19](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/management/commands/migrate.py#L9-L19)].
- **Revogação.** A data de expiração (`access_expires`) e a desativação da conta (`is_active`) são conferidas em toda requisição, por token [CÓDIGO [api/authentication.py L7-L16](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/authentication.py#L7-L16)] e por sessão [CÓDIGO [middleware.py L242-L261](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/middleware.py#L242-L261)].

  A rota `/api/caregivers/` só alcança contas de cuidador [CÓDIGO [api/views.py L229-L238](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L229-L238)].
- **O que muda num produto com várias famílias independentes.** Seria preciso:
  - criar a entidade família e o vínculo de cada usuário, com papel por família;
  - fazer toda consulta partir do vínculo ativo do usuário;
  - conferir, a cada escrita, se a criança pertence à família;
  - checar permissão por objeto;
  - garantir unicidade dentro da família, não da instalação;
  - servir arquivos por URL assinada e de vida curta;
  - separar webhooks e notificações por família;
  - testar que uma família não alcança dados de outra.

  Os detalhes estão em "Adaptações necessárias", mais abaixo.

### Timers

- **O estado fica no servidor e a duração é calculada.** O timer guarda só o início; o servidor calcula a duração como "agora − início" [CÓDIGO [core/models.py L694-L695](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L694-L695)]. Por isso o timer sobrevive ao fechamento do navegador e todos o veem [CÓDIGO]. O menu e o painel mostram todos os timers da instalação [CÓDIGO [core/templatetags/timers.py L10-L27](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/templatetags/timers.py#L10-L27); [dashboard/templatetags/cards.py L819-L840](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/dashboard/templatetags/cards.py#L819-L840)].
- **Contador na tela.** O `timer.js` soma um segundo por vez com `setInterval(…, 1000)`. Quando a janela recebe o evento `focus`, ele consulta `GET /api/timers/<id>/` e corrige o mostrador [CÓDIGO [timer.js L17-L54](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js#L17-L54), [L80-L97](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/static_src/js/timer.js#L80-L97)]. O script não escuta `visibilitychange`, e o limite `new Date() - lastUpdate > 1` é de 1 ms. Ainda assim, o princípio está certo para Q-08: o valor exibido vem do servidor, não de um contador que precisa ficar rodando.
- **Conversão em registro.** Quando o POST de mamada, sono, tummy time ou extração envia o campo `timer`, o servidor usa o início do timer e o próprio relógio como fim, ignorando os valores enviados. O timer é apagado na mesma transação, com `select_for_update` [CÓDIGO [api/serializers.py L75-L126](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L75-L126)]. Na execução, uma sessão de tummy time de 4,9 s foi criada e o timer passou a responder 404 [EXEC B-09/B-10].
- **Dono do timer.** Para converter o timer em registro (o que o apaga) ou trocar o dono, é preciso ser o dono ou ter a permissão `delete_timer` [CÓDIGO [core/models.py L706-L711](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/models.py#L706-L711); [serializers.py L303-L339](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L303-L339)]. Pela leitura do código, essa checagem não cobre alterar o início nem reiniciar: a permissão `change_timer` basta para as duas ações, e o botão "restart" da web faz o mesmo [CÓDIGO [core/views.py L580-L591](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/views.py#L580-L591)]. Como o registro não guarda autoria, a mudança não deixaria rastro. Pergunta de auditoria, não vulnerabilidade demonstrada.
- **Q-03 na prática.** Se A inicia o timer e B, cuidador, quer encerrá-lo, B não consegue sem `delete_timer`. Se tiver essa permissão, o registro criado não guarda quem iniciou nem quem encerrou [CÓDIGO][DOC [L60-L64](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/user-guide/managing-users.md#L60-L64)].
- **Concorrência.** Seis conversões simultâneas do mesmo timer resultaram em:
  - 1 registro criado;
  - 1 recusa por sobreposição;
  - 4 recusas porque o timer já não existia;
  - nenhuma duplicata.

  [EXEC B-13/B-14] Na rodada exploratória, a mesma corrida gerou um HTTP 500 `database is locked` do SQLite [EXEC [log 03b](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/03b_corrida_rodada_exploratoria.log)]. No SQLite, `select_for_update` não tem efeito. A proteção veio da exclusão do timer e da validação de sobreposição, e nenhuma das duas é uma restrição do banco [CÓDIGO]. O comportamento em PostgreSQL não foi testado [HIP].
- **Defeito na API.** O filtro de timers declara campos `end*`, e a ordenação aceita `end` e `duration`, campos que não existem no modelo. As consultas `?end_min=` e `?ordering=end` devolvem HTTP 500 FieldError [EXEC B-16/B-17; CÓDIGO [api/filters.py L105-L108](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/filters.py#L105-L108), [api/views.py L140-L145](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L140-L145)].

### Persistência e offline

- **Sem modo offline.** A aplicação web é renderizada no servidor, e cada registro é enviado na hora num POST. Não há service worker nem cache de dados: a busca por `serviceWorker` e `sw.js` no repositório não encontrou nada. O [site.webmanifest](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/static_src/root/site.webmanifest#L1-L47) só define a instalação e atalhos para iniciar timer e registrar troca, mamada, extração, sono e tummy time [CÓDIGO].
- **Q-01 e Q-02 ficam sem resposta.** Não há fila local, identificador de operação nem estado "pendente". Os apps móveis companheiros ficam em outros repositórios e não foram analisados [DOC [README L75-L78](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/README.md#L75-L78)].
- **Só o timer persiste.** É a única atividade em andamento que sobrevive ao fechamento do app, porque está gravada no servidor [CÓDIGO].

### UI de registro e histórico

- **Registro rápido.**
  - O timer é iniciado com um único POST pelo menu e já fica ligado à criança quando há só uma [CÓDIGO [core/views.py L559-L577](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/views.py#L559-L577)].
  - Os formulários vêm pré-preenchidos: a criança, quando há só uma; o tipo e o método da última mamada (exceto o lado do peito); e a soneca, pelo horário [CÓDIGO [core/forms.py L37-L84](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/forms.py#L37-L84)].
  - O manifesto oferece atalhos de ação [CÓDIGO].
- **Painel.** Há cartões por tipo de registro: último registro, registros recentes, total de tummy time do dia, sonecas do dia e estatísticas [CÓDIGO [cards.py L41-L919](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/dashboard/templatetags/cards.py#L41-L919)].
- **Linha do tempo diária.** Mostra eventos de "começou" e "terminou". Um sono que atravessa a meia-noite aparece como início num dia e fim no outro. Quando dois eventos têm o mesmo horário, "terminou" vem antes de "começou". Tipos que o usuário não pode ver são omitidos [CÓDIGO [core/timeline.py L22-L65](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/timeline.py#L22-L65), [L112-L149](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/timeline.py#L112-L149)].
- **Limite.** A interface não foi aberta em navegador nesta análise.

### Relatórios

- São 19 gráficos Plotly por criança, cobrindo fraldas, mamadas, sono, tummy time, extração, medicação, peso, altura, percentis e temperatura [CÓDIGO `reports/graphs/`].
- O total diário de sono divide entre os dois dias o sono que atravessa a meia-noite, no fuso ativo [CÓDIGO [sleep_totals.py L13-L45](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/reports/graphs/sleep_totals.py#L13-L45)].
- O dia de cada registro não segue uma regra única. O relatório de tummy time agrupa pela data de **início** [CÓDIGO [tummytime_duration.py L21-L27](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/reports/graphs/tummytime_duration.py#L21-L27)], e o cartão do dia agrupa pela data de **fim** [CÓDIGO [cards.py L866-L879](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/dashboard/templatetags/cards.py#L866-L879)]. Lição para Q-09: definir uma única regra para decidir a que dia um registro pertence.

### API

- **Estrutura.** A API REST usa DRF, com paginação por limit/offset (100 itens), filtros por criança e por intervalo de datas, ordenação e esquema OpenAPI versionado no repositório [CÓDIGO [base.py L346-L362](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L346-L362); `api/filters.py`; `openapi-schema.yml`]. Alterações só por PATCH, porque o PUT não está no mapa de permissões [CÓDIGO [permissions.py L11](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/permissions.py#L11)].
- **Raiz da API.** A documentação diz que `/api` não exige autenticação [DOC [api.md L6-L9](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/api.md#L6-L9)]. Pergunta de auditoria, não vulnerabilidade demonstrada: a documentação ainda corresponde ao código?
- **Rota de perfil.** `/api/profile` só existe sem a barra final; com a barra, a resposta é 404 [CÓDIGO [api/urls.py L67](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/urls.py#L67)].
- **Datas e fuso.** O banco grava em UTC (`USE_TZ=True`, `TIME_ZONE="UTC"`) [CÓDIGO [base.py L179-L181](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L179-L181)]. O fuso do usuário é ativado por um middleware que roda antes da autenticação do DRF, por isso só vale para sessão [CÓDIGO [middleware.py L56-L73](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/middleware.py#L56-L73)]. Com o mesmo usuário, configurado no fuso America/Sao_Paulo [EXEC C-09, [log 04](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/04_fuso_sessao_vs_token.log)]:
  - **por token**, as datas voltaram em UTC (`Z`), e um sono às 16:30 locais foi gravado com `nap=false`;
  - **por sessão**, as datas voltaram em `-03:00`, e um sono às 15:00 foi gravado com `nap=true`;
  - **recalculada a regra para o sono das 16:30**, o resultado é `false` em UTC e `true` em São Paulo.
- **Webhooks.**
  - o evento é gravado numa tabela de saída na mesma transação do registro (outbox);
  - cada evento tem um `event_id` UUID, que permite ao receptor descartar repetições;
  - há até 5 tentativas, com espera crescendo exponencialmente;
  - a assinatura é HMAC-SHA256 sobre o timestamp e o corpo;
  - o corpo não carrega o conteúdo do registro.

  [CÓDIGO [webhooks/models.py L61-L119](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/webhooks/models.py#L61-L119), [signals.py L35-L83](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/webhooks/signals.py#L35-L83), [delivery.py L124-L160](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/webhooks/delivery.py#L124-L160); DOC [webhooks.md L9-L31](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/configuration/webhooks.md#L9-L31)]
- **API de cuidadores.** Cria contas de cuidador e devolve a chave de acesso uma única vez. Não há DELETE: o acesso é retirado com `is_active=false` ou com uma data em `access_expires` [CÓDIGO [api/views.py L210-L252](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/views.py#L210-L252); [serializers.py L420-L479](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/api/serializers.py#L420-L479)].

### Testes

- **Suíte executada.** 528 testes passaram em 67,5 s (`--parallel 4 --exclude-tag isolate`), e o teste isolado de redefinição de senha também passou [EXEC [log 05](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/05_testes.log)]. A CI roda Python de 3.10 a 3.14, mais o lint via gulp [CÓDIGO [ci.yml L13-L23](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/.github/workflows/ci.yml#L13-L23)].
- **Cobertura relevante.**
  - Há testes de dono do timer, de conversão com timer apagado ou reatribuído no meio do caminho e de rollback [CÓDIGO [tests_entry_permissions.py L65-L247](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/tests/tests_entry_permissions.py#L65-L247)].
  - Não encontrei teste que impeça quem não é dono de reiniciar o timer de outra pessoa (busca por "restart" nos testes) [CÓDIGO].
  - Não há teste de isolamento entre famílias, porque o conceito de família não existe.
- **Não executados.** `gulp lint`, medição de cobertura e testes de front-end.

### Configuração e i18n

- **`.env` em diretórios superiores.** O `load_dotenv(find_dotenv())` sobe pelos diretórios até achar um `.env` [CÓDIGO [base.py L25](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L25); [manage.py L9](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/manage.py#L9)]. Para evitar isso, foi criado um `.env` fictício dentro do clone [EXEC log 01].
- **Idiomas.** São 28, incluindo pt-BR, escolhidos por usuário [CÓDIGO [base.py L194-L223](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/settings/base.py#L194-L223); [middleware.py L26-L53](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/middleware.py#L26-L53)]. O pt-BR tem 506 textos: 469 traduzidos, 37 vazios e 70 marcados como "fuzzy" (tradução pendente de revisão). "Tummy Time" fica em inglês [EXEC [log 07](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/07_licencas.log); CÓDIGO [django.po L384-L385](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/locale/pt_BR/LC_MESSAGES/django.po#L384-L385)].
- **Importação e exportação.** Ficam só no admin, para quem tem acesso de staff, um tipo de registro por vez, em CSV, XLSX e outros formatos. Não há exportação de uma família inteira nem exclusão de uma conta com seus dados [DOC [import-export.md L6-L40](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/import-export.md#L6-L40); CÓDIGO [core/admin.py L11-L58](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/core/admin.py#L11-L58)].

## Execução

Ambiente:

- Windows 11, git-bash;
- Python 3.12.10 num venv dentro do clone;
- SQLite descartável;
- `manage.py runserver` em 127.0.0.1:38231, com settings de desenvolvimento (DEBUG=True);
- dados fictícios gerados por `manage.py fake` (Faker) e quatro usuários fictícios:
  - resp_a: padrão, superusuário, fuso America/Sao_Paulo;
  - cuidadora_b: cuidador;
  - avo_c: somente leitura;
  - uma quarta conta de cuidador.

| Horário (22/10/2026, -03:00) | Etapa | Comando principal | Resultado |
| --- | --- | --- | --- |
| 02:56 | Clone | `git clone https://github.com/babybuddy/babybuddy.git` | `master` no commit 09629cf [EXEC] |
| 03:01–03:05 | venv e dependências | `py -3.12 -m venv .venv`; `.venv/Scripts/python.exe -m pip install -r requirements.txt` | 47 pacotes instalados, exit 0 ([log 01](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/01_setup.log)) |
| 03:06–03:16 | Rodada exploratória | `migrate`, `fake`, criação de usuários, `runserver`, roteiro de chamadas | Descartada por dois erros do meu roteiro: a rota `/api/profile` com barra final e caminhos no formato do git-bash (`/c/...`) passados ao curl nativo. Mostrou os mesmos comportamentos da rodada final ([log 03b](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/03b_corrida_rodada_exploratoria.log)) |
| 03:17 | Impedimento | `manage.py migrate` | Falhou com `ValueError: No support for 'file'` no dj_database_url. O shell do Hermes é compartilhado, e outro subagente tinha definido `DATABASE_URL` para o Prisma. Contornado com `env -u DATABASE_URL -u DB_* …` em cada comando, sem mexer no ambiente do outro agente |
| 03:18 | Banco novo | `migrate`; `fake --children 2 --days 5`; `setup_users.py` | OK: 2 crianças, 53 sonos, 52 mamadas, 108 trocas de fralda, 62 sessões de tummy time ([log 02](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/02_migrate_fake.log)) |
| 03:19–03:21 | API | Roteiro próprio (curl) | Validações, timers e edição (códigos B, C e D), além de testes de acesso. Log 03 fora do Git (D7) |
| 03:21 | Sessão × token | `session_tz.py` via `manage.py shell` | [log 04](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/04_fuso_sessao_vs_token.log) |
| 03:22–03:25 | Testes | `manage.py test --settings=babybuddy.settings.test --parallel 4 --exclude-tag isolate` | 528 testes OK; teste isolado, 1 OK ([log 05](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/05_testes.log)) |
| 03:27 | Acesso sem credencial | Roteiro próprio (curl) | Log 06 fora do Git (D7) |
| 03:27 | Encerramento | kill do processo do runserver | Porta 38231 livre, conferida com netstat |
| 03:30–03:31 | Licenças e nome repetido | `dep_licenses.py`, `po_stats.py`, Client em `manage.py shell` | [log 07](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/07_licencas.log) e [log 08](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/08_nome_repetido.log) |

Cuidados tomados:

- Os tokens ficaram só no scratch do Hermes; nos logs aparecem como `<resp_a>` e equivalentes.
- As páginas de erro do modo DEBUG, que expõem as variáveis de ambiente do processo, foram reduzidas a uma linha de resumo antes de entrar no cofre.
- Os roteiros estão copiados na subpasta `roteiros/` das evidências, listada no [README das evidências](../../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md).
- Não foi criado nenhum container Docker.
- Processos encerrados: runserver PID 14520 (03:09–03:16), runserver PID 20108 (03:19–03:27) e a suíte de testes (03:22–03:25).

## Licenças por material

| Material | Licença ou situação | Classe | Uso no AppMaternidade |
| --- | --- | --- | --- |
| Código do Baby Buddy (Python, JS, templates) | BSD-2-Clause | [CÓDIGO] LICENSE | Reuso permitido com aviso; recomendação: usar só os conceitos |
| Dependências Python | BSD-3-Clause: Django, DRF, django-imagekit, python-dotenv, django-storages, django-qr-code. BSD: django-filter, django-taggit, dj-database-url, pilkit, django-dbsettings, segno, django-import-export. MIT: plotly, whitenoise, gunicorn, Faker, django-axes, django-cors-headers, django-widget-tweaks, PyYAML, tablib, inflection, ipware. MIT-CMU: Pillow. Apache-2.0: boto3, tzdata. BSD-3-Clause OR Apache-2.0: uritemplate. LGPL com exceções: psycopg2-binary | [EXEC] metadados do venv (log 07) | Só importam se a stack for Python; cada uma tem os próprios avisos |
| Bundles de front-end versionados (`static/babybuddy/js/vendor.js`, `graph.js`) | jQuery, Popper, Masonry, plotly.js e pulltorefreshjs minificados sem nenhum aviso de licença; `app.css` mantém o aviso MIT do Bootstrap | [EXEC] log 07; licenças das bibliotecas não conferidas [HIP: MIT] | Não copiar os bundles; se precisar de alguma biblioteca, obtê-la da origem com os avisos |
| Ícones (fonte fontello "babybuddy") | Font Awesome, MFG Labs e Entypo, sob SIL OFL segundo o LICENSE.txt. A entrada do Font Awesome está sem URL | [CÓDIGO] [fontello/LICENSE.txt L1-L30](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/babybuddy/static_src/fontello/LICENSE.txt#L1-L30) | Não reutilizar a fonte montada |
| Logo, nome "Baby Buddy", favicons, capturas e vídeos da documentação | Sem licença própria; nome e logo funcionam como marca | [CÓDIGO] (nenhuma licença específica encontrada); [HIP] tratar como marca | Não usar |
| Traduções (28 idiomas; pt-BR feito via POEditor) | Sem termo específico; presume-se a BSD-2 do repositório | [HIP] | Não copiar; o pt-BR está incompleto e tem textos "fuzzy" |
| Percentis de peso e altura (CSV) | Fonte não declarada no repositório | [CÓDIGO] / [HIP] OMS | Se precisar, usar a fonte oficial com os termos dela |
| Textos da documentação | Estão no repositório BSD-2, sem licença separada | [HIP] | Não copiar |

## O que aproveitar como conceito

1. **Timer gravado no servidor, com duração calculada a partir do início.** A tela recalcula o tempo ao voltar o foco; nada depende de um contador rodando sem parar (Q-08).
2. **Conversão do timer em registro numa única transação.** O timer é bloqueado e apagado na mesma operação, e há uma regra clara sobre quem pode fazer a conversão.
3. **Regras de domínio no modelo, reaproveitadas pela API.** Nada no futuro, início antes do fim, no máximo 24 h calculadas em UTC e nenhuma sobreposição para a mesma criança e o mesmo tipo, cada regra coberta por testes. No AppMaternidade, offline, elas viram aviso, exceto "fim antes do início" (Offline, seção 8).
4. **Durações sempre em UTC, exibição no fuso do usuário.** O sono que atravessa a meia-noite é dividido entre os dois dias nos totais.
5. **Revogação conferida em toda requisição.** A data de expiração e a desativação da conta podem ser desfeitas. Há conta de cuidador temporário com data de expiração.
6. **Papéis de cuidador prontos para uso.** O cuidador não exclui registros nem acessa dados administrativos ou medidas de crescimento; existe também o perfil somente leitura.
7. **Fila de saída de eventos (outbox).** O evento é gravado junto com o dado; um UUID permite descartar repetições; o reenvio tem espera exponencial; a mensagem é assinada e não carrega conteúdo sensível. Serve de base para notificações e sincronização (Q-06, Q-10).
8. **Registro rápido.** Atalhos para iniciar timer e registrar, pré-preenchimento a partir do último registro e criança escolhida automaticamente quando há só uma.

## O que pode ser reutilizado conforme a licença

- **O que a BSD-2-Clause exige.** Ela permite copiar e adaptar com duas condições: o código-fonte redistribuído deve manter o aviso de copyright, a lista de condições e o aviso de isenção de garantia; e, quando o app for distribuído em forma binária, esses mesmos textos devem aparecer na documentação ou em outro material que acompanhe o app. Num app de loja, isso costuma ser uma tela de licenças de terceiros [CÓDIGO LICENSE]. A licença não autoriza o uso do nome nem do logo.
- **Candidatos, se a stack fosse Python/Django:**
  - `validate_duration` e `timezone_aware_duration`;
  - `validate_unique_period`;
  - a lógica de conversão do timer;
  - a fila de saída dos webhooks.

  Como a stack ainda está em aberto e o modelo de autorização precisa ser outro, a recomendação é **não copiar código** e reescrever as regras a partir desta ficha. Nada foi copiado.
- **Se algum trecho vier a ser reutilizado:**
  - registrar o arquivo, o commit e o permalink de origem;
  - incluir o texto da BSD-2 com a linha "Copyright (c) 2017 - 2022, Baby Buddy's Contributors" no repositório e na tela de licenças do app.

## Adaptações necessárias

- **Família e vínculo.** Criar as entidades família e vínculo usuário–família, com papel e estado (convidado, ativo, revogado), e ligar cada criança a uma família. Toda consulta parte do vínculo ativo do usuário. O servidor confere a autorização em toda escrita, inclusive na sincronização.
- **Unicidade e IDs.** A unicidade vale dentro da família; nada de slug global derivado do nome. Os registros feitos offline recebem um UUID gerado no aparelho.
- **Autoria e histórico.** Todo registro guarda:
  - quem criou e quem alterou;
  - o instante observado e o instante recebido pelo servidor;
  - uma versão;
  - uma marca de exclusão lógica (tombstone).
- **Idempotência.** Cada intenção do usuário recebe um identificador de operação; um reenvio devolve o resultado original (Q-02).
- **Sessão temporizada própria.**
  - Guarda início, fim e estado (em andamento, encerrada, descartada).
  - Registra quem iniciou, quem encerrou e por qual aparelho.
  - Encerrar não é o mesmo que apagar.
  - Alterar o início de uma sessão iniciada por outra pessoa exige papel específico e deixa rastro (Q-03).
- **Fuso.** Guardar o instante em UTC junto com o deslocamento ou fuso do registro. Definir uma regra única para o dia (início, fim ou divisão) e para a soneca, que não dependa do canal de acesso (token ou sessão) (Q-09).
- **Anexos.** Armazenamento privado por família, URLs assinadas de curta duração e nomes de arquivo aleatórios.
- **Convites.** Código de uso único e validade curta, nunca o token permanente dentro de um QR.
- **Comunidade.** Fica separada da rotina; o Baby Buddy não tem nada nessa área.
- **Exportação e exclusão por família,** fora do admin (Q-12).

## O que não reproduzir

- Perfil "padrão" com poderes de superusuário e conta `admin/admin` criada no `migrate`.
- Consultas globais e permissão apenas por tipo de registro.
- Token permanente usado como credencial de aparelho e colocado dentro de um QR.
- Arquivos servidos sem checar autorização e com o nome original.
- HTML dentro de mensagem de erro da API.
- Parar o timer apagando-o; permitir reiniciar ou alterar o timer de outra pessoa só com permissão de alteração.
- Sobreposição que bloqueia o registro e, sob concorrência, falha sem aviso claro (a corrida gerou HTTP 500 no SQLite). No AppMaternidade, a sobreposição gera aviso visível e não bloqueia (Offline, seção 8).
- Fuso que muda conforme o tipo de autenticação; telas diferentes usando regras diferentes para decidir o dia.
- Slug global derivado do nome da criança.

## Riscos e problemas encontrados

| # | Problema | Classe | Impacto se for copiado |
| --- | --- | --- | --- |
| R1 | Não há fronteira entre famílias: a permissão de cada tipo vale para todas as crianças da instalação | [CÓDIGO][DOC] | Vazamento entre famílias (Q-06) |
| R2 | Sem autoria e sem histórico de edição | [EXEC D-01/D-02][DOC] | Impossível saber quem registrou; conflitos passam despercebidos (Q-03, Q-04) |
| R3 | A checagem de dono não cobre alterar o início nem reiniciar o timer (pergunta de auditoria) | [CÓDIGO] | Duração perdida sem aviso |
| R4 | Sem idempotência | [EXEC C-10/C-11] | Registros duplicados quando o envio é repetido (Q-02) |
| R5 | Com DEBUG, arquivos servidos sem conferir permissão; em produção, depende do servidor (pergunta de auditoria) | [CÓDIGO][HIP] | Exposição de fotos (Q-06) |
| R6 | Fuso do usuário ignorado no acesso por token; soneca classificada pelo horário UTC | [EXEC C-09, log 04] | Histórico errado para quem usa app ou API |
| R7 | HTTP 500 em três situações: filtro/ordenação de timer, criança com nome repetido e "database is locked" no SQLite | [EXEC B-16/B-17, log 08, log 03b] | Falta de robustez |
| R8 | Superusuário como perfil padrão; conta admin/admin | [CÓDIGO] | Concessão acidental de privilégio total |
| R9 | Token fixo guardado em texto e exibido em QR | [CÓDIGO][DOC] | Para revogar é preciso desativar ou expirar a conta inteira; quem fotografa a tela obtém a chave [DOC [login-qr-code.md L86](https://github.com/babybuddy/babybuddy/blob/09629cf633cf3a2059a21ade4cea7ea4d846422f/docs/login-qr-code.md#L86)] |
| R10 | Bundles de front-end sem os avisos de licença | [EXEC log 07] | Risco de descumprir licenças se copiados |
| R11 | `find_dotenv` procura `.env` nos diretórios acima | [CÓDIGO] | Em ambiente compartilhado, pode carregar sem querer a configuração de outro projeto |

## Relação com os cenários Q-01 a Q-12

| Cenário | O que o Baby Buddy mostra | Classe | Lição para o AppMaternidade |
| --- | --- | --- | --- |
| Q-01 registro offline, fechar e reabrir | Não há modo offline; só o timer persiste, no servidor | [CÓDIGO] | Fila local persistente com estado visível terá de ser projetada do zero |
| Q-02 reenvio | Registro instantâneo duplica; período devolve 400 por sobreposição | [EXEC C-02, C-10/C-11] | ID de operação gerado no aparelho e resposta idempotente |
| Q-03 A inicia, B encerra | B não encerra sem `delete_timer`; se encerrar, a autoria se perde; a checagem de dono não cobre reiniciar | [CÓDIGO] | Sessão com "iniciada por" e "encerrada por" e regra explícita |
| Q-04 edição offline concorrente | O último PATCH prevalece, sem versão e sem aviso | [CÓDIGO][EXEC D-01] | Versão por registro e política de conflito visível |
| Q-05 revogação com aparelho offline | Revogação imediata em cada requisição online; não existe cache offline a revogar | [CÓDIGO] | Reavaliar operações na reconexão e dar validade ao cache local |
| Q-06 IDs e anexos de outra família | Sem família, a permissão vale para toda a instalação; com DEBUG, anexos servidos sem conferir permissão | [CÓDIGO] | Autorização por vínculo no servidor, URL assinada e testes de acesso negado |
| Q-07 comunidade | Não existe | [CÓDIGO] | Sem referência aqui |
| Q-08 cronômetro após suspensão | Duração calculada a partir do início gravado; a tela se corrige ao voltar o foco | [CÓDIGO timer.js] | Mesmo princípio, com estado local e no servidor |
| Q-09 fuso e meia-noite | UTC no banco e nas durações; sono dividido entre dias nos totais; regras de dia diferentes entre telas; fuso depende do canal | [CÓDIGO][EXEC C-01, C-09, log 04] | Regra única e fuso gravado junto com o evento |
| Q-10 notificação negada ou não recebida | Não há notificações; os webhooks são uma fila de saída assinada, sem conteúdo | [CÓDIGO][DOC] | Registrar e reconciliar não podem depender de notificação |
| Q-11 denúncia, bloqueio e moderação | Não existe | [CÓDIGO] | Sem referência |
| Q-12 exportar, excluir, backup | Exportação por tipo no admin (staff); sem exclusão por família; o backup é o banco inteiro da instalação | [DOC import-export.md][CÓDIGO] | Exportação e exclusão por família, incluindo anexos |

## Questões abertas

1. O AppMaternidade terá um papel de "cuidador temporário" com data de expiração, como o `access_expires`? Recomendação: sim, com a expiração no vínculo com a família, não na conta.
2. Quem pode alterar o início ou encerrar uma sessão iniciada por outro cuidador? Proposta: qualquer cuidador ativo pode encerrar; alterar o início exige ser quem iniciou ou ter papel de responsável; as duas ações registram autoria.
3. A que dia pertence um período que atravessa a meia-noite: dividido entre os dois dias, como nos totais de sono, ou atribuído ao dia do início?
4. Registros anteriores ao nascimento, ou feitos durante a gestação, devem ser aceitos? Hoje o Baby Buddy aceita sem aviso.
5. Como a conversão concorrente do timer se comporta em PostgreSQL, onde o `select_for_update` tem efeito? Não foi testado.
6. Os apps móveis companheiros (iOS e Android), mantidos em repositórios separados, têm algum modo offline? Não foram analisados.

## Limites desta análise

- **Ambiente.** A execução foi só local, com SQLite, settings de desenvolvimento (DEBUG=True) e `runserver`.
- **Não testado.** Gunicorn, PostgreSQL, S3, DEBUG=False, proxy reverso, entrega de webhooks, importação/exportação pelo admin e a interface no navegador. O acesso por sessão foi exercitado com `django.test.Client`.
- **Licenças do front-end.** As licenças das bibliotecas foram inferidas, não conferidas, porque o `node_modules` não foi instalado.
- **Validade.** Os achados de código valem para o commit `09629cf`; o projeto é ativo e pode mudar.
- **Natureza dos achados.** Não foi feita auditoria de segurança. Os pontos de risco são observações de projeto para o AppMaternidade, não um relatório de vulnerabilidades do Baby Buddy. A ausência de família parece ser uma premissa do projeto, uma instalação por casa [HIP], coerente com o aviso "A caregiver has access to every child on the instance" [DOC managing-users.md L71-L76].
