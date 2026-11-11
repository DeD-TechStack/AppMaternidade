import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { Confirmacao } from './prototipo/Confirmacao.tsx'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { pastaSrcDe } from './teste/fontes.ts'

// MAT-44d-6a: as sobras da área logada (A), o polimento da mídia (B, em midia.test.tsx) e o zoom de 200% (C).
// O jsdom não mede layout: aqui valem os fatos de DOM e o texto do CSS; a geometria é do `geo6a.mjs`.

const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (nome: string) => readFileSync(pastaSrc + nome, 'utf8')
const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')

/** O texto de dentro de cada `@media (<consulta>) { ... }` do CSS, com as chaves balanceadas. */
function emMedia(css: string, consulta: string): string {
  const achados: string[] = []
  const escapada = consulta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const abertura = new RegExp(`@media\\s*\\(${escapada}\\)\\s*\\{`, 'g')
  for (let m = abertura.exec(css); m; m = abertura.exec(css)) {
    let nivel = 1
    let i = abertura.lastIndex
    while (i < css.length && nivel > 0) {
      if (css[i] === '{') nivel += 1
      else if (css[i] === '}') nivel -= 1
      i += 1
    }
    achados.push(css.slice(abertura.lastIndex, i - 1))
  }
  return achados.join('\n')
}

/** O corpo de cada regra cujo seletor (aparado) é exatamente `seletor`, em ordem. */
function corpos(css: string, seletor: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, s]) => s.trim().replace(/\s+/g, ' ') === seletor)
    .map(([, , corpo]) => corpo)
}

const MIN = 60_000
const sessao = (madrugada = false): EstadoPrototipo => ({
  ...criarEstadoInicial(Date.now()),
  sessao: { tipo: 'sono', inicio: Date.now() - 72 * MIN, pessoa: 'Bruno' },
  madrugada,
})

describe('P1: o painel da nota da Sessão', () => {
  for (const [tema, madrugada] of [
    ['claro', false],
    ['madrugada', true],
  ] as const) {
    it(`(${tema}) com o painel da nota aberto o Descartar não existe; ao fechar ele volta e o foco vai a "Encerrar e anotar"`, () => {
      renderizarRota('/app/sessao', { estadoInicial: sessao(madrugada) })
      expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
      const painel = screen.getByRole('group', { name: 'Encerrar e anotar' })
      expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull()
      expect(within(painel).getAllByRole('button').map((b) => b.textContent)).toEqual(['Salvar', 'Cancelar'])
      expect(document.activeElement).toBe(within(painel).getByRole('textbox', { name: 'Nota' }))

      fireEvent.click(within(painel).getByRole('button', { name: 'Cancelar' }))
      expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Encerrar e anotar' }))
    })
  }

  it('a pergunta de descartar continua a existir: só o botão de abrir some, e Encerrar e anotar fica', () => {
    renderizarRota('/app/sessao', { estadoInicial: sessao() })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    const pergunta = screen.getByRole('group', { name: 'Descartar esta sessão?' })
    expect(within(pergunta).getAllByRole('button').map((b) => b.textContent)).toEqual(['Descartar', 'Manter'])
    expect(screen.getAllByRole('button', { name: 'Descartar' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Encerrar e anotar' })).toBeTruthy()
  })
})

describe('P1/P2: o CSS novo da Sessão (ajustes-6a.css)', () => {
  const caminho = 'prototipo/ajustes-6a.css'
  const css = existsSync(pastaSrc + caminho) ? semComentarios(lerTexto(caminho)) : ''

  it('existe e é importado pelo BlocoCronometro e pela Confirmacao', () => {
    expect(css).not.toBe('')
    expect(lerTexto('prototipo/BlocoCronometro.tsx')).toMatch(/import\s+'\.\/ajustes-6a\.css'/)
    expect(lerTexto('prototipo/Confirmacao.tsx')).toMatch(/import\s+'\.\/ajustes-6a\.css'/)
  })

  it('P1 (<768): Salvar e Cancelar dividem a fileira em 2 colunas iguais', () => {
    const celular = emMedia(css, 'max-width: 767px')
    const regra = corpos(celular, '.ha-cron-painel-acoes').join('\n')
    expect(regra).toMatch(/display:\s*grid\s*;/)
    expect(regra).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*;/)
  })

  it('P1 (<360): uma coluna por botão só nas janelas minúsculas', () => {
    const minusculo = emMedia(css, 'max-width: 359px')
    expect(corpos(minusculo, '.ha-cron-painel-acoes').join('\n')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/)
  })

  it('P2 (<768): o campo da nota tem fundo de superfície (papel-fundo; no escuro, o fundo da página), tinta no texto e raio 4', () => {
    const celular = emMedia(css, 'max-width: 767px')
    const campo = corpos(celular, '.ha-cron-painel .ha-nota-campo').join('\n')
    expect(campo).toMatch(/background-color:\s*var\(--cor-papel-fundo\)\s*;/)
    expect(campo).toMatch(/color:\s*var\(--cor-texto\)\s*;/)
    expect(campo).toMatch(/border-radius:\s*4px\s*;/)
    expect(campo).toMatch(/border-bottom:\s*1px solid var\(--cor-texto\)\s*;/)
    // Na madrugada o campo é mais escuro que o bloco (o bloco já é o papel-fundo escuro).
    const escuro = corpos(celular, ":root[data-tema='madrugada'] .ha-cron-painel .ha-nota-campo").join('\n')
    expect(escuro).toMatch(/background-color:\s*var\(--cor-fundo\)\s*;/)
  })

  it('P2 (>=768): nenhuma regra de caixa para o campo fora do celular (sem fundo, sem raio)', () => {
    const fora = css.replace(emMedia(css, 'max-width: 767px'), '')
    const campos = [...fora.matchAll(/([^{}]*\.ha-nota-campo[^{}]*)\{([^{}]*)\}/g)]
      .filter(([, s]) => !/:focus-visible/.test(s))
      .map(([, , corpo]) => corpo)
    for (const corpo of campos) expect(corpo).not.toMatch(/background|border-radius/)
  })

  for (const [tema, seletor, variavel] of [
    ['claro', '.ha-cronometro .ha-nota-campo:focus-visible', '--cor-fundo'],
    ['madrugada', ":root[data-tema='madrugada'] .ha-cronometro .ha-nota-campo:focus-visible", '--cor-texto'],
  ] as const) {
    it(`P2 (${tema}): o anel de foco do campo é a cor do papel, 2 px sólido, offset 2, só em :focus-visible`, () => {
      const regra = corpos(css, seletor).join('\n')
      expect(regra, seletor).toMatch(new RegExp(`outline:\\s*2px solid var\\(${variavel}\\)\\s*;`))
      expect(regra).toMatch(/outline-offset:\s*2px\s*;/)
      // Nenhum anel é pintado fora de :focus-visible.
      expect(css).not.toMatch(/\.ha-nota-campo\s*\{[^}]*outline\s*:/)
    })
  }
})

describe('P4: a confirmação da Fralda, DOM igual à tela', () => {
  const montar = (escolhas = true) =>
    render(
      <Confirmacao
        texto="Fralda registrada"
        aoDesfazer={() => undefined}
        aoFechar={() => undefined}
        escolhas={
          escolhas
            ? { rotulo: 'Tipo da fralda', opcoes: ['Xixi', 'Cocô', 'Ambos'], escolhida: null, aoEscolher: () => undefined }
            : undefined
        }
      />,
    )

  it('a ordem do DOM é Xixi, Cocô, Ambos, Desfazer, Fechar', () => {
    montar()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Xixi', 'Cocô', 'Ambos', 'Desfazer', 'Fechar'])
  })

  it('sem escolhas (Mamadeira, sessão encerrada) a ordem é Desfazer, Fechar', () => {
    montar(false)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar'])
  })

  it('o texto vem primeiro, antes de todos os botões', () => {
    const { container } = montar()
    const texto = container.querySelector('.ha-confirmacao-texto')!
    for (const b of screen.getAllByRole('button')) {
      expect(texto.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING, b.textContent!).not.toBe(0)
    }
  })

  it('o CSS não usa `order` para a tela diferir do DOM', () => {
    const css = existsSync(pastaSrc + 'prototipo/ajustes-6a.css') ? semComentarios(lerTexto('prototipo/ajustes-6a.css')) : ''
    expect(css).not.toBe('')
    expect(css).not.toMatch(/(^|[;{\s])order\s*:\s*(?!0\b)/)
  })

  it('P4 (>=768): 32 px entre as escolhas e o Desfazer, e P5: botões de 56 nos dois temas', () => {
    const css = semComentarios(lerTexto('prototipo/ajustes-6a.css'))
    const largo = emMedia(css, 'min-width: 768px')
    expect(corpos(largo, '.ha-painel .ha-confirmacao').join('\n')).toMatch(/column-gap:\s*32px\s*;/)
    expect(corpos(css, '.ha-painel .ha-confirmacao .sb-moldura').join('\n')).toMatch(/min-height:\s*56px\s*;/)
    // O gap de 32 só vale de 768 para cima; abaixo disso a confirmação mantém os 16 do index.css.
    expect(css.replace(largo, '')).not.toMatch(/column-gap/)
  })
})

describe('P3: a linha "Carla, 22:40" do Hoje em 390', () => {
  it('a seção da nota leva a marca ha-linha-nota e o CSS tira o recuo de cima do rótulo só abaixo de 768', () => {
    const { container } = renderizarRota('/app/hoje')
    const secao = container.querySelector('main section:last-child')!
    expect(secao.classList.contains('ha-linha-nota')).toBe(true)
    expect(secao.querySelector('.sb-linha')).not.toBeNull()

    const css = semComentarios(lerTexto('prototipo/ajustes-6a.css'))
    const celular = emMedia(css, 'max-width: 767px')
    expect(corpos(celular, '.ha-linha-nota .sb-linha-rotulo').join('\n')).toMatch(/padding-top:\s*0\s*;/)
    expect(css.replace(celular, '')).not.toMatch(/\.ha-linha-nota/)
  })
})

describe('B: o polimento da mídia do Início (midia.css, cenas.tsx, proporcoes.ts)', () => {
  const css = semComentarios(lerTexto('componentes/midia/midia.css'))
  const cenas = lerTexto('componentes/midia/cenas.tsx')
  const cqw = (valor: string) => Number(/^(-?\d*\.?\d+)cqw$/.exec(valor.trim())![1])

  /** O estilo `{ left: 'Xcqw', ... }` de um `<Caixa className="...classe...">`. */
  function estiloDe(classe: string): Record<string, string> {
    const m = new RegExp(`className="[^"]*${classe}[^"]*"\\s*style=\\{\\{([^}]*)\\}\\}`).exec(cenas)
    expect(m, classe).not.toBeNull()
    return Object.fromEntries([...m![1].matchAll(/'?([\w-]+)'?:\s*'([^']*)'/g)].map(([, k, v]) => [k, v]))
  }

  it('B2: o cubo (laje de tinta) da madrugada assenta no topo do pedestal, sem folga de lavanda (no máximo 1 cqw)', () => {
    const madrugada = cenas.slice(cenas.indexOf('export function CenaMadrugada'), cenas.indexOf('export function CenaIlustracao'))
    const caixas = [...madrugada.matchAll(/<Caixa\s+className="([^"]*)"\s+style=\{\{([^}]*)\}\}/g)]
    const estilo = (classe: string) =>
      Object.fromEntries(
        [...caixas.find(([, c]) => c.includes(classe))![2].matchAll(/'?([\w-]+)'?:\s*'([^']*)'/g)].map(([, k, v]) => [k, v]),
      )
    const pedestal = estilo('mc-pedestal')
    const cubo = estilo('mc-laje-tinta')
    const topoDoPedestal = cqw(pedestal.bottom) + cqw(pedestal.height)
    expect(cqw(cubo.bottom) - topoDoPedestal).toBeGreaterThan(0)
    expect(cqw(cubo.bottom) - topoDoPedestal).toBeLessThanOrEqual(1)
    // B1: o pedestal sai da borda de baixo (o frontal de papel-fundo dava 1,13:1 contra a página).
    expect(cqw(pedestal.bottom)).toBeGreaterThanOrEqual(2.4)
  })

  it('B1: o chão do cartão da Sessão tem frente e topo escuros (o secundário), e não o papel-fundo que cruza a borda', () => {
    const regra = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, s]) => s.trim() === '.mc-chao-papel')![2]
    expect(regra).toMatch(/--c-frente:\s*var\(--cor-secundario\)/)
    expect(regra).toMatch(/--c-topo:\s*var\(--cor-secundario\)/)
    expect(regra).not.toMatch(/--cor-papel-fundo/)
  })

  it('B3: o topo e a base do chão passam 1 px de cada lado sobre a frente (2 px a mais de profundidade)', () => {
    const regra = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, s]) => /^\.mc-chao \.mc-topo,\s*\.mc-chao \.mc-base$/.test(s.trim()))
    expect(regra).toBeDefined()
    expect(regra![2]).toMatch(/height:\s*calc\(var\(--esp,\s*2cqw\)\s*\+\s*2px\)\s*;/)
    // O mesmo chão, nas duas cenas de cartão (Hoje em tinta, Sessão em papel).
    expect(cenas.match(/mc-obj mc-chao /g)).toHaveLength(1)
    expect(cenas).toMatch(/mc-chao-tinta/)
    expect(cenas).toMatch(/mc-chao-papel/)
  })

  it('B4: abaixo de 768 os celulares da madrugada passam de 27 para 33 cqw, e o notebook cresce até 1,05 (sem mudar a origem)', () => {
    const celular = emMedia(css, 'max-width: 767px')
    const base = css.replace(celular, '')
    expect(/--mad-w:\s*(\d+)cqw/.exec(base)![1]).toBe('27')
    expect(/--mad-w:\s*(\d+)cqw/.exec(celular)![1]).toBe('33')
    const notebook = [...celular.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, s]) => s.trim() === '.mc-notebook > .mc-obj')![2]
    const escala = Number(/scale:\s*(\d*\.?\d+)\s*;/.exec(notebook)![1])
    expect(escala).toBeGreaterThan(1)
    expect(escala).toBeLessThanOrEqual(1.05)
    expect(notebook).not.toMatch(/transform-origin/)
    expect(base).not.toMatch(/\.mc-notebook/)
  })

  it('B4: as molduras largas de 390 ficam entre as proporções 1,30 e 1,55 do contrato (a largura de 358 não muda)', () => {
    const proporcoes = lerTexto('componentes/midia/proporcoes.ts')
    const estreitas = [...proporcoes.matchAll(/estreita:\s*'358 \/ (\d+)'/g)].map((m) => Number(m[1]))
    expect(estreitas).toHaveLength(5)
    for (const altura of estreitas) {
      expect(358 / altura, String(altura)).toBeGreaterThanOrEqual(1.3)
      expect(358 / altura, String(altura)).toBeLessThanOrEqual(1.55)
    }
  })

  it('B1: nenhuma cena tem peça de papel que passe da borda por conta da escala (as 4 peças puxadas para dentro)', () => {
    const berco = estiloDe('mc-laje-papel')
    expect(cqw(berco.left) + cqw(berco.width)).toBeLessThanOrEqual(94)
    expect(cqw(berco.top) + cqw(berco.height)).toBeLessThanOrEqual(90)
  })
})

describe('C1: o zoom de 200% (zoom200.css)', () => {
  const caminho = 'prototipo/zoom200.css'
  const css = existsSync(pastaSrc + caminho) ? semComentarios(lerTexto(caminho)) : ''

  it('existe, é importado pelo Cabecalho e só tem regras dentro de @media (max-width: 359px)', () => {
    expect(css).not.toBe('')
    expect(lerTexto('componentes/casca/Cabecalho.tsx')).toMatch(/import\s+'\.\.\/\.\.\/prototipo\/zoom200\.css'/)
    const resto = css.replace(emMedia(css, 'max-width: 359px'), '').replace(/@media\s*\(max-width:\s*359px\)\s*\{\s*\}/g, '')
    expect(resto.trim()).toBe('')
  })

  it('o cabeçalho tem duas linhas (o dobro do alvo de toque), o nome desce na escala (17) e o rótulo curto da ação some', () => {
    const minusculo = emMedia(css, 'max-width: 359px')
    expect(corpos(minusculo, ':root').join('\n')).toMatch(/--e-cabecalho:\s*calc\(var\(--alvo-toque\)\s*\*\s*2\)\s*;/)
    expect(corpos(minusculo, '.sb-cab-nome').join('\n')).toMatch(/font-size:\s*1\.0625rem\s*;/)
    expect(corpos(minusculo, '.sb-cab-acao .sb-cab-rotulo-curto').join('\n')).toMatch(/display:\s*none\s*;/)
  })

  it('o botão da ação continua com aria-label e aria-pressed no DOM, mesmo sem o texto curto', () => {
    const { container } = render(<div />)
    expect(container).toBeTruthy()
    renderizarRota('/app/hoje')
    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(botao.getAttribute('aria-label')).toBe('Modo madrugada')
  })

  it('a etiqueta quebra a linha, o cronômetro e o CTA descem na escala, e os botões de moldura quebram o rótulo', () => {
    const minusculo = emMedia(css, 'max-width: 359px')
    expect(corpos(minusculo, '.sb-etiqueta').join('\n')).toMatch(/white-space:\s*normal\s*;/)
    expect(corpos(minusculo, '.sb-etiqueta').join('\n')).toMatch(/height:\s*auto\s*;/)
    expect(corpos(minusculo, ".ha-cron-valor[data-tamanho='normal']").join('\n')).toMatch(/font-size:\s*(2\.25|2)rem\s*;/)
    expect(corpos(minusculo, '.vt-cta').join('\n')).toMatch(/max-width:\s*100%\s*;/)
    expect(corpos(minusculo, '.sb-moldura-miolo').join('\n')).toMatch(/white-space:\s*normal\s*;/)
  })

  it('as linhas "Em breve" do menu do celular quebram (flex-wrap) para a etiqueta descer sem passar do painel', () => {
    const minusculo = emMedia(css, 'max-width: 359px')
    const regra = corpos(minusculo, '.sb-menu-item').join('\n')
    expect(regra).toMatch(/flex-wrap:\s*wrap\s*;/)
    expect(regra).toMatch(/gap:\s*4px\s+8px\s*;/)
    expect(regra).toMatch(/padding-inline:\s*8px\s*;/)
  })
})
