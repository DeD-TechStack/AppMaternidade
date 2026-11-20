import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { diaDaFamilia } from '../../dados/rotina.dia.ts'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

// B02: a data ao lado do título do Hoje usa o fuso da família, não o do aparelho. Cada teste fixa os dois
// fusos de forma explícita (TZ do processo e `fusoDaFamilia`), para passar igual no CI em UTC e numa máquina
// de São Paulo. `FUSO_DO_APARELHO` da fixture é lido na carga do módulo, por isso o fuso da família vai sempre
// explícito. O relógio é o falso.

const FUSO_ORIGINAL = process.env.TZ
const SAO_PAULO = 'America/Sao_Paulo'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  if (FUSO_ORIGINAL === undefined) delete process.env.TZ
  else process.env.TZ = FUSO_ORIGINAL
})

const dataDoTitulo = (container: HTMLElement) => container.querySelector('[data-data-do-dia] .sb-etiqueta')!.textContent

describe('Hoje: a data do título usa o fuso da família', () => {
  it('aparelho em UTC e família em São Paulo: 01:30Z de 12/11 ainda é quarta, 11 de novembro', async () => {
    process.env.TZ = 'UTC'
    const instante = new Date('2026-11-12T01:30:00Z')
    vi.setSystemTime(instante)

    const { container } = await renderizarRotaPronta('/app/hoje', { fusoDaFamilia: SAO_PAULO })

    expect(diaDaFamilia(instante.getTime(), SAO_PAULO)).toBe('2026-11-11')
    expect(dataDoTitulo(container)).toBe('Quarta-feira, 11 de novembro')
  })

  it('família com fuso inválido usa o dia em UTC mesmo com aparelho em São Paulo', async () => {
    process.env.TZ = SAO_PAULO
    const instante = new Date('2026-11-12T01:30:00Z')
    vi.setSystemTime(instante)

    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(SAO_PAULO)
    expect(new Intl.DateTimeFormat('pt-BR', { day: 'numeric' }).format(instante)).toBe('11')

    const fuso = 'Invalid/Zone'
    const { container } = await renderizarRotaPronta('/app/hoje', { fusoDaFamilia: fuso })

    expect(diaDaFamilia(instante.getTime(), fuso)).toBe('2026-11-12')
    expect(dataDoTitulo(container)).toBe('Quinta-feira, 12 de novembro')
  })

  it('controle: aparelho e família em São Paulo ao meio-dia mostram a mesma data de sempre', async () => {
    process.env.TZ = SAO_PAULO
    const instante = new Date('2026-11-05T15:00:00Z')
    vi.setSystemTime(instante)

    const { container } = await renderizarRotaPronta('/app/hoje', { fusoDaFamilia: SAO_PAULO })

    expect(diaDaFamilia(instante.getTime(), SAO_PAULO)).toBe('2026-11-05')
    expect(dataDoTitulo(container)).toBe('Quinta-feira, 5 de novembro')
  })
})
