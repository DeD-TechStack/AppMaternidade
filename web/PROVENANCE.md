# Procedência de recursos de terceiros

Cada recurso de terceiros que vai no site tem uma linha aqui: pacote, versão exata, licença e caminho da cópia da licença no repositório. Os pacotes vêm de `registry.npmjs.org`, com o `integrity` fixado em `web/package-lock.json`.

## Fontes

| Família | Pacote | Versão | Licença | Cópia da licença | sha256 da licença |
|---|---|---|---|---|---|
| Fraunces | `@fontsource/fraunces` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-fraunces.txt` | `cd3384cafac6f2bddc3955273958a2e029f97027c8037ac539ef5744a77b579e` |
| Instrument Sans | `@fontsource/instrument-sans` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-instrument-sans.txt` | `c27a3c53c3beed7f5c26853afa15991478ff7145d3754a36b0382f84e10c0d03` |
| Instrument Serif | `@fontsource/instrument-serif` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-instrument-serif.txt` | `b6106a757902d2d412e09d94dc4a226fe3da80485208a98003969f1b8b6b1d74` |
| Zilla Slab | `@fontsource/zilla-slab` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-zilla-slab.txt` | `72758d2190a1f64ac28b0ae6667890f2d9032c58e981a82a76f840b6d037f0ca` |

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

As ilustrações do site são SVG desenhados para o projeto, sem acervo de terceiros.

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
