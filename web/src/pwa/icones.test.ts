import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pastaSrcDe } from '../teste/fontes.ts'

const pastaIcones = pastaSrcDe(import.meta.url) + '../../public/icones/'

/** Largura e altura de um PNG, lidas do cabeçalho IHDR (bytes 16 a 23, big-endian). */
function dimensoesDoPng(arquivo: string): { largura: number; altura: number } {
  const bytes = readFileSync(pastaIcones + arquivo)
  expect([...bytes.subarray(0, 8)], `${arquivo}: assinatura PNG`).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  expect(bytes.subarray(12, 16).toString('ascii'), `${arquivo}: primeiro bloco`).toBe('IHDR')
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) }
}

describe('os PNG dos ícones', () => {
  const esperados: Array<[string, number]> = [
    ['icone-192.png', 192],
    ['icone-512.png', 512],
    ['icone-maskable-512.png', 512],
    ['apple-touch-icon-180.png', 180],
  ]
  it.each(esperados)('%s tem %i × %i', (arquivo, lado) => {
    expect(dimensoesDoPng(arquivo)).toEqual({ largura: lado, altura: lado })
  })
})

describe('icone.svg', () => {
  const svg = readFileSync(pastaIcones + 'icone.svg', 'utf8')

  it('tem o viewBox 512 × 512 e o fundo de papel cobrindo tudo', () => {
    expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 512 512"/)
    expect(svg).toMatch(/<rect\b[^>]*\bwidth="512"[^>]*\bheight="512"[^>]*\bfill="#F6EFE3"|<rect\b[^>]*\bfill="#F6EFE3"[^>]*\bwidth="512"[^>]*\bheight="512"/)
  })

  it('o símbolo é urucum com contorno na tinta', () => {
    expect(svg).toContain('#B0401C')
    expect(svg).toMatch(/stroke="#1A1511"/)
  })

  it('é só forma: sem letras, sem imagem, sem fonte e sem script', () => {
    expect(svg).not.toMatch(/<text\b|<tspan\b|<image\b|<script\b|<foreignObject\b|font-family|href=/i)
  })

  it('usa só as três cores do sistema', () => {
    const cores = new Set([...svg.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toUpperCase()))
    expect([...cores].sort()).toEqual(['#1A1511', '#B0401C', '#F6EFE3'])
  })
})
