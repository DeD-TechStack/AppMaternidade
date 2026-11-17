// Confere os workflows do GitHub Actions (SEC-02 e SEC-03 da revisão de segurança).
// Rode da raiz: node scripts/verificar-workflows.mjs [pasta]   (padrão: .github/workflows)
// Sai com 0 só quando a pasta tem pelo menos um .yml e nenhum problema; senão sai com 1.
//
// Regras, linha a linha, sem dependência nova:
// 1. Todo `uses:` termina em `@<40 hex>` (um comentário `# vX` depois é permitido).
// 2. Todo job que lê um segredo fora da lista pública declara `environment: banco-producao`.
// 3. Todo passo actions/checkout tem `persist-credentials: false`.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const AMBIENTE_PROTEGIDO = 'banco-producao'

// Segredos que um job pode ler sem o Environment protegido. GITHUB_TOKEN é o token
// efêmero do próprio Actions. VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY vão para o
// bundle público do site por desenho (a anon key vale só com RLS), então o job
// `construir` do pages.yml não precisa de Environment.
export const SEGREDOS_PUBLICOS = new Set(['GITHUB_TOKEN', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])

const PIN = /@[0-9a-f]{40}$/

// Chave YAML em qualquer grafia válida: nua, 'aspas simples' ou "aspas duplas", com espaços
// opcionais antes dos dois-pontos. Devolve o texto de regex que casa a chave e os dois-pontos.
function chave(nome) {
  return `(?:"${nome}"|'${nome}'|${nome})\\s*:`
}

function recuo(linha) {
  return linha.length - linha.trimStart().length
}

function ignoravel(linha) {
  const t = linha.trim()
  return t === '' || t.startsWith('#')
}

function semComentario(valor) {
  return valor.replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '')
}

// Lista os jobs com o intervalo de linhas [inicio, fim) de cada um.
export function jobsDoWorkflow(texto) {
  const linhas = texto.split(/\r?\n/)
  const iJobs = linhas.findIndex((l) => new RegExp(`^${chave('jobs')}\\s*(#.*)?$`).test(l))
  if (iJobs < 0) return { linhas, iJobs, jobs: [] }
  const jobs = []
  let recuoJob = -1
  for (let i = iJobs + 1; i < linhas.length; i++) {
    const l = linhas[i]
    if (ignoravel(l)) continue
    const r = recuo(l)
    if (r === 0) break
    if (recuoJob < 0) recuoJob = r
    if (r === recuoJob) {
      const m = /^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_][\w-]*))\s*:\s*(#.*)?$/.exec(l)
      if (jobs.length) jobs[jobs.length - 1].fim = i
      jobs.push({ nome: m ? (m[1] ?? m[2] ?? m[3]) : l.trim(), inicio: i, fim: linhas.length })
    }
  }
  if (jobs.length) {
    const ultimo = jobs[jobs.length - 1]
    for (let i = ultimo.inicio + 1; i < linhas.length; i++) {
      if (!ignoravel(linhas[i]) && recuo(linhas[i]) === 0) {
        ultimo.fim = i
        break
      }
    }
  }
  return { linhas, iJobs, jobs }
}

// Nome do Environment do job (`environment: x` ou `environment:` + `name: x`), ou null.
export function ambienteDoJob(texto, nomeJob) {
  const { linhas, jobs } = jobsDoWorkflow(texto)
  const job = jobs.find((j) => j.nome === nomeJob)
  if (!job) return null
  return ambiente(linhas, job)
}

function ambiente(linhas, job) {
  let recuoProp = -1
  for (let i = job.inicio + 1; i < job.fim; i++) {
    const l = linhas[i]
    if (ignoravel(l)) continue
    if (recuoProp < 0) recuoProp = recuo(l)
    if (recuo(l) !== recuoProp) continue
    const m = new RegExp(`^\\s*${chave('environment')}\\s*(.*)$`).exec(l)
    if (!m) continue
    const inline = semComentario(m[1])
    if (inline) return inline
    for (let k = i + 1; k < job.fim; k++) {
      if (ignoravel(linhas[k])) continue
      if (recuo(linhas[k]) <= recuoProp) break
      const n = new RegExp(`^\\s*${chave('name')}\\s*(.*)$`).exec(linhas[k])
      if (n) return semComentario(n[1])
    }
    return ''
  }
  return null
}

// Passos do job: cada um é o intervalo de linhas que começa num `- ` no recuo de `steps:`.
function passos(linhas, job) {
  const lista = []
  const iSteps = linhas.findIndex((l, i) => i > job.inicio && i < job.fim && new RegExp(`^\\s*${chave('steps')}\\s*(#.*)?$`).test(l))
  if (iSteps < 0) return lista
  const recuoSteps = recuo(linhas[iSteps])
  let recuoPasso = -1
  for (let i = iSteps + 1; i < job.fim; i++) {
    const l = linhas[i]
    if (ignoravel(l)) continue
    if (recuo(l) <= recuoSteps && !/^\s*-\s/.test(l)) break
    if (recuoPasso < 0 && /^\s*-\s/.test(l)) recuoPasso = recuo(l)
    if (recuo(l) === recuoPasso && /^\s*-\s/.test(l)) {
      if (lista.length) lista[lista.length - 1].fim = i
      lista.push({ inicio: i, fim: job.fim })
    }
  }
  return lista
}

function usesDaLinha(l) {
  const m = new RegExp(`^\\s*(?:-\\s+)?${chave('uses')}\\s*(.+)$`).exec(l)
  return m ? semComentario(m[1]) : null
}

// Devolve a lista de problemas do texto de um workflow, cada um "arquivo:linha: mensagem".
export function verificarTexto(texto, arquivo = 'workflow.yml') {
  const problemas = []
  const { linhas, iJobs, jobs } = jobsDoWorkflow(texto)
  const p = (i, msg) => problemas.push(`${arquivo}:${i + 1}: ${msg}`)

  if (iJobs < 0 || jobs.length === 0) p(0, 'nenhum job encontrado (o arquivo não foi entendido)')

  // Forma de fluxo (`- { uses: ... }`, `steps: [...]`) não é lida linha a linha: falha fechado.
  linhas.forEach((l, i) => {
    if (ignoravel(l)) return
    if (/^\s*(?:-\s*)?\{/.test(l) || new RegExp(`^\\s*(?:${chave('steps')}|${chave('jobs')})\\s*[\\[{]`).test(l)) {
      p(i, 'forma de fluxo do YAML não é suportada pelo guard; escreva em forma de bloco')
    }
  })

  linhas.forEach((l, i) => {
    if (ignoravel(l)) return
    const alvo = usesDaLinha(l)
    if (alvo !== null && !PIN.test(alvo)) p(i, `uses sem pin por SHA de 40 hex: ${alvo}`)
  })

  // Segredos fora de qualquer job (env do workflow) não têm como ficar atrás do Environment.
  const dentroDeJob = (i) => jobs.some((j) => i > j.inicio && i < j.fim)
  linhas.forEach((l, i) => {
    if (ignoravel(l) || dentroDeJob(i)) return
    if (/secrets\s*[.[]/.test(l)) p(i, 'segredo lido fora de um job; mova para um job com environment')
  })

  for (const job of jobs) {
    const lidos = []
    for (let i = job.inicio + 1; i < job.fim; i++) {
      const l = linhas[i]
      if (ignoravel(l)) continue
      for (const m of l.matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
        if (!SEGREDOS_PUBLICOS.has(m[1])) lidos.push({ i, nome: m[1] })
      }
      if (/secrets\s*\[/.test(l)) lidos.push({ i, nome: 'secrets[...]' })
      if (new RegExp(`^\\s*${chave('secrets')}\\s*inherit\\b`).test(l)) lidos.push({ i, nome: 'secrets: inherit' })
    }
    if (lidos.length) {
      const amb = ambiente(linhas, job)
      if (amb !== AMBIENTE_PROTEGIDO) {
        const nomes = [...new Set(lidos.map((s) => s.nome))].join(', ')
        p(job.inicio, `job ${job.nome} lê ${nomes} sem environment: ${AMBIENTE_PROTEGIDO} (atual: ${amb ?? 'nenhum'})`)
      }
    }

    for (const passo of passos(linhas, job)) {
      let checkout = -1
      let persiste = false
      for (let i = passo.inicio; i < passo.fim; i++) {
        if (ignoravel(linhas[i])) continue
        const alvo = usesDaLinha(linhas[i])
        if (alvo && /^actions\/checkout@/.test(alvo)) checkout = i
        if (new RegExp(`^\\s*${chave('persist-credentials')}\\s*["']?false["']?\\s*(#.*)?$`).test(linhas[i])) persiste = true
      }
      if (checkout >= 0 && !persiste) p(checkout, `checkout no job ${job.nome} sem persist-credentials: false`)
    }
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

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const PASTA_WORKFLOWS = join(RAIZ, '.github', 'workflows')

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
