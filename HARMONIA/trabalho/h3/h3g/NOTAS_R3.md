# H-3g, rodada 3: lint verde em todo web/src e os pedidos comuns

`npm --prefix web run lint` sai com 0 nas duas ferramentas (ESLint `harmonia/classes-soltas` e stylelint `harmonia/valores-soltos`).

## PEDIDOS_COMUNS (HARMONIA/trabalho/h3/PEDIDOS_COMUNS.md): só há linhas do H-3e

`.oc/contrato/PEDIDOS_COMUNS.md` não existe neste worktree, e o arquivo de `HARMONIA/trabalho/h3/` só traz linhas do H-3e. As
linhas H-3a a H-3d e H-3f não puderam ser lidas aqui: ficam sem resposta nesta nota.

| Linha (arquivo) | Resposta |
|---|---|
| H-3e `site.css` `.cm-h1`, `.cm-h3`, `.cm-h4` | applied (rodada 2): titulo-1, titulo-3 e titulo-4, tamanho e entrelinha do mesmo nível. |
| H-3e `site.css` `.cm-area` | answered: a classe ainda é usada em `casca/Rodape.tsx:12` e `casca/MenuCelular.tsx:89` (e nas áreas de Desenvolvimento); não foi removida. |
| H-3e `PaginaDesenvolvimento.tsx:122,163` | answered: é tarefa do H-3f (abertura de Desenvolvimento dentro de Seção > QuadroLayout > Pilha); o arquivo não é desta rodada. |
| H-3e `index.css` `.rotina-*` em rem | applied (rodada 2): rem para o px igual, `font-size`/`line-height` do `semana-rotulo` para `pequeno`, respiro do link esticado `±9.5px`. Sobra uma exceção: o `.rotina-link-esticado` da madrugada, porque `alvosMadrugada.test.tsx` pina o texto em rem. |
| H-3e `py-3.5` (5 arquivos) | applied: virou `py-3` (12 px, empate para o menor). Cada linha de lista fica 4 px mais baixa. Não medido no navegador. |
| H-3e numerais (`CronometroSessao`, `CartaoSessao`, `ResumoDoDia`, `BotaoIniciarMamada`) | applied em parte: `CartaoSessao` (`text-[64px]`, `lg:text-[120px]`) e `ResumoDoDia` (`clamp(...cqi...)`) viraram exceções. `CronometroSessao` (`TAMANHO`) e `BotaoIniciarMamada:27-28` ficam fora do alcance da regra (a classe vem de constante ou variável sem nome de classe), então não precisam de exceção; fica anotado. |
| H-3e `DesdeQueVoceSaiu.tsx:103` | applied: duas exceções (`pl-[2.625rem]`, `lg:pl-14`), como o pedido já dizia. |
| H-3e `BarraRegistroRapido.tsx:129` (`pt-1`) | answered: a conferência é de navegador (`medir_h.js`, botões com 56 px de altura e 44 px de largura mínima); não rodei medida. |
| H-3e `AvisoDemonstracao.tsx:24` | applied: `text-sm` e `leading-snug` viraram `text-pequeno`. O pino em `avisoDemonstracao.test.tsx:172,180` (`text-sm`) não pôde ser editado nesta rodada (edição negada): o teste fica vermelho até trocar `'text-sm'` por `'text-pequeno'` na linha 180. |
| H-3e `SeletorBebe.tsx:86` (`max-w-md`) | answered: nenhum CSS redefine `--container-md` (busca em `web/src/**/*.css`), então `max-w-md` segue em 28 rem. |

## Capacidades compartilhadas (tarefa B)

- `Cartao`: aceita `ref` (prop, React 19) e `as="figure"`. Os sete elementos com `data-h="cartao"` próprio viraram `<Cartao>`:
  `CartaoSessao.tsx` (dois `section`), `CronometroSessao.tsx` (`section`), `PerguntaSessaoCurta.tsx` (`div`), `AvisoDeErro.tsx` (`div`;
  o tipo de `refAviso` passou de `Ref<HTMLDivElement>` para `Ref<HTMLElement>`), `FormularioRegistro.tsx` (`div`) e `Hoje.tsx` (`section`).
  Nenhum precisou de outra tag.
- `Colunas`: `QUEBRAS_DE_COLUNAS` ganhou 960 e 1280 (e as duas `@media` em `layout.css`); não há variante `medio`/largura na peça.
- `TabelaComparacao`: opção `semPainel` (padrão igual ao de antes). `SecaoTabela.tsx` a usa, e as regras `.in-tabela-miolo.cm-painel` e
  `.in-celula.cm-painel` (só a tabela usava) saíram de `inicio.css`. O cartão de oliva e o padding `painel` são os do `Cartao`, que já estavam lá.
  Os testes ficaram em `inicio.test.tsx` (arquivo de `componentes/campo/` não aceitou edição).
- `AvisoDemonstracao`: ver a tabela acima.
- `MolduraLogada.tsx`: nada a trocar. O `<main>` já não leva `pb-4 pt-8 lg:pt-12` (é `<main aria-busy>` sem classe; o respiro vem das Seções
  de `layout.css`).
- `.cm-cab-*`: não mexi nas larguras do cabeçalho.

## Exceções (`web/harmonia-excecoes.json`: 17 de 30)

| Arquivo | Alvo | Motivo curto |
|---|---|---|
| `src/index.css` | `.t-numero` | numeral `numero`, fora da escala |
| `src/index.css` | `.t-cronometro` | `cronometro`, fora da escala |
| `src/index.css` | `.ha-cron-valor[data-tamanho='longo']` | cronômetro da Sessão, modo longo |
| `src/index.css` | `.ha-cron-valor[data-tamanho='normal']` | cronômetro da Sessão no celular |
| `src/index.css` | `[data-ultimos] .sb-numeros-valor` | números de Últimos do Hoje |
| `src/index.css` | `:root[data-tema='madrugada'] main:is(...) .rotina-link-esticado` | rem pinado por `alvosMadrugada.test.tsx` |
| `src/styles/site.css` | `.cm-marca` | `min(24px, vw)`, raiz a 200% |
| `src/styles/site.css` | `.cm-cab-link` | 17 px fixos mantêm as larguras da QA-F1 |
| `src/styles/site.css` | `.cm-cab-madrugada[data-tamanho='app']` | `min()` pinado por `cascaPolimento.test.tsx` |
| `src/styles/site.css` | `.cm-rodape-nome` | `100cqi / 7,966`, medida do nome |
| `src/componentes/inicio/inicio.css` | `.in-numeros-valor` | número grande, `numero` |
| `src/componentes/publicas-destaque/publicas-destaque.css` | `.pd-familia-tela.pd-cartao-plano` | `calc(32px + pilha)` = 48/48, nenhum papel vale 48 nas duas pontas |
| `src/componentes/app/CartaoSessao.tsx` | `text-[64px]` | tempo do cartão, `numero` |
| `src/componentes/app/CartaoSessao.tsx` | `lg:text-[120px]` | idem, 1440 |
| `src/componentes/app/ResumoDoDia.tsx` | `text-[clamp(28px,12.5cqi,52px)]` | números do dia seguem o contêiner |
| `src/componentes/app/DesdeQueVoceSaiu.tsx` | `pl-[2.625rem]` | recuo derivado do avatar (32 + 10) |
| `src/componentes/app/DesdeQueVoceSaiu.tsx` | `lg:pl-14` | idem (40 + 16) |

## Conversões de tipo desta rodada (stylelint)

| Arquivo | Regra | Nível |
|---|---|---|
| `inicio.css` | `.in-avatar` (entrelinha 1) | `corpo` (par do `font-size` que já usava) |
| `inicio.css` | cabeçalho da tabela a 390 (14 px) | `pequeno` (15 px, tamanho e entrelinha); a coluna usa `em`, acompanha |
| `publicas-destaque.css` | número do passo (1), título do cartão (1,2), hora do cartão (1,1), círculo (1,3), `th` da tabela (1,25), destaque (1,25) | entrelinha do mesmo nível do `font-size` de cada regra (titulo-4, titulo-3, titulo-1, corpo, titulo-4, titulo-2) |

## Não verificado

- Nenhuma captura de tela nem `medir_h`: `py-3` (12 px em vez de 14), `pequeno` no cabeçalho da tabela, entrelinhas dos tokens e o
  fim do painel duplo na tabela do Início mudam a medida visível; falta olhar a 390 e a 1440 e conferir "AppMaternidade" na coluna justa.
- `eslint-plugin-better-tailwindcss` continua em `web/package.json`: nada o importa, mas o `package-lock.json` o lista e não posso rodar
  `npm install`; tirar só do `package.json` quebraria o `npm ci`. Remover junto com o lock numa rodada que possa rodar `npm install`.
