import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { ItemRegistro } from './ItemRegistro.tsx'

const registro: Registro = {
  id: 'd0000000-0000-7000-8000-000000000001',
  familiaId: 'f',
  bebeId: 'b',
  tipo: 'mamadeira',
  inicio: new Date('2026-11-05T09:10:00').toISOString(),
  fim: null,
  detalhes: { ml: 90, conteudo: 'leite_materno' },
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
}

// R38-13: o lugar da marca de envio. A MAT-38 nunca passa a marca; a MAT-41 (ponto M4) passa.
describe('ItemRegistro', () => {
  it('desenha a hora, o rótulo com o resumo e o autor', () => {
    render(
      <ul>
        <ItemRegistro registro={registro} fuso="America/Sao_Paulo" autor="Bruno" />
      </ul>,
    )

    expect(screen.getByText('Mamadeira, 90 ml · leite materno')).toBeTruthy()
    expect(screen.getByText('por Bruno')).toBeTruthy()
    expect(screen.getByText('09:10')).toBeTruthy()
  })

  it('sem `marca`, o span data-marca-envio não existe', () => {
    const { container } = render(
      <ul>
        <ItemRegistro registro={registro} fuso="America/Sao_Paulo" autor="Bruno" />
      </ul>,
    )

    expect(container.querySelector('[data-marca-envio]')).toBeNull()
  })

  it('com `marca`, ela fica dentro do span data-marca-envio, logo depois da hora', () => {
    const { container } = render(
      <ul>
        <ItemRegistro registro={registro} fuso="America/Sao_Paulo" autor="Bruno" marca={<b>pendente</b>} />
      </ul>,
    )

    const span = container.querySelector('[data-marca-envio]')!
    expect(span.textContent).toBe('pendente')
    expect(span.previousElementSibling!.textContent).toBe('09:10')
  })
})
