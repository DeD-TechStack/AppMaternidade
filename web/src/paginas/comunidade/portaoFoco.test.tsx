import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ENTRAR_NA_COMUNIDADE, TX } from '../../conteudo/comunidade.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// O foco do portão da Comunidade (C5): depois de "Aceitar e continuar", quando o passo do perfil aparece, o
// foco vai ao campo do apelido (#campo-apelido), nunca ao body (o formulário dos termos some com o foco).

function cena(pessoa: keyof typeof ELENCO, caminho: string) {
  const estado = criarElenco()
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return { ...renderizarComunidade(caminho, { contas, comunidade }), estado, comunidade }
}

const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement

describe('C5: o foco depois de "Aceitar e continuar"', () => {
  it('a pessoa nova marca os termos e envia: o passo do perfil aparece com o foco no campo do apelido', async () => {
    cena('nova', '/app/comunidade/entrar')
    fireEvent.click(await screen.findByRole('checkbox', { name: TX.tx03 }))
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.aceitar))

    await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })

    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('campo-apelido')))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('a falha do aceite continua no resumo de erro (o foco não vai ao apelido, que nem existe ainda)', async () => {
    const { comunidade } = cena('nova', '/app/comunidade/entrar')
    const { simularFalha } = await import('../../dados/comunidade.memoria.ts')
    simularFalha(comunidade, 'aceitarTermos', 'rede')
    fireEvent.click(await screen.findByRole('checkbox', { name: TX.tx03 }))
    fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.aceitar))

    const alerta = await screen.findByRole('alert')
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(document.getElementById('campo-apelido')).toBeNull()
  })
})
