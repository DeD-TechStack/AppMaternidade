# Procedência de recursos de terceiros

Cada recurso de terceiros que vai no site tem uma linha aqui: pacote, versão exata, licença e caminho da cópia da licença no repositório. Os pacotes vêm de `registry.npmjs.org`, com o `integrity` fixado em `web/package-lock.json`.

## Fontes

| Família | Pacote | Versão | Licença | Cópia da licença | sha256 da licença |
|---|---|---|---|---|---|
| Literata | `@fontsource-variable/literata` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-variable-literata.txt` | `9895ebc015226accf416b758ac1ca02a2fb4f83a89d316791ef697c3dc0852aa` |
| Outfit | `@fontsource-variable/outfit` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-variable-outfit.txt` | `0e5fcef5d93bfcae273c11c00f0bb453d3b5491860e1ac8b658767b7577c938f` |

A cópia da licença é o arquivo `LICENSE` do próprio pacote, sem alteração (mesmo sha256).

## Ícones

| Pacote | Versão | Licença | Cópia da licença | sha256 da licença | Uso |
|---|---|---|---|---|---|
| `lucide-react` | 1.69.0 | ISC | `web/licencas/lucide-react-LICENSE.txt` | `b495047bd93a9b06913511076f504daba17d5bbeb3e0650f3bb53a4220329c57` | Ícones da área logada (navegação inferior e botões rápidos de Hoje e Sessão), importados um a um, sempre ao lado de um rótulo visível. Entrou na MAT-44, pela lista "Usar" da `skill-scouting`. |

A cópia da licença é o arquivo `LICENSE` do pacote instalado do `registry.npmjs.org`, sem alteração (mesmo sha256).

## Ferramentas de desenvolvimento

| Ferramenta | Pacote | Versão | Licença | Uso |
|---|---|---|---|---|
| CLI do DESIGN.md | `@google/design.md` | 0.4.0 | Apache-2.0 | `npx designmd lint DESIGN.md` e `npx designmd export --format css-tailwind DESIGN.md`, rodados em `web/`. Não vai para o bundle. |

## Ilustrações

As ilustrações e as cenas do site são imagens geradas pelo Codex CLI 0.167.0 (`image_gen` embutido, plano ChatGPT de Daniel, sem chave de API, sem imagem de referência), curadas pelo `lider-appmaternidade`, em 11/11/2026. Origem, sha256 dos brutos, modelo, data e id do prompt de cada arquivo estão em `_staging/appmaternidade/DIRECOES_20261111/FINAL/ativos/PROVENANCE.md` (cópia do mesmo registro ao lado dos arquivos). Nenhum rosto de pessoa real; nada vem dos sites de referência.

| Arquivo | Registro |
|---|---|
| `web/public/ilustracoes/avo-carrinho@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, `I_traco subject 1`; cópia em `web/public/ilustracoes/PROVENANCE.md` |
| `web/public/ilustracoes/pai-colo@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, `I_traco subject 2`; idem |
| `web/public/ilustracoes/tummy-time@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, `I_traco subject 3`; idem |
| `web/public/ilustracoes/maos-celular@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, `I_traco subject 4`; idem |
| `web/public/ilustracoes/baba-tapete@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, `I_traco subject 5`; idem |
| `web/public/ilustracoes/mae-noite@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, `I_traco subject 6`; idem |
| `web/public/cenas/sistema/trio-mel@1x.webp`, `@2x.webp` | `FINAL/ativos/PROVENANCE.md`, cena `S1_trio_mel` composta com `compor.py` sobre três capturas reais do site; cópia em `web/public/cenas/sistema/PROVENANCE.md` |

## Movimento

| Pacote | Versão | Licença | Cópia da licença | sha256 da licença | Uso |
|---|---|---|---|---|---|
| `motion` | 12.43.0 | MIT | `web/licencas/motion-LICENSE.md` | `1bf0dc3f7727723e5a032ed12164a47cf92c05204cb1a3485f123c24e2833ed1` | Animações do Início (MAT-44c-2), importadas só de `motion/react` e só em `web/src/movimento/`, `web/src/componentes/terceiros/`, `web/src/componentes/vitrine/` e `web/src/paginas/Inicio.tsx`. Traz o `framer-motion` 12.43.0 como dependência dele, não do site. |

Escolha da versão (MAT-44c-2a, 06/11/2026): `npm view motion@12 version --json` listou até `12.43.0`, a maior da major 12 (D-2 da MAT-44c). Instalado com `npm --prefix web i --save-exact motion@12.43.0`. A cópia da licença é o `LICENSE.md` do pacote instalado, sem alteração (mesmo sha256).

## Componentes

Os componentes do site são próprios, feitos com Tailwind. Os de movimento ficam em `web/src/movimento/`, também próprios. Os únicos de terceiros estão em `web/src/componentes/terceiros/`:

| Componente | Origem (arquivo no commit) | sha256 do original | Licença | Linha do MOVIMENTO | Adaptação |
|---|---|---|---|---|---|
| `EntradaSuave.tsx` | Magic UI, `magicuidesign/magicui@efe76fc5755eca1142dd4f74c1d6f0ace2887e3c`, `apps/www/registry/magicui/blur-fade.tsx` | `99a8e83aa8817f48e26d921e959ff9abefb5c2f1f0b72b166ed95e88e015949f` | MIT, `web/licencas/magicui-LICENSE.md` | M4 (linhas que sobem com opacidade, uma depois da outra), usada por `movimento/LinhasEscalonadas.tsx` | sem filtro de desfoque (só opacidade e deslocamento); parâmetros do catálogo `movimento/catalogo.ts`; `useInView` com `once: false`; sem `AnimatePresence`; estático com movimento reduzido |
| `TextoAnimado.tsx` | Magic UI, mesmo commit, `apps/www/registry/magicui/text-animate.tsx` | `0ebece79c412661f57bc0489416b55a376e9f006e0f558162bb6e91f814a99a6` | MIT, `web/licencas/magicui-LICENSE.md` | M5 (título dividido por linha) | só a divisão por linha e a subida com opacidade; saíram as variantes que desfocam ou escalam e as divisões por palavra e letra; texto inteiro num `sr-only` e linhas com `aria-hidden`; parâmetros do catálogo; estático com movimento reduzido |
| `cn.ts` | próprio | — | — | — | junta classes, no lugar do `cn` do Magic UI (`clsx` e `tailwind-merge` não entram) |

A licença do Magic UI é o `LICENSE.md` da raiz do repositório no mesmo commit, sem alteração (sha256 `0147b84235ed916b8b4e89c1f80655351c5afe7d211b629be61f553a227b34ba`). Desvio do `shadcn add`: os dois arquivos foram baixados de `raw.githubusercontent.com` no commit examinado e adaptados à mão, sem `shadcn init` nem `shadcn add`, então não há `components.json`, alias `@/` nem dependência nova além do `motion`.

Histórico (MAT-44, antes desta frente): a lista aprovada (shadcn/ui em `shadcn-ui/ui@ba1503c644` e Magic UI em `magicuidesign/magicui@efe76fc575`) (commit completo `efe76fc5755eca1142dd4f74c1d6f0ace2887e3c`, lido em `apps/www/registry/magicui/`) foi examinada para o salto visual, e nenhum item entrou. Motivo, item a item do que serviria às telas: o `blur-fade` anima `filter: blur(...)` com 400 ms por padrão, acima do limite de movimento do projeto (só opacidade e até 16 px, até 300 ms) e contra a proibição de desfoque; o `marquee` é movimento contínuo (40 s em laço) e o `number-ticker` é um contador animado; as molduras `iphone`, `safari` e `android` mostram a tela por uma imagem (`<img>` ou `<image href>`), e aqui a moldura leva as miniaturas vivas dos componentes de Hoje e Sessão, sem imagem raster, então ela é desenhada à mão em CSS; as primitivas do shadcn/ui (dialog, select, tabs) não têm uso nestas três telas. Por isso não houve download de arquivo-fonte, nem `motion`, nem cópia de licença dessas bibliotecas. Se um cartão futuro adotar um item, o caminho é a cópia do arquivo no commit examinado (sem `shadcn init` nem `shadcn add`, para não criar `components.json` nem alias fora do escopo), com a adaptação registrada aqui.
