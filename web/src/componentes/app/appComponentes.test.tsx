import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import axe from 'axe-core'
import { ALVO_APP } from './alvo.ts'
import { BotaoIniciarMamada } from './BotaoIniciarMamada.tsx'
import { CartaoSessao } from './CartaoSessao.tsx'
import { DesdeQueVoceSaiu, type ItemDesde } from './DesdeQueVoceSaiu.tsx'

// As peças novas das telas do app (DESIGN.md 4): o cartão de mel da sessão, a lista "Desde que você saiu"
// e o botão redondo da madrugada. Montadas sozinhas, pelos papéis e nomes acessíveis.

const AGORA = Date.parse('2026-11-05T10:00:00')
const MIN = 60_000

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help}`)
}

function montarCartao(sessao: Parameters<typeof CartaoSessao>[0]['sessao']) {
  const aoEncerrar = vi.fn()
  const ref = createRef<HTMLElement>()
  const resultado = render(
    <MemoryRouter>
      <CartaoSessao ref={ref} sessao={sessao} agora={AGORA} aoEncerrar={aoEncerrar} />
    </MemoryRouter>,
  )
  return { ...resultado, aoEncerrar, ref }
}

describe('CartaoSessao', () => {
  it('é uma região nomeada "Em andamento", alvo de foco por programa, com o tipo e o tempo em Literata tabular', () => {
    const { ref } = montarCartao({ tipo: 'sono', inicio: AGORA - 38 * MIN - 12_000, pessoa: 'Juliana' })

    const regiao = screen.getByRole('region', { name: 'Em andamento' })
    expect(ref.current).toBe(regiao)
    expect(regiao.getAttribute('tabindex')).toBe('-1')
    expect(within(regiao).getByText('Sono', { selector: 'p' })).toBeTruthy()
    const timer = within(regiao).getByRole('timer', { name: 'Tempo de sono' })
    expect(timer.textContent).toBe('38:12')
    expect(timer.getAttribute('aria-live')).toBe('off')
    for (const classe of ['font-titulo', 'tabular-nums']) expect(timer.classList.contains(classe), classe).toBe(true)
    expect(within(regiao).getByText('por Juliana')).toBeTruthy()
    expect(regiao.textContent).toContain('Iniciado às 09:21')
  })

  it('o "Encerrar" é a pílula primária de nome exato e chama aoEncerrar; o "Ver sessão" leva à Sessão', () => {
    const { aoEncerrar } = montarCartao({ tipo: 'mamada', inicio: AGORA - 5 * MIN, pessoa: 'Juliana' })

    const encerrar = screen.getByRole('button', { name: 'Encerrar' })
    expect(encerrar.textContent).toBe('Encerrar')
    expect(encerrar.getAttribute('data-botao')).toBe('primario')
    fireEvent.click(encerrar)
    expect(aoEncerrar).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Ver sessão' }).getAttribute('href')).toBe('/app/sessao')
    expect(screen.getByText('Mamada', { selector: 'p' })).toBeTruthy()
  })

  it('Encerrar e Ver sessão têm o alvo do app: 48 px de dia e 56 px na madrugada (--alvo-toque, G11)', () => {
    montarCartao({ tipo: 'sono', inicio: AGORA - MIN, pessoa: 'Bruno' })

    for (const controle of [screen.getByRole('button', { name: 'Encerrar' }), screen.getByRole('link', { name: 'Ver sessão' })]) {
      expect(controle.classList.contains(ALVO_APP), controle.textContent!).toBe(true)
    }
    expect(ALVO_APP).toBe('min-h-[max(48px,var(--alvo-toque))]')
  })

  it('o desenho de traço é enfeite (fora da árvore de acessibilidade) e some na madrugada', () => {
    const { container } = montarCartao({ tipo: 'sono', inicio: AGORA - MIN, pessoa: 'Bruno' })

    const imagem = container.querySelector('img')!
    expect(imagem.getAttribute('alt')).toBe('')
    const moldura = imagem.closest('[aria-hidden="true"]')!
    expect(moldura).not.toBeNull()
    expect(moldura.className).toContain('[[data-tema=madrugada]_&]:hidden')
  })

  it('sem sessão: "Nenhuma sessão em andamento." e como começar, sem botões nem links', () => {
    montarCartao(null)

    const regiao = screen.getByRole('region', { name: 'Em andamento' })
    expect(within(regiao).getByText('Nenhuma sessão em andamento.')).toBeTruthy()
    expect(within(regiao).queryAllByRole('button')).toEqual([])
    expect(within(regiao).queryAllByRole('link')).toEqual([])
    expect(within(regiao).queryByRole('timer')).toBeNull()
  })

  it('não tem violações do axe, com e sem sessão', async () => {
    const com = montarCartao({ tipo: 'tummy', inicio: AGORA - MIN, pessoa: 'Bruno' })
    expect(await violacoes(com.container)).toEqual([])
    com.unmount()

    const sem = montarCartao(null)
    expect(await violacoes(sem.container)).toEqual([])
  })
})

const ITENS: ItemDesde[] = [
  { chave: 'f', pessoa: 'Bruno', texto: 'Fralda, xixi', detalhe: 'Bruno, pai', quando: '04:05' },
  { chave: 's', pessoa: 'Bruno', texto: 'Sono em andamento', detalhe: 'Bruno, desde 03:50', quando: '38 min', emAndamento: true },
  { chave: 'm', pessoa: 'Juliana', texto: 'Mamada, lado esquerdo', detalhe: 'Juliana, mãe', quando: '02:40' },
]

describe('DesdeQueVoceSaiu', () => {
  it('é uma região nomeada pelo título, com uma lista de registros na ordem dada', () => {
    render(<DesdeQueVoceSaiu itens={ITENS} />)

    const regiao = screen.getByRole('region', { name: 'Desde que você saiu' })
    expect(within(regiao).getByRole('heading', { level: 2, name: 'Desde que você saiu' })).toBeTruthy()
    const linhas = within(within(regiao).getByRole('list')).getAllByRole('listitem')
    expect(linhas).toHaveLength(3)
    expect(linhas.map((li) => li.querySelector('p')!.textContent)).toEqual(['Fralda, xixi', 'Sono em andamento', 'Mamada, lado esquerdo'])
  })

  it('cada linha tem o avatar redondo com a inicial (sem foto), o autor e a hora', () => {
    render(<DesdeQueVoceSaiu itens={ITENS} />)

    const linhas = screen.getAllByRole('listitem')
    expect(linhas.map((li) => li.querySelector('[data-avatar]')!.textContent)).toEqual(['B', 'B', 'J'])
    for (const li of linhas) {
      const avatar = li.querySelector<HTMLElement>('[data-avatar]')!
      expect(avatar.classList.contains('rounded-full')).toBe(true)
      expect(avatar.getAttribute('aria-hidden')).toBe('true')
      expect(li.querySelector('img')).toBeNull()
    }
    expect(within(linhas[0]).getByText('Bruno, pai')).toBeTruthy()
    expect(within(linhas[0]).getByText('04:05')).toBeTruthy()
    expect(within(linhas[2]).getByText('Juliana, mãe')).toBeTruthy()
  })

  it('a sessão em andamento leva o tempo numa pílula de mel', () => {
    render(<DesdeQueVoceSaiu itens={ITENS} />)

    const pilula = screen.getByText('38 min')
    expect(pilula.classList.contains('bg-mel')).toBe(true)
    expect(screen.getByText('04:05').classList.contains('bg-mel')).toBe(false)
  })

  it('sem registros, diz que não há nada novo, sem lista vazia', () => {
    render(<DesdeQueVoceSaiu itens={[]} />)

    expect(screen.getByText('Nada novo por aqui.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('não tem violações do axe', async () => {
    const { container } = render(<DesdeQueVoceSaiu itens={ITENS} />)

    expect(await violacoes(container)).toEqual([])
  })
})

describe('BotaoIniciarMamada', () => {
  it('é um botão de nome "Iniciar mamada", redondo, de mel, com alvo de toque, e chama aoIniciar', () => {
    const aoIniciar = vi.fn()
    render(<BotaoIniciarMamada aoIniciar={aoIniciar} ultima="Última mamada às 07:50, com Juliana" />)

    const botao = screen.getByRole('button', { name: 'Iniciar mamada' })
    for (const classe of ['rounded-full', 'bg-mel', 'text-cacau', 'alvo-toque']) expect(botao.classList.contains(classe), classe).toBe(true)
    expect(botao.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(botao)
    expect(aoIniciar).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Última mamada às 07:50, com Juliana')).toBeTruthy()
  })

  it('o texto do botão fica em elementos (nada solto ao lado do ícone)', () => {
    render(<BotaoIniciarMamada aoIniciar={() => undefined} />)

    const botao = screen.getByRole('button', { name: 'Iniciar mamada' })
    expect([...botao.childNodes].filter((no) => no.nodeType === Node.TEXT_NODE && (no.textContent ?? '').trim() !== '')).toEqual([])
  })

  it('não tem violações do axe', async () => {
    const { container } = render(<BotaoIniciarMamada aoIniciar={() => undefined} ultima="Última mamada às 07:50, com Juliana" />)

    expect(await violacoes(container)).toEqual([])
  })
})
