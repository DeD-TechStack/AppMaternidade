import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import { CHAVE_CONVITE, CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { CODIGO_CONVITE_PENDENTE, SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
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

// O botão e o campo do sistema (cm-botao, cm-campo-entrada) trazem o tamanho de site.css (56 px; 48 no
// app): eles não levam `alvo-toque`, que o index.css (44 px) deixaria prevalecer.
const CLASSE_DE_ALVO = /(^|\s)(alvo-toque|botao|nav-item|cm-botao|cm-campo-entrada)(\s|$)/

/**
 * Links e controles fora de parágrafo sem a classe que garante 44 × 44 px (como em layout.test.tsx).
 * Só as telas: o cabeçalho e o rodapé da casca têm os alvos deles (conferidos em layout.test.tsx).
 */
function semAlvoDe44(container: HTMLElement): string[] {
  const telas = [...container.querySelectorAll<HTMLElement>('main, nav[aria-label="Conta"]')]
  return telas
    .flatMap((tela) => [...tela.querySelectorAll<HTMLElement>('a, button, input, select, textarea')])
    .filter((elemento) => elemento.closest('p, [inert]') === null)
    // A opção de papel é um rótulo inteiro (alvo-toque, 44 px) com o botão de opção dentro.
    .filter((elemento) => !(elemento instanceof HTMLInputElement && elemento.type === 'radio' && elemento.closest('label.alvo-toque')))
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
  // 37b
  [
    '/convite (sem código)',
    async (estadoInicial) => {
      sessionStorage.clear()
      return renderizarComDados('/convite', { estadoInicial, sessao: null })
    },
  ],
  [
    '/convite (código guardado, sem sessão)',
    async (estadoInicial) => {
      sessionStorage.setItem(CHAVE_CONVITE, CODIGO_CONVITE_PENDENTE)
      return renderizarComDados('/convite', { estadoInicial, sessao: null })
    },
  ],
  [
    '/convite (prévia)',
    async (estadoInicial) => renderizarComDados(`/convite#${CODIGO_CONVITE_PENDENTE}`, { estadoInicial, sessao: 'davi' }),
  ],
  [
    '/app/comecar (escolha)',
    async (estadoInicial) => {
      sessionStorage.clear()
      return renderizarComDados('/app/comecar', { estadoInicial, sessao: 'davi' })
    },
  ],
  ['/app/familia (responsável)', async (estadoInicial) => renderizarComDados('/app/familia', { estadoInicial, sessao: 'juliana' })],
  ['/app/familia (cuidador)', async (estadoInicial) => renderizarComDados('/app/familia', { estadoInicial, sessao: 'bruno' })],
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

describe('alvos de 44 px nos links', () => {
  it('todo link das telas, também o que está dentro de um parágrafo, leva a classe de alvo (alvo-toque)', async () => {
    const semClasse: string[] = []
    for (const [nome, montar] of montagens) {
      const { container, unmount } = await montar(claro())
      await screen.findByRole('heading', { level: 1 })
      await esperarCarregar()
      for (const tela of container.querySelectorAll<HTMLElement>('main, nav[aria-label="Conta"]')) {
        for (const link of tela.querySelectorAll<HTMLElement>('a')) {
          if (!CLASSE_DE_ALVO.test(link.className)) semClasse.push(`${nome}: ${link.outerHTML.slice(0, 120)}`)
        }
      }
      unmount()
    }
    expect(semClasse).toEqual([])
  })

  it('/criar-conta: os links dos Termos e da Política ficam fora da frase, cada um com alvo de 44 px na mesma lista', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    const termos = screen.getByRole('link', { name: 'Termos de uso' })
    const politica = screen.getByRole('link', { name: 'Política de privacidade' })
    for (const link of [termos, politica]) {
      expect(link.classList.contains('alvo-toque')).toBe(true)
      expect(link.closest('p')).toBeNull()
    }
    expect(screen.getByText(/^Ao criar a conta, você concorda com/).textContent).toBe('Ao criar a conta, você concorda com:')
    expect(termos.closest('ul')).toBe(politica.closest('ul'))
  })
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

  it('depois de entrar, o foco vai ao h1 da Família', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })
    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', SENHA_DEMONSTRACAO)
    fireEvent.click(botao('Entrar'))

    const familia = await screen.findByRole('heading', { level: 1, name: 'Família' })
    await waitFor(() => expect(document.activeElement).toBe(familia))
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
    await screen.findByRole('heading', { level: 1, name: 'Família' })
    await esperarCarregar()
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })

    expect(fetchProibido).not.toHaveBeenCalled()
  })
})

// 37b: as seis caixas de diálogo da Família (remover acesso, mudar papel, sair, excluir família,
// cancelar convite e arquivar bebê), o foco ao trocar de tela e o axe com um erro no topo.
const DIALOGOS_DA_FAMILIA: Array<{ nome: string; abre: () => HTMLElement; titulo: string }> = [
  {
    nome: 'remover acesso',
    abre: () => botao('Remover acesso de Bruno'),
    titulo: 'Remover o acesso de Bruno?',
  },
  { nome: 'mudar papel', abre: () => botao('Mudar papel de Bruno'), titulo: 'Mudar o papel de Bruno' },
  { nome: 'mudar papel (própria linha)', abre: () => botao('Mudar papel de Juliana'), titulo: 'Mudar o seu papel' },
  { nome: 'sair da família', abre: () => botao('Sair da família'), titulo: 'Sair da família Família Exemplo?' },
  { nome: 'excluir família', abre: () => botao('Excluir família'), titulo: 'Excluir a família Família Exemplo?' },
  {
    nome: 'cancelar convite',
    abre: () => screen.getAllByRole('button', { name: /^Cancelar convite de / })[0],
    titulo: 'Cancelar este convite?',
  },
  { nome: 'arquivar bebê', abre: () => botao('Arquivar Heloísa'), titulo: 'Arquivar Heloísa?' },
]

async function abrirFamilia(estadoInicial?: EstadoPrototipo) {
  const renderizado = renderizarComDados('/app/familia', { estadoInicial, sessao: 'juliana' })
  await screen.findByRole('heading', { level: 2, name: 'Bebês' })
  return renderizado
}

describe('as caixas de diálogo da Família', () => {
  for (const [tema, estado] of temas) {
    for (const caixa of DIALOGOS_DA_FAMILIA) {
      it(`${caixa.nome} (${tema}): sem violações e com alvos de 44 px`, async () => {
        const { container } = await abrirFamilia(estado())
        fireEvent.click(caixa.abre())

        expect(screen.getByRole('dialog', { name: caixa.titulo })).toBeTruthy()
        expect(await violacoes(container)).toEqual([])
        expect(semAlvoDe44(container)).toEqual([])
      })
    }
  }

  for (const caixa of DIALOGOS_DA_FAMILIA) {
    it(`${caixa.nome}: <dialog> modal com título, foco inicial no primeiro controle, Esc fecha e o foco volta ao botão que abriu`, async () => {
      await abrirFamilia()
      const abridor = caixa.abre()
      fireEvent.click(abridor)

      const dialogo = screen.getByRole('dialog', { name: caixa.titulo })
      expect(dialogo.tagName).toBe('DIALOG')
      expect(dialogo.hasAttribute('open')).toBe(true)
      expect(dialogo.getAttribute('aria-modal')).toBe('true')
      expect(within(dialogo).getByRole('heading', { level: 2, name: caixa.titulo })).toBeTruthy()
      const primeiro = dialogo.querySelector<HTMLElement>('input, select, textarea, button:not([disabled])')!
      expect(document.activeElement).toBe(primeiro)

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(abridor)
    })
  }

  it('excluir família: a caixa pede o nome, e o campo e o botão de excluir só se ligam com o nome exato', async () => {
    await abrirFamilia()
    fireEvent.click(botao('Excluir família'))

    const dialogo = within(screen.getByRole('dialog'))
    expect(document.activeElement).toBe(dialogo.getByLabelText('Digite o nome da família para confirmar', { selector: 'input' }))
    expect((dialogo.getByRole('button', { name: 'Excluir família' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('foco e rolagem na 37b', () => {
  it('ir ao item Família do cabeçalho leva o foco ao h1 da Família', async () => {
    const { rolarAoTopo } = renderizarComDados('/app/hoje', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })

    fireEvent.click(screen.getByRole('link', { name: 'Família' }))
    const familia = await screen.findByRole('heading', { level: 1, name: 'Família' })
    await waitFor(() => expect(document.activeElement).toBe(familia))
    expect(familia.getAttribute('tabindex')).toBe('-1')
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)
  })

  it('"Tenho um convite" leva o foco ao h1 de /convite', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    fireEvent.click(within(document.querySelector('main')!).getByRole('link', { name: 'Tenho um convite' }))
    const convite = await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.convite })
    await waitFor(() => expect(document.activeElement).toBe(convite))
  })
})

describe('axe com um erro no topo (37b)', () => {
  for (const [tema, estado] of temas) {
    it(`/convite com erro (${tema}) e /app/familia com a frase de sem permissão (${tema}): sem violações`, async () => {
      sessionStorage.setItem(CHAVE_CONVITE, 'não é um código')
      const convite = renderizarComDados('/convite#abc', { estadoInicial: estado(), sessao: 'davi' })
      expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.convite_invalido)
      expect(await violacoes(convite.container)).toEqual([])
      convite.unmount()

      const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
      simularFalha(dados, 'revogarConvite', 'sem_permissao')
      const familia = renderizarComDados('/app/familia', { estadoInicial: estado(), sessao: 'juliana', dados })
      await screen.findByRole('heading', { level: 2, name: 'Bebês' })
      fireEvent.click(screen.getAllByRole('button', { name: /^Cancelar convite de / })[0])
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar convite' }))
      expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.sem_permissao)
      expect(await violacoes(familia.container)).toEqual([])
    })
  }
})
