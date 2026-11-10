import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { Midia } from '../../componentes/base/Midia.tsx'
import { IlustracaoBerco } from '../../prototipo/IlustracaoBerco.tsx'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Volta visual 1, D4, D5, D7 e D8. Cada defeito é uma classe:
// D4: a lua do berço (um disco de barro por cima do disco de tinta) tem de se recortar no fundo da
//     moldura, seja barro ou lavanda.
// D5: o parágrafo de apresentação de 4 páginas ocupa c2–c8, de 800 a 963 px; Desenvolvimento não muda.
// D7: toda tabela de leitura tem o cabeçalho da linha em c2–c3 e as demais células a partir de c4 + 32.
// D8: o nome do site num `h1` tem uma quebra só entre "App" e "Maternidade", sem hífen.
// O jsdom não calcula layout nem lê o `index.css`: a regra de CSS é lida do arquivo (bloco MAT-36) e a
// medida em 1440 e em 390 vem do medidor, no navegador.

const NOVAS = [
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
]
const COM_APRESENTACAO_AMPLA = ['/como-funciona', '/cuidado-compartilhado', '/regras-da-comunidade', '/sobre']

interface Regra {
  seletor: string
  corpo: string
  /** Os `@media`/`@layer` que envolvem a regra, de fora para dentro. */
  condicao: string[]
}

const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8')

function lerRegras(texto: string): Regra[] {
  const sem = texto.replace(/\/\*[\s\S]*?\*\//g, '')
  const regras: Regra[] = []
  const pilha: Array<{ pre: string; filhos: number }> = []
  let atual = ''
  for (const caractere of sem) {
    if (caractere === '{') {
      pilha.push({ pre: atual.trim(), filhos: 0 })
      atual = ''
    } else if (caractere === '}') {
      const topo = pilha.pop()!
      if (topo.filhos === 0) {
        regras.push({ seletor: topo.pre, corpo: atual, condicao: pilha.map((p) => p.pre).filter((p) => p.startsWith('@')) })
      }
      if (pilha.length > 0) pilha[pilha.length - 1].filhos += 1
      atual = ''
    } else {
      atual += caractere
    }
  }
  return regras
}

const regrasDoSite = lerRegras(css)
const regrasDoBloco = lerRegras(css.slice(css.indexOf('/* MAT-36: páginas públicas */')))
const achar = (regras: Regra[], parte: string) => regras.filter((r) => r.seletor.split(',').some((s) => s.includes(parte)))

async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

describe('D4: a lua do berço se recorta no fundo da moldura', () => {
  const REGRA_LUA = "[data-ilustracao='berco'] circle[cx='97'][cy='37']"
  const regraLua = achar(regrasDoBloco, REGRA_LUA)

  it('há uma regra do bloco MAT-36 só para o berço dentro da moldura lavanda, com o fundo da própria moldura', () => {
    expect(regraLua).toHaveLength(1)
    const [regra] = regraLua
    expect(regra.seletor).toContain(".sb-midia[data-fundo='lavanda']")
    const fundoDaLavanda = /background-color:\s*(var\(--[a-z0-9-]+\))/.exec(
      achar(regrasDoSite, ".sb-midia[data-fundo='lavanda']").find((r) => /background-color/.test(r.corpo))!.corpo,
    )![1]
    expect(regra.corpo).toMatch(new RegExp(`fill:\\s*${fundoDaLavanda.replace(/[()]/g, '\\$&')}`))
  })

  it('o barro continua sem regra própria: nenhuma regra do bloco fala de moldura barro', () => {
    for (const { seletor } of regrasDoBloco) expect(seletor).not.toMatch(/data-fundo=['"]?barro/)
  })

  it('o seletor acerta o recorte (o disco de barro da lua) numa moldura lavanda e nenhum nó numa moldura barro', () => {
    const seletor = regraLua[0].seletor
    for (const fundo of ['lavanda', 'barro'] as const) {
      cleanup()
      const { container } = render(
        <Midia formato="par" fundo={fundo} aria-label="berço">
          <IlustracaoBerco />
        </Midia>,
      )
      const achados = container.querySelectorAll(seletor)
      if (fundo === 'lavanda') {
        expect(achados).toHaveLength(1)
        expect(achados[0].getAttribute('class')).toContain('ilu-barro')
        expect(achados[0].getAttribute('class')).toContain('ilu-sem-traco')
      } else {
        expect(achados).toHaveLength(0)
      }
    }
  })

  it('em toda página, cada moldura lavanda com o berço tem o recorte que o seletor acerta', async () => {
    const seletor = regraLua[0].seletor
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const moldura of container.querySelectorAll("main [data-midia][data-fundo='lavanda']")) {
        if (!moldura.querySelector("[data-ilustracao='berco']")) continue
        expect(moldura.querySelectorAll(seletor), caminho).toHaveLength(1)
      }
    }
  }, 30000)
})

describe('D5: o parágrafo de apresentação de 4 páginas é largo (800 a 963 px), em c2–c8', () => {
  it('as 4 páginas levam data-ampla e Desenvolvimento não', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      const apresentacoes = container.querySelectorAll('main p[data-apresentacao]')
      if (caminho === '/desenvolvimento') {
        expect(apresentacoes, caminho).toHaveLength(1)
        expect(apresentacoes[0].hasAttribute('data-ampla'), caminho).toBe(false)
      } else if (COM_APRESENTACAO_AMPLA.includes(caminho)) {
        expect(apresentacoes, caminho).toHaveLength(1)
        expect(apresentacoes[0].hasAttribute('data-ampla'), caminho).toBe(true)
        expect(apresentacoes[0].closest('.col-c2-c8'), caminho).not.toBeNull()
      } else {
        expect(apresentacoes, caminho).toHaveLength(0)
      }
    }
  }, 30000)

  it('a regra do bloco dá de 800 a 963 px só a .vp-apresentacao[data-ampla]; a regra geral de 40rem não mudou', () => {
    const ampla = achar(regrasDoBloco, '.vp-apresentacao[data-ampla]')
    expect(ampla).toHaveLength(1)
    // 65ch dá 69 caracteres por linha em 28 px (G10 pede no máximo 65): a largura é em rem, no intervalo do critério.
    const rem = Number(/max-width:\s*([\d.]+)rem/.exec(ampla[0].corpo)![1])
    expect(rem * 16).toBeGreaterThanOrEqual(800)
    expect(rem * 16).toBeLessThanOrEqual(963)
    expect(ampla[0].corpo).not.toMatch(/text-wrap:\s*balance/)
    const geral = regrasDoBloco.filter((r) => r.seletor === '.vp-apresentacao')
    expect(geral).toHaveLength(1)
    expect(geral[0].corpo).toMatch(/max-width:\s*40rem/)
    expect(geral[0].corpo).toMatch(/text-wrap:\s*balance/)
  })
})

describe('D7: toda tabela de leitura tem as demais células a partir de c4 + 32', () => {
  it('as 9 páginas: cada tabela do main é uma .vp-tabela, com o cabeçalho da linha como 1ª célula e há tabela em Cuidado e Regras', async () => {
    const com: string[] = []
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const tabela of container.querySelectorAll('main table')) {
        com.push(caminho)
        expect(tabela.classList.contains('vp-tabela'), caminho).toBe(true)
        for (const linha of tabela.querySelectorAll('tbody tr')) {
          const primeira = linha.children[0]
          expect(primeira.tagName, caminho).toBe('TH')
          expect(primeira.getAttribute('scope'), caminho).toBe('row')
          expect(linha.children.length, caminho).toBeGreaterThanOrEqual(3)
        }
        expect(tabela.querySelector('thead tr')!.children[0].getAttribute('scope'), caminho).toBe('col')
      }
    }
    expect(com).toEqual(['/cuidado-compartilhado', '/regras-da-comunidade'])
  }, 30000)

  it('de 768 para cima o cabeçalho da linha tem c2–c3 (2/7 da tabela) e a 2ª coluna recua 32 px; o celular não muda', () => {
    const largo = '@media (min-width: 768px)'
    const primeira = achar(regrasDoBloco, '.vp-tabela th:first-child')
    expect(primeira).toHaveLength(1)
    expect(primeira[0].condicao).toContain(largo)
    expect(primeira[0].corpo).toMatch(/width:\s*28\.5714%/)

    const segunda = achar(regrasDoBloco, '.vp-tabela td:nth-child(2)')
    expect(segunda).toHaveLength(1)
    expect(segunda[0].condicao).toContain(largo)
    expect(segunda[0].seletor).toContain('.vp-tabela th:nth-child(2)')
    expect(segunda[0].corpo).toMatch(/padding-left:\s*32px/)

    // A tabela com número em destaque (canais de ajuda) dá 32 px de respiro depois do número.
    const comNumero = achar(regrasDoBloco, '.vp-tabela[data-com-numero] td:nth-child(2)')
    expect(comNumero).toHaveLength(1)
    expect(comNumero[0].condicao).toContain(largo)
    expect(comNumero[0].corpo).toMatch(/padding-right:\s*32px/)

    // Nada novo dentro do @media estreito (a tabela empilhada fica como está).
    for (const regra of regrasDoBloco.filter((r) => r.condicao.includes('@media (max-width: 767px)') && /vp-tabela/.test(r.seletor))) {
      expect(regra.corpo, regra.seletor).not.toMatch(/28\.5714|padding-left:\s*32px|padding-right:\s*32px/)
    }
  })
})

describe('D8: o nome do site no h1 quebra só entre "App" e "Maternidade", sem hífen', () => {
  it('todo h1 com "AppMaternidade" tem um <wbr> entre as duas partes; os outros h1 não têm quebra marcada', async () => {
    const comNome: string[] = []
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      const h1 = container.querySelector('main h1')!
      if (h1.textContent!.includes('AppMaternidade')) {
        comNome.push(caminho)
        expect(h1.innerHTML, caminho).toContain('<span class="vp-nome">App<wbr>Maternidade</span>')
        expect(h1.querySelectorAll('wbr'), caminho).toHaveLength(1)
        // O texto lido (textContent e nome acessível) não muda: a quebra não é um caractere.
        expect(h1.textContent, caminho).toBe(h1.innerHTML.replace(/<[^>]+>/g, ''))
      } else {
        expect(h1.querySelectorAll('wbr'), caminho).toHaveLength(0)
      }
    }
    expect(comNome).toEqual(['/sobre'])
  }, 30000)

  it('o nome acessível e o título da aba do Sobre continuam "Sobre o AppMaternidade"', async () => {
    await abrir('/sobre')
    expect(screen.getByRole('heading', { level: 1, name: 'Sobre o AppMaternidade' })).toBeTruthy()
    expect(document.title).toBe('Sobre | AppMaternidade')
  })

  it('a regra vale pelo texto: qualquer título com o nome ganha a quebra, e um sem o nome não', () => {
    cleanup()
    const { container } = render(<AberturaPublica titulo="Um recado do AppMaternidade" subtitulo="Linha." construcao={false} />)
    expect(container.querySelector('h1')!.innerHTML).toBe('Um recado do <span class="vp-nome">App<wbr>Maternidade</span>')
    expect(container.querySelector('h1')!.textContent).toBe('Um recado do AppMaternidade')
    cleanup()
    const outro = render(<AberturaPublica titulo="Desenvolvimento" subtitulo="Linha." construcao={false} />)
    expect(outro.container.querySelector('h1')!.innerHTML).toBe('Desenvolvimento')
  })

  it('só o h1 com a quebra marcada tem hyphens: manual; a regra geral dos h1 (hifenização automática) fica', () => {
    const geral = regrasDoBloco.filter((r) => r.seletor === '.vp-pagina h1')
    expect(geral).toHaveLength(1)
    expect(geral[0].corpo).toMatch(/hyphens:\s*auto/)
    const nome = achar(regrasDoBloco, '.vp-pagina h1:has(wbr)')
    expect(nome).toHaveLength(1)
    expect(nome[0].corpo).toMatch(/hyphens:\s*manual/)
    expect(nome[0].corpo).not.toMatch(/font-size|line-height/)
  })

  it('de 768 para cima o nome é uma caixa em linha única (inteiro na linha quando cabe); o celular não tem a regra', () => {
    const caixa = achar(regrasDoBloco, '.vp-pagina h1 .vp-nome')
    expect(caixa).toHaveLength(1)
    expect(caixa[0].condicao).toContain('@media (min-width: 768px)')
    expect(caixa[0].corpo).toMatch(/display:\s*inline-block/)
  })
})
