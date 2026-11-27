import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { Ultimos } from '../app/Ultimos.tsx'
import { UltimosDoHoje } from './UltimosDoHoje.tsx'

// R9 da revisão do 38a (R38-13): os Últimos do Hoje têm o encaixe da marca de envio junto da hora, o mesmo do
// `ItemRegistro` (`MarcaDeEnvio`), sem mudar a composição aprovada da base (`Ultimos`). A MAT-38 nunca passa a marca.

const registro = (id: string, tipo: Registro['tipo']): Registro => ({
  id,
  familiaId: 'f',
  bebeId: 'b',
  tipo,
  inicio: new Date('2026-11-05T09:10:00').toISOString(),
  fim: null,
  detalhes: {},
  nota: null,
  origem: 'ao_vivo',
  fuso: 'America/Sao_Paulo',
  deslocamentoMin: -180,
  criadoPor: 'c',
  encerradoPor: null,
  versao: 1,
  recebidoEm: new Date('2026-11-05T09:10:00').toISOString(),
  atualizadoEm: new Date('2026-11-05T09:10:00').toISOString(),
  excluidoEm: null,
  excluidoPor: null,
})

const fralda = registro('d0000000-0000-7000-8000-000000000001', 'fralda')
const mamada = registro('d0000000-0000-7000-8000-000000000002', 'mamada')

const itens = [
  { valor: '50 min', legenda: 'Fralda, tempo desde o registro', registro: fralda },
  { valor: '2 h 10', legenda: 'Mamada, tempo desde o registro', registro: mamada },
  { valor: '—', legenda: '—' },
]

describe('R9: UltimosDoHoje, o componente que o Hoje usa nos Últimos', () => {
  it('R9: sem marcaDe, nenhuma coluna tem o span data-marca-envio', () => {
    const { container } = render(<UltimosDoHoje itens={itens} />)

    expect(container.querySelectorAll('.sb-numeros-item')).toHaveLength(3)
    expect(container.querySelector('[data-marca-envio]')).toBeNull()
  })

  it('R9: com marcaDe, a marca fica no span data-marca-envio, logo depois da hora, só nas colunas com registro', () => {
    const { container } = render(
      <UltimosDoHoje itens={itens} marcaDe={(r) => <b>{r.tipo === 'fralda' ? 'pendente' : 'enviado'}</b>} />,
    )

    const marcas = [...container.querySelectorAll('[data-marca-envio]')]
    expect(marcas.map((m) => m.textContent)).toEqual(['pendente', 'enviado'])
    for (const marca of marcas) {
      expect(marca.previousElementSibling!.hasAttribute('data-numero')).toBe(true)
      expect(marca.closest('.sb-numeros-item')).not.toBeNull()
    }
    expect(marcas[0].previousElementSibling!.textContent).toBe('50 min')
    // A coluna de travessão não tem registro: não tem marca.
    expect(container.querySelectorAll('.sb-numeros-item')[2].querySelector('[data-marca-envio]')).toBeNull()
  })

  it('R9: marcaDe que devolve null ou undefined não cria o span (o mesmo encaixe do ItemRegistro)', () => {
    const nenhuma = render(<UltimosDoHoje itens={itens} marcaDe={() => null} />)
    expect(nenhuma.container.querySelector('[data-marca-envio]')).toBeNull()
    nenhuma.unmount()

    const indefinida = render(<UltimosDoHoje itens={itens} marcaDe={() => undefined} />)
    expect(indefinida.container.querySelector('[data-marca-envio]')).toBeNull()
  })

  it('R9: sem marca, a composição é a da base: o mesmo HTML do Ultimos aprovado', () => {
    const base = render(<Ultimos itens={itens.map(({ valor, legenda }) => ({ valor, legenda }))} className="regra" />)
    const html = (raiz: HTMLElement) => raiz.innerHTML.replace(/id="[^"]*"|aria-labelledby="[^"]*"/g, '')
    const baseHtml = html(base.container)
    base.unmount()

    const nosso = render(<UltimosDoHoje itens={itens} className="regra" />)

    expect(html(nosso.container)).toBe(baseHtml)
  })

  it('retains every full label, value and accessible suffix in both reflow renderers', () => {
    const contents = [
      { valor: '23:50', legenda: 'Sono, fim ontem' },
      { valor: '2 h 10', legenda: 'Mamada, tempo desde o registro' },
      { valor: '19:30', legenda: 'Mamadeira ontem' },
      { valor: '50 min', legenda: 'Fralda, tempo desde o registro' },
      { valor: '15:08', legenda: 'Tummy time, fim ontem' },
      { valor: '12:00', legenda: 'Alimentação sólida ontem' },
      { valor: '16/11 14:50', legenda: 'Observação' },
      { valor: '—', legenda: '—' },
    ]
    for (const Component of [Ultimos, UltimosDoHoje]) {
      const view = render(<Component itens={contents} />)
      const rows = [...view.container.querySelectorAll('.sb-numeros-item')]
      expect(rows).toHaveLength(contents.length)
      for (const [index, row] of rows.entries()) {
        expect(row.querySelector('[data-numero]')?.textContent).toBe(contents[index].valor)
        expect(row.querySelector(':scope > p')?.textContent).toBe(contents[index].legenda)
      }
      view.unmount()
    }
  })

  it('retains the date witness and its adjacent sending marker without changing the label', () => {
    const observation = registro('d0000000-0000-7000-8000-000000000003', 'observacao')
    const { container } = render(<UltimosDoHoje itens={[{ valor: '16/11 14:50', legenda: 'Observação', registro: observation }]} marcaDe={() => <b>pendente</b>} />)
    const marker = container.querySelector('[data-marca-envio]')!
    expect(marker.previousElementSibling?.textContent).toBe('16/11 14:50')
    expect(container.querySelector('.sb-numeros-item > p')?.textContent).toBe('Observação')
  })

  it('R9: o Hoje monta os Últimos por este componente (e não pelo Ultimos da base) e não passa marcaDe', () => {
    // `pastaSrcDe` devolve a pasta do teste (web/src/componentes/rotina/): a página fica em ../../paginas/rotina.
    const hoje = readFileSync(`${pastaSrcDe(import.meta.url)}../../paginas/rotina/Hoje.tsx`, 'utf8')

    expect(hoje).toMatch(/<UltimosDoHoje\b/)
    expect(hoje).not.toMatch(/app\/Ultimos\.tsx/)
    expect(hoje).not.toMatch(/marcaDe/)
  })
})
