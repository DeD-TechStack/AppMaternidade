import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { criarFixtureRotinaDemonstracao } from '../../dados/rotina.demonstracao.ts'
import { DesdeUltimoRegistro } from './BlocosDoHoje.tsx'

// R9: o bloco "Desde o seu último registro" é o que desenha os itens com o `ItemRegistro` no Hoje. A marca de
// envio (ponto M4 da MAT-41) precisa passar por ele até o item, logo depois da hora. A MAT-38 nunca a passa
// em produção: sem `marcaDe`, nenhum item tem o `span` da marca.

const registros = criarFixtureRotinaDemonstracao(Date.now()).registros.filter((r) => r.fim !== null).slice(0, 3)
const fuso = 'America/Sao_Paulo'

describe('R9: DesdeUltimoRegistro encaixa a marca de envio no ItemRegistro', () => {
  it('R9: sem `marcaDe`, nenhum item tem o span data-marca-envio', () => {
    const { container } = render(<DesdeUltimoRegistro marcoEm={Date.now()} registros={registros} fuso={fuso} autorDe={() => 'Bruno'} />)
    expect(container.querySelectorAll('[data-registro]')).toHaveLength(3)
    expect(container.querySelector('[data-marca-envio]')).toBeNull()
  })

  it('R9: com `marcaDe`, cada item mostra a marca dele no span, logo depois da hora', () => {
    const { container } = render(
      <DesdeUltimoRegistro marcoEm={Date.now()} registros={registros} fuso={fuso} autorDe={() => 'Bruno'} marcaDe={(r) => <b>{`marca ${r.id.slice(-3)}`}</b>} />,
    )
    const itens = [...container.querySelectorAll('[data-registro]')]
    expect(itens).toHaveLength(3)
    itens.forEach((item, indice) => {
      const span = item.querySelector('[data-marca-envio]')!
      expect(span.textContent).toBe(`marca ${registros[indice].id.slice(-3)}`)
      const hora = span.previousElementSibling!
      expect(hora.textContent).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('R9: `marcaDe` que devolve nulo ou nada não cria o span', () => {
    const { container } = render(
      <DesdeUltimoRegistro marcoEm={Date.now()} registros={registros} fuso={fuso} autorDe={() => 'Bruno'} marcaDe={() => null} />,
    )
    expect(container.querySelector('[data-marca-envio]')).toBeNull()
  })

  it('R9: com uma marca só em alguns registros, só eles têm o span', () => {
    const [primeiro] = registros
    const { container } = render(
      <DesdeUltimoRegistro
        marcoEm={Date.now()}
        registros={registros}
        fuso={fuso}
        autorDe={() => 'Bruno'}
        marcaDe={(r) => (r.id === primeiro.id ? <i>pendente</i> : undefined)}
      />,
    )
    expect(container.querySelectorAll('[data-marca-envio]')).toHaveLength(1)
    expect(container.querySelector(`[data-registro="${primeiro.id}"] [data-marca-envio]`)).not.toBeNull()
  })
})
