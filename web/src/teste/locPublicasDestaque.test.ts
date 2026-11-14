import { describe, expect, it } from 'vitest'
import { COMO_FUNCIONA_DESTAQUE, CUIDADO_DESTAQUE } from '../conteudo/publicas-destaque.ts'

// LOC-02 (LOC_REV D01-D07): Como funciona e Cuidado compartilhado dizem só o que o site faz. O
// responsável não tem prazo de acesso (TEXTOS_ERRO.responsavel_sem_validade), a remoção vale na hora
// (dialogos.removerAcesso), a família fictícia é a mesma nas duas páginas e o texto alternativo não usa
// nome de token de cor. Os textos de madrugada e de registro (passos[1] e registro.texto) são da NEW-B.

/** Todo `alt` dentro de um objeto de conteúdo, em qualquer profundidade. */
function alts(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(alts)
  if (valor === null || typeof valor !== 'object') return []
  return Object.entries(valor).flatMap(([chave, v]) => (chave === 'alt' && typeof v === 'string' ? [v] : alts(v)))
}

const bloco = (titulo: string) => {
  const achado = CUIDADO_DESTAQUE.blocos.find((b) => b.titulo === titulo)
  if (!achado) throw new Error(`bloco "${titulo}" não existe`)
  return achado
}

const pessoa = (nome: string) => {
  const achada = CUIDADO_DESTAQUE.familia.pessoas.find((p) => p.nome === nome)
  if (!achada) throw new Error(`pessoa "${nome}" não existe`)
  return achada
}

describe('LOC-02: prazo de acesso e família fictícia', () => {
  it('D02: o prazo vale para cuidadores e observadores, nunca para "qualquer vínculo"', () => {
    const texto = bloco('Acesso com prazo').texto
    expect(texto).toMatch(/Cuidadores e observadores/)
    expect(texto).not.toMatch(/Qualquer vínculo/i)
    expect(texto).not.toMatch(/respons[aá]vel/i)
  })

  it('D04: Bruno é Responsável nas duas famílias de exemplo', () => {
    expect(COMO_FUNCIONA_DESTAQUE.convite.papel).toMatch(/^Responsável\b/)
    expect(pessoa('Bruno').papel).toBe('Responsável')
    const exemplo = bloco('Convite com papel').exemplo
    expect(exemplo.quem).toBe('Bruno')
    expect(exemplo.oQue).toMatch(/como responsável/)
    expect(exemplo.oQue).not.toMatch(/cuidador/i)
  })

  it('D05: a linha de Carla tem o formato da tela Família (papel · acesso até)', () => {
    expect(pessoa('Carla').papel).toBe('Cuidador · acesso até domingo')
    expect(bloco('Acesso com prazo').exemplo.oQue).toMatch(/^Cuidadora\b/)
  })

  it('D06: nenhum alt usa nome de token de cor, e todo alt termina em ponto', () => {
    const todos = [...alts(COMO_FUNCIONA_DESTAQUE), ...alts(CUIDADO_DESTAQUE)]
    // Controle: sem nenhum alt, a varredura não prova nada.
    expect(todos.length).toBeGreaterThan(0)
    for (const alt of todos) {
      expect(alt).not.toMatch(/oliva|\bmel\b|cacau/i)
      expect(alt).toMatch(/\.$/)
    }
  })

  it('D03: a remoção vale na hora, sem depender de o aparelho se conectar', () => {
    const textos = [bloco('Revogue quando quiser').texto, ...CUIDADO_DESTAQUE.parar.textos]
    for (const texto of textos) {
      expect(texto).not.toMatch(/se conectar à internet|sem internet/)
    }
    expect(bloco('Revogue quando quiser').texto).toMatch(/na hora/)
    expect(CUIDADO_DESTAQUE.parar.textos[0]).toMatch(/na hora/)
  })

  it('D07: o autor da soneca vem como "por Bruno"', () => {
    expect(COMO_FUNCIONA_DESTAQUE.desdeQueSaiu.andamento.detalhe).toBe('Começou às 14:05, por Bruno')
  })

  it('D01: o que o site já faz fica no presente (fora dos textos da NEW-B)', () => {
    const presentes = [
      COMO_FUNCIONA_DESTAQUE.lide,
      COMO_FUNCIONA_DESTAQUE.passos[0].texto,
      COMO_FUNCIONA_DESTAQUE.passos[2].texto,
      CUIDADO_DESTAQUE.lide,
      bloco('Convite com papel').texto,
      bloco('Acesso com prazo').texto,
      bloco('Revogue quando quiser').texto,
      CUIDADO_DESTAQUE.passagem.texto,
      ...CUIDADO_DESTAQUE.parar.textos,
    ]
    for (const texto of presentes) {
      // `\b` do JS não vê o "ã" como letra: o fim da palavra é espaço, pontuação ou fim do texto.
      expect(texto).not.toMatch(/(^|\s)(vai|vão)(?=[\s.,:;]|$)|o plano é/i)
    }
    // Conta e bebê já existem; termos e consentimento em telas separadas ainda não (seguem no futuro).
    const conta = COMO_FUNCIONA_DESTAQUE.comecar.textos[1]
    expect(conta).not.toMatch(/o plano é|vai ser por|vai pedir/i)
    expect(conta).toMatch(/consentimento/)
  })
})
