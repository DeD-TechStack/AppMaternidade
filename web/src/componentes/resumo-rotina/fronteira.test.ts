import { join, posix, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listarFontes, type Fonte } from '../../teste/fontes.ts'
import { importsDe, literaisDeTexto, semComentarios } from '../../teste/varreduras.ts'

// RF12, os testes de prova da peça do resumo da rotina (RN-01, RN-04 e RN-05), com as varreduras de
// `teste/varreduras.ts` (as de `paginas/comunidade/estatico.test.ts`):
//  - T-FRONT: a fronteira do cuidado, direta e indireta, com os dois pontos de passagem (a sessão e o `index.ts` da
//    peça) como nós de parada;
//  - T-LIT: nenhum texto de interface escrito nos `.tsx` da peça;
//  - T-ARM: nada no navegador e nenhum `console`, na peça e em todo módulo que ela alcança.
// Cada prova tem contraprovas plantadas (FRONT-R1 a R6, ARM-C1 a C3): o arquivo ruim é montado na memória, junto da
// lista real de arquivos, e a varredura tem de ficar vermelha. Nenhum arquivo ruim existe na árvore.

const pastaSrc = join(process.cwd(), 'src') + sep

// O escopo da Comunidade: o mesmo de `paginas/comunidade/estatico.test.ts`.
const NO_ESCOPO = (nome: string) =>
  /^dados\/comunidade[^/]*\.ts$/.test(nome) ||
  nome === 'rotas/comunidade.tsx' ||
  nome === 'conteudo/comunidade.ts' ||
  nome.startsWith('paginas/comunidade/') ||
  nome.startsWith('componentes/comunidade/')

const PECA = 'componentes/resumo-rotina/'
const ENTRADA_DA_PECA = 'componentes/resumo-rotina/index.ts'
const SESSAO = 'componentes/conta/sessao.tsx'
const ARMAZENAMENTO = 'componentes/conta/armazenamento.ts'
// O apoio dos testes das telas monta as rotas completas (e por isso alcança a rotina): fica fora das raízes, mas não do grafo.
const APOIO_DE_TESTE = 'paginas/comunidade/apoio.tsx'

/** Os nós de parada: os dois pontos de passagem de RN-01. Acrescentar nó exige mudar a spec. */
const NOS_DE_PARADA: ReadonlySet<string> = new Set([SESSAO, ENTRADA_DA_PECA])

/** A Comunidade não alcança a rotina, o desenvolvimento nem os dados de conta. */
const PROIBIDO_NA_COMUNIDADE = /^dados\/(rotina|desenvolvimento|conta)/
/** A peça não alcança arquivo nenhum da Comunidade. */
const PROIBIDO_NA_PECA = /^(componentes\/comunidade\/|paginas\/comunidade\/|dados\/comunidade)/

/**
 * T-ARM: a lista fechada dos módulos que a peça alcança e que já guardam coisa no navegador. Foi calculada nesta
 * base, sobre o que a peça alcança (`ProvedorRotina.tsx` → `conta/sessao.tsx` → `conta/armazenamento.ts`): só o
 * `armazenamento.ts`, que é o ponto único de acesso ao `localStorage` e ao `sessionStorage` da conta. Entrar outro
 * módulo aqui exige mudar a spec.
 */
const ISENTOS_DE_ARMAZENAMENTO: ReadonlySet<string> = new Set([ARMAZENAMENTO])

const MARCAS_DE_ARMAZENAMENTO = /\b(localStorage|sessionStorage|indexedDB|serviceWorker)\b|document\.cookie|\bconsole\b/

const REAIS: readonly Fonte[] = listarFontes(pastaSrc)

// ---- o grafo de importações -------------------------------------------------------------------------------------

type Mapa = ReadonlyMap<string, string>

const mapaDe = (fontes: readonly Fonte[]): Mapa => new Map(fontes.filter((f) => /\.tsx?$/.test(f.nome)).map((f) => [f.nome, f.texto]))

/** Os arquivos (`.ts` e `.tsx`) que `nome` importa por caminho relativo e que existem em `mapa`. */
function importacoes(mapa: Mapa, nome: string): string[] {
  const texto = mapa.get(nome)
  if (texto === undefined) return []
  const destinos: string[] = []
  for (const origem of importsDe(texto)) {
    if (!origem.startsWith('.')) continue
    const base = posix.normalize(posix.join(posix.dirname(nome), origem))
    const achado = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((candidato) => mapa.has(candidato))
    if (achado !== undefined) destinos.push(achado)
  }
  return destinos
}

/** Os arquivos alcançados a partir de `raiz` (ela incluída). Um nó de parada entra no conjunto, mas não é percorrido. */
function alcancar(mapa: Mapa, raiz: string, parada: ReadonlySet<string>): Set<string> {
  const vistos = new Set<string>([raiz])
  const pendentes = [raiz]
  while (pendentes.length > 0) {
    const atual = pendentes.pop()!
    for (const destino of importacoes(mapa, atual)) {
      if (vistos.has(destino)) continue
      vistos.add(destino)
      if (!parada.has(destino)) pendentes.push(destino)
    }
  }
  return vistos
}

// ---- T-FRONT ----------------------------------------------------------------------------------------------------

interface Ocorrencia {
  /** A unidade de contagem: a raiz vermelha. */
  raiz: string
  regra: string
  alvo: string
}

interface ResultadoDaFronteira {
  raizesDaComunidade: number
  raizesDaPeca: number
  achados: Ocorrencia[]
}

/**
 * A fronteira (RN-01):
 *  1. a partir de cada arquivo de produto da Comunidade (menos o apoio de teste), seguindo as importações relativas
 *     e sem atravessar a sessão nem o `index.ts` da peça, não se alcança `dados/rotina*`, `dados/desenvolvimento*`
 *     nem `dados/conta*`;
 *  2. nenhum arquivo da Comunidade importa arquivo da peça que não seja o `index.ts`;
 *  3. a peça não alcança arquivo da Comunidade.
 */
function verificarFronteira(fontes: readonly Fonte[], parada: ReadonlySet<string> = NOS_DE_PARADA): ResultadoDaFronteira {
  const mapa = mapaDe(fontes)
  const nomes = [...mapa.keys()]
  const raizesDaComunidade = nomes.filter((nome) => NO_ESCOPO(nome) && nome !== APOIO_DE_TESTE)
  const raizesDaPeca = nomes.filter((nome) => nome.startsWith(PECA))
  const achados: Ocorrencia[] = []

  for (const raiz of raizesDaComunidade) {
    for (const no of alcancar(mapa, raiz, parada)) {
      if (PROIBIDO_NA_COMUNIDADE.test(no)) achados.push({ raiz, regra: 'alcanca rotina, desenvolvimento ou conta', alvo: no })
      if (!NO_ESCOPO(no)) continue
      for (const destino of importacoes(mapa, no)) {
        if (destino.startsWith(PECA) && destino !== ENTRADA_DA_PECA) achados.push({ raiz, regra: 'importa arquivo interno da peça', alvo: destino })
      }
    }
  }
  for (const raiz of raizesDaPeca) {
    for (const no of alcancar(mapa, raiz, new Set())) {
      if (PROIBIDO_NA_PECA.test(no)) achados.push({ raiz, regra: 'a peça alcança a Comunidade', alvo: no })
    }
  }
  return { raizesDaComunidade: raizesDaComunidade.length, raizesDaPeca: raizesDaPeca.length, achados }
}

const plantado = (nome: string, texto: string): Fonte => ({ nome, texto })
const raizesVermelhas = (resultado: ResultadoDaFronteira) => [...new Set(resultado.achados.map((achado) => achado.raiz))].sort()

describe('T-FRONT: a fronteira do cuidado (RF12:RN-01)', () => {
  const base = verificarFronteira(REAIS)

  it('prova-base: nenhum arquivo da Comunidade alcança rotina, desenvolvimento ou conta, e a peça não alcança a Comunidade', () => {
    // As raízes: os arquivos de produto do escopo da Comunidade (sem testes, sem `teste/` e sem o apoio) e os da peça.
    expect(base.raizesDaComunidade).toBeGreaterThan(30)
    expect(base.raizesDaPeca).toBeGreaterThanOrEqual(5)
    expect(base.achados).toEqual([])
  })

  it('sem os nós de parada o grafo fica vermelho: a sessão e o index.ts da peça são os dois pontos de passagem', () => {
    const semParada = verificarFronteira(REAIS, new Set())
    expect(semParada.achados.length).toBeGreaterThan(0)
    expect(semParada.achados.some((achado) => /^dados\/(rotina|conta)/.test(achado.alvo))).toBe(true)
    // Cada nó faz falta: sem a sessão, a Comunidade chega a `dados/conta`; sem o index.ts, quem o importa chega à rotina.
    expect(verificarFronteira(REAIS, new Set([ENTRADA_DA_PECA])).achados.some((achado) => achado.alvo.startsWith('dados/conta'))).toBe(true)
    const importaOIndex = plantado('componentes/comunidade/legitimo.ts', `import { anexarBloco } from '../resumo-rotina/index.ts'\nexport const juntar = anexarBloco`)
    const semOIndex = verificarFronteira([...REAIS, importaOIndex], new Set([SESSAO]))
    expect(raizesVermelhas(semOIndex)).toEqual(['componentes/comunidade/legitimo.ts'])
    expect(semOIndex.achados.some((achado) => achado.alvo.startsWith('dados/rotina'))).toBe(true)
  })

  it('verde: a Comunidade importa só o index.ts da peça', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/comunidade/legitimo.ts', `import { anexarBloco } from '../resumo-rotina/index.ts'\nexport const juntar = anexarBloco`),
    ])
    expect(resultado.achados).toEqual([])
  })

  it('FRONT-R1: arquivo da Comunidade importa dados/rotina* direto', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/comunidade/plantado.ts', `import { criarDadosRotina } from '../../dados/rotina.ts'\nexport const ler = criarDadosRotina`),
    ])
    expect(raizesVermelhas(resultado)).toEqual(['componentes/comunidade/plantado.ts'])
    expect(resultado.achados.map((achado) => achado.alvo)).toContain('dados/rotina.ts')
  })

  it('FRONT-R2: indireta, por um helper novo em componentes/comunidade/ que importa componentes/rotina/dadosRotina.tsx', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/comunidade/ajuda.ts', `import { useDadosRotina } from '../rotina/dadosRotina.tsx'\nexport const usar = useDadosRotina`),
    ])
    expect(raizesVermelhas(resultado)).toEqual(['componentes/comunidade/ajuda.ts'])
    expect(resultado.achados.map((achado) => achado.alvo)).toContain('dados/rotina.ts')
  })

  it('FRONT-R3: arquivo da Comunidade importa um arquivo interno puro da peça que não é o index.ts (o formatador do bloco)', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/comunidade/formatador.ts', `import { montarBloco } from '../resumo-rotina/bloco.ts'\nexport const bloco = montarBloco`),
    ])
    expect(raizesVermelhas(resultado)).toEqual(['componentes/comunidade/formatador.ts'])
    expect(resultado.achados).toContainEqual({
      raiz: 'componentes/comunidade/formatador.ts',
      regra: 'importa arquivo interno da peça',
      alvo: 'componentes/resumo-rotina/bloco.ts',
    })
  })

  it('FRONT-R4: arquivo novo componentes/conta/outro.tsx importa dados/conta.ts e é alcançado pela Comunidade', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/conta/outro.tsx', `import { criarDadosConta } from '../../dados/conta.ts'\nexport const passagem = criarDadosConta`),
      plantado('componentes/comunidade/ponte.ts', `import { passagem } from '../conta/outro.tsx'\nexport const usar = passagem`),
    ])
    expect(raizesVermelhas(resultado)).toEqual(['componentes/comunidade/ponte.ts'])
    expect(resultado.achados.map((achado) => achado.alvo)).toContain('dados/conta.ts')
  })

  it('FRONT-R5: arquivo da peça importa componentes/comunidade/*', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/resumo-rotina/plantado.ts', `import { useDadosComunidade } from '../comunidade/dados.ts'\nexport const usar = useDadosComunidade`),
    ])
    expect(raizesVermelhas(resultado)).toEqual(['componentes/resumo-rotina/plantado.ts'])
    expect(resultado.achados).toContainEqual({
      raiz: 'componentes/resumo-rotina/plantado.ts',
      regra: 'a peça alcança a Comunidade',
      alvo: 'componentes/comunidade/dados.ts',
    })
  })

  it('FRONT-R6: arquivo de produto da Comunidade importa paginas/comunidade/apoio.tsx', () => {
    const resultado = verificarFronteira([
      ...REAIS,
      plantado('componentes/comunidade/usaapoio.ts', `import { renderizarComunidade } from '../../paginas/comunidade/apoio.tsx'\nexport const montar = renderizarComunidade`),
    ])
    expect(raizesVermelhas(resultado)).toEqual(['componentes/comunidade/usaapoio.ts'])
    // O apoio fica fora das raízes: sozinho, ele não faz a prova-base ficar vermelha.
    expect(base.achados.some((achado) => achado.raiz === APOIO_DE_TESTE)).toBe(false)
  })
})

// ---- T-LIT ------------------------------------------------------------------------------------------------------
//
// A varredura de literais de `estatico.test.ts` lê o arquivo com `ts.ScriptKind.TSX` e só procura texto JSX, atributos
// de texto e filhos literais. Por isso ela vale para os `.tsx` da peça. Nos `.ts` não se aplica: eles não têm JSX, e a
// varredura nada acharia (nem leria direito um `<T>(x)` genérico). O texto de interface não está em `.ts` da peça por
// regra de arquitetura (A3): vive em `conteudo/resumoRotina.ts` e `conteudo/resumoRotinaPainel.ts`.

describe('T-LIT: nenhum texto de interface escrito nos .tsx da peça (RF12:RN-04)', () => {
  const textoPlantado = `export const Painel = () => (<section aria-label="Resumo">Texto solto{'outro texto'}<span className="a b" /></section>)`

  it('prova-base: nenhum .tsx da peça tem literal de texto', () => {
    const tsx = REAIS.filter((fonte) => fonte.nome.startsWith(PECA) && fonte.nome.endsWith('.tsx'))
    expect(tsx.flatMap(({ nome, texto }) => literaisDeTexto(nome, texto))).toEqual([])
  })

  it('contraprova: um .tsx da peça com texto escrito nele é achado (atributo, texto JSX e filho literal)', () => {
    const achados = literaisDeTexto('componentes/resumo-rotina/Plantado.tsx', textoPlantado).map((achado) => achado.texto).sort()
    expect(achados).toEqual(['Resumo', 'Texto solto', 'outro texto'].sort())
  })

  it('a varredura não se aplica a .ts: o mesmo texto num .ts não é achado, porque não há JSX', () => {
    expect(literaisDeTexto('componentes/resumo-rotina/plantado.ts', `export const texto = 'Texto solto'`)).toEqual([])
  })
})

// ---- T-ARM ------------------------------------------------------------------------------------------------------

interface OcorrenciaDeArmazenamento {
  modulo: string
  regra: string
}

/**
 * O que a peça e os módulos que ela alcança não podem ter (RN-05): marcas de armazenamento do navegador
 * (`localStorage`, `sessionStorage`, `indexedDB`, `serviceWorker`, `document.cookie`), `console` e, nos arquivos da
 * própria peça, a importação de `conta/armazenamento.ts`. Valem os `.ts` e os `.tsx`. A lista fechada de isentos
 * (`ISENTOS_DE_ARMAZENAMENTO`) não é varrida.
 */
function verificarArmazenamento(fontes: readonly Fonte[]) {
  const mapa = mapaDe(fontes)
  const raizes = [...mapa.keys()].filter((nome) => nome.startsWith(PECA))
  const alcancados = new Set<string>()
  for (const raiz of raizes) for (const no of alcancar(mapa, raiz, new Set())) alcancados.add(no)

  const achados: OcorrenciaDeArmazenamento[] = []
  for (const modulo of alcancados) {
    if (ISENTOS_DE_ARMAZENAMENTO.has(modulo)) continue
    if (MARCAS_DE_ARMAZENAMENTO.test(semComentarios(mapa.get(modulo) ?? ''))) achados.push({ modulo, regra: 'guarda no navegador ou usa console' })
    if (modulo.startsWith(PECA) && importacoes(mapa, modulo).includes(ARMAZENAMENTO)) achados.push({ modulo, regra: 'importa armazenamento.ts' })
  }
  return { raizes: raizes.length, alcancados, achados }
}

describe('T-ARM: nada no navegador e nada em console (RF12:RN-05)', () => {
  const base = verificarArmazenamento(REAIS)

  it('prova-base: a peça e o que ela alcança não guardam nada no navegador, não usam console e não importam o armazenamento', () => {
    expect(base.raizes).toBeGreaterThanOrEqual(5)
    expect(base.achados).toEqual([])
  })

  it('a lista fechada de isentos é só o que já existe e tem a marca: o armazenamento da conta, alcançado pela sessão', () => {
    expect([...ISENTOS_DE_ARMAZENAMENTO]).toEqual([ARMAZENAMENTO])
    for (const isento of ISENTOS_DE_ARMAZENAMENTO) {
      const texto = REAIS.find((fonte) => fonte.nome === isento)?.texto
      expect(texto, `${isento} existe`).toBeDefined()
      expect(MARCAS_DE_ARMAZENAMENTO.test(semComentarios(texto ?? '')), `${isento} tem a marca`).toBe(true)
      expect(base.alcancados.has(isento), `${isento} é alcançado pela peça`).toBe(true)
    }
  })

  it('ARM-C1: helper .ts em resumo-rotina/ que grava o bloco em localStorage', () => {
    const resultado = verificarArmazenamento([
      ...REAIS,
      plantado('componentes/resumo-rotina/c1.ts', `export const guardar = (bloco: string) => window.localStorage.setItem('bloco', bloco)`),
    ])
    expect(resultado.achados).toEqual([{ modulo: 'componentes/resumo-rotina/c1.ts', regra: 'guarda no navegador ou usa console' }])
  })

  it('ARM-C2: helper .ts em resumo-rotina/ que importa armazenamento.ts', () => {
    const resultado = verificarArmazenamento([
      ...REAIS,
      plantado('componentes/resumo-rotina/c2.ts', `import { gravarChave } from '../conta/armazenamento.ts'\nexport const guardar = gravarChave`),
    ])
    expect(resultado.achados).toEqual([{ modulo: 'componentes/resumo-rotina/c2.ts', regra: 'importa armazenamento.ts' }])
  })

  it('ARM-C3: helper novo fora da pasta, alcançado pela peça, com sessionStorage; e console.log do bloco numa terceira variante', () => {
    const fora = verificarArmazenamento([
      ...REAIS,
      plantado('componentes/rotina/ajudaC3.ts', `export const guardar = (bloco: string) => sessionStorage.setItem('bloco', bloco)`),
      plantado('componentes/resumo-rotina/c3a.ts', `import { guardar } from '../rotina/ajudaC3.ts'\nexport const usar = guardar`),
    ])
    expect(fora.achados).toEqual([{ modulo: 'componentes/rotina/ajudaC3.ts', regra: 'guarda no navegador ou usa console' }])

    const log = verificarArmazenamento([
      ...REAIS,
      plantado('componentes/resumo-rotina/c3b.ts', `export const mostrar = (bloco: string) => console.log(bloco)`),
    ])
    expect(log.achados).toEqual([{ modulo: 'componentes/resumo-rotina/c3b.ts', regra: 'guarda no navegador ou usa console' }])
  })

  it('a marca num comentário não conta, e arquivo fora do que a peça alcança não é varrido', () => {
    const resultado = verificarArmazenamento([
      ...REAIS,
      plantado('componentes/resumo-rotina/c4.ts', `// nada de localStorage nem de console aqui\nexport const ok = 1`),
      plantado('componentes/rotina/solto.ts', `export const guardar = () => localStorage.clear()`),
    ])
    expect(resultado.achados).toEqual([])
  })
})
