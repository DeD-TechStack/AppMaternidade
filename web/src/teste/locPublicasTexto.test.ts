import { describe, expect, it } from 'vitest'
import { PAGINAS_DE_TEXTO, type Bloco, type PaginaDeTexto } from '../conteudo/publicas-texto.ts'

// LOC-01: as páginas de leitura descrevem o site que existe. Uma função que o site já tem fica no presente,
// e nenhuma frase promete o que o site não tem. Cada achado (F05 a F17) confere a frase antiga ausente e o
// fato novo presente. Os achados que ficam para outro cartão estão no HANDOFF do LOC-01.

function textosDoBloco(bloco: Bloco): string[] {
  if (typeof bloco === 'string') return [bloco]
  if (Array.isArray(bloco)) return [bloco.map((trecho) => (typeof trecho === 'string' ? trecho : trecho.link)).join('')]
  if ('itens' in bloco) return [...bloco.itens]
  if ('titulados' in bloco) return bloco.titulados.flatMap(({ titulo, texto }) => [titulo, texto])
  return []
}

/** Todo texto que a página mostra: título, segunda linha, apoio, abertura, seções, blocos e tabela. */
function textosDaPagina(pagina: PaginaDeTexto): string[] {
  return [
    pagina.nome,
    pagina.subtitulo,
    pagina.apoio,
    ...(pagina.apresentacao ? [pagina.apresentacao] : []),
    ...pagina.secoes.flatMap((secao) => [
      secao.secao.titulo,
      ...secao.blocos.flatMap(textosDoBloco),
      ...(secao.tabela ? [secao.tabela.legenda, ...secao.tabela.colunas, ...secao.tabela.linhas.flat()] : []),
    ]),
  ]
}

const texto = (chave: keyof typeof PAGINAS_DE_TEXTO) => textosDaPagina(PAGINAS_DE_TEXTO[chave]).join('\n')

describe('LOC-01: nenhuma página de leitura fala da comunidade como futura nem promete silenciar', () => {
  for (const chave of Object.keys(PAGINAS_DE_TEXTO) as Array<keyof typeof PAGINAS_DE_TEXTO>) {
    it(`${chave}: sem "ainda não abriu", "quando ela abrir" nem "silenciar"`, () => {
      const pagina = texto(chave)
      expect(pagina).not.toContain('ainda não abriu')
      expect(pagina).not.toContain('quando ela abrir')
      expect(pagina).not.toContain('quando a comunidade abrir')
      expect(pagina.toLowerCase()).not.toContain('silenciar')
    })
  }
})

describe('LOC-01: Regras da comunidade', () => {
  it('F05 a comunidade está aberta para quem tem conta', () => {
    const regras = PAGINAS_DE_TEXTO.regras
    expect(regras.subtitulo).not.toBe('Para quando ela abrir.')
    expect(regras.apresentacao).toContain('está aberta para quem tem conta')
  })

  it('F06 as regras que o site já aplica estão no presente', () => {
    const regras = texto('regras')
    for (const antiga of ['vai aceitar estas regras', 'vai ser vista só', 'vão valer', 'vai poder denunciar', 'vai valer para os dois lados', 'A moderação vai usar']) {
      expect(regras, antiga).not.toContain(antiga)
    }
    expect(regras).toContain('Antes da primeira publicação, cada pessoa aceita estas regras.')
    expect(regras).toContain('só para quem entrou na conta e fica fora dos buscadores')
    expect(regras).toContain('Qualquer pessoa pode denunciar um tópico, uma resposta ou um perfil')
    expect(regras).toContain('O bloqueio vale para os dois lados')
  })

  it('F07 a seção se chama "Denunciar e bloquear"', () => {
    const titulos = PAGINAS_DE_TEXTO.regras.secoes.map((secao) => secao.secao.titulo)
    expect(titulos).toContain('Denunciar e bloquear')
  })
})

describe('LOC-01: Privacidade', () => {
  it('F14 o site não pede CPF, documento nem localização (presente, sem "A proposta é")', () => {
    const privacidade = texto('privacidade')
    expect(privacidade).not.toContain('A proposta é não pedir CPF')
    expect(privacidade).toContain('O site não pede CPF, documento nem localização.')
  })
})

describe('LOC-01: Exclusão de conta', () => {
  it('F03 quem é responsável recebe os dados da família inteira', () => {
    expect(texto('exclusao')).toContain('Quem é responsável recebe os dados da família inteira')
  })

  it('F04 a pessoa entra na conta e confirma com a senha', () => {
    expect(texto('exclusao')).toContain('a pessoa entra na conta dela e confirma com a senha atual')
  })

  it('F10 o conteúdo vira "[removido]" e o autor aparece como "pessoa removida"', () => {
    const exclusao = texto('exclusao')
    expect(exclusao).not.toContain('a resposta dela vai aparecer como')
    expect(exclusao).toContain('“[removido]”')
    expect(exclusao).toContain('“pessoa removida”')
  })

  it('F11 a única pessoa responsável não exclui a conta antes de passar o papel ou excluir a família', () => {
    const exclusao = texto('exclusao')
    expect(exclusao).not.toContain('o espaço da família inteiro')
    expect(exclusao).toContain('o site não deixa excluir a conta')
    expect(exclusao).toContain('torna outra pessoa responsável ou exclui a família')
  })

  it('os três marcadores da AUD-F1 continuam: /app/conta, "Baixar meus dados" e "Excluir minha conta"', () => {
    const exclusao = texto('exclusao')
    expect(exclusao).toContain('/app/conta')
    expect(exclusao).toContain('“Baixar meus dados”')
    expect(exclusao).toContain('“Excluir minha conta”')
  })
})

describe('LOC-01: Sobre', () => {
  it('F09 as quatro partes já estão no site (sem "quer juntar")', () => {
    const sobre = PAGINAS_DE_TEXTO.sobre
    expect(sobre.apresentacao).not.toContain('quer juntar')
    expect(sobre.apresentacao).toContain('As quatro partes já estão no site.')
  })

  it('F17 as frases dos pilares estão no presente, e o tummy time é explicado como tempo de bruços', () => {
    const secao = PAGINAS_DE_TEXTO.sobre.secoes.find((item) => item.secao.titulo === 'O que ele faz')!
    const frases = secao.blocos.flatMap(textosDoBloco).filter((_, indice) => indice % 2 === 1).slice(0, 4)
    expect(frases).toHaveLength(4)
    for (const frase of frases) expect(frase, frase).not.toMatch(/^Vai /)
    expect(frases[1]).toContain('tummy time (o tempo de bruços')
  })
})

describe('LOC-01: decisões do líder', () => {
  it('Regras: não promete contestação, que o site ainda não tem', () => {
    const regras = texto('regras')
    expect(regras).not.toContain('contestar')
    expect(regras).not.toContain('contestação')
    expect(regras).toContain('Quem modera não lê dados de família.')
  })

  it('Privacidade, Seus direitos: o arquivo leva só a última versão e não leva as notas de passagem de turno', () => {
    expect(texto('privacidade')).toContain(
      'Quando o seu vínculo com uma família acaba, o arquivo leva só a última versão dos registros que você mesmo escreveu, sem as mudanças feitas depois por outras pessoas, e não leva as notas de passagem de turno dessa família.',
    )
  })
})
