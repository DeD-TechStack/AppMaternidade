import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { fusoDoAparelho, listaDeFusos } from '../../componentes/conta/fusos.ts'
import { NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
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
  it('mostra o h1 Começar, o h2 Seu nome, a frase e os campos, com o nome dos metadados e o fuso do aparelho', async () => {
    const dados = await memoriaSemConta('Nova Pessoa')
    renderizarComDados('/app/comecar', { dados })

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(NOMES_DO_H1.comecar)
    expect(screen.getByRole('heading', { level: 2, name: 'Seu nome' })).toBeTruthy()
    expect(screen.getByText('Falta pouco. Diga o seu nome e o fuso em que você está.')).toBeTruthy()
    expect(screen.getByText('É o nome que a família vai ver.')).toBeTruthy()
    expect(screen.getByText('Os horários aparecem neste fuso.')).toBeTruthy()
    expect(campoDeTexto().value).toBe('Nova Pessoa')
    expect(campoDeFuso().value).toBe(fusoDoAparelho())
    // A ação é a pílula primária do "Campo de mel" (cacau, 56 px, largura cheia do formulário).
    const salvarBotao = screen.getByRole('button', { name: 'Salvar' })
    expect(salvarBotao.classList.contains('cm-botao-primario')).toBe(true)
    expect(salvarBotao.classList.contains('w-full')).toBe(true)
  })

  it('a partir de 64 rem usa as duas colunas das telas de acesso: o h1 e o cartão do passo à esquerda, a cena de mel à direita', async () => {
    const dados = await memoriaSemConta()
    const { container } = renderizarComDados('/app/comecar', { dados })
    const h1 = await screen.findByRole('heading', { level: 1 })
    const status = screen.getByRole('status')
    const h2 = screen.getByRole('heading', { level: 2, name: 'Seu nome' })
    const frase = screen.getByText('Falta pouco. Diga o seu nome e o fuso em que você está.')
    const formulario = container.querySelector('form')!
    const cartao = h2.closest('section')!

    // Uma coluna no celular (o cartão primeiro, a cena depois); duas a partir de 64 rem.
    const grade = h1.parentElement!.parentElement!
    for (const classe of ['grid', 'gap-12', 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]', 'lg:gap-16']) {
      expect(grade.classList.contains(classe), classe).toBe(true)
    }
    const [esquerda, direita] = [...grade.children]
    expect(esquerda.contains(h1) && esquerda.contains(status) && esquerda.contains(cartao)).toBe(true)
    expect(direita.querySelector('img[data-cena]')).not.toBeNull()
    expect(cartao.contains(h2) && cartao.contains(frase) && cartao.contains(formulario)).toBe(true)
    expect(cartao.contains(h1)).toBe(false)
    expect(cartao.contains(status)).toBe(false)

    // A ordem do DOM é a visual: o h1, a região de status, o título do passo, a frase e o formulário.
    const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(antes(h1, status)).toBe(true)
    expect(antes(status, h2)).toBe(true)
    expect(antes(h2, frase)).toBe(true)
    expect(antes(frase, formulario)).toBe(true)
  })

  it('o seletor de fuso do passo não leva a marca de só leitura', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    expect(campoDeFuso().className).not.toMatch(/read-only:/)
  })

  it('sem nome nos metadados, o campo começa vazio', async () => {
    const dados = await memoriaSemConta('')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(campoDeTexto().value).toBe('')
  })

  it('"Salvar" cria a conta com o nome e o fuso escolhidos e segue para a Conta', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

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
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    salvar()
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/hoje'))
  })

  it('um volta inválido é ignorado: vai à Conta', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados(`/app/comecar?volta=${encodeURIComponent('/app/comecar')}`, { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

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
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
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
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
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
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    salvar()

    await waitFor(() => expect(campoDeFuso().getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.fuso_invalido)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campoDeFuso()))
  })

  it('parâmetro obrigatório: a frase no topo e o foco no primeiro campo', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', 'parametro_obrigatorio')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    salvar()

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.parametro_obrigatorio)
    await waitFor(() => expect(document.activeElement).toBe(campoDeTexto()))
  })

  it('traz o cabeçalho da conta, com Sair, e não monta a navegação inferior do protótipo', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    expect(screen.getByRole('navigation', { name: 'Conta' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver o protótipo do Hoje' }).getAttribute('href')).toBe('/app/hoje')
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Conta' }).hasAttribute('aria-current')).toBe(false)
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
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

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
