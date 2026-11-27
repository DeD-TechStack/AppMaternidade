import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PERFIL, ROTULO_FAIXA } from '../../conteudo/comunidade.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { FAIXAS } from '../../dados/comunidade.regras.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// QA-14: em /app/comunidade/perfil cada opção da faixa do bebê é uma linha de rótulo com pelo menos 44 px de altura
// (a classe `min-h-11`, 44 px, está no próprio rótulo: o jsdom não calcula layout, então o teste confere a classe).

function abrirOPerfil() {
  const estado = criarElenco()
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.autor.conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO.autor.email)
  return renderizarComunidade('/app/comunidade/perfil', { contas, comunidade })
}

describe('o perfil público: a escolha da faixa (QA-14)', () => {
  it('cada opção de faixa tem uma linha de rótulo de no mínimo 44 px (min-h-11), com o rádio dentro e nome acessível', async () => {
    abrirOPerfil()
    const grupo = await screen.findByRole('group', { name: PERFIL.faixaRotulo })
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())

    const radios = [...grupo.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    // "Sem faixa" mais as faixas.
    expect(radios).toHaveLength(FAIXAS.length + 1)

    for (const faixa of FAIXAS) {
      expect(screen.getByRole('radio', { name: ROTULO_FAIXA[faixa] })).toBeTruthy()
    }
    for (const radio of radios) {
      const rotulo = radio.closest('label')
      expect(rotulo, 'o rádio mora dentro de um label').not.toBeNull()
      expect(rotulo!.classList.contains('min-h-11')).toBe(true)
      expect(rotulo!.classList.contains('alvo-toque')).toBe(true)
      expect(radio.labels?.[0]).toBe(rotulo)
      expect(rotulo!.textContent?.trim()).not.toBe('')
    }
  })
})
