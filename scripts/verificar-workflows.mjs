// Confere os workflows do GitHub Actions (SEC-02 e SEC-03 da revisão de segurança).
// Rode da raiz: node scripts/verificar-workflows.mjs [pasta]   (padrão: .github/workflows)
// Sai com 0 só quando a pasta tem pelo menos um .yml e nenhum problema; senão sai com 1.
//
// Cada workflow é lido pelo pacote `yaml` (2.9.1, devDependency de web/) e as regras rodam
// sobre o objeto lido, não sobre linhas de texto: aspas, escapes `\u`, forma de fluxo e
// de bloco dão o mesmo objeto. O que o YAML não consegue ler (erro, aviso, chave duplicada,
// documento vazio) e o que não tem o tipo esperado é problema: nada não classificado passa.
//
// Regras:
// 1. Todo `uses:` de passo e de job (workflow reutilizável) é texto e termina em `@<40 hex>`
//    (um comentário `# vX` depois não faz parte do valor). Só `./caminho` local escapa.
// 2. Todo job que lê um segredo fora da lista pública declara `environment: banco-producao`.
//    Segredo fora de um job (env do workflow) é problema.
// 3. Todo passo actions/checkout tem `with.persist-credentials: false`.
// 4. Todo passo que lê VITE_SUPABASE_URL/ANON_KEY de `secrets` tem, antes dele no mesmo job,
//    um passo que falha com segredos vazios (jobs no banco-producao ficam de fora: os scripts
//    deles já exigem as variáveis).

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const AMBIENTE_PROTEGIDO = 'banco-producao'

// Segredos que um job pode ler sem o Environment protegido. GITHUB_TOKEN é o token
// efêmero do próprio Actions. VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY vão para o
// bundle público do site por desenho (a anon key vale só com RLS), então o job
// `construir` do pages.yml não precisa de Environment.
export const SEGREDOS_PUBLICOS = new Set(['GITHUB_TOKEN', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const PASTA_WORKFLOWS = join(RAIZ, '.github', 'workflows')

const PIN = /@[0-9a-f]{40}$/
const VITE = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

// O pacote vive em web/node_modules; scripts/ não tem node_modules próprio. Carrega na hora do uso
// para que importar este módulo nunca quebre; a falta do pacote vira problema, não aprovação.
let yamlCarregado
function carregarYaml() {
  if (!yamlCarregado) {
    try {
      yamlCarregado = { yaml: createRequire(join(RAIZ, 'web', 'package.json'))('yaml') }
    } catch (erro) {
      yamlCarregado = { erro: erro.message.split('\n')[0] }
    }
  }
  return yamlCarregado
}

const eMapa = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function tipoDe(v) {
  if (v === null) return 'nulo'
  if (Array.isArray(v)) return 'lista'
  return typeof v === 'object' ? 'mapa' : typeof v
}

// Percorre chaves e textos do objeto, em qualquer profundidade.
function caminhar(valor, visitante, vistos = new Set()) {
  if (typeof valor === 'string') return visitante.texto?.(valor)
  if (valor === null || typeof valor !== 'object' || vistos.has(valor)) return
  vistos.add(valor)
  if (Array.isArray(valor)) {
    for (const v of valor) caminhar(v, visitante, vistos)
    return
  }
  for (const [k, v] of Object.entries(valor)) {
    visitante.chave?.(k, v)
    visitante.texto?.(k)
    caminhar(v, visitante, vistos)
  }
}

// Corpos das expressões `${{ ... }}` de um texto. O fim é o primeiro `}}` fora de um literal 'texto'
// (aspas simples, '' é aspa escapada); sem fim, a expressão vai até o fim do texto (falha fechado).
function corposDeExpressao(texto) {
  const corpos = []
  let i = texto.indexOf('${{')
  while (i !== -1) {
    const ini = i + 3
    let j = ini
    let literal = false
    let fim = texto.length
    for (; j < texto.length; j++) {
      if (texto[j] === "'") literal = !literal
      else if (!literal && texto[j] === '}' && texto[j + 1] === '}') {
        fim = j
        break
      }
    }
    corpos.push(texto.slice(ini, fim))
    i = fim >= texto.length ? -1 : texto.indexOf('${{', fim + 2)
  }
  return corpos
}

// Segredos lidos numa expressão (corpo sem `${{ }}`): cada secrets.NOME vira o NOME; qualquer outra
// citação do contexto (`secrets[...]`, `toJSON(secrets)`, `secrets.*`, o que não der para classificar)
// vira `exibir`, o texto da expressão, e conta como leitura.
function segredosNaExpressao(corpo, exibir) {
  const nomes = []
  for (const m of corpo.matchAll(/\bsecrets\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)/gi)) nomes.push(m[1])
  const resto = corpo.replace(/\bsecrets\s*\.\s*[A-Za-z_][A-Za-z0-9_]*/gi, ' ')
  if (/\bsecrets\b/i.test(resto)) nomes.push(exibir)
  return nomes
}

const compacto = (s) => s.replace(/\s+/g, ' ').trim()

// Segredos lidos num texto. Só expressão lê segredo: o que está em `${{ }}` e o valor de uma chave
// `if` (que o Actions trata como expressão mesmo sem `${{ }}`). A palavra `secrets` em texto puro,
// como num script de `run:`, não é leitura.
function segredosEm(texto, { condicao = false } = {}) {
  const nomes = []
  if (condicao && !texto.includes('${{')) nomes.push(...segredosNaExpressao(texto, compacto(texto)))
  for (const corpo of corposDeExpressao(texto)) nomes.push(...segredosNaExpressao(corpo, `\${{ ${compacto(corpo)} }}`))
  return nomes
}

const publico = (nome) => SEGREDOS_PUBLICOS.has(nome.toUpperCase())

// Segredos não públicos que um job (ou um trecho) lê, incluindo `secrets: inherit` e o mapa `secrets`.
function segredosLidos(valor, { job = false } = {}) {
  const lidos = new Set()
  caminhar(valor, {
    texto: (s) => {
      for (const n of segredosEm(s)) if (!publico(n)) lidos.add(n)
    },
    chave: (k, v) => {
      if (k === 'secrets' && v === 'inherit') lidos.add('secrets: inherit')
      if (typeof k === 'string' && k.toLowerCase() === 'if' && typeof v === 'string') {
        for (const n of segredosEm(v, { condicao: true })) if (!publico(n)) lidos.add(n)
      }
    },
  })
  if (job && eMapa(valor)) {
    if (typeof valor.secrets === 'string') lidos.add(`secrets: ${valor.secrets}`)
    else if (eMapa(valor.secrets)) for (const k of Object.keys(valor.secrets)) if (!publico(k)) lidos.add(k)
  }
  return [...lidos]
}

function leSegredoVite(valor) {
  let le = false
  caminhar(valor, {
    texto: (s) => {
      if (segredosEm(s).some((n) => VITE.includes(n.toUpperCase()))) le = true
    },
    chave: (k, v) => {
      if (typeof k === 'string' && k.toLowerCase() === 'if' && typeof v === 'string') {
        if (segredosEm(v, { condicao: true }).some((n) => VITE.includes(n.toUpperCase()))) le = true
      }
    },
  })
  return le
}

// Passo que falha com segredos vazios: mapeia os dois VITE_SUPABASE_* no env e o `run` os nomeia e tem `exit`.
function ehGuarda(passo) {
  if (!eMapa(passo.env) || typeof passo.run !== 'string') return false
  if (!VITE.every((n) => Object.hasOwn(passo.env, n) && passo.run.includes(n)) || !passo.run.includes('exit')) return false
  // Um passo que pode ser pulado ou cuja falha é ignorada não protege nada.
  if (Object.hasOwn(passo, 'if')) return false
  const continua = passo['continue-on-error']
  return continua === undefined || continua === false || continua === 'false'
}

function persisteFalso(com) {
  if (!eMapa(com)) return false
  const chaves = Object.keys(com).filter((k) => k.toLowerCase() === 'persist-credentials')
  return chaves.length > 0 && chaves.every((k) => com[k] === false || com[k] === 'false')
}

// Environment do job: { valor, invalido }. `environment: x` ou `environment: { name: x }`.
function ambienteDe(job) {
  if (!Object.hasOwn(job, 'environment')) return { valor: null, invalido: false }
  const e = job.environment
  if (typeof e === 'string') return { valor: e, invalido: false }
  if (eMapa(e) && typeof e.name === 'string') return { valor: e.name, invalido: false }
  return { valor: null, invalido: true }
}

// Lê o texto pelo yaml. Devolve { raiz } ou { problemas } (o que não foi lido de forma limpa não é analisado).
function ler(texto, arquivo) {
  const carregado = carregarYaml()
  if (carregado.erro) {
    return { problemas: [`${arquivo}: não consegui carregar o pacote yaml (${carregado.erro}); rode npm --prefix web ci`] }
  }
  const { parseDocument, LineCounter } = carregado.yaml
  const contador = new LineCounter()
  const problemas = []
  let doc
  try {
    doc = parseDocument(texto, { lineCounter: contador })
  } catch (erro) {
    return { problemas: [`${arquivo}: YAML ilegível: ${erro.message}`] }
  }
  for (const [tipo, lista] of [['erro', doc.errors], ['aviso', doc.warnings]]) {
    for (const e of lista) {
      const linha = e.linePos?.[0]?.line
      problemas.push(`${arquivo}${linha ? `:${linha}` : ''}: YAML com ${tipo} (o arquivo não foi entendido): ${e.message.split('\n')[0]}`)
    }
  }
  if (problemas.length) return { problemas }
  let raiz
  try {
    raiz = doc.toJS()
  } catch (erro) {
    return { problemas: [`${arquivo}: YAML ilegível: ${erro.message}`] }
  }
  if (!eMapa(raiz)) return { problemas: [`${arquivo}: documento vazio ou que não é um mapa (o arquivo não foi entendido)`] }
  return { raiz }
}

// Nome do Environment do job (`environment: x` ou `environment:` + `name: x`), ou null.
export function ambienteDoJob(texto, nomeJob) {
  const { raiz } = ler(texto, 'workflow.yml')
  if (!raiz || !eMapa(raiz.jobs) || !eMapa(raiz.jobs[nomeJob])) return null
  return ambienteDe(raiz.jobs[nomeJob]).valor
}

function conferirUses(uses, rotulo, problema) {
  if (typeof uses !== 'string') {
    problema(`${rotulo}: uses sem pin por SHA de 40 hex: valor não é texto (${tipoDe(uses)})`)
    return
  }
  if (!uses.startsWith('./') && !PIN.test(uses)) problema(`${rotulo}: uses sem pin por SHA de 40 hex: ${uses}`)
}

// Devolve a lista de problemas do texto de um workflow, cada um começando por "arquivo:".
export function verificarTexto(texto, arquivo = 'workflow.yml') {
  const { raiz, problemas: falhas } = ler(texto, arquivo)
  if (!raiz) return falhas
  const problemas = []
  const p = (msg) => problemas.push(msg)

  const jobs = raiz.jobs
  if (jobs === undefined || (eMapa(jobs) && Object.keys(jobs).length === 0)) {
    p(`${arquivo}: nenhum job encontrado (o arquivo não foi entendido)`)
  } else if (!eMapa(jobs)) {
    p(`${arquivo}: jobs deve ser um mapa de jobs, recebi ${tipoDe(jobs)} (o arquivo não foi entendido)`)
  }

  // Segredos fora de qualquer job (env do workflow) não têm como ficar atrás do Environment.
  const fora = new Set()
  for (const [k, v] of Object.entries(raiz)) {
    if (k === 'jobs') continue
    caminhar({ [k]: v }, { texto: (s) => segredosEm(s).forEach((n) => fora.add(n)) })
  }
  if (fora.size) p(`${arquivo}: segredo lido fora de um job (${[...fora].join(', ')}); mova para um job com environment`)

  if (!eMapa(jobs)) return problemas

  for (const [nome, job] of Object.entries(jobs)) {
    const rotuloJob = `${arquivo}: job ${nome}`
    if (!eMapa(job)) {
      p(`${rotuloJob}: o job deve ser um mapa, recebi ${tipoDe(job)}`)
      continue
    }

    if (Object.hasOwn(job, 'uses')) conferirUses(job.uses, rotuloJob, p)

    const ambiente = ambienteDe(job)
    if (ambiente.invalido) p(`${rotuloJob}: environment deve ser texto ou mapa com name em texto, recebi ${tipoDe(job.environment)}`)
    const lidos = segredosLidos(job, { job: true })
    if (lidos.length && ambiente.valor !== AMBIENTE_PROTEGIDO) {
      p(`${arquivo}: job ${nome} lê ${lidos.join(', ')} sem environment: ${AMBIENTE_PROTEGIDO} (atual: ${ambiente.valor ?? 'nenhum'})`)
    }

    // Job no banco-producao (banco-nuvem.yml) passa os dois valores a scripts que já exigem as
    // variáveis preenchidas; o guard de segredo vazio vale para os demais jobs (o build do Pages).
    const exigeGuarda = ambiente.valor !== AMBIENTE_PROTEGIDO

    // Fora dos passos não há passo anterior que possa barrar um segredo vazio.
    const { steps, ...semPassos } = job
    if (exigeGuarda && leSegredoVite(semPassos)) {
      p(`${rotuloJob}: lê VITE_SUPABASE_* fora dos passos, sem passo anterior que falha com segredos vazios`)
    }

    if (!Object.hasOwn(job, 'steps')) continue
    if (!Array.isArray(steps)) {
      p(`${rotuloJob}: steps deve ser uma lista, recebi ${tipoDe(steps)}`)
      continue
    }
    let guardaVista = false
    steps.forEach((passo, i) => {
      const rotulo = `${rotuloJob}, passo ${i + 1}`
      if (!eMapa(passo)) {
        p(`${rotulo}: o passo deve ser um mapa, recebi ${tipoDe(passo)}`)
        return
      }
      if (Object.hasOwn(passo, 'uses')) {
        conferirUses(passo.uses, rotulo, p)
        if (typeof passo.uses === 'string' && /^actions\/checkout(?:[@/]|$)/i.test(passo.uses) && !persisteFalso(passo.with)) {
          p(`${rotulo}: checkout no job ${nome} sem persist-credentials: false`)
        }
      }
      if (ehGuarda(passo)) {
        guardaVista = true
      } else if (exigeGuarda && leSegredoVite(passo) && !guardaVista) {
        p(`${rotulo}: lê VITE_SUPABASE_* sem passo anterior que falha com segredos vazios`)
      }
    })
  }
  return problemas
}

// Confere todos os .yml/.yaml da pasta. Pasta sem workflow conta como problema.
export function verificarPasta(pasta) {
  const arquivos = readdirSync(pasta)
    .filter((n) => /\.ya?ml$/.test(n))
    .sort()
  const problemas = []
  if (arquivos.length === 0) problemas.push(`${pasta}: nenhum workflow .yml encontrado`)
  for (const nome of arquivos) {
    problemas.push(...verificarTexto(readFileSync(join(pasta, nome), 'utf8'), nome))
  }
  return { arquivos, problemas }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const pasta = process.argv[2] ? resolve(process.argv[2]) : PASTA_WORKFLOWS
  let resultado
  try {
    resultado = verificarPasta(pasta)
  } catch (erro) {
    console.error(`verificar-workflows: não consegui ler ${pasta}: ${erro.message}`)
    process.exit(1)
  }
  for (const problema of resultado.problemas) console.error(problema)
  if (resultado.problemas.length) {
    console.error(`verificar-workflows: ${resultado.problemas.length} problema(s) em ${resultado.arquivos.length} arquivo(s)`)
    process.exit(1)
  }
  console.log(`verificar-workflows: ${resultado.arquivos.length} arquivo(s) sem problema`)
}
