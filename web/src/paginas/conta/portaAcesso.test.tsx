import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { MANCHETES, PORTA_ACESSO } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// REP-T3: a placa da porta é a única imagem das telas de acesso. A cena de celular sobre o pedestal
// (`CenaAcesso`, `CenaEstudio`, `entrar@1x/@2x`) saiu, e o h1 é um nó de texto só, sem segunda linha.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const RAIZ = join(process.cwd())
const SRC = join(RAIZ, 'src') + sep

async function semConta() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

const TELAS: Array<[string, string, () => ReturnType<typeof renderizarComDados> | Promise<ReturnType<typeof renderizarComDados>>]> = [
  ['/entrar', MANCHETES.entrar, () => renderizarComDados('/entrar')],
  ['/criar-conta', MANCHETES.criarConta, () => renderizarComDados('/criar-conta')],
  ['/recuperar-acesso', MANCHETES.recuperarAcesso, () => renderizarComDados('/recuperar-acesso')],
  ['/app/comecar', MANCHETES.comecar, async () => renderizarComDados('/app/comecar', { dados: await semConta() })],
]

describe('a placa da porta nas telas de acesso', () => {
  for (const [rota, manchete, montar] of TELAS) {
    it(`${rota}: a única imagem é a porta, com o srcset de 390, 720, 780 e 1254 px, o sizes, o alt e o tamanho do cartão`, async () => {
      const { container } = await montar()
      await screen.findByRole('heading', { level: 1, name: manchete })

      const imagens = container.querySelectorAll<HTMLImageElement>('img')
      expect(imagens, 'uma imagem na tela de acesso').toHaveLength(1)
      const porta = imagens[0]
      expect(porta.getAttribute('alt')).toBe(PORTA_ACESSO.alt)
      expect(porta.getAttribute('srcset')).toBe(
        [390, 720, 780, 1254].map((largura) => `/cenas/acesso/porta-${largura}w.webp ${largura}w`).join(', '),
      )
      expect(porta.getAttribute('sizes')).toBe('(min-width: 1024px) min(720px, 50vw), 100vw')
      expect(porta.getAttribute('src')).toBe('/cenas/acesso/porta-720w.webp')
      expect(porta.getAttribute('width')).toBe('720')
      expect(porta.getAttribute('height')).toBe('720')
      expect(porta.getAttribute('decoding')).toBe('async')
      // Sem moldura, sombra, legenda nem degradê.
      expect(porta.className).not.toMatch(/shadow|rounded|border|ring|outline|gradient/)
      expect(container.querySelector('figure, figcaption, picture')).toBeNull()
    })

    it(`${rota}: nada da cena antiga (CenaEstudio, entrar@, painel de cena, desenho de traço)`, async () => {
      const { container } = await montar()
      await screen.findByRole('heading', { level: 1, name: manchete })

      expect(container.innerHTML).not.toMatch(/entrar@[12]x|CenaEstudio|CenaAcesso|data-cena|data-revela|data-ilustracao/)
      expect(container.querySelector('.cm-cena')).toBeNull()
    })

    it(`${rota}: o h1 é um nó de texto só, em prumo, sem segunda linha`, async () => {
      const { container } = await montar()
      const h1 = await screen.findByRole('heading', { level: 1, name: manchete })

      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(h1.childNodes).toHaveLength(1)
      expect(h1.firstChild!.nodeType).toBe(Node.TEXT_NODE)
      expect(h1.textContent).toBe(manchete)
      expect(h1.querySelector('.cm-segunda-linha, em, i')).toBeNull()
      expect(h1.classList.contains('cm-h1')).toBe(true)
      expect(h1.classList.contains('not-italic')).toBe(true)
    })
  }

  it('os quatro arquivos da porta existem em web/public e os da cena antiga saíram', () => {
    for (const largura of [390, 720, 780, 1254]) {
      expect(existsSync(join(RAIZ, 'public', 'cenas', 'acesso', `porta-${largura}w.webp`)), `porta-${largura}w.webp`).toBe(true)
    }
    for (const antigo of ['entrar@1x.webp', 'entrar@2x.webp']) {
      expect(existsSync(join(RAIZ, 'public', 'cenas', 'acesso', antigo)), antigo).toBe(false)
    }
    expect(existsSync(join(SRC, 'componentes', 'acesso', 'CenaAcesso.tsx'))).toBe(false)
    expect(existsSync(join(RAIZ, 'public', 'cenas', 'acesso', 'PROVENANCE.md'))).toBe(true)
  })

  it('nenhum arquivo da área de acesso e de conta cita a cena antiga', () => {
    const pastas = ['componentes/acesso/', 'componentes/conta/', 'paginas/conta/']
    const arquivos = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
      .map((caminho) => caminho.replaceAll('\\', '/'))
      .filter((caminho) => pastas.some((pasta) => caminho.startsWith(pasta)))
      .filter((caminho) => /\.tsx?$/.test(caminho) && !/\.test\.tsx?$/.test(caminho))
    expect(arquivos.length).toBeGreaterThan(30)
    const achados: string[] = []
    for (const arquivo of [...arquivos, 'conteudo/conta.ts']) {
      const texto = readFileSync(join(SRC, arquivo), 'utf8')
      if (/CenaEstudio|CenaAcesso|CENA_ACESSO|entrar@[12]x/.test(texto)) achados.push(arquivo)
    }
    if (/CenaEstudio|CenaAcesso|CENA_ACESSO|entrar@[12]x/.test(readFileSync(join(RAIZ, 'index.html'), 'utf8'))) achados.push('index.html')
    expect(achados).toEqual([])
  })
})
