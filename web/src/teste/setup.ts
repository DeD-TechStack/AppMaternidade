import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Sem globals no Vitest, a Testing Library não limpa sozinha entre os testes.
afterEach(() => {
  cleanup()
  // O relógio falso, os stubs de globais, os spies e o tema da madrugada não podem vazar
  // de um teste para o outro.
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('data-tema')
  document.documentElement.style.removeProperty('scroll-padding-bottom')
})
