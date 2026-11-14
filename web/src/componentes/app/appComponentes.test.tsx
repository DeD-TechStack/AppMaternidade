import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { rodarAxe } from '../../teste/axe.ts'
import { ALVO_APP } from './alvo.ts'
import { BotaoIniciarMamada } from './BotaoIniciarMamada.tsx'
import { CartaoSessao } from './CartaoSessao.tsx'
import { DesdeQueVoceSaiu, type ItemDesde } from './DesdeQueVoceSaiu.tsx'
import { ResumoDoDia } from './ResumoDoDia.tsx'

// As peças novas das telas do app (DESIGN.md 4): o cartão de mel da sessão, a lista "Desde que você saiu"
// e o botão redondo da madrugada. Montadas sozinhas, pelos papéis e nomes acessíveis.

const AGORA = Date.parse('2026-11-05T10:00:00')
const MIN = 60_000

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
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
    expect(timer.querySelector('[aria-hidden="true"]')!.textContent).toBe('38:12')
    expect(timer.querySelector('.sr-only')!.textContent).toBe('38 minutos e 12 segundos')
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

  it('o desenho tem a altura do cartão e o traço engrossado por cópias deslocadas, todas fora da árvore de acessibilidade', () => {
    const { container } = montarCartao({ tipo: 'sono', inicio: AGORA - MIN, pessoa: 'Bruno' })

    const desenho = container.querySelector<HTMLElement>('[data-desenho]')!
    expect(desenho.getAttribute('aria-hidden')).toBe('true')
    const imagens = [...desenho.querySelectorAll('img')]
    expect(imagens).toHaveLength(3)
    for (const img of imagens) {
      expect(img.getAttribute('alt')).toBe('')
      expect(img.classList.contains('h-full')).toBe(true)
    }
  })

  it('o tempo tem o recuo óptico do primeiro algarismo', () => {
    montarCartao({ tipo: 'sono', inicio: AGORA - 38 * MIN, pessoa: 'Juliana' })

    expect(screen.getByRole('timer', { name: 'Tempo de sono' }).classList.contains('-ml-[0.045em]')).toBe(true)
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

// A fileira de uma linha (uma linha só na tela) e o botão que abre o texto inteiro dela.
const fila = (li: HTMLElement) => li.querySelector<HTMLElement>('[data-fila]')!
const controle = (li: HTMLElement) => li.querySelector<HTMLButtonElement>('button[data-abrir-linha]')!
const direita = (li: HTMLElement) => fila(li).lastElementChild as HTMLElement

const MAMADA_COM_DURACAO: ItemDesde = {
  chave: 'md',
  pessoa: 'Juliana',
  texto: 'Mamada, lado esquerdo, 18 min',
  detalhe: 'Juliana, mãe',
  quando: '07:50',
}
const FRALDA: ItemDesde = { chave: 'fr', pessoa: 'Bruno', texto: 'Fralda, xixi', detalhe: 'Bruno, pai', quando: '04:05' }
const SESSAO: ItemDesde = {
  chave: 'ss',
  pessoa: 'Bruno',
  texto: 'Sono em andamento',
  detalhe: 'Bruno, desde 03:50',
  quando: '38 min',
  emAndamento: true,
}
const NOTA_LONGA: ItemDesde = {
  chave: 'nl',
  pessoa: 'Carla',
  texto:
    'Nota: pomada só à noite, depois do banho, e passar bem fininho na dobrinha da perna; se ficar vermelho de manhã, avisar a pediatra antes da consulta de sexta.',
  detalhe: 'Carla, avó',
  quando: '09:38',
  hora: '09:38',
}

const NUMEROS = [
  { rotulo: 'Mamadas', valor: '6' },
  { rotulo: 'Fraldas', valor: '5' },
  { rotulo: 'Sono', valor: '9 h 20' },
]

describe('ResumoDoDia: a grade se ajusta ao espaço, sem rolagem lateral (R1-3)', () => {
  it('a seção é o contêiner; a grade tem uma coluna por padrão e três lado a lado só com 18 rem ou mais', () => {
    render(<ResumoDoDia itens={NUMEROS} />)

    const secao = screen.getByRole('region', { name: 'Hoje até agora' })
    expect(secao.classList.contains('@container/resumo')).toBe(true)
    const lista = within(secao).getByRole('list')
    expect(lista.classList.contains('grid-cols-1')).toBe(true)
    expect(lista.classList.contains('@min-[18rem]/resumo:grid-cols-[1fr_1fr_1.45fr]')).toBe(true)
    expect([...lista.classList].some((c) => /^grid-cols-\[/.test(c))).toBe(false)
  })

  it('numa coluna, cada número é uma linha com fio (rótulo à esquerda); em três, fios verticais', () => {
    render(<ResumoDoDia itens={NUMEROS} />)

    for (const li of screen.getAllByRole('listitem')) {
      for (const classe of ['flex-row-reverse', 'justify-between', 'border-t', '@min-[18rem]/resumo:flex-col-reverse', '@min-[18rem]/resumo:border-l']) {
        expect(li.classList.contains(classe), classe).toBe(true)
      }
    }
  })

  it('o tamanho dos números acompanha a largura do contêiner (clamp com cqi), sem nada escondido', () => {
    const { container } = render(<ResumoDoDia itens={NUMEROS} />)

    for (const numero of container.querySelectorAll<HTMLElement>('[data-numero-do-dia]')) {
      expect([...numero.classList].some((c) => /^text-\[clamp\(\d+px,[\d.]+cqi,\d+px\)\]$/.test(c)), numero.className).toBe(true)
      expect([...numero.classList].some((c) => /^(lg:)?text-\[\d+px\]$/.test(c))).toBe(false)
    }
    expect(container.querySelector('[class*="overflow-hidden"], [class*="truncate"], .sr-only')).toBeNull()
  })
})

describe('DesdeQueVoceSaiu: o contrato de `hora` (R1-1)', () => {
  it('sem hora, um texto que termina em duração mantém o quando visível à direita e a duração no texto', () => {
    render(<DesdeQueVoceSaiu itens={[MAMADA_COM_DURACAO]} />)

    const li = screen.getByRole('listitem')
    expect(direita(li).textContent).toBe('07:50')
    expect(direita(li).getAttribute('aria-hidden')).toBeNull()
    expect(li.querySelector('p')!.textContent).toBe('Mamada, lado esquerdo, 18 min')
    // A duração não sai do texto visível nem vai para um enfeite à direita.
    expect(li.querySelector('p .sr-only')).toBeNull()
    expect(li.querySelector('[aria-hidden="true"]:not([data-avatar])')).toBeNull()
  })

  it('com hora, o mesmo texto mostra a hora à esquerda e a duração à direita', () => {
    render(<DesdeQueVoceSaiu itens={[{ ...MAMADA_COM_DURACAO, hora: '07:50' }]} />)

    const li = screen.getByRole('listitem')
    expect(within(fila(li)).getByText('07:50')).toBeTruthy()
    expect(direita(li).textContent).toBe('18 min')
    expect(li.querySelector('p')!.textContent).toBe('Mamada, lado esquerdo, 18 min')
  })

  it('texto sem duração: sem hora, o quando à direita; com hora, a hora à esquerda e nada repetido', () => {
    const sem = render(<DesdeQueVoceSaiu itens={[FRALDA]} />)
    expect(direita(screen.getByRole('listitem')).textContent).toBe('04:05')
    sem.unmount()

    render(<DesdeQueVoceSaiu itens={[{ ...FRALDA, hora: '04:05' }]} />)
    const li = screen.getByRole('listitem')
    expect(within(li).getAllByText('04:05')).toHaveLength(1)
    expect(direita(li).textContent).not.toBe('04:05')
  })

  it('em andamento: a pílula de mel com o tempo à direita, com e sem hora; com hora, a hora à esquerda', () => {
    const sem = render(<DesdeQueVoceSaiu itens={[SESSAO]} />)
    let li = screen.getByRole('listitem')
    expect(direita(li).textContent).toBe('38 min')
    expect(direita(li).classList.contains('bg-mel')).toBe(true)
    sem.unmount()

    render(<DesdeQueVoceSaiu itens={[{ ...SESSAO, hora: '03:50' }]} />)
    li = screen.getByRole('listitem')
    expect(direita(li).textContent).toBe('38 min')
    expect(direita(li).classList.contains('bg-mel')).toBe(true)
    expect(within(fila(li)).getByText('03:50')).toBeTruthy()
  })
})

describe('DesdeQueVoceSaiu: o texto inteiro ao alcance do toque e do teclado (R1-2)', () => {
  it('o texto da linha é um botão nativo (Enter e Espaço ativam), fechado, com o texto inteiro como nome e sem cópia', () => {
    render(<DesdeQueVoceSaiu itens={[NOTA_LONGA]} />)

    const li = screen.getByRole('listitem')
    const botao = screen.getByRole('button', { name: NOTA_LONGA.texto })
    expect(botao).toBe(controle(li))
    expect(botao.tagName).toBe('BUTTON')
    expect(botao.getAttribute('type')).toBe('button')
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    // Fechada, a linha diz o texto uma vez só (nenhuma cópia escondida ou visível).
    expect(li.textContent!.split(NOTA_LONGA.texto)).toHaveLength(2)
    expect(li.querySelector('[data-linha-aberta]')).toBeNull()
  })

  it('o toque abre o texto inteiro e o detalhe numa linha que quebra, embaixo da fileira; outro toque fecha', () => {
    render(<DesdeQueVoceSaiu itens={[NOTA_LONGA]} />)
    const li = screen.getByRole('listitem')
    const botao = controle(li)

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    const aberta = li.querySelector<HTMLElement>('[data-linha-aberta]')!
    expect(botao.getAttribute('aria-controls')).toBe(aberta.id)
    expect(aberta.textContent).toContain(NOTA_LONGA.texto)
    expect(aberta.textContent).toContain('Carla, avó')
    expect(aberta.classList.contains('whitespace-normal')).toBe(true)
    expect(aberta.className).not.toMatch(/truncate|absolute|fixed|shadow|rounded-cartao/)
    expect(fila(li).compareDocumentPosition(aberta) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(li.querySelector('[data-linha-aberta]')).toBeNull()
  })

  it('o teclado chega ao controle e a ativação (o clique que Enter e Espaço disparam no botão nativo) abre a linha', () => {
    render(<DesdeQueVoceSaiu itens={[NOTA_LONGA, FRALDA]} />)
    const [nota, fralda] = screen.getAllByRole('listitem')

    controle(fralda).focus()
    expect(document.activeElement).toBe(controle(fralda))
    fireEvent.keyDown(controle(fralda), { key: 'Enter' })
    fireEvent.click(controle(fralda))
    expect(controle(fralda).getAttribute('aria-expanded')).toBe('true')
    // Cada linha abre sozinha.
    expect(controle(nota).getAttribute('aria-expanded')).toBe('false')
  })

  it('o controle tem anel de foco visível e alvo de 44 px (56 px na madrugada, pela --alvo-toque)', () => {
    render(<DesdeQueVoceSaiu itens={[NOTA_LONGA]} />)

    const botao = controle(screen.getByRole('listitem'))
    for (const classe of ['alvo-toque', 'min-h-[max(44px,var(--alvo-toque))]', 'focus-visible:outline-2', 'focus-visible:outline-(--cor-foco)']) {
      expect(botao.classList.contains(classe), classe).toBe(true)
    }
  })

  it('aberta, a linha continua sem violações do axe', async () => {
    const { container } = render(<DesdeQueVoceSaiu itens={[NOTA_LONGA, { ...MAMADA_COM_DURACAO, hora: '07:50' }]} />)
    fireEvent.click(controle(screen.getAllByRole('listitem')[0]))

    expect(await violacoes(container)).toEqual([])
  })
})

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

  it('com a hora, cada linha fica numa linha só: hora e tipo à esquerda, a pílula da duração à direita', () => {
    const comHora = ITENS.map((item) => ({ ...item, hora: item.emAndamento ? '03:50' : item.quando }))
    render(<DesdeQueVoceSaiu itens={comHora} />)

    const linhas = screen.getAllByRole('listitem')
    for (const li of linhas) {
      expect(fila(li).classList.contains('whitespace-nowrap')).toBe(true)
      expect(controle(li).classList.contains('truncate')).toBe(true)
    }
    const sessao = linhas[1]
    expect(within(sessao).getByText('03:50')).toBeTruthy()
    expect(fila(sessao).lastElementChild!.textContent).toBe('38 min')
    // A hora não se repete à direita: ela já está à esquerda.
    expect(within(linhas[0]).getAllByText('04:05')).toHaveLength(1)
  })

  it('a lista não é um cartão: linhas com fio fino, sem fundo nem sombra', () => {
    render(<DesdeQueVoceSaiu itens={ITENS} />)

    const regiao = screen.getByRole('region', { name: 'Desde que você saiu' })
    expect(regiao.className).not.toMatch(/bg-|sombra|rounded-cartao/)
    for (const li of screen.getAllByRole('listitem')) expect(li.classList.contains('border-b')).toBe(true)
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

  it('compacto: o mesmo botão, menor, com alvo de toque e a linha da última mamada ao lado', () => {
    render(<BotaoIniciarMamada compacto aoIniciar={() => undefined} ultima="Última mamada às 07:50, com Juliana" />)

    const botao = screen.getByRole('button', { name: 'Iniciar mamada' })
    for (const classe of ['rounded-full', 'bg-mel', 'alvo-toque', 'size-[7rem]']) expect(botao.classList.contains(classe), classe).toBe(true)
    expect(botao.parentElement!.classList.contains('flex-row')).toBe(true)
  })

  it('compacto: a linha quebra ao lado ou abaixo do círculo (zoom de texto 200%, sem rolagem horizontal)', () => {
    render(<BotaoIniciarMamada compacto aoIniciar={() => undefined} ultima="Última mamada às 07:50, com Juliana" />)

    const botao = screen.getByRole('button', { name: 'Iniciar mamada' })
    expect(botao.parentElement!.classList.contains('flex-wrap')).toBe(true)
    expect(botao.classList.contains('shrink-0')).toBe(true)
    expect(screen.getByText('Última mamada às 07:50, com Juliana').classList.contains('min-w-0')).toBe(true)
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
