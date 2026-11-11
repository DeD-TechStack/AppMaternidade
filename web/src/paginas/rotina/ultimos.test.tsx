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
    const { container } = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })

    const secao = container.querySelector('[data-ultimos]')!
    expect(secao.querySelectorAll('.sb-numeros-item')).toHaveLength(5)
    const classes = secao.className.split(/\s+/)
    expect(classes).toContain('lg:[&_.sb-numeros-item:nth-child(3n+1)]:border-l-0')
    expect(classes).toContain('lg:[&_.sb-numeros-item:nth-child(3n+1)]:pl-0')
  })
})

// R9 da revisão do 38a (R38-13): o Hoje desenha os Últimos pelo componente com o encaixe da marca de envio e
// nunca passa a marca em produção (a MAT-41, ponto M4, é quem passa).
describe('R9: os Últimos do Hoje e o lugar da marca de envio', () => {
  it('R9: no Hoje real, nenhuma coluna dos Últimos tem o span data-marca-envio', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })

    expect(container.querySelectorAll('[data-ultimos] .sb-numeros-item').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-ultimos] [data-marca-envio]')).toBeNull()
    expect(container.querySelector('[data-marca-envio]')).toBeNull()
  })
})
