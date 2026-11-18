import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { baixarJson } from './arquivo.ts'

describe('baixarJson', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    if (typeof URL.createObjectURL !== 'function') {
      Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:teste', configurable: true, writable: true })
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, configurable: true, writable: true })
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('revoga o endereço depois do clique, não de forma síncrona', () => {
    const revogar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    baixarJson({ a: 1 }, 'x.json')
    expect(revogar).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revogar).toHaveBeenCalledTimes(1)
    expect(revogar).toHaveBeenCalledWith('blob:teste')
  })
})
