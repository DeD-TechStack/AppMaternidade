import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { temBanco } from './prototipo/banco.ts'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// O Hoje redesenhado sobre o Campo de mel (DESIGN.md 4, telas do app): o título com a segunda linha em
// itálico, o cartão de mel da sessão, "Desde que você saiu", os números do dia, "Últimos" e a barra
// Registrar fora do <main>. O jsdom não mede layout: aqui vale a estrutura, o texto e o comportamento;
// as posições e os tamanhos são das capturas (.oc/olhar).

const INSTANTE = new Date('2026-11-05T10:00:00')
const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })
const semSessao = (): EstadoPrototipo => ({ ...claro(), sessao: null })

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!
const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!
const ultimos = (container: HTMLElement) => container.querySelector<HTMLElement>('main #ultimos')!
const barra = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-barra-registrar]')!
const regiao = (nome: string) => screen.getByRole('region', { name: nome })

describe('Hoje: a ordem dos blocos', () => {
  it('(claro) cartão, Hoje até agora (no topo da área da lista), Desde que você saiu e Últimos, nessa ordem; a barra vem depois do main', () => {
    const { container } = renderizarRota('/app/hoje', { estadoInicial: claro() })

    const ordem = [cartao(container), regiao('Hoje até agora'), regiao('Desde que você saiu'), ultimos(container)]
    // Os números e o histórico formam uma área só (a coluna da direita em 1440), e os números abrem essa área.
    const area = container.querySelector<HTMLElement>('main [data-area-lista]')!
    expect(area.firstElementChild).toBe(regiao('Hoje até agora'))
    expect(area.contains(regiao('Desde que você saiu'))).toBe(true)
    for (let i = 1; i < ordem.length; i++) {
      expect(ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    }
    expect(principal(container).nextElementSibling).toBe(barra(container))
    // Depois da barra, só o aviso de demonstração (quando falta o banco) e o rodapé.
    const depois = barra(container).nextElementSibling!
    expect(depois.matches(temBanco() ? '[data-rodape]' : '[data-aviso-tela]')).toBe(true)
    expect(principal(container).previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
  })

  it('(madrugada) o botão "Iniciar mamada" vem logo depois do cartão e antes da lista', () => {
    const { container } = renderizarRota('/app/hoje', { estadoInicial: madrugada() })

    const botao = screen.getByRole('button', { name: 'Iniciar mamada' })
    expect(principal(container).contains(botao)).toBe(true)
    expect(cartao(container).compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(botao.compareDocumentPosition(regiao('Desde que você saiu')) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('(madrugada) o histórico vem antes dos números do dia, para a primeira linha subir no celular', () => {
    renderizarRota('/app/hoje', { estadoInicial: madrugada() })

    expect(regiao('Desde que você saiu').compareDocumentPosition(regiao('Hoje até agora')) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('(claro) não há botão redondo de mamada: ele é só da madrugada', () => {
    renderizarRota('/app/hoje', { estadoInicial: claro() })

    expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
  })

  it('a casca é só cabeçalho, main, barra, o aviso (sem banco) e rodapé, sem coluna única', () => {
    const { container } = renderizarRota('/app/hoje')

    expect([...container.querySelector('.sb-casca')!.children].map((e) => e.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      'section',
      ...(temBanco() ? [] : ['section']),
      'footer',
    ])
    expect(container.querySelector('aside, .coluna-app, .nav-inferior, .barra-inferior')).toBeNull()
  })

  it('a data do dia, ao lado do título em telas largas, é uma Etiqueta da base', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INSTANTE)
    const { container } = renderizarRota('/app/hoje')

    const data = container.querySelector<HTMLElement>('[data-data-do-dia]')!
    expect(data.classList.contains('lg:block')).toBe(true)
    const etiqueta = data.querySelector('.sb-etiqueta')!
    expect(etiqueta.textContent).toBe('Quinta-feira, 5 de novembro')
  })

  it('nenhum "Protótipo" nem "dados de exemplo" dentro do main nem da barra, nos dois temas', () => {
    for (const estado of [claro(), madrugada()]) {
      const { container, unmount } = renderizarRota('/app/hoje', { estadoInicial: estado })
      expect(principal(container).textContent).not.toMatch(/protótipo|dados de exemplo/i)
      expect(barra(container).textContent).not.toMatch(/protótipo|dados de exemplo/i)
      unmount()
    }
  })

  it('o redesenho não usa as classes antigas ha-* nas telas', () => {
    const { container } = renderizarRota('/app/hoje')

    const antigas = [...container.querySelectorAll('main [class], [data-barra-registrar] [class]')].flatMap((e) =>
      [...e.classList].filter((c) => c.startsWith('ha-')),
    )
    expect(antigas).toEqual([])
  })
})

describe('Hoje: o título', () => {
  it('o h1 é "Hoje", único, focável por programa, e "Heloísa, 3 meses" é a segunda linha em itálico', () => {
    renderizarRota('/app/hoje')

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Hoje')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(h1.getAttribute('tabindex')).toBe('-1')
    expect(h1.classList.contains('cm-h1')).toBe(true)
    const linha = screen.getByText('Heloísa, 3 meses')
    expect(linha.tagName).toBe('P')
    expect(linha.classList.contains('italic')).toBe(true)
    expect(h1.nextElementSibling).toBe(linha)
  })
})

describe('Hoje: o cartão da sessão', () => {
  it('com sessão: "Em andamento", o tipo, o tempo correndo, "por Bruno", Encerrar e Ver sessão', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INSTANTE)
    const { container } = renderizarRota('/app/hoje')

    const bloco = cartao(container)
    expect(bloco.tagName).toBe('SECTION')
    expect(bloco.getAttribute('tabindex')).toBe('-1')
    const titulo = within(bloco).getByRole('heading', { name: 'Em andamento' })
    expect(bloco.getAttribute('aria-labelledby')).toBe(titulo.id)
    expect(within(bloco).getByText('Sono', { selector: 'p' })).toBeTruthy()
    expect(within(bloco).getByRole('timer').textContent).toBe('1:12:00')
    expect(within(bloco).getByText('por Bruno')).toBeTruthy()
    expect(within(bloco).getByRole('button', { name: 'Encerrar' })).toBeTruthy()
    expect(within(bloco).getByRole('link', { name: 'Ver sessão' }).getAttribute('href')).toBe('/app/sessao')
  })

  it('o tempo do cartão corre a cada segundo, a partir do início', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INSTANTE)
    const { container } = renderizarRota('/app/hoje')

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(within(cartao(container)).getByRole('timer').textContent).toBe('1:12:05')
  })

  it('o "Ver sessão" é um só, um <a> dentro do main', () => {
    const { container } = renderizarRota('/app/hoje')

    const links = screen.getAllByRole('link', { name: 'Ver sessão' })
    expect(links).toHaveLength(1)
    expect(links[0].tagName).toBe('A')
    expect(principal(container).contains(links[0])).toBe(true)
  })

  it('o Encerrar é a pílula primária (cacau de dia), e o Ver sessão é o contorno', () => {
    const { container } = renderizarRota('/app/hoje')

    const encerrar = within(cartao(container)).getByRole('button', { name: 'Encerrar' })
    expect(encerrar.matches('[data-botao="primario"]')).toBe(true)
    expect(encerrar.classList.contains('alvo-toque')).toBe(true)
    const ver = within(cartao(container)).getByRole('link', { name: 'Ver sessão' })
    expect(ver.classList.contains('cm-botao-contorno')).toBe(true)
    expect(cartao(container).querySelectorAll('button, a')).toHaveLength(2)
  })

  it('sem sessão: "Nenhuma sessão em andamento." e como começar, sem botões nem links', () => {
    const { container } = renderizarRota('/app/hoje', { estadoInicial: semSessao() })

    const bloco = cartao(container)
    expect(within(bloco).getByRole('heading', { name: 'Em andamento' })).toBeTruthy()
    expect(within(bloco).getByText('Nenhuma sessão em andamento.')).toBeTruthy()
    expect(bloco.querySelectorAll('button, a')).toHaveLength(0)
  })

  it('encerrar leva o foco ao próprio cartão, que passa a dizer "Nenhuma sessão em andamento."', () => {
    const { container } = renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    expect(document.activeElement).toBe(cartao(container))
    expect(cartao(container).textContent).toContain('Nenhuma sessão em andamento.')
    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada: 1 h 12 min')
  })
})

describe('Hoje: Desde que você saiu', () => {
  it('lista a sessão de Bruno, a fralda de Bruno, a mamada de Juliana e o recado da avó, com avatares e horas', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INSTANTE)
    renderizarRota('/app/hoje')

    const lista = within(regiao('Desde que você saiu')).getByRole('list')
    const linhas = within(lista).getAllByRole('listitem')
    expect(linhas.map((li) => li.querySelector('p')!.textContent)).toEqual([
      'Fralda, xixi',
      'Sono em andamento',
      'Mamada, lado esquerdo, 18 min',
      'Nota: pomada só à noite.',
    ])
    expect(linhas.map((li) => li.querySelectorAll('p')[1].textContent)).toEqual([
      'Bruno, pai',
      'Bruno, desde 08:48',
      'Juliana, mãe',
      'Carla, avó',
    ])
    expect(within(linhas[0]).getByText('09:10')).toBeTruthy()
    expect(within(linhas[1]).getByText('1 h 12 min')).toBeTruthy()
    expect(within(linhas[2]).getByText('07:50')).toBeTruthy()
    for (const li of linhas) expect(li.querySelector('[data-avatar]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('cada linha cabe numa linha só: hora e tipo à esquerda, duração à direita; o texto inteiro fica acessível', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INSTANTE)
    renderizarRota('/app/hoje')

    const linhas = within(within(regiao('Desde que você saiu')).getByRole('list')).getAllByRole('listitem')
    for (const li of linhas) {
      const fila = li.querySelector<HTMLElement>('[data-fila]')!
      expect(fila.classList.contains('whitespace-nowrap')).toBe(true)
      const tipo = li.querySelector('p')!
      const botao = tipo.querySelector('button[data-abrir-linha]')!
      expect(botao.classList.contains('truncate')).toBe(true)
      expect(tipo.getAttribute('title')).toBe(tipo.textContent)
    }
    // A mamada: 07:50 à esquerda, "18 min" à direita (enfeite), e o parágrafo diz tudo.
    const mamada = linhas[2]
    expect(mamada.querySelector('p')!.textContent).toBe('Mamada, lado esquerdo, 18 min')
    const filhos = [...mamada.querySelector('[data-fila]')!.children]
    const duracao = within(mamada).getByText('18 min', { selector: '[aria-hidden="true"]' })
    expect(filhos.indexOf(within(mamada).getByText('07:50'))).toBeLessThan(filhos.indexOf(duracao))
    expect(filhos.at(-1)).toBe(duracao)
  })

  it('a duração da sessão na lista sobe a cada minuto e a linha some ao encerrar', () => {
    vi.useFakeTimers()
    vi.setSystemTime(INSTANTE)
    renderizarRota('/app/hoje')

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('1 h 13 min')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    expect(within(regiao('Desde que você saiu')).queryByText('Sono em andamento')).toBeNull()
  })
})

describe('Hoje: os números do dia', () => {
  it('três figuras: Mamadas 6, Fraldas 5 e Sono 9 h 20', () => {
    renderizarRota('/app/hoje')

    const itens = within(regiao('Hoje até agora')).getAllByRole('listitem')
    expect(itens.map((li) => [...li.querySelectorAll('span')].map((s) => s.textContent))).toEqual([
      ['6', 'Mamadas'],
      ['5', 'Fraldas'],
      ['9 h 20', 'Sono'],
    ])
  })

  it('a fralda soma uma fralda e o Desfazer devolve o número', () => {
    renderizarRota('/app/hoje')
    const fraldas = () => within(regiao('Hoje até agora')).getAllByRole('listitem')[1].querySelector('span')!.textContent

    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
    expect(fraldas()).toBe('6')

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(fraldas()).toBe('5')
  })
})

describe('Hoje: Últimos', () => {
  it('é a seção #ultimos com o h2 "Últimos" e três linhas: tempo e legenda, nessa ordem no DOM', () => {
    const { container } = renderizarRota('/app/hoje')

    const secao = ultimos(container)
    expect(secao.tagName).toBe('SECTION')
    const titulo = within(secao).getByRole('heading', { name: 'Últimos' })
    expect(secao.getAttribute('aria-labelledby')).toBe(titulo.id)
    const itens = [...secao.querySelectorAll('.sb-numeros-item')]
    expect(itens.map((i) => [...i.querySelectorAll('p')].map((p) => p.textContent).join(' '))).toEqual([
      '2 h 10 Mamada, tempo desde o registro',
      '50 min Fralda, tempo desde o registro',
      '17:30 Tummy time, ontem',
    ])
  })

  it('com menos de 3 registros, as linhas que faltam ficam com o travessão', () => {
    const base = claro()
    const { container } = renderizarRota('/app/hoje', { estadoInicial: { ...base, ultimos: base.ultimos.slice(0, 1) } })

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens.map((i) => i.querySelector('[data-numero]')!.textContent)).toEqual(['2 h 10', '—', '—'])
  })

  it('um registro novo entra em primeiro e mostra "agora"', () => {
    const { container } = renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mamadeira' }))

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens.map((i) => i.querySelector('[data-numero]')!.textContent)).toEqual(['agora', '2 h 10', '50 min'])
  })
})

describe('Hoje: a barra Registrar fica fora do main e é a única coisa fixa embaixo', () => {
  it('uma só barra, com os 4 botões, a classe registro-rapido e a região de status única', () => {
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelectorAll('[data-barra-registrar]')).toHaveLength(1)
    expect(container.querySelectorAll('.registro-rapido')).toHaveLength(1)
    expect(principal(container).contains(barra(container))).toBe(false)
    expect(within(barra(container)).getAllByRole('button').map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(barra(container).contains(screen.getByRole('status'))).toBe(true)
  })

  it('o botão da sessão em andamento fica marcado (data-ativo): Sono, com o sono de Bruno', () => {
    renderizarRota('/app/hoje')

    expect(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }).hasAttribute('data-ativo')).toBe(true)
    expect(screen.getByRole('button', { name: 'Iniciar mamada de Heloísa' }).hasAttribute('data-ativo')).toBe(false)
  })

  it('Fechar e Desfazer devolvem o foco ao primeiro botão da barra (Sono)', () => {
    const { container } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Observação' }))
    const sono = within(barra(container)).getByRole('button', { name: 'Iniciar sono de Heloísa' })

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(document.activeElement).toBe(sono)

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mamadeira' }))
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(document.activeElement).toBe(sono)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('Sono com sessão em andamento abre a que existe, com o aviso', async () => {
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }))

    await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
  })

  it('Tummy time pelo Mais, sem sessão, começa a sessão e abre a Sessão', async () => {
    renderizarRota('/app/hoje', { estadoInicial: semSessao() })

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar tummy time de Heloísa' }))

    await screen.findByRole('heading', { level: 1, name: 'Tummy time de Heloísa' })
    expect(screen.getByText(/por Juliana$/)).toBeTruthy()
  })
})

describe('Hoje: madrugada', () => {
  it('sem sessão, "Iniciar mamada" começa uma mamada por Juliana e abre a Sessão', async () => {
    renderizarRota('/app/hoje', { estadoInicial: { ...semSessao(), madrugada: true } })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada' }))

    await screen.findByRole('heading', { level: 1, name: 'Mamada de Heloísa' })
    expect(screen.getByText(/por Juliana$/)).toBeTruthy()
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('com o sono em andamento, "Iniciar mamada" abre o sono com o aviso', async () => {
    renderizarRota('/app/hoje', { estadoInicial: madrugada() })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada' }))

    await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
  })

  it('com o sono em andamento a sessão é o destaque: o botão redondo fica na versão compacta; sem sessão, grande', () => {
    const comSono = renderizarRota('/app/hoje', { estadoInicial: madrugada() })
    const pequeno = screen.getByRole('button', { name: 'Iniciar mamada' })
    expect(pequeno.closest('[data-iniciar-mamada]')!.hasAttribute('data-compacto')).toBe(true)
    expect(pequeno.classList.contains('size-[7rem]')).toBe(true)
    comSono.unmount()

    renderizarRota('/app/hoje', { estadoInicial: { ...semSessao(), madrugada: true } })
    const grande = screen.getByRole('button', { name: 'Iniciar mamada' })
    expect(grande.closest('[data-iniciar-mamada]')!.hasAttribute('data-compacto')).toBe(false)
    expect(grande.classList.contains('size-[13rem]')).toBe(true)
  })

  it('no celular, com o sono em andamento, o histórico sobe: grade com 20 px entre blocos e 16 px sob o título (antes 32 e 24)', () => {
    const { container } = renderizarRota('/app/hoje', { estadoInicial: madrugada() })

    const grade = cartao(container).parentElement!
    expect(grade.contains(regiao('Desde que você saiu'))).toBe(true)
    for (const classe of ['gap-5', 'mt-4', 'lg:mt-10', 'lg:gap-y-12']) expect(grade.classList.contains(classe), classe).toBe(true)
    for (const classe of ['gap-8', 'mt-6']) expect(grade.classList.contains(classe), classe).toBe(false)
    // Nenhum alvo encolhe: o círculo continua com 7 rem e o Encerrar com o alvo do app.
    expect(screen.getByRole('button', { name: 'Iniciar mamada' }).classList.contains('size-[7rem]')).toBe(true)
  })

  it('o ajuste é só da madrugada com sessão: de dia a grade mantém 40 px entre blocos', () => {
    const { container } = renderizarRota('/app/hoje', { estadoInicial: claro() })

    const grade = cartao(container).parentElement!
    for (const classe of ['gap-10', 'mt-6']) expect(grade.classList.contains(classe), classe).toBe(true)
  })

  it('com uma mamada em andamento o botão redondo some (o cartão já mostra a mamada)', () => {
    const base = madrugada()
    renderizarRota('/app/hoje', {
      estadoInicial: { ...base, sessao: { tipo: 'mamada', inicio: Date.now() - 60_000, pessoa: 'Juliana' } },
    })

    expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
  })
})

describe('Hoje: o foco ao chegar', () => {
  it('chegando pela URL o foco não se move', () => {
    renderizarRota('/app/hoje')

    expect(document.activeElement).toBe(document.body)
  })

  it('"Voltar para Hoje" (Sessão vazia) leva o foco ao h1', async () => {
    renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    fireEvent.click(screen.getByRole('link', { name: 'Voltar para Hoje' }))

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await waitFor(() => expect(document.activeElement).toBe(h1))
  })

  it('encerrar na Sessão leva ao Hoje com o cartão focado', async () => {
    const { container } = renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await waitFor(() => expect(document.activeElement).toBe(cartao(container)))
  })
})
