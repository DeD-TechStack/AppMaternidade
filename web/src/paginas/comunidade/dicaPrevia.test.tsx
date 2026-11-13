import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FORMULARIO_TOPICO, TOPICO } from '../../conteudo/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// QA-12: enquanto "Ver prévia" está desabilitado, uma dica ligada ao botão por `aria-describedby` diz o
// que falta. Habilitado, o botão não aponta para dica nenhuma.

function cena(pessoa: PessoaDoElenco, caminho: string) {
  const comunidade = criarDadosComunidadeMemoria(criarElenco(), ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return renderizarComunidade(caminho, { contas, comunidade })
}

const botaoPrevia = () => screen.getByRole('button', { name: 'Ver prévia' }) as HTMLButtonElement
const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())

/** O texto da dica a que o botão aponta; `null` se o botão não aponta para nada. */
function dicaDoBotao(): string | null {
  const id = botaoPrevia().getAttribute('aria-describedby')
  if (id === null) return null
  const dica = document.getElementById(id)
  expect(dica, `aria-describedby="${id}" aponta para um elemento que não existe`).not.toBeNull()
  return dica!.textContent
}

describe('novo tópico: a dica do "Ver prévia"', () => {
  async function abrir() {
    cena('outro', '/app/comunidade/sono/novo')
    await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
    await semCarregando()
  }

  it('título e texto vazios: a dica pede os dois', async () => {
    await abrir()
    expect(botaoPrevia().disabled).toBe(true)
    expect(dicaDoBotao()).toBe('Escreva um título e um texto para ver a prévia.')
    expect(FORMULARIO_TOPICO.dicaPrevia.ambos).toBe('Escreva um título e um texto para ver a prévia.')
  })

  it('só falta o texto: a dica pede o texto', async () => {
    await abrir()
    digitar('Título', 'Um título bom')
    expect(dicaDoBotao()).toBe('Escreva um texto para ver a prévia.')
  })

  it('só falta o título (fora do limite de 3 caracteres): a dica pede o título', async () => {
    await abrir()
    digitar('Título', 'ab')
    digitar('Texto do tópico', 'Corpo do tópico')
    expect(dicaDoBotao()).toBe('Escreva um título para ver a prévia.')
  })

  it('o texto passou do limite: a dica pede o texto', async () => {
    await abrir()
    digitar('Título', 'Um título bom')
    digitar('Texto do tópico', 'x'.repeat(5001))
    expect(dicaDoBotao()).toBe('Escreva um texto para ver a prévia.')
  })

  it('com tudo dentro do limite o botão habilita, sem dica e sem aria-describedby', async () => {
    await abrir()
    digitar('Título', 'Um título bom')
    digitar('Texto do tópico', 'Corpo do tópico')
    expect(botaoPrevia().disabled).toBe(false)
    expect(botaoPrevia().hasAttribute('aria-describedby')).toBe(false)
    expect(screen.queryByText(/para ver a prévia\.$/)).toBeNull()
  })
})

describe('resposta: a dica do "Ver prévia"', () => {
  async function abrir() {
    cena('outro', `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`)
    await screen.findByRole('heading', { level: 1 })
    await semCarregando()
  }

  it('texto vazio: a dica pede o texto; com texto, some junto com o aria-describedby', async () => {
    await abrir()
    expect(botaoPrevia().disabled).toBe(true)
    expect(dicaDoBotao()).toBe('Escreva um texto para ver a prévia.')
    expect(TOPICO.dicaPrevia).toBe('Escreva um texto para ver a prévia.')

    digitar(TOPICO.campoResposta, 'Minha resposta')
    expect(botaoPrevia().disabled).toBe(false)
    expect(botaoPrevia().hasAttribute('aria-describedby')).toBe(false)
    expect(screen.queryByText(TOPICO.dicaPrevia)).toBeNull()
  })

  it('texto acima de 2000 caracteres: a dica volta', async () => {
    await abrir()
    digitar(TOPICO.campoResposta, 'a'.repeat(2001))
    expect(dicaDoBotao()).toBe('Escreva um texto para ver a prévia.')
  })
})
