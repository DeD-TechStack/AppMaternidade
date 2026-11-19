import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { COMO_FUNCIONA_DESTAQUE, CUIDADO_DESTAQUE } from '../conteudo/publicas-destaque.ts'
import { INI } from '../conteudo/inicio.ts'
import { INICIO } from '../conteudo/textos.ts'
import { PESSOAS_DEMONSTRACAO, criarFixtureDemonstracao } from '../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria } from '../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from './renderizarComDados.tsx'
import { renderizarRota } from './renderizarRota.tsx'

// A família de exemplo são as três pessoas que Daniel escolheu, só pelo primeiro nome: o pai Ícaro, a mãe
// Juliana e a bebê Heloísa (SEED-A). Nas linhas do dia a dia ("Ju", "Helo") o texto escrito à mão usa o
// apelido; a página Família e os ajustes usam o nome inteiro. Aqui os nomes antigos aparecem só nas
// asserções negativas.

const AGORA = Date.parse('2026-11-17T19:54:02-03:00')

/** O texto de um arquivo do repositório (a partir de `web/`), com CRLF virando LF e acentos em NFC. */
function lerArquivo(relativo: string): string {
  return readFileSync(join(process.cwd(), '..', relativo), 'utf8').replace(/\r\n/g, '\n').normalize('NFC')
}

/** O nome como palavra inteira: sem `\b`, que não vê a letra acentuada como letra. */
const palavra = (nome: string) => new RegExp(`(?<![\\p{L}])${nome}(?![\\p{L}])`, 'u')

/** Os textos de cada nó de texto da tela, aparados. */
function nosDeTexto(): string[] {
  const percurso = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const textos: string[] = []
  for (let no = percurso.nextNode(); no; no = percurso.nextNode()) textos.push((no.nodeValue ?? '').trim())
  return textos
}

describe('SEED-A-I-02: os nomes nos dados, nos seeds e no texto', () => {
  it('o pai é Ícaro, com o mesmo id e e-mail novo, e não há mais a chave antiga', () => {
    expect(PESSOAS_DEMONSTRACAO).toHaveProperty('icaro')
    expect(PESSOAS_DEMONSTRACAO.icaro).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'icaro@exemplo.invalid',
      nome: 'Ícaro',
    })
    expect('bruno' in PESSOAS_DEMONSTRACAO).toBe(false)
  })

  it('a mãe é Juliana e a bebê é Heloísa', () => {
    expect(PESSOAS_DEMONSTRACAO.responsavel.nome).toBe('Juliana')
    expect(criarFixtureDemonstracao(AGORA).bebes[0].nome).toBe('Heloísa')
  })

  it('todo nome de exemplo é uma palavra só: só o primeiro nome, sem sobrenome', () => {
    for (const pessoa of Object.values(PESSOAS_DEMONSTRACAO)) expect(pessoa.nome).toMatch(/^\p{L}+$/u)
  })

  it('o seed do banco local traz Ícaro e o e-mail novo', () => {
    const texto = lerArquivo('supabase/seed.sql')
    expect(texto).toContain("('22222222-2222-4222-8222-222222222222', 'Ícaro', 'America/Sao_Paulo')")
    expect(texto).toMatch(palavra('Ícaro'))
    expect(texto).toContain('icaro@exemplo.invalid')
  })

  it('o seed da rotina usa c_icaro', () => {
    expect(lerArquivo('supabase/seeds/46_rotina.sql')).toMatch(/(?<![\p{L}_])c_icaro(?![\p{L}_])/u)
  })

  it('o texto das páginas públicas tem a frase da família com Ícaro', () => {
    const texto = lerArquivo('web/src/conteudo/publicas-destaque.ts')
    expect(texto).toContain('Cada momento vem numa tela da família de Juliana, Ícaro e Carla, que cuidam da Heloísa.')
    expect(texto).toMatch(palavra('Ícaro'))
  })

  it('nenhum desses arquivos traz o nome antigo, em nenhuma caixa', () => {
    for (const arquivo of ['supabase/seed.sql', 'supabase/seeds/46_rotina.sql', 'web/src/conteudo/publicas-destaque.ts']) {
      expect(lerArquivo(arquivo), arquivo).not.toMatch(/bruno/i)
    }
  })
})

describe('SEED-A-I-07: o nome inteiro na Família e nos ajustes', () => {
  it('os objetos de conteúdo guardam Juliana, Ícaro, Heloísa e Carla por inteiro', () => {
    expect(COMO_FUNCIONA_DESTAQUE.momentos.texto).toBe(
      'Cada momento vem numa tela da família de Juliana, Ícaro e Carla, que cuidam da Heloísa.',
    )
    expect(COMO_FUNCIONA_DESTAQUE.convite.pessoa).toBe('Ícaro')
    expect(COMO_FUNCIONA_DESTAQUE.convite.papel).toBe('Responsável, convidado por Juliana')
    expect(CUIDADO_DESTAQUE.familia.bebe.nome).toBe('Heloísa')
    expect(CUIDADO_DESTAQUE.familia.pessoas.map((pessoa) => pessoa.nome)).toEqual(['Juliana', 'Ícaro', 'Carla'])
    const bloco = (titulo: string) => CUIDADO_DESTAQUE.blocos.find((item) => item.titulo === titulo)!
    expect(bloco('Convite com papel').exemplo).toEqual({
      inicial: 'Í',
      quem: 'Ícaro',
      oQue: 'Entrou como responsável, convidado por Juliana',
    })
    expect(bloco('Revogue quando quiser').exemplo).toEqual({
      inicial: 'J',
      quem: 'Juliana',
      oQue: 'Removeu o acesso de uma babá antiga',
    })
  })

  describe('as páginas renderizadas', () => {
    beforeEach(() => {
      sessionStorage.clear()
      localStorage.clear()
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(AGORA)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('a página Família mostra Juliana, Ícaro e Heloísa por inteiro, e nenhum "Ju" nem "Helo"', async () => {
      renderizarComDados('/app/familia', { dados: criarDadosContaMemoria(criarFixtureDeTeste(AGORA)), sessao: 'juliana' })
      await screen.findByRole('heading', { level: 1, name: 'Família' })
      await screen.findByRole('heading', { level: 2, name: 'Bebês' })

      const textos = nosDeTexto()
      expect(textos).toContain('Juliana')
      expect(textos).toContain('Ícaro')
      expect(textos).toContain('Heloísa')
      expect(textos).not.toContain('Ju')
      expect(textos).not.toContain('Helo')
    })

    it('o cartão Família de /cuidado-compartilhado mostra Juliana, Ícaro e Heloísa', () => {
      renderizarRota('/cuidado-compartilhado')
      const figura = screen.getByRole('figure', { name: CUIDADO_DESTAQUE.familia.descricao })
      for (const nome of ['Juliana', 'Ícaro', 'Heloísa']) expect(within(figura).getByText(nome)).toBeTruthy()
    })
  })
})

/** Os elementos cujo texto inteiro é este (a hora presa em um `<span>` não parte a linha em dois nós). */
const comTexto = (texto: string) => [...document.body.querySelectorAll('*')].filter((no) => no.textContent === texto)

describe('SEED-A-I-08: o apelido nas linhas do dia a dia', () => {
  const COMO = COMO_FUNCIONA_DESTAQUE
  const CUIDADO = CUIDADO_DESTAQUE

  it('os textos escritos à mão dizem Ju e Helo, no valor exato', () => {
    expect(COMO.primeirosRegistros.itens[0].detalhe).toBe('Lado direito, Ju')
    expect(COMO.madrugada.detalhe).toBe('Lado esquerdo, Ju')
    expect(COMO.desdeQueSaiu.itens[1].detalhe).toBe('Lado direito, Ju')
    expect(CUIDADO.tarde.titulo).toBe('Tarde da Helo')
    expect(CUIDADO.nota.autor).toBe('Carla, para Ju, às 15:22')
    expect(INICIO.turno.cartao.itens[0].pessoa).toBe('Ju')
    expect(INICIO.citacao.autor).toBe('Carla, avó da Helo, na nota das 22:40')
  })

  it('nenhum desses valores traz Juliana nem Heloísa por inteiro', () => {
    const valores = [
      COMO.primeirosRegistros.itens[0].detalhe,
      COMO.madrugada.detalhe,
      COMO.desdeQueSaiu.itens[1].detalhe,
      CUIDADO.tarde.titulo,
      CUIDADO.nota.autor,
      INICIO.turno.cartao.itens[0].pessoa,
      INICIO.citacao.autor,
    ]
    for (const valor of valores) expect(valor).not.toMatch(/(?<![\p{L}])(Juliana|Heloísa)(?![\p{L}])/u)
  })

  it('/cuidado-compartilhado mostra a nota de Carla "para Ju" e a "Tarde da Helo"', () => {
    renderizarRota('/cuidado-compartilhado')
    expect(comTexto('Carla, para Ju, às 15:22').length).toBeGreaterThan(0)
    expect(comTexto('Tarde da Helo').length).toBeGreaterThan(0)
  })

  it('/sistema mostra "Lado esquerdo, Ju" e a citação com "avó da Helo"', () => {
    renderizarRota('/sistema')
    expect(screen.getAllByText('Lado esquerdo, Ju').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carla, avó da Helo, na nota das 22:40').length).toBeGreaterThan(0)
  })

  // REP-HOME: the new Início (COPY_inicio.md) has no "Desde que você saiu" card. The two carers are named in its captions
  // and paragraphs: "Ju" by her nickname, Ícaro by his name, and the visible text never carries the full names.
  it('o Início nomeia a Ju (apelido) e o Ícaro no texto visível', () => {
    const { container } = renderizarRota('/')
    const texto = container.querySelector('main')!.textContent!
    expect(texto).toMatch(/(?<![\p{L}])Ju(?![\p{L}])/u)
    expect(texto).toContain('Ícaro')
    expect(texto).not.toMatch(/(?<![\p{L}])(Juliana|Heloísa)(?![\p{L}])/u)
    expect(comTexto(INI.leg2).length).toBeGreaterThan(0)
  })
})
