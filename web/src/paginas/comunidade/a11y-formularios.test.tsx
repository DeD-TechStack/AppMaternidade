import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COMUM_COMUNIDADE, DIALOGO_BLOQUEIO, FORMULARIO_TOPICO, PERFIL, TOPICO } from '../../conteudo/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// A11Y-006 (foco inicial no botão seguro dos diálogos destrutivos), A11Y-008 (campos obrigatórios da
// Comunidade) e A11Y-005 ("Ver prévia" alcançável por Tab).

process.env.DEBUG_PRINT_LIMIT = '300'

function cena(pessoa: PessoaDoElenco, caminho: string) {
  const comunidade = criarDadosComunidadeMemoria(criarElenco(), ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return renderizarComunidade(caminho, { contas, comunidade })
}

const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
const campoPorId = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
const rotuloDe = (id: string) => (campoPorId(id).labels?.[0]?.textContent ?? '').trim()
const digitar = (id: string, texto: string) => fireEvent.change(campoPorId(id), { target: { value: texto } })

async function abrirTopico(pessoa: PessoaDoElenco = 'outro') {
  cena(pessoa, `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`)
  await screen.findByRole('heading', { level: 1 })
  await semCarregando()
}

describe('A11Y-006: os diálogos destrutivos abrem com o foco no botão seguro', () => {
  it('"Bloquear <apelido>?" abre com o foco em "Cancelar", e não em "Bloquear"', async () => {
    await abrirTopico()
    const origem = within(document.querySelector('article[aria-label="Tópico do autor"]') as HTMLElement).getByRole('button', {
      name: TOPICO.bloquear(ELENCO.autor.apelido!),
    })
    fireEvent.click(origem)

    const dialogo = screen.getByRole('dialog', { name: DIALOGO_BLOQUEIO.titulo(ELENCO.autor.apelido!) })
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: COMUM_COMUNIDADE.cancelar }))
    expect(document.activeElement).not.toBe(within(dialogo).getByRole('button', { name: DIALOGO_BLOQUEIO.confirmar }))
  })

  it('"Denunciar" abre com o foco em "Cancelar"', async () => {
    await abrirTopico()
    fireEvent.click(
      within(document.getElementById(`resposta-${CONTEUDO.respostaDoAutor}`)!).getByRole('button', { name: TOPICO.denunciar }),
    )

    const dialogo = screen.getByRole('dialog')
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: COMUM_COMUNIDADE.cancelar }))
  })
})

describe('A11Y-008: campos obrigatórios da Comunidade', () => {
  it('Perfil: o apelido leva aria-required e "(obrigatório)" no rótulo; a bio não; sem o atributo nativo `required`', async () => {
    cena('autor', '/app/comunidade/perfil')
    await screen.findByLabelText((texto) => texto.startsWith(PERFIL.apelidoRotulo))
    await semCarregando()

    expect(rotuloDe('perfil-apelido')).toBe(`${PERFIL.apelidoRotulo} (obrigatório)`)
    expect(campoPorId('perfil-apelido').getAttribute('aria-required')).toBe('true')
    expect(campoPorId('perfil-apelido').hasAttribute('required')).toBe(false)
    expect(campoPorId('perfil-apelido').closest('form')!.noValidate).toBe(true)
    expect(rotuloDe('perfil-bio')).toBe(PERFIL.bioRotulo)
    expect(campoPorId('perfil-bio').hasAttribute('aria-required')).toBe(false)
  })

  it('Novo tópico: título e texto levam aria-required e "(obrigatório)"; a faixa não', async () => {
    cena('outro', '/app/comunidade/sono/novo')
    await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
    await semCarregando()

    for (const [id, nome] of [
      ['campo-titulo', FORMULARIO_TOPICO.campoTitulo],
      ['campo-corpo', FORMULARIO_TOPICO.campoCorpo],
    ] as const) {
      expect(rotuloDe(id), id).toBe(`${nome} (obrigatório)`)
      expect(campoPorId(id).getAttribute('aria-required'), id).toBe('true')
      expect(campoPorId(id).hasAttribute('required'), id).toBe(false)
    }
    expect(campoPorId('campo-titulo').closest('form')!.noValidate).toBe(true)
  })
})

describe('A11Y-005: "Ver prévia" alcançável por Tab, sem `disabled`', () => {
  const previa = () => screen.getByRole('button', { name: FORMULARIO_TOPICO.verPrevia }) as HTMLButtonElement

  it('novo tópico: inválido, o botão recebe foco, é aria-disabled, mantém a dica e click/Enter/envio não abrem a prévia', async () => {
    cena('outro', '/app/comunidade/sono/novo')
    await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
    await semCarregando()

    const botao = previa()
    expect(botao.disabled).toBe(false)
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    expect(botao.tabIndex).toBeGreaterThanOrEqual(0)
    botao.focus()
    expect(document.activeElement).toBe(botao)
    const dica = document.getElementById(botao.getAttribute('aria-describedby')!)
    expect(dica?.textContent).toBe(FORMULARIO_TOPICO.dicaPrevia.ambos)

    fireEvent.click(botao)
    fireEvent.keyDown(botao, { key: 'Enter' })
    fireEvent.submit(botao.closest('form')!)
    expect(document.querySelector('[data-previa="topico"]')).toBeNull()
    expect(campoPorId('campo-titulo')).toBeTruthy()
  })

  it('novo tópico: válido, o botão não é aria-disabled e abre a prévia', async () => {
    cena('outro', '/app/comunidade/sono/novo')
    await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
    await semCarregando()
    digitar('campo-titulo', 'Um título bom')
    digitar('campo-corpo', 'Corpo do tópico')

    expect(previa().hasAttribute('aria-disabled')).toBe(false)
    expect(previa().hasAttribute('aria-describedby')).toBe(false)
    fireEvent.click(previa())
    expect(document.querySelector('[data-previa="topico"]')).not.toBeNull()
  })

  it('resposta: inválida, o botão recebe foco, é aria-disabled e click/envio não abrem a prévia; válida, abre', async () => {
    await abrirTopico()
    const botao = screen.getByRole('button', { name: TOPICO.verPrevia }) as HTMLButtonElement

    expect(botao.disabled).toBe(false)
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    botao.focus()
    expect(document.activeElement).toBe(botao)
    expect(document.getElementById(botao.getAttribute('aria-describedby')!)?.textContent).toBe(TOPICO.dicaPrevia)

    fireEvent.click(botao)
    fireEvent.submit(botao.closest('form')!)
    expect(document.querySelector('[data-previa="resposta"]')).toBeNull()

    digitar('campo-resposta', 'Minha resposta')
    expect(botao.hasAttribute('aria-disabled')).toBe(false)
    fireEvent.click(botao)
    expect(document.querySelector('[data-previa="resposta"]')).not.toBeNull()
  })
})
