# Site do AppMaternidade

Projeto do site em React 19, TypeScript e Vite, com Tailwind CSS 4 e React Router 7 em modo biblioteca. Por enquanto tem só a página inicial provisória e a página de rota inexistente.

Requisitos: Node 24 e npm (conferido com Node v24.22.1 e npm 11.19.1).

## Na pasta `web/`

Instalar as dependências exatamente como estão no `package-lock.json`:

```sh
npm ci
```

Subir o servidor de desenvolvimento. A URL local aparece no terminal (por padrão `http://localhost:5173/`); encerre com Ctrl+C:

```sh
npm run dev
```

Rodar toda a verificação do site. Ela para na primeira falha:

```sh
npm run check
```

O `check` roda, nesta ordem:

| Script | O que faz |
|---|---|
| `npm run typecheck` | `tsc -b --noEmit`, com `strict` em todos os tsconfig |
| `npm run lint` | ESLint com typescript-eslint, react-hooks e jsx-a11y, sem aceitar avisos |
| `npm run test` | Vitest com jsdom e Testing Library: rotas, axe-core, contraste dos tokens, CSS global e `index.html` |
| `npm run build` | build de produção do Vite em `web/dist/` |

## Na raiz do repositório

Conferir a política de commits num intervalo. No CI a base é fixa em `c7142bb43b763216fa124d101aa0b020f4d26e08`:

```sh
node scripts/verificar-commits.mjs <base>..HEAD
```

Sai com 0 quando todos os commits passam, 1 quando algum reprova (uma linha por regra violada) e 2 em erro de uso ou de git. As regras são: autor `Daniel Macedo <danielmacedosilva11@gmail.com>`, sem merge, sem commit vazio e título não vazio, com até 72 caracteres e começando por letra maiúscula.

Rodar o teste do script:

```sh
node --test scripts/verificar-commits.test.mjs
```

O teste cria repositórios git temporários no diretório temporário do sistema e os apaga no fim.

## Tokens de cor

Os tokens em `src/styles/tokens.css` são provisórios; a MAT-34 vai substituí-los pelos do DESIGN.md.
