# Procedência de recursos de terceiros

Cada recurso de terceiros que vai no site tem uma linha aqui: pacote, versão exata, licença e caminho da cópia da licença no repositório. Os pacotes vêm de `registry.npmjs.org`, com o `integrity` fixado em `web/package-lock.json`.

## Fontes

| Família | Pacote | Versão | Licença | Cópia da licença | sha256 da licença |
|---|---|---|---|---|---|
| Fraunces | `@fontsource/fraunces` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-fraunces.txt` | `cd3384cafac6f2bddc3955273958a2e029f97027c8037ac539ef5744a77b579e` |
| Instrument Sans | `@fontsource/instrument-sans` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-instrument-sans.txt` | `c27a3c53c3beed7f5c26853afa15991478ff7145d3754a36b0382f84e10c0d03` |

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

## Componentes

Nenhuma biblioteca de componentes. Os componentes são próprios, feitos com Tailwind.

Na MAT-44 a lista aprovada (shadcn/ui em `shadcn-ui/ui@ba1503c644` e Magic UI em `magicuidesign/magicui@efe76fc575`) (commit completo `efe76fc5755eca1142dd4f74c1d6f0ace2887e3c`, lido em `apps/www/registry/magicui/`) foi examinada para o salto visual, e nenhum item entrou. Motivo, item a item do que serviria às telas: o `blur-fade` anima `filter: blur(...)` com 400 ms por padrão, acima do limite de movimento do projeto (só opacidade e até 16 px, até 300 ms) e contra a proibição de desfoque; o `marquee` é movimento contínuo (40 s em laço) e o `number-ticker` é um contador animado; as molduras `iphone`, `safari` e `android` mostram a tela por uma imagem (`<img>` ou `<image href>`), e aqui a moldura leva as miniaturas vivas dos componentes de Hoje e Sessão, sem imagem raster, então ela é desenhada à mão em CSS; as primitivas do shadcn/ui (dialog, select, tabs) não têm uso nestas três telas. Por isso não houve download de arquivo-fonte, nem `motion`, nem cópia de licença dessas bibliotecas. Se um cartão futuro adotar um item, o caminho é a cópia do arquivo no commit examinado (sem `shadcn init` nem `shadcn add`, para não criar `components.json` nem alias fora do escopo), com a adaptação registrada aqui.
