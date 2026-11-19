import { screen } from '@testing-library/react'
import { rodarAxe } from './axe.ts'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from './renderizarRota.tsx'

// Cuidado compartilhado no site de verdade (roteador em memória, dentro da casca): um main, o h1, o axe, os avisos, as
// cenas e os botões. Como funciona e Desenvolvimento saíram daqui: são a casa acesa e têm os seus próprios testes
// (paginas/publicas/*.casa.test.tsx). O que a página de Cuidado promete está em `paginas/publicas/cuidado.casa.test.tsx`;
// aqui ela fica só nos testes que não dependem da cara (axe, avisos, brilho).

const PAGINAS = ['/cuidado-compartilhado'] as const

/** O texto do título: as duas linhas em texto comum, sem cópia só para leitor de tela. */
const nomeDoTitulo = (titulo: HTMLElement) => titulo.textContent

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

describe('a página pública de Cuidado compartilhado', () => {
  // Cuidado compartilhado (casa): um main, o h1 novo (uma linha de texto, sem itálico), a casca em volta.
  it('/cuidado-compartilhado: um main só, com o h1 "A babá vê o quê?", dentro da casca', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const principal = container.querySelectorAll('main')
    expect(principal).toHaveLength(1)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(principal[0].contains(h1s[0])).toBe(true)
    expect(nomeDoTitulo(h1s[0])).toBe('A babá vê o quê?')
    expect(container.querySelector('header[data-cabecalho]')).not.toBeNull()
    expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
  })

  for (const caminho of PAGINAS) {
    it(`${caminho}: sem violações do axe`, async () => {
      const { container } = renderizarRota(caminho)
      expect(await violacoes(container)).toEqual([])
    })

    it(`${caminho}: nada de rascunho, revisor, nomes fora da família de exemplo nem "Protótipo" nos cartões`, () => {
      const { container } = renderizarRota(caminho)
      const texto = container.querySelector('main')!.textContent!
      expect(texto).not.toMatch(/rascunho|revisor|nota para|pendente|quanto mais, melhor/i)
      expect(texto).not.toMatch(/\b(Lia|Ana)\b/)
      for (const cartao of container.querySelectorAll('main .cm-flutuante, main [data-cartao-plano]')) {
        expect(cartao.textContent).not.toMatch(/protótipo|dados de exemplo/i)
      }
    })

    it(`${caminho}: no máximo dois cartões flutuantes (giro fixo do contrato), nunca sobre uma cena (aparelho e pedestal)`, () => {
      const { container } = renderizarRota(caminho)
      const flutuantes = [...container.querySelectorAll<HTMLElement>('main .cm-flutuante')]
      expect(flutuantes.length).toBeLessThanOrEqual(2)
      for (const cartao of flutuantes) expect(['-4', '-2', '2', '4']).toContain(cartao.getAttribute('data-giro'))
      for (const cena of container.querySelectorAll('main img[data-cena]')) {
        expect(cena.closest('[data-painel]')!.querySelector('.cm-flutuante')).toBeNull()
      }
    })

    // O brilho de mel (`--brilho-mel`) fazia uma mancha turva no painel escuro: nenhuma página o liga mais.
    it(`${caminho}: nenhuma faixa de cacau com a mancha do brilho de mel`, () => {
      const { container } = renderizarRota(caminho)
      expect(container.querySelector('main [data-brilho]')).toBeNull()
    })

    // Na página inteira (casca incluída), um aviso de demonstração só: o do rodapé da casca. Nenhum
    // outro parágrafo repete que é demonstração, que a família é fictícia, que a conta não está no ar
    // ou que nada é salvo. O aviso médico (AvisoSaude) é outra coisa e não conta.
    it(`${caminho}: um aviso de demonstração no documento inteiro, o do rodapé`, () => {
      const { container } = renderizarRota(caminho)
      const marcados = [...container.querySelectorAll('[data-aviso]')]
      expect(marcados).toHaveLength(1)
      expect(marcados[0].getAttribute('data-aviso')).toBe('demonstracao')
      expect(marcados[0].closest('footer[data-rodape]')).not.toBeNull()
      const DEMONSTRACAO = /fictíci|demonstração|não estão disponíveis|não (é|são) salv|nada do que você registra|sem salvar/i
      const porTexto = [...container.querySelectorAll('p, li, span, small, div')].filter(
        (no) => no.children.length === 0 && DEMONSTRACAO.test(no.textContent ?? ''),
      )
      expect(porTexto).toEqual([marcados[0]])
      for (const saude of container.querySelectorAll('[data-aviso-saude]')) {
        expect(saude.hasAttribute('data-aviso')).toBe(false)
      }
    })

    it(`${caminho}: nenhum botão diz "protótipo" (o aviso de demonstração já está na tela)`, () => {
      const { container } = renderizarRota(caminho)
      for (const botao of container.querySelectorAll('main .cm-botao')) {
        expect(botao.textContent, caminho).not.toMatch(/protótipo/i)
      }
    })
  }
})
