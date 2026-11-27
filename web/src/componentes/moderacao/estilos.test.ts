import { describe, expect, it } from 'vitest'
import {
  BOTAO_PRINCIPAL_QUEBRA,
  BOTAO_SECUNDARIO_QUEBRA,
  ETIQUETAS_QUEBRAM,
  HOVER_DA_ABA,
  LINK_DO_PAINEL,
  LINK_ALVO_DO_PAINEL,
  ATUAL,
} from './estilos.ts'

// As classes do painel que o navegador precisa para quebrar a linha (a 390 px com 200 % de fonte) e para
// mostrar o hover. O jsdom não tem layout: confere-se a classe, não a medida.

const classes = (texto: string) => texto.split(/\s+/).filter(Boolean)

describe('botões que quebram o rótulo', () => {
  for (const [nome, texto] of [
    ['principal', BOTAO_PRINCIPAL_QUEBRA],
    ['secundário', BOTAO_SECUNDARIO_QUEBRA],
  ] as const) {
    it(`o ${nome} é um cm-botao que quebra a linha, sem nowrap, e guarda a altura mínima`, () => {
      const lista = classes(texto)
      expect(lista).toContain('cm-botao')
      for (const esperada of ['whitespace-normal', 'wrap-anywhere', 'max-w-full', 'text-center', 'h-auto', 'py-3']) {
        expect(lista, esperada).toContain(esperada)
      }
      expect(lista).not.toContain('whitespace-nowrap')
      // Sem `min-h-*` nem `h-*` fixo: o min-height de 56 px (48 no app) do `.cm-botao` segue valendo.
      expect(lista.filter((c) => /^(min-h-|h-)(?!auto)/.test(c))).toEqual([])
    })
  }
})

describe('etiquetas que quebram', () => {
  it('o contêiner deixa a `.sb-etiqueta` encolher, quebrar e não passar da largura', () => {
    const lista = classes(ETIQUETAS_QUEBRAM)
    for (const esperada of ['min-w-0', 'max-w-full', 'whitespace-normal', 'wrap-anywhere']) {
      expect(lista, esperada).toContain(`[&>.sb-etiqueta]:${esperada}`)
    }
  })
})

describe('links do painel: hover visível, só com tokens que já existem', () => {
  it('a aba comum: o fundo muda e o texto sublinha; a atual (ATUAL) não leva hover', () => {
    expect(LINK_DO_PAINEL).not.toMatch(/hover:/)
    expect(HOVER_DA_ABA).toContain('hover:bg-[var(--cor-papel-fundo)]')
    expect(HOVER_DA_ABA).toContain('hover:underline')
    expect(HOVER_DA_ABA).toContain('hover:underline-offset-4')
    expect(ATUAL).not.toMatch(/hover:/)
    expect(ATUAL).toContain('bg-[var(--cor-destaque)]')
  })

  it('o link "Voltar": a cor e o traço mudam no hover e o sublinhado continua (nunca só a cor)', () => {
    expect(LINK_ALVO_DO_PAINEL).toContain('hover:text-[var(--cor-texto)]')
    expect(LINK_ALVO_DO_PAINEL).toContain('hover:decoration-[3px]')
    expect(LINK_ALVO_DO_PAINEL).toContain('underline')
    expect(LINK_ALVO_DO_PAINEL).toContain('alvo-toque')
  })

  it('só os tokens do tema: nenhuma cor solta', () => {
    for (const texto of [HOVER_DA_ABA, LINK_ALVO_DO_PAINEL, ETIQUETAS_QUEBRAM, BOTAO_PRINCIPAL_QUEBRA]) {
      expect(texto).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|oklch\(/)
    }
  })
})
