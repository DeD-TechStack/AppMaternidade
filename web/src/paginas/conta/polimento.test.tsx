import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { PORTA_ACESSO } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { comObrigatorio } from './obrigatorio.ts'

// Devolutiva dos juízes, rodada 1: cena de proporção fixa, desenho decorativo no celular, hierarquia dos
// links de Recuperar, estado de erro dos campos, índice e zona de perigo da Conta. Sem folha de estilo no
// jsdom, o visual se confere pelas classes.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const esperar = () => waitFor(() => expect(screen.queryByText(/Carregando…|Conferindo as suas famílias…/)).toBeNull())

async function memoriaSemConta() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

describe('telas de acesso: só a placa da porta', () => {
  const telas: Array<[string, () => ReturnType<typeof renderizarComDados>]> = [
    ['/entrar', () => renderizarComDados('/entrar')],
    ['/criar-conta', () => renderizarComDados('/criar-conta')],
    ['/recuperar-acesso', () => renderizarComDados('/recuperar-acesso')],
  ]

  for (const [rota, montar] of telas) {
    it(`${rota}: nenhum desenho de traço nem cena de mel; a única imagem é a porta, com proporção quadrada e sem moldura`, async () => {
      const { container } = montar()
      await screen.findByRole('heading', { level: 1 })

      expect(container.querySelector('main img[data-ilustracao], img[data-cena], .cm-cena')).toBeNull()
      const imagens = container.querySelectorAll<HTMLImageElement>('main img')
      expect(imagens).toHaveLength(1)
      expect(imagens[0].getAttribute('alt')).toBe(PORTA_ACESSO.alt)
      expect(imagens[0].classList.contains('aspect-square')).toBe(true)
      expect(imagens[0].className).not.toMatch(/shadow|rounded|border|ring|outline/)
      // A placa fica na segunda coluna, ao lado do formulário (a partir de 1024 px, à esquerda dele).
      const colunas = imagens[0].closest('[data-h~="colunas"]')!
      expect(colunas.children[1].contains(imagens[0])).toBe(true)
      expect(colunas.children[1].className).toContain('lg:col-start-1')
      expect(colunas.children[0].className).toContain('lg:col-start-2')
    })
  }

  it('/app/comecar: a mesma placa da porta, sem desenho decorativo', async () => {
    const { container } = renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    expect(container.querySelector('main img[data-ilustracao], img[data-cena], .cm-cena')).toBeNull()
    const imagens = container.querySelectorAll<HTMLImageElement>('main img')
    expect(imagens).toHaveLength(1)
    expect(imagens[0].getAttribute('alt')).toBe(PORTA_ACESSO.alt)
  })
})

describe('/recuperar-acesso: hierarquia dos links', () => {
  // VIS-4 (A-2): os dois são links sublinhados na régua, como em /entrar; "Enviar link" é a única ação principal.
  it('"Entrar" e "Criar conta" são links de texto (alvo-toque, sem pílula nem seta), nessa ordem', async () => {
    renderizarComDados('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })

    const entrar = within(document.querySelector('main')!).getByRole('link', { name: 'Entrar' })
    const criar = within(document.querySelector('main')!).getByRole('link', { name: 'Criar conta' })
    for (const link of [entrar, criar]) {
      expect(link.classList.contains('cm-botao')).toBe(false)
      expect(link.classList.contains('cm-botao-contorno')).toBe(false)
      expect(link.classList.contains('alvo-toque')).toBe(true)
      expect(link.querySelector('svg')).toBeNull()
    }
    expect(Boolean(entrar.compareDocumentPosition(criar) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })
})

describe('estado de erro dos campos', () => {
  it('/criar-conta: cada campo vazio ganha borda grossa, ícone e palavras ligados por aria-describedby, e a ajuda não some', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    fireEvent.click(botao('Criar conta'))

    const nome = screen.getByLabelText(comObrigatorio('Seu nome'), { selector: 'input' }) as HTMLInputElement
    expect(nome.getAttribute('aria-invalid')).toBe('true')
    expect(nome.className).toMatch(/aria-invalid:border-\[3px\]/)
    const ids = nome.getAttribute('aria-describedby')!.split(' ')
    const erro = document.getElementById(ids[0])!
    expect(erro.textContent).toBe('Escreva o seu nome.')
    expect(erro.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(erro.classList.contains('font-semibold')).toBe(true)
    expect(erro.classList.contains('cm-pequeno')).toBe(true)
    // A ajuda continua ligada, depois do erro, com o tamanho de legenda.
    const ajuda = document.getElementById(ids[1])!
    expect(ajuda.textContent).toBe('É o nome que a família vai ver.')
    expect(ajuda.classList.contains('cm-pequeno')).toBe(true)
  })

  it('/app/comecar: o campo de nome vazio recebe o mesmo tratamento de erro', async () => {
    renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
    fireEvent.change(screen.getByLabelText(comObrigatorio('Seu nome'), { selector: 'input' }), { target: { value: '' } })
    fireEvent.click(botao('Salvar'))

    const nome = screen.getByLabelText(comObrigatorio('Seu nome'), { selector: 'input' })
    expect(nome.getAttribute('aria-invalid')).toBe('true')
    const erro = document.getElementById(nome.getAttribute('aria-describedby')!.split(' ')[0])!
    expect(erro.textContent).toBe('Escreva o seu nome.')
    expect(erro.querySelector('svg')).not.toBeNull()
  })
})

describe('/app/conta: índice, barra e zona de perigo', () => {
  it('o índice e a barra não levam sublinhado, e a seção da vez leva aria-current', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperar()

    const indice = screen.getByRole('navigation', { name: 'Nesta página' })
    const links = within(indice).getAllByRole('link')
    for (const link of links) expect(link.className).not.toMatch(/(^|\s)underline(\s|$)/)
    expect(links.filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1)
    expect(links[0].getAttribute('aria-current')).toBe('true')

    const barra = screen.getByRole('navigation', { name: 'Conta' })
    for (const link of within(barra).getAllByRole('link')) expect(link.className).not.toMatch(/(^|\s)underline(\s|$)/)
  })

  it('o título sobe para 48/52 no celular e a caixa do id tem a largura dos campos', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(titulo.classList.contains('cm-h1')).toBe(true)
    expect(titulo.className).not.toMatch(/max-sm:(text|leading)-\[/)

    const caixa = document.querySelector('[data-id-conta]')!
    const formulario = document.querySelector('#perfil')!.closest('section')!.querySelector('form')!
    for (const classe of ['w-full', 'max-w-[28rem]']) {
      expect(caixa.classList.contains(classe), classe).toBe(true)
      expect(formulario.classList.contains(classe), classe).toBe(true)
    }
  })

  it('"Excluir minha conta" é um botão destrutivo (contorno e texto cheios, ícone) mesmo quando a regra o desativa', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperar()

    const excluir = botao('Excluir minha conta')
    // Juliana é a única responsável de uma família: a regra do negócio o desativa e explica logo acima.
    expect(excluir.disabled).toBe(true)
    expect(excluir.className).toMatch(/border-2/)
    expect(excluir.className).toMatch(/text-\[var\(--cor-erro,var\(--cor-texto\)\)\]/)
    expect(excluir.className).not.toMatch(/disabled:(bg|text|border)-\[var\(--cor-desativado/)
    expect(excluir.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    const explicacao = document.getElementById('impedimento-exclusao')!
    expect(Boolean(explicacao.compareDocumentPosition(excluir) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    // A zona de perigo é um grupo próprio, com contorno de 1,5 px.
    expect(excluir.closest('section')!.getAttribute('data-h')).toMatch(/cartao/)
    expect(excluir.closest('section')!.className).toMatch(/border-\[1\.5px\]/)
  })

  it('sem impedimento, "Excluir minha conta" está habilitado', async () => {
    renderizarComDados('/app/conta', { sessao: 'davi' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await esperar()
    await waitFor(() => expect(botao('Excluir minha conta').disabled).toBe(false))
  })
})
