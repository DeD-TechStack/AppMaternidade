import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

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

describe('telas de acesso: cena e desenho', () => {
  const telas: Array<[string, string, () => ReturnType<typeof renderizarComDados>]> = [
    ['/entrar', 'mae-noite', () => renderizarComDados('/entrar')],
    ['/criar-conta', 'maos-celular', () => renderizarComDados('/criar-conta')],
    ['/recuperar-acesso', 'avo-carrinho', () => renderizarComDados('/recuperar-acesso')],
  ]

  for (const [rota, desenho, montar] of telas) {
    it(`${rota}: um desenho de traço decorativo (alt vazio) só no celular e a cena com proporção fixa`, async () => {
      const { container } = montar()
      await screen.findByRole('heading', { level: 1 })

      const imagens = container.querySelectorAll<HTMLImageElement>('main img[data-ilustracao]')
      expect(imagens).toHaveLength(1)
      expect(imagens[0].getAttribute('data-ilustracao')).toBe(desenho)
      expect(imagens[0].getAttribute('alt')).toBe('')
      expect(imagens[0].classList.contains('sm:hidden')).toBe(true)

      const cena = container.querySelector('img[data-cena]')!.closest('.cm-cena')!
      expect(cena.classList.contains('aspect-[4/3]')).toBe(true)
      expect(cena.classList.contains('lg:aspect-[4/5]')).toBe(true)
      expect(cena.className).not.toMatch(/min-h-/)
      // O painel fica preso no alto da coluna, e a coluna do formulário não se centra na altura dele.
      expect(cena.parentElement!.classList.contains('lg:sticky')).toBe(true)
      expect(cena.parentElement!.parentElement!.getAttribute('data-h-alinhar')).toBe('inicio')
    })
  }

  it('/app/comecar: o desenho decorativo e a mesma cena de proporção fixa', async () => {
    const { container } = renderizarComDados('/app/comecar', { dados: await memoriaSemConta() })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    const imagem = container.querySelector<HTMLImageElement>('main img[data-ilustracao]')!
    expect(imagem.getAttribute('data-ilustracao')).toBe('tummy-time')
    expect(imagem.getAttribute('alt')).toBe('')
    expect(container.querySelector('img[data-cena]')!.closest('.cm-cena')!.classList.contains('lg:aspect-[4/5]')).toBe(true)
  })
})

describe('/recuperar-acesso: hierarquia dos links', () => {
  it('"Entrar" é o botão secundário do sistema e "Criar conta" o link de texto com seta, nessa ordem', async () => {
    renderizarComDados('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })

    const entrar = within(document.querySelector('main')!).getByRole('link', { name: 'Entrar' })
    const criar = within(document.querySelector('main')!).getByRole('link', { name: 'Criar conta' })
    expect(entrar.classList.contains('cm-botao')).toBe(true)
    expect(entrar.classList.contains('cm-botao-contorno')).toBe(true)
    expect(criar.classList.contains('cm-botao')).toBe(false)
    expect(criar.classList.contains('alvo-toque')).toBe(true)
    expect(criar.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(Boolean(entrar.compareDocumentPosition(criar) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })
})

describe('estado de erro dos campos', () => {
  it('/criar-conta: cada campo vazio ganha borda grossa, ícone e palavras ligados por aria-describedby, e a ajuda não some', async () => {
    renderizarComDados('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })
    fireEvent.click(botao('Criar conta'))

    const nome = screen.getByLabelText('Seu nome', { selector: 'input' }) as HTMLInputElement
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
    fireEvent.change(screen.getByLabelText('Seu nome', { selector: 'input' }), { target: { value: '' } })
    fireEvent.click(botao('Salvar'))

    const nome = screen.getByLabelText('Seu nome', { selector: 'input' })
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
