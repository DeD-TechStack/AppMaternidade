import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarEstadoInicial, type EstadoPrototipo } from '../../prototipo/estado.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RN-03: axe-core nas rotas desta tarefa, nos dois temas, com sessão de responsável e de cuidador
// nas logadas e com a caixa de diálogo aberta; rótulos e erros ligados aos campos; foco no erro;
// foco e rolagem ao trocar de tela; e a garantia de que nada aqui chama a rede (RN-01).

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })
const temas: Array<[string, () => EstadoPrototipo]> = [
  ['claro', claro],
  ['madrugada', madrugada],
]

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, {
    // O jsdom não calcula cores nem layout; o contraste é conferido em estilo.test.ts.
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 200)).join(' | ')})`)
}

const CLASSE_DE_ALVO = /(^|\s)(alvo-toque|botao|nav-item)(\s|$)/

/**
 * Links e controles fora de parágrafo sem a classe que garante 44 × 44 px (como em layout.test.tsx).
 * Só as telas: o cabeçalho e o rodapé da casca têm os alvos deles (conferidos em layout.test.tsx).
 */
function semAlvoDe44(container: HTMLElement): string[] {
  const telas = [...container.querySelectorAll<HTMLElement>('main, nav[aria-label="Conta"]')]
  return telas
    .flatMap((tela) => [...tela.querySelectorAll<HTMLElement>('a, button, input, select, textarea')])
    .filter((elemento) => elemento.closest('p, [inert]') === null)
    .filter((elemento) => !CLASSE_DE_ALVO.test(elemento.className))
    .map((elemento) => elemento.outerHTML.slice(0, 160))
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const esperarCarregar = () => waitFor(() => expect(screen.queryByText(/Carregando…|Conferindo as suas famílias…/)).toBeNull())

async function memoriaSemConta() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

type Montagem = (estado: EstadoPrototipo) => Promise<{ container: HTMLElement; unmount: () => void }>

const montagens: Array<[string, Montagem]> = [
  ['/entrar', async (estadoInicial) => renderizarComDados('/entrar', { estadoInicial })],
  ['/criar-conta', async (estadoInicial) => renderizarComDados('/criar-conta', { estadoInicial })],
  ['/recuperar-acesso', async (estadoInicial) => renderizarComDados('/recuperar-acesso', { estadoInicial })],
  ['/redefinir-senha (link vencido)', async (estadoInicial) => renderizarComDados('/redefinir-senha', { estadoInicial })],
  [
    '/redefinir-senha (formulário)',
    async (estadoInicial) => {
      sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
      return renderizarComDados('/redefinir-senha', { estadoInicial, sessao: 'juliana' })
    },
  ],
  ['/conta-excluida', async (estadoInicial) => renderizarComDados('/conta-excluida', { estadoInicial })],
  [
    '/app/comecar (conta incompleta)',
    async (estadoInicial) => renderizarComDados('/app/comecar', { estadoInicial, dados: await memoriaSemConta() }),
  ],
  ['/app/conta (responsável)', async (estadoInicial) => renderizarComDados('/app/conta', { estadoInicial, sessao: 'juliana' })],
  ['/app/conta (cuidador)', async (estadoInicial) => renderizarComDados('/app/conta', { estadoInicial, sessao: 'bruno' })],
  ['/app/conta (sem família)', async (estadoInicial) => renderizarComDados('/app/conta', { estadoInicial, sessao: 'davi' })],
]

describe('axe-core, rota por rota, nos dois temas', () => {
  for (const [tema, estado] of temas) {
    for (const [nome, montar] of montagens) {
      it(`${nome} (${tema}): sem violações, com alvos de 44 px`, async () => {
        const { container } = await montar(estado())
        await screen.findByRole('heading', { level: 1 })
        await esperarCarregar()

        expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')
        expect(await violacoes(container)).toEqual([])
        expect(semAlvoDe44(container)).toEqual([])
        expect(container.querySelectorAll('main')).toHaveLength(1)
        expect(container.querySelectorAll('h1')).toHaveLength(1)
      })
    }

    it(`/app/conta (${tema}) com a caixa de excluir a conta aberta: sem violações`, async () => {
      const { container } = renderizarComDados('/app/conta', { estadoInicial: estado(), sessao: 'davi' })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
      await esperarCarregar()
      fireEvent.click(botao('Excluir minha conta'))

      expect(screen.getByRole('dialog', { name: 'Excluir a sua conta?' })).toBeTruthy()
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(container)).toEqual([])
    })

    it(`erros nos formulários (${tema}): sem violações`, async () => {
      const entrar = renderizarComDados('/entrar', { estadoInicial: estado() })
      await screen.findByRole('button', { name: 'Entrar' })
      fireEvent.click(botao('Entrar'))
      expect(await violacoes(entrar.container)).toEqual([])
      digitar('E-mail', 'juliana@exemplo.invalid')
      digitar('Senha', 'errada')
      fireEvent.click(botao('Entrar'))
      await screen.findByRole('alert')
      expect(await violacoes(entrar.container)).toEqual([])
      entrar.unmount()

      const criar = renderizarComDados('/criar-conta', { estadoInicial: estado() })
      await screen.findByRole('button', { name: 'Criar conta' })
      fireEvent.click(botao('Criar conta'))
      expect(await violacoes(criar.container)).toEqual([])
    })
  }
})

describe('rótulos e erros ligados aos campos', () => {
  it('todo campo de toda rota tem um rótulo visível ligado a ele', async () => {
    for (const [nome, montar] of montagens) {
      const { container, unmount } = await montar(claro())
      await screen.findByRole('heading', { level: 1 })
      await esperarCarregar()

      for (const controle of container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')) {
        expect(controle.labels?.length, `${nome}: ${controle.outerHTML.slice(0, 80)}`).toBe(1)
        expect(controle.labels![0].textContent!.trim().length).toBeGreaterThan(0)
        expect(controle.labels![0].tagName).toBe('LABEL')
      }
      unmount()
    }
  })

  it('o erro de campo liga por aria-describedby e aria-invalid="true", junto da ajuda', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    fireEvent.click(botao('Criar conta'))

    const textosLigados = (rotulo: string) =>
      campo(rotulo)
        .getAttribute('aria-describedby')!
        .split(' ')
        .map((id) => document.getElementById(id)!.textContent)
    for (const [rotulo, erro, ajuda] of [
      ['Seu nome', 'Escreva o seu nome.', 'É o nome que a família vai ver.'],
      ['E-mail', 'Escreva o seu e-mail.', null],
      ['Senha', 'Escreva a sua senha.', 'Pelo menos 6 caracteres.'],
    ] as const) {
      expect(campo(rotulo).getAttribute('aria-invalid'), rotulo).toBe('true')
      expect(textosLigados(rotulo), rotulo).toContain(erro)
      if (ajuda) expect(textosLigados(rotulo), rotulo).toContain(ajuda)
    }
  })

  it('o campo sem erro não leva aria-invalid; só a ajuda fica ligada', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    expect(campo('Senha').hasAttribute('aria-invalid')).toBe(false)
    expect(document.getElementById(campo('Senha').getAttribute('aria-describedby')!)!.textContent).toBe('Pelo menos 6 caracteres.')
    expect(campo('E-mail').hasAttribute('aria-describedby')).toBe(false)
  })

  it('o erro de campo de uma resposta do banco também liga ao campo (senha fraca)', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    digitar('Seu nome', 'Nova')
    digitar('E-mail', 'nova@exemplo.invalid')
    digitar('Senha', '123')
    fireEvent.click(botao('Criar conta'))

    await waitFor(() => expect(campo('Senha').getAttribute('aria-invalid')).toBe('true'))
    const ligados = campo('Senha').getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(ligados).toContain(TEXTOS_ERRO.senha_fraca)
  })
})

describe('o foco num envio com erro', () => {
  it('vai ao primeiro campo com erro e, quando o erro não é de campo, ao resumo do erro no topo', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    fireEvent.click(botao('Entrar'))
    expect(document.activeElement).toBe(campo('E-mail'))

    digitar('E-mail', 'juliana@exemplo.invalid')
    fireEvent.click(botao('Entrar'))
    expect(document.activeElement).toBe(campo('Senha'))

    digitar('Senha', 'errada')
    fireEvent.click(botao('Entrar'))
    const alerta = await screen.findByRole('alert')
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(alerta.textContent).toBe(TEXTOS_ERRO.credenciais)
  })
})

describe('a caixa de diálogo de excluir a conta', () => {
  async function abrir() {
    const renderizado = renderizarComDados('/app/conta', { sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperarCarregar()
    const aberta = botao('Excluir minha conta')
    fireEvent.click(aberta)
    return { ...renderizado, aberta }
  }

  it('é um <dialog> aberto como modal, com título e foco inicial no primeiro controle', async () => {
    await abrir()

    const dialogo = screen.getByRole('dialog', { name: 'Excluir a sua conta?' })
    expect(dialogo.tagName).toBe('DIALOG')
    expect(dialogo.hasAttribute('open')).toBe(true)
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    expect(within(dialogo).getByRole('heading', { level: 2, name: 'Excluir a sua conta?' })).toBeTruthy()
    expect(document.activeElement).toBe(within(dialogo).getByLabelText('Senha atual', { selector: 'input' }))
  })

  it('Esc fecha a caixa e o foco volta ao botão que a abriu', async () => {
    const { aberta } = await abrir()
    const dialogo = screen.getByRole('dialog')

    fireEvent.keyDown(within(dialogo).getByLabelText('Senha atual', { selector: 'input' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(aberta)
  })

  it('"Cancelar" fecha a caixa, o foco volta ao botão e a caixa abre de novo limpa', async () => {
    const { aberta } = await abrir()
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Senha atual', { selector: 'input' }), { target: { value: 'rascunho' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(aberta)

    fireEvent.click(aberta)
    expect((within(screen.getByRole('dialog')).getByLabelText('Senha atual', { selector: 'input' }) as HTMLInputElement).value).toBe('')
  })
})

describe('foco e rolagem ao trocar de tela', () => {
  it('na primeira carga da página o foco não se move e a tela não rola', async () => {
    const { rolarAoTopo } = renderizarComDados('/entrar')
    const titulo = await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })

    expect(document.activeElement).not.toBe(titulo)
    expect(rolarAoTopo).not.toHaveBeenCalled()
  })

  it('numa navegação dentro do site, a rolagem vai ao topo e o foco vai ao h1 da tela nova', async () => {
    const { rolarAoTopo } = renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    fireEvent.click(within(document.querySelector('main')!).getByRole('link', { name: 'Criar conta' }))
    const criar = await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.criarConta })
    await waitFor(() => expect(document.activeElement).toBe(criar))
    expect(criar.getAttribute('tabindex')).toBe('-1')
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)

    fireEvent.click(within(document.querySelector('main')!).getByRole('link', { name: 'Entrar' }))
    const entrar = await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    await waitFor(() => expect(document.activeElement).toBe(entrar))
  })

  it('depois de entrar, o foco vai ao h1 da Conta', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', SENHA_DEMONSTRACAO)
    fireEvent.click(botao('Entrar'))

    const conta = await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(document.activeElement).toBe(conta))
  })

  it('/app/conta#exportar foca o título da seção Exportar, e não o h1', async () => {
    renderizarComDados('/app/conta#exportar', { sessao: 'juliana' })

    const exportar = await screen.findByRole('heading', { level: 2, name: 'Seus dados' })
    await waitFor(() => expect(document.activeElement).toBe(exportar))
    expect(exportar.getAttribute('tabindex')).toBe('-1')
  })
})

describe('RN-01: nenhuma rota desta tarefa chama a rede', () => {
  it('as sete rotas, em modo memória, com envios e saída, sem tocar no fetch', async () => {
    const fetchProibido = vi.fn(() => {
      throw new Error('o teste chamou a rede')
    })
    vi.stubGlobal('fetch', fetchProibido)

    for (const [, montar] of montagens) {
      const { unmount } = await montar(claro())
      await screen.findByRole('heading', { level: 1 })
      await esperarCarregar()
      unmount()
    }

    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', SENHA_DEMONSTRACAO)
    fireEvent.click(botao('Entrar'))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperarCarregar()
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })

    expect(fetchProibido).not.toHaveBeenCalled()
  })
})
