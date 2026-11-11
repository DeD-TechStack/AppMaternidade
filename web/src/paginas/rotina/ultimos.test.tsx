import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

// "Últimos" no Hoje em 1440: uma grade de 3 colunas com 5 itens. O primeiro item de cada linha (o 1º e o 4º,
// Mamadeira) encosta na margem do cartão, sem fio vertical nem recuo; antes só o 1º ficava assim e o 4º
// ganhava um fio solto à esquerda. O componente da base não muda: o Hoje passa a regra por `className`.
// (O espaço entre as linhas vem do próprio `Ultimos` da 49b v2, `lg:py-5` em cada item.)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

describe('Hoje: o fio vertical do bloco Últimos', () => {
  it('o primeiro item de cada linha de 3 colunas fica sem fio e sem recuo', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const secao = container.querySelector('[data-ultimos]')!
    expect(secao.querySelectorAll('.sb-numeros-item')).toHaveLength(5)
    const classes = secao.className.split(/\s+/)
    expect(classes).toContain('lg:[&_.sb-numeros-item:nth-child(3n+1)]:border-l-0')
    expect(classes).toContain('lg:[&_.sb-numeros-item:nth-child(3n+1)]:pl-0')
  })
})
