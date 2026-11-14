import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { COMUM, ORDEM_DOS_PAPEIS, PAPEIS, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { comObrigatorio } from './obrigatorio.ts'

// A11Y-007 (Tab preso nos diálogos da Família e de excluir a conta), A11Y-008 (campos obrigatórios das
// telas de acesso), A11Y-013 (nome curto dos botões de opção do papel) e o validador de e-mail único
// de /criar-conta e /recuperar-acesso.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const esperarCarregar = () => waitFor(() => expect(screen.queryByText(/Carregando…|Conferindo as suas famílias…/)).toBeNull())

// ---------------------------------------------------------------------------------------------
// A11Y-007

const TABULAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Um Tab (ou Shift+Tab) como o navegador o faz: o `keydown` vai ao elemento em foco e, se a página não o
 * cancelou, o foco anda ao próximo controle da página inteira, na ordem do documento, e dá a volta no fim.
 */
function tabular(retroceder = false) {
  const ativo = document.activeElement as HTMLElement
  const seguiu = fireEvent.keyDown(ativo, { key: 'Tab', shiftKey: retroceder })
  if (!seguiu) return
  const todos = [...document.querySelectorAll<HTMLElement>(TABULAVEIS)]
  const indice = todos.indexOf(ativo)
  const proximo = todos[(indice + (retroceder ? -1 : 1) + todos.length) % todos.length]
  proximo.focus()
}

function confirmarFocoPreso(dialogo: HTMLElement) {
  expect(dialogo.contains(document.activeElement)).toBe(true)
  for (let tab = 1; tab <= 10; tab += 1) {
    tabular()
    expect(dialogo.contains(document.activeElement), `Tab ${tab} saiu da caixa: ${document.activeElement?.outerHTML.slice(0, 100)}`).toBe(true)
  }
  for (let tab = 1; tab <= 10; tab += 1) {
    tabular(true)
    expect(dialogo.contains(document.activeElement), `Shift+Tab ${tab} saiu da caixa: ${document.activeElement?.outerHTML.slice(0, 100)}`).toBe(true)
  }
}

const DIALOGOS_DA_FAMILIA: Array<{ nome: string; abre: () => HTMLElement }> = [
  { nome: 'remover acesso', abre: () => botao('Remover acesso de Bruno') },
  { nome: 'mudar papel', abre: () => botao('Mudar papel de Bruno') },
  { nome: 'mudar papel (própria linha)', abre: () => botao('Mudar papel de Juliana') },
  { nome: 'sair da família', abre: () => botao('Sair da família') },
  { nome: 'excluir família', abre: () => botao('Excluir família') },
  { nome: 'cancelar convite', abre: () => screen.getAllByRole('button', { name: /^Cancelar convite de / })[0] },
  { nome: 'arquivar bebê', abre: () => botao('Arquivar Heloísa') },
]

async function abrirFamilia() {
  const renderizado = renderizarComDados('/app/familia', { sessao: 'juliana' })
  await screen.findByRole('heading', { level: 2, name: 'Bebês' })
  return renderizado
}

describe('A11Y-007: o Tab fica dentro das caixas de diálogo', () => {
  for (const caixa of DIALOGOS_DA_FAMILIA) {
    it(`${caixa.nome}: 10 Tab e 10 Shift+Tab sem sair da caixa; Esc fecha e o foco volta ao botão que abriu`, async () => {
      await abrirFamilia()
      const abridor = caixa.abre()
      fireEvent.click(abridor)
      const dialogo = screen.getByRole('dialog')

      confirmarFocoPreso(dialogo)

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(abridor)
    })
  }

  it('excluir a conta: 10 Tab e 10 Shift+Tab sem sair da caixa; Esc devolve o foco ao botão que abriu', async () => {
    renderizarComDados('/app/conta', { sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperarCarregar()
    const abridor = botao('Excluir minha conta')
    fireEvent.click(abridor)
    const dialogo = screen.getByRole('dialog', { name: 'Excluir a sua conta?' })

    confirmarFocoPreso(dialogo)

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(abridor)
  })
})

// ---------------------------------------------------------------------------------------------
// A11Y-008

/** O rótulo visível de cada campo de texto da tela: o texto do rótulo, o `aria-required` e o `required` nativo. */
function camposDaTela() {
  return [...document.querySelectorAll<HTMLInputElement>('main form input')]
    .filter((entrada) => entrada.type !== 'checkbox' && entrada.type !== 'radio')
    .map((entrada) => ({
      rotulo: (entrada.labels?.[0]?.textContent ?? '').trim(),
      ariaRequired: entrada.getAttribute('aria-required'),
      nativo: entrada.hasAttribute('required'),
    }))
}

describe('A11Y-008: campos obrigatórios das telas de acesso', () => {
  it('/entrar: e-mail e senha levam aria-required e "(obrigatório)", sem `required` nativo', async () => {
    renderizarComDados('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    expect(camposDaTela()).toEqual([
      { rotulo: `${COMUM.rotuloEmail} (obrigatório)`, ariaRequired: 'true', nativo: false },
      { rotulo: `${COMUM.rotuloSenha} (obrigatório)`, ariaRequired: 'true', nativo: false },
    ])
    expect(document.querySelector<HTMLFormElement>('main form')!.noValidate).toBe(true)
  })

  it('/criar-conta: nome, e-mail e senha levam aria-required e "(obrigatório)", sem `required` nativo', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    expect(camposDaTela()).toEqual([
      { rotulo: `${COMUM.rotuloNome} (obrigatório)`, ariaRequired: 'true', nativo: false },
      { rotulo: `${COMUM.rotuloEmail} (obrigatório)`, ariaRequired: 'true', nativo: false },
      { rotulo: `${COMUM.rotuloSenha} (obrigatório)`, ariaRequired: 'true', nativo: false },
    ])
    expect(document.querySelector<HTMLFormElement>('main form')!.noValidate).toBe(true)
  })

  it('/recuperar-acesso: o e-mail leva aria-required e "(obrigatório)", sem `required` nativo', async () => {
    renderizarComDados('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })

    expect(camposDaTela()).toEqual([{ rotulo: `${COMUM.rotuloEmail} (obrigatório)`, ariaRequired: 'true', nativo: false }])
    expect(document.querySelector<HTMLFormElement>('main form')!.noValidate).toBe(true)
  })

  it('um campo que não é obrigatório não leva o sufixo (o seletor de fuso e o nome de Começar ficam como estão)', async () => {
    renderizarComDados('/app/conta', { sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperarCarregar()
    expect(document.querySelector('main')!.textContent).not.toContain('(obrigatório)')
  })
})

// ---------------------------------------------------------------------------------------------
// A11Y-013

describe('A11Y-013: o nome do botão de opção do papel é só o papel', () => {
  it('no convite novo: nome = o papel; a descrição fica em aria-describedby, e não no nome', async () => {
    await abrirFamilia()
    const formulario = screen.getByRole('form', { name: 'Novo convite' })

    for (const papel of ORDEM_DOS_PAPEIS) {
      const opcao = within(formulario).getByRole('radio', { name: PAPEIS[papel].nome })
      const descricao = document.getElementById(opcao.getAttribute('aria-describedby') ?? '')
      expect(descricao?.textContent, papel).toBe(PAPEIS[papel].permite)
    }
  })

  it('em "Mudar papel": o mesmo nome curto e a mesma descrição', async () => {
    await abrirFamilia()
    fireEvent.click(botao('Mudar papel de Bruno'))
    const dialogo = within(screen.getByRole('dialog'))

    for (const papel of ORDEM_DOS_PAPEIS) {
      const opcao = dialogo.getByRole('radio', { name: PAPEIS[papel].nome })
      expect(document.getElementById(opcao.getAttribute('aria-describedby') ?? '')?.textContent, papel).toBe(PAPEIS[papel].permite)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Um validador de e-mail só

describe('o mesmo validador de e-mail em /criar-conta e em /recuperar-acesso', () => {
  const AMOSTRAS: Array<[descricao: string, texto: string, mensagem: string | null]> = [
    ['vazio', '', COMUM.escrevaEmail],
    ['só espaços', '   ', COMUM.escrevaEmail],
    ['sem @', 'sem-arroba.com', TEXTOS_ERRO.email_invalido],
    ['a@b', 'a@b', TEXTOS_ERRO.email_invalido],
    ['@b.com', '@b.com', TEXTOS_ERRO.email_invalido],
    ['a@.com', 'a@.com', TEXTOS_ERRO.email_invalido],
    ['espaço no meio', 'a b@c.com', TEXTOS_ERRO.email_invalido],
    ['dois @', 'a@@b.com', TEXTOS_ERRO.email_invalido],
    ['maiúsculas', 'USUARIO@EXEMPLO.COM', null],
    ['espaços nas pontas', '  nova@exemplo.invalid  ', null],
    ['válido', 'nova@exemplo.invalid', null],
  ]

  /** O veredito do campo de e-mail logo depois do envio: a mensagem ligada a ele, ou `null` se não há erro. */
  function veredito(): string | null {
    const entrada = screen.getByLabelText(comObrigatorio('E-mail'), { selector: 'input' })
    if (entrada.getAttribute('aria-invalid') !== 'true') return null
    return document.getElementById(`${entrada.id}-erro`)?.textContent ?? '(sem mensagem)'
  }

  const digitar = (rotulo: string, texto: string) =>
    fireEvent.change(screen.getByLabelText(comObrigatorio(rotulo), { selector: 'input' }), { target: { value: texto } })

  async function rodar(caminho: '/criar-conta' | '/recuperar-acesso', texto: string): Promise<string | null> {
    const { unmount } = renderizarComDados(caminho)
    await screen.findByRole('button', { name: caminho === '/criar-conta' ? 'Criar conta' : 'Enviar link' })
    if (caminho === '/criar-conta') {
      digitar('Seu nome', 'Nova')
      digitar('Senha', 'senha-nova')
    }
    digitar('E-mail', texto)
    fireEvent.click(screen.getByRole('button', { name: caminho === '/criar-conta' ? 'Criar conta' : 'Enviar link' }))
    const resultado = veredito()
    unmount()
    return resultado
  }

  it('as mesmas amostras dão o mesmo veredito e a mesma mensagem nos dois formulários', async () => {
    const criar: Array<string | null> = []
    const recuperar: Array<string | null> = []
    for (const [, texto] of AMOSTRAS) {
      criar.push(await rodar('/criar-conta', texto))
      recuperar.push(await rodar('/recuperar-acesso', texto))
    }

    expect(criar.map((v, i) => [AMOSTRAS[i][0], v])).toEqual(recuperar.map((v, i) => [AMOSTRAS[i][0], v]))
    expect(criar).toEqual(AMOSTRAS.map(([, , mensagem]) => mensagem))
  })
})
