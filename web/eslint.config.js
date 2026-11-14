import { readFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Harmonia, regra bloqueante (SPEC_H3, H3:RF-03 / cartão H-3g). `npm --prefix web run lint` roda isto sempre,
// sem variável de ambiente (o `lint:harmonia` continua existindo, só como extra).
//
// A regra `harmonia/classes-soltas` substitui o `better-tailwindcss/no-restricted-classes` do modo relatório:
// aquele não lê arquivo, e as exceções fechadas moram em `web/harmonia-excecoes.json`. A cobertura é a mesma
// (atributos `class`/`className`, argumentos de `cn`/`clsx`/`twMerge`/`cva`... e variáveis `className`,
// `classes`, `styles`), mais as constantes cujo nome termina em `Classe`, `Classes` ou `CLASSE`.
//
// Proibido em classe (com qualquer variante, `!` e sinal negativo):
//   - valor arbitrário `[..]` sem `var(` em m*, p*, gap*, space-*;
//   - passo numérico fora de 0, px, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8 em m*, p*, gap*, space-*;
//   - `text-[<tamanho>]` e `leading-[..]` sem `var(`;
//   - `text-xs` a `text-9xl`, inclusive `text-base`.
// Fora da regra: `max-w-*`, `w-*`, `h-*`, `auto`, as classes `esp-*` e `[var(--x)]`.
//
// Exceção: uma entrada de `harmonia-excecoes.json` com o mesmo `arquivo` (relativo a web/, com `/`) e o `alvo`
// igual à classe inteira (variantes incluídas) dispensa aquele par. Uma entrada = um par (arquivo, alvo).
const PASTA_WEB = dirname(fileURLToPath(import.meta.url))

function lerExcecoes() {
  const dados = JSON.parse(readFileSync(new URL('./harmonia-excecoes.json', import.meta.url), 'utf8'))
  return Array.isArray(dados.excecoes) ? dados.excecoes : []
}

// Os papéis de espaço de web/DESIGN.md com o valor de 1440 px (o `painel` vale o mesmo que o `bloco` e não
// entra na busca do mais próximo). Cópia da tabela de stylelint.config.mjs: os dois arquivos não se importam.
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

// Papel mais próximo de cada px inteiro de 1 a 256, pelo valor de 1440; no empate vale o menor.
const PAPEL_DO_PX = new Map()
for (let px = 1; px <= 256; px += 1) {
  let melhor = PAPEIS_POR_VALOR[0]
  for (const papel of PAPEIS_POR_VALOR) {
    if (Math.abs(papel[1] - px) < Math.abs(melhor[1] - px)) melhor = papel
  }
  PAPEL_DO_PX.set(px, melhor[0])
}

const TOKEN_DE_TIPO = 'classe do nível de tipo (text-<nível>; níveis: exibicao, titulo-1 a titulo-4, abertura, corpo, pequeno, sobretitulo) do web/DESIGN.md'
const PASSOS = new Set(['0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '7', '8'])

const RE_ESPACO = /^(-?)(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(.+)$/
const RE_TEXTO_SOLTO = /^text-\[(?!#)(?![^\]]*var\()[^\]]*\d(?:px|rem|em|vw|vh|vmin|vmax|cqi|cqw|pt|ch|%)[^\]]*\]$/
const RE_TEXTO_NUMERICO = /^text-(?:xs|sm|base|lg|xl|[2-9]xl)$/
const RE_ENTRELINHA_SOLTA = /^leading-\[(?![^\]]*var\()[^\]]*\]$/

// Tira as variantes (`md:`, `[&>*]:`, `min-[1px]:`), o `!` e devolve o utilitário; `:` dentro de `[]` ou `()` fica.
function utilitario(classe) {
  let fundo = 0
  let inicio = 0
  for (let i = 0; i < classe.length; i += 1) {
    const c = classe[i]
    if (c === '[' || c === '(') fundo += 1
    else if (c === ']' || c === ')') fundo -= 1
    else if (c === ':' && fundo === 0) inicio = i + 1
  }
  return classe.slice(inicio).replace(/^!/, '').replace(/!$/, '')
}

// A mensagem da violação, ou `null` se a classe passa.
function mensagemDaClasse(classe) {
  const u = utilitario(classe)

  const espaco = RE_ESPACO.exec(u)
  if (espaco) {
    const [, sinal, familia, valor] = espaco
    let solto = false
    let px = null
    if (valor.startsWith('[')) {
      solto = !valor.includes('var(')
      const medida = /^\[(\d+(?:\.\d+)?)px\]$/.exec(valor)
      if (medida) px = Number(medida[1])
    } else if (/^\d+(?:\.\d+)?$/.test(valor)) {
      solto = !PASSOS.has(valor)
    }
    if (!solto) return null
    if (px !== null && PAPEL_DO_PX.has(px)) {
      const papel = PAPEL_DO_PX.get(px)
      return `Espaço solto "${classe}": o papel mais próximo de ${px} px é espaco-${papel} (classe ${sinal}${familia}-esp-${papel}).`
    }
    return (
      `Espaço solto "${classe}": use a classe do papel (${sinal}${familia}-esp-<papel>; papéis: ${LISTA_DE_PAPEIS}) ` +
      'do web/DESIGN.md; passos permitidos: 0, px, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7 e 8.'
    )
  }
  if (RE_TEXTO_SOLTO.test(u)) return `Tamanho de letra solto "${classe}": use a ${TOKEN_DE_TIPO}.`
  if (RE_TEXTO_NUMERICO.test(u)) return `Tamanho de letra numérico do Tailwind "${classe}": use a ${TOKEN_DE_TIPO}.`
  if (RE_ENTRELINHA_SOLTA.test(u)) {
    return `Entrelinha solta "${classe}": use a ${TOKEN_DE_TIPO} (a classe do nível já traz a entrelinha).`
  }
  return null
}

const CHAMADAS = new Set([
  'cc', 'clb', 'clsx', 'cn', 'cnb', 'ctl', 'cva', 'cx', 'dcnb', 'objstr', 'tv', 'twJoin', 'twMerge', 'classNames', 'classnames',
])
const RE_VARIAVEL = /^(?:classNames?|classes|styles?)$|(?:Classes?|CLASSES?|CLASSE)$/

// Percorre uma expressão e entrega cada texto que pode ser lista de classes: literal, pedaço de template,
// os dois lados de `?:`, `&&`, `||`, `+`, itens de array e chaves e valores de objeto. Não entra em chamadas
// (as de `cn`/`clsx`... têm a sua própria visita) nem em identificadores.
function varrer(no, achar) {
  if (!no) return
  const entrar = (filho) => varrer(filho, achar)
  switch (no.type) {
    case 'Literal':
      if (typeof no.value === 'string') achar(no, no.value, true, true)
      return
    case 'TemplateLiteral':
      no.quasis.forEach((parte, i) => achar(parte, parte.value.cooked ?? parte.value.raw, i === 0, i === no.quasis.length - 1))
      no.expressions.forEach(entrar)
      return
    case 'ConditionalExpression':
      entrar(no.consequent)
      entrar(no.alternate)
      return
    case 'LogicalExpression':
      entrar(no.left)
      entrar(no.right)
      return
    case 'BinaryExpression':
      if (no.operator === '+') {
        entrar(no.left)
        entrar(no.right)
      }
      return
    case 'ArrayExpression':
      no.elements.forEach(entrar)
      return
    case 'ObjectExpression':
      for (const p of no.properties) {
        if (p.type === 'SpreadElement') entrar(p.argument)
        else {
          if (!p.computed && p.key.type === 'Literal') entrar(p.key)
          entrar(p.value)
        }
      }
      return
    case 'JSXExpressionContainer':
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'ChainExpression':
      entrar(no.expression)
      return
    case 'SpreadElement':
      entrar(no.argument)
      return
  }
}

const regraClassesSoltas = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: { excecoes: { type: 'array' } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    // `excecoes` na opção só existe para o teste do mecanismo (lista em memória); sem ela vale o arquivo.
    const excecoes = context.options[0]?.excecoes ?? EXCECOES
    const arquivo = relative(PASTA_WEB, context.filename).replaceAll('\\', '/')
    const alvos = new Set(excecoes.filter((e) => e.arquivo === arquivo).map((e) => e.alvo))
    const codigo = context.sourceCode
    const vistos = new Set()

    const achar = (no, texto, abre, fecha) => {
      for (const achado of texto.matchAll(/\S+/g)) {
        const classe = achado[0]
        const comeco = achado.index
        // Pedaço de template colado a uma `${}`: a ponta pode ser só parte de uma classe.
        if (comeco === 0 && !abre) continue
        if (comeco + classe.length === texto.length && !fecha) continue
        const mensagem = mensagemDaClasse(classe)
        if (mensagem === null || alvos.has(classe)) continue
        const inicio = no.range[0] + 1 + comeco
        const exato = codigo.text.slice(inicio, inicio + classe.length) === classe
        const chave = `${exato ? inicio : no.range[0]}:${classe}`
        if (vistos.has(chave)) continue
        vistos.add(chave)
        context.report(
          exato
            ? { loc: { start: codigo.getLocFromIndex(inicio), end: codigo.getLocFromIndex(inicio + classe.length) }, message: mensagem }
            : { node: no, message: mensagem },
        )
      }
    }

    return {
      JSXAttribute(no) {
        if (no.name.type === 'JSXIdentifier' && (no.name.name === 'className' || no.name.name === 'class')) varrer(no.value, achar)
      },
      CallExpression(no) {
        if (no.callee.type === 'Identifier' && CHAMADAS.has(no.callee.name)) no.arguments.forEach((a) => varrer(a, achar))
      },
      VariableDeclarator(no) {
        if (no.id.type === 'Identifier' && RE_VARIAVEL.test(no.id.name)) varrer(no.init, achar)
      },
    }
  },
}

const EXCECOES = lerExcecoes()

const harmonia = {
  name: 'harmonia/bloqueante',
  files: ['src/**/*.{ts,tsx}'],
  plugins: { harmonia: { rules: { 'classes-soltas': regraClassesSoltas } } },
  rules: { 'harmonia/classes-soltas': 'error' },
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
  harmonia,
])
