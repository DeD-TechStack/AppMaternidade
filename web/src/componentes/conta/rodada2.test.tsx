import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { COMECAR, CONTA, PAINEIS } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// A rodada visual 2 da MAT-37a (aceite do líder: 5,9 a 6,8 contra o mínimo de 8,0). O jsdom não
// calcula layout: o que se confere aqui são as classes e a estrutura que produzem o desenho. O
// desenho em si foi lido nas capturas de `.oc/olhar/`.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const classes = (elemento: Element) => [...elemento.classList]
const tem = (elemento: Element, ...esperadas: string[]) => {
  for (const classe of esperadas) expect(classes(elemento), classe).toContain(classe)
}
const nao = (elemento: Element, ...proibidas: string[]) => {
  for (const classe of proibidas) expect(classes(elemento), classe).not.toContain(classe)
}
const titulo = (nome: string) => screen.findByRole('heading', { level: 1, name: nome })

async function memoriaSemConta() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

const principal = () => document.querySelector('main')!

describe('item 1: Começar ("Seu nome")', () => {
  it('um indicador de passo acima do título, na coluna da esquerda', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    const h1 = await titulo('Começar')

    expect(COMECAR.passo).toBe('Passo 1 de 2')
    const passo = h1.previousElementSibling!
    expect(passo.tagName).toBe('P')
    expect(passo.textContent).toBe(COMECAR.passo)
    tem(passo, 'rotulo')
    expect(principal().children[0].contains(passo)).toBe(true)
  })

  it('o painel de apoio é a terceira peça da grade, depois do formulário, e sobe até a altura da tela', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await titulo('Começar')

    expect(principal().children).toHaveLength(3)
    const [, direita, terceira] = [...principal().children]
    const painel = terceira.querySelector('aside')!
    expect(painel).not.toBeNull()
    expect(direita.compareDocumentPosition(painel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    tem(terceira, 'min-[60rem]:col-start-1', 'min-[60rem]:row-start-2', 'min-[60rem]:pr-16')
    // O painel cresce para encher a coluna; a grade tem a altura da janela menos a moldura.
    tem(painel, 'flex-1')
    // 13 rem = cabeçalho de 3,5 rem + 5 rem até o título + 4 rem de respiro embaixo, com folga.
    tem(principal(), 'min-[60rem]:min-h-[calc(100svh-13rem)]', 'min-[60rem]:grid-rows-[auto_1fr]')
  })

  it('o painel diz o que vem depois do nome e o que o nome muda, só com fatos do produto', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await titulo('Começar')
    const painel = principal().querySelector('aside')!

    expect(PAINEIS.comecar.titulo).toBe('O que vem depois')
    const rotulo = document.getElementById(painel.getAttribute('aria-labelledby')!)!
    expect(rotulo.textContent).toBe(PAINEIS.comecar.titulo)
    const linhas = [...painel.querySelectorAll('li')]
    expect(linhas.map((li) => [li.children[0].textContent, li.children[1].textContent])).toEqual(
      PAINEIS.comecar.linhas.map((linha) => [linha.rotulo, linha.texto]),
    )
    expect(PAINEIS.comecar.linhas.map((linha) => linha.texto).join(' ')).toMatch(/quem fez/)
    expect(PAINEIS.comecar.linhas.map((linha) => linha.texto).join(' ')).toMatch(/horário dos registros/)
    // A frase de apoio não nomeia ninguém: nada de Lia nem Ana.
    expect(JSON.stringify(PAINEIS)).not.toMatch(/\b(Lia|Ana)\b/)
  })

  it('sem h2 e sem nada focável no painel: o "Seu nome" continua aparecendo uma vez', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await titulo('Começar')

    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    const painel = principal().querySelector('aside')!
    expect(painel.querySelector('h1, h2, h3, h4, h5, h6, a, button, input, select, textarea, [tabindex]')).toBeNull()
  })
})

describe('item 2: o campo de senha', () => {
  it('o botão é compacto, à direita, sem texto visível e com o olho desenhado em CSS', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' })
    const faixa = campo.parentElement!
    const botao = screen.getByRole('button', { name: 'Mostrar senha' })

    expect(faixa.lastElementChild).toBe(botao)
    expect(botao.textContent).toBe('')
    expect(botao.querySelector('svg, img')).toBeNull()
    tem(botao, 'alvo-toque', 'w-14', 'shrink-0', 'border-l')
    nao(botao, 'rotulo', 'whitespace-nowrap', 'grow', 'min-w-[4.5rem]')
    const olho = botao.querySelector('[data-olho]')!
    expect(olho.tagName).toBe('SPAN')
    expect(olho.getAttribute('aria-hidden')).toBe('true')
    expect(olho.getAttribute('data-olho')).toBe('aberto')
  })

  it('o <input> fica com a faixa quase toda: sem quebra de linha e sem largura mínima de célula', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' })
    const faixa = campo.parentElement!

    tem(faixa, 'flex', 'min-h-12', 'w-full', 'flex-nowrap', 'items-stretch', 'has-[input:focus]:outline-2')
    nao(faixa, 'flex-wrap')
    tem(campo, 'min-w-0', 'flex-1', 'bg-transparent')
    nao(campo, 'min-w-[8rem]')
  })

  it('"Mostrar senha" e "Ocultar senha": o nome acessível e aria-pressed seguem o estado; o olho é riscado com a senha à mostra', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' }) as HTMLInputElement
    const botao = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(campo.type).toBe('password')

    fireEvent.click(botao)

    const aberto = screen.getByRole('button', { name: 'Ocultar senha' })
    expect(aberto.getAttribute('aria-pressed')).toBe('true')
    expect(aberto.textContent).toBe('')
    expect(aberto.querySelector('[data-olho]')!.getAttribute('data-olho')).toBe('riscado')
    expect(campo.type).toBe('text')

    fireEvent.click(aberto)
    expect(screen.getByRole('button', { name: 'Mostrar senha' }).querySelector('[data-olho]')!.getAttribute('data-olho')).toBe('aberto')
    expect(campo.type).toBe('password')
  })

  it('o foco do botão é o contorno da base (sem outline-none) e a faixa inteira leva o contorno do campo', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const botao = screen.getByRole('button', { name: 'Mostrar senha' })
    nao(botao, 'outline-none')
    tem(botao.parentElement!, 'has-[input:focus]:outline-offset-2', 'has-[input:focus]:outline-[var(--cor-foco)]')
  })
})

describe('item 3: a largura dos controles no computador', () => {
  const PUBLICAS = ['/entrar', '/criar-conta', '/recuperar-acesso']

  for (const caminho of PUBLICAS) {
    it(`${caminho}: a coluna de ação mede 27,5 rem (440 px) a partir de 60 rem e 36 rem abaixo, à esquerda`, async () => {
      renderizarComDados(caminho)
      await screen.findByRole('heading', { level: 1 })
      const conteudo = principal().children[1].firstElementChild!

      tem(conteudo, 'w-full', 'max-w-[36rem]', 'min-[60rem]:max-w-[27.5rem]')
      nao(conteudo, 'min-[60rem]:max-w-none', 'mx-auto')
    })
  }

  it('o botão principal tem a largura do conteúdo a partir de 60 rem (mín. 12 rem e 56 px) e a largura toda abaixo', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const botao = document.querySelector('form button[type="submit"]')!

    tem(botao, 'botao-grande', 'min-[60rem]:w-fit', 'min-[60rem]:min-w-[12rem]', 'min-[60rem]:self-start')
  })

  it('Começar e Conta: o formulário também passa a 27,5 rem a partir de 60 rem, sem tirar a régua da coluna', async () => {
    const comecar = renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await titulo('Começar')
    tem(document.querySelector('form')!, 'w-full', 'max-w-[36rem]', 'min-[60rem]:max-w-[27.5rem]')
    comecar.unmount()

    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    tem(document.querySelector('form')!, 'min-[60rem]:max-w-[27.5rem]')
    nao(document.querySelector('form')!, 'min-[60rem]:max-w-none')
    for (const secao of principal().children[1].querySelectorAll('section')) expect(secao.className).not.toMatch(/max-w-/)
  })
})

describe('item 4: o fio vertical das telas de acesso', () => {
  for (const caminho of ['/entrar', '/criar-conta', '/recuperar-acesso']) {
    it(`${caminho}: a coluna da direita se ancora no topo e o fio acaba no fim do conteúdo dela`, async () => {
      renderizarComDados(caminho)
      await screen.findByRole('heading', { level: 1 })
      const direita = principal().children[1]

      tem(direita, 'min-[60rem]:self-start', 'min-[60rem]:border-l', 'min-[60rem]:pl-16')
      tem(direita, 'min-[60rem]:col-start-2', 'min-[60rem]:row-start-1', 'min-[60rem]:row-span-2')
    })
  }
})

describe('item 5: um painel por tela', () => {
  const TELAS: Array<[string, string, keyof typeof PAINEIS]> = [
    ['/entrar', 'Entrar', 'entrar'],
    ['/criar-conta', 'Criar conta', 'criarConta'],
    ['/recuperar-acesso', 'Recuperar acesso', 'recuperar'],
    ['/redefinir-senha', 'Nova senha', 'recuperar'],
  ]

  for (const [caminho, nome, chave] of TELAS) {
    it(`${caminho}: o painel próprio, depois do formulário, em todas as larguras`, async () => {
      renderizarComDados(caminho)
      await titulo(nome)

      const painel = principal().querySelector('aside')!
      expect(painel.getAttribute('data-campo')).toBe('field-1')
      // Visível em toda largura: nenhuma classe esconde o painel no celular.
      nao(painel, 'hidden', 'min-[60rem]:block')
      tem(painel, 'rounded-[8px]', 'p-5', 'min-[40rem]:p-8')
      // Na ordem do DOM vem depois da ação (no celular fica empilhado embaixo do formulário).
      expect(principal().children).toHaveLength(3)
      expect(principal().lastElementChild!.contains(painel)).toBe(true)
      tem(principal().lastElementChild!, 'min-[60rem]:col-start-1', 'min-[60rem]:row-start-2', 'min-[60rem]:pr-16')

      const rotulo = document.getElementById(painel.getAttribute('aria-labelledby')!)!
      expect(rotulo.tagName).toBe('P')
      tem(rotulo, 'rotulo')
      expect(rotulo.textContent).toBe(PAINEIS[chave].titulo)
      const linhas = [...painel.querySelectorAll('li')]
      expect(linhas.map((li) => [li.children[0].textContent, li.children[1].textContent])).toEqual(
        PAINEIS[chave].linhas.map((linha) => [linha.rotulo, linha.texto]),
      )
      linhas.forEach((li) => tem(li, 'border-t', 'flex', 'flex-col'))
    })
  }

  it('cada tela tem o título do painel próprio (não é o mesmo painel nas quatro)', () => {
    const titulos = [PAINEIS.entrar.titulo, PAINEIS.criarConta.titulo, PAINEIS.recuperar.titulo, PAINEIS.comecar.titulo]
    expect(new Set(titulos).size).toBe(4)
    const textos = [PAINEIS.entrar, PAINEIS.criarConta, PAINEIS.recuperar, PAINEIS.comecar].map((painel) =>
      painel.linhas.map((linha) => linha.texto).join('|'),
    )
    expect(new Set(textos).size).toBe(4)
  })

  it('Criar conta diz o que a conta guarda: nome, e-mail, fuso, famílias e convites', () => {
    expect(PAINEIS.criarConta.linhas.map((linha) => linha.rotulo)).toEqual(['Nome', 'E-mail', 'Fuso', 'Famílias e convites'])
  })

  it('Recuperar diz como funciona o link: pedir, o e-mail chegar, o prazo e a senha nova', () => {
    const texto = PAINEIS.recuperar.linhas.map((linha) => `${linha.rotulo} ${linha.texto}`).join(' ')
    expect(texto).toMatch(/e-mail/i)
    expect(texto).toMatch(/vence|prazo/i)
    expect(texto).toMatch(/senha nova/i)
  })

  it('Entrar mostra o resumo do Hoje: sono, mamada, fralda e quem registrou', () => {
    expect(PAINEIS.entrar.linhas.map((linha) => linha.rotulo)).toEqual(['Sono', 'Mamada', 'Fralda', 'Autoria'])
  })

  it('Entrar leva a miniatura do Hoje, inerte e escondida do leitor de tela; as outras telas não', async () => {
    const entrar = renderizarComDados('/entrar')
    await titulo('Entrar')
    const aparelho = principal().querySelector('aside [data-aparelho="celular"]')!
    expect(aparelho).not.toBeNull()
    expect(aparelho.hasAttribute('inert')).toBe(true)
    expect(aparelho.getAttribute('aria-hidden')).toBe('true')
    expect(aparelho.getAttribute('data-tela')).toBe('hoje')
    entrar.unmount()

    renderizarComDados('/criar-conta')
    await titulo('Criar conta')
    expect(principal().querySelector('[data-aparelho]')).toBeNull()
  })

  it('o painel fica fora da ordem do Tab e sem título acessível, mesmo com a miniatura', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const painel = principal().querySelector('aside')!

    for (const controle of painel.querySelectorAll('a, button, input, select, textarea, [tabindex]')) {
      expect(controle.closest('[inert]'), controle.outerHTML.slice(0, 60)).not.toBeNull()
    }
    for (const cabecalho of painel.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      expect(cabecalho.closest('[aria-hidden="true"]')).not.toBeNull()
    }
    expect(painel.querySelector('svg')).toBeNull()
    expect(within(painel).queryAllByRole('button')).toHaveLength(0)
    expect(within(painel).queryAllByRole('link')).toHaveLength(0)
    expect(within(painel).queryAllByRole('heading')).toHaveLength(0)
  })

  it('Conta excluída continua sem painel', async () => {
    renderizarComDados('/conta-excluida')
    await titulo('Conta excluída')
    expect(document.querySelector('aside')).toBeNull()
    expect(principal().children).toHaveLength(2)
  })
})

describe('item 6: a Conta', () => {
  it('o índice lateral é sticky, no topo da célula da esquerda, abaixo do cabeçalho', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const indice = screen.getByRole('navigation', { name: 'Nesta página' })

    tem(indice, 'min-[60rem]:sticky', 'min-[60rem]:top-6', 'min-[60rem]:self-start', 'hidden', 'min-[60rem]:block')
  })

  it('o índice e o título da seção usam o mesmo rótulo: "Id da conta"', async () => {
    expect(CONTA.id.titulo).toBe(CONTA.secoes.id)
    expect(CONTA.id.titulo).toBe('Id da conta')
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')

    const indice = within(screen.getByRole('navigation', { name: 'Nesta página' }))
    expect(indice.getByRole('link', { name: 'Id da conta' }).getAttribute('href')).toBe('#id-conta')
    expect(document.getElementById('id-conta')!.textContent).toBe('Id da conta')
    for (const link of indice.getAllByRole('link')) {
      const secao = document.getElementById(link.getAttribute('href')!.slice(1))!
      expect(secao.textContent, link.getAttribute('href')!).toBe(link.textContent)
    }
  })

  it('"Sair" tem título h2 como as outras seções e entrada no índice, entre Privacidade e Excluir conta', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Perfil',
      'Id da conta',
      'Seus dados',
      'Privacidade',
      'Sair',
      'Excluir conta',
    ])
    const secao = document.getElementById('sair')!.closest('section')!
    expect(secao.getAttribute('aria-labelledby')).toBe('sair')
    expect(within(secao).getByRole('button', { name: 'Sair' })).toBeTruthy()
    const indice = within(screen.getByRole('navigation', { name: 'Nesta página' }))
    expect(indice.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#perfil',
      '#id-conta',
      '#exportar',
      '#privacidade',
      '#sair',
      '#excluir-conta',
    ])
    expect(indice.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Perfil',
      'Id da conta',
      'Seus dados',
      'Privacidade',
      'Sair',
      'Excluir conta',
    ])
  })

  it('o id da conta sobe para 0,875 rem, o menor tamanho do DESIGN.md', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const id = document.querySelector('[data-id-conta]')!

    tem(id, 'font-mono', 'text-[0.875rem]', 'tabular')
    nao(id, 'text-[0.8125rem]')
  })

  it('nada na Conta fica abaixo de 0,875 rem', async () => {
    for (const caminho of ['/entrar', '/criar-conta', '/recuperar-acesso', '/app/conta']) {
      const { unmount } = renderizarComDados(caminho, caminho === '/app/conta' ? { sessao: 'juliana' } : {})
      await screen.findByRole('heading', { level: 1 })
      for (const elemento of document.querySelectorAll('[class]')) {
        for (const classe of elemento.classList) {
          const medida = /^text-\[(\d*\.?\d+)(rem|px)\]$/.exec(classe)
          if (!medida) continue
          const rem = medida[2] === 'px' ? Number(medida[1]) / 16 : Number(medida[1])
          expect(rem, `${caminho} ${classe}`).toBeGreaterThanOrEqual(0.875)
        }
      }
      unmount()
    }
  })

  it('"Excluir minha conta" desabilitado tem cor e borda próprias, sem opacity', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    await waitFor(() => expect(screen.queryByText('Conferindo as suas famílias…')).toBeNull())
    const botao = screen.getByRole('button', { name: 'Excluir minha conta' }) as HTMLButtonElement

    expect(botao.disabled).toBe(true)
    tem(
      botao,
      'disabled:cursor-not-allowed',
      'disabled:border-dashed',
      'disabled:border-[var(--cor-linha)]',
      'disabled:bg-[var(--cor-papel-fundo)]',
      'disabled:text-[var(--cor-texto)]',
    )
    expect(botao.className).not.toMatch(/opacity/)
    // O preenchimento do hover não vale para o botão desabilitado.
    tem(botao, 'enabled:hover:bg-[var(--cor-destaque)]', 'enabled:hover:text-[var(--cor-sobre-destaque)]')
    nao(botao, 'hover:bg-[var(--cor-destaque)]')
  })

  describe('contraste do desabilitado, nos dois temas', () => {
    const pastaSrc = pastaSrcDe(import.meta.url)
    const tokens = readFileSync(pastaSrc + '../../styles/tokens.css', 'utf8')
    const tema = readFileSync(pastaSrc + '../../styles/tema.css', 'utf8')

    const luminancia = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contraste = (a: string, b: string) => {
      const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
      return (clara + 0.05) / (escura + 0.05)
    }
    const cor = (nome: string) => new RegExp(`--color-${nome}:\\s*(#[0-9a-f]{6})`).exec(tokens)![1]
    const uso = (bloco: string, nome: string) => /var\(--color-([a-z0-9-]+)\)/.exec(new RegExp(`--cor-${nome}:\\s*([^;]+);`).exec(bloco)![1])![1]
    const claro = /:root\s*\{([^}]*)\}/.exec(tema)![1]
    const madrugada = /:root\[data-tema='madrugada'\]\s*\{([^}]*)\}/.exec(tema)![1]

    for (const [nome, bloco] of [
      ['claro', claro],
      ['madrugada', madrugada],
    ] as const) {
      it(`${nome}: o texto do desabilitado passa em AA (4,5:1) sobre o fundo dele e a borda passa em 3:1`, () => {
        const texto = cor(uso(bloco, 'texto'))
        const fundo = cor(uso(bloco, 'papel-fundo'))
        const linha = cor(uso(bloco, 'linha'))
        expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5)
        expect(contraste(linha, fundo)).toBeGreaterThanOrEqual(3)
      })
    }
  })
})

describe('item 7: o ritmo vertical', () => {
  it('a distância do cabeçalho ao título é a mesma nas molduras pública e logada', async () => {
    const publica = renderizarComDados('/entrar')
    await titulo('Entrar')
    const daPublica = classes(principal()).filter((classe) => /^(min-\[60rem\]:)?mt-/.test(classe))
    publica.unmount()

    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const daLogada = classes(principal()).filter((classe) => /^(min-\[60rem\]:)?mt-/.test(classe))

    expect(daPublica.sort()).toEqual(['min-[60rem]:mt-20', 'mt-10'])
    expect(daLogada.sort()).toEqual(daPublica)
  })

  it('cada seção da Conta tem um espaço só entre o título e o conteúdo (gap-4, sem margem no título)', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const secoes = [...principal().children[1].querySelectorAll('section')]

    expect(secoes).toHaveLength(6)
    for (const secao of secoes) {
      tem(secao, 'flex', 'flex-col', 'gap-4')
      const h2 = secao.querySelector('h2')!
      expect(h2.className, h2.id).not.toMatch(/(^|\s)m[bty]?-/)
    }
  })

  it('o "Sair" do cabeçalho é um alvo de 44 px centrado na faixa de 56 px', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const cabecalho = document.querySelector('header')!
    const sair = within(cabecalho).getByRole('button', { name: 'Sair' })

    tem(cabecalho, 'min-h-14', 'items-center', 'py-0')
    tem(sair, 'min-h-11')
    tem(sair.parentElement!, 'items-center')
    // O do corpo da página segue com os 48 px dos botões.
    const doCorpo = within(principal()).getByRole('button', { name: 'Sair' })
    nao(doCorpo, 'min-h-11')
  })
})

describe('item 8: o link "Política de privacidade" não quebra no meio', () => {
  it('Termos de uso e Política de privacidade levem whitespace-nowrap: se não couber, a linha quebra antes do link', async () => {
    renderizarComDados('/criar-conta')
    await titulo('Criar conta')

    tem(screen.getByRole('link', { name: 'Política de privacidade' }), 'whitespace-nowrap')
    tem(screen.getByRole('link', { name: 'Termos de uso' }), 'whitespace-nowrap')
  })
})
