import type { ReactNode } from 'react'
import { LOGIN_GOOGLE } from '../../conteudo/conta.ts'

/**
 * O lugar, acima do formulário de `/entrar` e de `/criar-conta`, do botão de login social ("Entrar com
 * Google", que só existe com banco). Sem filhos não renderiza nada, então sem o botão a tela não muda;
 * com ele, o botão entra aqui, seguido de um texto que o separa do formulário (só texto, sem controle).
 */
export function AreaDoLoginSocial({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <div data-area="login-social" className="flex flex-col gap-3">
      {children}
      <p className="cm-pequeno text-center text-[var(--cor-texto-2)]">{LOGIN_GOOGLE.ou}</p>
    </div>
  )
}
