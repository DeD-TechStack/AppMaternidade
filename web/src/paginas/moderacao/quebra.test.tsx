import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { join, sep } from 'node:path'
import * as ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { COMUM_MODERACAO, NOMES_DAS_TELAS, PAPEIS } from '../../conteudo/moderacao.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarDadosModeracaoMemoria } from '../../dados/moderacao.memoria.ts'
import { listarFontes } from '../../teste/fontes.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarModeracao } from './apoio.tsx'

// Defeitos achados num navegador real a 390 px e 200 % de fonte (botões, listas, etiquetas e links do painel).
// O jsdom não tem layout: o teste confere a classe (o que a regra do navegador precisa para quebrar a linha) e
// varre os arquivos do painel, para que o defeito não volte em outro botão, etiqueta ou célula.

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('o teste chamou a rede')
    }),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const pastaSrc = join(process.cwd(), 'src') + sep
const tsx = listarFontes(pastaSrc).filter(
  (f) => f.nome.endsWith('.tsx') && (f.nome.startsWith('paginas/moderacao/') || f.nome.startsWith('componentes/moderacao/')),
)

type Elemento = ts.JsxOpeningElement | ts.JsxSelfClosingElement

interface Achado {
  arquivo: string
  tag: string
  classe: string
  paiClasse: string
}

/** Os elementos JSX de uma tag (ou de qualquer tag com `filtro`), com o texto do `className` e o do pai. */
function elementos(arquivo: string, texto: string, tag: string | null): Achado[] {
  const fonte = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados: Achado[] = []
  const classeDe = (no: Elemento | undefined) =>
    no?.attributes.properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === 'className')?.initializer?.getText() ?? ''
  const abertura = (no: ts.Node | undefined): Elemento | undefined => {
    if (!no) return undefined
    if (ts.isJsxElement(no)) return no.openingElement
    if (ts.isJsxSelfClosingElement(no)) return no
    return undefined
  }
  function visitar(no: ts.Node) {
    const atual = abertura(no)
    if (atual && (tag === null || atual.tagName.getText() === tag)) {
      let pai: ts.Node | undefined = no.parent
      while (pai && !abertura(pai)) pai = pai.parent
      achados.push({ arquivo, tag: atual.tagName.getText(), classe: classeDe(atual), paiClasse: classeDe(abertura(pai)) })
    }
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return achados
}

const todos = (tag: string | null) => tsx.flatMap((f) => elementos(f.nome, f.texto, tag))

describe('botões do painel: o rótulo quebra dentro da pílula (DEF-1, DEF-2)', () => {
  it('nenhum arquivo do painel usa os botões `cm-botao` da conta sem a classe que deixa o rótulo quebrar', () => {
    const achados = tsx
      .filter((f) => f.nome !== 'componentes/moderacao/estilos.ts')
      .filter((f) => /import\s*\{[^}]*\bBOTAO_(PRINCIPAL|SECUNDARIO|PERIGO)\b[^}]*\}\s*from\s*'[^']*conta\/Partes\.tsx'/.test(f.texto))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })

  it('a caixa de motivo: o botão que confirma e o que cancela quebram a linha e não são `nowrap`', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.admin.conta)
    const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.admin.conta)
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.admin.email)
    renderizarModeracao('/moderacao/papeis', { contas, comunidade, moderacao })

    await screen.findByRole('heading', { level: 1, name: NOMES_DAS_TELAS.papeis })
    const lista = within(await screen.findByRole('region', { name: PAPEIS.lista }))
    const linha = (await lista.findByText(ELENCO.vencido.conta)).closest('li')!
    fireEvent.click(within(linha).getByRole('button', { name: PAPEIS.revogar }))
    const caixa = await screen.findByRole('dialog', { name: PAPEIS.revogarTitulo })

    for (const nome of [PAPEIS.revogarConfirmar, COMUM_COMUNIDADE.cancelar]) {
      const botao = within(caixa).getByRole('button', { name: nome })
      expect(botao.className, nome).toMatch(/(^|\s)whitespace-normal(\s|$)/)
      expect(botao.className, nome).toMatch(/(^|\s)wrap-anywhere(\s|$)/)
      expect(botao.className, nome).toMatch(/(^|\s)max-w-full(\s|$)/)
      expect(botao.className, nome).not.toMatch(/whitespace-nowrap/)
    }
    // O visual segue o do sistema: continua um `cm-botao` (a altura mínima de 56 px vem dele).
    expect(within(caixa).getByRole('button', { name: PAPEIS.revogarConfirmar }).className).toContain('cm-botao-primario')
  })
})

describe('lista de papéis e dica da validade: as células quebram (DEF-3)', () => {
  it('toda célula `dd` do painel pode encolher e quebrar (min-w-0 e wrap-anywhere)', () => {
    const celulas = todos('dd')
    expect(celulas.length).toBeGreaterThan(0)
    for (const celula of celulas) {
      expect(celula.classe, celula.arquivo).toMatch(/\bmin-w-0\b/)
      expect(celula.classe, celula.arquivo).toMatch(/\bwrap-anywhere\b/)
    }
  })

  it('toda mensagem de campo do painel (a dica da validade e o erro) quebra palavras longas, e o campo pode encolher', () => {
    const mensagens = todos('p').filter((p) => p.classe.includes('cm-campo-mensagem'))
    expect(mensagens.length).toBeGreaterThan(0)
    for (const mensagem of mensagens) expect(mensagem.classe, mensagem.arquivo).toMatch(/\bwrap-anywhere\b/)
    const campos = todos('div').filter((d) => /(^|[\s"'])cm-campo([\s"']|$)/.test(d.classe))
    expect(campos.length).toBeGreaterThan(0)
    for (const campo of campos) expect(campo.classe, campo.arquivo).toMatch(/\bmin-w-0\b/)
  })
})

describe('etiquetas do painel: quebram em vez de sair da tela (DEF-4)', () => {
  it('toda `Etiqueta` do painel está num contêiner que quebra a linha e que deixa a etiqueta encolher', () => {
    const etiquetas = todos('Etiqueta')
    expect(etiquetas.length).toBeGreaterThanOrEqual(8)
    for (const etiqueta of etiquetas) {
      expect(etiqueta.paiClasse, etiqueta.arquivo).toContain('flex-wrap')
      expect(etiqueta.paiClasse, etiqueta.arquivo).toContain('ETIQUETAS_QUEBRAM')
    }
  })
})

describe('links do painel: o hover muda o que se vê (DEF-6)', () => {
  it('nenhum arquivo do painel usa o `LINK_ALVO` da conta direto (o hover dele só engrossa o traço)', () => {
    const achados = tsx
      .filter((f) => f.nome !== 'componentes/moderacao/estilos.ts')
      .filter((f) => /\bLINK_ALVO\b/.test(f.texto))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })

  it('a aba que não é a atual ganha fundo no hover; a atual guarda o visual dela', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.admin.conta)
    const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.admin.conta)
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.admin.email)
    renderizarModeracao('/moderacao/auditoria', { contas, comunidade, moderacao })

    await screen.findByRole('heading', { level: 1, name: NOMES_DAS_TELAS.auditoria })
    const navegacao = await screen.findByRole('navigation', { name: COMUM_MODERACAO.painel })
    const atual = within(navegacao).getByRole('link', { name: COMUM_MODERACAO.auditoria })
    const outra = within(navegacao).getByRole('link', { name: COMUM_MODERACAO.fila })
    expect(atual.getAttribute('aria-current')).toBe('page')
    expect(atual.className).not.toMatch(/hover:/)
    expect(outra.className).toMatch(/hover:bg-\[var\(--cor-papel-fundo\)\]/)
    expect(outra.className).toMatch(/hover:underline/)

    const voltar = within(document.body).getAllByRole('link', { name: COMUM_COMUNIDADE.voltar })[0]
    expect(voltar.className).toMatch(/hover:text-\[var\(--cor-texto\)\]/)
    await waitFor(() => expect(voltar.className).toContain('underline'))
  })
})

describe('campos do painel: a coluna e a entrada encolhem com a janela (campo de validade a 200 %)', () => {
  it('todo wrapper `cm-campo` tem coluna `minmax(0,1fr)` e toda entrada `cm-campo-entrada` tem `min-w-0`', () => {
    const wrappers = todos('div').filter((e) => /"cm-campo\s/.test(e.classe))
    const entradas = todos('input').filter((e) => e.classe.includes('cm-campo-entrada'))
    expect(wrappers.length).toBeGreaterThan(0)
    expect(entradas.length).toBeGreaterThan(0)
    expect(wrappers.filter((e) => !e.classe.includes('grid-cols-[minmax(0,1fr)]')).map((e) => e.arquivo)).toEqual([])
    expect(entradas.filter((e) => !/\bmin-w-0\b/.test(e.classe)).map((e) => e.arquivo)).toEqual([])
  })
})
