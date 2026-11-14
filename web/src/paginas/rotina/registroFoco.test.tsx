import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { comSessaoEmAndamento } from '../../teste/rotina.fixture.ts'

// O foco do formulário de registro quando o "Salvar" cai num aviso que não bloqueia (passo "confirmando"):
// vai ao grupo dos avisos (nunca ao body), o próximo Tab chega a "Salvar assim", e "Corrigir" devolve o
// foco ao primeiro campo de horário (Início). Relógio falso parado às 10:00 de 5/11/2026.

const INSTANTE = new Date('2026-11-05T10:00:00')
const MIN = 60_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement
const digitar = (rotulo: string, valor: string) => fireEvent.change(campo(rotulo), { target: { value: valor } })
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const digitarFim = (hora: string) => {
  digitar('Fim: data', '2026-11-05')
  digitar('Fim: hora', hora)
}

async function enviar() {
  fireEvent.click(botao('Salvar'))
  await aguardarCarga()
}

const grupoDeAvisos = () => document.querySelector<HTMLElement>('[data-avisos]')

/** A descrição acessível do elemento: o texto dos elementos citados em `aria-describedby`, na ordem. */
const descricao = (elemento: HTMLElement) =>
  (elemento.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')

/** O primeiro elemento que o Tab alcança depois do grupo (ordem do DOM, sem `tabindex` negativo). */
const proximoNoTab = (grupo: HTMLElement) =>
  [...grupo.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]')].find(
    (elemento) => elemento.tabIndex >= 0 && !elemento.hasAttribute('disabled'),
  )

describe('o foco quando "Salvar" cai num aviso', () => {
  for (const tipo of ['sono', 'mamada'] as const) {
    it(`${tipo}: com uma sessão do mesmo tipo em andamento, o foco vai ao grupo dos avisos, que descreve a sobreposição`, async () => {
      await renderizarRotaPronta(`/app/registro/novo?tipo=${tipo}`, { ajustarRotina: comSessaoEmAndamento(tipo, 72 * MIN) })
      digitar('Início: hora', '09:00')
      digitarFim('09:30')

      await enviar()

      const grupo = grupoDeAvisos()
      expect(grupo, 'o grupo dos avisos').not.toBeNull()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toBe(grupo)
      expect(grupo!.getAttribute('tabindex')).toBe('-1')
      expect(descricao(grupo!)).toContain('se sobrepõe')
      // O próximo Tab chega a "Salvar assim".
      expect(proximoNoTab(grupo!)).toBe(botao('Salvar assim'))
    })
  }

  it('duração acima do limite: o foco vai ao grupo dos avisos, que descreve a duração', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=tummy')
    digitar('Início: hora', '08:00')
    digitarFim('10:00')

    await enviar()

    const grupo = grupoDeAvisos()
    expect(grupo, 'o grupo dos avisos').not.toBeNull()
    expect(document.activeElement).toBe(grupo)
    expect(descricao(grupo!)).toContain('mais do que o esperado')
    expect(proximoNoTab(grupo!)).toBe(botao('Salvar assim'))
  })

  it('os dois avisos juntos: o grupo é descrito pelos dois parágrafos', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=mamada', { ajustarRotina: comSessaoEmAndamento('mamada', 72 * MIN) })
    digitar('Início: hora', '07:00')
    digitarFim('09:30')

    await enviar()

    const grupo = grupoDeAvisos()!
    expect(grupo.querySelectorAll('p')).toHaveLength(2)
    expect(grupo.getAttribute('aria-describedby')!.split(/\s+/)).toHaveLength(2)
    expect(document.activeElement).toBe(grupo)
    expect(descricao(grupo)).toContain('mais do que o esperado')
    expect(descricao(grupo)).toContain('se sobrepõe')
  })

  it('"Corrigir" devolve o foco ao campo Início (data), nunca ao body', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=sono')
    digitar('Início: hora', '09:00')
    digitarFim('09:30')
    await enviar()
    expect(grupoDeAvisos()).not.toBeNull()

    fireEvent.click(botao('Corrigir'))
    await aguardarCarga()

    expect(grupoDeAvisos()).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(campo('Início: data'))
  })

  it('"Corrigir" na mamada (com a mesma regra dos outros tipos de sessão) leva o foco ao campo Início', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=mamada', { ajustarRotina: comSessaoEmAndamento('mamada', 72 * MIN) })
    digitar('Início: hora', '09:00')
    digitarFim('09:30')
    await enviar()

    fireEvent.click(botao('Corrigir'))
    await aguardarCarga()

    expect(document.activeElement).toBe(campo('Início: data'))
  })
})
