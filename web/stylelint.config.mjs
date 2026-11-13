// Harmonia, modo relatório (SPEC H, H:RF-04, parte 1 / cartão H-2): lista os valores soltos de espaço, tipo e
// largura no CSS do site. Só roda por `npm --prefix web run lint:harmonia`; NÃO faz parte do `npm run lint`
// nem do `check`. A regra bloqueante, as exceções fechadas e o tratamento de `line-height` sem unidade vêm
// com a SPEC_H3 (cartão H-3).
//
// Só o plugin stylelint-declaration-strict-value, sem config padrão (o CSS do site usa os at-rules do
// Tailwind 4: @theme, @layer, @import). Um valor passa se for `var(...)` (variável) ou um dos poucos valores
// neutros abaixo; `calc()`, `clamp()` e `min()` com número solto contam como violação (ignoreFunctions: false).
export default {
  plugins: ['stylelint-declaration-strict-value'],
  // O tema gerado e o tokens.css são onde os números moram.
  ignoreFiles: ['src/styles/harmonia.gerado.css', 'src/styles/tokens.css'],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      [
        '/^margin(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/',
        '/^padding(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/',
        'gap',
        'row-gap',
        'column-gap',
        'font-size',
        'line-height',
        'max-width',
      ],
      {
        ignoreVariables: true,
        ignoreFunctions: false,
        ignoreValues: {
          // Neutros em qualquer propriedade: zero, `auto` e as palavras-chave que herdam ou zeram.
          '': ['inherit', 'initial', 'unset', 'revert', 'normal', 'none', '0', 'auto', '/^(0|auto)( (0|auto)){1,3}$/'],
          // Largura máxima de texto em `ch` e `%` (SPEC H, H:RF-04, "Permitido").
          'max-width': ['/^[\\d.]+(ch|%)$/'],
          // Entrelinha sem unidade fica para a SPEC_H3.
          'line-height': ['/^[\\d.]+$/'],
        },
        // O plugin tem uma mensagem só por regra: ela nomeia o token de cada família de propriedade.
        disableFix: true,
        message:
          'Valor solto "${value}" em "${property}": use um token do web/DESIGN.md. ' +
          'margin/padding/gap: var(--espaco-<papel>) ou var(--quadro-calha); ' +
          'font-size/line-height: var(--texto-<nível>-tamanho) e var(--texto-<nível>-entrelinha); ' +
          'max-width: var(--medio), var(--leitura) ou var(--quadro-largura)',
      },
    ],
  },
}
