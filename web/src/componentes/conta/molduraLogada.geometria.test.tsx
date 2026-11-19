import { afterEach, describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/react'
import { CABECALHO } from '../../conteudo/conta.ts'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

// NEW-C: a casca logada acima do título (MolduraLogada). O aviso de demonstração sai de entre o cabeçalho e a
// barra e vai para depois do <main>, numa região rotulada (o mesmo padrão do AvisoDaTela); com banco, nada (nem
// a folga vazia). O link da barra perde o recuo do rótulo (a borda esquerda do texto é a do h1) e mantém o alvo
// de 44 px por um pseudo-elemento. As medidas de pixel ficam na sonda CDP (.oc/sonda_casca.mjs): o jsdom não tem
// layout, então aqui conferimos a estrutura e as classes que produzem a geometria. O axe "region" (RF-02) também é
// da sonda: no jsdom ele não acusa o aviso fora dos marcos nem na base.

const SELETOR = '[data-aviso="demonstracao"]'
const ROTULO_REGIAO = 'Aviso de demonstração'
// As telas da moldura na área do app (/app/*): o aviso é o da moldura.
const ROTAS_DO_APP = ['/app/comecar', '/app/conta', '/app/familia', '/app/comunidade'] as const
// Com banco, só as que não leem a Comunidade (sem banco de verdade no teste, a Comunidade não termina de carregar).
const ROTAS_COM_BANCO = ['/app/comecar', '/app/conta', '/app/familia'] as const

afterEach(() => {
  vi.unstubAllEnvs()
})

function definirBanco(comBanco: boolean) {
  vi.stubEnv('VITE_SUPABASE_URL', comBanco ? 'https://exemplo.invalid' : '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', comBanco ? 'chave-ficticia' : '')
}

/** A barra da moldura: o <nav> com o rótulo da navegação da conta, fora do <header>. */
function barraDaMoldura(container: HTMLElement): HTMLElement {
  const barras = [...container.querySelectorAll<HTMLElement>(`nav[aria-label="${CABECALHO.navegacao}"]`)].filter(
    (nav) => nav.closest('header') === null,
  )
  expect(barras).toHaveLength(1)
  return barras[0]
}

describe('NEW-C:RF-01 o aviso da moldura vem depois do <main>, numa região rotulada', () => {
  for (const caminho of ROTAS_DO_APP) {
    it(`${caminho}, sem banco: um aviso, dentro de <section aria-label="${ROTULO_REGIAO}">, depois do <main>`, async () => {
      definirBanco(false)
      const { container } = await renderizarRotaPronta(caminho)
      const avisos = container.querySelectorAll<HTMLElement>(SELETOR)
      expect(avisos, caminho).toHaveLength(1)
      const regiao = avisos[0].closest('section')
      expect(regiao, caminho).not.toBeNull()
      expect(regiao!.getAttribute('aria-label'), caminho).toBe(ROTULO_REGIAO)
      expect(avisos[0].closest('main, header, footer, nav'), caminho).toBeNull()

      const main = container.querySelector('main')!
      expect(main.compareDocumentPosition(regiao!) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
      // REP-T3: /app/comecar não tem mais barra da moldura
      if (caminho === '/app/comecar') return
      // Nunca entre o cabeçalho e a barra: a barra vem antes do aviso.
      const barra = barraDaMoldura(container)
      expect(barra.compareDocumentPosition(regiao!) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
    })
  }

  it('/moderacao (fora de /app/*), sem banco: um aviso só, o do rodapé, e nenhum na moldura', async () => {
    definirBanco(false)
    const { container } = await renderizarRotaPronta('/moderacao')
    const avisos = container.querySelectorAll<HTMLElement>(SELETOR)
    // Emenda do líder (17/11): ali o único aviso é o do rodapé público (dono: casca/Rodape.tsx), depois do <main>,
    // dentro de um marco; a moldura não monta região própria (nenhum segundo aviso).
    expect(avisos).toHaveLength(1)
    const rodape = avisos[0].closest('footer[data-rodape]')
    expect(rodape).not.toBeNull()
    expect(avisos[0].closest('main, header, nav')).toBeNull()
    const main = container.querySelector('main')!
    expect(main.compareDocumentPosition(rodape!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(container.querySelectorAll(`section[aria-label="${ROTULO_REGIAO}"]`)).toHaveLength(0)
  })

  for (const caminho of ROTAS_COM_BANCO) {
    it(`${caminho}, com banco: nenhum aviso e nenhuma região nem folga vazia`, async () => {
      definirBanco(true)
      const { container } = await renderizarRotaPronta(caminho)
      expect(container.querySelectorAll(SELETOR), caminho).toHaveLength(0)
      expect(container.querySelector(`section[aria-label="${ROTULO_REGIAO}"]`), caminho).toBeNull()
      // REP-T3: /app/comecar não tem mais barra da moldura
      if (caminho === '/app/comecar') return
      // A faixa da barra só tem a barra: nenhum invólucro antes dela.
      const barra = barraDaMoldura(container)
      const faixa = barra.parentElement!
      expect([...faixa.children], caminho).toEqual([barra])
    })
  }
})

describe('NEW-C:RF-03 o link "Ir para o Hoje" começa na borda do conteúdo, com alvo de 44 px', () => {
  it('sem recuo no lado do rótulo, com alvo-toque e a extensão do alvo por pseudo-elemento', async () => {
    definirBanco(false)
    const { container } = await renderizarRotaPronta('/app/conta')
    const link = within(barraDaMoldura(container)).getByRole('link', { name: CABECALHO.irParaHoje })
    const classes = [...link.classList]
    expect(classes.filter((c) => /^(px|pl|ps)-/.test(c))).toEqual([])
    expect(classes).toContain('alvo-toque')
    expect(classes).toContain('cm-barra-link')
  })
})
