import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import {
  AVISO_BANCO_DEMONSTRACAO,
  COMUM,
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
// O bloco da 44d-3 acaba onde começa o primeiro bloco de outro cartão que vem depois dele no arquivo
// (a 44d-2, a área logada, e a 44d-4, o Início).
const inicioDe44d3 = css.indexOf('44d-3:')
const fimsPossiveis = ['/* 44d-2 */', '/* 44d-4 */'].map((marca) => css.indexOf(marca)).filter((i) => i > inicioDe44d3)
const blocoDe44d3 = css.slice(inicioDe44d3, fimsPossiveis.length > 0 ? Math.min(...fimsPossiveis) : undefined)
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

  it('a mensagem cabe em uma linha: no máximo 40 caracteres, e a frase não revela se a conta existe', () => {
    // 44d-3, volta 3, D4: a confirmação é de uma linha em 390 (358 px de área útil, 17 px de letra), então a
    // zona de mensagem da linha tem 1 linha (32 px) e não 2 (64 px). A dica do spam está na linha "Se não chegar".
    expect(RECUPERAR.resultado).toBe('Se a conta existir, enviamos o link.')
    expect(RECUPERAR.resultado.length).toBeLessThanOrEqual(40)
    expect(RECUPERAR.resultado).toMatch(/^Se a conta existir/)
    expect(RECUPERAR.resultado).not.toMatch(/spam/i)
    expect(RECUPERAR.explicacao.linhas.find((l) => l.rotulo === 'Se não chegar')?.texto).toMatch(/spam/)
  })

  // D4-erro: os textos que o campo do Recuperar pode mostrar são o erro local (campo vazio), o `email_invalido` do
  // servidor e a confirmação. Os outros erros do envio vão para o resumo no topo do formulário, não para o campo.
  // Cada um tem de caber em 1 linha (o regime é o mesmo da confirmação: a página fica parada). Sem como medir
  // pixel aqui, o teste fixa o comprimento: nenhum passa da confirmação, que o medidor mede em 1 linha no Chrome.
  it('D4-erro: nenhuma mensagem do campo é maior que a confirmação de 1 linha, então a zona de 1 linha basta', () => {
    const doCampo = {
      'escrevaEmail (erro local do campo vazio)': COMUM.escrevaEmail,
      'email_invalido (erro do servidor, no campo)': TEXTOS_ERRO.email_invalido,
      'resultado (a confirmação)': RECUPERAR.resultado,
    }
    for (const [nome, texto] of Object.entries(doCampo)) {
      expect(texto, nome).toBeTruthy()
      expect(texto.length, nome).toBeLessThanOrEqual(RECUPERAR.resultado.length)
    }
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

  it('Entrar: 4 linhas de "O que você vê ao entrar" no fim da página, sem moldura de mídia (D1 da volta 3)', async () => {
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

    // Fail-closed: a moldura vazia saiu (o celular com o Hoje é do 44d-5 e a mídia do Entrar é do 44d-6).
    const principal = container.querySelector('main')!
    expect(principal.querySelectorAll('[data-midia]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-midia]')).toHaveLength(0)
    expect(principal.querySelector('[role="img"]')).toBeNull()
    expect(principal.lastElementChild).toBe(secao)
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

    // Volta 3 (D3): a grade da linha muda UM número, a folga de cima (27 -> 16 px), para o controle subir e a
    // mensagem ganhar 8 px de ar dos dois lados; a linha do valor (58 px) e a altura de 112 px ficam.
    it('a linha continua com 112 px: nenhuma regra do bloco muda a altura mínima ou o anel; a grade só muda a folga de cima', () => {
      const todas = deComputador
        .filter((r) => r.seletor.includes('.sb-campo'))
        .map((r) => r.corpo)
        .join(';')
      expect(todas.length).toBeGreaterThan(0)
      expect(todas).not.toMatch(/min-height|outline|line-height/)
      for (const m of todas.matchAll(/grid-template-rows\s*:\s*([^;]+)/g)) expect(m[1].trim(), m[0]).toMatch(/^\d+px\s+58px\s+auto$/)
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

    it('nenhuma regra do bloco liga a madrugada por `data-tema`: ela entra pelo token', () => {
      expect(bloco).not.toMatch(/data-tema/)
    })

    // Volta 3, defeito D3: a ajuda e o erro ficavam 3 a 5 px acima do fio da linha (a caixa de 24 px passava
    // do fio) e o anel de foco passava 3 a 4 px do fim do fio. O contrato (2.4) não tem passo abaixo de 8: da
    // mensagem ao fio e do controle à mensagem, 8 px; e o anel (2 px + 2 de offset) termina no fim do fio.
    // O "top: 4px" do D-1 passa a 5 px (a mensagem sobe 10 com a folga de cima de 27 -> 16 e desce 5 sobre a
    // grade): o limite de 4 px do D-1 contradizia a regra nova e saiu. As medidas reais são do medidor (D3-*).
    describe('D3: 8 px de ar acima e abaixo da mensagem, e o anel dentro do fio', () => {
      const LINHA = 112
      const FIO = 1
      const MENSAGEM = 24
      const AR = 8
      const MENSAGENS = [/\.sb-campo-erro$/, /\.sb-campo-ajuda$/, /\.sb-campo-status$/]

      /** A folga de cima da grade da linha (o primeiro valor de `27px 58px auto` do D3: 16). */
      const folgaDeCima = () => {
        const todas = [...corpoDe(deComputador, /\.sb-campo$/).matchAll(/grid-template-rows\s*:\s*(\d+)px\s+58px\s+auto/g)]
        return todas.length > 0 ? Number(todas[todas.length - 1][1]) : 27
      }
      const descida = (fim: RegExp) => px(corpoDe(deComputador, fim), 'top')!

      it('a folga de cima da grade é menor que os 27 px antigos', () => {
        expect(folgaDeCima()).toBeLessThan(27)
      })

      it.each(TEMAS)('o controle fica a pelo menos 8 px da mensagem, no tema %s', (_tema, alvo) => {
        const baseDoControle = folgaDeCima() + entradaNoTema(alvo).base
        for (const fim of MENSAGENS) {
          const topoDaMensagem = folgaDeCima() + LINHA_DO_VALOR + descida(fim)
          expect(topoDaMensagem - baseDoControle, `controle -> mensagem com ${String(fim)}`).toBeGreaterThanOrEqual(AR)
        }
      })

      it('a mensagem termina a pelo menos 8 px do fio de baixo da linha', () => {
        const topoDoFio = LINHA - FIO
        for (const fim of MENSAGENS) {
          const baseDaMensagem = folgaDeCima() + LINHA_DO_VALOR + descida(fim) + MENSAGEM
          expect(topoDoFio - baseDaMensagem, `mensagem -> fio com ${String(fim)}`).toBeGreaterThanOrEqual(AR)
        }
      })

      it('a linha segue com 112 px: o conteúdo (folga + valor + mensagem) cabe nos 111 px acima do fio, sem crescer a linha', () => {
        expect(folgaDeCima() + LINHA_DO_VALOR + MENSAGEM).toBeLessThanOrEqual(LINHA - FIO)
      })

      it('o anel termina no fim do fio: a caixa do controle é mais curta que a linha ao menos o alcance do anel (2 + 2 px)', () => {
        // `width: calc(100% - Npx)`: N não é espaço da escala (não é margin nem padding), é o alcance do anel.
        const corpo = corpoDe(deComputador, /\.sb-campo-controle$/)
        const encurta = [...corpo.matchAll(/(?:^|[;\s])width\s*:\s*calc\(\s*100%\s*-\s*(\d+)px\s*\)/g)]
        expect(encurta.length, 'width: calc(100% - Npx) da .sb-campo-controle em min-width: 768px').toBeGreaterThan(0)
        expect(Number(encurta[encurta.length - 1][1])).toBeGreaterThanOrEqual(ALCANCE_DO_ANEL)
        expect(corpo, 'o recuo não é margem nem padding: a escala de espaços do contrato fica como está').not.toMatch(/margin|padding/)
      })

      it('o encurtar do anel é só de 768 para cima: abaixo de 768 o controle não muda (o desenho de 390 é de outro passo)', () => {
        for (const r of doCelular.filter((x) => /\.sb-campo-controle$/.test(x.seletor))) {
          expect(r.corpo, r.seletor).not.toMatch(/width|padding-right|padding-inline/)
        }
        for (const fim of MENSAGENS) {
          expect(corpoDe(doCelular, fim), String(fim)).not.toMatch(/top:\s*5px/)
        }
        expect(corpoDe(doCelular, /\.sb-campo$/)).not.toMatch(/grid-template-rows/)
      })
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

  // R-3 (e R-4): "a mensagem ocupa a mesma linha, sem a página mudar de altura". A mensagem entrava no
  // fluxo e empurrava a página e o botão. A causa é o fluxo: a linha do Recuperar (`data-status`) reserva
  // uma zona fixa abaixo do campo, com ou sem mensagem, e a confirmação e o erro moram nela fora do fluxo.
  // Volta 3, D4: a zona era de 2 linhas (64 px) e deixava 96 px entre o fio do campo e o botão (as telas
  // irmãs têm 33). Agora a confirmação tem 1 linha em 390, e a zona é de 1 linha: 8 de ar + 24 da linha =
  // 32 px, mais os 32 px da margem do botão = 64 px do fio ao botão. A altura real é do medidor e da sonda.
  describe('a zona de mensagem da linha com status abaixo de 768 (R-3, D4)', () => {
    const daLinha = regras.filter((r) => r.seletor.includes('.sb-acesso-campos') && r.seletor.includes('.sb-campo[data-status]'))
    const corpoDe = (fim: RegExp) =>
      daLinha
        .filter((r) => fim.test(r.seletor))
        .map((r) => r.corpo)
        .join(';')

    it('a linha com data-status reserva a zona de 1 linha (32 px) com `padding-bottom`', () => {
      expect(corpoDe(/\.sb-campo\[data-status\]$/)).toMatch(/padding-bottom:\s*32px/)
    })

    it('D4-vao: a zona de 2 linhas (64 px) não volta, em nenhuma regra da linha, da confirmação nem do erro', () => {
      expect(daLinha.length).toBeGreaterThan(0)
      for (const r of daLinha) {
        expect(r.corpo, r.seletor).not.toMatch(/\b64px/)
        for (const m of r.corpo.matchAll(/padding-bottom:\s*([^;}]+)/g)) expect(m[1].trim(), r.seletor).toBe('32px')
        for (const m of r.corpo.matchAll(/top:\s*calc\(100% - (\d+)px\)/g)) expect(Number(m[1]), r.seletor).toBeLessThanOrEqual(32)
      }
    })

    it('D4-vao: o vão do fio ao botão é a zona (32) mais a margem do botão (32), 64 px no máximo', () => {
      const zona = Number(/padding-bottom:\s*(\d+)px/.exec(corpoDe(/\.sb-campo\[data-status\]$/))?.[1])
      const margem = Number(
        /margin-top:\s*(\d+)px/.exec(
          regras
            .filter((r) => r.seletor === '.sb-acesso-campos + .sb-acesso-acao')
            .map((r) => r.corpo)
            .join(';'),
        )?.[1],
      )
      expect(zona + margem).toBeLessThanOrEqual(64)
    })

    it('a confirmação sai do fluxo e fica ancorada na zona, sem margem', () => {
      const corpo = corpoDe(/\.sb-campo-status$/)
      expect(corpo).toMatch(/position:\s*absolute/)
      expect(corpo).toMatch(/top:\s*calc\(100% - 32px\)/)
      for (const m of corpo.matchAll(/margin(?:-[a-z]+)?\s*:\s*([^;}]+)/g)) expect(m[1].trim(), m[0]).toMatch(/^0(px)?(\s+0(px)?)*$/)
      expect(corpo).not.toMatch(/position:\s*(static|relative)/)
    })

    it('o erro do campo mora na mesma zona (1 linha: os erros do campo cabem em 1 linha, D4-erro)', () => {
      const corpo = corpoDe(/\.sb-campo-erro$/)
      expect(corpo).toMatch(/position:\s*absolute/)
      expect(corpo).toMatch(/top:\s*calc\(100% - 32px\)/)
      expect(corpo).not.toMatch(/position:\s*(static|relative)/)
      expect(corpo).not.toMatch(/margin(?:-[a-z]+)?\s*:[^;]*[1-9]/)
    })

    it('o vão até o botão (32 px) vem depois da zona: a regra do vão não é tocada', () => {
      const vao = regras.filter((r) => r.seletor === '.sb-acesso-campos + .sb-acesso-acao')
      expect(vao.map((r) => r.corpo).join(';')).toMatch(/margin-top:\s*32px/)
    })
  })
})

// Volta 3, D5 (anel): em 390 o `input` ocupava x 32–358 num campo de x 16–374 (o `.sb-campo-controle` tem 16 px de
// `padding` de cada lado), e o anel de foco (2 px de largura, 2 de offset: 4 px fora da caixa) ia de 28 a 362, mais
// estreito que o campo. A causa é o recuo do controle: a caixa do `input` tem de ficar 4 px para dentro de cada lado do
// campo, e então o anel é a caixa do campo. O texto digitado não sai de x=32 (o recuo passa de o controle ao próprio
// `input`, como `padding`), o botão de mostrar senha não sai do lugar (passa a flutuar sobre a ponta da entrada) e o
// contrato do anel (2 px, offset 2) não muda. A medida real é do medidor (D5-anel); este teste impede a volta da causa.
describe('o anel de foco é a caixa do campo em 390 (D5)', () => {
  const ALCANCE_DO_ANEL = 4
  const inicioDoD5 = blocoDe44d3.indexOf('44d-3, volta 3, D5')
  // O bloco começa no comentário de cabeçalho (o `/*` que vem antes do marcador) e acaba onde começa o cabeçalho do bloco seguinte
  // (a volta 3 acrescenta um bloco por item, um depois do outro).
  const comecoDoD5 = inicioDoD5 >= 0 ? blocoDe44d3.lastIndexOf('/*', inicioDoD5) : -1
  const fimDoD5 = comecoDoD5 >= 0 ? blocoDe44d3.indexOf('/* ---', comecoDoD5 + 2) : -1
  const blocoD5 = comecoDoD5 >= 0 ? semComentarios(blocoDe44d3.slice(comecoDoD5, fimDoD5 >= 0 ? fimDoD5 : undefined)) : ''

  /** As regras (seletor e corpo) de dentro dos `@media (max-width: 767px)` do texto, e as de fora deles. */
  function regrasDe(texto: string) {
    const dentro: Array<{ seletor: string; corpo: string }> = []
    let resto = texto
    for (const abertura of texto.matchAll(/@media\s*\(max-width:\s*767px\)\s*\{/g)) {
      const comeco = abertura.index + abertura[0].length
      let profundidade = 1
      let fim = comeco
      while (fim < texto.length && profundidade > 0) {
        if (texto[fim] === '{') profundidade += 1
        else if (texto[fim] === '}') profundidade -= 1
        fim += 1
      }
      const miolo = texto.slice(comeco, fim - 1)
      for (const regra of miolo.matchAll(/([^{}]+)\{([^{}]*)\}/g)) dentro.push({ seletor: regra[1].trim(), corpo: regra[2] })
      resto = resto.replace(texto.slice(abertura.index, fim), '')
    }
    const fora = [...resto.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((r) => ({ seletor: r[1].replace(/@layer\s+components/g, '').trim(), corpo: r[2] }))
      .filter((r) => r.seletor !== '')
    return { dentro, fora }
  }
  const { dentro, fora } = regrasDe(blocoD5)
  const corpoDe = (seletor: string) =>
    dentro
      .filter((r) => r.seletor === seletor)
      .map((r) => r.corpo)
      .join(';')
  /** As variáveis do bloco (`--alcance-do-anel: 4px`), em px. */
  const variaveis = new Map([...blocoD5.matchAll(/(--[a-z-]+)\s*:\s*(-?\d*\.?\d+)px/g)].map((m) => [m[1], Number(m[2])] as const))
  /** O valor de uma propriedade em px: `12px` ou um `calc()` de px e `var()` do bloco (a última declaração vale). */
  const px = (corpo: string, propriedade: string) => {
    const todos = [...corpo.matchAll(new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*([^;]+)`, 'g'))]
    if (todos.length === 0) return undefined
    const expressao = todos[todos.length - 1][1]
      .replace(/var\((--[a-z-]+)\)/g, (_t, nome: string) => {
        if (!variaveis.has(nome)) throw new Error(`variável sem valor no bloco: ${nome}`)
        return String(variaveis.get(nome))
      })
      .replace(/px/g, '')
      .replace(/calc/g, '')
      .trim()
    if (!/^[\d\s+\-*/().]+$/.test(expressao)) return undefined
    return Number(Function(`"use strict"; return (${expressao})`)())
  }

  /** O `padding` de cada lado do `.sb-campo-controle` abaixo de 768, da base (`padding: 0 16px`). */
  const recuoDoControle = Number(/\.sb-campo-controle\s*\{[^}]*padding:\s*0\s+(\d+)px/.exec(css.slice(css.indexOf('@media (max-width: 767px)', css.indexOf('.sb-campo-olho'))))?.[1])

  const ENTRADA = '.sb-acesso-campos .sb-campo-entrada'
  const ENTRADA_COM_OLHO = '.sb-acesso-campos .sb-campo-controle:has(> .sb-campo-olho) > .sb-campo-entrada'
  const OLHO = '.sb-acesso-campos .sb-campo-olho'

  it('o bloco da volta 3, D5, existe, e todas as regras dele são só de abaixo de 768 (1440 não muda)', () => {
    expect(inicioDoD5).toBeGreaterThanOrEqual(0)
    expect(dentro.length).toBeGreaterThan(0)
    expect(fora, 'nenhuma regra do D5 fora de `@media (max-width: 767px)`').toEqual([])
  })

  it('a caixa do `input` fica 4 px para dentro de cada lado do campo: o anel (2 + 2 px) é a caixa do campo', () => {
    expect(recuoDoControle, 'padding lateral do controle abaixo de 768 (base)').toBeGreaterThan(0)
    const corpo = corpoDe(ENTRADA)
    const margem = px(corpo, 'margin-inline')
    expect(margem, 'margin-inline da entrada de acesso').toBeDefined()
    expect(margem!).toBeLessThan(0)
    // O recuo do controle menos o que a margem negativa devolve é a distância da caixa do `input` ao campo.
    expect(recuoDoControle + margem!).toBe(ALCANCE_DO_ANEL)
  })

  it('o texto digitado fica onde estava: o recuo que a margem devolveu volta como `padding` do input', () => {
    const corpo = corpoDe(ENTRADA)
    expect(px(corpo, 'padding-inline')).toBe(-px(corpo, 'margin-inline')!)
  })

  it('o contrato do anel não muda: nenhuma regra do D5 mexe no outline', () => {
    expect(blocoD5).not.toMatch(/outline/)
  })

  it('o alvo de toque, o fundo e o fio do campo não mudam: nenhuma regra do D5 toca altura, fundo ou borda', () => {
    expect(blocoD5).not.toMatch(/(^|[;\s{])(height|min-height|max-height|min-block-size|background|background-color|border[a-z-]*)\s*:/)
  })

  it('o botão de mostrar senha flutua sobre a ponta da entrada, no mesmo lugar (16 px da borda), centrado', () => {
    const corpo = corpoDe(OLHO)
    expect(corpo).toMatch(/position:\s*absolute/)
    expect(px(corpo, 'right')).toBe(recuoDoControle)
    expect(corpo).toMatch(/top:\s*0/)
    expect(corpo).toMatch(/bottom:\s*0/)
    expect(corpo).toMatch(/margin-block:\s*auto/)
  })

  it('o valor da entrada com o olho não passa por baixo do botão', () => {
    const olho = px(corpoDe(OLHO), 'right')!
    const direita = px(corpoDe(ENTRADA_COM_OLHO), 'padding-right')
    expect(direita, 'padding-right da entrada com o botão de mostrar senha').toBeDefined()
    // Fim do texto = campo - 4 - padding; começo do botão = campo - olho - 44: o texto acaba onde o botão começa.
    expect(direita!).toBeGreaterThanOrEqual(olho + 44 - ALCANCE_DO_ANEL)
  })

  it('nenhuma regra do D5 depende do tema (a madrugada entra pelos tokens)', () => {
    expect(blocoD5).not.toMatch(/data-tema/)
    expect(blocoD5).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/)
  })

  it('fica fora da caixa de diálogo da Conta (só as linhas de acesso)', () => {
    for (const r of dentro) {
      expect(r.seletor, r.seletor).toContain('.sb-acesso-campos')
      expect(r.seletor, r.seletor).not.toContain('.conta-dialogo')
    }
  })
})

// Volta 3, índice da Conta (A-2b): em 1440 a última âncora ("Excluir conta") terminava a 6 px do fio da abertura, e a caixa de
// toque dela (44 px, 56 na madrugada) chegava ao fio. O fio fica em y=322 (aprovado pelo líder e base dos outros critérios), então o
// índice sobe na coluna lateral: o recuo de cima do `nav` (a altura do h1 menos 8 px). Como o `nav` é `sticky`, o `top` sobe junto,
// para a lista presa continuar a 8 px do cabeçalho (cabeçalho + 8 = 72) e a altura e a margem de baixo seguirem a do recuo (o `nav`
// não ocupa espaço). Nada do 390, nem das âncoras (passo de 32, alvo de toque), nem do fio muda. A medida real é do medidor (A-2b);
// este teste proíbe a volta da causa, as contas do recuo.
describe('o índice da Conta sobe na coluna lateral: 16 px até o fio da abertura (A-2b)', () => {
  const marca = '44d-3, volta 3, índice da Conta'
  const inicio = blocoDe44d3.indexOf(marca)
  const comeco = inicio >= 0 ? blocoDe44d3.lastIndexOf('/*', inicio) : -1
  const fim = comeco >= 0 ? blocoDe44d3.indexOf('/* ---', comeco + 2) : -1
  const bloco = comeco >= 0 ? semComentarios(blocoDe44d3.slice(comeco, fim >= 0 ? fim : undefined)) : ''

  /**
   * A folga de hoje, medida no Chrome com o recuo de antes (o texto da última âncora termina em y=316 e o fio começa em y=322): 6 px.
   * O líder pediu 16. (O enunciado dizia ≈ 12 px; subir 8 px dá 14 no medidor, e é por isso que o passo é de 16.)
   */
  const FOLGA_DE_HOJE = 6
  const FOLGA_MINIMA = 16
  const NAV = '.conta-indice-ao-lado'
  const CABECALHO = Number(/--e-cabecalho:\s*(\d+)px/.exec(css)?.[1])
  const ALTURA_DO_H1 = Number(/--e-cab-h1:\s*(\d+)px/.exec(css)?.[1])

  const corpoDoNav = [...bloco.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1].trim() === NAV)
    .map((m) => m[2])
    .join(';')
  const declaracao = (propriedade: string) => {
    const todas = [...corpoDoNav.matchAll(new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*([^;]+)`, 'g'))]
    return todas.length > 0 ? todas[todas.length - 1][1].trim() : undefined
  }
  const sobe = Number(/--e-indice-sobe:\s*(-?\d*\.?\d+)px/.exec(corpoDoNav)?.[1])
  /** O valor de uma declaração em px, com as variáveis do cabeçalho, do h1 e do recuo (a faixa de 768 para cima tem as de 64 px). */
  const valor = (propriedade: string) => {
    const texto = declaracao(propriedade)
    if (texto === undefined) return undefined
    const expressao = texto
      .replace(/var\(--e-cabecalho\)/g, String(CABECALHO))
      .replace(/var\(--e-cab-h1\)/g, String(ALTURA_DO_H1))
      .replace(/var\(--e-indice-sobe\)/g, String(sobe))
      .replace(/px/g, '')
      .replace(/calc/g, '')
    if (!/^[\d\s+\-*/().]+$/.test(expressao)) return undefined
    return Number(Function(`"use strict"; return (${expressao})`)())
  }

  it('o bloco existe, é só da faixa de 768 para cima e só mexe no `nav` do índice (390 e as âncoras não mudam)', () => {
    expect(comeco).toBeGreaterThanOrEqual(0)
    expect(corpoDoNav.length).toBeGreaterThan(0)
    expect(bloco).toMatch(/@media\s*\(min-width:\s*768px\)/)
    expect(bloco).not.toMatch(/max-width/)
    for (const m of bloco.matchAll(/([^{}]+)\{/g)) {
      const seletor = m[1].trim()
      if (seletor.startsWith('@')) continue
      expect(seletor, seletor).toBe(NAV)
    }
  })

  it('o índice sobe pelo menos o que falta para 16 px (6 + sobe), em passo da escala de 8', () => {
    expect(sobe, 'a variável --e-indice-sobe do nav').toBeGreaterThan(0)
    expect(FOLGA_DE_HOJE + sobe).toBeGreaterThanOrEqual(FOLGA_MINIMA)
    expect([8, 16, 24, 32]).toContain(sobe)
  })

  it('o recuo de cima do nav é a altura do h1 menos o que sobe: a lista começa mais alto', () => {
    expect(valor('padding-top')).toBe(ALTURA_DO_H1 - sobe)
  })

  it('com o `sticky`, a lista presa segue a 8 px do cabeçalho: top + recuo = cabeçalho + 8, e o nav não sobe sob o cabeçalho', () => {
    const topo = valor('top')!
    expect(topo + valor('padding-top')!).toBe(CABECALHO + 8)
    expect(topo).toBeGreaterThanOrEqual(0)
  })

  it('a altura do nav é o recuo mais as 6 âncoras de 32 px, e a margem de baixo a devolve: o nav continua sem ocupar espaço', () => {
    const altura = valor('height')!
    expect(altura).toBe(valor('padding-top')! + 6 * 32)
    expect(valor('margin-bottom')).toBe(-altura)
  })

  it('nenhuma regra do bloco dá cor, tamanho de letra nem mexe no fio, no passo ou no alvo de toque', () => {
    expect(bloco).not.toMatch(/(^|[;\s{])(line-height|font-size|color|background[a-z-]*|border[a-z-]*|column-gap|row-gap|gap|min-height)\s*:/)
    expect(bloco).not.toMatch(/data-tema|#[0-9a-fA-F]{3,8}\b|rgb\(/)
  })
})

// Volta 3, D6 (seleção de texto): a seleção nas telas de acesso e na Conta usava o azul padrão do navegador, fora da paleta. Decisão do
// líder: `::selection` com as variáveis de uso do tema (sem cor nova, sem hex solto, sem azul e sem amarelo), só dentro das telas
// (a moldura do `<main>` delas), nunca global: as outras telas são de outros cartões. O valor real (o `::selection` calculado de um parágrafo
// e de um input, o contraste AA nos dois temas) é do medidor (D6-selecao); este teste impede a volta da causa.
describe('a seleção de texto das telas de acesso e da Conta é da paleta (D6)', () => {
  const marca = '44d-3, volta 3, selecao'
  const inicio = blocoDe44d3.indexOf(marca)
  const comeco = inicio >= 0 ? blocoDe44d3.lastIndexOf('/*', inicio) : -1
  const fim = comeco >= 0 ? blocoDe44d3.indexOf('/* ---', comeco + 2) : -1
  const bloco = comeco >= 0 ? semComentarios(blocoDe44d3.slice(comeco, fim >= 0 ? fim : undefined)) : ''
  const regras = [...bloco.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ seletor: m[1].replace(/@layer\s+components/g, '').trim(), corpo: m[2] }))
    .filter((r) => r.seletor !== '')

  const estilos = '../../styles/'
  const tokens = readFileSync(pastaSrcDe(import.meta.url) + estilos + 'tokens.css', 'utf8')
  const tema = readFileSync(pastaSrcDe(import.meta.url) + estilos + 'tema.css', 'utf8')
  const temaDoDia = /:root\s*\{([^}]*)\}/.exec(tema)?.[1] ?? ''
  const temaDaMadrugada = /\[data-tema-local=['"]madrugada['"]\][^{]*\{([^}]*)\}/.exec(tema)?.[1] ?? ''
  /** O hex de uma variável de uso (`--cor-destaque`) num tema: a de uso aponta para uma de tokens.css (`--color-accent: #b0401c`). */
  function hexDe(variavelDeUso: string, blocoDoTema: string) {
    const aponta = new RegExp(`${variavelDeUso}:\\s*var\\((--color-[a-z0-9-]+)\\)`).exec(blocoDoTema)?.[1]
    return aponta ? new RegExp(`${aponta}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)?.[1] : undefined
  }
  function luminancia(hex: string) {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contraste = (a: string, b: string) => {
    const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
    return (claro + 0.05) / (escuro + 0.05)
  }
  const corpoDe = (regra: { corpo: string }) =>
    Object.fromEntries(
      regra.corpo
        .split(';')
        .map((d) => d.split(/:(.*)/s).map((p) => p.trim()))
        .filter((par) => par[0]),
    ) as Record<string, string>

  it('o bloco da volta 3, seleção, existe, com `::selection` dentro da moldura das telas (`.conta-moldura`)', () => {
    expect(comeco).toBeGreaterThanOrEqual(0)
    expect(regras.length).toBeGreaterThan(0)
    for (const r of regras) {
      for (const seletor of r.seletor.split(',').map((s) => s.trim())) {
        expect(seletor, seletor).toMatch(/^\.conta-moldura\s?::selection$/)
      }
    }
  })

  it('a seleção do corpo e a de dentro dos campos (`input`) valem: o seletor cobre os descendentes e o próprio `main`', () => {
    const seletores = regras.flatMap((r) => r.seletor.split(',').map((s) => s.trim()))
    expect(seletores).toContain('.conta-moldura ::selection')
    expect(seletores).toContain('.conta-moldura::selection')
  })

  it('o fundo e a cor do texto são variáveis de uso do tema que existem (`var(--cor-...)`), e só esses dois', () => {
    for (const r of regras) {
      const decl = corpoDe(r)
      expect(Object.keys(decl).sort(), r.seletor).toEqual(['background-color', 'color'])
      for (const valor of Object.values(decl)) {
        const nome = /^var\((--cor-[a-z0-9-]+)\)$/.exec(valor)?.[1]
        expect(nome, valor).toBeDefined()
        expect(temaDoDia, `${nome} no tema do dia`).toContain(`${nome}:`)
        expect(temaDaMadrugada, `${nome} na madrugada`).toContain(`${nome}:`)
      }
    }
  })

  it('sem cor nova, sem hex solto, sem azul e sem amarelo: nem a cor de informação (azul) nem o foco entram', () => {
    expect(bloco).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|color-mix\(/)
    expect(bloco).not.toMatch(/blue|azul|yellow|amarelo|highlight/i)
    expect(bloco).not.toMatch(/--cor-info|--color-info|--cor-foco/)
  })

  it('o contraste do texto sobre o fundo é de pelo menos 4,5 (AA), no tema do dia e na madrugada', () => {
    const decl = corpoDe(regras[0])
    const fundo = /var\((--cor-[a-z0-9-]+)\)/.exec(decl['background-color'])![1]
    const texto = /var\((--cor-[a-z0-9-]+)\)/.exec(decl.color)![1]
    for (const [nome, blocoDoTema] of [
      ['dia', temaDoDia],
      ['madrugada', temaDaMadrugada],
    ] as const) {
      const fundoHex = hexDe(fundo, blocoDoTema)
      const textoHex = hexDe(texto, blocoDoTema)
      expect(fundoHex, `${fundo} em ${nome}`).toBeDefined()
      expect(textoHex, `${texto} em ${nome}`).toBeDefined()
      expect(contraste(fundoHex!, textoHex!), `contraste em ${nome}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('não há `::selection` global: todo `::selection` do arquivo está dentro da moldura das telas', () => {
    const todos = [...semComentarios(css).matchAll(/([^{}]*::selection[^{}]*)\{/g)].map((m) => m[1].trim())
    expect(todos.length).toBeGreaterThan(0)
    for (const seletor of todos) {
      for (const parte of seletor.split(',').map((s) => s.trim())) expect(parte, parte).toMatch(/^\.conta-moldura\s?::selection$/)
    }
  })

  it('a moldura das telas leva a classe `conta-moldura` no `main`: Entrar, Criar conta, Recuperar acesso, Nova senha, Conta excluída e Conta', async () => {
    const fonte = readFileSync(pastaSrcDe(import.meta.url) + '../../componentes/conta/MolduraPublica.tsx', 'utf8')
    expect(fonte).toMatch(/<main\s+className="conta-moldura"/)
    for (const [caminho, titulo] of TELAS) {
      const { container, unmount } = abrir(caminho)
      await screen.findByRole('heading', { level: 1, name: titulo })
      const principal = container.querySelector('main')!
      expect(principal.classList.contains('conta-moldura'), caminho).toBe(true)
      expect(container.querySelectorAll('main.conta-moldura'), caminho).toHaveLength(1)
      // Fora do `main` (o cabeçalho e o rodapé da casca) a classe não existe: a seleção de lá é de outro cartão.
      expect(container.querySelector('header.conta-moldura, footer.conta-moldura, [data-cabecalho].conta-moldura, [data-rodape].conta-moldura')).toBeNull()
      unmount()
    }
  })
})
