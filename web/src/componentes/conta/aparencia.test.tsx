import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CABECALHO, COMUM, CONTA, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { listaDeFusos, nomeDoFuso } from './fusos.ts'

// A rodada visual 1 da MAT-37a: títulos sem caixa, grade do computador, painel das telas de
// acesso, escala, dados legíveis, campos, avisos e ações da Conta. O jsdom não calcula layout:
// o que se confere aqui são as classes e a estrutura que produzem o desenho.

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

const PUBLICAS: Array<[string, string]> = [
  ['/entrar', 'Entrar'],
  ['/criar-conta', 'Criar conta'],
  ['/recuperar-acesso', 'Recuperar acesso'],
  ['/redefinir-senha', 'Nova senha'],
  ['/conta-excluida', 'Conta excluída'],
]

describe('1. o título que recebe foco por programa não desenha caixa', () => {
  for (const [caminho, nome] of PUBLICAS) {
    it(`${caminho}: o h1 leva outline-none e não leva alvo-foco`, async () => {
      renderizarComDados(caminho)
      const h1 = await titulo(nome)
      expect(h1.getAttribute('tabindex')).toBe('-1')
      tem(h1, 'outline-none')
      nao(h1, 'alvo-foco')
    })
  }

  it('/app/comecar: o h1 leva outline-none e não leva alvo-foco', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    const h1 = await titulo('Começar')
    tem(h1, 'outline-none')
    nao(h1, 'alvo-foco')
  })

  it('/app/conta: o h1 e o h2#exportar levem outline-none e não levem alvo-foco', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    const h1 = await titulo('Conta')
    tem(h1, 'outline-none')
    nao(h1, 'alvo-foco')
    const exportar = document.getElementById('exportar')!
    expect(exportar.tagName).toBe('H2')
    tem(exportar, 'outline-none')
    nao(exportar, 'alvo-foco')
  })

  it('nenhum campo, seletor, botão ou link das telas leva outline-none (o contorno de foco da base fica neles)', async () => {
    const telas: Array<() => ReturnType<typeof renderizarComDados>> = [
      () => renderizarComDados('/entrar'),
      () => renderizarComDados('/criar-conta'),
      () => renderizarComDados('/recuperar-acesso'),
      () => renderizarComDados('/conta-excluida'),
      () => renderizarComDados('/app/conta', { sessao: 'juliana' }),
    ]
    for (const abrir of telas) {
      const { unmount } = abrir()
      await screen.findByRole('heading', { level: 1 })
      for (const controle of document.querySelectorAll('input, select, button, a')) {
        expect(classes(controle), controle.outerHTML.slice(0, 80)).not.toContain('outline-none')
      }
      unmount()
    }
  })

  it('o ResumoErro mantém alvo-foco: o teclado precisa ver para onde o foco foi', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    simularFalha(dados, 'entrar', 'rede')
    renderizarComDados('/entrar', { dados })
    await screen.findByRole('button', { name: 'Entrar' })
    fireEvent.change(screen.getByLabelText('E-mail', { selector: 'input' }), { target: { value: 'juliana@exemplo.invalid' } })
    fireEvent.change(screen.getByLabelText('Senha', { selector: 'input' }), { target: { value: 'qualquer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const alerta = await screen.findByRole('alert')
    tem(alerta, 'alvo-foco')
    nao(alerta, 'outline-none')
    expect(alerta.getAttribute('tabindex')).toBe('-1')
  })
})

describe('2. a grade: uma margem, uma divisão', () => {
  const CONTEINER = ['mx-auto', 'w-full', 'max-w-[90rem]', 'px-4', 'min-[40rem]:px-8', 'pb-16']

  for (const [caminho, nome] of PUBLICAS) {
    it(`${caminho}: contêiner de 90 rem, cabeçalho de 56 px e duas colunas iguais com fio vertical`, async () => {
      renderizarComDados(caminho)
      await titulo(nome)

      const raiz = document.querySelector('main')!.parentElement!
      tem(raiz, ...CONTEINER)
      nao(raiz, 'max-w-[64rem]')
      tem(document.querySelector('header')!, 'min-h-14', 'items-center', 'border-b')

      const principal = document.querySelector('main')!
      tem(principal, 'grid', 'min-[60rem]:grid-cols-2')
      // O cabeçalho da tela, a ação e, com painel, a terceira peça (o painel de apoio).
      expect(principal.children).toHaveLength(caminho === '/conta-excluida' ? 2 : 3)
      const [esquerda, direita] = [...principal.children]
      tem(esquerda, 'min-w-0', 'min-[60rem]:pr-16')
      tem(direita, 'min-w-0', 'min-[60rem]:border-l', 'min-[60rem]:pl-16')
      // O conteúdo da direita tem a medida de 27,5 rem a partir de 60 rem (rodada visual 2).
      const conteudo = direita.firstElementChild!
      tem(conteudo, 'w-full', 'max-w-[36rem]', 'min-[60rem]:max-w-[27.5rem]')
      nao(conteudo, 'max-w-[28rem]', 'min-[60rem]:max-w-none')
    })
  }

  it('telas públicas: a esquerda tem h1, frase e links, nessa ordem; a direita, o formulário; o painel vem depois', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const [esquerda, direita, painel] = [...document.querySelector('main')!.children]

    expect([...esquerda.children].map((filho) => filho.tagName)).toEqual(['H1', 'P', 'P'])
    expect(direita.querySelector('form')).not.toBeNull()
    expect(esquerda.querySelector('form, input, button')).toBeNull()
    expect(painel.querySelector('aside')).not.toBeNull()
  })

  it('/redefinir-senha (sem links): h1 e frase; a direita, o estado do link; o painel vem depois', async () => {
    renderizarComDados('/redefinir-senha')
    await titulo('Nova senha')
    const [esquerda, , painel] = [...document.querySelector('main')!.children]
    expect([...esquerda.children].map((filho) => filho.tagName)).toEqual(['H1', 'P'])
    expect(painel.querySelector('aside')).not.toBeNull()
  })

  it('o formulário de acesso não leva max-w-[28rem]', async () => {
    renderizarComDados('/criar-conta')
    await titulo('Criar conta')
    expect(document.querySelector('form')!.className).not.toContain('max-w-[28rem]')
  })

  it('telas logadas: mesmo contêiner, mesmo cabeçalho e as mesmas duas colunas', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')

    const principal = document.querySelector('main')!
    tem(principal.parentElement!, ...CONTEINER)
    nao(principal.parentElement!, 'max-w-[64rem]')
    tem(document.querySelector('header')!, 'min-h-14')
    tem(principal, 'grid', 'min-[60rem]:grid-cols-2')
    const [esquerda, direita] = [...principal.children]
    tem(esquerda, 'min-w-0', 'min-[60rem]:pr-16')
    tem(direita, 'min-w-0', 'min-[60rem]:border-l', 'min-[60rem]:pl-16')
  })

  it('o cabeçalho da logada é uma linha só em todas as larguras, como o da pública', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const cabecalho = document.querySelector('header')!

    tem(cabecalho, 'flex', 'flex-row', 'flex-wrap', 'items-center', 'justify-between', 'gap-x-4', 'min-h-14', 'border-b', 'py-0')
    nao(cabecalho, 'flex-col', 'py-1', 'gap-1', 'items-start')
    // A marca nunca encolhe; a navegação é quem desce quando a fonte ampliada não deixa caber.
    tem(cabecalho.querySelector('a.marca')!, 'shrink-0')
  })

  it('Conta: a esquerda é quem a pessoa é e onde está (h1, resumo, status e índice); a direita, as seções', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    const h1 = await titulo('Conta')
    const [esquerda, direita] = [...document.querySelector('main')!.children]

    expect(esquerda.contains(h1)).toBe(true)
    expect(esquerda.querySelector('nav[aria-label="Nesta página"]')).not.toBeNull()
    expect(direita.querySelectorAll('section')).toHaveLength(6)
    expect(direita.querySelector('nav')).toBeNull()
    for (const secao of direita.querySelectorAll('section')) expect(secao.closest('main')).not.toBeNull()
  })

  it('as réguas das seções da Conta vão até a borda direita da coluna (sem max-w no contêiner das seções)', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const direita = document.querySelector('main')!.children[1]
    for (const secao of direita.querySelectorAll('section')) {
      expect(secao.className).not.toMatch(/max-w-/)
    }
    expect(direita.querySelector('form')!.className).toContain('min-[60rem]:max-w-[27.5rem]')
  })

  it('Começar: a esquerda leva o passo, o h1, o status e a frase; a direita, o formulário', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    const h1 = await titulo('Começar')
    const [esquerda, direita] = [...document.querySelector('main')!.children]

    expect([...esquerda.children].map((filho) => filho.tagName)).toEqual(['P', 'H1', 'DIV', 'P'])
    expect(esquerda.contains(h1)).toBe(true)
    expect(esquerda.querySelector('[role="status"]')).not.toBeNull()
    expect(esquerda.querySelector('form')).toBeNull()
    expect(direita.querySelector('form')).not.toBeNull()
    expect(direita.querySelector('form')!.className).not.toContain('max-w-[28rem]')
  })
})

// O painel de cada tela (o texto de cada um e a ordem no DOM estão em `rodada2.test.tsx`). Aqui, o
// que vale para todos: campo de barro, rótulo que não é título e nada na ordem do Tab.
describe('3. o painel de apoio', () => {
  for (const [caminho, nome] of PUBLICAS.filter(([caminho]) => caminho !== '/conta-excluida')) {
    it(`${caminho}: é a terceira peça da grade, sem título de seção nem controle na ordem do Tab`, async () => {
      renderizarComDados(caminho)
      await titulo(nome)

      const painel = document.querySelector('aside')!
      expect(painel).not.toBeNull()
      expect(painel.getAttribute('data-campo')).toBe('field-1')
      tem(painel, 'rounded-[8px]', 'p-5', 'min-[40rem]:p-8')
      expect(painel.parentElement).toBe(document.querySelector('main')!.children[2])

      // O rótulo nomeia o painel; não é um título (a estrutura de títulos não muda).
      const rotulo = document.getElementById(painel.getAttribute('aria-labelledby')!)!
      expect(rotulo.tagName).toBe('P')
      tem(rotulo, 'rotulo')
      expect(painel.querySelectorAll('li')).toHaveLength(4)
      // Sem título acessível: o único `<h2>` possível é o da miniatura inerte e escondida (Entrar).
      for (const cabecalho of painel.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        expect(cabecalho.closest('[aria-hidden="true"]')).not.toBeNull()
      }

      // Nada que se foque: o painel não entra na ordem do Tab.
      for (const controle of painel.querySelectorAll('a, button, input, select, textarea, [tabindex]')) {
        expect(controle.closest('[inert]')).not.toBeNull()
      }
    })
  }

  it('cada linha do painel é rótulo serifado e texto, separados por régua horizontal', async () => {
    renderizarComDados('/criar-conta')
    await titulo('Criar conta')
    const linhas = [...document.querySelector('aside')!.querySelectorAll('li')]

    expect(linhas).toHaveLength(4)
    for (const li of linhas) {
      tem(li, 'border-t', 'flex', 'flex-col')
      tem(li.children[0], 'titulo-linha')
    }
  })

  it('/conta-excluida não leva o painel', async () => {
    renderizarComDados('/conta-excluida')
    await titulo('Conta excluída')
    expect(document.querySelector('aside')).toBeNull()
  })

  it('o painel não traz <svg> nem ícone', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    expect(document.querySelector('aside svg, aside img')).toBeNull()
  })
})

describe('4. a escala tipográfica', () => {
  const DISPLAY = ['titulo-tela', 'text-[clamp(2.75rem,6vw,4.5rem)]', 'font-extrabold', 'leading-none', 'tracking-[-0.02em]']

  for (const [caminho, nome] of PUBLICAS) {
    it(`${caminho}: o h1 passa à escala de exibição`, async () => {
      renderizarComDados(caminho)
      tem(await titulo(nome), ...DISPLAY)
    })
  }

  it('Começar e Conta: o h1 na escala de exibição', async () => {
    const comecar = renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    tem(await titulo('Começar'), ...DISPLAY)
    comecar.unmount()
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    tem(await titulo('Conta'), ...DISPLAY)
  })

  it('a frase sob o título sobe para 1,125 rem', async () => {
    renderizarComDados('/entrar')
    const h1 = await titulo('Entrar')
    const frase = h1.nextElementSibling!
    tem(frase, 'texto-medida', 'text-[1.125rem]')
  })
})

describe('5. dados técnicos legíveis', () => {
  it('o seletor de fuso: o valor é o id IANA e o texto é o nome legível', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const seletor = screen.getByLabelText('Seu fuso', { selector: 'select' }) as HTMLSelectElement

    const opcoes = [...seletor.querySelectorAll('option')]
    expect(opcoes.map((opcao) => opcao.value)).toEqual(listaDeFusos())
    for (const opcao of opcoes) expect(opcao.textContent, opcao.value).toBe(nomeDoFuso(opcao.value))
    expect(opcoes[0].value).toBe('America/Sao_Paulo')
    expect(opcoes[0].textContent).toBe('Horário de Brasília (São Paulo)')
    expect(seletor.value).toBe('America/Sao_Paulo')
  })

  it('o fuso guardado que não está na lista continua primeiro, com o nome legível e "(atual)"', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    const fora = ['US/Pacific', 'Asia/Saigon'].find((candidato) => !listaDeFusos().includes(candidato))
    expect(fora, 'um fuso válido que o navegador não lista').toBeDefined()
    await dados.atualizarMinhaConta('Juliana', fora!)
    renderizarComDados('/app/conta', { dados })
    await titulo('Conta')

    const primeira = (screen.getByLabelText('Seu fuso', { selector: 'select' }) as HTMLSelectElement).querySelector('option')!
    expect(primeira.value).toBe(fora)
    expect(primeira.textContent).toBe(`${nomeDoFuso(fora!)} (atual)`)
  })

  it('o seletor leva seta feita só de CSS: appearance-none, folga à direita e pseudo-elemento, sem <svg>', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const seletor = screen.getByLabelText('Seu fuso', { selector: 'select' })

    tem(seletor, 'appearance-none', 'pr-10', 'border-b-2', 'bg-[var(--cor-fundo)]', 'hover:bg-[var(--cor-papel-fundo)]')
    const envolucro = seletor.parentElement!
    tem(
      envolucro,
      'relative',
      'after:pointer-events-none',
      'after:absolute',
      'after:rotate-45',
      'after:border-b-2',
      'after:border-r-2',
    )
    expect(envolucro.querySelector('svg, img')).toBeNull()
  })

  it('o id da conta: mono de 14 px, quebra só depois de hífen, e "Copiar id" na mesma linha a partir de 40 rem', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const id = document.querySelector('[data-id-conta]')!

    tem(id, 'font-mono', 'text-[0.875rem]', 'tabular')
    nao(id, 'break-all', 'wrap-anywhere')
    expect(id.textContent).toBe('11111111-1111-4111-8111-111111111111')
    expect(id.querySelectorAll('wbr')).toHaveLength(4)

    const linha = id.parentElement!
    tem(linha, 'flex', 'flex-col', 'min-[40rem]:flex-row', 'min-[40rem]:items-center', 'min-[40rem]:gap-4')
    expect(linha.contains(screen.getByRole('button', { name: 'Copiar id' }))).toBe(true)
  })

  it('"Baixe um arquivo com os seus dados." sem "em JSON"', async () => {
    expect(CONTA.exportar.frase).toBe(
      'Baixe um arquivo com os seus dados. Quem é responsável recebe a família inteira; os outros papéis recebem os próprios dados.',
    )
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    expect(document.body.textContent).not.toContain('JSON')
  })

  it('o cabeçalho da Conta tem a marca, "Conta" e "Sair", sem o link do protótipo', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const cabecalho = within(screen.getByRole('navigation', { name: 'Conta' }))

    expect(cabecalho.getAllByRole('link').map((link) => link.textContent)).toEqual(['Conta'])
    expect(cabecalho.getByRole('button', { name: 'Sair' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Ver o protótipo do Hoje' })).toBeNull()
    expect(Object.keys(CABECALHO)).not.toContain('prototipo')
  })
})

describe('6. campos e campo de senha', () => {
  it('o rótulo de cada campo usa .rotulo e o campo leva fio de base mais forte', async () => {
    renderizarComDados('/criar-conta')
    await titulo('Criar conta')

    for (const rotulo of ['Seu nome', 'E-mail', 'Senha']) {
      const campo = screen.getByLabelText(rotulo, { selector: 'input' })
      const etiqueta = document.querySelector(`label[for="${campo.id}"]`)!
      tem(etiqueta, 'rotulo')
    }
    const nome = screen.getByLabelText('Seu nome', { selector: 'input' })
    tem(nome, 'border', 'border-b-2', 'min-h-12', 'rounded-[6px]', 'bg-[var(--cor-fundo)]', 'hover:bg-[var(--cor-papel-fundo)]')
  })

  it('a senha é uma faixa só: o botão fica dentro dela, à direita, separado por régua vertical, sem svg', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' }) as HTMLInputElement
    const botao = screen.getByRole('button', { name: 'Mostrar senha' })
    const faixa = campo.parentElement!

    expect(faixa.contains(botao)).toBe(true)
    expect(faixa.lastElementChild).toBe(botao)
    tem(faixa, 'flex', 'rounded-[6px]', 'border', 'border-b-2', 'has-[input:focus]:outline-2')
    // O campo da faixa não tem borda própria; a faixa desenha tudo.
    nao(campo, 'border', 'border-b-2')
    tem(campo, 'flex-1', 'min-w-0', 'bg-transparent')
    tem(botao, 'alvo-toque', 'w-14', 'border-l')
    expect(botao.querySelector('svg, img')).toBeNull()
  })

  it('a faixa de senha não estoura com a fonte ampliada: tudo em rem, o botão não encolhe e o campo cede a largura', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' })
    const botao = screen.getByRole('button', { name: COMUM.mostrarSenha })
    const faixa = campo.parentElement!

    tem(faixa.parentElement!, 'flex', 'flex-col', 'gap-1.5')
    tem(faixa, 'flex', 'flex-nowrap', 'has-[input:focus]:outline-2')
    // O campo pode encolher (min-w-0); o botão de 3,5 rem não encolhe nem cresce.
    tem(campo, 'min-w-0', 'flex-1')
    tem(botao, 'shrink-0', 'w-14')
    // O nome acessível e o estado continuam.
    expect(botao.getAttribute('aria-label')).toBe(COMUM.mostrarSenha)
    expect(botao.getAttribute('aria-pressed')).toBe('false')
  })

  it('com erro, a faixa inteira segue pintada e o botão continua dentro dela', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(campo.getAttribute('aria-invalid')).toBe('true'))

    const faixa = campo.parentElement!
    tem(faixa, 'border-2', 'border-[var(--cor-destaque)]')
    expect(faixa.contains(screen.getByRole('button', { name: COMUM.mostrarSenha }))).toBe(true)
  })

  it('"Mostrar senha" e "Ocultar senha": o nome acessível segue o estado e o tipo do campo troca', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' }) as HTMLInputElement
    const botao = screen.getByRole('button', { name: COMUM.mostrarSenha })

    expect(botao.getAttribute('aria-label')).toBe(COMUM.mostrarSenha)
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(campo.type).toBe('password')

    fireEvent.click(botao)

    const aberto = screen.getByRole('button', { name: COMUM.ocultarSenha })
    expect(aberto.getAttribute('aria-pressed')).toBe('true')
    expect(campo.type).toBe('text')

    fireEvent.click(aberto)
    expect(campo.type).toBe('password')
    expect(screen.getByRole('button', { name: COMUM.mostrarSenha })).toBeTruthy()
  })

  it('o erro de senha pinta a faixa inteira (borda de 2 px no destaque) e o campo continua com aria-invalid', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    const campo = screen.getByLabelText('Senha', { selector: 'input' })
    const faixa = campo.parentElement!
    nao(faixa, 'border-[var(--cor-destaque)]')

    fireEvent.change(screen.getByLabelText('E-mail', { selector: 'input' }), { target: { value: 'juliana@exemplo.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(campo.getAttribute('aria-invalid')).toBe('true'))
    tem(campo.parentElement!, 'border-2', 'border-[var(--cor-destaque)]')
    expect(campo.getAttribute('aria-describedby')).toContain('-erro')
  })

  it('o foco do botão não depende do contorno da faixa: o botão não leva outline-none', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    nao(screen.getByRole('button', { name: COMUM.mostrarSenha }), 'outline-none')
  })

  it('a caixa de excluir a conta usa o mesmo campo de senha em faixa', async () => {
    renderizarComDados('/app/conta', { sessao: 'davi' })
    await titulo('Conta')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Excluir minha conta' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }))

    const campo = within(screen.getByRole('dialog')).getByLabelText('Senha atual', { selector: 'input' })
    expect(within(campo.parentElement!).getByRole('button', { name: COMUM.mostrarSenha })).toBeTruthy()
  })
})

describe('7. o erro é uma caixa inteira', () => {
  it('ResumoErro: caixa de 2 px no destaque, frase na cor do texto, botão dentro, sem filete à esquerda', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    simularFalha(dados, 'entrar', 'rede')
    renderizarComDados('/entrar', { dados })
    await screen.findByRole('button', { name: 'Entrar' })
    fireEvent.change(screen.getByLabelText('E-mail', { selector: 'input' }), { target: { value: 'juliana@exemplo.invalid' } })
    fireEvent.change(screen.getByLabelText('Senha', { selector: 'input' }), { target: { value: 'qualquer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const alerta = await screen.findByRole('alert')
    tem(alerta, 'rounded-[8px]', 'border-2', 'border-[var(--cor-destaque)]', 'px-4', 'py-3', 'alvo-foco')
    nao(alerta, 'border-l-4', 'pl-3')
    expect(alerta.getAttribute('role')).toBe('alert')
    expect(alerta.getAttribute('tabindex')).toBe('-1')

    const frase = alerta.querySelector('p')!
    expect(frase.textContent).toBe(TEXTOS_ERRO.rede)
    tem(frase, 'font-semibold')
    nao(frase, 'text-[var(--cor-destaque)]')
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('o erro de campo (texto sob o campo) continua em destaque e semibold', async () => {
    renderizarComDados('/entrar')
    await titulo('Entrar')
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const erro = await screen.findByText(COMUM.escrevaEmail)
    tem(erro, 'font-semibold', 'text-[var(--cor-destaque)]')
  })
})

describe('8. as ações da Conta', () => {
  it('"Excluir minha conta" usa BOTAO_PERIGO, sozinha no fim, depois de Privacidade e do Sair', async () => {
    renderizarComDados('/app/conta', { sessao: 'davi' })
    await titulo('Conta')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Excluir minha conta' }) as HTMLButtonElement).disabled).toBe(false))

    const botao = screen.getByRole('button', { name: 'Excluir minha conta' })
    tem(botao, 'botao', 'botao-secundario', 'border-2', 'border-[var(--cor-destaque)]', 'text-[var(--cor-destaque)]')
    tem(botao, 'enabled:hover:bg-[var(--cor-destaque)]', 'enabled:hover:text-[var(--cor-sobre-destaque)]')

    const secao = botao.closest('section')!
    tem(secao, 'border-t-2', 'border-[var(--cor-destaque)]', 'py-10')
    const secoes = [...document.querySelector('main')!.children[1].querySelectorAll('section')]
    expect(secoes.map((s) => s.getAttribute('aria-labelledby'))).toEqual([
      'perfil',
      'id-conta',
      'exportar',
      'privacidade',
      'sair',
      'excluir-conta',
    ])
    expect(secao.parentElement!.lastElementChild === secao).toBe(true)
    // A seção "Sair" fica entre Privacidade e Excluir, com título e o botão.
    expect(secao.previousElementSibling!.querySelector('button')!.textContent).toBe('Sair')
  })

  it('o desativado (única responsável) continua com disabled, cor própria e legível', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    await waitFor(() => expect(screen.queryByText('Conferindo as suas famílias…')).toBeNull())

    const botao = screen.getByRole('button', { name: 'Excluir minha conta' }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    tem(botao, 'disabled:cursor-not-allowed', 'disabled:text-[var(--cor-texto)]', 'disabled:bg-[var(--cor-papel-fundo)]')
    expect(botao.className).not.toMatch(/opacity/)
    expect(botao.getAttribute('aria-describedby')).toBe('impedimento-exclusao')
  })

  it('a ordem das seções é Perfil, Id, Seus dados, Privacidade, Sair e Excluir, e a do índice acompanha', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Perfil', 'Id da conta', 'Seus dados', 'Privacidade', 'Sair', 'Excluir conta'])
    const indice = within(screen.getByRole('navigation', { name: 'Nesta página' }))
    expect(indice.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#perfil',
      '#id-conta',
      '#exportar',
      '#privacidade',
      '#sair',
      '#excluir-conta',
    ])
  })

  it('há um "Sair" só no corpo da página, além do cabeçalho', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    const corpo = document.querySelector('main')!
    expect(within(corpo).getAllByRole('button', { name: 'Sair' })).toHaveLength(1)
  })

  describe('o item ativo do índice lateral', () => {
    class ObservadorFalso {
      static todos: ObservadorFalso[] = []
      observados: Element[] = []
      desconectado = false
      chamar: IntersectionObserverCallback
      opcoes: IntersectionObserverInit | undefined
      constructor(chamar: IntersectionObserverCallback, opcoes?: IntersectionObserverInit) {
        this.chamar = chamar
        this.opcoes = opcoes
        ObservadorFalso.todos.push(this)
      }
      observe = (alvo: Element) => {
        this.observados.push(alvo)
      }
      unobserve = () => undefined
      disconnect = () => {
        this.desconectado = true
      }
      takeRecords = () => []
      avisar(visiveis: Element[]) {
        const entradas = this.observados.map((alvo) => ({ target: alvo, isIntersecting: visiveis.includes(alvo) }))
        this.chamar(entradas as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
      }
    }

    const atual = () => document.querySelector('nav[aria-label="Nesta página"] [aria-current]')
    const secao = (id: string) => document.getElementById(id)!.closest('section')!

    beforeEach(() => {
      ObservadorFalso.todos = []
    })

    it('começa em Perfil, com peso 700 e traço de 3 px no destaque, e marca aria-current="location"', async () => {
      vi.stubGlobal('IntersectionObserver', ObservadorFalso)
      renderizarComDados('/app/conta', { sessao: 'juliana' })
      await titulo('Conta')

      const ativo = atual()!
      expect(ativo.textContent).toBe('Perfil')
      expect(ativo.getAttribute('aria-current')).toBe('location')
      tem(ativo, 'font-bold', 'border-l-[3px]', 'border-[var(--cor-destaque)]', '-ml-px')
      expect(document.querySelectorAll('nav[aria-label="Nesta página"] [aria-current]')).toHaveLength(1)
      nao(ativo, 'underline')
    })

    it('clicar num link o torna o ativo', async () => {
      renderizarComDados('/app/conta', { sessao: 'juliana' })
      await titulo('Conta')

      fireEvent.click(within(screen.getByRole('navigation', { name: 'Nesta página' })).getByRole('link', { name: 'Privacidade' }))

      expect(atual()!.textContent).toBe('Privacidade')
    })

    it('acompanha a seção que cruza o terço de cima da janela e o primeiro da ordem vence', async () => {
      vi.stubGlobal('IntersectionObserver', ObservadorFalso)
      renderizarComDados('/app/conta', { sessao: 'juliana' })
      await titulo('Conta')

      // O efeito é passivo: roda depois de o título aparecer.
      await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
      const observador = ObservadorFalso.todos.at(-1)!
      expect(observador.observados.map((alvo) => alvo.getAttribute('aria-labelledby'))).toEqual([
        'perfil',
        'id-conta',
        'exportar',
        'privacidade',
        'sair',
        'excluir-conta',
      ])
      // A faixa é em pixels pela altura real da janela (R6); a geometria está em `indice.test.tsx`.
      expect(observador.opcoes?.rootMargin).toMatch(/^0px 0px -\d+px 0px$/)

      act(() => observador.avisar([secao('privacidade')]))
      expect(atual()!.textContent).toBe('Privacidade')
      act(() => observador.avisar([secao('privacidade'), secao('exportar')]))
      expect(atual()!.textContent).toBe('Seus dados')
    })

    it('desconecta o observador ao desmontar', async () => {
      vi.stubGlobal('IntersectionObserver', ObservadorFalso)
      const { unmount } = renderizarComDados('/app/conta', { sessao: 'juliana' })
      await titulo('Conta')
      await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
      const observador = ObservadorFalso.todos.at(-1)!

      unmount()

      expect(observador.desconectado).toBe(true)
    })

    it('sem IntersectionObserver (o jsdom), a página funciona e o ativo é Perfil', async () => {
      vi.stubGlobal('IntersectionObserver', undefined)
      renderizarComDados('/app/conta', { sessao: 'juliana' })
      await titulo('Conta')
      expect(atual()!.textContent).toBe('Perfil')
    })
  })
})

describe('9. "Seu nome" aparece uma vez', () => {
  it('sem o h2 "Seu nome": o h1 "Começar" nomeia a seção e o campo "Seu nome" fica sozinho', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    const h1 = await titulo('Começar')

    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    expect(h1.id).toBeTruthy()
    const secao = document.querySelector(`section[aria-labelledby="${h1.id}"]`)!
    expect(secao).not.toBeNull()
    expect(secao.querySelector('form')).not.toBeNull()
    expect(screen.getByLabelText('Seu nome', { selector: 'input' })).toBeTruthy()
    expect(screen.getByText('Falta pouco. Diga o seu nome e o fuso em que você está.')).toBeTruthy()
  })
})
