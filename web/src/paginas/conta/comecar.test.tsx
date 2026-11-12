import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_CONVITE } from '../../componentes/conta/armazenamento.ts'
import { hojeNoFuso, somarDias } from '../../componentes/conta/datas.ts'
import { fusoDoAparelho, listaDeFusos } from '../../componentes/conta/fusos.ts'
import { AVISO_BANCO_DEMONSTRACAO, NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { CODIGO_CONVITE_PENDENTE } from '../../dados/conta.demonstracao.ts'
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
    for (const classe of ['grid', 'gap-12', 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]', 'lg:gap-12']) {
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

  it('"Salvar" cria a conta com o nome e o fuso escolhidos e segue para o destino: sem família, a escolha do Começar', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    fireEvent.change(campoDeTexto(), { target: { value: '  Nova Pessoa  ' } })
    fireEvent.change(campoDeFuso(), { target: { value: 'America/Manaus' } })
    salvar()

    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
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

  it('um volta inválido é ignorado: sem família, a escolha do Começar', async () => {
    const dados = await memoriaSemConta()
    const { roteador } = renderizarComDados(`/app/comecar?volta=${encodeURIComponent('/app/comecar')}`, { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    salvar()
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
  })

  it('com a conta completa e sem volta, a rota mostra a escolha e fica nela; com um volta válido, leva a ele', async () => {
    const { roteador, unmount } = renderizarComDados('/app/comecar', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
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

  it('traz o cabeçalho da conta, com Conta e Sair, sem o link do protótipo; a navegação é a do cabeçalho do site', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    const barra = within(screen.getByRole('navigation', { name: 'Conta' }))
    expect(barra.getAllByRole('link').map((link) => link.textContent)).toEqual(['Conta'])
    expect(barra.getByRole('button', { name: 'Sair' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Ver o protótipo do Hoje' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    expect(barra.getByRole('link', { name: 'Conta' }).hasAttribute('aria-current')).toBe(false)
    const site = within(screen.getByRole('navigation', { name: 'Site' }))
    expect(site.getAllByRole('link').map((link) => link.textContent)).toEqual(['Hoje', 'Sessão', 'Comunidade', 'Família'])
  })
})

// 37b: a escolha entre criar uma família e usar um convite, criar a família e o primeiro bebê.
describe('a escolha (RF-14, 37b)', () => {
  const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
  const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
  const abrirEscolha = async (pessoa: 'davi' | 'juliana' = 'davi', dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))) => {
    const renderizado = renderizarComDados('/app/comecar', { dados, sessao: pessoa })
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    return { ...renderizado, dados }
  }

  it('mostra "Criar uma família" e "Tenho um convite" (→ /convite); o link "Ir para a família" só para quem já tem família', async () => {
    const semFamilia = await abrirEscolha('davi')

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(NOMES_DO_H1.comecarFamilia)
    expect(document.title).toBe('Começar | AppMaternidade')
    expect(botao('Criar uma família').classList.contains('cm-botao-primario')).toBe(true)
    expect(screen.getByRole('link', { name: 'Tenho um convite' }).getAttribute('href')).toBe('/convite')
    expect(screen.queryByRole('link', { name: 'Ir para a família' })).toBeNull()
    semFamilia.unmount()

    await abrirEscolha('juliana')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Ir para a família' }).getAttribute('href')).toBe('/app/familia'))
  })

  it('mostra na região de status a mensagem de passagem: acesso_encerrado e senha_trocada', async () => {
    const { roteador } = await abrirEscolha('davi')
    expect(screen.getByRole('status').textContent).toBe('')

    await act(async () => {
      await roteador.navigate('/app/comecar', { state: { mensagem: 'acesso_encerrado', familia: 'Família Exemplo' } })
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Seu acesso à família Família Exemplo foi encerrado.'))

    await act(async () => {
      await roteador.navigate('/app/comecar', { state: { mensagem: 'senha_trocada' } })
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Senha trocada.'))
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1)
  })

  it('com código de convite guardado, a página leva direto a /convite', async () => {
    sessionStorage.setItem(CHAVE_CONVITE, CODIGO_CONVITE_PENDENTE)
    const { roteador } = renderizarComDados('/app/comecar', { sessao: 'davi' })

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/convite'))
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe(CODIGO_CONVITE_PENDENTE)
  })

  it('"Tenho um convite" leva a /convite, que mostra só o campo (sem código guardado)', async () => {
    const { roteador } = await abrirEscolha('davi')
    fireEvent.click(screen.getByRole('link', { name: 'Tenho um convite' }))

    await screen.findByLabelText('Código ou link do convite')
    expect(caminhoDe(roteador)).toBe('/convite')
  })

  it('"Criar uma família": nome (com o foco) e fuso (o da conta); "Voltar" volta à escolha', async () => {
    await abrirEscolha('davi')
    fireEvent.click(botao('Criar uma família'))

    expect(screen.getByRole('heading', { level: 2, name: 'Criar uma família' })).toBeTruthy()
    expect(document.activeElement).toBe(campo('Nome da família'))
    expect(campo('Fuso da família').value).toBe('America/Sao_Paulo')
    expect([...(campo('Fuso da família') as unknown as HTMLSelectElement).options].map((opcao) => opcao.value)).toEqual(listaDeFusos())

    fireEvent.click(botao('Voltar'))
    expect(screen.getByRole('heading', { level: 2, name: 'Como você quer começar?' })).toBeTruthy()
  })

  it('nome vazio: erro no campo, sem chamar o banco; nome_vazio e fuso_invalido do banco ficam nos campos', async () => {
    const { dados } = await abrirEscolha('davi')
    const criar = vi.spyOn(dados, 'criarFamilia')
    fireEvent.click(botao('Criar uma família'))

    digitar('Nome da família', '   ')
    fireEvent.click(botao('Criar família'))
    expect(screen.getByText('Escreva um nome.')).toBeTruthy()
    expect(campo('Nome da família').getAttribute('aria-invalid')).toBe('true')
    expect(criar).not.toHaveBeenCalled()

    digitar('Nome da família', 'Casa')
    simularFalha(dados, 'criarFamilia', 'nome_vazio')
    fireEvent.click(botao('Criar família'))
    await waitFor(() => expect(campo('Nome da família').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.nome_vazio)).toBeTruthy()

    simularFalha(dados, 'criarFamilia', 'fuso_invalido')
    fireEvent.click(botao('Criar família'))
    await waitFor(() => expect(campo('Fuso da família').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.fuso_invalido)).toBeTruthy()
  })

  it('cria a família e pede o primeiro bebê; "Salvar bebê" leva à Família com ele na lista', async () => {
    const { dados, roteador } = await abrirEscolha('davi')
    fireEvent.click(botao('Criar uma família'))
    digitar('Nome da família', '  Casa da Heloísa ')
    digitar('Fuso da família', 'America/Manaus')
    fireEvent.click(botao('Criar família'))

    expect(await screen.findByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })).toBeTruthy()
    expect(screen.getByText('A data serve para mostrar atividades da fase; ela não aparece na comunidade.')).toBeTruthy()
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor.map((f) => [f.nome, f.fuso, f.meuPapel])).toEqual([['Casa da Heloísa', 'America/Manaus', 'responsavel']])

    digitar('Nome ou apelido', 'Heloísa')
    digitar('Data de nascimento', somarDias(hojeNoFuso('America/Manaus'), -15))
    fireEvent.click(botao('Salvar bebê'))

    await screen.findByRole('heading', { level: 1, name: 'Família' })
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/familia'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Casa da Heloísa' })).toBeTruthy()
    expect(await screen.findByText('Heloísa')).toBeTruthy()
    expect(roteador.state.location.search).toBe('')
  })

  it('"Fazer depois" leva à Família sem bebê', async () => {
    const { roteador } = await abrirEscolha('davi')
    fireEvent.click(botao('Criar uma família'))
    digitar('Nome da família', 'Casa Nova')
    fireEvent.click(botao('Criar família'))
    await screen.findByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })

    fireEvent.click(botao('Fazer depois'))

    expect(await screen.findByRole('heading', { level: 2, name: 'Casa Nova' })).toBeTruthy()
    expect(caminhoDe(roteador)).toBe('/app/familia')
    expect(await screen.findByText('Nenhum bebê cadastrado.')).toBeTruthy()
  })

  it('bebê: nome e data obrigatórios; um nascimento depois do hoje da família dá erro no campo, com a família já criada', async () => {
    const { dados } = await abrirEscolha('davi')
    fireEvent.click(botao('Criar uma família'))
    digitar('Nome da família', 'Casa Nova')
    fireEvent.click(botao('Criar família'))
    await screen.findByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })
    const cadastrar = vi.spyOn(dados, 'cadastrarBebe')

    fireEvent.click(botao('Salvar bebê'))
    expect(screen.getByText('Escreva um nome.')).toBeTruthy()
    digitar('Nome ou apelido', 'Mel')
    fireEvent.click(botao('Salvar bebê'))
    expect(screen.getByText('Escolha a data de nascimento.')).toBeTruthy()
    expect(cadastrar).not.toHaveBeenCalled()

    digitar('Data de nascimento', somarDias(hojeNoFuso('America/Sao_Paulo'), 3))
    fireEvent.click(botao('Salvar bebê'))
    await waitFor(() => expect(campo('Data de nascimento').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.nascimento_no_futuro)).toBeTruthy()
    expect(document.activeElement).toBe(campo('Data de nascimento'))
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor).toHaveLength(1)
  })

  it('se o bebê falhar, a família continua criada e o erro aparece no formulário do bebê, com "Tentar de novo"', async () => {
    const { dados, roteador } = await abrirEscolha('davi')
    fireEvent.click(botao('Criar uma família'))
    digitar('Nome da família', 'Casa Nova')
    fireEvent.click(botao('Criar família'))
    await screen.findByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })
    digitar('Nome ou apelido', 'Mel')
    digitar('Data de nascimento', somarDias(hojeNoFuso('America/Sao_Paulo'), -10))
    simularFalha(dados, 'cadastrarBebe', 'desconhecido')
    fireEvent.click(botao('Salvar bebê'))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.desconhecido)
    expect(screen.getByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })).toBeTruthy()
    const familias = await dados.minhasFamilias()
    expect(familias.ok && familias.valor).toHaveLength(1)

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/familia'))
  })

  it('no modo Supabase, o aviso do banco de demonstração fica acima do formulário da família e do bebê; no modo memória, não', async () => {
    const memoria = await abrirEscolha('davi')
    fireEvent.click(botao('Criar uma família'))
    expect(document.querySelector('[data-aviso="banco-de-demonstracao"]')).toBeNull()
    memoria.unmount()

    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
    try {
      await abrirEscolha('davi')
      fireEvent.click(botao('Criar uma família'))
      const aviso = document.querySelector('[data-aviso="banco-de-demonstracao"]')!
      expect(aviso.textContent).toBe(AVISO_BANCO_DEMONSTRACAO)
      expect(aviso.compareDocumentPosition(campo('Nome da família')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    } finally {
      vi.unstubAllEnvs()
    }
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
