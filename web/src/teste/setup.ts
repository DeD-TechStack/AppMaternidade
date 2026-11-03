import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Sem globals no Vitest, a Testing Library não limpa sozinha entre os testes.
afterEach(() => {
  cleanup()
})
