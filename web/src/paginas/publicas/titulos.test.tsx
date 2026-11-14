import { beforeEach, describe, expect, it } from 'vitest'
import { tituloPublico } from '../../conteudo/conta.ts'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// QA-13 / A11Y-001: cada página pública, a 404 e /sistema definem o título da aba como "<nome> | AppMaternidade" e o
// devolvem ao anterior quando saem de cena. O Início fica como está.

const ANTES = 'Título de antes'

beforeEach(() => {
  document.title = ANTES
})

const ROTAS: ReadonlyArray<[caminho: string, nome: string]> = [
  ['/como-funciona', 'Como funciona'],
  ['/cuidado-compartilhado', 'Cuidado compartilhado'],
  ['/desenvolvimento', 'Desenvolvimento'],
  ['/regras-da-comunidade', 'Regras da comunidade'],
  ['/privacidade', 'Privacidade'],
  ['/termos', 'Termos de uso'],
  ['/exclusao-de-conta', 'Exclusão de conta'],
  ['/contato', 'Contato'],
  ['/sobre', 'Sobre'],
  ['/rota-que-nao-existe', 'Página não encontrada'],
  ['/sistema', 'Sistema'],
]

describe('títulos das páginas públicas (QA-13)', () => {
  it('tituloPublico monta "<nome> | AppMaternidade"', () => {
    expect(tituloPublico('Contato')).toBe('Contato | AppMaternidade')
  })

  it('percorre todas as rotas públicas, a 404 e /sistema: cada uma grava o título da aba', () => {
    for (const [caminho, nome] of ROTAS) {
      document.title = ANTES
      const { unmount } = renderizarRota(caminho)
      expect(document.title, caminho).toBe(`${nome} | AppMaternidade`)
      unmount()
    }
  })

  it('as páginas de leitura usam o nome do próprio conteúdo', () => {
    for (const [caminho, chave] of [
      ['/regras-da-comunidade', 'regras'],
      ['/privacidade', 'privacidade'],
      ['/termos', 'termos'],
      ['/exclusao-de-conta', 'exclusao'],
      ['/contato', 'contato'],
      ['/sobre', 'sobre'],
    ] as const) {
      const { unmount } = renderizarRota(caminho)
      expect(document.title, caminho).toBe(tituloPublico(PAGINAS_DE_TEXTO[chave].nome))
      unmount()
    }
  })

  it('ao sair da página o título anterior volta', () => {
    const { unmount } = renderizarRota('/contato')
    expect(document.title).toBe('Contato | AppMaternidade')
    unmount()
    expect(document.title).toBe(ANTES)
  })

  it('o Início não muda o título', () => {
    renderizarRota('/')
    expect(document.title).toBe(ANTES)
  })
})
