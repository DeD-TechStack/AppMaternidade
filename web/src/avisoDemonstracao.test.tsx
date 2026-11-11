import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { AvisoDemonstracao } from './componentes/AvisoDemonstracao.tsx'
import { AVISO_DEMONSTRACAO } from './conteudo/textos.ts'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// O aviso de demonstração no Campo de mel (MAT-49a, DESIGN.md 4, Rodape): uma linha honesta no rodapé
// (`[data-rodape]`), só quando falta uma variável do banco, nunca dentro do <main> e nunca numa imagem;
// no máximo um por página. As telas do app (Hoje, Sessão) trazem a etiqueta "Protótipo com dados de
// exemplo" na abertura e não repetem o aviso no rodapé.

const TEXTO = 'Demonstração sem banco: nada do que você registra aqui é salvo. Ao recarregar a página, tudo volta ao começo.'
const SELETOR = '[data-aviso="demonstracao"]'
const ETIQUETA = 'Protótipo com dados de exemplo'
const URL_FICTICIA = 'https://exemplo.invalid'
const CHAVE_FICTICIA = 'chave-ficticia'
const PUBLICAS = ['/', '/como-funciona', '/sobre', '/sistema', '/qualquer-coisa']

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })

// O setup.ts não desfaz variáveis de ambiente: este arquivo desfaz as suas.
afterEach(() => {
  vi.unstubAllEnvs()
})

function definirBanco(url: string, chave: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)
}

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

const BANCOS: Array<[string, string, string, boolean]> = [
  ['as duas vazias', '', '', true],
  ['só a URL', URL_FICTICIA, '', true],
  ['só a chave', '', CHAVE_FICTICIA, true],
  ['as duas preenchidas', URL_FICTICIA, CHAVE_FICTICIA, false],
]

describe('aviso de demonstração: o texto', () => {
  it('o texto da constante é o do glossário', () => {
    expect(AVISO_DEMONSTRACAO).toBe(TEXTO)
  })
})

describe('aviso de demonstração: uma linha no rodapé do site público', () => {
  for (const [nome, url, chave, aparece] of BANCOS) {
    it(`${nome}: ${aparece ? 'um aviso, no rodapé' : 'nenhum aviso'} em cada página pública`, () => {
      definirBanco(url, chave)
      for (const caminho of PUBLICAS) {
        const { container, unmount } = renderizarRota(caminho)
        const avisos = container.querySelectorAll(SELETOR)
        expect(avisos, caminho).toHaveLength(aparece ? 1 : 0)
        if (aparece) {
          expect(avisos[0].closest('footer[data-rodape]'), caminho).not.toBeNull()
          expect(avisos[0].textContent, caminho).toBe(TEXTO)
        }
        expect(container.querySelector(`main ${SELETOR}`), caminho).toBeNull()
        unmount()
      }
    })
  }

  it('nunca fica dentro de uma imagem nem de uma figura', () => {
    definirBanco('', '')
    for (const caminho of PUBLICAS) {
      const { container, unmount } = renderizarRota(caminho)
      const aviso = container.querySelector(SELETOR)!
      expect(aviso.closest('figure, picture, [role="img"]'), caminho).toBeNull()
      unmount()
    }
  })

  it('é um <p> simples, sem role, sem aria-* e sem filhos', () => {
    definirBanco('', '')
    const { container } = renderizarRota('/sobre')
    const aviso = container.querySelector(SELETOR)!
    expect(aviso.tagName).toBe('P')
    expect(aviso.hasAttribute('role')).toBe(false)
    expect(aviso.getAttributeNames().filter((nome) => nome.startsWith('aria-'))).toEqual([])
    expect(aviso.children).toHaveLength(0)
    expect(screen.getByText(TEXTO)).toBe(aviso)
  })
})

describe('aviso de demonstração: as telas do app têm a etiqueta, e não o aviso', () => {
  const telas: Array<[string, string, () => EstadoPrototipo]> = [
    ['o Hoje', '/app/hoje', claro],
    ['o Hoje (madrugada)', '/app/hoje', madrugada],
    ['a Sessão', '/app/sessao', claro],
    ['a Sessão (madrugada)', '/app/sessao', madrugada],
    ['a Sessão sem sessão', '/app/sessao', () => ({ ...claro(), sessao: null })],
  ]

  for (const [tela, caminho, estado] of telas) {
    for (const [banco, url, chave] of BANCOS) {
      it(`${tela}, ${banco}: uma etiqueta na lateral da abertura e nenhum aviso na página`, () => {
        definirBanco(url, chave)
        const { container } = renderizarRota(caminho, { estadoInicial: estado() })

        const etiquetas = [...container.querySelectorAll<HTMLElement>('.sb-abertura .sb-etiqueta')]
        expect(etiquetas.map((e) => e.textContent)).toEqual([ETIQUETA])
        expect(etiquetas[0].tagName).toBe('SPAN')
        expect(etiquetas[0].closest('ul.sb-abertura-lateral')).not.toBeNull()
        expect(etiquetas[0].parentElement!.tagName).toBe('LI')
        expect(container.querySelector(SELETOR)).toBeNull()
        expect(screen.queryByText(TEXTO)).toBeNull()
      })
    }
  }

  it('a região status da confirmação continua única e não contém aviso nem etiqueta', () => {
    definirBanco('', '')
    const { container } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))

    const regioes = screen.getAllByRole('status')
    expect(regioes).toHaveLength(1)
    expect(regioes[0].textContent).not.toContain('Demonstração sem banco')
    expect(regioes[0].textContent).not.toContain(ETIQUETA)
    expect(container.querySelector(SELETOR)).toBeNull()
  })
})

describe('aviso de demonstração: as variantes do componente', () => {
  for (const [nome, url, chave, aparece] of BANCOS) {
    it(`rodapé, ${nome}: ${aparece ? 'mostra' : 'não mostra'} o aviso`, () => {
      definirBanco(url, chave)
      const { container } = render(<AvisoDemonstracao rodape />)
      expect(container.querySelectorAll(SELETOR)).toHaveLength(aparece ? 1 : 0)
      expect(container.textContent === '').toBe(!aparece)
    })
  }

  it('a variante do rodapé só leva o marcador: a aparência vem do rodapé', () => {
    definirBanco('', '')
    const { container } = render(<AvisoDemonstracao rodape />)
    expect([...container.querySelector(SELETOR)!.classList]).toEqual(['aviso-demonstracao'])
  })

  it('a variante lateral leva ui + secundário, e a padrão texto-info, text-sm e py-1 (px-4 só com comRecuo)', () => {
    definirBanco('', '')
    const lateral = render(<AvisoDemonstracao lateral />)
    expect([...lateral.container.querySelector(SELETOR)!.classList].sort()).toEqual(['aviso-demonstracao', 't-secundario', 't-ui'])
    lateral.unmount()

    const padrao = render(<AvisoDemonstracao />)
    const classes = [...padrao.container.querySelector(SELETOR)!.classList]
    for (const classe of ['aviso-demonstracao', 'texto-info', 'text-sm', 'py-1']) expect(classes).toContain(classe)
    expect(classes).not.toContain('px-4')
    padrao.unmount()

    const comRecuo = render(<AvisoDemonstracao comRecuo />)
    expect([...comRecuo.container.querySelector(SELETOR)!.classList]).toContain('px-4')
  })
})

describe('aviso de demonstração: acessibilidade (axe-core)', () => {
  for (const caminho of ['/', '/qualquer-coisa']) {
    it(`não tem violações em ${caminho}, com o aviso no rodapé`, async () => {
      definirBanco('', '')
      const { container } = renderizarRota(caminho)
      expect(container.querySelector(`footer ${SELETOR}`)).not.toBeNull()
      expect(await violacoes(container)).toEqual([])
    })
  }

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      it(`não tem violações em ${caminho} (${tema})`, async () => {
        definirBanco('', '')
        const { container } = renderizarRota(caminho, { estadoInicial: estado() })
        await screen.findByRole('heading', { level: 1 })
        expect(screen.getByText(ETIQUETA)).toBeTruthy()
        expect(container.querySelector(SELETOR)).toBeNull()
        expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')
        expect(await violacoes(container)).toEqual([])
      })
    }
  }
})
