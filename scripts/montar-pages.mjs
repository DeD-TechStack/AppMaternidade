#!/usr/bin/env node
// Monta o artefato único do GitHub Pages: o build da main na raiz e o build do int/refazer em previa/.
// Uso: node scripts/montar-pages.mjs --raiz <dist main> --previa <dist int> --saida <pasta>
//        --sha <sha do int> --rotas <web/src do checkout do int>
// Em todo .html da prévia, o script remove qualquer meta robots já existente e insere um só,
// canônico (noindex, nofollow), logo após <head>, mais o selo antes de </body>.
// Saída: 0 com o resumo em JSON no stdout; 1 em falha de entrada, de html ou de byte da raiz;
// 2 em erro de uso ou em rota obrigatória ausente. Só Node, sem dependências.
//
// Gancho só para o teste (controle negativo): a variável de ambiente
// MONTAR_PAGES_TESTE_MUTAR=<caminho relativo> inverte um byte desse arquivo da raiz em --saida
// (ou cria o arquivo se ausente), antes da conferência final. Não use fora do teste.

import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

const ROTAS_OBRIGATORIAS = [
  'como-funciona',
  'cuidado-compartilhado',
  'desenvolvimento',
  'regras-da-comunidade',
  'privacidade',
  'termos',
  'exclusao-de-conta',
  'contato',
  'sobre',
  'entrar',
  'criar-conta',
  'app/conta',
  'app/comunidade',
  'app/desenvolvimento',
  'moderacao',
]

const ROBOTS = '<meta name="robots" content="noindex, nofollow">'

function falhar(codigo, mensagem) {
  process.stderr.write(`erro: ${mensagem}\n`)
  process.exit(codigo)
}

function lerArgumentos(argv) {
  const nomes = ['raiz', 'previa', 'saida', 'sha', 'rotas']
  const valores = {}
  for (let i = 0; i < argv.length; i += 2) {
    const chave = argv[i]
    if (!chave.startsWith('--') || !nomes.includes(chave.slice(2))) {
      falhar(2, `argumento desconhecido "${chave}"`)
    }
    const valor = argv[i + 1]
    if (valor === undefined || valor.startsWith('--')) falhar(2, `falta o valor de ${chave}`)
    valores[chave.slice(2)] = valor
  }
  for (const nome of nomes) {
    if (!valores[nome]) falhar(2, `informe --${nome}`)
  }
  return valores
}

function exigirPasta(caminho, rotulo) {
  if (!existsSync(caminho) || !statSync(caminho).isDirectory()) {
    falhar(1, `a pasta de ${rotulo} não existe: ${caminho}`)
  }
}

// Lista os arquivos de uma pasta como caminhos relativos com "/", ordenados.
function listarArquivos(base, rel = '') {
  const lista = []
  for (const e of readdirSync(join(base, rel), { withFileTypes: true })) {
    const caminho = rel === '' ? e.name : `${rel}/${e.name}`
    if (e.isDirectory()) lista.push(...listarArquivos(base, caminho))
    else if (e.isFile()) lista.push(caminho)
  }
  return lista.sort()
}

function hashArquivo(caminho) {
  return createHash('sha256').update(readFileSync(caminho)).digest('hex')
}

function caminhoReal(base, rel) {
  return join(base, ...rel.split('/'))
}

// Extrai os `path: '<literal>'` de um fonte de rotas, juntando os aninhados por "/".
// Heurística por profundidade de chaves: um objeto com path aberto é o pai dos paths
// que aparecem dentro dele até a chave que o fecha. Literais com "*" ou ":" são ignorados
// (e levam os filhos junto).
function extrairCaminhos(fonte) {
  const caminhos = []
  const pilha = [] // { profundidade, caminho (null quando ignorado) }
  let profundidade = 0
  const padrao = /path\s*:\s*(['"])(.*?)\1|[{}]/g
  for (const m of fonte.matchAll(padrao)) {
    if (m[0] === '{') {
      profundidade += 1
    } else if (m[0] === '}') {
      while (pilha.length > 0 && pilha[pilha.length - 1].profundidade >= profundidade) pilha.pop()
      profundidade -= 1
    } else {
      const literal = m[2].replace(/^\/+|\/+$/g, '')
      const pai = pilha.length > 0 ? pilha[pilha.length - 1] : null
      let completo = null
      if (pai === null) completo = literal
      else if (pai.caminho !== null) completo = literal === '' ? pai.caminho : `${pai.caminho}/${literal}`
      if (completo !== null && (completo.includes('*') || completo.includes(':') || completo === '')) {
        completo = null
      }
      pilha.push({ profundidade, caminho: completo })
      if (completo !== null) caminhos.push(completo)
    }
  }
  return caminhos
}

function coletarRotas(pastaRotas) {
  const principal = join(pastaRotas, 'rotas.tsx')
  if (!existsSync(principal)) falhar(1, `não achei rotas.tsx em ${pastaRotas}`)
  const fontes = [principal]
  const extra = join(pastaRotas, 'rotas')
  if (existsSync(extra) && statSync(extra).isDirectory()) {
    for (const e of readdirSync(extra, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      // Testes não definem rotas do site.
      if (e.isFile() && e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx')) fontes.push(join(extra, e.name))
    }
  }
  const conjunto = new Set()
  for (const arquivo of fontes) {
    for (const c of extrairCaminhos(readFileSync(arquivo, 'utf8'))) conjunto.add(c)
  }
  return [...conjunto].sort()
}

// Qualquer elemento meta robots, em qualquer forma: autofechado ou não, atributos em qualquer
// ordem, aspas simples, duplas ou ausentes, caixa qualquer.
const META_ROBOTS = /<meta\b[^>]*\bname\s*=\s*["']?robots["']?[^>]*>/gi

// Tira todo meta robots que o build já trouxe, põe o canônico logo após <head> e o selo
// logo antes do último </body>. O resultado tem exatamente um meta robots.
function marcarComoPrevia(original, selo, rotulo) {
  const texto = original.replace(META_ROBOTS, '')
  const fim = texto.toLowerCase().lastIndexOf('</body>')
  if (fim === -1) falhar(1, `${rotulo} não tem </body>`)
  const cabeca = /<head(?:\s[^>]*)?>/i.exec(texto)
  if (cabeca === null) falhar(1, `${rotulo} não tem <head>`)
  const posCabeca = cabeca.index + cabeca[0].length
  if (posCabeca > fim) falhar(1, `${rotulo} tem <head> depois de </body>`)
  return texto.slice(0, posCabeca) + ROBOTS + texto.slice(posCabeca, fim) + selo + texto.slice(fim)
}

// O Vite publica a entrada em <base>/assets/. Aceita só bases locais canônicas;
// nenhum dado da URL visitada participa dos caminhos ou do HTML gerado.
function baseDoBuild(documento, rotulo) {
  const entrada = /<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+)["'][^>]*>/i.exec(documento)
  const base = entrada && /^((?:\/[\w.-]+)*\/)assets\/[\w.-]+\.js$/.exec(entrada[1])
  if (!base || base[1].split('/').some((parte) => parte === '.' || parte === '..')) {
    falhar(1, `${rotulo} não tem entrada Vite com base local canônica`)
  }
  return base[1]
}

function montarFallback(raizHtml, previaHtml) {
  const base = baseDoBuild(raizHtml, '404.html da raiz')
  const basePrevia = baseDoBuild(previaHtml, '404.html da prévia')
  if (basePrevia !== `${base}previa/`) falhar(1, 'a base da prévia não corresponde à raiz + previa/')
  // Script externo síncrono: o parser recebe o documento escolhido, com a CSP
  // original antes de qualquer bundle. Não há fetch, redirect, eval ou HTML de URL.
  // document.write é deliberado aqui: é a entrada do parser, nunca um callback async.
  const bootstrap = `const prefixo = ${JSON.stringify(basePrevia)};\n` +
    'const previa = location.pathname === prefixo.slice(0, -1) || location.pathname.startsWith(prefixo);\n' +
    `document.write(previa ? ${JSON.stringify(previaHtml)} : ${JSON.stringify(raizHtml)});\n`
  // O charset precisa preceder o script clássico: sem cabeçalho HTTP, ele também
  // define a decodificação dos documentos UTF-8 embutidos no bootstrap.
  return {
    '404.html': `<!doctype html>\n<meta charset="UTF-8">\n<script src="${base}pages-fallback.js"></script>\n`,
    'pages-fallback.js': bootstrap,
  }
}

const args = lerArgumentos(process.argv.slice(2))
const raiz = resolve(args.raiz)
const previa = resolve(args.previa)
const saida = resolve(args.saida)
const rotasDir = resolve(args.rotas)

if (!/^[0-9A-Za-z]{7,}$/.test(args.sha)) falhar(2, '--sha precisa ter ao menos 7 caracteres alfanuméricos')
const sha7 = args.sha.slice(0, 7)

exigirPasta(raiz, '--raiz')
exigirPasta(previa, '--previa')
exigirPasta(rotasDir, '--rotas')
if (existsSync(saida) && readdirSync(saida).length > 0) falhar(2, `--saida precisa estar vazia: ${saida}`)
if (existsSync(join(raiz, 'previa'))) falhar(2, '--raiz já tem uma pasta previa/, que colidiria com a prévia')
if (existsSync(join(raiz, 'pages-fallback.js'))) falhar(2, '--raiz já tem pages-fallback.js')
for (const [pasta, rotulo] of [[raiz, 'raiz'], [previa, 'prévia']]) {
  if (!existsSync(join(pasta, '404.html'))) falhar(1, `${rotulo} não tem 404.html`)
}

// Rotas primeiro: se faltar uma obrigatória, nada é escrito.
const rotas = coletarRotas(rotasDir)
const ausentes = ROTAS_OBRIGATORIAS.filter((r) => !rotas.includes(r))
if (ausentes.length > 0) falhar(2, `rotas obrigatórias ausentes em ${rotasDir}: ${ausentes.join(', ')}`)

// (a) a raiz, byte a byte.
mkdirSync(saida, { recursive: true })
cpSync(raiz, saida, { recursive: true })

// (b) a prévia em previa/.
const saidaPrevia = join(saida, 'previa')
cpSync(previa, saidaPrevia, { recursive: true })

// (c) robots e selo em todo .html da prévia.
const selo =
  '<div data-previa role="note" aria-label="Prévia do site em construção">Prévia · ' +
  sha7 +
  '</div>'
const arquivosPrevia = listarArquivos(saidaPrevia)
for (const rel of arquivosPrevia) {
  if (!rel.toLowerCase().endsWith('.html')) continue
  const caminho = caminhoReal(saidaPrevia, rel)
  writeFileSync(caminho, marcarComoPrevia(readFileSync(caminho, 'utf8'), selo, `previa/${rel}`), 'utf8')
}

// (d) deep links: cada rota estática vira <rota>/index.html com o index da prévia.
const indexPrevia = join(saidaPrevia, 'index.html')
if (!existsSync(indexPrevia)) falhar(1, 'a prévia não tem index.html')
const conteudoIndex = readFileSync(indexPrevia, 'utf8')
const rotasEscritas = []
for (const rota of rotas) {
  // Pasta que o build da prévia já trouxe não é sobrescrita.
  if (existsSync(caminhoReal(previa, rota))) continue
  const destino = caminhoReal(saidaPrevia, `${rota}/index.html`)
  mkdirSync(join(destino, '..'), { recursive: true })
  writeFileSync(destino, conteudoIndex, 'utf8')
  rotasEscritas.push(rota)
}

// (e) Pages só consulta o 404 da raiz. Estas são as únicas exceções de integridade.
const geradosRaiz = montarFallback(readFileSync(join(raiz, '404.html'), 'utf8'), readFileSync(join(saidaPrevia, '404.html'), 'utf8'))
for (const [rel, conteudo] of Object.entries(geradosRaiz)) writeFileSync(join(saida, rel), conteudo, 'utf8')

// Gancho do teste: estraga um byte da raiz antes da conferência.
const mutar = process.env.MONTAR_PAGES_TESTE_MUTAR
if (mutar) {
  const alvo = caminhoReal(saida, mutar)
  const bytes = existsSync(alvo) ? readFileSync(alvo) : Buffer.alloc(0)
  if (bytes.length === 0) writeFileSync(alvo, Buffer.from([0x01]))
  else {
    bytes[0] ^= 0xff
    writeFileSync(alvo, bytes)
  }
}

// (a) conferência: cada arquivo da raiz em --saida tem o mesmo hash que em --raiz.
const arquivosRaiz = listarArquivos(raiz)
const linhas = []
for (const rel of arquivosRaiz) {
  const original = hashArquivo(caminhoReal(raiz, rel))
  const esperado = Object.hasOwn(geradosRaiz, rel)
    ? createHash('sha256').update(geradosRaiz[rel], 'utf8').digest('hex')
    : original
  const copia = caminhoReal(saida, rel)
  if (!existsSync(copia)) falhar(1, `arquivo da raiz ausente na saída: ${rel}`)
  if (hashArquivo(copia) !== esperado) falhar(1, `arquivo da raiz diferente na saída: ${rel}`)
  linhas.push(`${rel} ${original}\n`)
}
const naRaizDaSaida = listarArquivos(saida).filter((rel) => rel !== 'previa' && !rel.startsWith('previa/'))
for (const [rel, conteudo] of Object.entries(geradosRaiz)) {
  const copia = join(saida, rel)
  if (!existsSync(copia) || !readFileSync(copia).equals(Buffer.from(conteudo, 'utf8'))) {
    falhar(1, `artefato gerado diferente na saída: ${rel}`)
  }
}
const conhecidos = new Set([...arquivosRaiz, ...Object.keys(geradosRaiz)])
for (const rel of naRaizDaSaida) {
  if (!conhecidos.has(rel)) falhar(1, `arquivo a mais na raiz da saída: ${rel}`)
}

const resumo = {
  raizExcecoes: Object.keys(geradosRaiz),
  raizArquivos: arquivosRaiz.length,
  raizSha256: createHash('sha256').update(linhas.sort().join(''), 'utf8').digest('hex'),
  previaArquivos: listarArquivos(saidaPrevia).length,
  rotasEscritas,
}
process.stdout.write(`${JSON.stringify(resumo)}\n`)
