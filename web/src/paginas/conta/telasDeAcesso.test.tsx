import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import {
  AVISO_BANCO_DEMONSTRACAO,
  CONTA_EXCLUIDA,
  CRIAR_CONTA,
  ENTRAR,
  ETIQUETA_PROTOTIPO,
  RECUPERAR,
  REDEFINIR,
  TEXTOS_ERRO,
} from '../../conteudo/conta.ts'
import { AVISO_DEMONSTRACAO } from '../../conteudo/textos.ts'
import type { Resultado } from '../../dados/comum.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// MAT-44d-3: a composição das telas de acesso no sistema novo (Entrar, Criar conta, Recuperar acesso,
// e Nova senha e Conta excluída, que usam a mesma moldura). O comportamento (validação, erros, foco,
// volta) é o da 37a e está em acesso.test.tsx, estados.test.tsx e acessibilidade.test.tsx. Aqui, o que
// o jsdom alcança do TELAS.md: a estrutura de cada bloco; as medidas (E, C, R e G) são do medidor.

const TELAS = [
  ['/entrar', 'Entrar'],
  ['/criar-conta', 'Criar conta'],
  ['/recuperar-acesso', 'Recuperar acesso'],
  ['/redefinir-senha', 'Nova senha'],
  ['/conta-excluida', 'Conta excluída'],
] as const

// `pastaSrcDe` devolve a pasta do arquivo de teste (web/src/paginas/conta/): o CSS está duas acima.
const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8')
// O bloco da 44d-3 acaba onde começa o da 44d-4 (o Início), que vem depois dele no arquivo.
const inicioDe44d3 = css.indexOf('44d-3:')
const inicioDe44d4 = css.indexOf('/* 44d-4 */')
const blocoDe44d3 = css.slice(inicioDe44d3, inicioDe44d4 > inicioDe44d3 ? inicioDe44d4 : undefined)
const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  // O modo é decidido pelas variáveis VITE_SUPABASE_*: sem elas, a memória. Um web/.env.local (o banco
  // local das capturas) as define também no Vitest, então cada teste fixa o modo que afirma.
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
const campoPorRotulo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campoPorRotulo(rotulo), { target: { value: texto } })
const itensDaLateral = (container: HTMLElement) =>
  [...container.querySelectorAll('.sb-abertura-lateral > li')].map((li) => li.textContent)

/** O formulário de /redefinir-senha só abre com a marca de recuperação. */
function abrir(caminho: string) {
  if (caminho === '/redefinir-senha') {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    return renderizarComDados(caminho, { sessao: 'juliana' })
  }
  return renderizarComDados(caminho)
}

describe('a casca e a abertura (nenhuma moldura própria)', () => {
  for (const [caminho, titulo] of TELAS) {
    it(`${caminho}: só o cabeçalho do site, e o main abre com a abertura e tem só áreas úteis`, async () => {
      const { container } = abrir(caminho)
      await screen.findByRole('heading', { level: 1, name: titulo })

      const cabecalhos = container.querySelectorAll('header')
      expect(cabecalhos).toHaveLength(1)
      expect(cabecalhos[0].hasAttribute('data-cabecalho')).toBe(true)
      expect(container.querySelector('.marca')).toBeNull()
      expect(container.querySelector('.border-b')).toBeNull()

      const principal = container.querySelector('main')!
      const filhos = [...principal.children]
      expect(filhos[0].classList.contains('sb-abertura')).toBe(true)
      for (const filho of filhos) expect(filho.classList.contains('sb-area'), filho.outerHTML.slice(0, 90)).toBe(true)
      expect(principal.querySelector('[class*="max-w-"], [class*="mt-20"], [class*="mt-10"]')).toBeNull()

      // O h1 é o da abertura, do sistema (96/96), e recebe o foco por programa (tabIndex -1).
      const h1 = within(filhos[0] as HTMLElement).getByRole('heading', { level: 1 })
      expect(h1.classList.contains('t-display-xl')).toBe(true)
      expect(h1.getAttribute('tabindex')).toBe('-1')
      expect(h1.nextElementSibling!.classList.contains('t-subtitulo')).toBe(true)
    })
  }

  it('a faixa velha de aviso do topo saiu das telas de acesso', async () => {
    for (const [caminho] of TELAS) {
      const { container, unmount } = abrir(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(container.querySelector('.aviso-demonstracao'), caminho).toBeNull()
      unmount()
    }
  })

  it('o estado de espera da guarda é o próprio main, sem a faixa de aviso, com a área útil abaixo do cabeçalho', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    const lida = new Promise<Resultado<null>>(() => undefined)
    vi.spyOn(dados, 'sessaoAtual').mockReturnValue(lida as never)
    const { container } = renderizarComDados('/app/conta', { dados })

    const principal = container.querySelector('main')!
    expect(principal.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('.aviso-demonstracao')).toBeNull()
    expect(principal.children).toHaveLength(1)
    expect(principal.children[0].className).toBe('sb-area sb-acesso-estado')
    expect(within(principal).getByText('Carregando…')).toBeTruthy()
  })
})

describe('a coluna lateral da abertura', () => {
  it('modo memória: etiqueta de protótipo, o aviso de demonstração e os links de cada tela', async () => {
    const esperado: Record<string, Array<string | null>> = {
      '/entrar': [ETIQUETA_PROTOTIPO, AVISO_DEMONSTRACAO, ENTRAR.criarConta],
      // Criar conta: o aviso e o link, sem a etiqueta (3.6).
      '/criar-conta': [AVISO_DEMONSTRACAO, CRIAR_CONTA.entrar],
      '/recuperar-acesso': [ETIQUETA_PROTOTIPO, AVISO_DEMONSTRACAO, RECUPERAR.entrar, RECUPERAR.criarConta],
      '/redefinir-senha': [ETIQUETA_PROTOTIPO, AVISO_DEMONSTRACAO],
      '/conta-excluida': [ETIQUETA_PROTOTIPO, AVISO_DEMONSTRACAO, CONTA_EXCLUIDA.inicio, CONTA_EXCLUIDA.criarConta],
    }
    for (const [caminho] of TELAS) {
      const { container, unmount } = abrir(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(itensDaLateral(container), caminho).toEqual(esperado[caminho])
      unmount()
    }
  })

  it('C-1, modo memória: o aviso é um <p> em ui 15/21, dentro da abertura, sem borda nem fundo, e só há um', async () => {
    for (const [caminho] of TELAS) {
      const { container, unmount } = abrir(caminho)
      await screen.findByRole('heading', { level: 1 })

      const avisos = container.querySelectorAll('[data-aviso]')
      expect(avisos, caminho).toHaveLength(1)
      const aviso = avisos[0]
      expect(aviso.getAttribute('data-aviso')).toBe('demonstracao')
      expect(aviso.tagName).toBe('P')
      expect(aviso.hasAttribute('role')).toBe(false)
      expect(aviso.textContent).toBe(AVISO_DEMONSTRACAO)
      expect(aviso.closest('.sb-abertura-lateral'), caminho).not.toBeNull()
      expect(aviso.classList.contains('t-ui')).toBe(true)
      expect([...aviso.classList].filter((c) => /^(border|bg-|rounded|texto-info|cartao|etiqueta)/.test(c))).toEqual([])
      unmount()
    }
  })

  it('C-1, modo banco: o aviso do banco de teste está na abertura de Criar conta, em ui 15/21, e as outras telas não o têm', async () => {
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('o teste chamou a rede')
    }))
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')

    const criar = renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    const aviso = criar.container.querySelector('[data-aviso]')!
    expect(aviso.getAttribute('data-aviso')).toBe('banco-de-demonstracao')
    expect(aviso.tagName).toBe('P')
    expect(aviso.textContent).toBe(AVISO_BANCO_DEMONSTRACAO)
    expect(aviso.closest('.sb-abertura-lateral')).not.toBeNull()
    expect(aviso.classList.contains('t-ui')).toBe(true)
    expect(itensDaLateral(criar.container)).toEqual([AVISO_BANCO_DEMONSTRACAO, CRIAR_CONTA.entrar])
    criar.unmount()

    const entrar = renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })
    expect(entrar.container.querySelectorAll('[data-aviso]')).toHaveLength(0)
    expect(itensDaLateral(entrar.container)).toEqual([ETIQUETA_PROTOTIPO, ENTRAR.criarConta])
  })

  it('o aviso, no CSS, não tem borda, fundo nem sombra', () => {
    const regra = /\.sb-acesso-aviso\s*\{([^}]*)\}/.exec(semComentarios(blocoDe44d3))
    expect(regra).not.toBeNull()
    expect(regra![1]).not.toMatch(/border|background|box-shadow/)
  })
})

describe('os campos: linha rótulo + campo do sistema', () => {
  const casos: Array<[string, number, number]> = [
    ['/entrar', 2, 1],
    ['/criar-conta', 3, 1],
    ['/recuperar-acesso', 1, 0],
    ['/redefinir-senha', 2, 1],
  ]

  for (const [caminho, campos, olhos] of casos) {
    it(`${caminho}: ${campos} linha(s) de campo, cada uma com rótulo ligado, e ${olhos} botão de mostrar senha`, async () => {
      const { container } = abrir(caminho)
      await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(container.querySelectorAll('.sb-campo')).toHaveLength(campos))

      for (const linha of container.querySelectorAll('.sb-campo')) {
        const rotulo = linha.querySelector('label.sb-campo-rotulo.t-rotulo')!
        const entrada = linha.querySelector('input.sb-campo-entrada')!
        expect(rotulo.getAttribute('for')).toBe(entrada.id)
        expect(entrada.id).not.toBe('')
        expect(linha.closest('.grade-10')).not.toBeNull()
      }
      const botoes = container.querySelectorAll('button.sb-campo-olho')
      expect(botoes).toHaveLength(olhos)
      for (const botao of botoes) {
        expect(botao.getAttribute('aria-label')).toBe('Mostrar senha')
        expect(botao.getAttribute('aria-pressed')).toBe('false')
      }
    })
  }

  it('o botão de mostrar senha alterna o campo e o aria-pressed', async () => {
    const { container } = abrir('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    const olho = container.querySelector('button.sb-campo-olho')!
    fireEvent.click(olho)
    expect(olho.getAttribute('aria-pressed')).toBe('true')
    expect(campoPorRotulo('Senha').type).toBe('text')
    fireEvent.click(olho)
    expect(olho.getAttribute('aria-pressed')).toBe('false')
    expect(campoPorRotulo('Senha').type).toBe('password')
  })

  it('o erro fica na própria linha (17/24, abaixo do valor), ligado ao campo, sem criar outra linha', async () => {
    const { container } = abrir('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })
    const filhosDoForm = container.querySelectorAll('main form > *').length
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const linha = container.querySelector('.sb-campo[data-erro]')!
    const erro = linha.querySelector('p.sb-campo-erro.t-corpo-p')!
    expect(erro.textContent).toBe('Escreva o seu e-mail.')
    expect(linha.querySelector('input')!.getAttribute('aria-describedby')).toBe(erro.id)
    expect(container.querySelectorAll('.sb-campo')).toHaveLength(2)
    expect(container.querySelectorAll('main form > *')).toHaveLength(filhosDoForm)
    expect(container.querySelector('.border-l-4')).toBeNull()
  })

  it('a ajuda de Criar conta também fica na linha do campo (17/24)', async () => {
    const { container } = abrir('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    const linhas = container.querySelectorAll('.sb-campo')
    expect(linhas[0].querySelector('p.sb-campo-ajuda.t-corpo-p')!.textContent).toBe('É o nome que a família vai ver.')
    expect(linhas[2].querySelector('p.sb-campo-ajuda.t-corpo-p')!.textContent).toBe('Pelo menos 6 caracteres.')
    expect(linhas[1].querySelector('p.sb-campo-ajuda')).toBeNull()
  })
})

describe('a ação', () => {
  for (const [caminho] of TELAS.filter(([c]) => c !== '/conta-excluida')) {
    it(`${caminho}: o botão de envio é o primário do sistema (80 px, 64 no celular), e não o botão antigo`, async () => {
      const { container } = abrir(caminho)
      await screen.findByRole('heading', { level: 1 })

      const envio = container.querySelector<HTMLButtonElement>('main form button[type="submit"]')!
      expect(envio.classList.contains('sb-botao')).toBe(true)
      expect(envio.classList.contains('t-botao')).toBe(true)
      expect(envio.getAttribute('data-botao')).toBe('primario')
      expect(envio.className).not.toMatch(/(^|\s)botao(-|\s|$)/)
      expect(envio.closest('.sb-acesso-acao')).not.toBeNull()
    })
  }

  it('em Entrar, o link "Esqueci a senha" fica ao lado do botão, na mesma ação', async () => {
    const { container } = abrir('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    const acao = container.querySelector('.sb-acesso-acao')!
    const filhos = [...acao.children]
    expect(filhos.map((f) => f.tagName)).toEqual(['BUTTON', 'A'])
    expect(filhos[1].textContent).toBe(ENTRAR.esqueci)
  })

  it('"Tentar de novo" é o botão de moldura dupla do sistema, dentro do aviso de erro', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'entrar', 'rede')
    renderizarComDados('/entrar', { dados })
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', 'qualquer')
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.classList.contains('sb-resumo')).toBe(true)
    expect(alerta.querySelector('p')!.textContent).toBe(TEXTOS_ERRO.rede)
    const repetir = within(alerta).getByRole('button', { name: 'Tentar de novo' })
    expect(repetir.getAttribute('data-botao')).toBe('moldura')
    expect(repetir.hasAttribute('data-moldura-dupla')).toBe(true)
  })

  it('C-3: em Criar conta, o texto de aceite é o último bloco antes do botão', async () => {
    const { container } = abrir('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    const aceite = container.querySelector('p.sb-acesso-aceite')!
    expect(aceite.classList.contains('t-corpo-p')).toBe(true)
    expect(aceite.textContent).toBe('Ao criar a conta, você concorda com os Termos de uso e a Política de privacidade.')
    expect(aceite.nextElementSibling!.classList.contains('sb-acesso-acao')).toBe(true)
    expect(aceite.nextElementSibling!.querySelector('button[type="submit"]')).not.toBeNull()
    expect(aceite.previousElementSibling!.classList.contains('sb-acesso-campos')).toBe(true)
  })
})

describe('R-3: em Recuperar, a mensagem de resultado ocupa a mesma linha de 112 px', () => {
  it('a região de status é única e está dentro da linha do campo, vazia antes do envio', async () => {
    const { container } = abrir('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })

    const linha = container.querySelector('.sb-campo')!
    const status = screen.getByRole('status')
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(linha.contains(status)).toBe(true)
    expect(status.classList.contains('sb-campo-status')).toBe(true)
    expect(status.textContent).toBe('')
  })

  it('depois do envio a mensagem entra na linha, e a tela não ganha nem perde nenhum bloco', async () => {
    const { container } = abrir('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })
    const principal = container.querySelector('main')!
    const forma = () => ({
      blocos: principal.children.length,
      filhosDoForm: container.querySelectorAll('main form > *').length,
      linhas: container.querySelectorAll('.sb-campo').length,
      filhosDaLinha: container.querySelector('.sb-campo')!.children.length,
    })
    const antes = forma()

    digitar('E-mail', 'juliana@exemplo.invalid')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(RECUPERAR.resultado))

    expect(container.querySelector('.sb-campo')!.contains(screen.getByRole('status'))).toBe(true)
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(forma()).toEqual(antes)
  })

  it('a mensagem cabe em uma linha: no máximo 62 caracteres, e a frase não revela se a conta existe', () => {
    expect(RECUPERAR.resultado.length).toBeLessThanOrEqual(62)
    expect(RECUPERAR.resultado).toMatch(/^Se a conta existir/)
  })

  it('no CSS, a mensagem ocupa a terceira linha da grade da linha de campo, como o erro e a ajuda', () => {
    const regra = /\.sb-campo-status\s*\{([^}]*)\}/.exec(semComentarios(blocoDe44d3))
    expect(regra![1]).toMatch(/grid-column:\s*3 \/ 8/)
    expect(regra![1]).toMatch(/grid-row:\s*3/)
    expect(regra![1]).not.toMatch(/height|min-height/)
  })
})

describe('as linhas "rótulo + texto" e a mídia', () => {
  const linhasDe = (container: HTMLElement, tema: string) =>
    container.querySelector(`section[aria-label="${tema}"]`)!

  it('Entrar: 4 linhas de "O que você vê ao entrar" e uma moldura de mídia vazia no fim', async () => {
    const { container } = abrir('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    const secao = linhasDe(container, 'O que você vê ao entrar')
    expect(secao.classList.contains('sb-area')).toBe(true)
    expect(secao.querySelectorAll('.sb-linha')).toHaveLength(4)
    expect([...secao.querySelectorAll('h2.sb-linha-rotulo')].map((h) => h.textContent)).toEqual([
      'Registros',
      'Autoria',
      'Madrugada',
      'Demonstração',
    ])

    const midias = container.querySelectorAll('[data-midia]')
    expect(midias).toHaveLength(1)
    const midia = midias[0]
    expect(midia.getAttribute('role')).toBe('img')
    expect(midia.getAttribute('aria-label')).toBe('Celular com a tela Hoje.')
    expect(midia.getAttribute('data-formato')).toBe('larga')
    expect(midia.getAttribute('data-fundo')).toBe('barro')
    expect(midia.textContent).toBe('')
    expect(midia.children).toHaveLength(0)
    expect(container.querySelector('main')!.lastElementChild!.contains(midia)).toBe(true)
  })

  it('Criar conta e Recuperar: 4 linhas cada, sem mídia', async () => {
    const criar = abrir('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    expect(linhasDe(criar.container, 'O que a conta guarda').querySelectorAll('.sb-linha')).toHaveLength(4)
    expect(criar.container.querySelectorAll('[data-midia]')).toHaveLength(0)
    criar.unmount()

    const recuperar = abrir('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })
    expect(linhasDe(recuperar.container, 'Como funciona o link').querySelectorAll('.sb-linha')).toHaveLength(4)
    expect(recuperar.container.querySelectorAll('[data-midia]')).toHaveLength(0)
  })

  it('cada texto é uma frase curta (de até 110 caracteres) e nenhum rótulo repete', () => {
    for (const { linhas } of [ENTRAR.explicacao, CRIAR_CONTA.explicacao, RECUPERAR.explicacao]) {
      expect(new Set(linhas.map((l) => l.rotulo)).size).toBe(linhas.length)
      for (const linha of linhas) expect(linha.texto.length, linha.texto).toBeLessThanOrEqual(110)
    }
  })

  it('Redefinir e Conta excluída não têm linhas nem mídia (não têm plano próprio)', async () => {
    for (const caminho of ['/redefinir-senha', '/conta-excluida']) {
      const { container, unmount } = abrir(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(container.querySelectorAll('.sb-linha, [data-midia]'), caminho).toHaveLength(0)
      unmount()
    }
  })
})

describe('os textos das aberturas', () => {
  it('cada linha sob o h1 cabe em 1 linha em 1440 (cerca de 48 caracteres)', () => {
    for (const frase of [ENTRAR.frase, CRIAR_CONTA.frase, RECUPERAR.frase, REDEFINIR.frase, CONTA_EXCLUIDA.frase]) {
      expect(frase.length, frase).toBeLessThanOrEqual(48)
    }
  })
})

describe('o link vencido de /redefinir-senha', () => {
  it('é uma mensagem em c2 e o botão primário do sistema na coluna da ação', async () => {
    const { container } = renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    await screen.findByText(TEXTOS_ERRO.link_vencido)

    const mensagem = screen.getByText(TEXTOS_ERRO.link_vencido)
    expect(mensagem.classList.contains('sb-status')).toBe(true)
    const pedir = within(container.querySelector('main')!).getByRole('link', { name: REDEFINIR.pedirOutroLink })
    expect(pedir.getAttribute('href')).toBe('/recuperar-acesso')
    expect(pedir.classList.contains('sb-botao')).toBe(true)
    expect(pedir.closest('.sb-acesso-acao')).not.toBeNull()
  })
})

describe('o CSS de 44d-3 segue o contrato', () => {
  const bloco = semComentarios(blocoDe44d3)

  it('existe e não usa sombra, caixa alta, filtro, transição, tamanho de letra nem cor fixa', () => {
    expect(bloco.length).toBeGreaterThan(500)
    expect(bloco).not.toMatch(/box-shadow|text-transform|backdrop-filter|transition|font-size|letter-spacing/)
    expect(bloco).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(bloco).not.toMatch(/rgba?\(|hsla?\(/)
  })

  it('espaços só na escala 8, 16, 24, 32, 64, 96, 128, 160, 192 (e 0)', () => {
    const permitidos = new Set([0, 8, 16, 24, 32, 64, 96, 128, 160, 192])
    for (const m of bloco.matchAll(/(?:^|[;{\s])(?:margin|padding|gap|row-gap|column-gap)(?:-[a-z]+)?\s*:\s*([^;}]+)/g)) {
      for (const valor of m[1].matchAll(/(-?\d*\.?\d+)px/g)) {
        expect(permitidos.has(Math.abs(Number(valor[1]))), m[0].trim()).toBe(true)
      }
    }
  })

  it('o foco do h1 não ganha contorno e os fios são de 1 px', () => {
    expect(bloco).not.toMatch(/outline/)
    for (const m of bloco.matchAll(/border(?:-[a-z]+)*\s*:\s*([^;}]+)/g)) expect(m[1], m[0]).toMatch(/^\s*(0|none|1px\b)/)
  })
})

// E-7 (e C-4, R-4, B-4, que o reaproveitam): "o erro aparece em 17/24 abaixo do campo, sem mudar a
// altura da linha". Abaixo de 768 o campo é um bloco, e um erro que entra no fluxo (com margem) cresce
// a linha em 32 px e empurra o botão. A causa é o fluxo: o erro precisa sair dele e morar no vão que já
// existe abaixo do campo. A altura real é do medidor e da sonda; este teste só impede a volta da causa.
describe('o erro de campo abaixo de 768 não ocupa fluxo (E-7)', () => {
  /** As regras (seletor e corpo) de dentro de cada `@media (max-width: 767px)` do bloco, sem comentários. */
  function regrasAbaixoDe768(texto: string) {
    const regras: Array<{ seletor: string; corpo: string }> = []
    for (const abertura of texto.matchAll(/@media\s*\(max-width:\s*767px\)\s*\{/g)) {
      const comeco = abertura.index + abertura[0].length
      let profundidade = 1
      let fim = comeco
      while (fim < texto.length && profundidade > 0) {
        if (texto[fim] === '{') profundidade += 1
        else if (texto[fim] === '}') profundidade -= 1
        fim += 1
      }
      for (const regra of texto.slice(comeco, fim - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        regras.push({ seletor: regra[1].trim(), corpo: regra[2] })
      }
    }
    return regras
  }

  const regras = regrasAbaixoDe768(semComentarios(blocoDe44d3))
  const doErro = regras.filter((r) => /\.sb-campo-erro$/.test(r.seletor) && r.seletor.includes('.sb-acesso-campos'))

  it('o erro das linhas de acesso é `position: absolute`, ancorado no campo, sem margem', () => {
    expect(doErro.length).toBeGreaterThan(0)
    const corpo = doErro.map((r) => r.corpo).join(';')
    expect(corpo).toMatch(/position:\s*absolute/)
    for (const m of corpo.matchAll(/margin(?:-[a-z]+)?\s*:\s*([^;}]+)/g)) expect(m[1].trim(), m[0]).toMatch(/^0(px)?(\s+0(px)?)*$/)
  })

  it('nenhuma regra abaixo de 768 devolve o erro ao fluxo nem dá margem a ele', () => {
    for (const r of regras.filter((x) => /\.sb-campo-erro$/.test(x.seletor) && x.seletor.includes('.sb-acesso-campos'))) {
      expect(r.corpo, r.seletor).not.toMatch(/position:\s*(static|relative)/)
      expect(r.corpo, r.seletor).not.toMatch(/margin(?:-[a-z]+)?\s*:[^;]*[1-9]/)
    }
  })

  it('com ajuda, a linha reserva o lugar das mensagens e a ajuda e o erro ficam ancorados nele', () => {
    const linha = regras.filter((r) => /\.sb-campo\[data-ajuda\]$/.test(r.seletor) && r.seletor.includes('.sb-acesso-campos'))
    expect(linha.map((r) => r.corpo).join(';')).toMatch(/padding-bottom:\s*32px/)
    const ajuda = regras.filter((r) => /\.sb-campo\[data-ajuda\]\s+\.sb-campo-ajuda$/.test(r.seletor) && r.seletor.includes('.sb-acesso-campos'))
    expect(ajuda.map((r) => r.corpo).join(';')).toMatch(/position:\s*absolute/)
    const erro = regras.filter((r) => /\.sb-campo\[data-ajuda\]\s+\.sb-campo-erro$/.test(r.seletor) && r.seletor.includes('.sb-acesso-campos'))
    expect(erro.map((r) => r.corpo).join(';')).toMatch(/bottom:\s*8px/)
  })

  it('com ajuda e erro, a ajuda sai da vista pelo clip (continua no DOM, sem display: none)', () => {
    const ajuda = regras.filter((r) => /\.sb-campo\[data-ajuda\]\[data-erro\]\s+\.sb-campo-ajuda$/.test(r.seletor) && r.seletor.includes('.sb-acesso-campos'))
    expect(ajuda.length).toBeGreaterThan(0)
    const corpo = ajuda.map((r) => r.corpo).join(';')
    expect(corpo).toMatch(/clip:\s*rect\(0,\s*0,\s*0,\s*0\)/)
    expect(corpo).not.toMatch(/display:\s*none|visibility:\s*hidden/)
  })
})
