import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { fusoDoAparelho, listaDeFusos } from '../../componentes/conta/fusos.ts'
import { TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RF-14 (37a): o passo "Seu nome" de /app/comecar e a lista de fusos do controle compartilhado.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const campoDeTexto = () => screen.getByLabelText('Seu nome', { selector: 'input' }) as HTMLInputElement
const campoDeFuso = () => screen.getByLabelText('Fuso', { selector: 'select' }) as HTMLSelectElement
const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
const caminhoDe = (roteador: { state: { location: { pathname: string } } }) => roteador.state.location.pathname

async function memoriaSemConta(nome = 'Nova') {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', nome, 'http://localhost/entrar')
  return dados
}

describe('o passo "Seu nome"', () => {
  it('mostra o h1 Começar, a frase sob ele, as 2 linhas de campo e a ajuda de cada uma, com o nome dos metadados e o fuso do aparelho', async () => {
    const dados = await memoriaSemConta('Nova Pessoa')
    renderizarComDados('/app/comecar', { dados })

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Começar')
    expect(screen.getByText('Diga o seu nome e o fuso.')).toBeTruthy()
    expect(screen.getByText('É o nome que a família vai ver.')).toBeTruthy()
    expect(screen.getByText('Os horários aparecem neste fuso.')).toBeTruthy()
    expect(campoDeTexto().value).toBe('Nova Pessoa')
    expect(campoDeFuso().value).toBe(fusoDoAparelho())
    expect(campoDeTexto().getAttribute('aria-describedby')).toBe(screen.getByText('É o nome que a família vai ver.').id)
    // O botão é o primário do sistema (80 px; 64 abaixo de 768), de envio.
    const salvarBotao = screen.getByRole('button', { name: 'Salvar' })
    expect(salvarBotao.classList.contains('sb-botao')).toBe(true)
    expect(salvarBotao.getAttribute('type')).toBe('submit')
  })

  it('a abertura leva "Passo 1 de 2" como etiqueta na coluna lateral, depois do h1; o formulário vem logo depois, e depois as linhas "O que vem depois"', async () => {
    const dados = await memoriaSemConta()
    const { container } = renderizarComDados('/app/comecar', { dados })
    const h1 = await screen.findByRole('heading', { level: 1 })
    const abertura = container.querySelector('.sb-abertura')!
    const lateral = abertura.querySelector('.sb-abertura-lateral') as HTMLElement

    const passo = within(lateral).getByText('Passo 1 de 2')
    expect(passo.classList.contains('sb-etiqueta')).toBe(true)
    expect(within(lateral).getByText('Protótipo').classList.contains('sb-etiqueta')).toBe(true)
    expect(abertura.contains(h1)).toBe(true)
    expect(Boolean(h1.compareDocumentPosition(passo) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)

    // As 2 linhas de campo (nome e fuso), o botão, e depois as linhas "O que vem depois".
    const formulario = container.querySelector('form')!
    expect(formulario.querySelectorAll('.sb-campo')).toHaveLength(2)
    expect(abertura.nextElementSibling!.contains(formulario)).toBe(true)
    const linhas = container.querySelector('section[aria-label="O que vem depois"]')!
    expect(Boolean(formulario.compareDocumentPosition(linhas) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect([...linhas.querySelectorAll('.sb-linha-rotulo')].map((rotulo) => rotulo.textContent)).toEqual([
      'Nome',
      'Fuso',
      'Dados',
    ])
  })

  it('nenhum bloco da tela tem altura mínima própria: a altura é a do conteúdo', async () => {
    const dados = await memoriaSemConta()
    const { container } = renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    for (const bloco of container.querySelectorAll<HTMLElement>('main > *')) {
      expect(bloco.style.minHeight, bloco.className).toBe('')
      expect(bloco.className).not.toMatch(/min-h-|h-\[/)
    }
  })

  it('o seletor de fuso do passo é editável: não leva readonly', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    expect(campoDeFuso().hasAttribute('readonly')).toBe(false)
    expect(campoDeFuso().closest('.sb-campo-controle')!.hasAttribute('data-select')).toBe(true)
  })

  it('sem nome nos metadados, o campo começa vazio', async () => {
    const dados = await memoriaSemConta('')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })
    expect(campoDeTexto().value).toBe('')
  })

  it('"Salvar" cria a conta com o nome e o fuso escolhidos e segue para a Conta', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    fireEvent.change(campoDeTexto(), { target: { value: '  Nova Pessoa  ' } })
    fireEvent.change(campoDeFuso(), { target: { value: 'America/Manaus' } })
    salvar()

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor).toMatchObject({ nome: 'Nova Pessoa', fuso: 'America/Manaus' })
  })

  it('com o volta, segue para ele depois de salvar', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados('/app/comecar?volta=%2Fapp%2Fhoje', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    salvar()
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/hoje'))
  })

  it('um volta inválido é ignorado: vai à Conta', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados(`/app/comecar?volta=${encodeURIComponent('/app/comecar')}`, { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    salvar()
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
  })

  it('com a conta completa, a rota leva ao destino e nunca ao próprio Começar', async () => {
    const { roteador, unmount } = renderizarComDados('/app/comecar', { sessao: 'juliana' })
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    unmount()

    const outro = renderizarComDados('/app/comecar?volta=%2Fapp%2Fhoje', { sessao: 'juliana' })
    await waitFor(() => expect(caminhoDe(outro.roteador)).toBe('/app/hoje'))
  })

  it('nome vazio (depois de tirar os espaços) dá erro no campo, sem chamar o banco', async () => {
    const dados = await memoriaSemConta('')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })
    const criarConta = vi.spyOn(dados, 'criarMinhaConta')

    fireEvent.change(campoDeTexto(), { target: { value: '   ' } })
    salvar()

    expect(screen.getByText('Escreva o seu nome.')).toBeTruthy()
    expect(campoDeTexto().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campoDeTexto())
    expect(criarConta).not.toHaveBeenCalled()
  })

  it('nome_vazio do banco: o erro fica no campo do nome', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', 'nome_vazio')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })
    salvar()

    await waitFor(() => expect(campoDeTexto().getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.nome_vazio)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campoDeTexto()))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('fuso_invalido do banco: o erro fica no campo do fuso', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', 'fuso_invalido')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })
    salvar()

    await waitFor(() => expect(campoDeFuso().getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.fuso_invalido)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campoDeFuso()))
  })

  it('parâmetro obrigatório: a frase no topo e o foco no primeiro campo', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', 'parametro_obrigatorio')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })
    salvar()

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.parametro_obrigatorio)
    await waitFor(() => expect(document.activeElement).toBe(campoDeTexto()))
  })

  it('o cabeçalho é o do site logado, sem "Sair" (ele é só da Conta), e não monta a navegação inferior do protótipo', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    const cabecalho = within(document.querySelector('[data-cabecalho]') as HTMLElement)
    expect(cabecalho.getByRole('link', { name: 'Hoje' }).getAttribute('href')).toBe('/app/hoje')
    expect(cabecalho.getByRole('link', { name: 'Conta' }).getAttribute('href')).toBe('/app/conta')
    expect(cabecalho.getByRole('button', { name: 'Modo madrugada' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    // Um só cabeçalho (o do site): a tela não desenha o próprio.
    expect(document.querySelectorAll('header')).toHaveLength(1)
  })
})

describe('a lista de fusos (RF-14)', () => {
  const DO_BRASIL = [
    'America/Sao_Paulo',
    'America/Manaus',
    'America/Cuiaba',
    'America/Campo_Grande',
    'America/Porto_Velho',
    'America/Rio_Branco',
    'America/Boa_Vista',
    'America/Belem',
    'America/Fortaleza',
    'America/Recife',
    'America/Maceio',
    'America/Bahia',
    'America/Araguaina',
    'America/Santarem',
    'America/Noronha',
    'America/Eirunepe',
  ]

  it('começa pelos fusos do Brasil, na ordem da spec', () => {
    expect(listaDeFusos().slice(0, DO_BRASIL.length)).toEqual(DO_BRASIL)
  })

  it('depois vêm os demais do navegador e UTC, em ordem alfabética e sem repetição', () => {
    const lista = listaDeFusos()
    const resto = lista.slice(DO_BRASIL.length)

    expect(new Set(lista).size).toBe(lista.length)
    expect(lista).toContain('UTC')
    expect(resto).toContain('Europe/Lisbon')
    expect(resto).toEqual([...resto].sort((a, b) => a.localeCompare(b)))
    for (const fuso of DO_BRASIL) expect(resto).not.toContain(fuso)
  })

  it('o select mostra a lista inteira, e o do aparelho está nela', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 1, name: 'Começar' })

    const opcoes = [...campoDeFuso().options].map((opcao) => opcao.value)
    expect(opcoes).toEqual(listaDeFusos())
    expect(opcoes).toContain(fusoDoAparelho())
  })

  it('o fuso do aparelho vale se está na lista; senão, America/Sao_Paulo', () => {
    const resolver = (fuso: string) =>
      vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function () {
        return { resolvedOptions: () => ({ timeZone: fuso }) }
      } as never)

    resolver('America/Manaus')
    expect(fusoDoAparelho()).toBe('America/Manaus')
    vi.restoreAllMocks()

    resolver('Etc/Fora_Da_Lista')
    expect(fusoDoAparelho()).toBe('America/Sao_Paulo')
  })
})
