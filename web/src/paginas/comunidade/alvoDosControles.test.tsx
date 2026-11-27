import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EscolhaDePapel } from '../../componentes/conta/EscolhaDePapel.tsx'
import { EscolhaDeFaixa } from '../../componentes/comunidade/Campos.tsx'
import { COMUM_COMUNIDADE, ROTULO_FAIXA, ROTULO_MOTIVO, TOPICO, TX } from '../../conteudo/comunidade.ts'
import { PAPEIS } from '../../conteudo/conta.ts'
import type { Papel } from '../../dados/comum.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { FAIXAS, type FaixaBebe } from '../../dados/comunidade.regras.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// A11Y-003: todo botão de opção e toda caixa de marcar das quatro telas tem a caixa do próprio controle com pelo
// menos 24 × 24 px (WCAG 2.5.8), a 390 e a 1440 px. O jsdom não faz layout: o contrato se confere pelas classes
// de tamanho do Tailwind (1 unidade = 0,25 rem = 4 px). `shrink-0` impede o flex de espremer a caixa.

const PX_POR_UNIDADE = 4
const MINIMO_PX = 24

/** O lado, em px, que as classes do controle resolvem: `size-N`, ou o menor entre `w-N` e `h-N`. Sem classe, 0. */
function ladoEmPx(controle: HTMLElement): number {
  const classes = [...controle.classList]
  const unidades = (prefixo: string) =>
    classes.flatMap((classe) => {
      const achou = new RegExp(`^${prefixo}-(\\d+(?:\\.\\d+)?)$`).exec(classe)
      return achou ? [Number(achou[1])] : []
    })
  const [lado] = unidades('size')
  if (lado !== undefined) return lado * PX_POR_UNIDADE
  const [largura] = unidades('w')
  const [altura] = unidades('h')
  if (largura === undefined || altura === undefined) return 0
  return Math.min(largura, altura) * PX_POR_UNIDADE
}

function conferirAlvos(controles: HTMLInputElement[], quantos: number) {
  expect(controles).toHaveLength(quantos)
  for (const controle of controles) {
    const nome = controle.getAttribute('aria-labelledby') ?? controle.labels?.[0]?.textContent
    expect(ladoEmPx(controle), `"${nome}" tem a caixa de pelo menos ${MINIMO_PX} px`).toBeGreaterThanOrEqual(MINIMO_PX)
    expect(controle.classList.contains('shrink-0'), `"${nome}" leva shrink-0`).toBe(true)
  }
}

function cena(pessoa: PessoaDoElenco, caminho: string) {
  const comunidade = criarDadosComunidadeMemoria(criarElenco(), ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return renderizarComunidade(caminho, { contas, comunidade })
}

function PapelComEstado() {
  const [papel, setPapel] = useState<Papel>('cuidador')
  return <EscolhaDePapel legenda="Papel" valor={papel} aoMudar={setPapel} />
}

function FaixaComEstado() {
  const [faixa, setFaixa] = useState<FaixaBebe | null>(null)
  return <EscolhaDeFaixa rotulo="Faixa do bebê" valor={faixa} aoMudar={setFaixa} />
}

describe('A11Y-003: o alvo dos botões de opção e das caixas de marcar tem 24 px', () => {
  it('EscolhaDePapel: os botões de opção têm pelo menos 24 px, nome acessível e marcam por clique', () => {
    render(<PapelComEstado />)
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    conferirAlvos(radios, Object.keys(PAPEIS).length)

    const alvo = screen.getByRole('radio', { name: PAPEIS.observador.nome }) as HTMLInputElement
    expect(alvo.checked).toBe(false)
    fireEvent.click(alvo)
    expect(alvo.checked).toBe(true)
    expect((screen.getByRole('radio', { name: PAPEIS.cuidador.nome }) as HTMLInputElement).checked).toBe(false)
  })

  it('EscolhaDeFaixa: os botões de opção têm pelo menos 24 px, nome acessível e marcam por clique', () => {
    render(<FaixaComEstado />)
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    conferirAlvos(radios, FAIXAS.length + 1)

    const semFaixa = screen.getByRole('radio', { name: COMUM_COMUNIDADE.semFaixa }) as HTMLInputElement
    const faixa = screen.getByRole('radio', { name: ROTULO_FAIXA[FAIXAS[0]] }) as HTMLInputElement
    fireEvent.click(faixa)
    expect(faixa.checked).toBe(true)
    expect(semFaixa.checked).toBe(false)
  })

  it('DialogoDenunciar: os botões de opção dos motivos têm pelo menos 24 px, nome acessível e marcam por clique', async () => {
    cena('outro', `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`)
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
    fireEvent.click(
      within(document.getElementById(`resposta-${CONTEUDO.respostaDoAutor}`)!).getByRole('button', { name: TOPICO.denunciar }),
    )

    const dialogo = screen.getByRole('dialog')
    const radios = within(dialogo).getAllByRole('radio') as HTMLInputElement[]
    conferirAlvos(radios, Object.keys(ROTULO_MOTIVO).length)

    const [primeiro, segundo] = radios
    expect(primeiro.getAttribute('name')).toBe('motivo-da-denuncia')
    fireEvent.click(primeiro)
    expect(primeiro.checked).toBe(true)
    fireEvent.click(segundo)
    expect(segundo.checked).toBe(true)
    expect(primeiro.checked).toBe(false)
    expect(within(dialogo).getByRole('radio', { name: ROTULO_MOTIVO[Object.keys(ROTULO_MOTIVO)[0] as keyof typeof ROTULO_MOTIVO] })).toBe(primeiro)
  })

  it('EntrarNaComunidade: a caixa de aceitar os termos tem pelo menos 24 px, nome acessível e marca por clique', async () => {
    cena('nova', '/app/comunidade/entrar')
    const caixa = (await screen.findByRole('checkbox', { name: TX.tx03 })) as HTMLInputElement
    conferirAlvos(screen.getAllByRole('checkbox') as HTMLInputElement[], 1)

    expect(caixa.checked).toBe(false)
    fireEvent.click(caixa)
    expect(caixa.checked).toBe(true)
    fireEvent.click(caixa)
    expect(caixa.checked).toBe(false)
  })
})
