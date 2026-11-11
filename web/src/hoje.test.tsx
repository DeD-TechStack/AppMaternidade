import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { temBanco } from './prototipo/banco.ts'
import { ID_BEBE, semSessaoEmAndamento } from './teste/rotina.fixture.ts'
import { aguardarCarga, renderizarRotaPronta } from './teste/renderizarRota.tsx'

// O Hoje com os dados da rotina (MAT-38a) sobre o Campo de mel (DESIGN.md 4, telas do app): o título com a
// segunda linha em itálico, o cartão de mel da sessão, "Para você saber", "Desde o seu último registro", os
// números do dia, "Últimos" e a barra Registrar fora do <main>. O jsdom não mede layout: aqui vale a
// estrutura, o texto e o comportamento. O relógio é o falso, parado às 10:00 de 5/11/2026 (hora do aparelho).

const INSTANTE = new Date('2026-11-05T10:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!
const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!
const ultimos = (container: HTMLElement) => container.querySelector<HTMLElement>('main #ultimos')!
const barra = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-barra-registrar]')!
const regiao = (nome: string) => screen.getByRole('region', { name: nome })
const colunasDeUltimos = (container: HTMLElement) =>
  [...ultimos(container).querySelectorAll('.sb-numeros-item')].map((item) =>
    [...item.querySelectorAll('p')].map((p) => p.textContent).join(' '),
  )

describe('Hoje: a ordem dos blocos', () => {
  it('(claro) cartão, Para você saber, Desde o seu último registro, Hoje até agora e Últimos, nessa ordem; a barra vem depois do main', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const ordem = [
      cartao(container),
      regiao('Para você saber'),
      regiao('Desde o seu último registro, às 07:50'),
      regiao('Hoje até agora'),
      ultimos(container),
    ]
    for (let i = 1; i < ordem.length; i++) {
      expect(ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `bloco ${i}`).not.toBe(0)
    }
    expect(principal(container).nextElementSibling).toBe(barra(container))
    // Depois da barra, só o aviso de demonstração (quando falta o banco) e o rodapé.
    const depois = barra(container).nextElementSibling!
    expect(depois.matches(temBanco() ? '[data-rodape]' : '[data-aviso-tela]')).toBe(true)
    expect(principal(container).previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
  })

  it('(madrugada) o botão "Iniciar mamada" vem logo depois do cartão e antes das notas', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { madrugada: true })

    const botao = screen.getByRole('button', { name: 'Iniciar mamada' })
    expect(principal(container).contains(botao)).toBe(true)
    expect(cartao(container).compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(botao.compareDocumentPosition(regiao('Para você saber')) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(screen.getByText('Última mamada às 07:32, com Juliana')).toBeTruthy()
  })

  it('(claro) não há botão redondo de mamada: ele é só da madrugada', async () => {
    await renderizarRotaPronta('/app/hoje')

    expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
  })

  it('a casca é só cabeçalho, main, barra, o aviso (sem banco) e rodapé, sem coluna única', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    expect([...container.querySelector('.sb-casca')!.children].map((e) => e.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      'section',
      ...(temBanco() ? [] : ['section']),
      'footer',
    ])
    expect(container.querySelector('aside, .coluna-app, .nav-inferior, .barra-inferior')).toBeNull()
  })

  it('a data do dia, ao lado do título em telas largas, é uma Etiqueta da base', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const data = container.querySelector<HTMLElement>('[data-data-do-dia]')!
    expect(data.classList.contains('lg:block')).toBe(true)
    expect(data.querySelector('.sb-etiqueta')!.textContent).toBe('Quinta-feira, 5 de novembro')
  })

  it('nenhum "Protótipo" nem "dados de exemplo" na tela, nem a faixa antiga, nos dois temas', async () => {
    for (const madrugada of [false, true]) {
      const { container, unmount } = await renderizarRotaPronta('/app/hoje', { madrugada })
      expect(principal(container).textContent).not.toMatch(/protótipo|dados de exemplo|dados fictícios/i)
      expect(barra(container).textContent).not.toMatch(/protótipo|dados de exemplo/i)
      expect(document.body.textContent).not.toContain('Protótipo: dados fictícios, nada é salvo.')
      unmount()
    }
  })

  it('o redesenho não usa as classes antigas ha-* nas telas', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const antigas = [...container.querySelectorAll('main [class], [data-barra-registrar] [class]')].flatMap((e) =>
      [...e.classList].filter((c) => c.startsWith('ha-')),
    )
    expect(antigas).toEqual([])
  })
})

describe('Hoje: o título e o bebê ativo', () => {
  it('o h1 é "Hoje", único, focável por programa, e "Heloísa, 3 meses" é a segunda linha em itálico', async () => {
    await renderizarRotaPronta('/app/hoje')

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

  it('com um só bebê o texto não é botão; com mais de um vira o botão do seletor, com o mesmo texto', async () => {
    const um = await renderizarRotaPronta('/app/hoje')
    expect(screen.queryByRole('button', { name: /Heloísa, 3 meses/ })).toBeNull()
    um.unmount()

    await renderizarRotaPronta('/app/hoje', {
      bebesExtras: [{ id: 'c2222222-2222-4222-8222-222222222222', nome: 'Zélia', nascimento: '2026-10-05', estado: 'ativo' }],
    })
    const botao = screen.getByRole('button', { name: 'Heloísa, 3 meses' })
    expect(botao.getAttribute('aria-expanded')).toBe('false')
  })

  it('com o fuso do aparelho diferente do da família, o aviso diz os dois', async () => {
    await renderizarRotaPronta('/app/hoje', { fusoDaFamilia: 'Asia/Tokyo' })

    const aparelho = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (aparelho === 'Asia/Tokyo') return
    expect(screen.getByText(`Horários no fuso deste aparelho (${aparelho}). O dia segue o fuso da família (Asia/Tokyo).`)).toBeTruthy()
  })
})

describe('Hoje: o cartão da sessão', () => {
  it('com sessão: "Em andamento", o tipo, o tempo correndo, "por Bruno", Encerrar e Ver sessão com o id', async () => {
    const { container, fixture } = await renderizarRotaPronta('/app/hoje')

    const bloco = cartao(container)
    expect(bloco.tagName).toBe('SECTION')
    expect(bloco.getAttribute('tabindex')).toBe('-1')
    const titulo = within(bloco).getByRole('heading', { name: 'Em andamento' })
    expect(bloco.getAttribute('aria-labelledby')).toBe(titulo.id)
    expect(within(bloco).getByText('Sono', { selector: 'p' })).toBeTruthy()
    expect(within(bloco).getByRole('timer').textContent).toBe('1:12:00')
    expect(within(bloco).getByText('por Bruno')).toBeTruthy()
    expect(within(bloco).getByRole('button', { name: 'Encerrar' })).toBeTruthy()
    const emAndamento = fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    expect(within(bloco).getByRole('link', { name: 'Ver sessão' }).getAttribute('href')).toBe(`/app/sessao?id=${emAndamento.id}`)
  })

  it('o tempo do cartão corre a cada segundo, a partir do início', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(within(cartao(container)).getByRole('timer').textContent).toBe('1:12:05')
  })

  it('o "Ver sessão" do cartão é um só, um <a> dentro do main', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const links = screen.getAllByRole('link', { name: 'Ver sessão' })
    expect(links).toHaveLength(1)
    expect(links[0].tagName).toBe('A')
    expect(principal(container).contains(links[0])).toBe(true)
  })

  it('o Encerrar é a pílula primária (cacau de dia), e o Ver sessão é o contorno', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const encerrar = within(cartao(container)).getByRole('button', { name: 'Encerrar' })
    expect(encerrar.matches('[data-botao="primario"]')).toBe(true)
    expect(encerrar.classList.contains('alvo-toque')).toBe(true)
    const ver = within(cartao(container)).getByRole('link', { name: 'Ver sessão' })
    expect(ver.classList.contains('cm-botao-contorno')).toBe(true)
    expect(cartao(container).querySelectorAll('button, a')).toHaveLength(2)
  })

  it('sem sessão: "Nenhuma sessão em andamento." e como começar, sem botões nem links', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { ajustarRotina: semSessaoEmAndamento })

    const bloco = cartao(container)
    expect(within(bloco).getByRole('heading', { name: 'Em andamento' })).toBeTruthy()
    expect(within(bloco).getByText('Nenhuma sessão em andamento.')).toBeTruthy()
    expect(bloco.querySelectorAll('button, a')).toHaveLength(0)
  })

  it('encerrar leva o foco ao próprio cartão, que passa a dizer "Nenhuma sessão em andamento."', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    expect(document.activeElement).toBe(cartao(container))
    await aguardarCarga()

    expect(cartao(container).textContent).toContain('Nenhuma sessão em andamento.')
    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada: 1 h 12 min')
  })
})

describe('Hoje: Para você saber e Desde o seu último registro', () => {
  it('Para você saber traz a nota em destaque, com o autor e a hora', async () => {
    await renderizarRotaPronta('/app/hoje')

    const nota = within(regiao('Para você saber'))
    expect(nota.getByText('Pomada só à noite.')).toBeTruthy()
    expect(nota.getByText('Carla, 06:40')).toBeTruthy()
  })

  it('a nota sem destaque (vencido) não aparece, e sem nota em destaque o texto diz isso', async () => {
    await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: (f) => ({ ...f, notas: f.notas.map((n) => ({ ...n, destaqueAte: new Date(Date.now() - 60_000).toISOString() })) }),
    })

    expect(screen.queryByText('Pomada só à noite.')).toBeNull()
    expect(within(regiao('Para você saber')).getByText('Nenhuma nota em destaque.')).toBeTruthy()
  })

  it('a hora do marco é o recebido_em do último registro de Juliana; os novos são de outras pessoas, do mais recente ao mais antigo', async () => {
    await renderizarRotaPronta('/app/hoje')

    const lista = within(regiao('Desde o seu último registro, às 07:50')).getAllByRole('listitem')
    expect(lista.map((li) => li.querySelector('p')!.textContent)).toEqual(['Fralda, Xixi', 'Sono, em andamento'])
    expect(lista.map((li) => li.querySelectorAll('p')[1].textContent)).toEqual(['por Bruno', 'por Bruno'])
    expect(within(lista[0]).getByText('09:10')).toBeTruthy()
    expect(within(lista[1]).getByText('08:48')).toBeTruthy()
    for (const li of lista) expect(li.querySelector('[data-avatar]')!.getAttribute('aria-hidden')).toBe('true')
    // O lugar da marca de envio só existe quando alguém passa a marca (a MAT-41).
    expect(document.querySelector('[data-marca-envio]')).toBeNull()
  })

  it('sem registro de outra pessoa depois do marco: "Nada novo desde o seu último registro."; sem marco, o bloco não aparece', async () => {
    const nada = await renderizarRotaPronta('/app/hoje', {
      sessao: 'bruno',
      ajustarRotina: (f) => ({ ...f, registros: f.registros.filter((r) => r.criadoPor === '22222222-2222-4222-8222-222222222222') }),
    })
    expect(screen.getByText('Nada novo desde o seu último registro.')).toBeTruthy()
    nada.unmount()

    await renderizarRotaPronta('/app/hoje', { semRegistros: true })
    expect(screen.queryByRole('region', { name: /Desde o seu último registro/ })).toBeNull()
  })
})

describe('Hoje: os números do dia', () => {
  it('três figuras: Mamadas (sessões e mamadeiras), Fraldas e Sono, só do dia da família', async () => {
    await renderizarRotaPronta('/app/hoje')

    const itens = within(regiao('Hoje até agora')).getAllByRole('listitem')
    expect(itens.map((li) => [...li.querySelectorAll('span')].map((s) => s.textContent))).toEqual([
      ['3', 'Mamadas'],
      ['3', 'Fraldas'],
      ['4 h 20', 'Sono'],
    ])
  })

  it('a fralda registrada soma uma fralda e o Desfazer devolve o número', async () => {
    await renderizarRotaPronta('/app/hoje')
    const fraldas = () => within(regiao('Hoje até agora')).getAllByRole('listitem')[1].querySelector('span')!.textContent

    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))
    await aguardarCarga()
    expect(fraldas()).toBe('4')

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    await aguardarCarga()
    expect(fraldas()).toBe('3')
  })

  it('com registros demais para somar, no lugar dos totais o texto diz isso', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: (f) => ({
        ...f,
        registros: [
          ...f.registros,
          ...Array.from({ length: 501 }, (_, i) => ({ ...f.registros[1], id: `d0000000-0000-7000-8000-${String(1000 + i).padStart(12, '0')}`, inicio: new Date(Date.now() - (i + 1) * 1000).toISOString() })),
        ],
      }),
    })

    expect(within(regiao('Hoje até agora')).getByText('Há registros demais para somar aqui.')).toBeTruthy()
    expect(container.querySelector('[data-resumo] li')).toBeNull()
  })
})

describe('Hoje: Últimos', () => {
  it('é a seção #ultimos com o h2 "Últimos" e uma coluna por tipo concluído, do mais recente ao mais antigo', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const secao = ultimos(container)
    expect(secao.tagName).toBe('SECTION')
    const titulo = within(secao).getByRole('heading', { name: 'Últimos' })
    expect(secao.getAttribute('aria-labelledby')).toBe(titulo.id)
    expect(colunasDeUltimos(container)).toEqual([
      '50 min Fralda, tempo desde o registro',
      '2 h 10 Mamada, tempo desde o registro',
      '3 h 20 Sono, tempo desde o registro',
      '8 h Mamadeira, tempo desde o registro',
      '17:30 Tummy time, ontem',
    ])
  })

  it('a sessão em andamento não entra, e o último concluído do mesmo tipo continua aparecendo', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    expect(colunasDeUltimos(container).some((coluna) => coluna.includes('Sono'))).toBe(true)
    expect(colunasDeUltimos(container).some((coluna) => coluna.startsWith('1 h 12'))).toBe(false)
  })

  it('com menos de 3 tipos, as linhas que faltam ficam com o travessão', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: (f) => ({ ...f, registros: f.registros.filter((r) => r.tipo === 'fralda' && r.criadoPor === '22222222-2222-4222-8222-222222222222') }),
    })

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens.map((i) => i.querySelector('[data-numero]')!.textContent)).toEqual(['50 min', '—', '—'])
  })

  it('sem nenhum registro: "Nenhum registro hoje. Toque em um botão abaixo para começar."', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { semRegistros: true })

    expect(ultimos(container).textContent).toContain('Nenhum registro hoje. Toque em um botão abaixo para começar.')
  })

  it('só com uma sessão em andamento: "Nenhum registro concluído ainda."', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: (f) => ({ ...f, registros: f.registros.filter((r) => r.fim === null && r.tipo === 'sono') }),
    })

    expect(ultimos(container).textContent).toContain('Nenhum registro concluído ainda.')
  })

  it('um registro novo entra em primeiro e mostra "agora"', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mamadeira' }))
    await aguardarCarga()

    expect(colunasDeUltimos(container)[0]).toBe('agora Mamadeira')
  })
})

describe('Hoje: a barra Registrar fica fora do main e é a única coisa fixa embaixo', () => {
  it('uma só barra, com os 4 botões, a classe registro-rapido e a região de status única', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    expect(container.querySelectorAll('[data-barra-registrar]')).toHaveLength(1)
    expect(container.querySelectorAll('.registro-rapido')).toHaveLength(1)
    expect(principal(container).contains(barra(container))).toBe(false)
    expect(within(barra(container)).getAllByRole('button').map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(barra(container).contains(screen.getByRole('status'))).toBe(true)
  })

  it('o botão da sessão em andamento fica marcado (data-ativo): Sono, com o sono de Bruno', async () => {
    await renderizarRotaPronta('/app/hoje')

    expect(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }).hasAttribute('data-ativo')).toBe(true)
    expect(screen.getByRole('button', { name: 'Iniciar mamada de Heloísa' }).hasAttribute('data-ativo')).toBe(false)
  })

  it('+ Mais tem Tummy time, Mamadeira, Alimentação sólida, Observação e "Outro horário…"', async () => {
    await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))

    const grupo = screen.getByRole('group', { name: 'Outros registros de Heloísa' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tummy time',
      'Mamadeira',
      'Alimentação sólida',
      'Observação',
      'Outro horário…',
    ])
  })

  it('Fralda abre Xixi, Cocô, Ambos e Cancelar, e escolher grava com a confirmação exata', async () => {
    await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
    const grupo = screen.getByRole('group', { name: 'Fralda de Heloísa' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Xixi', 'Cocô', 'Ambos', 'Cancelar'])
    fireEvent.click(within(grupo).getByRole('button', { name: 'Cocô' }))
    await aguardarCarga()

    const status = screen.getByRole('status')
    expect(status.querySelector('p')!.textContent).toBe('Fralda registrada: Cocô')
    expect(within(status).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar'])
  })

  it('Mamadeira grava sem detalhes, e a confirmação ganha o botão Detalhes', async () => {
    await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mamadeira' }))
    await aguardarCarga()

    const status = screen.getByRole('status')
    expect(status.querySelector('p')!.textContent).toBe('Mamadeira registrada')
    expect(within(status).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Detalhes', 'Fechar'])
  })

  it('Observação abre o formulário novo de observação, e "Outro horário…" abre o formulário com a escolha do tipo', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Observação' }))
    await aguardarCarga()
    expect(roteador.state.location.pathname + roteador.state.location.search).toBe('/app/registro/novo?tipo=observacao')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Novo registro')
    expect(screen.getByRole('textbox', { name: 'Texto' })).toBeTruthy()
  })

  it('Sono com sessão em andamento abre a que existe, com o aviso, e não grava outra', async () => {
    const { fixture, rotina } = await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
    const abertas = await rotina.emAndamento(ID_BEBE)
    expect(abertas.ok && abertas.valor.itens).toHaveLength(fixture.registros.filter((r) => r.tipo === 'sono' && r.fim === null).length)
  })

  it('Tummy time pelo Mais, sem sessão, começa a sessão por Juliana e abre a Sessão com o id', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { ajustarRotina: semSessaoEmAndamento })

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar tummy time de Heloísa' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tummy time de Heloísa')
    expect(screen.getByText(/por Juliana$/)).toBeTruthy()
    expect(roteador.state.location.search).toMatch(/^\?id=[0-9a-f-]{36}$/)
  })

  it('observador: os botões rápidos somem e o texto do papel fica no lugar deles, dentro da barra', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { sessao: 'davi', papelDeDavi: 'observador' })

    expect(within(barra(container)).queryAllByRole('button')).toHaveLength(0)
    expect(within(barra(container)).getByText('Seu papel nesta família permite só ver os registros.')).toBeTruthy()
    expect(within(cartao(container)).queryByRole('button', { name: 'Encerrar' })).toBeNull()
  })

  it('bebê arquivado: os botões somem e o texto do arquivamento fica no lugar deles', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { bebeArquivado: true })

    expect(within(barra(container)).queryAllByRole('button')).toHaveLength(0)
    expect(within(barra(container)).getByText('Este bebê está arquivado. Os registros ficam só para leitura.')).toBeTruthy()
  })
})

describe('Hoje: madrugada', () => {
  it('sem sessão, "Iniciar mamada" começa uma mamada por Juliana e abre a Sessão', async () => {
    await renderizarRotaPronta('/app/hoje', { madrugada: true, ajustarRotina: semSessaoEmAndamento })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mamada de Heloísa')
    expect(screen.getByText(/por Juliana$/)).toBeTruthy()
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('com o sono em andamento, "Iniciar mamada" abre o sono com o aviso', async () => {
    await renderizarRotaPronta('/app/hoje', { madrugada: true })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
  })

  it('com uma mamada em andamento o botão redondo some (o cartão já mostra a mamada)', async () => {
    await renderizarRotaPronta('/app/hoje', {
      madrugada: true,
      ajustarRotina: (f) => ({
        ...semSessaoEmAndamento(f),
        registros: [...semSessaoEmAndamento(f).registros, { ...f.registros[0], id: 'd0000000-0000-7000-8000-000000009999', tipo: 'mamada', inicio: new Date(Date.now() - 60_000).toISOString(), fim: null }],
      }),
    })

    expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
  })
})
