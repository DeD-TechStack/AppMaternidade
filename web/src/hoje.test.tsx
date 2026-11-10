import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { pastaSrcDe } from './teste/fontes.ts'

// O Hoje refeito (cartão 44d-2, parte 1; EMENDAS E1 a E4): abertura, Em andamento, Últimos, Para
// você saber e a barra Registrar fora do <main>. O jsdom não mede layout: aqui vale a estrutura, o
// texto e o comportamento; as posições e os tamanhos são do medidor e das capturas.

const pastaSrc = pastaSrcDe(import.meta.url)
const css = readFileSync(pastaSrc + 'index.css', 'utf8')

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })
const semSessao = (): EstadoPrototipo => ({ ...claro(), sessao: null })

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!
const andamento = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!
const ultimos = (container: HTMLElement) => container.querySelector<HTMLElement>('main #ultimos')!
const barra = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-barra-registrar]')!

describe('Hoje: a ordem dos blocos', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) o main tem a abertura, Em andamento, Últimos e Para você saber, nessa ordem, e a barra vem depois do main`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })

      const blocos = [...principal(container).children] as HTMLElement[]
      expect(blocos).toHaveLength(4)
      expect(blocos[0].classList.contains('sb-abertura')).toBe(true)
      expect(blocos[1]).toBe(andamento(container))
      expect(blocos[2]).toBe(ultimos(container))
      expect(blocos[3].querySelector('.sb-linha')).not.toBeNull()
      for (const bloco of blocos) expect(bloco.classList.contains('sb-area'), bloco.className).toBe(true)
      expect(principal(container).nextElementSibling).toBe(barra(container))
      expect(barra(container).nextElementSibling!.matches('[data-rodape]')).toBe(true)
      expect(principal(container).previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
    })
  }

  it('a casca é só cabeçalho, main, barra e rodapé: nada à esquerda nem coluna única (H-1)', () => {
    const { container } = renderizarRota('/app/hoje')

    expect([...container.querySelector('.sb-casca')!.children].map((e) => e.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      'section',
      'footer',
    ])
    expect(container.querySelector('aside')).toBeNull()
    expect(container.querySelector('.coluna-app')).toBeNull()
  })

  it('as peças que saíram não aparecem: faixa do protótipo, navegação inferior, barra inferior e cartão', () => {
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelector('[aria-label="Aviso do protótipo"]')).toBeNull()
    expect(screen.queryByText('Protótipo: dados fictícios, nada é salvo.')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    expect(container.querySelector('.nav-inferior, .barra-inferior, .cartao, .campo-andamento')).toBeNull()
    expect(screen.queryByText('Em breve')).toBeNull()
  })

  it('nenhum campo de cor (data-campo) na tela: o único bloco de cor é o Em andamento (H-7)', () => {
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelectorAll('[data-campo]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-andamento]')).toHaveLength(1)
  })
})

describe('Hoje: a abertura (E3)', () => {
  it('o h1 é "Hoje", o subtítulo é "Heloísa, 3 meses" e o título pode receber foco por programa', () => {
    const { container } = renderizarRota('/app/hoje')

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Hoje')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(h1.closest('.sb-abertura')).not.toBeNull()
    expect(h1.getAttribute('tabindex')).toBe('-1')
    expect(container.querySelector('.sb-abertura-subtitulo')!.textContent).toBe('Heloísa, 3 meses')
  })

  it('a lateral traz o aviso e o link "Ir aos últimos" para #ultimos, no estilo do sistema; não repete "Ver sessão"', () => {
    const { container } = renderizarRota('/app/hoje')

    const lateral = container.querySelector<HTMLElement>('.sb-abertura-lateral')!
    const link = within(lateral).getByRole('link', { name: 'Ir aos últimos' })
    expect(link.getAttribute('href')).toBe('#ultimos')
    expect(link.classList.contains('sb-abertura-link')).toBe(true)
    expect(link.classList.contains('t-corpo')).toBe(true)
    expect(link.classList.contains('alvo-toque')).toBe(true)
    expect(container.querySelector(link.getAttribute('href')!)).toBe(ultimos(container))
    expect(within(lateral).queryByRole('link', { name: 'Ver sessão' })).toBeNull()
    expect([...lateral.children].every((filho) => filho.tagName === 'LI')).toBe(true)
  })
})

describe('Hoje: Em andamento (E4, bloco 2)', () => {
  it('com sessão: rótulo, nome da sessão, duração, "por Bruno", Encerrar e o link Ver sessão', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    const { container } = renderizarRota('/app/hoje', { estadoInicial: claro() })

    const bloco = andamento(container)
    expect(bloco.tagName).toBe('SECTION')
    expect(bloco.getAttribute('tabindex')).toBe('-1')
    expect(bloco.classList.contains('sb-area')).toBe(true)
    const titulo = within(bloco).getByRole('heading', { name: 'Em andamento' })
    expect(bloco.getAttribute('aria-labelledby')).toBe(titulo.id)
    expect(titulo.classList.contains('t-rotulo')).toBe(true)
    expect(within(bloco).getByText('Sono', { selector: 'p' }).classList.contains('t-corpo-g')).toBe(true)
    const numero = within(bloco).getByText('1 h 12 min')
    expect(numero.classList.contains('t-numero')).toBe(true)
    expect(numero.hasAttribute('data-numero')).toBe(true)
    expect(within(bloco).getByText('por Bruno').classList.contains('t-corpo')).toBe(true)
    expect(within(bloco).getByRole('button', { name: 'Encerrar' })).toBeTruthy()
    const ver = within(bloco).getByRole('link', { name: 'Ver sessão' })
    expect(ver.getAttribute('href')).toBe('/app/sessao')
  })

  it('o "Ver sessão" é só um, e fica no bloco (a lateral da abertura não o repete)', () => {
    const { container } = renderizarRota('/app/hoje')

    const links = screen.getAllByRole('link', { name: 'Ver sessão' })
    expect(links).toHaveLength(1)
    expect(andamento(container).contains(links[0])).toBe(true)
  })

  it('o Encerrar é o primário do bloco e o Ver sessão é de moldura dupla alta (64 px)', () => {
    const { container } = renderizarRota('/app/hoje')

    const bloco = andamento(container)
    const encerrar = within(bloco).getByRole('button', { name: 'Encerrar' })
    expect(encerrar.classList.contains('t-botao')).toBe(true)
    expect(encerrar.classList.contains('alvo-toque')).toBe(true)
    expect(encerrar.matches('[data-botao="primario"]')).toBe(true)
    const ver = within(bloco).getByRole('link', { name: 'Ver sessão' })
    expect(ver.hasAttribute('data-moldura-dupla')).toBe(true)
    expect(ver.hasAttribute('data-alto')).toBe(true)
    expect(ver.classList.contains('sb-moldura')).toBe(true)
    expect(ver.classList.contains('alvo-toque')).toBe(true)
    expect(ver.querySelector('.sb-moldura-miolo')!.textContent).toBe('Ver sessão')
    expect(bloco.querySelectorAll('button, a')).toHaveLength(2)
  })

  it('sem sessão: só o rótulo e "Nenhuma sessão em andamento.", sem botões nem links', () => {
    const { container } = renderizarRota('/app/hoje', { estadoInicial: semSessao() })

    const bloco = andamento(container)
    expect(within(bloco).getByRole('heading', { name: 'Em andamento' })).toBeTruthy()
    expect(bloco.textContent).toBe('Em andamentoNenhuma sessão em andamento.')
    expect(bloco.querySelectorAll('button, a')).toHaveLength(0)
    expect(bloco.getAttribute('tabindex')).toBe('-1')
  })

  it('encerrar leva o foco ao próprio bloco, que passa a dizer "Nenhuma sessão em andamento."', () => {
    const { container } = renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    expect(document.activeElement).toBe(andamento(container))
    expect(andamento(container).textContent).toContain('Nenhuma sessão em andamento.')
  })

  it('a duração vem de agora - início e sobe a cada minuto', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    const { container } = renderizarRota('/app/hoje')
    expect(within(andamento(container)).getByText('1 h 12 min')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(within(andamento(container)).getByText('1 h 13 min')).toBeTruthy()
  })

  it('o número cai de 112 para 96, 72 e 56 até caber numa linha (como a faixa de números)', () => {
    // O jsdom não mede: cabe em 600 px, mas 112 px pedem 500 e o item só tem 400.
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(500)
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
      const tamanho = parseFloat((this as HTMLElement).style?.fontSize ?? '')
      return tamanho >= 100 ? 400 : 600
    })
    const { container } = renderizarRota('/app/hoje')

    const numero = andamento(container).querySelector<HTMLElement>('[data-numero]')!
    expect(numero.style.fontSize).toBe('96px')
  })
})

describe('Hoje: Últimos (E4, bloco 3)', () => {
  it('é a seção #ultimos[data-ultimos], 96 px abaixo do bloco, com o h2 só para leitor de tela', () => {
    const { container } = renderizarRota('/app/hoje')

    const secao = ultimos(container)
    expect(secao.tagName).toBe('SECTION')
    expect(secao.hasAttribute('data-ultimos')).toBe(true)
    expect(secao.previousElementSibling).toBe(andamento(container))
    expect(secao.classList.contains('sb-mt-par-numeros')).toBe(true)
    const titulo = within(secao).getByRole('heading', { name: 'Últimos' })
    expect(titulo.classList.contains('sr-only')).toBe(true)
    expect(secao.getAttribute('aria-labelledby')).toBe(titulo.id)
  })

  it('são 3 colunas, com o tempo em destaque e a legenda; "2 h 10", "50 min" e "17:30"', () => {
    const { container } = renderizarRota('/app/hoje')

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens.map((i) => i.querySelector('[data-numero]')!.textContent)).toEqual(['2 h 10', '50 min', '17:30'])
    expect(itens.map((i) => i.querySelector('.sb-numeros-legenda')!.textContent)).toEqual([
      'Mamada, tempo desde o registro',
      'Fralda, tempo desde o registro',
      'Tummy time, ontem',
    ])
    expect(ultimos(container).querySelector('.sb-numeros')).not.toBeNull()
  })

  // A faixa da base usa `valor + legenda` como chave; duas colunas vazias ("—", "—") repetem a chave e o
  // React avisa. No protótipo a lista nunca passa de 3 registros para menos de 3 (o reducer só troca ou
  // acrescenta), então é um caso de borda do dado, e o aviso esperado fica fora da saída dos testes.
  it('com menos de 3 registros, as colunas que faltam ficam com o travessão', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const base = claro()
    const { container } = renderizarRota('/app/hoje', { estadoInicial: { ...base, ultimos: base.ultimos.slice(0, 1) } })

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens).toHaveLength(3)
    expect(itens.map((i) => i.querySelector('[data-numero]')!.textContent)).toEqual(['2 h 10', '—', '—'])
    expect(itens.map((i) => i.querySelector('.sb-numeros-legenda')!.textContent)).toEqual([
      'Mamada, tempo desde o registro',
      '—',
      '—',
    ])
  })

  it('sem nenhum registro, as 3 colunas ficam com o travessão', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderizarRota('/app/hoje', { estadoInicial: { ...claro(), ultimos: [] } })

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens.map((i) => i.textContent)).toEqual(['——', '——', '——'])
  })

  it('com mais de 3 registros, mostra só os 3 primeiros', () => {
    const { container } = renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mamadeira' }))

    const itens = [...ultimos(container).querySelectorAll('.sb-numeros-item')]
    expect(itens).toHaveLength(3)
    expect(itens.map((i) => i.querySelector('[data-numero]')!.textContent)).toEqual(['agora', '2 h 10', '50 min'])
    expect(itens.map((i) => i.querySelector('.sb-numeros-legenda')!.textContent)).toEqual([
      'Mamadeira',
      'Mamada, tempo desde o registro',
      'Fralda, tempo desde o registro',
    ])
  })

  it('o "Ir aos últimos" leva à seção (âncora com o mesmo id)', () => {
    const { container } = renderizarRota('/app/hoje')

    const alvo = container.querySelector(`[id="${screen.getByRole('link', { name: 'Ir aos últimos' }).getAttribute('href')!.slice(1)}"]`)
    expect(alvo).toBe(ultimos(container))
  })
})

describe('Hoje: Para você saber (E4, bloco 4)', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) é uma linha rótulo + texto da base, com "Carla, 22:40" no rótulo e a nota no texto, sem cartão lavanda`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      const titulo = screen.getByRole('heading', { name: 'Para você saber' })
      const secao = titulo.closest('section')!
      expect(titulo.classList.contains('sr-only')).toBe(true)
      expect(secao.getAttribute('aria-labelledby')).toBe(titulo.id)
      expect(secao.classList.contains('sb-area')).toBe(true)
      expect(secao.classList.contains('sb-mt-midia-titulo')).toBe(true)
      expect(secao.hasAttribute('data-campo')).toBe(false)
      expect(secao.querySelector('.cartao')).toBeNull()
      expect(within(secao).getByRole('heading', { name: 'Carla, 22:40' }).classList.contains('sb-linha-rotulo')).toBe(true)
      expect(within(secao).getByText('Pomada só à noite.').closest('.sb-linha-texto')).not.toBeNull()
      expect(secao.querySelectorAll('.sb-linha')).toHaveLength(1)
    })
  }

  it('vem depois de Últimos na ordem de leitura', () => {
    const { container } = renderizarRota('/app/hoje')

    const saber = screen.getByRole('heading', { name: 'Para você saber' })
    expect(ultimos(container).compareDocumentPosition(saber) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })
})

describe('Hoje: a barra Registrar fica fora do main e é a única coisa fixa embaixo (E1, H-1 e H-6)', () => {
  it('uma só barra, com os 4 botões, a classe registro-rapido e a região de status única', () => {
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelectorAll('[data-barra-registrar]')).toHaveLength(1)
    expect(container.querySelectorAll('.registro-rapido')).toHaveLength(1)
    expect(principal(container).contains(barra(container))).toBe(false)
    expect(within(barra(container)).getAllByRole('button').map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(barra(container).contains(screen.getByRole('status'))).toBe(true)
  })

  it('o Tummy time e os outros registros só existem dentro do Mais', () => {
    renderizarRota('/app/hoje')
    expect(screen.queryByRole('button', { name: 'Iniciar tummy time de Heloísa' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))

    expect(screen.getByRole('button', { name: 'Iniciar tummy time de Heloísa' })).toBeTruthy()
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

  it('Sono com sessão em andamento abre a que existe, com o aviso; sem sessão começa a nova', async () => {
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }))

    const titulo = await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    expect(titulo).toBeTruthy()
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

  it('encerrar na Sessão leva ao Hoje com o bloco Em andamento focado', async () => {
    const { container } = renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await waitFor(() => expect(document.activeElement).toBe(andamento(container)))
  })
})

describe('Hoje: o CSS do bloco /* 44d-2 */ (lido como texto)', () => {
  const marca = css.indexOf('/* 44d-2 */')
  // O bloco termina onde começa o do 44d-4 (o Início), que vem depois dele no arquivo, ou no fim.
  const fim = css.indexOf('/* 44d-4 */', marca)
  const bloco = marca >= 0 ? css.slice(marca, fim > marca ? fim : css.length) : ''
  const semComentarios = bloco.replace(/\/\*[\s\S]*?\*\//g, '')
  const regra = (seletor: string) =>
    [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => m[1].trim().replace(/\s+/g, ' ') === seletor)
      .map((m) => m[2])
      .join('')

  it('o bloco existe, vai até o bloco do 44d-4 (ou o fim do arquivo) e não repete a marca', () => {
    expect(marca).toBeGreaterThan(0)
    expect(css.indexOf('/* 44d-2 */', marca + 1)).toBe(-1)
  })

  it('a barra é fixa embaixo, de 64 px, sem borda, sem sombra, com raio 8 em cima só em telas largas (H-6)', () => {
    const fixa = regra('.barra-registrar.barra-fixa')
    expect(fixa).toMatch(/position:\s*fixed/)
    expect(fixa).toMatch(/bottom:\s*0/)
    const base = regra('.barra-registrar')
    expect(base).toMatch(/border:\s*0/)
    expect(base).toMatch(/padding:\s*0/)
    expect(base).toMatch(/border-radius:\s*8px 8px 0 0/)
    expect(regra('.ha-barra-fileira')).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
    expect(regra('.ha-barra-fileira > button')).toMatch(/height:\s*64px/)
    expect(semComentarios).not.toMatch(/box-shadow/)
  })

  it('a barra fica em c1–c10 (margem e largura máxima da área útil) e em largura total abaixo de 768', () => {
    const fixa = regra('.barra-registrar.barra-fixa')
    expect(fixa).toMatch(/width:\s*min\(100% - 2 \* var\(--margem\),\s*var\(--area-util\)\)/)
    expect(fixa).toMatch(/left:\s*0/)
    expect(fixa).toMatch(/right:\s*0/)
    expect(fixa).toMatch(/margin-inline:\s*auto/)
    expect(semComentarios).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.barra-registrar\.barra-fixa\s*\{[^}]*width:\s*100%/)
  })

  it('as cores da barra vêm das variáveis de uso: tinta e papel de dia; bloco escuro e texto da madrugada', () => {
    expect(regra('.barra-registrar')).toMatch(/background-color:\s*var\(--ha-barra-fundo\)/)
    expect(regra('.barra-registrar')).toMatch(/--ha-barra-fundo:\s*var\(--cor-texto\)/)
    expect(regra('.barra-registrar')).toMatch(/--ha-barra-texto:\s*var\(--cor-fundo\)/)
    expect(regra(":root[data-tema='madrugada'] .barra-registrar")).toMatch(/--ha-barra-fundo:\s*var\(--cor-campo-sessao\)/)
    expect(regra(":root[data-tema='madrugada'] .barra-registrar")).toMatch(/--ha-barra-texto:\s*var\(--cor-texto\)/)
    expect(semComentarios).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  // ---- Volta 1, E3: o fio de 1 px no topo da barra Registrar, só na madrugada.
  //
  // O fio é o `border-top` da própria barra, em uma variável de uso (`--ha-barra-fio`): transparente no claro e
  // `rgba(227, 214, 195, 0.2)` na madrugada. A regra da madrugada só troca a variável (o teste M-1 acima exige
  // que nenhuma regra de tema mexa em medida), e a borda de 1 px existe nos dois temas, então os retângulos
  // são os mesmos (M-1). A barra tem `box-sizing: border-box` e 64 de altura total; a fileira sobe 1 px para
  // continuar com os botões de 64 (o alvo de toque da E1) sob o fio.

  it('E3: o fio só aparece na madrugada: a variável é transparente na base e rgba(227, 214, 195, 0.2) com data-tema="madrugada"', () => {
    expect(regra('.barra-registrar')).toMatch(/--ha-barra-fio:\s*transparent\s*;/)
    const madrugada = regra(":root[data-tema='madrugada'] .barra-registrar")
    expect(madrugada).toMatch(/--ha-barra-fio:\s*rgba\(227,\s*214,\s*195,\s*0\.2\)\s*;/)
    // A regra do tema só troca variáveis (cor); o claro não ganha outra regra de fio.
    expect(regra(":root[data-tema='claro'] .barra-registrar")).toBe('')
    expect(semComentarios).not.toMatch(/box-shadow/)
  })

  it('E3: a barra desenha o fio com border-top de 1 px na variável e mantém 64 de altura total (border-box); a fileira sobe 1 px', () => {
    const barra = regra('.barra-registrar')
    expect(barra).toMatch(/border-top:\s*1px solid var\(--ha-barra-fio\)\s*;/)
    expect(barra).toMatch(/box-sizing:\s*border-box\s*;/)
    expect(barra).toMatch(/height:\s*64px\s*;/)
    // O fio é o do topo só: nenhuma borda dos outros lados.
    expect(barra).not.toMatch(/border-(left|right|bottom)\s*:\s*[1-9]/)
    // A fileira (64 de altura) sobe o 1 px que a borda ocupa, para os botões seguirem em 64 e a barra em 64.
    expect(regra('.ha-barra-fileira')).toMatch(/position:\s*relative\s*;/)
    expect(regra('.ha-barra-fileira')).toMatch(/top:\s*-1px\s*;/)
    expect(regra('.ha-barra-fileira')).toMatch(/height:\s*64px\s*;/)
    expect(regra('.ha-barra-fileira > button')).toMatch(/height:\s*64px\s*;/)
  })

  it('o painel flutua acima da barra: absoluto, a partir de 100%, opaco, sem sombra', () => {
    const painel = regra('.ha-painel')
    expect(painel).toMatch(/position:\s*absolute/)
    expect(painel).toMatch(/bottom:\s*100%/)
    expect(painel).toMatch(/left:\s*0/)
    expect(painel).toMatch(/right:\s*0/)
    expect(painel).toMatch(/background-color:\s*var\(--cor-fundo\)/)
  })

  it('o foco dos botões da barra é um anel de 2 px na cor do papel, dentro do botão, sem recuo negativo', () => {
    // Só a fileira: os botões do painel ficam sobre o papel, onde um anel de papel não apareceria. O anel
    // é do rótulo (o <span>), e não do botão: o recuo negativo da E1 (-4px) é guardado por um teste de
    // estilo.test.ts que só admite duas regras assim (ver o BLOQUEIO parcial no VISTO.md).
    expect(regra('.ha-barra-fileira > button:focus-visible')).toMatch(/outline:\s*none/)
    const anel = regra('.ha-barra-fileira > button:focus-visible > span')
    expect(anel).toMatch(/outline:\s*2px solid var\(--ha-barra-texto\)/)
    expect(anel).toMatch(/outline-offset:\s*4px/)
    expect(semComentarios).not.toMatch(/outline-offset:\s*-/)
  })

  it('a barra não cobre o fim do conteúdo: o main ganha 64 px embaixo e o rodapé, 64 px de folga e 128 de margem', () => {
    expect(regra('.ha-hoje')).toMatch(/padding-bottom:\s*64px/)
    const rodape = regra('body:has([data-barra-registrar]) [data-rodape]')
    expect(rodape).toMatch(/padding-bottom:\s*64px/)
    // 64 do main + 128 do rodapé = os 192 de "fim do conteúdo → rodapé" (G8, H-8).
    expect(rodape).toMatch(/margin-top:\s*128px/)
  })

  it('o Em andamento é o bloco de cor, com raio 8, padding 64 (24 abaixo de 768), sem borda e sem sombra', () => {
    const andamentoCss = regra('.ha-andamento')
    expect(andamentoCss).toMatch(/background-color:\s*var\(--cor-campo-sessao\)/)
    expect(andamentoCss).toMatch(/color:\s*var\(--cor-numero-sessao\)/)
    expect(andamentoCss).toMatch(/border-radius:\s*8px/)
    expect(andamentoCss).toMatch(/padding:\s*64px/)
    expect(andamentoCss).not.toMatch(/border:\s*[1-9]|border-width/)
    expect(semComentarios).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.ha-andamento\s*\{[^}]*padding:\s*24px/)
  })

  it('o botão Encerrar usa as cores de botão dentro de campo (papel sobre urucum; urucum claro na madrugada); a altura é a do primário da base', () => {
    const encerrar = regra('.ha-andamento .ha-encerrar')
    expect(encerrar).toMatch(/background-color:\s*var\(--cor-botao-campo\)/)
    expect(encerrar).toMatch(/color:\s*var\(--cor-texto-botao-campo\)/)
    // 80 px (64 abaixo de 768) vêm de `.sb-botao`: o bloco não redeclara a altura.
    expect(encerrar).not.toMatch(/height/)
  })

  it('nenhum font-size fora do conjunto da escala, nenhuma caixa alta, nenhuma transição acima de 150 ms e nenhum raio fora de 0, 4, 8 e 50%', () => {
    // 160: o cronômetro longo (8 ou mais caracteres) da Sessão em 1440 (VOLTA1 E2: "um valor menor que 224").
    const conjunto = new Set([15, 17, 20, 24, 28, 32, 36, 48, 56, 72, 80, 88, 96, 112, 160, 224])
    expect(semComentarios).not.toMatch(/text-transform/)
    const tamanhos = [...semComentarios.matchAll(/font-size:\s*([\d.]+)(rem|px)(?:\s*!important)?\s*;/g)]
    expect(tamanhos.length).toBeGreaterThan(0)
    for (const [, numero, unidade] of tamanhos) {
      expect(conjunto.has(Number(numero) * (unidade === 'rem' ? 16 : 1)), `${numero}${unidade}`).toBe(true)
    }
    // Todo `font-size` do bloco é um número em rem ou px (nada de clamp, calc, inherit ou em).
    expect((semComentarios.match(/font-size\s*:/g) ?? []).length).toBe(tamanhos.length)
    for (const [, valor] of semComentarios.matchAll(/border-radius:\s*([^;]+);/g)) {
      for (const parte of valor.trim().split(/\s+/)) expect(['0', '4px', '8px', '50%'], valor).toContain(parte)
    }
    for (const [, ms] of semComentarios.matchAll(/transition[^;]*?(\d+)ms/g)) expect(Number(ms)).toBeLessThanOrEqual(150)
  })

  // ---- Item E (parte 2): a geometria medida pela sonda do worker. Cada teste cobre a classe do defeito.

  /** O texto de dentro de cada `@media (max-width: 767px)` do bloco, com as chaves balanceadas. */
  function emMedia767(): string {
    const achados: string[] = []
    const abertura = /@media\s*\(max-width:\s*767px\)\s*\{/g
    for (let m = abertura.exec(semComentarios); m; m = abertura.exec(semComentarios)) {
      let nivel = 1
      let i = abertura.lastIndex
      while (i < semComentarios.length && nivel > 0) {
        if (semComentarios[i] === '{') nivel += 1
        else if (semComentarios[i] === '}') nivel -= 1
        i += 1
      }
      achados.push(semComentarios.slice(abertura.lastIndex, i - 1))
    }
    return achados.join('\n')
  }
  const regraEm = (texto: string, seletor: string) =>
    [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => m[1].trim().replace(/\s+/g, ' ') === seletor)
      .map((m) => m[2])
      .join('')
  const todasAsRegras = () =>
    [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      seletor: m[1].trim().replace(/\s+/g, ' '),
      corpo: m[2],
    }))

  it('E: em 390 os dois botões do bloco Em andamento ficam na mesma fileira: 2 colunas iguais, com gap de 8', () => {
    const celular = regraEm(emMedia767(), '.ha-andamento-acoes')
    expect(celular).toMatch(/display:\s*grid/)
    expect(celular).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(celular).toMatch(/gap:\s*8px/)
    // De 768 para cima ficam como antes: uma fileira flex, cada botão do tamanho que tem.
    const base = regra('.ha-andamento-acoes')
    expect(base).toMatch(/display:\s*flex/)
  })

  it('E: em 390 o rótulo da moldura pode quebrar em 2 linhas dentro dos 64 px e o botão primário aperta o recuo', () => {
    const miolo = regraEm(emMedia767(), '.ha-andamento .sb-moldura-miolo')
    expect(miolo).toMatch(/white-space:\s*normal/)
    expect(miolo).toMatch(/text-align:\s*center/)
    expect(miolo).toMatch(/padding:\s*0 8px/)
    expect(regraEm(emMedia767(), '.ha-andamento .ha-encerrar')).toMatch(/padding:\s*0 16px/)
  })

  it('E: em 1440 o espaço entre o autor e os botões é de 16 (e não 24), para o bloco terminar em y ≤ 800', () => {
    expect(regra('.ha-andamento-acoes')).toMatch(/margin-top:\s*16px/)
    // Os outros espaços internos do bloco: 8 entre rótulo, nome, número e autor.
    for (const classe of ['.ha-andamento-nome', '.ha-andamento-numero', '.ha-andamento-pessoa']) {
      expect(regra(classe), classe).toMatch(/margin:\s*8px 0 0/)
    }
  })

  it('E: todo espaçamento do bloco (margin, padding, gap) usa só valores da escala 8, 16, 24, 32, 64, 96, 128, 160, 192 (ou 0 e auto)', () => {
    const escala = new Set([0, 8, 16, 24, 32, 64, 96, 128, 160, 192])
    const propriedades = /^(margin|padding)(-(top|right|bottom|left|inline|block))?$|^(row-|column-)?gap$/
    let conferidos = 0
    for (const { seletor, corpo } of todasAsRegras()) {
      for (const declaracao of corpo.split(';')) {
        const meio = declaracao.indexOf(':')
        if (meio < 0) continue
        const nome = declaracao.slice(0, meio).trim()
        if (!propriedades.test(nome)) continue
        for (const parte of declaracao.slice(meio + 1).trim().split(/\s+/)) {
          conferidos += 1
          if (parte === 'auto') continue
          const px = /^(-?\d+)(px)?$/.exec(parte)
          expect(px, `${seletor} { ${nome}: ${parte} }`).not.toBeNull()
          expect(escala.has(Number(px![1])), `${seletor} { ${nome}: ${parte} }`).toBe(true)
        }
      }
    }
    expect(conferidos).toBeGreaterThan(15)
  })

  it('E (M-1): nenhuma regra da madrugada muda altura, margem, recuo ou tamanho de bloco: só variáveis de cor --ha-*', () => {
    const daMadrugada = todasAsRegras().filter((r) => /data-tema/.test(r.seletor))
    expect(daMadrugada.length).toBeGreaterThan(0)
    for (const { seletor, corpo } of daMadrugada) {
      for (const declaracao of corpo.split(';')) {
        const nome = declaracao.slice(0, Math.max(0, declaracao.indexOf(':'))).trim()
        if (nome === '') continue
        expect(nome.startsWith('--ha-'), `${seletor} { ${nome} }`).toBe(true)
      }
    }
  })

  it('E (M-1): nenhuma medida do bloco depende de --alvo-toque, que muda de 44 para 56 com o tema', () => {
    for (const { seletor, corpo } of todasAsRegras()) {
      for (const declaracao of corpo.split(';')) {
        if (!/--alvo-toque/.test(declaracao)) continue
        expect(declaracao.trim(), seletor).toMatch(/^(outline|color|background)/)
      }
    }
  })

  it('E (M-1): o link da lateral tem 56 de alvo nos dois temas e o item da lista guarda 44 de layout, então a abertura não muda de altura com o tema', () => {
    const link = regra('.ha-tela .sb-abertura-link')
    expect(link).toMatch(/min-height:\s*56px/)
    expect(link).not.toMatch(/var\(--alvo-toque\)/)
    const item = regra('.ha-tela .ha-li-link')
    expect(item).toMatch(/height:\s*44px/)
    expect(item).toMatch(/min-height:\s*0/)
  })

  it('H-3 em 390: o item "Ir aos últimos" some abaixo de 768 (a âncora leva à seção logo abaixo) e só ele: o "Voltar para Hoje" da Sessão fica', () => {
    // 641 - 44 (o item do link) = 597 ≤ 600.
    // `.ha-tela .ha-li-ultimos` (0,2,0) vence o `display: flex` de `.sb-abertura-lateral > li` (0,1,1).
    const celular = regraEm(emMedia767(), '.ha-tela .ha-li-ultimos')
    expect(celular).toMatch(/display:\s*none/)
    // Fora do celular (o bloco sem o texto dos `@media (max-width: 767px)`) o item não é escondido.
    const foraDoCelular = semComentarios.replace(emMedia767(), '')
    expect(regraEm(foraDoCelular, '.ha-tela .ha-li-ultimos')).not.toMatch(/display:\s*none/)
    // O seletor é próprio do Hoje: nenhuma regra de celular esconde o `.ha-li-link` (a Sessão também o usa).
    expect(regraEm(emMedia767(), '.ha-li-link')).not.toMatch(/display:\s*none/)
    expect(regraEm(emMedia767(), '.ha-tela .ha-li-link')).not.toMatch(/display:\s*none/)

    const hoje = renderizarRota('/app/hoje')
    const linkHoje = screen.getByRole('link', { name: 'Ir aos últimos' })
    expect(linkHoje.parentElement!.classList.contains('ha-li-ultimos')).toBe(true)
    hoje.unmount()

    renderizarRota('/app/sessao')
    const volta = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(volta.parentElement!.classList.contains('ha-li-ultimos')).toBe(false)
  })

  // ---- Parte 3 (olhar a tela): defeitos que a imagem mostrou. Cada teste cobre a classe do defeito.

  /** O texto de dentro de cada `@media (min-width: 1200px)` do bloco, com as chaves balanceadas. */
  function emMedia1200(): string {
    const achados: string[] = []
    const abertura = /@media\s*\(min-width:\s*1200px\)\s*\{/g
    for (let m = abertura.exec(semComentarios); m; m = abertura.exec(semComentarios)) {
      let nivel = 1
      let i = abertura.lastIndex
      while (i < semComentarios.length && nivel > 0) {
        if (semComentarios[i] === '{') nivel += 1
        else if (semComentarios[i] === '}') nivel -= 1
        i += 1
      }
      achados.push(semComentarios.slice(abertura.lastIndex, i - 1))
    }
    return achados.join('\n')
  }

  it('P3 (390): a lateral da abertura fica a 16 do subtítulo (e não 32), nas duas telas; o fio e o 16 do subtítulo ao fio seguem', () => {
    // `.ha-tela .sb-abertura-lateral` (0,2,0) vence o `margin-top: 32px` da base (0,1,0). Em 390 a tummy time
    // terminava os botões em y=729 (limite 700): são 16 px a menos nas duas telas, em escala.
    expect(regraEm(emMedia767(), '.ha-tela .sb-abertura-lateral')).toMatch(/margin-top:\s*16px/)
    // Fora do celular a lateral não tem esse margin-top (ela começa no topo do título).
    const foraDoCelular = semComentarios.replace(emMedia767(), '')
    expect(regraEm(foraDoCelular, '.ha-tela .sb-abertura-lateral')).not.toMatch(/margin-top/)
  })

  it('P3 (390): o item do link da lateral guarda 32 de layout (e não 44) abaixo de 768; o alvo de 56 do link continua e o tema não muda a altura', () => {
    // 709 - 12 = 697 ≤ 700 na Sessão de tummy time. O link (56 de alvo) transborda 12 para cada lado do item.
    const item = regraEm(emMedia767(), '.ha-tela .ha-li-link')
    expect(item).toMatch(/height:\s*32px/)
    expect(regra('.ha-tela .sb-abertura-link')).toMatch(/min-height:\s*56px/)
    // De 768 para cima o item guarda 44, como a parte 2 fixou.
    const foraDoCelular = semComentarios.replace(emMedia767(), '')
    expect(regraEm(foraDoCelular, '.ha-tela .ha-li-link')).toMatch(/height:\s*44px/)
  })

  it('P3 (390): os botões dos blocos de cor têm rótulo de 20 (do conjunto) e não 24, para o rótulo não apertar a moldura de 64 nem quebrar sozinho', () => {
    // "Ver sessão" (Hoje) e "Encerrar e anotar" (Sessão) quebravam em 2 linhas de 24 dentro dos 64 px de moldura.
    const botoes = regraEm(emMedia767(), '.ha-andamento .sb-botao, .ha-andamento .sb-moldura')
    expect(botoes).toMatch(/font-size:\s*1\.25rem/)
    expect(botoes).toMatch(/line-height:\s*1\.25rem/)
    // De 768 para cima o rótulo continua sendo o `t-botao` de 24: nenhuma regra fora do celular o muda.
    const foraDoCelular = semComentarios.replace(emMedia767(), '')
    expect(regraEm(foraDoCelular, '.ha-andamento .sb-botao, .ha-andamento .sb-moldura')).not.toMatch(/font-size/)
  })

  it('P3: as escolhas do painel do Mais têm larguras iguais: grade de 2 colunas, 4 de 1200 em diante, e o Mais, de rótulos longos, em 1 coluna abaixo de 768', () => {
    const grupo = regra('.ha-painel-grupo')
    expect(grupo).toMatch(/display:\s*grid/)
    expect(grupo).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(grupo).toMatch(/gap:\s*16px/)
    // O `flex: 1 1 auto` dava a cada botão a largura do seu texto (288, 300, 324 e 346 px em 1440).
    expect(regra('.ha-painel-grupo > *')).not.toMatch(/flex/)
    expect(regraEm(emMedia1200(), '.ha-painel-grupo')).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
    expect(regraEm(emMedia767(), ".ha-painel-grupo[data-largos]")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
  })

  it('P3: o grupo do Mais leva data-largos; tocar em Fralda fecha o Mais e a escolha do tipo (na confirmação) não é desse grupo', () => {
    const { container } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    const mais = screen.getByRole('group', { name: 'Outros registros de Heloísa' })
    expect(mais.hasAttribute('data-largos')).toBe(true)
    expect(container.querySelectorAll('.ha-painel-grupo')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' })) // registra e fecha o Mais
    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
    const tipo = screen.getByRole('group', { name: 'Tipo da fralda' })
    expect(tipo.hasAttribute('data-largos')).toBe(false)
    expect(tipo.classList.contains('ha-painel-grupo')).toBe(false)
    expect(screen.getByRole('status').contains(tipo)).toBe(true)
    expect(container.querySelectorAll('.ha-painel-grupo')).toHaveLength(0)
  })

  // ---- Volta 1, E1: os números de Últimos em 390 nunca passam do número do bloco Em andamento (56).

  it('E1 (390): abaixo de 768 todo número de Últimos fica em 56 (!important, porque o FaixaNumeros grava o tamanho inline) e a regra de 1440 não muda', () => {
    // O `FaixaNumeros` escolhe 112, 96, 72 ou 56 por `style.fontSize`; só `!important` vence o inline. A regra
    // vale para a classe do defeito: o seletor pega os três números da seção, em qualquer largura < 768.
    const celular = regraEm(emMedia767(), '[data-ultimos] .sb-numeros-valor')
    expect(celular).toMatch(/font-size:\s*3\.5rem\s*!important/)
    // A linha acompanha o número (o `t-numero` tem 90 px de linha para 112 de fonte; 45 para 56), senão
    // sobra vazio estranho entre o número e a legenda.
    expect(celular).toMatch(/line-height:\s*2\.8125rem/)
    // De 768 para cima nada muda: nenhuma regra do bloco fora do celular mexe no tamanho desse número...
    const foraDoCelular = semComentarios.replace(emMedia767(), '')
    expect(regraEm(foraDoCelular, '[data-ultimos] .sb-numeros-valor')).not.toMatch(/font-size/)
    // ... e o `t-numero` continua em 7rem (112 px).
    expect(css).toMatch(/\.t-numero\s*\{[^}]*font-size:\s*7rem/)
    // 56 é o tamanho do número do bloco Em andamento em 390 (o maior que `BlocoEmAndamento` usa abaixo de 768).
    expect(56).toBe(3.5 * 16)
  })

  it('E1: os três números de Últimos estão dentro de `#ultimos[data-ultimos]`, que é onde a regra de 56 pega', () => {
    const { container } = renderizarRota('/app/hoje')
    const numeros = [...ultimos(container).querySelectorAll('[data-numero]')]
    expect(numeros).toHaveLength(3)
    for (const numero of numeros) expect(numero.classList.contains('sb-numeros-valor')).toBe(true)
    // O número do Em andamento não está em Últimos: a regra de 56 não o alcança.
    expect(ultimos(container).contains(andamento(container))).toBe(false)
  })

  it('E (M-1): o Hoje marca o main com ha-tela e o item do link da lateral com ha-li-link', () => {
    const { container } = renderizarRota('/app/hoje')

    expect(principal(container).classList.contains('ha-tela')).toBe(true)
    const link = screen.getByRole('link', { name: 'Ir aos últimos' })
    expect(link.parentElement!.tagName).toBe('LI')
    expect(link.parentElement!.classList.contains('ha-li-link')).toBe(true)
  })
})
