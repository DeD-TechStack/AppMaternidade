// Harmonia, regra bloqueante (SPEC_H3, H3:RF-03 / cartão H-3g). `npm --prefix web run lint` roda isto sempre
// (o `lint:harmonia` continua existindo, só como extra). O tema gerado e o tokens.css são onde os números moram.
//
// Plugin pequeno do próprio projeto (postcss `walkDecls` via `stylelint.createPlugin`), porque a mensagem
// precisa nomear o token mais próximo (`margin-top: 37px` -> `espaco-grupo`) e porque as exceções fechadas
// moram em `web/harmonia-excecoes.json`.
//
// Em `margin*`, `padding*`, `gap`, `row-gap` e `column-gap` passa:
//   - `var(...)` (qualquer variável; os tokens são `var(--espaco-*)` e `var(--quadro-calha)`);
//   - `0` (com qualquer unidade), `auto`, `normal` e as palavras que herdam ou zeram;
//   - número com `%` ou `em`;
//   - px, inteiro ou decimal, de 1 a 32, também negativo.
// Em `font-size` e `line-height` passa só `inherit` ou um valor feito de `var(--texto-*)`.
// `max-width` está fora da regra (SPEC_H3). Tudo o mais é violação: rem, vw, px acima de 32 ou abaixo de 1,
// unidade sem unidade, `clamp()` com número.
//
// Função (`calc`, `min`, `max`, `clamp`, `env`...): depois de tirar todo `var(...)` (com o fallback dentro),
// o resto não pode ter literal numérico solto. Valem só: `0`; número com `%` ou `em`; `1px` (fio); e número
// sem unidade ao lado de `*` ou `/` (divisor ou multiplicador, como `/ 2`, `* -1` e `-1 * var(...)`).
//
// Exceção: uma entrada de `harmonia-excecoes.json` com o mesmo `arquivo` (relativo a web/, com `/`) e o `alvo`
// igual ao texto exato do seletor da regra que guarda a declaração (espaços e quebras de linha colapsados em um
// espaço) dispensa a declaração. Uma entrada = um par (arquivo, alvo).
import { readFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import stylelint from 'stylelint'

const PASTA_WEB = dirname(fileURLToPath(import.meta.url))
const NOME_DA_REGRA = 'harmonia/valores-soltos'

function lerExcecoes() {
  const dados = JSON.parse(readFileSync(new URL('./harmonia-excecoes.json', import.meta.url), 'utf8'))
  return Array.isArray(dados.excecoes) ? dados.excecoes : []
}
const EXCECOES = lerExcecoes()

// Os papéis de espaço de web/DESIGN.md com o valor de 1440 px (o `painel` vale o mesmo que o `bloco` e não
// entra na busca do mais próximo). Cópia da tabela de eslint.config.js: os dois arquivos não se importam.
const PAPEIS_POR_VALOR = [
  ['junto', 12],
  ['pilha', 16],
  ['grupo', 32],
  ['bloco', 48],
  ['midia', 64],
  ['secao', 80],
  ['secao-ampla', 128],
]
const LISTA_DE_PAPEIS =
  'junto 8/12, pilha 16, grupo 24/32, bloco 24/48, midia 32/64, secao 48/80, secao-ampla 72/128, painel 24/48 px (390/1440)'

// Papel mais próximo de um valor em px, pelo valor de 1440; no empate vale o menor.
function papelMaisProximo(px) {
  const alvo = Math.abs(px)
  let melhor = PAPEIS_POR_VALOR[0]
  for (const papel of PAPEIS_POR_VALOR) {
    if (Math.abs(papel[1] - alvo) < Math.abs(melhor[1] - alvo)) melhor = papel
  }
  return melhor[0]
}

const RE_ESPACO = /^(?:margin|padding)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$|^(?:gap|row-gap|column-gap)$/
const RE_TIPO = /^(?:font-size|line-height)$/
const RE_NUMERO = /^([+-]?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i
const NEUTROS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'auto', 'normal'])

// Divide em componentes por espaço fora de parênteses.
function componentes(valor) {
  const saida = []
  let fundo = 0
  let atual = ''
  for (const c of valor.trim()) {
    if (c === '(') fundo += 1
    else if (c === ')') fundo -= 1
    if (/\s/.test(c) && fundo === 0) {
      if (atual) saida.push(atual)
      atual = ''
    } else atual += c
  }
  if (atual) saida.push(atual)
  return saida
}

// Tira toda chamada `var(...)` (parênteses balanceados, fallback incluído).
function semVar(texto) {
  let saida = ''
  for (let i = 0; i < texto.length; ) {
    if (texto.startsWith('var(', i) && !/[\w-]/.test(texto[i - 1] ?? ' ')) {
      let fundo = 0
      let j = i + 3
      for (; j < texto.length; j += 1) {
        if (texto[j] === '(') fundo += 1
        else if (texto[j] === ')' && --fundo === 0) break
      }
      i = j + 1
    } else {
      saida += texto[i]
      i += 1
    }
  }
  return saida
}

// O primeiro literal numérico solto de uma função, ou `null` (regra do comentário do topo).
function literalSolto(funcao) {
  const resto = semVar(funcao)
  for (const achado of resto.matchAll(/(?<![\w.-])[+-]?(?:\d+\.?\d*|\.\d+)[a-z%]*/gi)) {
    const [, numero, unidade] = RE_NUMERO.exec(achado[0]) ?? []
    const n = Number(numero)
    const un = unidade.toLowerCase()
    if (n === 0 || un === '%' || un === 'em') continue
    if (un === 'px' && Math.abs(n) === 1) continue
    if (un === '' && (/[*/]$/.test(resto.slice(0, achado.index).trimEnd()) || /^[*/]/.test(resto.slice(achado.index + achado[0].length).trimStart()))) continue
    return achado[0]
  }
  return null
}

const SUGESTAO_DE_ESPACO =
  `use var(--espaco-<papel>) ou var(--quadro-calha) (papéis: ${LISTA_DE_PAPEIS}) do web/DESIGN.md; ` +
  'passam também 0, auto, %, em e px de 1 a 32'
const SUGESTAO_DE_TIPO =
  'font-size/line-height: var(--texto-<nível>-tamanho) e var(--texto-<nível>-entrelinha) ' +
  '(níveis: exibicao, titulo-1 a titulo-4, abertura, corpo, pequeno, sobretitulo) do web/DESIGN.md'

// Devolve a sugestão da violação de um componente de espaço, ou `null` se ele passa.
function violacaoDeEspaco(parte) {
  if (parte.startsWith('var(') || NEUTROS.has(parte.toLowerCase())) return null
  const numero = RE_NUMERO.exec(parte)
  if (numero) {
    const n = Number(numero[1])
    const un = numero[2].toLowerCase()
    if (n === 0 || un === '%' || un === 'em') return null
    if (un === 'px') {
      if (Math.abs(n) >= 1 && Math.abs(n) <= 32) return null
      const papel = papelMaisProximo(n)
      return `o papel mais próximo de ${parte} é espaco-${papel} (var(--espaco-${papel})); ${SUGESTAO_DE_ESPACO}`
    }
    return SUGESTAO_DE_ESPACO
  }
  if (parte.includes('(')) return literalSolto(parte) === null ? null : `${SUGESTAO_DE_ESPACO}; em função só passa número derivado de var()`
  return null
}

function violacaoDeTipo(valor) {
  const v = valor.trim()
  if (v.toLowerCase() === 'inherit') return null
  const chamadas = [...v.matchAll(/(?<![\w-])var\(\s*(--[\w-]*)/g)]
  if (chamadas.length === 0 || chamadas.some((c) => !c[1].startsWith('--texto-'))) return SUGESTAO_DE_TIPO
  return literalSolto(v) === null ? null : SUGESTAO_DE_TIPO
}

function regra(primario, secundario) {
  return (raiz, resultado) => {
    if (!primario) return
    const excecoes = secundario?.excecoes ?? EXCECOES
    const arquivo = raiz.source?.input.file ? relative(PASTA_WEB, raiz.source.input.file).replaceAll('\\', '/') : ''
    const alvos = new Set(excecoes.filter((e) => e.arquivo === arquivo).map((e) => e.alvo))

    raiz.walkDecls((decl) => {
      const propriedade = decl.prop.toLowerCase()
      const tipo = RE_TIPO.test(propriedade)
      if (!tipo && !RE_ESPACO.test(propriedade)) return
      const sugestao = tipo
        ? violacaoDeTipo(decl.value)
        : componentes(decl.value).map(violacaoDeEspaco).find((s) => s !== null) ?? null
      if (sugestao === null) return
      const pai = decl.parent
      const seletor = pai?.type === 'rule' ? pai.selector.replace(/\s+/g, ' ').trim() : null
      if (seletor !== null && alvos.has(seletor)) return
      stylelint.utils.report({
        ruleName: NOME_DA_REGRA,
        result: resultado,
        node: decl,
        message: `Valor solto "${decl.value}" em "${decl.prop}": ${sugestao}`,
      })
    })
  }
}
regra.ruleName = NOME_DA_REGRA
regra.messages = {}

export default {
  plugins: [stylelint.createPlugin(NOME_DA_REGRA, regra)],
  // O tema gerado e o tokens.css são onde os números moram.
  ignoreFiles: ['src/styles/harmonia.gerado.css', 'src/styles/tokens.css'],
  rules: {
    [NOME_DA_REGRA]: true,
  },
}
