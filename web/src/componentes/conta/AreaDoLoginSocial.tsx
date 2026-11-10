import type { ReactNode } from 'react'

/**
 * O lugar, acima do formulário de `/entrar` e de `/criar-conta`, de um botão de login social que
 * virá numa tarefa futura. Sem filhos não renderiza nada, então hoje não muda a tela; quando
 * houver um botão, ele entra aqui, separado do formulário.
 */
export function AreaDoLoginSocial({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <div data-area="login-social" className="flex flex-col gap-3">
      {children}
    </div>
  )
}
