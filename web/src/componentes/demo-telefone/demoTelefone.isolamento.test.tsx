import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CartaoSessao } from '../app/CartaoSessao.tsx'
import { BarraRegistroRapido } from '../rotina/BarraRegistroRapido.tsx'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { TelefoneDemo } from './TelefoneDemo.tsx'

// Transitive isolation, build closure, native link containment, global-effect and lazy-boundary tests:
// - Uses the TypeScript AST parser to follow value imports, side-effect imports, value re-exports and literal dynamic imports.
// - Zero exemptions for dados/comum.ts or shared build chunks; fails loudly if build artifacts are missing.
// - Proves zero createClient/fetch/storage/URL/history/title side effects under both absent and mocked fictional VITE_SUPABASE_*.

const espioes = vi.hoisted(() => ({
  createClient: vi.fn(),
  motorCarregado: 0,
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: espioes.createClient }))
vi.mock('./motorDemo.ts', async (importarOriginal) => {
  espioes.motorCarregado += 1
  return importarOriginal()
})

const PASTA_WEB = process.cwd()
const PASTA_SRC = join(PASTA_WEB, 'src')
const PASTA_DEMO = join(PASTA_SRC, 'componentes', 'demo-telefone')
const PASTA_DIST = join(PASTA_WEB, 'dist')
const PASTA_ASSETS = join(PASTA_DIST, 'assets')

interface ArestaFonte {
  de: string
  para: string
  tipo: 'import' | 'side-effect' | 'reexport' | 'dynamic'
}

/** Parses a TS/TSX file via the TypeScript compiler AST and returns all runtime module specifiers. */
function dependenciasEmRuntime(caminhoArquivo: string): Array<{ especificador: string; tipo: ArestaFonte['tipo'] }> {
  const texto = readFileSync(caminhoArquivo, 'utf8')
  const kind = caminhoArquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(caminhoArquivo, texto, ts.ScriptTarget.Latest, true, kind)
  const saida: Array<{ especificador: string; tipo: ArestaFonte['tipo'] }> = []

  const visitar = (no: ts.Node) => {
    if (ts.isImportDeclaration(no) && ts.isStringLiteral(no.moduleSpecifier)) {
      const clausula = no.importClause
      if (!clausula) {
        saida.push({ especificador: no.moduleSpecifier.text, tipo: 'side-effect' })
      } else if (!clausula.isTypeOnly) {
        const temDefault = Boolean(clausula.name)
        const bindings = clausula.namedBindings
        const temNamespace = Boolean(bindings && ts.isNamespaceImport(bindings))
        const temNomeadoDeValor = Boolean(
          bindings && ts.isNamedImports(bindings) && bindings.elements.some((el) => !el.isTypeOnly),
        )
        if (temDefault || temNamespace || temNomeadoDeValor) {
          saida.push({ especificador: no.moduleSpecifier.text, tipo: 'import' })
        }
      }
    } else if (ts.isExportDeclaration(no) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) {
      if (!no.isTypeOnly) {
        const clausula = no.exportClause
        const temExportDeValor =
          !clausula ||
          ts.isNamespaceExport(clausula) ||
          (ts.isNamedExports(clausula) && clausula.elements.some((el) => !el.isTypeOnly))
        if (temExportDeValor) {
          saida.push({ especificador: no.moduleSpecifier.text, tipo: 'reexport' })
        }
      }
    } else if (
      ts.isCallExpression(no) &&
      no.expression.kind === ts.SyntaxKind.ImportKeyword &&
      no.arguments.length >= 1 &&
      ts.isStringLiteralLike(no.arguments[0])
    ) {
      saida.push({ especificador: no.arguments[0].text, tipo: 'dynamic' })
    }
    ts.forEachChild(no, visitar)
  }

  visitar(sf)
  return saida
}

function resolverRelativo(arquivoAtual: string, especificador: string): string | null {
  if (!especificador.startsWith('.')) return null
  const base = resolve(dirname(arquivoAtual), especificador)
  for (const candidato of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidato) && /\.(ts|tsx)$/.test(candidato)) return candidato
  }
  return null
}

function caminharGrafoAst(raizes: string[]): { visitadosRel: Set<string>; arestas: ArestaFonte[] } {
  const visitados = new Set<string>()
  const visitadosRel = new Set<string>()
  const arestas: ArestaFonte[] = []
  const fila = [...raizes]

  while (fila.length > 0) {
    const atual = fila.shift()!
    if (visitados.has(atual)) continue
    visitados.add(atual)
    const relAtual = relative(PASTA_SRC, atual).replaceAll('\\', '/')
    visitadosRel.add(relAtual)

    for (const { especificador, tipo } of dependenciasEmRuntime(atual)) {
      const resolvido = resolverRelativo(atual, especificador)
      if (resolvido) {
        const relDestino = relative(PASTA_SRC, resolvido).replaceAll('\\', '/')
        arestas.push({ de: relAtual, para: relDestino, tipo })
        fila.push(resolvido)
      } else {
        arestas.push({ de: relAtual, para: especificador, tipo })
      }
    }
  }
  return { visitadosRel, arestas }
}

function importsEstaticosDoBundle(codigo: string): string[] {
  const achados = new Set<string>()
  for (const m of codigo.matchAll(/\bfrom\s*["'`]\.\/([^"'`]+\.js)["'`]/g)) achados.add(m[1])
  for (const m of codigo.matchAll(/\bimport\s*["'`]\.\/([^"'`]+\.js)["'`]/g)) achados.add(m[1])
  return [...achados]
}

function importsDinamicosDoBundle(codigo: string): string[] {
  const achados = new Set<string>()
  for (const m of codigo.matchAll(/import\(\s*["'`]\.\/([^"'`]+\.js)["'`]\s*\)/g)) achados.add(m[1])
  return [...achados]
}

function fechoDoBundle(raizes: string[], incluirDinamicos: boolean, ignorarChunk?: string): Map<string, string> {
  const lidos = new Map<string, string>()
  const fila = [...raizes]
  while (fila.length > 0) {
    const nome = fila.shift()!
    if (lidos.has(nome) || (ignorarChunk && nome === ignorarChunk)) continue
    const caminho = join(PASTA_ASSETS, nome)
    if (!existsSync(caminho)) {
      throw new Error(`Chunk referenciado ausente em dist/assets: ${nome}`)
    }
    const codigo = readFileSync(caminho, 'utf8')
    lidos.set(nome, codigo)
    for (const est of importsEstaticosDoBundle(codigo)) {
      if (!ignorarChunk || est !== ignorarChunk) fila.push(est)
    }
    if (incluirDinamicos) {
      for (const din of importsDinamicosDoBundle(codigo)) {
        if (!ignorarChunk || din !== ignorarChunk) fila.push(din)
      }
    }
  }
  return lidos
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.style.removeProperty('scroll-padding-bottom')
  espioes.createClient.mockReset()
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.style.removeProperty('scroll-padding-bottom')
})

describe('isolamento do grafo de módulos da demo (AST transitivo e build emitido)', () => {
  it('controle positivo do walker AST: dados/comum.ts alcança dados/cliente.ts e @supabase/supabase-js', () => {
    const { visitadosRel, arestas } = caminharGrafoAst([join(PASTA_SRC, 'dados', 'comum.ts')])
    expect(visitadosRel.has('dados/cliente.ts')).toBe(true)
    expect(arestas.some((a) => a.de === 'dados/cliente.ts' && a.para === '@supabase/supabase-js' && a.tipo === 'dynamic')).toBe(true)
  })

  it('caminhada AST transitiva a partir de todas as raízes da demo: zero Supabase, cliente, comum.ts, Partes.tsx ou sessão', () => {
    const raizes = readdirSync(PASTA_DEMO)
      .filter((nome) => /\.tsx?$/.test(nome) && !nome.includes('.test.'))
      .sort()
      .map((nome) => join(PASTA_DEMO, nome))

    const nomesRaizes = raizes.map((p) => basename(p))
    for (const esperado of [
      'DemoTelefoneMotor.tsx',
      'FluxosDemo.tsx',
      'ProvedorDemoRotina.tsx',
      'RoteadorIsolado.tsx',
      'TelefoneDemo.tsx',
      'motorDemo.ts',
      'relogioDemo.ts',
      'textos.ts',
      'textosCasca.ts',
      'useInertNaFaixa.ts',
    ]) {
      expect(nomesRaizes).toContain(esperado)
    }

    const { visitadosRel, arestas } = caminharGrafoAst(raizes)

    // Prova que os ramos reais de memória e componentes reutilizados foram efetivamente percorridos.
    for (const ramoEsperado of [
      'dados/conta.memoria.ts',
      'dados/rotina.memoria.ts',
      'dados/rotina.dia.ts',
      'dados/conta.erros.ts',
      'dados/rotina.erros.ts',
      'componentes/conta/BlocoMembros.tsx',
      'componentes/conta/datas.ts',
      'componentes/conta/fusos.ts',
      'componentes/rotina/AvisoDeErro.tsx',
      'componentes/rotina/BarraRegistroRapido.tsx',
      'componentes/rotina/FormularioNota.tsx',
      'componentes/app/CartaoSessao.tsx',
    ]) {
      expect(visitadosRel.has(ramoEsperado), `ramo esperado ausente: ${ramoEsperado}`).toBe(true)
    }

    const proibido =
      /^@supabase\/|\.supabase\.ts$|^dados\/cliente\.ts$|^dados\/comum\.ts$|^dados\/(conta|rotina)\.ts$|^componentes\/conta\/Partes\.tsx$|componentes\/conta\/sessao\.tsx$|ProvedorRotina\.tsx$|dadosRotina\.tsx$|madrugada\.ts$/

    const violacoes = arestas
      .filter((a) => proibido.test(a.para))
      .map((a) => `${a.de} --(${a.tipo})--> ${a.para}`)

    expect(violacoes).toEqual([])
  })

  it('no build emitido: entrada sem motor/memória e fecho estático+dinâmico do motor (incluindo chunks compartilhados) sem Supabase/cliente', () => {
    const htmlPath = join(PASTA_DIST, 'index.html')
    expect(existsSync(htmlPath), 'dist/index.html precisa existir (rode npm run build antes)').toBe(true)

    const html = readFileSync(htmlPath, 'utf8')
    const raizesEntrada = [...html.matchAll(/(?:src|href)=["'][^"']*\/assets\/([^"']+\.js)["']/g)].map((m) => basename(m[1]))
    expect(raizesEntrada.length).toBeGreaterThan(0)
    const chunkIndiceHost = raizesEntrada.find((n) => /^index-.*\.js$/.test(n))
    expect(chunkIndiceHost).toBeDefined()

    const fechoEntrada = fechoDoBundle(raizesEntrada, false)
    const nomesEntrada = [...fechoEntrada.keys()]
    expect(nomesEntrada.some((n) => /DemoTelefoneMotor|motorDemo|rotina\.memoria|conta\.memoria/i.test(n))).toBe(false)

    const chunksDemo = readdirSync(PASTA_ASSETS).filter((n) => /^DemoTelefoneMotor-.*\.js$/.test(n))
    expect(chunksDemo).toHaveLength(1)

    // Sem isenção de comum-*.js: segue TODOS os imports estáticos e dinâmicos do motor e seus chunks compartilhados,
    // parando apenas no chunk raiz do roteador hospedeiro (`index-*.js`, que hospeda o runtime React e todas as rotas do site).
    const fechoMotorCompleto = fechoDoBundle(chunksDemo, true, chunkIndiceHost)
    const nomesMotor = [...fechoMotorCompleto.keys()]
    expect(nomesMotor.some((n) => /^conta\.memoria-/.test(n))).toBe(true)
    expect(nomesMotor.some((n) => /^rotina\.memoria-/.test(n))).toBe(true)
    expect(nomesMotor.some((n) => /^comum\.puro-/.test(n))).toBe(true)
    expect(nomesMotor.some((n) => /^partesClasses-/.test(n))).toBe(true)
    expect(nomesMotor.some((n) => /^BlocoMembros-/.test(n))).toBe(true)
    expect(nomesMotor.some((n) => /^FormularioNota-/.test(n))).toBe(true)

    const violacoesBuild: string[] = []
    for (const [nome, codigo] of fechoMotorCompleto) {
      if (/supabase|^comum-[^-]|^Partes-/i.test(nome)) violacoesBuild.push(`chunk proibido: ${nome}`)
      if (/GoTrueClient|RealtimeClient|createClient\(|VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|obterCliente|bancoConfigurado/.test(codigo)) {
        violacoesBuild.push(`assinatura de nuvem/Supabase em ${nome}`)
      }
    }
    expect(violacoesBuild).toEqual([])
  })
})

describe('fronteira sob demanda, ativação nativa de links e isolamento de efeitos globais', () => {
  it('abrir a Início não carrega o motor da demo até o visitante tocar em Experimentar', async () => {
    const antes = espioes.motorCarregado
    const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: ['/'] })
    render(<RouterProvider router={roteador} />)
    await screen.findByRole('heading', { level: 1 })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(espioes.motorCarregado).toBe(antes)
    expect(screen.getAllByRole('button', { name: /^Experimentar/ })).toHaveLength(4)
  })

  it.each([
    { cenario: 'sem VITE_SUPABASE_* configuradas', url: '', chave: '' },
    { cenario: 'com VITE_SUPABASE_* fictícias mockadas', url: 'https://demo-isolamento.invalid', chave: 'chave-ficticia-isolamento' },
  ])(
    '($cenario) links nunca emitem /app/... no href, bloqueiam ativação nativa e não chamam createClient, fetch ou storage',
    async ({ url, chave }) => {
      vi.stubEnv('VITE_SUPABASE_URL', url)
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)
      const fetchEspiao = vi.fn(() => Promise.reject(new Error('rede bloqueada')))
      vi.stubGlobal('fetch', fetchEspiao)

      const tituloAntes = document.title
      const urlAntes = window.location.href
      const historicoAntes = window.history.length
      const setLocal = vi.spyOn(Storage.prototype, 'setItem')
      const getLocal = vi.spyOn(Storage.prototype, 'getItem')

      const roteador = createMemoryRouter(
        [
          {
            path: '/',
            element: (
              <div>
                <TelefoneDemo fluxo="historico" />
                <TelefoneDemo fluxo="hoje" />
              </div>
            ),
          },
        ],
        { initialEntries: ['/'] },
      )
      render(<RouterProvider router={roteador} />)

      setLocal.mockClear()
      getLocal.mockClear()

      fireEvent.click(screen.getByRole('button', { name: 'Experimentar Histórico' }))
      fireEvent.click(screen.getByRole('button', { name: 'Experimentar Hoje à noite' }))
      const painelHistorico = await screen.findByRole('group', { name: 'Tela interativa do Histórico' })
      const painelHoje = await screen.findByRole('group', { name: 'Tela interativa de Hoje à noite' })

      const linksHistorico = await within(painelHistorico).findAllByRole('link', { name: /Fralda, Xixi/i })
      const linkVerSessao = await within(painelHoje).findByRole('link', { name: 'Ver sessão' })

      for (const ancora of [...painelHistorico.querySelectorAll('a[href]'), ...painelHoje.querySelectorAll('a[href]')]) {
        const href = ancora.getAttribute('href') ?? ''
        expect(href).not.toMatch(/^\/app\b/)
        expect(href).toBe('#demo-previa')
      }

      for (const alvo of [linksHistorico[0], linkVerSessao]) {
        const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 })
        alvo.dispatchEvent(ctrl)
        expect(ctrl.defaultPrevented).toBe(true)

        const meta = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true, button: 0 })
        alvo.dispatchEvent(meta)
        expect(meta.defaultPrevented).toBe(true)

        const aux = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })
        alvo.dispatchEvent(aux)
        expect(aux.defaultPrevented).toBe(true)
      }

      fireEvent.click(linksHistorico[0])
      await within(painelHistorico).findByText('Detalhe do registro')
      fireEvent.click(within(painelHistorico).getByRole('link', { name: 'Voltar' }))
      await within(painelHistorico).findAllByRole('link', { name: /Fralda, Xixi/i })

      fireEvent.click(linkVerSessao)
      await within(painelHoje).findByText(/Toque em Encerrar para somar/i)

      expect(espioes.createClient).not.toHaveBeenCalled()
      expect(fetchEspiao).not.toHaveBeenCalled()
      expect(setLocal).not.toHaveBeenCalled()
      expect(getLocal).not.toHaveBeenCalled()
      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
      expect(window.location.href).toBe(urlAntes)
      expect(window.history.length).toBe(historicoAntes)
      expect(document.title).toBe(tituloAntes)
    },
  )

  it('duas demos abertas com BarraRegistroRapido embutida nunca alteram nem apagam scroll-padding-bottom do html e CartaoSessao não monta ilustrações ocultas', async () => {
    document.documentElement.style.setProperty('scroll-padding-bottom', '24px')

    const roteador = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <div>
              <TelefoneDemo fluxo="historico" />
              <TelefoneDemo fluxo="hoje" />
            </div>
          ),
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={roteador} />)

    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Histórico' }))
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Hoje à noite' }))
    const painelHistorico = await screen.findByRole('group', { name: 'Tela interativa do Histórico' })
    const painelHoje = await screen.findByRole('group', { name: 'Tela interativa de Hoje à noite' })

    expect(document.documentElement.style.scrollPaddingBottom).toBe('24px')

    const cartaoSessao = painelHoje.querySelector('[data-andamento]')!
    expect(cartaoSessao.querySelector('[data-desenho]')).toBeNull()
    expect(cartaoSessao.querySelectorAll('img')).toHaveLength(0)

    fireEvent.click(within(painelHistorico).getByRole('button', { name: /Voltar à imagem/i }))
    expect(document.documentElement.style.scrollPaddingBottom).toBe('24px')

    fireEvent.click(within(painelHoje).getByRole('button', { name: /Voltar à imagem/i }))
    expect(document.documentElement.style.scrollPaddingBottom).toBe('24px')
  })

  it('padrões canônicos de BarraRegistroRapido e CartaoSessao permanecem intactos quando usados sem as props de embutimento', () => {
    const roteador = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <div>
              <CartaoSessao
                sessao={{ id: 's1', tipo: 'sono', inicio: Date.now() - 60_000, pessoa: 'Ícaro' }}
                agora={Date.now()}
                aoEncerrar={() => undefined}
              />
              <BarraRegistroRapido
                nome="Heloísa"
                textoNoLugarDosBotoes={null}
                carregando={false}
                ocupados={new Set()}
                sessaoAtiva={null}
                confirmacao={null}
                aoIniciar={() => undefined}
                aoFralda={() => undefined}
                aoMais={() => undefined}
                aoAcionar={() => undefined}
              />
            </div>
          ),
        },
      ],
      { initialEntries: ['/'] },
    )
    const { container } = render(<RouterProvider router={roteador} />)
    expect(container.querySelector('[data-barra-registrar]')?.className).toContain('barra-fixa')
    expect(container.querySelector('[data-andamento] [data-desenho]')).not.toBeNull()
  })
})
