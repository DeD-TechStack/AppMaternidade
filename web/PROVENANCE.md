# Procedência de recursos de terceiros

Cada recurso de terceiros que vai no site tem uma linha aqui: pacote, versão exata, licença e caminho da cópia da licença no repositório. Os pacotes vêm de `registry.npmjs.org`, com o `integrity` fixado em `web/package-lock.json`.

## Fontes

| Família | Pacote | Versão | Licença | Cópia da licença | sha256 da licença |
|---|---|---|---|---|---|
| Fraunces | `@fontsource/fraunces` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-fraunces.txt` | `cd3384cafac6f2bddc3955273958a2e029f97027c8037ac539ef5744a77b579e` |
| Instrument Sans | `@fontsource/instrument-sans` | 5.3.0 | SIL Open Font License 1.1 (`OFL-1.1`) | `web/licencas/fontsource-instrument-sans.txt` | `c27a3c53c3beed7f5c26853afa15991478ff7145d3754a36b0382f84e10c0d03` |

A cópia da licença é o arquivo `LICENSE` do próprio pacote, sem alteração (mesmo sha256).

## Ferramentas de desenvolvimento

| Ferramenta | Pacote | Versão | Licença | Uso |
|---|---|---|---|---|
| CLI do DESIGN.md | `@google/design.md` | 0.4.0 | Apache-2.0 | `npx designmd lint DESIGN.md` e `npx designmd export --format css-tailwind DESIGN.md`, rodados em `web/`. Não vai para o bundle. |

## Ilustrações

As ilustrações do site são SVG desenhados para o projeto, sem acervo de terceiros.

## Componentes

Nenhuma biblioteca de componentes. Os componentes são próprios, feitos com Tailwind.
