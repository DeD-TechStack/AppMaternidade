import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Imagem } from '../componentes/secoes/contrato.ts'

// Todo endereço de imagem pública passa pela base do site. No build do Pages (BASE_SITE=/AppMaternidade/previa/) um
// `/cenas/x` pede a raiz do domínio e dá 404. Aqui a base é simulada em `import.meta.env.BASE_URL`; os módulos de dados
// leem a base quando carregam, então cada caso zera o registro de módulos e importa DEPOIS do stub. O gate do build
// inteiro (nenhuma URL raiz-absoluta no dist) é `web/scripts/baseDoSite.test.mjs`.

const BASE = '/AppMaternidade/previa/'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function ajudante() {
  return import('../componentes/campo/urlPublica.ts')
}

describe('imagemPublica (o ajudante único da base)', () => {
  const placa: Imagem = {
    src: '/cenas/inicio/m05-sol-900w.webp',
    srcSet: '/cenas/inicio/m05-sol-900w.webp 900w, /cenas/inicio/m05-sol-1672w.webp 1672w',
    sizes: '(min-width: 1440px) 900px, 62.5vw',
    largura: 1672,
    altura: 941,
  }

  it('na base padrão "/" devolve o mesmo valor', async () => {
    const { imagemPublica } = await ajudante()
    expect(imagemPublica(placa)).toEqual(placa)
  })

  it('prefixa o src e cada candidato do srcSet, sem tocar em sizes nem nas medidas', async () => {
    vi.stubEnv('BASE_URL', BASE)
    const { imagemPublica } = await ajudante()
    expect(imagemPublica(placa)).toEqual({
      src: `${BASE}cenas/inicio/m05-sol-900w.webp`,
      srcSet: `${BASE}cenas/inicio/m05-sol-900w.webp 900w, ${BASE}cenas/inicio/m05-sol-1672w.webp 1672w`,
      sizes: '(min-width: 1440px) 900px, 62.5vw',
      largura: 1672,
      altura: 941,
    })
  })

  it('devolve uma cópia: o original não muda e uma imagem sem srcSet continua sem srcSet', async () => {
    vi.stubEnv('BASE_URL', BASE)
    const { imagemPublica } = await ajudante()
    const original: Imagem = { src: '/molduras/moldura-dia.png', largura: 678, altura: 1423 }
    const copia = imagemPublica(original)
    expect(copia).not.toBe(original)
    expect(original.src).toBe('/molduras/moldura-dia.png')
    expect(copia).toEqual({ src: `${BASE}molduras/moldura-dia.png`, largura: 678, altura: 1423 })
    expect('srcSet' in copia).toBe(false)
  })

  it('é idempotente: aplicar de novo não duplica a base', async () => {
    vi.stubEnv('BASE_URL', BASE)
    const { imagemPublica } = await ajudante()
    const uma = imagemPublica(placa)
    expect(imagemPublica(uma)).toEqual(uma)
    expect(imagemPublica(imagemPublica(uma))).toEqual(uma)
  })

  it('deixa quieta a URL que já leva a base, a http(s):, a data:, a relativa e a protocolo-relativa', async () => {
    vi.stubEnv('BASE_URL', BASE)
    const { imagemPublica } = await ajudante()
    const deixadas = [
      `${BASE}assets/cena-DfG3k9.webp`,
      `${BASE}cenas/x.webp`,
      'https://exemplo.com/cenas/x.webp',
      'http://exemplo.com/cenas/x.webp',
      'data:image/png;base64,AAAA',
      'cenas/x.webp',
      './cenas/x.webp',
      '//cdn.exemplo.com/cenas/x.webp',
    ]
    for (const url of deixadas) {
      expect(imagemPublica({ src: url, largura: 1, altura: 1 }).src, url).toBe(url)
      expect(imagemPublica({ src: url, srcSet: `${url} 1x`, largura: 1, altura: 1 }).srcSet, url).toBe(`${url} 1x`)
    }
  })

  it('trata cada candidato do srcSet por si: misto de raiz-absoluto e já com a base, sem espaço depois da vírgula', async () => {
    vi.stubEnv('BASE_URL', BASE)
    const { imagemPublica } = await ajudante()
    const imagem = imagemPublica({
      src: '/telas/a.webp',
      srcSet: `/telas/a.webp 280w,${BASE}telas/b.webp 320w,  /telas/c.webp 560w`,
      largura: 1,
      altura: 1,
    })
    expect(imagem.srcSet).toBe(`${BASE}telas/a.webp 280w,${BASE}telas/b.webp 320w,  ${BASE}telas/c.webp 560w`)
  })

  it('lê a base na chamada, não ao carregar o módulo', async () => {
    const { imagemPublica } = await ajudante()
    expect(imagemPublica({ src: '/cenas/x.webp', largura: 1, altura: 1 }).src).toBe('/cenas/x.webp')
    vi.stubEnv('BASE_URL', BASE)
    expect(imagemPublica({ src: '/cenas/x.webp', largura: 1, altura: 1 }).src).toBe(`${BASE}cenas/x.webp`)
  })

  it('urlPublica continua igual: prefixa a base e não duplica barras', async () => {
    vi.stubEnv('BASE_URL', BASE)
    const { urlPublica } = await ajudante()
    expect(urlPublica('/cenas/x.webp')).toBe(`${BASE}cenas/x.webp`)
    expect(urlPublica('cenas/x.webp')).toBe(`${BASE}cenas/x.webp`)
  })
})

/** Os endereços de imagem da tela: cada `src`, cada candidato de `srcset` de `<img>` e de `<source>`. */
function enderecosDeImagem(raiz: ParentNode): string[] {
  const urls: string[] = []
  for (const elemento of raiz.querySelectorAll('img, source')) {
    const src = elemento.getAttribute('src')
    if (src) urls.push(src)
    const srcset = elemento.getAttribute('srcset')
    if (srcset) {
      for (const candidato of srcset.split(',')) {
        const url = candidato.trim().split(/\s+/)[0]
        if (url) urls.push(url)
      }
    }
  }
  return urls
}

/** Os `url(...)` raiz-absolutos de estilos em linha (nenhuma tela deve ter um sem a base). */
function urlsDeEstiloEmLinha(raiz: ParentNode): string[] {
  const achados: string[] = []
  for (const elemento of raiz.querySelectorAll('[style]')) {
    for (const achado of (elemento.getAttribute('style') ?? '').matchAll(/url\(\s*["']?(\/(?!\/)[^)"']*)/g)) achados.push(achado[1])
  }
  return achados
}

// [rota, exige imagem]: as páginas da casa, a porta de acesso, o /sistema e a 404 têm imagem; as de texto podem não ter.
const ROTAS: ReadonlyArray<[string, boolean]> = [
  ['/', true],
  ['/como-funciona', true],
  ['/cuidado-compartilhado', true],
  ['/desenvolvimento', true],
  ['/regras-da-comunidade', false],
  ['/privacidade', false],
  ['/termos', false],
  ['/exclusao-de-conta', false],
  ['/contato', false],
  ['/sobre', false],
  ['/entrar', true],
  ['/criar-conta', true],
  ['/sistema', true],
  ['/uma-pagina-que-nao-existe', true],
]

// As telas de acesso só mostram a porta para quem não entrou: vão pelo renderizador sem sessão e esperam o h1.
const SEM_SESSAO = new Set(['/entrar', '/criar-conta'])

/** Renderiza a rota, com os módulos carregados DEPOIS do stub da base (o registro foi zerado no `beforeEach`). */
async function montar(rota: string) {
  if (SEM_SESSAO.has(rota)) {
    const { renderizarComDados } = await import('./renderizarComDados.tsx')
    const resultado = renderizarComDados(rota)
    await screen.findByRole('heading', { level: 1 })
    return resultado
  }
  const { renderizarRotaPronta } = await import('./renderizarRota.tsx')
  return renderizarRotaPronta(rota)
}

describe(`as páginas públicas no build do Pages (BASE_URL=${BASE})`, () => {
  for (const [rota, exigeImagem] of ROTAS) {
    it(`${rota}: todo src e todo candidato de srcset começa pela base`, async () => {
      vi.stubEnv('BASE_URL', BASE)
      const { container } = await montar(rota)

      const urls = enderecosDeImagem(container)
      if (exigeImagem) expect(urls.length, `${rota} sem imagem`).toBeGreaterThan(0)
      const fora = urls.filter((url) => !url.startsWith(BASE))
      expect(fora, `${rota}: endereços fora da base`).toEqual([])
      expect(urls.filter((url) => url.startsWith(`${BASE}${BASE.slice(1)}`)), `${rota}: base duplicada`).toEqual([])
      expect(urlsDeEstiloEmLinha(container).filter((url) => !url.startsWith(BASE)), `${rota}: url() em estilo`).toEqual([])
    })
  }

  it('na base padrão "/" o endereço continua o mesmo caminho público (nada mudou fora do Pages)', async () => {
    const { renderizarRotaPronta } = await import('./renderizarRota.tsx')
    const { container } = await renderizarRotaPronta('/como-funciona')
    const urls = enderecosDeImagem(container)
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((url) => /^\/(cenas|telas|molduras|ilustracoes)\//.test(url))).toBe(true)
  })
})
