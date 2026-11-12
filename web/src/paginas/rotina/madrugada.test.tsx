import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

// R3 da revisão do 38a (R38-04): a madrugada vive nas rotas da Rotina e termina com elas. O `Layout.tsx` volta
// à base: não guarda estado nem mexe no `<html>`. O relógio é o falso, às 10:00 de 5/11/2026.

const INSTANTE = new Date('2026-11-05T10:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const lua = () => screen.getByRole('button', { name: 'Modo madrugada' })
const tema = () => document.documentElement.getAttribute('data-tema')

async function ir(roteador: { navigate: (caminho: string) => Promise<void> }, caminho: string) {
  await act(async () => {
    await roteador.navigate(caminho)
  })
  await aguardarCarga()
}

describe('R3: a madrugada termina ao sair da Rotina e começa limpa ao entrar', () => {
  it('R3: o Layout não guarda estado da madrugada nem escreve no <html> (volta à versão da base)', () => {
    // `pastaSrcDe` devolve a pasta do teste (web/src/paginas/rotina/): o Layout fica dois níveis acima.
    const texto = readFileSync(`${pastaSrcDe(import.meta.url)}../../componentes/Layout.tsx`, 'utf8')

    expect(texto).not.toMatch(/useState|useEffect|setAttribute|removeAttribute|createContext|ContextoDaMadrugada/)
  })

  it('R3: Hoje em madrugada → /app/conta: sem data-tema, e a lua do cabeçalho volta a "não pressionada"', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { madrugada: true })
    expect(tema()).toBe('madrugada')
    expect(lua().getAttribute('aria-pressed')).toBe('true')

    await ir(roteador, '/app/conta')

    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')
  })

  it('R3: Hoje em madrugada → Início: sem data-tema', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { madrugada: true })

    await ir(roteador, '/')

    expect(tema()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Modo madrugada' })).toBeNull()
  })

  it('R3: sair para a Conta e reentrar na Rotina começa limpo: sem madrugada, e o botão grande não aparece', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { madrugada: true })

    await ir(roteador, '/app/conta')
    await ir(roteador, '/app/hoje')

    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
  })

  it('R3: ligar a lua fora da Rotina (na Conta) não liga nada e não vaza para a próxima entrada', async () => {
    const { roteador } = await renderizarRotaPronta('/app/conta')

    fireEvent.click(lua())
    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')

    await ir(roteador, '/app/hoje')
    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')
  })

  it('R3: Hoje → Sessão → formulário mantém a madrugada, e voltar ao Hoje também', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { madrugada: true })

    await ir(roteador, '/app/sessao')
    expect(tema()).toBe('madrugada')
    expect(lua().getAttribute('aria-pressed')).toBe('true')

    await ir(roteador, '/app/registro/novo?tipo=observacao')
    expect(tema()).toBe('madrugada')
    expect(lua().getAttribute('aria-pressed')).toBe('true')

    await ir(roteador, '/app/hoje')
    expect(tema()).toBe('madrugada')
    expect(screen.getByRole('button', { name: 'Iniciar mamada' })).toBeTruthy()
  })

  it('R3: o controle do cabeçalho liga e desliga a madrugada na Rotina', async () => {
    await renderizarRotaPronta('/app/hoje')
    expect(tema()).toBeNull()

    fireEvent.click(lua())
    expect(tema()).toBe('madrugada')
    expect(lua().getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(lua())
    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')
  })

  it('R3: desmontar a área (fechar a página) tira o data-tema do <html>', async () => {
    const { unmount } = await renderizarRotaPronta('/app/hoje', { madrugada: true })
    expect(tema()).toBe('madrugada')

    unmount()

    expect(tema()).toBeNull()
  })

  it('R3: no StrictMode a madrugada também liga, mantém e termina ao sair', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { madrugada: true, strict: true })
    expect(tema()).toBe('madrugada')

    await ir(roteador, '/app/sessao')
    expect(tema()).toBe('madrugada')

    await ir(roteador, '/app/conta')
    expect(tema()).toBeNull()
  })
})
