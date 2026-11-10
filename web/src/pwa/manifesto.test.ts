import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pastaSrcDe } from '../teste/fontes.ts'

// O manifesto é lido do disco: ele é um arquivo público, que o Vite copia para dist sem mexer.

const pastaWeb = pastaSrcDe(import.meta.url) + '../../'
const manifesto = JSON.parse(readFileSync(pastaWeb + 'public/manifest.webmanifest', 'utf8')) as Record<string, unknown>
const icones = manifesto.icons as Array<{ src: string; sizes: string; type: string; purpose?: string }>

describe('manifest.webmanifest', () => {
  it('nome, idioma e cores', () => {
    expect(manifesto.name).toBe('AppMaternidade')
    expect(manifesto.short_name).toBe('Maternidade')
    expect(manifesto.lang).toBe('pt-BR')
    expect(manifesto.display).toBe('standalone')
    expect(manifesto.background_color).toBe('#f6efe3')
    expect(manifesto.theme_color).toBe('#f6efe3')
  })

  it('o início e o escopo são relativos: valem em / e em /AppMaternidade/', () => {
    expect(manifesto.start_url).toBe('./app/hoje')
    expect(manifesto.scope).toBe('./')
  })

  it('traz os 4 PNG, com tamanho e tipo, e só o maskable leva purpose', () => {
    expect(icones).toHaveLength(4)
    const porArquivo = Object.fromEntries(icones.map((i) => [i.src, i]))
    expect(Object.keys(porArquivo).sort()).toEqual([
      'icones/apple-touch-icon-180.png',
      'icones/icone-192.png',
      'icones/icone-512.png',
      'icones/icone-maskable-512.png',
    ])
    expect(porArquivo['icones/icone-192.png'].sizes).toBe('192x192')
    expect(porArquivo['icones/icone-512.png'].sizes).toBe('512x512')
    expect(porArquivo['icones/icone-maskable-512.png'].sizes).toBe('512x512')
    expect(porArquivo['icones/apple-touch-icon-180.png'].sizes).toBe('180x180')
    for (const icone of icones) expect(icone.type).toBe('image/png')
    expect(porArquivo['icones/icone-maskable-512.png'].purpose).toBe('maskable')
    expect(porArquivo['icones/icone-192.png'].purpose).toBeUndefined()
    expect(porArquivo['icones/icone-512.png'].purpose).toBeUndefined()
  })

  it('os caminhos dos ícones são relativos (sem / na frente, sem domínio) e os arquivos existem', () => {
    for (const { src } of icones) {
      expect(src).not.toMatch(/^(\/|[a-z]+:)/)
      expect(existsSync(pastaWeb + 'public/' + src), src).toBe(true)
    }
  })

  it('não pede notificação nem push', () => {
    expect(Object.keys(manifesto)).not.toContain('gcm_sender_id')
    expect(JSON.stringify(manifesto)).not.toMatch(/push|notif/i)
  })
})
