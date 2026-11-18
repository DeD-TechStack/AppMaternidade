// RED proof for CODE-Q finding ERR-1 (useEnvio stuck in 'enviando' when aoSucesso throws).
// Copied into <base>/web/src/__codeq__/ (scratch copy, never the repo) and run with vitest.
// EXPECTED at BASE: both tests FAIL (that is the finding). After the fix they must pass.
import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEnvio } from './envio.ts'

describe('useEnvio: mesmo gesto', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('dois enviar no mesmo gesto rodam a escrita uma vez, mesmo quando a primeira conclui na hora', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useEnvio())
    let chamadas = 0
    const plano = {
      escrever: async () => {
        chamadas += 1
        return { ok: true as const, valor: 1 }
      },
      aoSucesso: () => undefined,
    }
    await act(async () => {
      await result.current.enviar(plano)
    })
    await act(async () => {
      await result.current.enviar(plano)
    })
    expect(chamadas).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    await act(async () => {
      await result.current.enviar(plano)
    })
    expect(chamadas).toBe(2)
  })
})

describe('useEnvio: falha em aoSucesso nao pode travar o formulario', () => {
  it('estado sai de "enviando" e mostra erro quando aoSucesso lanca', async () => {
    const { result } = renderHook(() => useEnvio())
    await act(async () => {
      await result.current
        .enviar({ escrever: async () => ({ ok: true as const, valor: 1 }), aoSucesso: () => { throw new TypeError('baixarJson falhou') } })
        .catch(() => undefined)
    })
    expect(result.current.estado.fase).not.toBe('enviando')
    const estado = result.current.estado
    expect(estado.fase).toBe('erro')
    if (estado.fase === 'erro') expect(estado.erro.classe).toBe('desconhecido')
  })

  it('um segundo envio volta a chamar o banco depois da falha de aoSucesso', async () => {
    const { result } = renderHook(() => useEnvio())
    let chamadas = 0
    const plano = { escrever: async () => { chamadas += 1; return { ok: true as const, valor: 1 } }, aoSucesso: () => { throw new TypeError('x') } }
    await act(async () => { await result.current.enviar(plano).catch(() => undefined) })
    await act(async () => { await result.current.enviar(plano).catch(() => undefined) })
    expect(chamadas).toBe(2)
  })
})
