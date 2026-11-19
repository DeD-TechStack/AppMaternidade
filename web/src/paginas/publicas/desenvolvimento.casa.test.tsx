// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CENA_ABERTURA,
  CENA_ABERTURA_RECORTE,
  CENA_FAMILIA,
  DESENVOLVIMENTO_CASA as D,
  MOLDURA_DIA,
  TELA_HISTORICO,
} from '../../conteudo/casa/desenvolvimento.ts'
import { FASES, IDEIAS, MARCOS, QUANTO_TEMPO, TUMMY_TIME } from '../../conteudo/desenvolvimento/itens.ts'
import { AVISO_SAUDE, DESENVOLVIMENTO_DESTAQUE, ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'
import { rodarAxe } from '../../teste/axe.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
// O mesmo arquivo de preparo do vite.config (limpeza entre os testes): importado aqui para o teste também passar
// quando o Vitest roda da raiz do repositório e não acha a configuração de web/ (o ambiente vem do comentário acima).
import '../../teste/setup.ts'

// /desenvolvimento nas seções da casa (CLONE-DESENV). O jsdom não faz layout: aqui ficam a estrutura, os atributos,
// o texto e as regras; as medidas reais saem das capturas.

const ROTA = '/desenvolvimento'

function bandas(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('main > [data-casa] > *')]
}

describe('DESENV-I-01 faixas e componentes, dentro de um [data-casa]', () => {
  it('um main, um [data-casa], um h1, e as seis faixas filhas diretas na ordem do spec', () => {
    const { container } = renderizarRota(ROTA)
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(container.querySelectorAll('[data-casa]')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const filhas = bandas(container)
    expect(filhas).toHaveLength(6)
    // A primeira é a seção da própria página; as outras cinco são FaixaInteira.
    expect(filhas[0].matches('section:not([data-faixa])')).toBe(true)
    for (const faixa of filhas.slice(1)) expect(faixa.hasAttribute('data-faixa')).toBe(true)
    expect(container.querySelector('[data-fechamento]')).toBeNull()
  })

  it('a abertura: h1, frase, botão base para #ideias, link para #tummy-time, moldura uma vez, legenda e aviso', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = bandas(container)[0]
    expect(within(abertura).getByRole('heading', { level: 1 }).textContent).toBe(D.h1)
    expect(within(abertura).getByText(D.lede)).toBeTruthy()
    const botao = within(abertura).getByRole('link', { name: D.cta1 })
    expect(botao.getAttribute('href')).toBe('#ideias')
    expect(botao.getAttribute('data-botao')).toBe('primario')
    const link = within(abertura).getByRole('link', { name: D.cta2 })
    expect(link.getAttribute('href')).toBe('#tummy-time')
    expect(link.hasAttribute('data-botao')).toBe(false)
    expect(container.querySelectorAll('[data-produto-moldura]')).toHaveLength(1)
    expect(abertura.querySelectorAll('[data-produto-moldura]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-produto-tela]')).toHaveLength(1)
    const legenda = abertura.querySelector<HTMLElement>('p[data-legenda]')!
    expect(legenda.textContent).toBe(D.legenda1)
    expect(legenda.getAttribute('data-tom')).toBe('dia')
    const avisos = screen.getAllByText(AVISO_SAUDE)
    expect(avisos).toHaveLength(1)
    expect(abertura.contains(avisos[0])).toBe(true)
    expect(container.querySelectorAll('[data-aviso-saude]')).toHaveLength(1)
    // Nada de Criar conta no main: a página termina na faixa do 192.
    expect(within(container.querySelector('main')!).queryByRole('link', { name: /criar conta/i })).toBeNull()
  })

  it('o gancho da página para a pílula do cabeçalho existe enquanto ela está montada e some ao sair', () => {
    const { unmount } = renderizarRota(ROTA)
    expect(document.documentElement.dataset.paginaDesenvolvimento).toBe('')
    unmount()
    expect(document.documentElement.dataset.paginaDesenvolvimento).toBeUndefined()
  })

  it('o título da aba é o nome da página + AppMaternidade (de.aba)', () => {
    renderizarRota(ROTA)
    expect(document.title).toBe(D.aba)
  })
})

describe('DESENV-I-05 chãos e ritmo (RF-02, RF-95)', () => {
  it('papel, areia, papel, areia, papel, cacau: nenhum par vizinho com o mesmo chão', () => {
    const { container } = renderizarRota(ROTA)
    const chaos = bandas(container).map((b) => b.getAttribute('data-faixa-fundo'))
    expect(chaos).toEqual(['papel', 'areia', 'papel', 'areia', 'papel', 'cacau'])
    for (let i = 1; i < chaos.length; i += 1) expect(chaos[i]).not.toBe(chaos[i - 1])
  })

  it('nunca três faixas seguidas com o padrão título → parágrafo → imagem → legenda', () => {
    const { container } = renderizarRota(ROTA)
    const casam = bandas(container).map((banda) => {
      const ordem = (seletor: string) => {
        const alvo = banda.querySelector(seletor)
        return alvo === null ? -1 : [...banda.querySelectorAll('*')].indexOf(alvo)
      }
      const titulo = ordem('h1, h2')
      const paragrafo = ordem('p:not([data-legenda])')
      const imagem = ordem('img:not([data-produto-moldura-arte])')
      const legenda = ordem('p[data-legenda]')
      return titulo >= 0 && titulo < paragrafo && paragrafo < imagem && imagem < legenda
    })
    for (let i = 0; i + 2 < casam.length; i += 1) {
      expect(casam[i] && casam[i + 1] && casam[i + 2], `faixas ${i} a ${i + 2}`).toBe(false)
    }
    // As faixas em grade (4, 5 e 6) não têm imagem: nunca casam.
    expect(casam.slice(3)).toEqual([false, false, false])
  })
})

describe('DESENV-I-08 âncoras e itens (RF-08)', () => {
  it('#ideias, #tummy-time e #marcos uma vez cada; data-item do tummy time e dos marcos uma vez cada', () => {
    const { container } = renderizarRota(ROTA)
    for (const id of ['ideias', 'tummy-time', 'marcos']) {
      expect(container.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1)
    }
    expect(container.querySelectorAll(`[data-item="${TUMMY_TIME.id}"]`)).toHaveLength(1)
    expect(container.querySelectorAll(`[data-item="${MARCOS.id}"]`)).toHaveLength(1)
    expect(container.querySelectorAll('[data-item]')).toHaveLength(2)
    expect(container.querySelector('#tummy-time')!.getAttribute('data-item')).toBe(TUMMY_TIME.id)
    expect(container.querySelector('#marcos')!.getAttribute('data-item')).toBe(MARCOS.id)
    // O invólucro da página é o primeiro filho do quadro de cada FaixaInteira (que não tem `id` nem `data-item`).
    const primeiro = (i: number) => bandas(container)[i].querySelector(':scope > [data-h~="quadro"] > :first-child')!.id
    expect(primeiro(2)).toBe('ideias')
    expect(primeiro(3)).toBe('tummy-time')
    expect(primeiro(4)).toBe('marcos')
  })
})

describe('as seis fases e as fontes (todas a vista)', () => {
  it('as seis fases numa lista só, com h3, itens, fontes com link e a data; sem abas nem details', () => {
    const { container } = renderizarRota(ROTA)
    expect(container.querySelector('[role="tab"], [role="tablist"], details')).toBeNull()
    const listas = container.querySelectorAll('#ideias ul[data-fases]')
    expect(listas).toHaveLength(1)
    const fases = [...listas[0].querySelectorAll(':scope > li')]
    expect(fases).toHaveLength(6)
    for (const [i, fase] of fases.entries()) {
      expect(within(fase as HTMLElement).getByRole('heading', { level: 3 }).textContent).toBe(FASES[i].titulo)
      for (const item of FASES[i].itens) expect(fase.textContent).toContain(item)
      const fontes = fase.querySelector('[data-fontes]')!
      expect(fontes.textContent).toContain(D.fontesRotulo)
      const links = fontes.querySelectorAll('a[href^="https://"]')
      expect(links).toHaveLength(FASES[i].fontes.length)
      expect([...links].map((a) => a.textContent)).toEqual(FASES[i].fontes.map((f) => f.nome))
      expect(fontes.querySelector('[data-consulta]')!.textContent).toBe(
        `${ROTULOS_FONTES.consultadas} ${FASES[i].consultadoEm}`,
      )
    }
  })

  it('o tummy time e os marcos mostram faixa, partes e fontes abertas, com a data da consulta', () => {
    const { container } = renderizarRota(ROTA)
    for (const item of [TUMMY_TIME, MARCOS]) {
      const raiz = container.querySelector<HTMLElement>(`[data-item="${item.id}"]`)!
      expect(raiz.textContent).toContain(`${ROTULOS_FONTES.faixa} ${item.faixa}`)
      expect(raiz.textContent).toContain(item.resumo)
      for (const parte of item.itens) {
        expect(within(raiz).getByRole('heading', { level: 3, name: parte.titulo })).toBeTruthy()
        for (const texto of parte.textos) expect(raiz.textContent).toContain(texto)
      }
      const fontes = raiz.querySelector('[data-fontes]')!
      expect(fontes.querySelectorAll('a[href^="https://"]')).toHaveLength(item.fontes.length)
      expect(fontes.querySelector('[data-consulta]')!.textContent).toBe(`${ROTULOS_FONTES.consultadas} ${item.consultadoEm}`)
    }
  })

  it('a faixa de idade é uma etiqueta plana (um p, nunca botão nem link), uma por item', () => {
    const { container } = renderizarRota(ROTA)
    for (const item of [TUMMY_TIME, MARCOS]) {
      const raiz = container.querySelector<HTMLElement>(`[data-item="${item.id}"]`)!
      const etiquetas = [...raiz.querySelectorAll('[data-etiqueta]')]
      expect(etiquetas).toHaveLength(1)
      expect(etiquetas[0].tagName).toBe('P')
      expect(etiquetas[0].textContent).toBe(`${ROTULOS_FONTES.faixa} ${item.faixa}`)
      expect(etiquetas[0].closest('a, button, .cm-botao')).toBeNull()
    }
  })

  it('a ordem de leitura do tummy time é a do deck 2.3: resumo, faixa, três partes, tabela, sem meta, quarta parte, fontes', () => {
    const { container } = renderizarRota(ROTA)
    const texto = container.querySelector('#tummy-time')!.textContent!
    const partes = TUMMY_TIME.itens
    const ordem = [
      TUMMY_TIME.resumo,
      `${ROTULOS_FONTES.faixa} ${TUMMY_TIME.faixa}`,
      partes[0].titulo,
      partes[1].titulo,
      partes[2].titulo,
      QUANTO_TEMPO.titulo,
      QUANTO_TEMPO.semMeta,
      partes[3].titulo,
      D.fontesRotulo,
    ]
    const posicoes = ordem.map((trecho) => texto.indexOf(trecho))
    for (const [i, p] of posicoes.entries()) expect(p, ordem[i]).toBeGreaterThanOrEqual(0)
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes)
  })

  it('a tabela: caption, th de coluna e de linha, 5 linhas, e a célula da Pathways fica vazia (sem traço)', () => {
    renderizarRota(ROTA)
    const tabela = screen.getByRole('table', { name: QUANTO_TEMPO.titulo })
    expect(within(tabela).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([...QUANTO_TEMPO.colunas])
    const linhas = within(tabela).getAllByRole('rowheader')
    expect(linhas).toHaveLength(5)
    expect(linhas.every((th) => th.getAttribute('scope') === 'row')).toBe(true)
    const pathways = within(tabela).getByRole('rowheader', { name: 'Pathways.org' }).closest('tr')!
    expect(pathways.lastElementChild!.textContent).toBe('')
    expect(tabela.textContent).not.toContain('—')
    expect(screen.getByText(QUANTO_TEMPO.semMeta)).toBeTruthy()
  })
})

describe('DESENV-I-06 imagens (as três vagas fechadas)', () => {
  it('DE-S1: a cena da abertura é <img> comum, eager, fetchpriority high, com tamanho e srcset; recorte de 390 no source', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = bandas(container)[0]
    const imagens = [...abertura.querySelectorAll('img')].filter((i) => !i.hasAttribute('data-produto-tela') && !i.hasAttribute('data-produto-moldura-arte'))
    expect(imagens).toHaveLength(1)
    const cena = imagens[0]
    expect(container.querySelector('[data-cena-heroi]')).toBeNull()
    expect(cena.getAttribute('alt')).toBe(D.altCena1)
    expect(cena.getAttribute('src')).toBe(CENA_ABERTURA.src)
    expect(cena.getAttribute('src')).toContain('/cenas/desenvolvimento/m04-heroi-1100w.webp')
    expect(cena.getAttribute('srcset')).toContain('m04-heroi-1100w.webp 1100w')
    expect(cena.getAttribute('srcset')).toContain('m04-heroi-1672w.webp 1672w')
    expect(cena.getAttribute('width')).toBe('1672')
    expect(cena.getAttribute('height')).toBe('941')
    expect(cena.getAttribute('fetchpriority')).toBe('high')
    expect(cena.getAttribute('loading')).not.toBe('lazy')
    const fonte = cena.parentElement!.querySelector('source')!
    expect(fonte.getAttribute('media')).toBe('(max-width: 767px)')
    expect(fonte.getAttribute('srcset')).toContain('m04-heroi-390c-390w.webp 390w')
    expect(fonte.getAttribute('srcset')).toContain('m04-heroi-390c-780w.webp 780w')
    expect(fonte.getAttribute('width')).toBe(String(CENA_ABERTURA_RECORTE.largura))
    expect(fonte.getAttribute('height')).toBe(String(CENA_ABERTURA_RECORTE.altura))
  })

  it('DE-S2: a captura sob a moldura do dia, com o alt do deck e o tamanho do maior arquivo', () => {
    const { container } = renderizarRota(ROTA)
    const tela = container.querySelector('img[data-produto-tela]')!
    expect(tela.getAttribute('alt')).toBe(D.altTela1)
    expect(tela.getAttribute('src')).toContain('/telas/t1i/historico-y15-280w.webp')
    for (const largura of [280, 320, 560, 640]) {
      expect(tela.getAttribute('srcset')).toContain(`historico-y15-${largura}w.webp ${largura}w`)
    }
    expect(tela.getAttribute('width')).toBe(String(TELA_HISTORICO.largura))
    expect(tela.getAttribute('height')).toBe(String(TELA_HISTORICO.altura))
    const moldura = container.querySelector('img[data-produto-moldura-arte]')!
    expect(moldura.getAttribute('src')).toBe('/molduras/moldura-dia.png')
    expect(moldura.getAttribute('alt')).toBe('')
    expect(moldura.getAttribute('width')).toBe(String(MOLDURA_DIA.largura))
    expect(moldura.getAttribute('height')).toBe(String(MOLDURA_DIA.altura))
  })

  it('DE-S3: a família na faixa das ideias, lazy e assíncrona, com tamanho e srcset', () => {
    const { container } = renderizarRota(ROTA)
    const familia = container.querySelector('#ideias img')!
    expect(familia.getAttribute('alt')).toBe(D.altCena2)
    expect(familia.getAttribute('src')).toContain('/cenas/desenvolvimento/m12-familia-390w.webp')
    expect(familia.getAttribute('srcset')).toContain('m12-familia-390w.webp 390w')
    expect(familia.getAttribute('srcset')).toContain('m12-familia-585w.webp 585w')
    expect(familia.getAttribute('width')).toBe(String(CENA_FAMILIA.largura))
    expect(familia.getAttribute('height')).toBe(String(CENA_FAMILIA.altura))
    expect(familia.getAttribute('loading')).toBe('lazy')
    expect(familia.getAttribute('decoding')).toBe('async')
  })

  it('só essas imagens existem na página (cena, tela, moldura e família), todas com largura e altura', () => {
    const { container } = renderizarRota(ROTA)
    const imagens = [...container.querySelectorAll('main img')]
    expect(imagens).toHaveLength(4)
    for (const imagem of imagens) {
      expect(Number(imagem.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(imagem.getAttribute('height'))).toBeGreaterThan(0)
    }
  })
})

describe('DESENV-I-04 copy: as frases do deck estão no main, e as de saúde não mudaram', () => {
  it('toda frase do deck de conteudo/casa/desenvolvimento.ts aparece no texto do main (menos a aba e os alts)', () => {
    const { container } = renderizarRota(ROTA)
    const texto = container.querySelector('main')!.textContent!
    // Fora do texto do main: a aba (document.title) e os três alts (atributos).
    const fora = new Set<string>([D.aba, D.altCena1, D.altTela1, D.altCena2])
    for (const frase of Object.values(D)) {
      if (fora.has(frase)) continue
      expect(texto, frase).toContain(frase)
    }
    const alts = new Set([...container.querySelectorAll('main img[alt]')].map((i) => i.getAttribute('alt')))
    for (const alt of [D.altCena1, D.altTela1, D.altCena2]) expect(alts.has(alt), alt).toBe(true)
  })

  it('o texto de saúde vem do conteúdo versionado (ideias para todas as fases, 192) sem uma palavra trocada', () => {
    const { container } = renderizarRota(ROTA)
    const texto = container.querySelector('main')!.textContent!
    expect(texto).toContain(IDEIAS.texto)
    expect(texto).toContain(IDEIAS.todasTitulo)
    for (const linha of IDEIAS.todas) expect(texto).toContain(linha)
    expect(texto).toContain(DESENVOLVIMENTO_DESTAQUE.urgencia.texto)
    expect(screen.getByRole('heading', { level: 2, name: D.h2Urgencia })).toBeTruthy()
    const faixaFinal = bandas(container)[5]
    expect(faixaFinal.textContent).toContain(D.h2Urgencia)
    expect(faixaFinal.textContent).toContain(DESENVOLVIMENTO_DESTAQUE.urgencia.texto)
  })
})

describe('guardas da página como as outras públicas (axe, nada de rascunho, um aviso de demonstração)', () => {
  it('sem violações do axe (contraste fica para as capturas)', async () => {
    const { container } = renderizarRota(ROTA)
    const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)).toEqual([])
  })

  it('nada de rascunho, revisor, nomes fora da família de exemplo nem "protótipo" nos botões', () => {
    const { container } = renderizarRota(ROTA)
    const texto = container.querySelector('main')!.textContent!
    expect(texto).not.toMatch(/rascunho|revisor|nota para|pendente|quanto mais, melhor/i)
    expect(texto).not.toMatch(/\b(Lia|Ana)\b/)
    for (const botao of container.querySelectorAll('main .cm-botao')) expect(botao.textContent).not.toMatch(/protótipo/i)
  })

  it('um aviso de demonstração no documento inteiro, o do rodapé; o aviso de saúde não é de demonstração', () => {
    const { container } = renderizarRota(ROTA)
    const marcados = [...container.querySelectorAll('[data-aviso]')]
    expect(marcados).toHaveLength(1)
    expect(marcados[0].closest('footer[data-rodape]')).not.toBeNull()
    for (const saude of container.querySelectorAll('[data-aviso-saude]')) expect(saude.hasAttribute('data-aviso')).toBe(false)
  })

  it('nenhuma palavra em caixa alta de 4 letras ou mais (a porta CAIXA do medidor)', () => {
    const { container } = renderizarRota(ROTA)
    const caminhante = document.createTreeWalker(container.querySelector('main')!, NodeFilter.SHOW_TEXT)
    const palavras: string[] = []
    for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
      palavras.push(...(no.textContent!.match(/\p{Lu}{4,}/gu) ?? []))
    }
    expect(palavras.filter((p) => !['LGPD'].includes(p))).toEqual([])
  })
})

// ---- os arquivos da página (importações e estilo) ---------------------------------------------------------------
// Relativo a este arquivo (e não ao cwd): o teste roda da raiz do repositório e de web/.
const AQUI = dirname(fileURLToPath(import.meta.url))
const PASTA = join(AQUI, '..', '..', 'componentes', 'desenvolvimento-casa')
const arquivos = (extensao: string) =>
  readdirSync(PASTA)
    .filter((nome) => nome.endsWith(extensao))
    .map((nome) => ({ nome, texto: readFileSync(join(PASTA, nome), 'utf8') }))
const paginaTsx = readFileSync(join(AQUI, 'Desenvolvimento.tsx'), 'utf8')
const codigo = [{ nome: 'Desenvolvimento.tsx', texto: paginaTsx }, ...arquivos('.tsx')]
const css = arquivos('.css').map((a) => ({ nome: a.nome, texto: a.texto.replace(/\/\*[\s\S]*?\*\//g, '') }))

describe('DESENV-I-02 os módulos aposentados não são importados', () => {
  const PROIBIDOS =
    /CenaEstudio|CartaoFlutuante|PainelCampo|CartoesApp|\/Abertura\.tsx|CabecaDeSecao|\/Numeros|\/Passos|TabelaTexto|Ilustracao|campo\/Titulo|CenaCacau|SeletorDeFase|PartesDoArtigo|FontesDoItem|AvisoSaude|publicas-destaque|cenas\/publicas|ilustracoes\/|data-aparelho|movimento\/|from 'motion/
  it('nenhum arquivo da página os importa nem os cita', () => {
    for (const { nome, texto } of codigo) {
      // `Abertura.tsx` de desenvolvimento-casa é a abertura DESTA página; o aposentado é publicas-destaque/Abertura.
      const importacoes = texto
        .split('\n')
        .filter((linha) => /^import /.test(linha) && !linha.includes("'./Abertura.tsx'") && !linha.includes('desenvolvimento-casa/'))
      expect(importacoes.filter((linha) => PROIBIDOS.test(linha)), nome).toEqual([])
      expect(texto.includes('data-aparelho'), nome).toBe(false)
      expect(texto.includes('cenas/publicas'), nome).toBe(false)
    }
  })
})

describe('DESENV-I-10 e I-12 o CSS da página: sem visual antigo e sem movimento', () => {
  it('sem sombra, gradiente, blur, itálico, caixa alta, hex, mel de fundo, seta, animação nem opacidade < 1', () => {
    expect(css.length).toBeGreaterThan(0)
    for (const { nome, texto } of css) {
      expect(texto, nome).not.toMatch(/box-shadow|gradient\(|blur\(|backdrop-filter|font-style:\s*italic|text-transform:\s*uppercase/)
      expect(texto, nome).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(texto, nome).not.toMatch(/--color-mel|→/)
      expect(texto, nome).not.toMatch(/@keyframes|animation|will-change|view-transition-name|visibility:\s*hidden/)
      expect(texto, nome).not.toMatch(/opacity:\s*0?\.\d|opacity:\s*0\b/)
      expect(texto, nome).not.toMatch(/transition/)
    }
  })

  it('o CSS não traz literal pt-BR e o TSX da página não escreve frase de interface', () => {
    for (const { nome, texto } of codigo) {
      // Texto solto entre tags (uma letra com acento ou palavra com espaço), fora de expressões `{…}`.
      const soltos = [...texto.matchAll(/>\s*([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)\s*</g)].map((m) => m[1].trim()).filter(Boolean)
      expect(soltos, nome).toEqual([])
    }
  })
})

// Janela baixa (adendo 2, linha 9): o jsdom não faz layout, então aqui só a ordem do DOM e a presença das regras.
// Que o botão inteiro cabe na primeira tela (bottom <= innerHeight) só se vê nas capturas de 844x390, 667x375,
// 500x300 e 1440x700.
describe('janela baixa: h1, frase e botão na primeira tela', () => {
  it('na abertura, o h1, a frase e o botão principal vêm antes da cena no DOM', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = bandas(container)[0]
    const cena = abertura.querySelector('picture')!
    const antes = (no: Element) => (no.compareDocumentPosition(cena) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    expect(antes(within(abertura).getByRole('heading', { level: 1 }))).toBe(true)
    expect(antes(within(abertura).getByText(D.lede))).toBe(true)
    expect(antes(within(abertura).getByRole('link', { name: D.cta1 }))).toBe(true)
  })

  it('o CSS traz a paisagem baixa (duas colunas, a placa pela altura) e a estreita baixa, medidas em svh', () => {
    const texto = css.map((a) => a.texto).join('\n')
    expect(texto).toMatch(/@media \(max-width: 899px\) and \(min-width: 521px\) and \(max-height: 520px\)/)
    expect(texto).toMatch(/@media \(max-width: 520px\) and \(max-height: 520px\)/)
    expect(texto).toMatch(/100svh/)
  })
})
