import process from 'node:process'
import js from '@eslint/js'
import globals from 'globals'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Harmonia, modo relatório (SPEC H, H:RF-04, parte 1 / cartão H-2). O bloco abaixo só entra com HARMONIA_LINT=1,
// que o `npm --prefix web run lint:harmonia` põe. Sem a variável, `npm run lint` é exatamente o de antes
// (`--max-warnings 0`). A regra bloqueante, as exceções fechadas, `no-unknown-classes`, `no-conflicting-classes`
// e `style={{}}` vêm com a SPEC_H3 (cartão H-3).
const TOKEN_DE_ESPACO =
  'classe do papel de espaço (p-<papel>, gap-<papel>, mt-<papel>; papéis: junto, pilha, grupo, bloco, midia, secao, secao-ampla, painel) do web/DESIGN.md'
const TOKEN_DE_TIPO = 'classe do nível de tipo (text-<nível>; níveis: exibicao, titulo-1 a titulo-4, abertura, corpo, pequeno, sobretitulo) do web/DESIGN.md'
const ESPACO = '(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)'
// Valor arbitrário (entre colchetes) que traz um número e não é uma variável: `[46px]` solta, `[var(--x)]` não.
const NUMERO_SOLTO = String.raw`\[(?![^\]]*var\()[^\]]*\d[^\]]*\]`

const harmonia = {
  name: 'harmonia/relatorio',
  files: ['src/**/*.{ts,tsx}'],
  plugins: { 'better-tailwindcss': betterTailwindcss },
  settings: { 'better-tailwindcss': { entryPoint: 'src/index.css' } },
  rules: {
    'better-tailwindcss/no-restricted-classes': [
      'error',
      {
        restrict: [
          {
            pattern: String.raw`^(?:.*:)?!?-?${ESPACO}-${NUMERO_SOLTO}$`,
            message: `Espaço solto "$0": use a ${TOKEN_DE_ESPACO}.`,
          },
          {
            pattern: String.raw`^(?:.*:)?!?text-\[(?![^\]]*var\()[^\]]*\d(?:px|rem|em)[^\]]*\]$`,
            message: `Tamanho de letra solto "$0": use a ${TOKEN_DE_TIPO}.`,
          },
          {
            pattern: String.raw`^(?:.*:)?!?text-(?:xs|sm|base|lg|xl|[2-9]xl)$`,
            message: `Tamanho de letra numérico do Tailwind "$0": use a ${TOKEN_DE_TIPO}.`,
          },
          {
            pattern: String.raw`^(?:.*:)?!?leading-${NUMERO_SOLTO}$`,
            message: `Entrelinha solta "$0": use a ${TOKEN_DE_TIPO} (a classe do nível já traz a entrelinha).`,
          },
          {
            pattern: String.raw`^(?:.*:)?!?max-w-\[(?![^\]]*var\()(?![\d.]+(?:ch|%)\]$)[^\]]*\d[^\]]*\]$`,
            message:
              'Largura máxima solta "$0": use a classe de largura do web/DESIGN.md (max-w-<nome>; nomes: medio 880 px, leitura 680 px, quadro 1200 px); ch e % ficam permitidos.',
          },
          {
            pattern: String.raw`(?:^|:)(?:min|max)-\[[^\]]+\]`,
            message:
              'Ponto de quebra solto "$0": use um ponto de quebra nomeado do tema em vez de um valor entre colchetes (os pontos de hoje, 767, 991, 1024 e 1200 px, ficam).',
          },
        ],
      },
    ],
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  ...(process.env.HARMONIA_LINT === '1' ? [harmonia] : []),
])
