import { describe, expect, it } from 'vitest'
import { COMO_FUNCIONA, PASSOS } from '../conteudo/casa/comoFunciona.ts'
import { CUIDADO } from '../conteudo/casa/cuidado.ts'

// LOC-02 (LOC_REV D01-D07): Como funciona e Cuidado compartilhado dizem só o que o site faz. A remoção vale na hora
// (dialogos.removerAcesso), o autor do registro vem com o nome e o texto alternativo não usa nome de token de cor.
// Lido da cópia viva das duas páginas (conteudo/casa/); as frases da cara antiga (prazo de acesso, convite com papel,
// família de exemplo) saíram com ela.

/** Os textos alternativos das duas páginas: o `alt` de Cuidado e os `alt*` de Como funciona. */
const todosOsAlts = (): string[] => [
  ...Object.values(CUIDADO.alt),
  ...Object.entries(COMO_FUNCIONA)
    .filter(([chave]) => /^alt[A-Z]/.test(chave))
    .map(([, valor]) => valor as string),
]

describe('LOC-02: o que o site faz, dito no presente', () => {
  it('D06: nenhum alt usa nome de token de cor, e todo alt termina em ponto', () => {
    const todos = todosOsAlts()
    // Controle: sem nenhum alt, a varredura não prova nada (3 + 1 de Cuidado, 5 de Como funciona).
    expect(todos.length).toBeGreaterThanOrEqual(9)
    for (const alt of todos) {
      expect(alt).not.toMatch(/oliva|\bmel\b|cacau/i)
      expect(alt).toMatch(/\.$/)
    }
  })

  it('D03: a remoção vale na hora, sem depender de o aparelho se conectar', () => {
    for (const texto of [CUIDADO.parar.p1, CUIDADO.parar.p2]) {
      expect(texto).not.toMatch(/se conectar à internet|sem internet/)
    }
    expect(CUIDADO.parar.p1).toMatch(/na hora/)
  })

  it('D07: o autor do registro vem como "por Ícaro"', () => {
    expect(COMO_FUNCIONA.leg3).toBe('18:00, sono, anotado por Ícaro')
    expect(COMO_FUNCIONA.leg1).toMatch(/por Ícaro$/)
    expect(CUIDADO.senha.legenda).toMatch(/por Ícaro$/)
  })

  it('D01: o que o site já faz fica no presente', () => {
    const presentes = [
      COMO_FUNCIONA.lede,
      COMO_FUNCIONA.passo1,
      COMO_FUNCIONA.passo3,
      CUIDADO.lede,
      CUIDADO.parar.p1,
      CUIDADO.parar.p2,
    ]
    for (const texto of presentes) {
      // `\b` do JS não vê o "ã" como letra: o fim da palavra é espaço, pontuação ou fim do texto.
      expect(texto).not.toMatch(/(^|\s)(vai|vão)(?=[\s.,:;]|$)|o plano é/i)
    }
    expect(PASSOS[0]).not.toMatch(/o plano é|vai ser por|vai pedir/i)
  })
})
