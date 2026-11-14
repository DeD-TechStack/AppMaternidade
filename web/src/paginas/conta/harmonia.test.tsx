import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// H-3d (SPEC H3, H3:RF-01/02/03): acesso e conta usam as primitivas de layout (`Secao`, `QuadroLayout`, `Pilha`,
// `Colunas`, `Cartao`) para o espaço entre blocos e entre seções, inclusive nos estados de erro, vazio e carregando,
// e o código da área não tem valor de espaço ou de tipo solto. Sem folha de estilo no jsdom, a estrutura se confere
// pelos marcadores `data-h` das primitivas.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

// ---------------------------------------------------------------------------------------------------------------
// 1. Nenhum valor solto no código da área (H3:RF-03, regra de classes e de `style`).
// ---------------------------------------------------------------------------------------------------------------

const PASTA_SRC = join(process.cwd(), 'src') + sep
const AREA = ['componentes/acesso/', 'componentes/conta/', 'componentes/campo/', 'paginas/conta/', 'componentes/resumo-rotina/']
const PASSOS_PERMITIDOS = new Set(['0', '0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '7', '8'])
const ESPACO = /(?:^|:)-?(?:p[xytrbles]?|m[xytrbles]?|gap(?:-[xy])?|space-[xy])-(\[[^\s]*|[\w.]+)$/

/** Os achados de um trecho de código: uma linha por valor solto, com o número da linha do arquivo. */
function valoresSoltos(texto: string): string[] {
  const achados: string[] = []
  texto.split('\n').forEach((linha, indice) => {
    // Cada palavra solta da linha é uma classe em potencial (as aspas, as chaves e os parênteses separam).
    for (const classe of linha.split(/[\s"'`{}()<>=,;]+/)) {
      const espaco = ESPACO.exec(classe)
      if (espaco) {
        const valor = espaco[1]
        const solto = valor.startsWith('[')
          ? /\d/.test(valor) && !valor.includes('var')
          : /^\d/.test(valor) && !PASSOS_PERMITIDOS.has(valor)
        if (solto) achados.push(`${indice + 1}: espaço solto "${classe}"`)
      }
      if (/(?:^|:)text-\[[^\]]*\d(?:px|rem|em)[^\]]*\]?$/.test(classe) && !classe.includes('var')) {
        achados.push(`${indice + 1}: tamanho de letra solto "${classe}"`)
      }
      if (/(?:^|:)text-(?:xs|sm|base|lg|xl|[2-9]xl)$/.test(classe)) {
        achados.push(`${indice + 1}: tamanho de letra do Tailwind "${classe}"`)
      }
      if (/(?:^|:)leading-/.test(classe)) achados.push(`${indice + 1}: entrelinha solta "${classe}"`)
    }
    if (/style=\{\{[^}]*(margin|padding|gap|fontSize|lineHeight)/.test(linha)) {
      achados.push(`${indice + 1}: style com espaço ou tipo`)
    }
  })
  return achados
}

describe('nenhum valor solto no código de acesso e conta', () => {
  it('o detector pega os valores soltos que a regra proíbe e deixa passar os tokens', () => {
    const soltos = [
      'className="gap-12"',
      'className="lg:mt-10"',
      'className="p-[13px]"',
      'className="max-sm:text-[48px]"',
      'className="max-sm:leading-[52px]"',
      'className="text-sm"',
      'className="py-20"',
      "style={{ marginTop: 8 }}",
    ]
    for (const linha of soltos) expect(valoresSoltos(linha), linha).not.toEqual([])
    const limpos = [
      'className="gap-esp-bloco pt-esp-secao lg:gap-esp-midia"',
      'className="gap-8 px-1.5 mt-0.5 -ml-1 mx-auto"',
      'className="text-[var(--cor-texto-2)] max-w-[28rem] top-[calc(var(--cm-cabecalho)+16px)]"',
      'className="[&>section]:pt-esp-bloco"',
    ]
    for (const linha of limpos) expect(valoresSoltos(linha), linha).toEqual([])
  })

  it('nenhum arquivo da área tem classe de espaço fora da escala, tamanho de letra solto, entrelinha ou style de espaço', () => {
    const achados: string[] = []
    const arquivos = readdirSync(PASTA_SRC, { recursive: true, encoding: 'utf8' })
      .map((caminho) => caminho.replaceAll('\\', '/'))
      .filter((caminho) => AREA.some((pasta) => caminho.startsWith(pasta)))
      .filter((caminho) => /\.tsx?$/.test(caminho) && !/\.test\.tsx?$/.test(caminho))
    expect(arquivos.length).toBeGreaterThan(30)
    for (const arquivo of arquivos) {
      for (const achado of valoresSoltos(readFileSync(join(PASTA_SRC, arquivo), 'utf8'))) achados.push(`${arquivo}:${achado}`)
    }
    expect(achados).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------------------
// 2. As primitivas nas telas (H3:RF-01/02).
// ---------------------------------------------------------------------------------------------------------------

const esperar = () => waitFor(() => expect(screen.queryByText(/Carregando…|Conferindo as suas famílias…/)).toBeNull())
const DATA_H = (valor: string) => `[data-h~="${valor}"]`

/** O modelo de colunas escrito pela primitiva (`--h-colunas`), sem os espaços a mais. */
function modeloDe(colunas: Element): string {
  return (colunas as HTMLElement).style.getPropertyValue('--h-colunas').replace(/\s+/g, ' ').trim()
}

function filhosDoMain(container: HTMLElement): HTMLElement[] {
  const main = container.querySelector('main')
  expect(main, 'a tela tem um <main>').not.toBeNull()
  return [...main!.children] as HTMLElement[]
}

/** O `<main>` só tem seções (`Secao`) por filhas: é o que faz valer a regra da primeira e da última. */
function soSecoes(container: HTMLElement) {
  const filhos = filhosDoMain(container)
  expect(filhos.length).toBeGreaterThan(0)
  for (const filho of filhos) expect(filho.getAttribute('data-h')?.split(' ')).toContain('secao')
}

async function semMemoria() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'x')
  return dados
}

describe('telas de acesso: Secao, QuadroLayout e as duas colunas 7/5 com vão de mídia', () => {
  const telas: Array<[string, () => ReturnType<typeof renderizarComDados>]> = [
    ['/entrar', () => renderizarComDados('/entrar')],
    ['/criar-conta', () => renderizarComDados('/criar-conta')],
    ['/recuperar-acesso', () => renderizarComDados('/recuperar-acesso')],
    ['/convite', () => renderizarComDados('/convite')],
    ['/conta-excluida', () => renderizarComDados('/conta-excluida')],
    [
      '/redefinir-senha',
      () => {
        sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
        return renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
      },
    ],
  ]

  for (const [rota, montar] of telas) {
    it(`${rota}: o <main> só tem seções, o quadro guarda as colunas 7fr/5fr (vão de mídia, a partir de 1024) e o texto é uma pilha`, async () => {
      const { container } = montar()
      await screen.findByRole('heading', { level: 1 })
      await esperar()

      soSecoes(container)
      const colunas = container.querySelector(`main ${DATA_H('secao')} ${DATA_H('quadro')} ${DATA_H('colunas')}`)!
      expect(colunas, 'Secao > QuadroLayout > Colunas').not.toBeNull()
      expect(colunas.getAttribute('data-h-vao')).toBe('midia')
      expect(colunas.getAttribute('data-h-quebra')).toBe('1024')
      expect(modeloDe(colunas)).toBe('minmax(0, 7fr) minmax(0, 5fr)')
      expect([...colunas.children].map((c) => c.getAttribute('data-h')?.split(' '))).toEqual([
        expect.arrayContaining(['coluna']),
        expect.arrayContaining(['coluna']),
      ])
      // O título e a frase são uma pilha (título → texto), e o texto do formulário e os links outra, com o vão de grupo.
      const titulo = colunas.querySelector('h1')!
      expect(titulo.parentElement!.getAttribute('data-h')?.split(' ')).toContain('pilha')
      expect(titulo.parentElement!.parentElement!.getAttribute('data-h-vao')).toBe('grupo')
      // O texto do título fica em `medio` (880) no máximo.
      expect(titulo.parentElement!.classList.contains('max-w-medio')).toBe(true)
    })
  }

  it('/app/comecar (passo "Seu nome") e a escolha da família usam as mesmas colunas dentro do <main>', async () => {
    const passo = renderizarComDados('/app/comecar', { dados: await semMemoria() })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    soSecoes(passo.container)
    const colunas = passo.container.querySelector(`main ${DATA_H('colunas')}`)!
    expect(colunas.getAttribute('data-h-vao')).toBe('midia')
    expect(modeloDe(colunas)).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    // O cartão do passo é um Cartao (padding de painel e raio do cartão), com o formulário e o título dentro.
    const cartao = screen.getByRole('heading', { level: 2, name: 'Seu nome' }).closest('section')!
    expect(cartao.getAttribute('data-h')?.split(' ')).toContain('cartao')
    passo.unmount()

    const escolha = renderizarComDados('/app/comecar', { sessao: 'davi' })
    // Davi tem família: o Começar cai na escolha da família.
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    soSecoes(escolha.container)
    const colunasDaEscolha = escolha.container.querySelector(`main ${DATA_H('colunas')}`)!
    expect(colunasDaEscolha.getAttribute('data-h-vao')).toBe('midia')
    const cartaoDaEscolha = screen.getByRole('heading', { level: 2, name: 'Como você quer começar?' }).closest('section')!
    expect(cartaoDaEscolha.getAttribute('data-h')?.split(' ')).toContain('cartao')
  })

  it('o estado carregando e o estado de erro da tela de acesso também são seções com pilha', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    simularFalha(dados, 'sessaoAtual', 'rede')
    const { container } = renderizarComDados('/entrar', { dados })
    await screen.findByRole('alert')
    soSecoes(container)
    expect(container.querySelector(`main ${DATA_H('pilha')} [role="alert"]`)).not.toBeNull()
  })
})

describe('/app/conta: seção, quadro, título em medio, índice 16rem/1fr e linhas 5fr/7fr', () => {
  it('estrutura da página, das linhas e da zona de perigo', async () => {
    const { container } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperar()

    soSecoes(container)
    const titulo = screen.getByRole('heading', { level: 1, name: 'Conta' })
    // O título e a abertura são uma pilha limitada a `medio` (max-w-medio).
    const abertura = titulo.parentElement!.parentElement!
    expect(abertura.classList.contains('max-w-medio')).toBe(true)
    expect(abertura.getAttribute('data-h')?.split(' ')).toContain('pilha')

    const todas = [...container.querySelectorAll(`main ${DATA_H('colunas')}`)]
    const indice = todas[0]
    expect(modeloDe(indice)).toBe('16rem minmax(0, 1fr)')
    expect(indice.getAttribute('data-h-quebra')).toBe('1024')
    expect(indice.getAttribute('data-h-vao')).toBe('bloco')
    // Uma linha de duas colunas (5fr/7fr) por seção: perfil, id, exportar, excluir e privacidade.
    const linhas = todas.slice(1)
    expect(linhas).toHaveLength(5)
    for (const linha of linhas) {
      expect(modeloDe(linha)).toBe('minmax(0, 5fr) minmax(0, 7fr)')
      expect(linha.getAttribute('data-h-quebra')).toBe('1024')
      expect(linha.getAttribute('data-h-vao')).toBe('bloco')
      for (const filha of linha.children) expect(filha.getAttribute('data-h')?.split(' ')).toContain('coluna')
    }
    // A coluna das linhas é uma pilha com o vão de bloco, e a zona de perigo é um Cartao.
    const secoesDaConta = [...container.querySelectorAll('main section[aria-labelledby]')]
    expect(secoesDaConta.map((s) => s.getAttribute('aria-labelledby'))).toEqual([
      'perfil',
      'id-conta',
      'exportar',
      'excluir-conta',
      'privacidade',
    ])
    expect(secoesDaConta[0].parentElement!.getAttribute('data-h-vao')).toBe('bloco')
    expect(secoesDaConta[3].getAttribute('data-h')?.split(' ')).toContain('cartao')
  })

  it('a caixa de excluir aberta e o estado de espera da guarda ficam dentro do <main> como seções', async () => {
    const aberta = renderizarComDados('/app/conta', { sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperar()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }))
    soSecoes(aberta.container)
    expect(within(aberta.container.querySelector('main')!).getByRole('dialog', { hidden: true })).toBeTruthy()
    aberta.unmount()

    const espera = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    espera.sessaoParaTeste('juliana@exemplo.invalid')
    vi.spyOn(espera, 'sessaoAtual').mockReturnValue(new Promise(() => undefined))
    const carregando = renderizarComDados('/app/conta', { dados: espera })
    soSecoes(carregando.container)
    expect(carregando.container.querySelector(`main ${DATA_H('secao')} ${DATA_H('quadro')} ${DATA_H('pilha')}`)).toBeNull()
    expect(within(carregando.container.querySelector('main')!).getByText('Carregando…')).toBeTruthy()
    carregando.unmount()

    const falha = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    falha.sessaoParaTeste('juliana@exemplo.invalid')
    simularFalha(falha, 'sessaoAtual', 'rede')
    const comErro = renderizarComDados('/app/conta', { dados: falha })
    await screen.findByRole('alert')
    soSecoes(comErro.container)
    const titulo = comErro.container.querySelector('main h1')!
    expect(titulo.parentElement!.getAttribute('data-h')?.split(' ')).toContain('pilha')
    // O título de erro da guarda não leva tamanho solto de celular: é o `cm-h1` da escala.
    expect(titulo.className).not.toMatch(/max-sm:(text|leading)-\[/)
  })
})

describe('/app/familia: seção, título em medio, colunas 5fr/7fr e blocos em pilha', () => {
  it('estrutura da página', async () => {
    const { container } = renderizarComDados('/app/familia', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })

    soSecoes(container)
    const titulo = screen.getByRole('heading', { level: 1, name: 'Família' })
    expect(titulo.parentElement!.classList.contains('max-w-medio')).toBe(true)
    expect(titulo.parentElement!.getAttribute('data-h')?.split(' ')).toContain('pilha')

    const colunas = container.querySelector(`main ${DATA_H('colunas')}`)!
    expect(modeloDe(colunas)).toBe('minmax(0, 5fr) minmax(0, 7fr)')
    expect(colunas.getAttribute('data-h-quebra')).toBe('1024')
    expect(colunas.getAttribute('data-h-vao')).toBe('bloco')

    // Os quatro blocos (bebês, membros, convites e ações) são seções-pilha de uma pilha de bloco.
    const blocos = ['bebes', 'membros', 'convites', 'acoes-da-familia'].map(
      (id) => container.querySelector(`section[aria-labelledby="${id}"]`)!,
    )
    for (const bloco of blocos) {
      expect(bloco.getAttribute('data-h')?.split(' '), bloco.getAttribute('aria-labelledby') ?? undefined).toContain('pilha')
    }
    expect(blocos[0].parentElement!.getAttribute('data-h-vao')).toBe('bloco')
    expect(blocos[0].parentElement).toBe(blocos[3].parentElement)
  })

  it('o estado carregando e os erros da página são seções com pilha, sem margem solta', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(PESSOAS.juliana.email)
    simularFalha(dados, 'minhasFamilias', 'rede')
    const { container } = renderizarComDados('/app/familia', { dados, sessao: 'juliana' })
    await screen.findByRole('alert')
    soSecoes(container)
    expect(container.querySelector(`main ${DATA_H('pilha')} [role="alert"]`)).not.toBeNull()
  })

  it('os formulários de bebê e de convite ficam em Cartao', async () => {
    const { container } = renderizarComDados('/app/familia', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar bebê' }))
    const cartaoDoBebe = container.querySelector('section[aria-labelledby="bebes"] form')!.parentElement!
    expect(cartaoDoBebe.getAttribute('data-h')?.split(' ')).toContain('cartao')
    const cartaoDoConvite = container.querySelector('form[aria-labelledby="novo-convite"]')!.parentElement!
    expect(cartaoDoConvite.getAttribute('data-h')?.split(' ')).toContain('cartao')
  })
})
