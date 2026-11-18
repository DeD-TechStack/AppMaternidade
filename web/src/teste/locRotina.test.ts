import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CartaoSessao } from '../componentes/app/CartaoSessao.tsx'
import { CONFIRMACAO, FORMATOS, FORMULARIO, HOJE, ROTULO_TIPO, SESSOES, TOTAIS } from '../conteudo/rotina.ts'
import { DESENVOLVIMENTO_DESTAQUE } from '../conteudo/desenvolvimento/pagina.ts'
import { FASES, MARCOS } from '../conteudo/desenvolvimento/itens.ts'
import { bebeArquivado } from '../conteudo/desenvolvimento/textosLogada.ts'
import { TT } from '../conteudo/desenvolvimento/textosTummy.ts'
import { formatarDuracao, formatarUltimo } from '../prototipo/formatar.ts'
import { CARTAO_SESSAO, SESSOES_ANTERIORES, SUBTITULO_SEM_SESSAO } from '../prototipo/textosSessao.ts'

// LOC-03 (copy pt-BR): rotina, sessão e desenvolvimento leem certo para todo valor que recebem. O rótulo do tipo
// muda de gênero ("o sono", "a mamada", "a fralda"); por isso nenhuma frase pode levar "Este"/"Esta" na frente dele.

const MIN = 60_000
const ROTULOS = Object.values(ROTULO_TIPO)
const minusculo = (texto: string) => texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)

describe('LOC-03: sem artigo de gênero diante do rótulo do tipo', () => {
  it('cobre os 7 tipos', () => {
    expect(ROTULOS).toEqual(['Sono', 'Mamada', 'Tummy time', 'Mamadeira', 'Fralda', 'Alimentação sólida', 'Observação'])
  })

  for (const rotuloMaiusculo of ROTULOS) {
    const rotulo = minusculo(rotuloMaiusculo)

    it(`R01: confirmaDuracao de "${rotulo}" não leva "Este/Esta"`, () => {
      const frase = FORMULARIO.confirmaDuracao(rotulo, '2 h')
      expect(frase).toBe(`Duração de 2 h: mais do que o esperado para ${rotulo}.`)
      expect(frase).not.toMatch(/\bEst[ea]\b/)
    })

    it(`R02: confirmaSobreposicao e EmAndamento de "${rotulo}" não levam "Este/Esta"`, () => {
      const fechada = FORMULARIO.confirmaSobreposicao(rotulo, '03:30', '04:20')
      const aberta = FORMULARIO.confirmaSobreposicaoEmAndamento(rotulo, '08:48')
      expect(fechada).toBe(`Há outro registro de ${rotulo} no mesmo horário, das 03:30 às 04:20.`)
      expect(aberta).toBe(`Há outro registro de ${rotulo} no mesmo horário, das 08:48 até agora (em andamento).`)
      expect(fechada).not.toMatch(/\bEst[ea]\b/)
      expect(aberta).not.toMatch(/\bEst[ea]\b/)
    })

    it(`R03: duplicado de "${rotulo}" diz quem já fez o registro e a hora`, () => {
      expect(CONFIRMACAO.duplicado('Bruno', rotulo, '09:55')).toBe(`Bruno já fez um registro de ${rotulo} às 09:55.`)
    })

    it(`R05: "ontem às" volta pelo formatarUltimo com o rótulo "${rotuloMaiusculo}"`, () => {
      const quando = FORMATOS.ontem('17:30')
      expect(quando).toBe('ontem às 17:30')
      expect(formatarUltimo(rotuloMaiusculo, quando)).toEqual({ valor: '17:30', legenda: `${rotuloMaiusculo}, ontem` })
    })
  }
})

describe('LOC-03: tempo, hora e autoria', () => {
  it('R06: formatarDuracao não escreve "0 min" depois de uma hora cheia', () => {
    expect(formatarDuracao(120 * MIN)).toBe('2 h')
    expect(formatarDuracao(60 * MIN)).toBe('1 h')
    expect(formatarDuracao(45 * MIN)).toBe('45 min')
    expect(formatarDuracao(65 * MIN)).toBe('1 h 5 min')
    expect(formatarDuracao(0)).toBe('0 min')
  })

  it('R06: a duração entra inteira na frase da confirmação', () => {
    for (const [ms, texto] of [
      [120 * MIN, '2 h'],
      [45 * MIN, '45 min'],
      [65 * MIN, '1 h 5 min'],
    ] as const) {
      expect(FORMULARIO.confirmaDuracao('sono', formatarDuracao(ms))).toBe(`Duração de ${texto}: mais do que o esperado para sono.`)
    }
  })

  it('R05: o prefixo "ontem às" é o mesmo que o formatarUltimo corta; "ontem 17:30" já não é prefixo', () => {
    expect(formatarUltimo('Fralda', 'ontem às   17:30')).toEqual({ valor: '17:30', legenda: 'Fralda, ontem' })
    expect(formatarUltimo('Fralda', 'ontem 17:30').valor).toBe('ontem 17:30')
  })

  it('R04: "Início às HH:MM, por Autor" nas sessões e no cartão do Hoje', () => {
    expect(SESSOES.iniciadoAs('08:48', 'Bruno')).toBe('Início às 08:48, por Bruno')
    expect(SESSOES.iniciadoAs('23:05', 'Juliana')).toBe('Início às 23:05, por Juliana')
    expect(CARTAO_SESSAO.inicioAs('08:48')).toBe('Início às 08:48, ')
  })

  it('R07: o resumo das fraldas diz o que cada número conta', () => {
    expect(TOTAIS.fraldasPorTipo(3, 1, 1, 1)).toBe('3: 1 de xixi, 1 de cocô, 1 com xixi e cocô')
    expect(TOTAIS.fraldasPorTipo(0, 0, 0, 0)).toBe('0: 0 de xixi, 0 de cocô, 0 com xixi e cocô')
    expect(TOTAIS.fraldasPorTipo(12, 5, 4, 3)).toBe('12: 5 de xixi, 4 de cocô, 3 com xixi e cocô')
  })

  it('R08: a última mamada diz quem registrou, e não "com" quem', () => {
    expect(HOJE.ultimaMamada('07:32', 'Bruno')).toBe('Última mamada às 07:32, registrada por Bruno')
    expect(HOJE.ultimaMamada('23:50', 'Juliana')).toBe('Última mamada às 23:50, registrada por Juliana')
  })

  it('HOJE.umaHoraEMinutos fica como está (RF12 v3 RN-08)', () => {
    expect(HOJE.umaHoraEMinutos(12, 5)).toBe('12 h 05')
  })
})

describe('LOC-03: Desenvolvimento', () => {
  const textosDoMarco = MARCOS.itens.flatMap((item) => item.textos)

  it('V01: sem a afirmação clínica sem fonte, e o conselho com fonte fica', () => {
    for (const texto of textosDoMarco) expect(texto).not.toMatch(/Na maioria das vezes não é nada sério/)
    expect(textosDoMarco).toContain('As fontes recomendam não esperar para conversar.')
  })

  it('V03: a condição do tummy time no peito não supõe o gênero de quem cuida', () => {
    const itens = FASES.flatMap((fase) => fase.itens)
    for (const item of itens) expect(item).not.toMatch(/se você estiver bem acordado/)
    expect(itens.some((item) => item.endsWith('se você não estiver com sono.'))).toBe(true)
  })

  it('V04: o tummy time já é um registro da rotina, e "Sem metas, sem cobrança." não vira frase solta', () => {
    const { lide } = DESENVOLVIMENTO_DESTAQUE
    expect(lide).not.toMatch(/vai ser/)
    expect(lide).not.toMatch(/Sem metas, sem cobrança\./)
    expect(lide).toMatch(/sem metas e sem cobrança\.$/)
  })

  it('V05: o alt da cena não usa nome de token, cita o AppMaternidade e termina em ponto', () => {
    const { alt } = DESENVOLVIMENTO_DESTAQUE.cena
    expect(alt).not.toMatch(/cacau|\bmel\b|oliva|marrom|amarelo/i)
    expect(alt).toMatch(/AppMaternidade/)
    expect(alt).toMatch(/\.$/)
  })

  it('V06: o aviso do bebê arquivado fala do cadastro, para qualquer nome', () => {
    for (const nome of ['Heloísa', 'Davi', 'Maria Clara']) {
      expect(bebeArquivado(nome)).toBe(
        `O cadastro de ${nome} está arquivado. Os registros continuam visíveis, mas não dá para registrar.`,
      )
    }
  })

  it('V07: a autoria de conta removida diz "pessoa removida"', () => {
    expect(TT.contaRemovida).toBe('por pessoa removida')
  })
})

describe('LOC-03: sessão e registro rápido', () => {
  it('A01: o cartão sem sessão manda para o registro rápido', () => {
    expect(CARTAO_SESSAO.comoComecar).toBe('Para começar, toque em Sono ou Mamada no registro rápido, embaixo.')
    const { container } = render(
      createElement(MemoryRouter, null, createElement(CartaoSessao, { sessao: null, agora: 0, aoEncerrar: () => undefined })),
    )
    expect(container.textContent).toContain('Para começar, toque em Sono ou Mamada no registro rápido, embaixo.')
  })

  it('A02: o subtítulo da Sessão vazia manda para o registro rápido, na tela Hoje', () => {
    expect(SUBTITULO_SEM_SESSAO).toBe('Comece uma sessão pelo registro rápido, na tela Hoje.')
  })

  it('A03: os títulos de sessões anteriores', () => {
    expect(SESSOES_ANTERIORES.sono).toBe('Sessões anteriores de sono')
    expect(SESSOES_ANTERIORES.mamada).toBe('Mamadas anteriores')
    expect(SESSOES_ANTERIORES.tummy).toBe('Sessões anteriores de tummy time')
  })

  it('A04: o cartão do Hoje escreve "Início às HH:MM, por Pessoa"', () => {
    const inicio = new Date(2026, 10, 5, 8, 48).getTime()
    const { container } = render(
      createElement(
        MemoryRouter,
        null,
        createElement(CartaoSessao, {
          sessao: { tipo: 'sono', inicio, pessoa: 'Bruno' },
          agora: inicio + MIN,
          aoEncerrar: () => undefined,
        }),
      ),
    )
    expect(container.textContent).toContain('Início às 08:48, por Bruno')
    expect(container.textContent).not.toContain('Iniciado')
  })
})

describe('LOC-03: nenhum texto da área leva as frases velhas', () => {
  /** Toda string de um objeto de conteúdo, em qualquer profundidade (as funções entram com valores de exemplo). */
  function textos(valor: unknown): string[] {
    if (typeof valor === 'string') return [valor]
    if (Array.isArray(valor)) return valor.flatMap(textos)
    if (valor !== null && typeof valor === 'object') return Object.values(valor).flatMap(textos)
    return []
  }

  const todos = [
    ...textos(CARTAO_SESSAO),
    ...textos(SESSOES_ANTERIORES),
    ...textos(FORMULARIO),
    ...textos(SESSOES),
    ...textos(TT),
    SUBTITULO_SEM_SESSAO,
    CARTAO_SESSAO.inicioAs('08:48'),
    SESSOES.iniciadoAs('08:48', 'Bruno'),
    bebeArquivado('Heloísa'),
    ...ROTULOS.flatMap((rotulo) => [
      FORMULARIO.confirmaDuracao(minusculo(rotulo), '2 h'),
      FORMULARIO.confirmaSobreposicao(minusculo(rotulo), '03:30', '04:20'),
      FORMULARIO.confirmaSobreposicaoEmAndamento(minusculo(rotulo), '08:48'),
    ]),
  ]

  it('controle: a varredura enxerga textos', () => {
    expect(todos.length).toBeGreaterThan(50)
  })

  for (const velha of ['barra Registrar', 'conta removida', 'Tummy time anteriores', 'Iniciado às', 'Sonecas anteriores']) {
    it(`nenhum texto contém "${velha}"`, () => {
      expect(todos.filter((texto) => texto.includes(velha))).toEqual([])
    })
  }
})
