import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COMUM_COMUNIDADE, DIALOGO_BLOQUEIO, FORMULARIO_TOPICO, PERFIL, TOPICO } from '../../conteudo/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { pressionar, paradasDeTab, tabular } from '../conta/tabular.ts'
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

// O Tab e o Enter/Espaço são modelados como no navegador (`../conta/tabular.ts`): um grupo de botões de
// opção é uma parada só, e `disabled`, `hidden` e `tabindex="-1"` ficam fora da ordem.
describe('A11Y-005: "Ver prévia" alcançável por Tab e ativável pelo teclado, sem `disabled`', () => {
  const COMPOSITORES = [
    {
      nome: 'novo tópico (FormularioDeTopico)',
      abrir: async () => {
        cena('outro', '/app/comunidade/sono/novo')
        await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
        await semCarregando()
      },
      rotuloDoBotao: FORMULARIO_TOPICO.verPrevia,
      dica: FORMULARIO_TOPICO.dicaPrevia.ambos,
      preencher: () => {
        digitar('campo-titulo', 'Um título bom')
        digitar('campo-corpo', 'Corpo do tópico')
      },
      previa: '[data-previa="topico"]',
      // O último campo de texto antes do botão; entre os dois fica o grupo da faixa (uma parada só).
      ultimoCampo: 'campo-corpo',
    },
    {
      nome: 'resposta (FormularioDeResposta)',
      abrir: () => abrirTopico(),
      rotuloDoBotao: TOPICO.verPrevia,
      dica: TOPICO.dicaPrevia,
      preencher: () => digitar('campo-resposta', 'Minha resposta'),
      previa: '[data-previa="resposta"]',
      ultimoCampo: 'campo-resposta',
    },
  ]

  for (const compositor of COMPOSITORES) {
    const botaoDaPrevia = () => screen.getByRole('button', { name: compositor.rotuloDoBotao }) as HTMLButtonElement
    const paradasAntes = (botao: HTMLElement) =>
      paradasDeTab(false).filter((parada) => botao.compareDocumentPosition(parada) & Node.DOCUMENT_POSITION_PRECEDING)

    describe(compositor.nome, () => {
      it('inválido: o Tab, vindo do controle anterior, para no botão; ele é aria-disabled e leva a dica; o Shift+Tab volta ao controle anterior', async () => {
        await compositor.abrir()
        const botao = botaoDaPrevia()
        expect(botao.disabled).toBe(false)
        expect(botao.getAttribute('aria-disabled')).toBe('true')
        expect(document.getElementById(botao.getAttribute('aria-describedby')!)?.textContent).toBe(compositor.dica)

        const anteriores = paradasAntes(botao)
        const anterior = anteriores[anteriores.length - 1]
        expect(anterior, 'há um controle antes do botão na ordem do Tab').toBeTruthy()
        anterior.focus()
        expect(tabular(), 'o Tab chega ao botão "Ver prévia"').toBe(botao)
        expect(tabular(true)).toBe(anterior)

        // Do último campo de texto, no máximo duas paradas (o grupo da faixa conta uma) até o botão.
        campoPorId(compositor.ultimoCampo).focus()
        const percurso = [tabular(), tabular()]
        expect(percurso).toContain(botao)
      })

      for (const tecla of ['Enter', ' '] as const) {
        it(`inválido: Tab até o botão e ${tecla === ' ' ? 'Espaço' : 'Enter'} não abrem a prévia, nem tiram o foco ou o aria-disabled`, async () => {
          await compositor.abrir()
          const botao = botaoDaPrevia()
          const anteriores = paradasAntes(botao)
          anteriores[anteriores.length - 1].focus()
          expect(tabular()).toBe(botao)

          pressionar(botao, tecla)

          expect(document.querySelector(compositor.previa)).toBeNull()
          expect(document.activeElement).toBe(botao)
          expect(botao.getAttribute('aria-disabled')).toBe('true')
          expect(botao.hasAttribute('aria-describedby')).toBe(true)
          expect(botao.disabled).toBe(false)
        })
      }

      it('inválido: o clique e o envio do formulário não abrem a prévia', async () => {
        await compositor.abrir()
        const botao = botaoDaPrevia()
        fireEvent.click(botao)
        fireEvent.submit(botao.closest('form')!)
        expect(document.querySelector(compositor.previa)).toBeNull()
        expect(botao.getAttribute('aria-disabled')).toBe('true')
      })

      for (const tecla of ['Enter', ' '] as const) {
        it(`válido: Tab até o botão e ${tecla === ' ' ? 'Espaço' : 'Enter'} abrem a prévia`, async () => {
          await compositor.abrir()
          compositor.preencher()
          const botao = botaoDaPrevia()
          expect(botao.hasAttribute('aria-disabled')).toBe(false)
          expect(botao.hasAttribute('aria-describedby')).toBe(false)

          const anteriores = paradasAntes(botao)
          anteriores[anteriores.length - 1].focus()
          expect(tabular()).toBe(botao)
          expect(document.querySelector(compositor.previa)).toBeNull()

          pressionar(botao, tecla)

          expect(document.querySelector(compositor.previa)).not.toBeNull()
        })
      }

      it('válido: o clique abre a prévia', async () => {
        await compositor.abrir()
        compositor.preencher()
        fireEvent.click(botaoDaPrevia())
        expect(document.querySelector(compositor.previa)).not.toBeNull()
      })
    })
  }
})

// O mesmo Tab preso, agora no diálogo da Comunidade (`Dialogo`) que tem um grupo de botões de opção, e que abre
// com nenhuma opção marcada.
describe('A11Y-007: o grupo de motivos de "Denunciar" é uma parada só do Tab', () => {
  const ESTADOS = [
    { nome: 'nenhum motivo marcado', marcar: null },
    { nome: 'primeiro motivo marcado', marcar: 0 },
    { nome: 'último motivo marcado', marcar: -1 },
  ]

  for (const estado of ESTADOS) {
    it(`${estado.nome}: Shift+Tab da primeira parada e Tab da última dão a volta; 10 Tab e 10 Shift+Tab sem escapar`, async () => {
      await abrirTopico()
      fireEvent.click(
        within(document.getElementById(`resposta-${CONTEUDO.respostaDoAutor}`)!).getByRole('button', { name: TOPICO.denunciar }),
      )
      const dialogo = screen.getByRole('dialog')
      const radios = within(dialogo).getAllByRole('radio') as HTMLInputElement[]
      if (estado.marcar !== null) fireEvent.click(radios.at(estado.marcar)!)
      const cancelar = within(dialogo).getByRole('button', { name: COMUM_COMUNIDADE.cancelar })
      const dentro = (lista: HTMLElement[]) => lista.filter((parada) => dialogo.contains(parada))
      const nome = (elemento: HTMLElement) =>
        elemento === cancelar ? 'Cancelar' : radios.includes(elemento as HTMLInputElement) ? 'grupo' : dialogo.contains(elemento) ? 'dentro' : 'FORA'

      const adiante = dentro(paradasDeTab(false))
      const atras = dentro(paradasDeTab(true))
      // Uma só opção do grupo é parada, em cada sentido, e o último botão é o Cancelar.
      expect(adiante.filter((parada) => nome(parada) === 'grupo')).toHaveLength(1)
      expect(atras.filter((parada) => nome(parada) === 'grupo')).toHaveLength(1)
      expect(nome(adiante[0])).toBe('grupo')
      expect(adiante[adiante.length - 1]).toBe(cancelar)
      expect(atras[atras.length - 1]).toBe(cancelar)

      // Shift+Tab da primeira parada (em qualquer sentido) vai ao Cancelar; Tab do Cancelar vai à primeira parada.
      adiante[0].focus()
      expect(tabular(true)).toBe(cancelar)
      atras[0].focus()
      expect(tabular(true)).toBe(cancelar)
      cancelar.focus()
      expect(tabular()).toBe(adiante[0])

      cancelar.focus()
      for (let tab = 1; tab <= 10; tab += 1) expect(nome(tabular()), `Tab ${tab}`).not.toBe('FORA')
      for (let tab = 1; tab <= 10; tab += 1) expect(nome(tabular(true)), `Shift+Tab ${tab}`).not.toBe('FORA')

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  }
})
