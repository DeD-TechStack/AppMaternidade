import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import {
  apagarChave,
  CHAVE_CONVITE,
  CHAVE_FAMILIA_ATUAL,
  CHAVE_RECUPERACAO,
} from '../../componentes/conta/armazenamento.ts'
import { destinoDepoisDeEntrar, voltaValida } from '../../componentes/conta/destino.ts'
import { AVISO_BANCO_DEMONSTRACAO, CRIAR_CONTA, NOMES_DO_H1, RECUPERAR, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import type { Resultado } from '../../dados/comum.ts'
import type { Usuario } from '../../dados/conta.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RF-09 a RF-12: a guarda, o destino depois de entrar, entrar, criar conta, recuperar, redefinir,
// sair e a saída que a pessoa não pediu. Tudo em modo memória, sem rede.

const JULIANA = PESSOAS.juliana
const EMAIL_NOVO = 'nova@exemplo.invalid'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// O passo "Seu nome" tem uma seção com o mesmo nome acessível do campo: só campos aqui.
const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')
// O cabeçalho da casca também tem os links Entrar e Criar conta (levam ao Contato por enquanto): os da
// tela se buscam dentro do <main>.
const principal = () => within(document.querySelector('main')!)
const caminhoDe = (roteador: { state: { location: { pathname: string } } }) => roteador.state.location.pathname
const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))

function pendente<T>() {
  let liberar!: (valor: T) => void
  const promessa = new Promise<T>((resolver) => {
    liberar = resolver
  })
  return { promessa, liberar }
}

/** Uma pessoa com sessão e sem conta (a conta incompleta). */
async function memoriaComContaIncompleta() {
  const dados = novaMemoria()
  await dados.criarUsuario(EMAIL_NOVO, 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

async function entrarComo(email: string, senha: string) {
  await screen.findByRole('button', { name: 'Entrar' })
  digitar('E-mail', email)
  digitar('Senha', senha)
  fireEvent.click(botao('Entrar'))
}

describe('o destino depois de entrar (RF-10)', () => {
  it('voltaValida aceita só caminho interno de /app/ que não seja o Começar', () => {
    expect(voltaValida('/app/conta')).toBe('/app/conta')
    expect(voltaValida('/app/hoje?tipo=sono')).toBe('/app/hoje?tipo=sono')
    expect(voltaValida('/app/sessao')).toBe('/app/sessao')
    for (const invalido of [
      null,
      undefined,
      '',
      '//evil.example',
      'http://evil.example/app/conta',
      'https://evil.example',
      '/entrar',
      '/app/comecar',
      '/app/comecar?volta=/app/hoje',
      '/app/comecar/',
      '/convite',
      'app/conta',
      '/app/../entrar',
      '/app/\\evil.example',
    ]) {
      expect(voltaValida(invalido), String(invalido)).toBeNull()
    }
  })

  it('destinoDepoisDeEntrar: a Conta por padrão, o volta válido e, com conta incompleta, o passo "Seu nome" antes', () => {
    expect(destinoDepoisDeEntrar(null, true)).toBe('/app/conta')
    expect(destinoDepoisDeEntrar('/app/hoje', true)).toBe('/app/hoje')
    expect(destinoDepoisDeEntrar('/entrar', true)).toBe('/app/conta')
    expect(destinoDepoisDeEntrar('/app/hoje', false)).toBe('/app/comecar?volta=%2Fapp%2Fhoje')
    expect(destinoDepoisDeEntrar(null, false)).toBe('/app/comecar?volta=%2Fapp%2Fconta')
  })

  it('entrar com um volta válido leva a ele', async () => {
    const { roteador } = renderizarComDados('/entrar?volta=%2Fapp%2Fhoje')
    await entrarComo('juliana@exemplo.invalid', SENHA_DEMONSTRACAO)

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/hoje'))
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Hoje')
  })

  it('um volta com outro formato é ignorado, sem erro, e a pessoa vai à Conta', async () => {
    for (const volta of ['//evil.example', 'http://evil.example', '/entrar', '/app/comecar', '/convite']) {
      const { roteador, unmount } = renderizarComDados(`/entrar?volta=${encodeURIComponent(volta)}`)
      await entrarComo('juliana@exemplo.invalid', SENHA_DEMONSTRACAO)

      await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'), { timeout: 3000 })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
      expect(screen.queryByRole('alert')).toBeNull()
      unmount()
    }
  })

  it('quem já tem sessão e abre /entrar ou /criar-conta vai ao destino', async () => {
    for (const caminho of ['/entrar', '/criar-conta']) {
      const { roteador, unmount } = renderizarComDados(`${caminho}?volta=%2Fapp%2Fhoje`, { sessao: 'juliana' })
      await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/hoje'))
      unmount()
    }
  })

  it('a conta incompleta vem antes do volta, inclusive /app/hoje, e o volta segue no passo "Seu nome"', async () => {
    const dados = await memoriaComContaIncompleta()
    const { roteador } = renderizarComDados('/entrar?volta=%2Fapp%2Fhoje', { dados })

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/comecar'))
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fhoje')
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/hoje'))
  })

  it('os links entre /entrar, /criar-conta e /recuperar-acesso levam junto o volta válido', async () => {
    const volta = '?volta=%2Fapp%2Fhoje'
    const { roteador, unmount } = renderizarComDados(`/entrar${volta}`)
    await screen.findByRole('button', { name: 'Entrar' })
    expect(principal().getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe(`/criar-conta${volta}`)
    expect(screen.getByRole('link', { name: 'Esqueci a senha' }).getAttribute('href')).toBe(`/recuperar-acesso${volta}`)
    unmount()

    const criar = renderizarComDados(`/criar-conta${volta}`)
    await screen.findByRole('button', { name: 'Criar conta' })
    expect(principal().getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe(`/entrar${volta}`)
    criar.unmount()

    renderizarComDados(`/recuperar-acesso${volta}`)
    expect(principal().getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe(`/entrar${volta}`)
    expect(principal().getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe(`/criar-conta${volta}`)
    expect(roteador).toBeTruthy()
  })

  it('um volta inválido não vai para os links', async () => {
    renderizarComDados('/entrar?volta=%2Fentrar')
    await screen.findByRole('button', { name: 'Entrar' })
    expect(principal().getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/criar-conta')
  })
})

describe('a guarda das rotas logadas (RF-09)', () => {
  it('carregando: o main fica ocupado, mostra o texto e não mostra o formulário de entrar', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    const lida = pendente<Resultado<Usuario | null>>()
    vi.spyOn(dados, 'sessaoAtual').mockReturnValue(lida.promessa)
    const { container } = renderizarComDados('/app/conta', { dados })

    const principal = container.querySelector('main')!
    expect(principal.getAttribute('aria-busy')).toBe('true')
    expect(within(principal).getByText('Carregando…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Entrar' })).toBeNull()
    expect(screen.queryByLabelText('Senha')).toBeNull()

    lida.liberar({ ok: true, valor: { id: JULIANA.id, email: JULIANA.email, nomeMetadados: null } })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
  })

  it('erro ao ler a sessão: a frase do catálogo e "Tentar de novo", que lê de novo', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    simularFalha(dados, 'sessaoAtual', 'rede')
    renderizarComDados('/app/conta', { dados })

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.rede)
    expect(screen.queryByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })).toBeNull()
    fireEvent.click(botao('Tentar de novo'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
  })

  it('erro ao ler a conta: a mesma coisa', async () => {
    const dados = novaMemoria()
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    simularFalha(dados, 'minhaConta', 'tente_de_novo')
    renderizarComDados('/app/conta', { dados })

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.tente_de_novo)
    fireEvent.click(botao('Tentar de novo'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
  })

  it('sem sessão: vai a /entrar com o caminho pedido (e a busca), no lugar da entrada do histórico', async () => {
    const { roteador } = renderizarComDados('/app/conta?aba=dados')

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(caminhoDe(roteador)).toBe('/entrar')
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta%3Faba%3Ddados')
    expect(roteador.state.historyAction).toBe('REPLACE')
  })

  it('com sessão e conta incompleta, a rota pedida vai ao passo "Seu nome" levando o volta', async () => {
    const dados = await memoriaComContaIncompleta()
    const { roteador } = renderizarComDados('/app/conta', { dados })

    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(roteador.state.historyAction).toBe('REPLACE')
  })

  it('/app/comecar pedido com conta incompleta mostra o passo sem volta', async () => {
    const dados = await memoriaComContaIncompleta()
    const { roteador } = renderizarComDados('/app/comecar', { dados })

    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(roteador.state.location.search).toBe('')
  })

  it('repassa o state da navegação que recebeu (mensagem de passagem)', async () => {
    const { roteador } = renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    await act(async () => {
      await roteador.navigate('/app/conta', { state: { mensagem: 'saiu' } })
    })
    await waitFor(() => expect(status().textContent).toBe('Você saiu da conta.'))
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
  })

  it('a mensagem senha_trocada chega ao passo "Seu nome" quando a conta está incompleta', async () => {
    const dados = await memoriaComContaIncompleta()
    const { roteador } = renderizarComDados('/entrar', { dados })
    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/comecar'))

    await act(async () => {
      await roteador.navigate('/app/conta', { state: { mensagem: 'senha_trocada' } })
    })
    await waitFor(() => expect(status().textContent).toBe('Senha trocada.'))
    expect(caminhoDe(roteador)).toBe('/app/comecar')
  })
})

describe('/entrar', () => {
  it('entra com e-mail e senha e vai à Conta', async () => {
    const { roteador, dados } = renderizarComDados('/entrar')
    const entrar = vi.spyOn(dados, 'entrar')
    await entrarComo(' juliana@exemplo.invalid ', SENHA_DEMONSTRACAO)

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(entrar).toHaveBeenCalledWith('juliana@exemplo.invalid', SENHA_DEMONSTRACAO)
    expect(entrar).toHaveBeenCalledTimes(1)
  })

  it('campo vazio dá erro no próprio campo, sem chamar o banco, e o foco vai ao primeiro erro', async () => {
    const { dados } = renderizarComDados('/entrar')
    const entrar = vi.spyOn(dados, 'entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    fireEvent.click(botao('Entrar'))
    expect(campo('E-mail').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Escreva o seu e-mail.')).toBeTruthy()
    expect(document.activeElement).toBe(campo('E-mail'))

    digitar('E-mail', 'juliana@exemplo.invalid')
    expect(campo('E-mail').hasAttribute('aria-invalid')).toBe(false)
    fireEvent.click(botao('Entrar'))
    expect(screen.getByText('Escreva a sua senha.')).toBeTruthy()
    expect(document.activeElement).toBe(campo('Senha'))
    expect(entrar).not.toHaveBeenCalled()
  })

  it('o erro do catálogo aparece no topo do formulário, com o foco nele', async () => {
    renderizarComDados('/entrar')
    await entrarComo('juliana@exemplo.invalid', 'senha-errada')

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe(TEXTOS_ERRO.credenciais)
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  })

  it('"Mostrar senha" alterna o campo e leva aria-pressed', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    const alternar = botao('Mostrar senha')
    expect(alternar.getAttribute('aria-pressed')).toBe('false')
    expect(campo('Senha').type).toBe('password')
    fireEvent.click(alternar)
    expect(alternar.getAttribute('aria-pressed')).toBe('true')
    expect(campo('Senha').type).toBe('text')
  })

  it('tem os links Criar conta e Esqueci a senha, com alvo de 44 px', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    for (const nome of ['Criar conta', 'Esqueci a senha']) {
      expect(principal().getByRole('link', { name: nome }).classList.contains('alvo-toque')).toBe(true)
    }
    expect(screen.getByRole('link', { name: 'Esqueci a senha' }).getAttribute('href')).toBe('/recuperar-acesso')
    expect(screen.getByRole('link', { name: 'AppMaternidade' }).getAttribute('href')).toBe('/')
  })
})

describe('/criar-conta', () => {
  async function preencher(nome = 'Nova', email = EMAIL_NOVO, senha = 'senha-nova') {
    await screen.findByRole('button', { name: 'Criar conta' })
    digitar('Seu nome', nome)
    digitar('E-mail', email)
    digitar('Senha', senha)
    fireEvent.click(botao('Criar conta'))
  }

  it('com sessão devolvida, cria o usuário e a conta (nome e fuso do aparelho) e segue para o destino', async () => {
    const { roteador, dados } = renderizarComDados('/criar-conta')
    const criarUsuario = vi.spyOn(dados, 'criarUsuario')
    await preencher('  Nova  ')

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(screen.getByText(`Nova · ${EMAIL_NOVO}`)).toBeTruthy()

    const [email, , nome, voltarPara] = criarUsuario.mock.calls[0]
    expect(email).toBe(EMAIL_NOVO)
    expect(nome).toBe('Nova')
    // O link de confirmação volta para /entrar, no subcaminho do site.
    expect(voltarPara).toBe(`${window.location.origin}/entrar`)
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor).toMatchObject({ nome: 'Nova' })
    expect(conta.ok && conta.valor && conta.valor.fuso.length).toBeGreaterThan(0)
  })

  it('o volta válido vai no link de confirmação e no destino', async () => {
    const { roteador, dados } = renderizarComDados('/criar-conta?volta=%2Fapp%2Fhoje')
    const criarUsuario = vi.spyOn(dados, 'criarUsuario')
    await preencher()

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/hoje'))
    expect(criarUsuario.mock.calls[0][3]).toBe(`${window.location.origin}/entrar?volta=%2Fapp%2Fhoje`)
  })

  it('sem sessão devolvida (Confirm email ligado), avisa na região de status e não cria a conta', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()), { confirmarEmail: true })
    const criarConta = vi.spyOn(dados, 'criarMinhaConta')
    const { roteador } = renderizarComDados('/criar-conta', { dados })
    await preencher()

    await waitFor(() => expect(status().textContent).toBe(CRIAR_CONTA.confirmacao(EMAIL_NOVO)))
    // O e-mail da mensagem é uma palavra longa: a região de status quebra dentro dela.
    expect(status().classList.contains('wrap-anywhere')).toBe(true)
    expect(status().textContent).toBe(`Enviamos um link de confirmação para ${EMAIL_NOVO}. Abra o link para entrar.`)
    expect(criarConta).not.toHaveBeenCalled()
    expect(caminhoDe(roteador)).toBe('/criar-conta')

    // O link abre /entrar já com sessão: a conta está incompleta, e o passo "Seu nome" vem primeiro.
    await act(async () => {
      await dados.entrar(EMAIL_NOVO, 'senha-nova')
      await roteador.navigate('/entrar')
    })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(campo('Seu nome').value).toBe('Nova')
  })

  it('se a conta falhar depois do usuário, a pessoa vai ao "Seu nome" com o nome digitado, sem erro em /criar-conta', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'criarMinhaConta', 'rede')
    const { roteador } = renderizarComDados('/criar-conta', { dados })
    await preencher('Nova Pessoa')

    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(campo('Seu nome').value).toBe('Nova Pessoa')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('e-mail em uso: a frase do catálogo e os links Entrar e Recuperar acesso', async () => {
    renderizarComDados('/criar-conta')
    await preencher('Juliana', 'juliana@exemplo.invalid')

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.email_em_uso)
    expect(within(alerta).getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/entrar')
    expect(within(alerta).getByRole('link', { name: 'Recuperar acesso' }).getAttribute('href')).toBe('/recuperar-acesso')
  })

  it('senha fraca: o erro fica no campo, ligado por aria-describedby, e o foco vai a ele', async () => {
    renderizarComDados('/criar-conta')
    await preencher('Nova', EMAIL_NOVO, '123')

    await waitFor(() => expect(campo('Senha').getAttribute('aria-invalid')).toBe('true'))
    await waitFor(() => expect(document.activeElement).toBe(campo('Senha')))
    const ligado = campo('Senha').getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(ligado).toContain(TEXTOS_ERRO.senha_fraca)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('campo vazio dá erro no campo e não chama o banco', async () => {
    const { dados } = renderizarComDados('/criar-conta')
    const criarUsuario = vi.spyOn(dados, 'criarUsuario')
    await screen.findByRole('button', { name: 'Criar conta' })

    fireEvent.click(botao('Criar conta'))
    expect(screen.getByText('Escreva o seu nome.')).toBeTruthy()
    digitar('Seu nome', '   ')
    fireEvent.click(botao('Criar conta'))
    expect(screen.getByText('Escreva o seu nome.')).toBeTruthy()
    expect(document.activeElement).toBe(campo('Seu nome'))
    expect(criarUsuario).not.toHaveBeenCalled()
  })

  it('traz a ajuda de 6 caracteres e os links dos Termos e da Política', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    expect(screen.getByText('Pelo menos 6 caracteres.')).toBeTruthy()
    expect(screen.getByText('É o nome que a família vai ver.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Termos de uso' }).getAttribute('href')).toBe('/termos')
    expect(screen.getByRole('link', { name: 'Política de privacidade' }).getAttribute('href')).toBe('/privacidade')
    // Os dois links saem da frase (alvo de 44 px cada um): a frase termina em dois pontos.
    expect(screen.getByText(/^Ao criar a conta, você concorda com/).textContent).toBe('Ao criar a conta, você concorda com:')
  })

  it('o aviso do banco de demonstração só aparece no modo Supabase, e o da MAT-48a só no modo memória', async () => {
    const seletorDoBanco = '[data-aviso="banco-de-demonstracao"]'
    const seletorDaMemoria = '[data-aviso="demonstracao"]'

    const memoria = renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    expect(memoria.container.querySelectorAll(seletorDoBanco)).toHaveLength(0)
    expect(memoria.container.querySelectorAll(seletorDaMemoria)).toHaveLength(1)
    memoria.unmount()

    // Nada chama a rede: a memória é injetada pelo ProvedorDadosConta.
    const fetchProibido = vi.fn(() => {
      throw new Error('o teste chamou a rede')
    })
    vi.stubGlobal('fetch', fetchProibido)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')

    const banco = renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    const aviso = banco.container.querySelector(seletorDoBanco)!
    expect(aviso.tagName).toBe('P')
    expect(aviso.textContent).toBe(AVISO_BANCO_DEMONSTRACAO)
    expect(aviso.hasAttribute('role')).toBe(false)
    expect(banco.container.querySelectorAll(seletorDaMemoria)).toHaveLength(0)
    expect(fetchProibido).not.toHaveBeenCalled()
  })
})

describe('/recuperar-acesso', () => {
  async function pedir(email: string) {
    await screen.findByRole('button', { name: 'Enviar link' })
    digitar('E-mail', email)
    fireEvent.click(botao('Enviar link'))
  }

  it('responde igual para e-mail existente ou não, e o link de volta não leva o volta', async () => {
    const { dados } = renderizarComDados('/recuperar-acesso?volta=%2Fapp%2Fhoje')
    await pedir('juliana@exemplo.invalid')
    await waitFor(() => expect(status().textContent).toBe(RECUPERAR.resultado))
    const primeira = status().textContent

    digitar('E-mail', 'ninguem@exemplo.invalid')
    fireEvent.click(botao('Enviar link'))
    await waitFor(() => expect(dados.ultimoPedidoDeRecuperacao('ninguem@exemplo.invalid')).toBeDefined())
    expect(status().textContent).toBe(primeira)
    expect(dados.ultimoPedidoDeRecuperacao('juliana@exemplo.invalid')).toBe(`${window.location.origin}/redefinir-senha`)
  })

  it('um erro de negócio qualquer dá a mesma mensagem, que não revela a conta', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'pedirRecuperacao', 'email_em_uso')
    renderizarComDados('/recuperar-acesso', { dados })
    await pedir('juliana@exemplo.invalid')

    await waitFor(() => expect(status().textContent).toBe(RECUPERAR.resultado))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rede, tente de novo e desconhecido pedem "Tentar de novo", que repete o envio', async () => {
    for (const chave of ['rede', 'tente_de_novo', 'desconhecido'] as const) {
      const dados = novaMemoria()
      simularFalha(dados, 'pedirRecuperacao', chave)
      const { unmount } = renderizarComDados('/recuperar-acesso', { dados })
      await pedir('juliana@exemplo.invalid')

      const alerta = await screen.findByRole('alert')
      expect(alerta.textContent).toContain(TEXTOS_ERRO[chave])
      await waitFor(() => expect(document.activeElement).toBe(alerta))
      fireEvent.click(botao('Tentar de novo'))
      await waitFor(() => expect(status().textContent).toBe(RECUPERAR.resultado))
      expect(screen.queryByRole('alert')).toBeNull()
      unmount()
    }
  })

  it('muitas tentativas: a frase no topo do formulário, sem "Tentar de novo"', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'pedirRecuperacao', 'muitas_tentativas')
    renderizarComDados('/recuperar-acesso', { dados })
    await pedir('juliana@exemplo.invalid')

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.muitas_tentativas)
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
    expect(status().textContent).toBe('')
  })

  it('e-mail inválido: o erro fica no campo', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'pedirRecuperacao', 'email_invalido')
    renderizarComDados('/recuperar-acesso', { dados })
    await pedir('xis')

    await waitFor(() => expect(campo('E-mail').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.email_invalido)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campo('E-mail')))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('campo vazio dá erro no campo, sem chamar o banco', async () => {
    const { dados } = renderizarComDados('/recuperar-acesso')
    const pedirRecuperacao = vi.spyOn(dados, 'pedirRecuperacao')
    await screen.findByRole('button', { name: 'Enviar link' })

    fireEvent.click(botao('Enviar link'))
    expect(screen.getByText('Escreva o seu e-mail.')).toBeTruthy()
    expect(document.activeElement).toBe(campo('E-mail'))
    expect(pedirRecuperacao).not.toHaveBeenCalled()
  })
})

describe('/redefinir-senha', () => {
  const comMarca = (id: string = JULIANA.id) => sessionStorage.setItem(CHAVE_RECUPERACAO, id)

  async function trocar(nova: string, repetida = nova) {
    await screen.findByLabelText('Nova senha')
    digitar('Nova senha', nova)
    digitar('Repetir a senha', repetida)
    fireEvent.click(botao('Salvar senha'))
  }

  it('com a marca de recuperação (também depois de recarregar), mostra o formulário', async () => {
    comMarca()
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })

    await screen.findByLabelText('Nova senha')
    expect(campo('Repetir a senha')).toBeTruthy()
    expect(botao('Salvar senha')).toBeTruthy()
    expect(screen.getByText('Pelo menos 6 caracteres.')).toBeTruthy()
  })

  it('o evento de recuperação grava a marca com o id do usuário e abre o formulário', async () => {
    const { dados } = renderizarComDados('/redefinir-senha')
    await screen.findByText(TEXTOS_ERRO.link_vencido)

    await act(async () => {
      dados.abrirLinkDeRecuperacao('juliana@exemplo.invalid')
    })
    await screen.findByLabelText('Nova senha')
    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBe(JULIANA.id)
  })

  it('sem a marca, mostra o link vencido, sem formulário, e o link para pedir outro', async () => {
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
    expect(screen.getByRole('link', { name: 'Pedir outro link' }).getAttribute('href')).toBe('/recuperar-acesso')
  })

  it('sem sessão nenhuma, também é link vencido', async () => {
    comMarca()
    renderizarComDados('/redefinir-senha')

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
  })

  it('a marca de outro usuário é apagada, e a tela mostra o link vencido', async () => {
    comMarca(PESSOAS.bruno.id)
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    await waitFor(() => expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull())
  })

  it('o evento "entrou" de outro usuário nesta aba apaga a marca', async () => {
    comMarca()
    const { dados } = renderizarComDados('/redefinir-senha')
    await screen.findByText(TEXTOS_ERRO.link_vencido)

    await act(async () => {
      await dados.entrar('bruno@exemplo.invalid', SENHA_DEMONSTRACAO)
    })
    await waitFor(() => expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull())
  })

  it('error_code=otp_expired na URL mostra o link vencido, mesmo com a marca', async () => {
    comMarca()
    renderizarComDados('/redefinir-senha#error=access_denied&error_code=otp_expired&error_description=expirou', { sessao: 'juliana' })

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
  })

  it('enquanto a sessão carrega, mostra o estado carregando', async () => {
    const dados = novaMemoria()
    const lida = pendente<Resultado<Usuario | null>>()
    vi.spyOn(dados, 'sessaoAtual').mockReturnValue(lida.promessa)
    const { container } = renderizarComDados('/redefinir-senha', { dados })

    expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect(screen.queryByText(TEXTOS_ERRO.link_vencido)).toBeNull()
    lida.liberar({ ok: true, valor: null })
    await screen.findByText(TEXTOS_ERRO.link_vencido)
  })

  it('as duas senhas precisam ser iguais: o erro fica no campo e o banco não é chamado', async () => {
    comMarca()
    const { dados } = renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    const trocarSenha = vi.spyOn(dados, 'trocarSenha')
    await trocar('senha-nova', 'outra-senha')

    expect(screen.getByText('As duas senhas precisam ser iguais.')).toBeTruthy()
    expect(campo('Repetir a senha').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('Repetir a senha'))
    expect(trocarSenha).not.toHaveBeenCalled()

    digitar('Nova senha', '')
    digitar('Repetir a senha', '')
    fireEvent.click(botao('Salvar senha'))
    expect(screen.getByText('Escreva a sua senha.')).toBeTruthy()
    expect(screen.getByText('Repita a senha.')).toBeTruthy()
    expect(trocarSenha).not.toHaveBeenCalled()
  })

  it('a nova senha igual à atual: o erro fica no campo', async () => {
    comMarca()
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    await trocar(SENHA_DEMONSTRACAO)

    await waitFor(() => expect(campo('Nova senha').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.senha_igual)).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(campo('Nova senha')))
  })

  it('sucesso: salva, apaga a marca e vai a /app/conta com a mensagem "Senha trocada."', async () => {
    comMarca()
    const { roteador, dados } = renderizarComDados('/redefinir-senha?volta=%2Fapp%2Fhoje', { sessao: 'juliana' })
    await trocar('senha-nova')

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(status().textContent).toBe('Senha trocada.')
    expect(roteador.state.location.search).toBe('')
    await waitFor(() => expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull())
    expect((await dados.entrar(JULIANA.email, 'senha-nova')).ok).toBe(true)
  })

  it('depois de concluir, ir a /app/hoje (fora do provedor) e voltar mostra o link vencido, sem o formulário', async () => {
    const { roteador, dados } = renderizarComDados('/redefinir-senha')
    await screen.findByText(TEXTOS_ERRO.link_vencido)
    await act(async () => {
      dados.abrirLinkDeRecuperacao(JULIANA.email)
    })
    await trocar('senha-nova')
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull())

    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await act(async () => {
      await roteador.navigate('/redefinir-senha')
    })

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
  })

  it('com a conta incompleta, a guarda leva ao "Seu nome" e repassa a mensagem', async () => {
    const dados = await memoriaComContaIncompleta()
    const id = (await dados.sessaoAtual())
    comMarca(id.ok && id.valor ? id.valor.id : '')
    const { roteador } = renderizarComDados('/redefinir-senha', { dados })
    await trocar('outra-senha')

    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    expect(caminhoDe(roteador)).toBe('/app/comecar')
    expect(status().textContent).toBe('Senha trocada.')
  })
})

describe('/conta-excluida', () => {
  it('é estática: a frase e os links Início e Criar conta', async () => {
    const { dados } = renderizarComDados('/conta-excluida')
    const chamada = vi.spyOn(dados, 'minhaConta')

    expect(await screen.findByText('Sua conta foi excluída.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Início' }).getAttribute('href')).toBe('/')
    expect(principal().getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/criar-conta')
    expect(chamada).not.toHaveBeenCalled()
  })
})

describe('sair (RF-11)', () => {
  it('o botão Sair do cabeçalho encerra a sessão e leva a /entrar com "Você saiu da conta."', async () => {
    const { roteador, dados } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    const cabecalho = within(screen.getByRole('navigation', { name: 'Conta' }))
    fireEvent.click(cabecalho.getByRole('button', { name: 'Sair' }))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(caminhoDe(roteador)).toBe('/entrar')
    expect(roteador.state.location.search).toBe('')
    expect(status().textContent).toBe('Você saiu da conta.')
    expect(await dados.sessaoAtual()).toEqual({ ok: true, valor: null })
  })

  it('depois de sair, abrir uma rota logada leva a /entrar, sem repetir a mensagem de saída', async () => {
    const { roteador } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })

    await act(async () => {
      await roteador.navigate('/app/conta')
    })
    await waitFor(() => expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta'))
    expect(status().textContent).toBe('')
  })

  it('a saída limpa a marca de recuperação e deixa a família atual e o convite', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, JULIANA.id)
    sessionStorage.setItem(CHAVE_CONVITE, 'a'.repeat(64))
    localStorage.setItem(CHAVE_FAMILIA_ATUAL, 'f1111111-1111-4111-8111-111111111111')
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })

    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull()
    expect(sessionStorage.getItem(CHAVE_CONVITE)).toBe('a'.repeat(64))
    expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBe('f1111111-1111-4111-8111-111111111111')
    apagarChave('sessao', CHAVE_CONVITE)
  })

  it('se a saída falhar, a pessoa continua entrada: a frase num alerta abaixo do cabeçalho, com o foco, e "Tentar de novo"', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'sair', 'rede')
    const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(caminhoDe(roteador)).toBe('/app/conta')
    expect(screen.getByRole('heading', { level: 1, name: 'Conta' })).toBeTruthy()

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(status().textContent).toBe('Você saiu da conta.')
  })
})

describe('a saída que a pessoa não pediu (RF-11)', () => {
  const frase = 'Sua sessão terminou. Entre de novo.'

  /** A aba volta a ficar visível (o jsdom pode dizer "prerender"). */
  async function voltarAAba() {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    try {
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
    } finally {
      Reflect.deleteProperty(document, 'visibilityState')
    }
  }

  it('o evento "saiu" sem pedido leva a /entrar?volta=<rota atual> com a mensagem', async () => {
    const { roteador, dados } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    await act(async () => {
      dados.encerrarSessaoPorFora()
    })
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(caminhoDe(roteador)).toBe('/entrar')
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(status().textContent).toBe(frase)
  })

  it('sessao_encerrada em qualquer operação leva ao mesmo lugar', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'minhasFamilias', 'sessao_encerrada')
    const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'juliana' })

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(status().textContent).toBe(frase)
  })

  it('a leitura da sessão que volta com sessao_encerrada (sessão vencida) leva a /entrar com a mensagem', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'sessaoAtual', 'sessao_encerrada')
    const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'juliana' })

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(caminhoDe(roteador)).toBe('/entrar')
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(status().textContent).toBe(frase)
  })

  it('a leitura da conta que volta com sessao_encerrada, depois de a sessão ser lida, leva a /entrar com a mensagem', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'minhaConta', 'sessao_encerrada')
    const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'juliana' })

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(status().textContent).toBe(frase)
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
  })

  it('a sessão que vence entre uma operação e outra (salvar o perfil) leva a /entrar com a mensagem', async () => {
    const dados = novaMemoria()
    const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    simularFalha(dados, 'atualizarMinhaConta', 'sessao_encerrada')
    digitar('Seu nome', 'Juliana Souza')
    fireEvent.click(botao('Salvar'))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(status().textContent).toBe(frase)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a sessão que vence entre a leitura da sessão e a da conta, no passo "Seu nome", leva a /entrar', async () => {
    const dados = await memoriaComContaIncompleta()
    const { roteador } = renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    simularFalha(dados, 'criarMinhaConta', 'sessao_encerrada')
    fireEvent.click(botao('Salvar'))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fcomecar')
    expect(status().textContent).toBe(frase)
  })

  it('em /entrar, a leitura da sessão que volta com sessao_encerrada mostra o formulário, sem erro solto', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'sessaoAtual', 'sessao_encerrada')
    renderizarComDados('/entrar', { dados })

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ao voltar a aba, sem sessão, a tela reconhece a saída feita noutra aba', async () => {
    const { roteador, dados } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    dados.sessaoParaTeste(null)
    await voltarAAba()
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(status().textContent).toBe(frase)
  })

  it('ao voltar a aba com a sessão de pé, nada acontece', async () => {
    const { roteador } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    await voltarAAba()
    expect(caminhoDe(roteador)).toBe('/app/conta')
  })
})
