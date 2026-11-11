import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { CONTA, NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import type { Resultado } from '../../dados/comum.ts'
import type { OperacaoConta } from '../../dados/conta.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { classificarErroConta, erroDaChave } from '../../dados/conta.erros.ts'
import {
  criarDadosContaMemoria,
  simularFalha,
  simularRespostaPerdida,
  type DadosContaMemoria,
} from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RF-17: os estados de tela (matriz da seção 4.7, linhas da 37a). Em modo memória, com
// `simularFalha` e `simularRespostaPerdida`. Cada bloco diz a célula da matriz que cobre.

const RETENTAVEIS = ['rede', 'tente_de_novo', 'desconhecido'] as const

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const caminhoDe = (roteador: { state: { location: { pathname: string } } }) => roteador.state.location.pathname

function pendente<T>() {
  let liberar!: (valor: T) => void
  const promessa = new Promise<T>((resolver) => {
    liberar = resolver
  })
  return { promessa, liberar }
}

/** Segura a próxima chamada da operação até `liberar`, e conta quantas vezes ela foi chamada. */
function segurar<T>(dados: DadosContaMemoria, operacao: OperacaoConta) {
  const espera = pendente<Resultado<T>>()
  const espiao = vi
    .spyOn(dados as unknown as Record<string, (...argumentos: unknown[]) => unknown>, operacao)
    .mockReturnValueOnce(espera.promessa)
  return { ...espera, espiao }
}

const falhaDeNegocio = <T,>(chave: Parameters<typeof erroDaChave>[0]): Resultado<T> => ({ ok: false, erro: erroDaChave(chave) })

async function memoriaSemConta() {
  const dados = novaMemoria()
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

function simularDownload() {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:ficticio') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
}

/** O botão "Tentar de novo" do alerta da tela. */
async function tentarDeNovo() {
  const alerta = await screen.findByRole('alert')
  fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
}

describe('carregando', () => {
  it('/entrar e /criar-conta (sessão): o main fica ocupado, com o texto, sem formulário', async () => {
    for (const caminho of ['/entrar', '/criar-conta']) {
      const dados = novaMemoria()
      const lida = segurar<null>(dados, 'sessaoAtual')
      const { container, unmount } = renderizarComDados(caminho, { dados })

      expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
      expect(screen.getByText('Carregando…')).toBeTruthy()
      expect(container.querySelector('form')).toBeNull()
      expect(container.querySelectorAll('input')).toHaveLength(0)

      lida.liberar({ ok: true, valor: null })
      await waitFor(() => expect(container.querySelector('form')).not.toBeNull())
      expect(container.querySelector('main')!.hasAttribute('aria-busy')).toBe(false)
      unmount()
    }
  })

  it('/app/comecar (conta): a guarda mostra o texto, sem formulário, até a conta chegar', async () => {
    const dados = await memoriaSemConta()
    const conta = segurar<null>(dados, 'minhaConta')
    const { container } = renderizarComDados('/app/comecar', { dados })

    expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect(container.querySelector('form')).toBeNull()

    conta.liberar({ ok: true, valor: null })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
  })

  it('/app/conta (conta e famílias): o texto da conta, depois o "Conferindo as suas famílias…"', async () => {
    const dados = novaMemoria()
    const conta = segurar<unknown>(dados, 'minhaConta')
    const { container } = renderizarComDados('/app/conta', { dados, sessao: 'davi' })

    expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('form')).toBeNull()
    conta.liberar({ ok: true, valor: { id: PESSOAS.davi.id, nome: 'Davi', fuso: 'UTC', email: 'davi@exemplo.invalid', criadaEm: new Date().toISOString() } })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
  })
})

describe('enviando: o botão desativa, troca o rótulo e um segundo envio não chama o banco', () => {
  it('/entrar: "Entrando…"', async () => {
    const dados = novaMemoria()
    const entrar = segurar<null>(dados, 'entrar')
    renderizarComDados('/entrar', { dados })
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', SENHA_DEMONSTRACAO)

    const formulario = botao('Entrar').closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect(botao('Entrando…').disabled).toBe(true))
    fireEvent.click(botao('Entrando…'))
    fireEvent.submit(formulario)
    expect(entrar.espiao).toHaveBeenCalledTimes(1)

    entrar.liberar(falhaDeNegocio('credenciais'))
    await waitFor(() => expect(botao('Entrar').disabled).toBe(false))
  })

  it('/criar-conta: "Criando conta…"', async () => {
    const dados = novaMemoria()
    const criar = segurar<null>(dados, 'criarUsuario')
    renderizarComDados('/criar-conta', { dados })
    await screen.findByRole('button', { name: 'Criar conta' })
    digitar('Seu nome', 'Nova')
    digitar('E-mail', 'nova@exemplo.invalid')
    digitar('Senha', 'senha-nova')

    const formulario = botao('Criar conta').closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect(botao('Criando conta…').disabled).toBe(true))
    fireEvent.submit(formulario)
    expect(criar.espiao).toHaveBeenCalledTimes(1)

    criar.liberar(falhaDeNegocio('email_em_uso'))
    await waitFor(() => expect(botao('Criar conta').disabled).toBe(false))
  })

  it('/recuperar-acesso: "Enviando…"', async () => {
    const dados = novaMemoria()
    const pedido = segurar<null>(dados, 'pedirRecuperacao')
    renderizarComDados('/recuperar-acesso', { dados })
    digitar('E-mail', 'juliana@exemplo.invalid')

    const formulario = botao('Enviar link').closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect(botao('Enviando…').disabled).toBe(true))
    fireEvent.submit(formulario)
    expect(pedido.espiao).toHaveBeenCalledTimes(1)

    pedido.liberar({ ok: true, valor: null })
    await waitFor(() => expect(botao('Enviar link').disabled).toBe(false))
  })

  it('/redefinir-senha: "Salvando…"', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    const dados = novaMemoria()
    const troca = segurar<null>(dados, 'trocarSenha')
    renderizarComDados('/redefinir-senha', { dados, sessao: 'juliana' })
    await screen.findByLabelText('Nova senha')
    digitar('Nova senha', 'senha-nova')
    digitar('Repetir a senha', 'senha-nova')

    const formulario = botao('Salvar senha').closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect(botao('Salvando…').disabled).toBe(true))
    fireEvent.submit(formulario)
    expect(troca.espiao).toHaveBeenCalledTimes(1)

    troca.liberar(falhaDeNegocio('senha_fraca'))
    await waitFor(() => expect(botao('Salvar senha').disabled).toBe(false))
  })

  it('/app/comecar: "Salvando…"', async () => {
    const dados = await memoriaSemConta()
    const conta = segurar<null>(dados, 'criarMinhaConta')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    const formulario = botao('Salvar').closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect(botao('Salvando…').disabled).toBe(true))
    fireEvent.submit(formulario)
    expect(conta.espiao).toHaveBeenCalledTimes(1)

    conta.liberar(falhaDeNegocio('fuso_invalido'))
    await waitFor(() => expect(botao('Salvar').disabled).toBe(false))
  })

  it('/app/conta: salvar o perfil ("Salvando…")', async () => {
    const dados = novaMemoria()
    const atualizar = segurar<null>(dados, 'atualizarMinhaConta')
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    const formulario = botao('Salvar').closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect(botao('Salvando…').disabled).toBe(true))
    fireEvent.submit(formulario)
    expect(atualizar.espiao).toHaveBeenCalledTimes(1)

    atualizar.liberar(falhaDeNegocio('fuso_invalido'))
    await waitFor(() => expect(botao('Salvar').disabled).toBe(false))
  })

  it('/app/conta: baixar os dados ("Preparando o arquivo…")', async () => {
    const dados = novaMemoria()
    const exportar = segurar<null>(dados, 'exportarDados')
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    fireEvent.click(botao('Baixar meus dados'))
    await waitFor(() => expect(botao('Preparando o arquivo…').disabled).toBe(true))
    fireEvent.click(botao('Preparando o arquivo…'))
    expect(exportar.espiao).toHaveBeenCalledTimes(1)

    exportar.liberar(falhaDeNegocio('desconhecido'))
    await waitFor(() => expect(botao('Baixar meus dados').disabled).toBe(false))
  })

  it('/app/conta: excluir a conta ("Excluindo…")', async () => {
    const dados = novaMemoria()
    const excluir = segurar<null>(dados, 'excluirConta')
    renderizarComDados('/app/conta', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(botao('Excluir minha conta').disabled).toBe(false))
    fireEvent.click(botao('Excluir minha conta'))

    const dialogo = within(screen.getByRole('dialog'))
    fireEvent.change(dialogo.getByLabelText('Senha atual', { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    const formulario = dialogo.getByRole('button', { name: 'Excluir conta' }).closest('form')!
    fireEvent.submit(formulario)
    await waitFor(() => expect((dialogo.getByRole('button', { name: 'Excluindo…' }) as HTMLButtonElement).disabled).toBe(true))
    expect((dialogo.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(formulario)
    expect(excluir.espiao).toHaveBeenCalledTimes(1)

    excluir.liberar(falhaDeNegocio('ultimo_responsavel'))
    await waitFor(() => expect((dialogo.getByRole('button', { name: 'Excluir conta' }) as HTMLButtonElement).disabled).toBe(false))
  })
})

describe('rede, "tente de novo" e desconhecido: a frase e "Tentar de novo", que repete a chamada', () => {
  for (const chave of RETENTAVEIS) {
    it(`/entrar (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'entrar', chave)
      const { roteador } = renderizarComDados('/entrar', { dados })
      await screen.findByRole('button', { name: 'Entrar' })
      digitar('E-mail', 'juliana@exemplo.invalid')
      digitar('Senha', SENHA_DEMONSTRACAO)
      fireEvent.click(botao('Entrar'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    })

    it(`/criar-conta, criar usuário (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'criarUsuario', chave)
      const { roteador } = renderizarComDados('/criar-conta', { dados })
      await screen.findByRole('button', { name: 'Criar conta' })
      digitar('Seu nome', 'Nova')
      digitar('E-mail', 'nova@exemplo.invalid')
      digitar('Senha', 'senha-nova')
      fireEvent.click(botao('Criar conta'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    })

    it(`/redefinir-senha, salvar (${chave})`, async () => {
      sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
      const dados = novaMemoria()
      simularFalha(dados, 'trocarSenha', chave)
      const { roteador } = renderizarComDados('/redefinir-senha', { dados, sessao: 'juliana' })
      await screen.findByLabelText('Nova senha')
      digitar('Nova senha', 'senha-nova')
      digitar('Repetir a senha', 'senha-nova')
      fireEvent.click(botao('Salvar senha'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Senha trocada.'))
    })

    it(`/app/comecar, salvar (${chave})`, async () => {
      const dados = await memoriaSemConta()
      simularFalha(dados, 'criarMinhaConta', chave)
      const { roteador } = renderizarComDados('/app/comecar', { dados })
      await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
      fireEvent.click(botao('Salvar'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    })

    it(`/app/conta, salvar o perfil (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'atualizarMinhaConta', chave)
      renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
      digitar('Seu nome', 'Juliana Souza')
      fireEvent.click(botao('Salvar'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe(CONTA.perfil.sucesso))
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it(`/app/conta, baixar os dados (${chave})`, async () => {
      simularDownload()
      const dados = novaMemoria()
      simularFalha(dados, 'exportarDados', chave)
      renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
      fireEvent.click(botao('Baixar meus dados'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe(CONTA.exportar.sucesso))
    })
  }
})

describe('um erro que o catálogo não conhece: a frase de "desconhecido", sem a mensagem do banco', () => {
  // Um código do Postgres fora do catálogo, com uma mensagem que não pode chegar à tela.
  const origem = { code: 'XX999', message: 'relation "contas_privadas" does not exist' }
  const novoErro = () => classificarErroConta(origem)

  async function conferirDesconhecido() {
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.desconhecido)
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('contas_privadas')
    expect(document.body.textContent).not.toContain('XX999')
    // O foco vai ao alerta e a região de status continua vazia.
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(screen.getByRole('status').textContent).toBe('')
  }

  it('o classificador devolve a chave e a classe desconhecido, com a mensagem só no campo interno', () => {
    expect(novoErro()).toMatchObject({ classe: 'desconhecido', chave: 'desconhecido', codigo: 'XX999' })
  })

  it('/entrar', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'entrar', novoErro())
    renderizarComDados('/entrar', { dados })
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', SENHA_DEMONSTRACAO)
    fireEvent.click(botao('Entrar'))

    await conferirDesconhecido()
  })

  it('/criar-conta', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'criarUsuario', novoErro())
    renderizarComDados('/criar-conta', { dados })
    await screen.findByRole('button', { name: 'Criar conta' })
    digitar('Seu nome', 'Nova')
    digitar('E-mail', 'nova@exemplo.invalid')
    digitar('Senha', 'senha-nova')
    fireEvent.click(botao('Criar conta'))

    await conferirDesconhecido()
  })

  it('/recuperar-acesso', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'pedirRecuperacao', novoErro())
    renderizarComDados('/recuperar-acesso', { dados })
    await screen.findByRole('button', { name: 'Enviar link' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    fireEvent.click(botao('Enviar link'))

    await conferirDesconhecido()
  })

  it('/app/comecar', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', novoErro())
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    fireEvent.click(botao('Salvar'))

    await conferirDesconhecido()
  })

  it('/app/conta', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'atualizarMinhaConta', novoErro())
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    digitar('Seu nome', 'Juliana Souza')
    fireEvent.click(botao('Salvar'))

    await conferirDesconhecido()
  })
})

describe('rede numa escrita: a tela relê e confere o efeito pedido, e não deduz o sucesso pelo código do erro', () => {
  it('criar a própria conta: depois da resposta perdida, a repetição devolve 23505 e a conferência mostra a conta (sucesso)', async () => {
    const dados = await memoriaSemConta()
    simularRespostaPerdida(dados, 'criarMinhaConta')
    const criar = vi.spyOn(dados, 'criarMinhaConta')
    const { roteador } = renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    fireEvent.click(botao('Salvar'))

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.rede)
    await tentarDeNovo()

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    expect(criar).toHaveBeenCalledTimes(2)
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor).toMatchObject({ nome: 'Nova' })
  })

  it('salvar o perfil: a repetição falha, mas a conferência traz o nome e o fuso pedidos: sucesso', async () => {
    const dados = novaMemoria()
    simularRespostaPerdida(dados, 'atualizarMinhaConta')
    simularFalha(dados, 'atualizarMinhaConta', 'desconhecido')
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    digitar('Seu nome', 'Juliana Souza')

    // A fila de falhas vem antes: a primeira chamada falha sem gravar (desconhecido). A repetição
    // grava, mas a resposta se perde (rede); a conferência acha o nome pedido: sucesso.
    fireEvent.click(botao('Salvar'))
    await screen.findByRole('alert')
    await tentarDeNovo()

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Dados salvos.'))
    expect(screen.queryByRole('alert')).toBeNull()
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor?.nome).toBe('Juliana Souza')
  })

  it('salvar o perfil: a conferência falsa mostra o erro da repetição', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'atualizarMinhaConta', 'rede')
    simularFalha(dados, 'atualizarMinhaConta', 'desconhecido')
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    digitar('Seu nome', 'Juliana Souza')
    fireEvent.click(botao('Salvar'))

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.rede)
    await tentarDeNovo()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO.desconhecido))
    expect(screen.getByRole('status').textContent).toBe('')
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor?.nome).toBe('Juliana')
  })

  it('salvar o perfil: se a própria conferência falhar, a frase dela vem com "Tentar de novo", que repete a conferência, não a escrita', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'atualizarMinhaConta', 'rede')
    simularFalha(dados, 'atualizarMinhaConta', 'desconhecido')
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    // A falha da conferência entra depois que a tela leu a conta pela primeira vez.
    simularFalha(dados, 'minhaConta', 'tente_de_novo')
    const atualizar = vi.spyOn(dados, 'atualizarMinhaConta')
    digitar('Seu nome', 'Juliana Souza')
    fireEvent.click(botao('Salvar'))

    await screen.findByRole('alert')
    await tentarDeNovo()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO.tente_de_novo))
    expect(atualizar).toHaveBeenCalledTimes(2)

    // Repete só a conferência: a conta ainda está com o nome antigo, então o erro da repetição volta.
    await tentarDeNovo()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO.desconhecido))
    expect(atualizar).toHaveBeenCalledTimes(2)
  })

  it('trocar a senha: depois da resposta perdida, a repetição devolve senha_igual, que vale como sucesso', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    const dados = novaMemoria()
    simularRespostaPerdida(dados, 'trocarSenha')
    const { roteador } = renderizarComDados('/redefinir-senha', { dados, sessao: 'juliana' })
    await screen.findByLabelText('Nova senha')
    digitar('Nova senha', 'senha-nova')
    digitar('Repetir a senha', 'senha-nova')
    fireEvent.click(botao('Salvar senha'))

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.rede)
    await tentarDeNovo()

    await waitFor(() => expect(caminhoDe(roteador)).toBe('/app/conta'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Senha trocada.'))
    expect((await dados.entrar('juliana@exemplo.invalid', 'senha-nova')).ok).toBe(true)
  })

  it('trocar a senha: um senha_igual na primeira tentativa (sem resposta perdida) continua sendo erro', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    const { roteador } = renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    await screen.findByLabelText('Nova senha')
    digitar('Nova senha', SENHA_DEMONSTRACAO)
    digitar('Repetir a senha', SENHA_DEMONSTRACAO)
    fireEvent.click(botao('Salvar senha'))

    await waitFor(() => expect(screen.getByText(TEXTOS_ERRO.senha_igual)).toBeTruthy())
    expect(caminhoDe(roteador)).toBe('/redefinir-senha')
  })

  it('excluir a conta: depois da resposta perdida, "Tentar de novo" repete só a exclusão, e sessao_encerrada vale como sucesso', async () => {
    const dados = novaMemoria()
    simularRespostaPerdida(dados, 'excluirConta')
    const entrar = vi.spyOn(dados, 'entrar')
    const excluir = vi.spyOn(dados, 'excluirConta')
    const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(botao('Excluir minha conta').disabled).toBe(false))
    fireEvent.click(botao('Excluir minha conta'))

    const dialogo = within(screen.getByRole('dialog'))
    fireEvent.change(dialogo.getByLabelText('Senha atual', { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    fireEvent.click(dialogo.getByRole('button', { name: 'Excluir conta' }))

    const alerta = await dialogo.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.contaExcluida })
    expect(caminhoDe(roteador)).toBe('/conta-excluida')
    expect(excluir).toHaveBeenCalledTimes(2)
    // A senha não é pedida nem conferida de novo.
    expect(entrar).toHaveBeenCalledTimes(1)
  })

  it('excluir a conta: um erro da repetição que não prova o sucesso (ultimo_responsavel) é mostrado', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'excluirConta', 'rede')
    simularFalha(dados, 'excluirConta', 'ultimo_responsavel')
    renderizarComDados('/app/conta', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(botao('Excluir minha conta').disabled).toBe(false))
    fireEvent.click(botao('Excluir minha conta'))

    const dialogo = within(screen.getByRole('dialog'))
    fireEvent.change(dialogo.getByLabelText('Senha atual', { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    fireEvent.click(dialogo.getByRole('button', { name: 'Excluir conta' }))
    const alerta = await dialogo.findByRole('alert')
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => expect(dialogo.getByRole('alert').textContent).toContain(TEXTOS_ERRO.ultimo_responsavel))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('sucesso: a região de status é única, não move o foco e só some na próxima ação', () => {
  it('cada tela tem uma só região de status', async () => {
    const casos: Array<[string, 'juliana' | null]> = [
      ['/entrar', null],
      ['/criar-conta', null],
      ['/recuperar-acesso', null],
      ['/app/conta', 'juliana'],
    ]
    for (const [caminho, sessao] of casos) {
      const { unmount } = renderizarComDados(caminho, { sessao })
      await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(screen.queryByText('Carregando…')).toBeNull())
      expect(screen.getAllByRole('status'), caminho).toHaveLength(1)
      unmount()
    }
  })

  it('/app/conta: "Dados salvos." fica na região, sem mover o foco, até a próxima ação', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    digitar('Seu nome', 'Juliana Souza')
    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Dados salvos.'))
    expect(screen.getByRole('status').contains(document.activeElement)).toBe(false)
    expect(screen.getAllByRole('status')).toHaveLength(1)

    // Fica enquanto nada acontece...
    await new Promise((resolver) => setTimeout(resolver, 30))
    expect(screen.getByRole('status').textContent).toBe('Dados salvos.')

    // ...e some quando a pessoa faz outra coisa.
    fireEvent.click(botao('Copiar id'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Copie manualmente.'))
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('/recuperar-acesso: a mensagem igual é o status, e um novo envio a troca', async () => {
    const dados = novaMemoria()
    renderizarComDados('/recuperar-acesso', { dados })
    digitar('E-mail', 'juliana@exemplo.invalid')
    fireEvent.click(botao('Enviar link'))
    await waitFor(() => expect(screen.getByRole('status').textContent).not.toBe(''))
    expect(screen.getByRole('status').contains(document.activeElement)).toBe(false)

    simularFalha(dados, 'pedirRecuperacao', 'muitas_tentativas')
    fireEvent.click(botao('Enviar link'))
    await screen.findByRole('alert')
    expect(screen.getByRole('status').textContent).toBe('')
  })
})

describe('erro do banco: a frase da linha do catálogo, no campo ou no topo', () => {
  it('/entrar: credenciais no topo do formulário', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'entrar', 'credenciais')
    renderizarComDados('/entrar', { dados })
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', 'qualquer')
    fireEvent.click(botao('Entrar'))

    expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.credenciais)
  })

  it('/criar-conta: email_em_uso no topo e senha_fraca no campo', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'criarUsuario', 'email_em_uso')
    simularFalha(dados, 'criarUsuario', 'senha_fraca')
    renderizarComDados('/criar-conta', { dados })
    await screen.findByRole('button', { name: 'Criar conta' })
    digitar('Seu nome', 'Nova')
    digitar('E-mail', 'nova@exemplo.invalid')
    digitar('Senha', 'senha-nova')
    fireEvent.click(botao('Criar conta'))
    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.email_em_uso)

    fireEvent.click(botao('Criar conta'))
    await waitFor(() => expect(campo('Senha').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.senha_fraca)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('/redefinir-senha: senha_igual no campo; link_vencido e marca de outro usuário sem formulário', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    const dados = novaMemoria()
    simularFalha(dados, 'trocarSenha', 'senha_igual')
    const primeira = renderizarComDados('/redefinir-senha', { dados, sessao: 'juliana' })
    await screen.findByLabelText('Nova senha')
    digitar('Nova senha', 'senha-nova')
    digitar('Repetir a senha', 'senha-nova')
    fireEvent.click(botao('Salvar senha'))
    await waitFor(() => expect(screen.getByText(TEXTOS_ERRO.senha_igual)).toBeTruthy())
    primeira.unmount()

    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.bruno.id)
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
  })

  it('/redefinir-senha: carregando (sessão)', async () => {
    const dados = novaMemoria()
    const lida = segurar<unknown>(dados, 'sessaoAtual')
    const { container } = renderizarComDados('/redefinir-senha', { dados })

    expect(container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('form')).toBeNull()
    lida.liberar({ ok: true, valor: null })
    await screen.findByText(TEXTOS_ERRO.link_vencido)
  })

  it('/app/comecar: nome_vazio no campo do nome e fuso_invalido no campo do fuso', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', 'nome_vazio')
    simularFalha(dados, 'criarMinhaConta', 'fuso_invalido')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(screen.getByText(TEXTOS_ERRO.nome_vazio)).toBeTruthy())
    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(screen.getByText(TEXTOS_ERRO.fuso_invalido)).toBeTruthy())
  })

  it('/app/conta: nome_vazio no campo, credenciais e ultimo_responsavel na caixa', async () => {
    const dados = novaMemoria()
    simularFalha(dados, 'atualizarMinhaConta', 'nome_vazio')
    renderizarComDados('/app/conta', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    fireEvent.click(botao('Salvar'))
    await waitFor(() => expect(screen.getByText(TEXTOS_ERRO.nome_vazio)).toBeTruthy())

    await waitFor(() => expect(botao('Excluir minha conta').disabled).toBe(false))
    fireEvent.click(botao('Excluir minha conta'))
    const dialogo = within(screen.getByRole('dialog'))
    fireEvent.change(dialogo.getByLabelText('Senha atual', { selector: 'input' }), { target: { value: 'errada' } })
    fireEvent.click(dialogo.getByRole('button', { name: 'Excluir conta' }))
    await waitFor(() => expect(dialogo.getByText(TEXTOS_ERRO.credenciais)).toBeTruthy())

    simularFalha(dados, 'excluirConta', 'ultimo_responsavel')
    fireEvent.change(dialogo.getByLabelText('Senha atual', { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    fireEvent.click(dialogo.getByRole('button', { name: 'Excluir conta' }))
    expect((await dialogo.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.ultimo_responsavel)
  })
})

describe('rede, "tente de novo" e desconhecido nas leituras e na saída', () => {
  for (const chave of RETENTAVEIS) {
    it(`/recuperar-acesso, enviar (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'pedirRecuperacao', chave)
      renderizarComDados('/recuperar-acesso', { dados })
      digitar('E-mail', 'juliana@exemplo.invalid')
      fireEvent.click(botao('Enviar link'))

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      await tentarDeNovo()
      await waitFor(() => expect(screen.getByRole('status').textContent).not.toBe(''))
    })

    it(`/app/comecar, ler a sessão e a conta (${chave})`, async () => {
      const dados = await memoriaSemConta()
      simularFalha(dados, 'sessaoAtual', chave)
      renderizarComDados('/app/comecar', { dados })
      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      simularFalha(dados, 'minhaConta', chave)
      fireEvent.click(botao('Tentar de novo'))
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO[chave]))
      fireEvent.click(botao('Tentar de novo'))
      await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    })

    it(`/app/conta, ler a conta (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'minhaConta', chave)
      renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      fireEvent.click(botao('Tentar de novo'))
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
    })

    it(`/app/conta, ler os impedimentos (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'minhasFamilias', chave)
      renderizarComDados('/app/conta', { dados, sessao: 'davi' })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      expect(botao('Excluir minha conta').disabled).toBe(true)
      await tentarDeNovo()
      await waitFor(() => expect(botao('Excluir minha conta').disabled).toBe(false))
    })

    it(`/app/conta, sair (${chave})`, async () => {
      const dados = novaMemoria()
      simularFalha(dados, 'sair', chave)
      const { roteador } = renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
      fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])

      expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO[chave])
      expect(caminhoDe(roteador)).toBe('/app/conta')
      await tentarDeNovo()
      await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    })
  }
})

describe('criar a própria conta: conferência falsa', () => {
  it('se a conta não existe depois da repetição que falhou, a tela mostra o erro da repetição', async () => {
    const dados = await memoriaSemConta()
    simularFalha(dados, 'criarMinhaConta', 'rede')
    simularFalha(dados, 'criarMinhaConta', 'desconhecido')
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    fireEvent.click(botao('Salvar'))

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.rede)
    await tentarDeNovo()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO.desconhecido))
    const conta = await dados.minhaConta()
    expect(conta.ok && conta.valor).toBeNull()
  })
})
