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

// D-1 (E-7): o anel de foco do campo não encosta no texto de ajuda ou de erro. O anel (2 px, offset 2: 4 px
// fora do `input`) descia até 4 px abaixo da linha do valor, onde a mensagem começa; a tinta da ajuda ("É o
// nome...", com acento no É) começava 1 px abaixo da caixa da mensagem, a 3 px de DENTRO do anel. A causa é a
// geometria: a entrada ocupava os 58 px da linha do valor e a mensagem vinha colada nela. O contrato não muda
// (linha de 112, valor 48, rótulo 32, mensagem 17/24, anel de 2 px com offset 2). Duas peças, na conta:
//   - a entrada é mais baixa que a linha do valor (58 px) e fica centrada nela: o anel sobe `(58 - h) / 2` px;
//   - a mensagem desce `top` px sem sair do lugar no fluxo (`position: relative`: a linha segue com 112 px).
// A folga entre a base do anel e a tinta é `top + (58 - h) / 2 + OFFSET_DA_TINTA - 4` e tem de ser >= 4 px.
// A altura real e a folga medida são do medidor (E-7); este teste só impede a volta da causa.
describe('o anel de foco não encosta na mensagem do campo (D-1)', () => {
  const MINIMO = 4
  /** A tinta da ajuda mais alta (o acento do É) começa 1 px abaixo do topo da caixa de 24 px da mensagem. */
  const OFFSET_DA_TINTA = 1
  /** O anel passa 4 px (2 de offset + 2 de largura) da caixa da entrada. */
  const ALCANCE_DO_ANEL = 4
  const LINHA_DO_VALOR = 58

  /** As regras (seletor e corpo) de dentro de cada `@media` que casa com `faixa`, sem comentários. */
  function regrasDaFaixa(texto: string, faixa: RegExp) {
    const regras: Array<{ seletor: string; corpo: string }> = []
    for (const abertura of texto.matchAll(new RegExp(`@media\\s*\\(${faixa.source}\\)\\s*\\{`, 'g'))) {
      const comeco = abertura.index + abertura[0].length
      let profundidade = 1
      let fim = comeco
      while (fim < texto.length && profundidade > 0) {
        if (texto[fim] === '{') profundidade += 1
        else if (texto[fim] === '}') profundidade -= 1
        fim += 1
      }
      for (const regra of texto.slice(comeco, fim - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        // Uma lista de seletores vira uma entrada por seletor, cada uma com o mesmo corpo.
        for (const seletor of regra[1].split(',')) regras.push({ seletor: seletor.trim(), corpo: regra[2] })
      }
    }
    return regras
  }

  const bloco = semComentarios(blocoDe44d3)
  const deComputador = regrasDaFaixa(bloco, /min-width:\s*768px/)
  const doCelular = regrasDaFaixa(bloco, /max-width:\s*767px/)
  const px = (corpo: string, propriedade: string) => {
    const valores = [...corpo.matchAll(new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*(-?\\d*\\.?\\d+)px`, 'g'))]
    return valores.length > 0 ? Number(valores[valores.length - 1][1]) : undefined
  }
  const corpoDe = (regras: Array<{ seletor: string; corpo: string }>, fim: RegExp) =>
    regras
      .filter((r) => r.seletor.includes('.sb-acesso-campos') && fim.test(r.seletor))
      .map((r) => r.corpo)
      .join(';')

  describe('de 768 para cima (a mensagem mora dentro da linha de 112 px)', () => {
    it('a entrada é mais baixa que a linha do valor e o seletor é o da entrada de acesso', () => {
      const altura = px(corpoDe(deComputador, /\.sb-campo-entrada$/), 'height')
      expect(altura, 'height da .sb-campo-entrada em min-width: 768px').toBeDefined()
      expect(altura!).toBeLessThan(LINHA_DO_VALOR)
      // Cabe o valor de 48 px (a tinta tem uns 45): menos que isso corta o descendente.
      expect(altura!).toBeGreaterThanOrEqual(50)
    })

    it('a mensagem (erro, ajuda e status) desce sem sair do fluxo: position relative e top', () => {
      for (const fim of [/\.sb-campo-erro$/, /\.sb-campo-ajuda$/, /\.sb-campo-status$/]) {
        const corpo = corpoDe(deComputador, fim)
        expect(corpo, String(fim)).toMatch(/position:\s*relative/)
        expect(px(corpo, 'top'), `top de ${fim}`).toBeGreaterThan(0)
        expect(corpo, String(fim)).not.toMatch(/margin|padding|height/)
      }
    })

    it('a folga entre a base do anel e a tinta da mensagem é de pelo menos 4 px, nas três mensagens', () => {
      const altura = px(corpoDe(deComputador, /\.sb-campo-entrada$/), 'height')!
      for (const fim of [/\.sb-campo-erro$/, /\.sb-campo-ajuda$/, /\.sb-campo-status$/]) {
        const descida = px(corpoDe(deComputador, fim), 'top')!
        const folga = descida + (LINHA_DO_VALOR - altura) / 2 + OFFSET_DA_TINTA - ALCANCE_DO_ANEL
        expect(folga, `folga com ${String(fim)}`).toBeGreaterThanOrEqual(MINIMO)
      }
    })

    it('a linha continua com 112 px: nenhuma regra do bloco muda a grade, a altura mínima ou o anel', () => {
      const todas = deComputador
        .filter((r) => r.seletor.includes('.sb-campo'))
        .map((r) => r.corpo)
        .join(';')
      expect(todas.length).toBeGreaterThan(0)
      expect(todas).not.toMatch(/grid-template-rows|min-height|outline|line-height/)
    })

    it('fica fora da caixa de diálogo da Conta, que não é uma linha de acesso', () => {
      for (const r of deComputador.filter((x) => /\.sb-campo-(entrada|erro|ajuda|status)$/.test(x.seletor))) {
        expect(r.seletor, r.seletor).toContain('.sb-acesso-campos')
        expect(r.seletor, r.seletor).not.toContain('.conta-dialogo')
      }
    })
  })

  describe('abaixo de 768 (o campo é um bloco de 64 px e a mensagem mora no vão)', () => {
    it('a entrada também é mais baixa que o campo, e o anel sobe: a tinta fica a pelo menos 4 px', () => {
      // O campo tem 64 px com o fio de 1: a entrada tem 63 e fica centrada. A mensagem começa onde o campo termina
      // (a tinta do erro, sem acento, 5 px abaixo do topo da caixa): o anel passa (63 - h) / 2 - 4 da base do campo.
      const altura = px(corpoDe(doCelular, /\.sb-campo-entrada$/), 'height')
      expect(altura, 'height da .sb-campo-entrada em max-width: 767px').toBeDefined()
      expect(altura!).toBeLessThan(63)
      const folga = 5 - (ALCANCE_DO_ANEL - (63 - altura!) / 2)
      expect(folga).toBeGreaterThanOrEqual(MINIMO)
      expect(altura!).toBeGreaterThanOrEqual(48)
    })
  })

  // Regressão do D-1 na madrugada: a entrada de 52 px reprovava o G11 (alvo de toque de 56 px de altura na
  // madrugada, 44 no claro). A entrada de 768 para cima tem de ser, em cada tema, ao menos o `--alvo-toque` dele.
  // Centrar os 56 px nos 58 da linha do valor leva a base do anel 2 px para baixo: a folga cai para 2 px, e descer a
  // mensagem para recuperá-la (top: 6 px) encosta o descendente da letra no fio de baixo. Então a entrada cresce para
  // cima: a base dela e a área do texto (52 px) ficam onde o D-1 as pôs, nos dois temas, e a folga e a mensagem são
  // as de antes. A madrugada não ganha seletor próprio (`estilo.test.ts`: nenhuma regra do campo depende de
  // `data-tema`): ela entra pelo token `--alvo-toque`, que o tema já redefine. Altura e folga reais são do medidor.
  describe('o G11 vale na madrugada (regressão do D-1)', () => {
    const temaCss = readFileSync(pastaSrcDe(import.meta.url) + '../../styles/tema.css', 'utf8')
    const alvoDoClaro = Number(/:root\s*\{[^}]*--alvo-toque:\s*(\d+)px/.exec(temaCss)?.[1])
    const alvoDaMadrugada = Number(
      /\[data-tema-local=['"]madrugada['"]\][^{]*\{[^}]*--alvo-toque:\s*(\d+)px/.exec(temaCss)?.[1],
    )
    const TEMAS = [
      ['claro', alvoDoClaro],
      ['madrugada', alvoDaMadrugada],
    ] as const
    /** A entrada do D-1: 52 px, centrada na linha do valor. A área do texto e a base dela são as de referência. */
    const ALTURA_DO_D1 = 52
    const BASE_DO_D1 = (LINHA_DO_VALOR + ALTURA_DO_D1) / 2

    const corpoDaEntrada = () => corpoDe(deComputador, /\.sb-campo-entrada$/)
    const ultima = (propriedade: string) => {
      const todas = [...corpoDaEntrada().matchAll(new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*([^;]+)`, 'g'))]
      return todas.length > 0 ? todas[todas.length - 1][1].trim() : undefined
    }
    /** `calc(max(52px, var(--alvo-toque)) - 52px)` ou `calc((52px - max(52px, var(--alvo-toque))) / 2)`, em px. */
    function resolver(valor: string | undefined, alvo: number) {
      if (valor === undefined) return 0
      const simples = /^(-?\d*\.?\d+)(px)?$/.exec(valor)
      if (simples) return Number(simples[1])
      const cresce = /^calc\(\s*max\(\s*(\d+)px\s*,\s*var\(--alvo-toque\)\s*\)\s*-\s*(\d+)px\s*\)$/.exec(valor)
      if (cresce) return Math.max(Number(cresce[1]), alvo) - Number(cresce[2])
      const sobe = /^calc\(\s*\(\s*(\d+)px\s*-\s*max\(\s*(\d+)px\s*,\s*var\(--alvo-toque\)\s*\)\s*\)\s*\/\s*(\d+)\s*\)$/.exec(valor)
      if (sobe) return (Number(sobe[1]) - Math.max(Number(sobe[2]), alvo)) / Number(sobe[3])
      throw new Error(`valor fora do que o teste sabe ler: ${valor}`)
    }

    /** A geometria da entrada num tema, em px a partir do topo da linha do valor (58 px, entrada centrada nela). */
    function entradaNoTema(alvo: number) {
      const altura = Math.max(px(corpoDaEntrada(), 'height') ?? 0, /min-block-size:\s*var\(--alvo-toque\)/.test(corpoDaEntrada()) ? alvo : 0)
      const recuo = resolver(ultima('padding-block-start'), alvo)
      const deslocamento = ultima('position') === 'relative' ? resolver(ultima('top'), alvo) : 0
      const topo = (LINHA_DO_VALOR - altura) / 2 + deslocamento
      return { altura, base: topo + altura, areaDoTexto: altura - recuo, centroDoTexto: topo + recuo + (altura - recuo) / 2 }
    }

    it('os dois alvos vêm do tema: 44 no claro, 56 na madrugada', () => {
      expect(alvoDoClaro).toBe(44)
      expect(alvoDaMadrugada).toBe(56)
    })

    it.each(TEMAS)('a entrada de 768 para cima tem pelo menos o alvo de toque do tema %s (G11)', (_tema, alvo) => {
      expect(entradaNoTema(alvo).altura).toBeGreaterThanOrEqual(alvo)
    })

    it('na madrugada a entrada tem pelo menos 56 px de altura', () => {
      expect(entradaNoTema(alvoDaMadrugada).altura).toBeGreaterThanOrEqual(56)
    })

    it('no claro a entrada segue com 52 px (nada mudou)', () => {
      expect(entradaNoTema(alvoDoClaro)).toMatchObject({ altura: ALTURA_DO_D1, base: BASE_DO_D1 })
    })

    it.each(TEMAS)('o valor e a base da entrada ficam onde o D-1 os pôs, no tema %s', (_tema, alvo) => {
      const entrada = entradaNoTema(alvo)
      // A base do anel (base + 4) e, com ela, a folga para a mensagem, não mudam.
      expect(entrada.base).toBe(BASE_DO_D1)
      // A área do texto tem os 52 px do D-1 e o centro dela é o centro da linha do valor: o valor não sai do lugar.
      expect(entrada.areaDoTexto).toBe(ALTURA_DO_D1)
      expect(entrada.centroDoTexto).toBe(LINHA_DO_VALOR / 2)
    })

    it.each(TEMAS)('a folga entre a base do anel e a tinta da mensagem é de pelo menos 4 px no tema %s', (_tema, alvo) => {
      const { base } = entradaNoTema(alvo)
      for (const fim of [/\.sb-campo-erro$/, /\.sb-campo-ajuda$/, /\.sb-campo-status$/]) {
        const descida = px(corpoDe(deComputador, fim), 'top')!
        const folga = LINHA_DO_VALOR + descida + OFFSET_DA_TINTA - (base + ALCANCE_DO_ANEL)
        expect(folga, `folga com ${String(fim)}`).toBeGreaterThanOrEqual(MINIMO)
      }
    })

    it('a mensagem não desce além do D-1 (o descendente da letra não chega ao fio de baixo)', () => {
      for (const fim of [/\.sb-campo-erro$/, /\.sb-campo-ajuda$/, /\.sb-campo-status$/]) {
        expect(px(corpoDe(deComputador, fim), 'top'), String(fim)).toBeLessThanOrEqual(4)
      }
    })

    it('nenhuma regra do bloco liga a madrugada por `data-tema`: ela entra pelo token', () => {
      expect(bloco).not.toMatch(/data-tema/)
    })
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

  // R-3 (e R-4): "a mensagem ocupa a mesma linha, sem a página mudar de altura". A confirmação (2 linhas
  // em 358 px) entrava no fluxo: 8 + 48 px a mais na linha, na página e no topo do botão. A causa é o
  // fluxo: a linha do Recuperar (`data-status`) reserva uma zona fixa de 2 linhas abaixo do campo, com ou
  // sem mensagem (8 de ar + 48 das duas linhas + 8 de folga = 64 px, na escala de espaços), e a
  // confirmação e o erro moram nela fora do fluxo. A altura real é do medidor e da sonda.
  describe('a zona de mensagem da linha com status abaixo de 768 (R-3)', () => {
    const daLinha = regras.filter((r) => r.seletor.includes('.sb-acesso-campos') && r.seletor.includes('.sb-campo[data-status]'))
    const corpoDe = (fim: RegExp) =>
      daLinha
        .filter((r) => fim.test(r.seletor))
        .map((r) => r.corpo)
        .join(';')

    it('a linha com data-status reserva a zona de 2 linhas com `padding-bottom`', () => {
      expect(corpoDe(/\.sb-campo\[data-status\]$/)).toMatch(/padding-bottom:\s*64px/)
    })

    it('a confirmação sai do fluxo e fica ancorada na zona, sem margem', () => {
      const corpo = corpoDe(/\.sb-campo-status$/)
      expect(corpo).toMatch(/position:\s*absolute/)
      expect(corpo).toMatch(/top:\s*calc\(100% - 64px\)/)
      for (const m of corpo.matchAll(/margin(?:-[a-z]+)?\s*:\s*([^;}]+)/g)) expect(m[1].trim(), m[0]).toMatch(/^0(px)?(\s+0(px)?)*$/)
      expect(corpo).not.toMatch(/position:\s*(static|relative)/)
    })

    it('o erro do campo mora na mesma zona (sai do vão de 24 px, onde cobriria o botão com 2 linhas)', () => {
      const corpo = corpoDe(/\.sb-campo-erro$/)
      expect(corpo).toMatch(/position:\s*absolute/)
      expect(corpo).toMatch(/top:\s*calc\(100% - 64px\)/)
      expect(corpo).not.toMatch(/position:\s*(static|relative)/)
      expect(corpo).not.toMatch(/margin(?:-[a-z]+)?\s*:[^;]*[1-9]/)
    })

    it('o vão até o botão (32 px) vem depois da zona: a regra do vão não é tocada', () => {
      const vao = regras.filter((r) => r.seletor === '.sb-acesso-campos + .sb-acesso-acao')
      expect(vao.map((r) => r.corpo).join(';')).toMatch(/margin-top:\s*32px/)
    })
  })
})
