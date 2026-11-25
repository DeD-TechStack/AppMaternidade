import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENTRAR_NA_COMUNIDADE, TEXTOS_ERRO_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { comObrigatorio, fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// Testemunha do flake de `telas.test.tsx` ("o apelido em uso aparece no campo"): o produto pede o foco no
// apelido num efeito passivo, depois do `await criarPerfil(...)`. Sob carga o efeito roda depois de
// `findByText(apelido_em_uso)` voltar, e uma leitura síncrona de `document.activeElement` ainda vê o `<body>`.
// Aqui o `focus()` do campo fica retido numa fila liberada à mão (sem timers e sem tocar no código do
// produto): o teste espera o pedido de foco chegar à fila, com `waitFor`, e só então decide se o libera.
// Assim o resultado não depende da carga da máquina.

const ID_DO_CAMPO = 'campo-apelido'

const campo = (rotulo: string | RegExp) => screen.getByLabelText(comObrigatorio(rotulo)) as HTMLInputElement
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const digitar = (rotulo: string | RegExp, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })

function cenaDoApelidoEmUso() {
  const estado = criarElenco()
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.semPerfil.conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO.semPerfil.email)
  return renderizarComunidade('/app/comunidade/entrar', { contas, comunidade })
}

async function pedirApelidoEmUso() {
  await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
  digitar(ENTRAR_NA_COMUNIDADE.apelido, 'AUTOR_DO_FORUM')
  fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
  expect(await screen.findByText(TEXTOS_ERRO_COMUNIDADE.apelido_em_uso)).toBeTruthy()
}

describe('C5: o foco do apelido em uso chega depois do texto do erro (testemunha do flake)', () => {
  let fila: Array<() => void>

  beforeEach(() => {
    fila = []
    const original = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, ...args) {
      if (this.id !== ID_DO_CAMPO) return original.apply(this, args)
      fila.push(() => original.apply(this, args))
    })
  })

  afterEach(() => {
    fila = []
    vi.restoreAllMocks()
  })

  const liberarAFila = () => fila.splice(0).forEach((foco) => foco())

  it('a asserção síncrona antiga falha: o produto pediu o foco, mas o activeElement ainda é o body', async () => {
    cenaDoApelidoEmUso()
    await pedirApelidoEmUso()

    await waitFor(() => expect(fila.length).toBeGreaterThan(0))
    expect(document.activeElement).toBe(document.body)
    expect(() => expect(document.activeElement).toBe(campo(ENTRAR_NA_COMUNIDADE.apelido))).toThrow(
      /expected <body>.*<\/body> to be <input id="campo-apelido"/,
    )
  })

  it('o waitFor novo passa: liberado o foco retido, ele acaba no campo do apelido', async () => {
    cenaDoApelidoEmUso()
    await pedirApelidoEmUso()

    await waitFor(() => expect(fila.length).toBeGreaterThan(0))
    liberarAFila()
    await waitFor(() => expect(document.activeElement).toBe(campo(ENTRAR_NA_COMUNIDADE.apelido)))
  })
})
