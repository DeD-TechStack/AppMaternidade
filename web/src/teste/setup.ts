import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { aguardarAxe } from './axe.ts'
import { iniciarTeste } from './relogio.ts'

// Cada teste abre uma geração do relógio; um zumbi de um teste que estourou o tempo não muda a hora do seguinte.
beforeEach(() => {
  iniciarTeste()
})

// Sem globals no Vitest, a Testing Library não limpa sozinha entre os testes.
afterEach(async () => {
  // Uma execução do axe de um teste que estourou o tempo não pode seguir viva dentro do teste seguinte.
  await aguardarAxe()
  iniciarTeste()
  cleanup()
  // O relógio falso, os stubs de globais, os spies e o tema da madrugada não podem vazar
  // de um teste para o outro.
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('data-tema')
  document.documentElement.style.removeProperty('scroll-padding-bottom')
})
