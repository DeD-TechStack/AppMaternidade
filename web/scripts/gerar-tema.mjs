// Gera web/src/styles/harmonia.gerado.css a partir do front matter de web/DESIGN.md (H:RF-02 da SPEC H).
//
//   node scripts/gerar-tema.mjs            escreve o arquivo gerado
//   node scripts/gerar-tema.mjs --check    sai com 1 se o arquivo gravado diverge de uma geração nova
//   node scripts/gerar-tema.mjs --stdout   imprime o CSS gerado (os testes usam este modo)
//   node scripts/gerar-tema.mjs --json     imprime o front matter lido, em JSON (os testes usam este modo)
//
// Sem dependência nova: o front matter do DESIGN.md usa um subconjunto pequeno de YAML (mapas por indentação de
// espaços, texto simples ou entre aspas), lido aqui mesmo. Saída determinística: mesma entrada, mesmos bytes.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ_WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const CAMINHO_DESIGN = resolve(RAIZ_WEB, 'DESIGN.md')
export const CAMINHO_SAIDA = resolve(RAIZ_WEB, 'src/styles/harmonia.gerado.css')

/** Os dois viewports que fixam a escala: abaixo de 390 vale o valor de 390; acima de 1440, o de 1440. */
export const VIEWPORT_MIN = 390
export const VIEWPORT_MAX = 1440

/** Os 8 papéis de espaço (MEDIDAS.md §7). Cada um tem `spacing.<papel>-390` e `spacing.<papel>-1440`. */
export const PAPEIS = ['junto', 'pilha', 'grupo', 'bloco', 'midia', 'secao', 'secao-ampla', 'painel']

/** Os 9 níveis de tipo. Cada um tem `typography.<nível>-390` e `typography.<nível>-1440`. */
export const NIVEIS = ['exibicao', 'titulo-1', 'titulo-2', 'titulo-3', 'titulo-4', 'abertura', 'corpo', 'pequeno', 'sobretitulo']

/**
 * Papéis sem apelido de espaço do Tailwind por enquanto. O apelido (`--spacing-<papel>`) liga a classe `pt-<papel>`,
 * e o CSS próprio de web/src/componentes/publicas-texto já tem classes `pt-junto`, `pt-secao` e `pt-painel` (seletores
 * de classe do site, escritos à mão). Com o apelido, o Tailwind passaria a gerar um padding-top para elas e mudaria a
 * tela. O cartão H-3 renomeia as classes e esvazia esta lista. O teste de gerar-tema confere que cada colisão existe.
 */
export const SEM_APELIDO_DE_ESPACO = {
  junto: 'pt-junto',
  secao: 'pt-secao',
  painel: 'pt-painel',
}

// ---------------------------------------------------------------------------------------------------------------
// Leitura do front matter
// ---------------------------------------------------------------------------------------------------------------

function escalar(texto, linha) {
  if (texto.startsWith('"')) {
    try {
      return JSON.parse(texto)
    } catch {
      throw new Error(`front matter, linha ${linha}: texto entre aspas inválido: ${texto}`)
    }
  }
  if (texto.startsWith("'")) {
    if (!texto.endsWith("'") || texto.length < 2) throw new Error(`front matter, linha ${linha}: aspas simples sem fechar: ${texto}`)
    return texto.slice(1, -1).replaceAll("''", "'")
  }
  if (/^-?\d+(?:\.\d+)?$/.test(texto)) return Number(texto)
  return texto
}

/** Lê o subconjunto de YAML do front matter: `chave: valor` e `chave:` com filhos recuados por espaços. */
export function lerYaml(texto) {
  const raiz = {}
  const pilha = [{ indent: -1, objeto: raiz }]
  texto.split('\n').forEach((linhaBruta, indice) => {
    const linha = indice + 1
    if (/^\s*(#.*)?$/.test(linhaBruta)) return
    const recuo = /^ */.exec(linhaBruta)[0].length
    const conteudo = linhaBruta.slice(recuo).trimEnd()
    if (conteudo.startsWith('\t') || linhaBruta.slice(0, recuo + 1).includes('\t')) {
      throw new Error(`front matter, linha ${linha}: tabulação no recuo (use espaços)`)
    }
    const partes = /^([A-Za-z0-9_-]+):(?:\s+(.*))?$/.exec(conteudo)
    if (!partes) throw new Error(`front matter, linha ${linha}: fora do subconjunto de YAML aceito: ${linhaBruta}`)
    while (pilha.at(-1).indent >= recuo) pilha.pop()
    const pai = pilha.at(-1).objeto
    const [, chave, valor] = partes
    if (Object.hasOwn(pai, chave)) throw new Error(`front matter, linha ${linha}: chave repetida "${chave}"`)
    if (valor === undefined || valor.trim() === '') {
      const filho = {}
      pai[chave] = filho
      pilha.push({ indent: recuo, objeto: filho })
    } else {
      pai[chave] = escalar(valor.trim(), linha)
    }
  })
  return raiz
}

/** O front matter de um DESIGN.md, já lido. */
export function lerFrontMatter(textoDoArquivo) {
  const texto = textoDoArquivo.replaceAll('\r\n', '\n')
  const achado = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(texto)
  if (!achado) throw new Error('DESIGN.md sem front matter (--- ... ---)')
  return lerYaml(achado[1])
}

// ---------------------------------------------------------------------------------------------------------------
// Valores
// ---------------------------------------------------------------------------------------------------------------

/** Número em texto curto e estável (até 6 casas, sem zeros à direita, nunca em notação científica). */
function numero(valor) {
  const texto = Number(valor.toFixed(6)).toString()
  return texto === '-0' ? '0' : texto
}

/** Uma dimensão do DESIGN.md (`24px` ou `1.5rem`) em px. */
function emPx(valor, caminho) {
  const partes = /^(-?\d+(?:\.\d+)?)(px|rem)$/.exec(String(valor ?? ''))
  if (!partes) throw new Error(`DESIGN.md: ${caminho} precisa ser uma dimensão em px ou rem (veio ${JSON.stringify(valor)})`)
  return Number(partes[1]) * (partes[2] === 'rem' ? 16 : 1)
}

function exigir(objeto, caminho) {
  let atual = objeto
  for (const parte of caminho.split('.')) {
    if (atual === null || typeof atual !== 'object' || !Object.hasOwn(atual, parte)) {
      throw new Error(`DESIGN.md: falta ${caminho} no front matter`)
    }
    atual = atual[parte]
  }
  return atual
}

/**
 * `clamp(<390>, <reta>, <1440>)`. A reta liga (390, a) a (1440, b): a + (100vw − 390px) × (b − a) / 1050, com
 * (b − a) em px, sem unidade, e a conta toda em inteiros (sem arredondar a inclinação). `a` e `b` em px.
 * Em rem, as pontas saem de `px / 16`: com a fonte a 100% elas batem exato. Igual nas duas pontas: valor constante.
 */
export function fluido(a, b, unidade) {
  const escrever = (px) => (unidade === 'rem' ? `${numero(px / 16)}rem` : `${numero(px)}px`)
  if (a === b) return escrever(a)
  const piso = escrever(Math.min(a, b))
  const teto = escrever(Math.max(a, b))
  const largura = VIEWPORT_MAX - VIEWPORT_MIN
  return `clamp(${piso}, calc(${escrever(a)} + (100vw - ${VIEWPORT_MIN}px) * ${numero(b - a)} / ${largura}), ${teto})`
}

// ---------------------------------------------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------------------------------------------

/** O texto do tema gerado, a partir do texto de um DESIGN.md. */
export function gerarTema(textoDoDesign) {
  const design = lerFrontMatter(textoDoDesign)
  const espaco = []
  const tipo = []
  const apelidosDeEspaco = []
  const apelidosDeTipo = []

  for (const papel of PAPEIS) {
    const a = emPx(exigir(design, `spacing.${papel}-390`), `spacing.${papel}-390`)
    const b = emPx(exigir(design, `spacing.${papel}-1440`), `spacing.${papel}-1440`)
    espaco.push(`  --espaco-${papel}: ${fluido(a, b, 'px')};`)
    if (!Object.hasOwn(SEM_APELIDO_DE_ESPACO, papel)) apelidosDeEspaco.push(`  --spacing-${papel}: var(--espaco-${papel});`)
  }

  const calha390 = emPx(exigir(design, 'spacing.quadro-calha-390'), 'spacing.quadro-calha-390')
  const calha1440 = emPx(exigir(design, 'spacing.quadro-calha-1440'), 'spacing.quadro-calha-1440')
  const largura = emPx(exigir(design, 'spacing.quadro-largura'), 'spacing.quadro-largura')
  const medio = emPx(exigir(design, 'spacing.medio'), 'spacing.medio')
  const leitura = emPx(exigir(design, 'spacing.leitura'), 'spacing.leitura')

  const quadro = [
    `  --quadro-largura: ${numero(largura)}px;`,
    `  --quadro-calha: ${fluido(calha390, calha1440, 'px')};`,
    `  --medio: ${numero(medio)}px;`,
    `  --leitura: ${numero(leitura)}px;`,
  ]
  apelidosDeEspaco.push('  --spacing-quadro-calha: var(--quadro-calha);')

  for (const nivel of NIVEIS) {
    const tamanho390 = emPx(exigir(design, `typography.${nivel}-390.fontSize`), `typography.${nivel}-390.fontSize`)
    const tamanho1440 = emPx(exigir(design, `typography.${nivel}-1440.fontSize`), `typography.${nivel}-1440.fontSize`)
    const entrelinha390 = emPx(exigir(design, `typography.${nivel}-390.lineHeight`), `typography.${nivel}-390.lineHeight`)
    const entrelinha1440 = emPx(exigir(design, `typography.${nivel}-1440.lineHeight`), `typography.${nivel}-1440.lineHeight`)
    tipo.push(`  --texto-${nivel}-tamanho: ${fluido(tamanho390, tamanho1440, 'rem')};`)
    tipo.push(`  --texto-${nivel}-entrelinha: ${fluido(entrelinha390, entrelinha1440, 'rem')};`)
    apelidosDeTipo.push(`  --text-${nivel}: var(--texto-${nivel}-tamanho);`)
    apelidosDeTipo.push(`  --text-${nivel}--line-height: var(--texto-${nivel}-entrelinha);`)
  }

  const semApelido = Object.entries(SEM_APELIDO_DE_ESPACO)
    .map(([papel, classe]) => `${papel} (${classe})`)
    .join(', ')

  return [
    '/* GERADO por web/scripts/gerar-tema.mjs a partir do front matter de web/DESIGN.md. NÃO EDITE À MÃO.',
    '   Para mudar um valor, edite web/DESIGN.md e rode `npm --prefix web run tema`.',
    '   O teste src/teste/harmonia.test.ts falha se este arquivo divergir de uma geração nova.',
    '',
    `   Cada variável fluida vale o valor de ${VIEWPORT_MIN} px até ${VIEWPORT_MIN} px de viewport, o de ${VIEWPORT_MAX} px a partir de ${VIEWPORT_MAX} px,`,
    '   e cresce em linha reta no meio. Espaço em px; tipo em rem (com a fonte a 100% as pontas batem exato).',
    '   Largura útil do quadro: min(var(--quadro-largura), 100vw - 2 * var(--quadro-calha)).',
    '',
    '   Apelidos do Tailwind (segundo bloco): espaço (padding, margin, gap...), tipo (text-<nível>) e largura',
    '   máxima (max-w-<nome>: medio, leitura, quadro). Sem apelido de espaço, por colisão com classes `pt-*` do',
    `   site: ${semApelido}. */`,
    '@theme static {',
    ...espaco,
    ...quadro,
    ...tipo,
    '}',
    '',
    '@theme inline {',
    ...apelidosDeEspaco,
    ...apelidosDeTipo,
    '  --container-medio: var(--medio);',
    '  --container-leitura: var(--leitura);',
    '  --container-quadro: var(--quadro-largura);',
    '}',
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------------------------------------------

function principal(argumentos) {
  const texto = readFileSync(CAMINHO_DESIGN, 'utf8')
  if (argumentos.includes('--json')) {
    process.stdout.write(`${JSON.stringify(lerFrontMatter(texto), null, 2)}\n`)
    return 0
  }
  const css = gerarTema(texto)
  if (argumentos.includes('--stdout')) {
    process.stdout.write(css)
    return 0
  }
  if (argumentos.includes('--check')) {
    let gravado = ''
    try {
      gravado = readFileSync(CAMINHO_SAIDA, 'utf8').replaceAll('\r\n', '\n')
    } catch {
      // arquivo ausente: diverge
    }
    if (gravado !== css) {
      process.stderr.write('harmonia.gerado.css diverge do DESIGN.md. Rode: npm --prefix web run tema\n')
      return 1
    }
    process.stdout.write('harmonia.gerado.css está em dia com o DESIGN.md.\n')
    return 0
  }
  writeFileSync(CAMINHO_SAIDA, css, 'utf8')
  process.stdout.write(`harmonia.gerado.css escrito (${css.split('\n').filter((l) => /^ {2}--/.test(l)).length} variáveis).\n`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = principal(process.argv.slice(2))
  } catch (erro) {
    process.stderr.write(`${erro instanceof Error ? erro.message : String(erro)}\n`)
    process.exitCode = 1
  }
}
