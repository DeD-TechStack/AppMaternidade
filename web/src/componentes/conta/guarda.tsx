import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { Carregando, ResumoErro } from './Partes.tsx'
import { useSessao } from './sessao.tsx'

function Casca({ ocupado = false, children }: { ocupado?: boolean; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[64rem] px-4 py-8">
      <AvisoDemonstracao />
      <main aria-busy={ocupado || undefined} className="mt-8">
        {children}
      </main>
    </div>
  )
}

/**
 * A guarda das rotas logadas (RF-09). Carregando: o estado carregando, nunca o formulário de
 * entrar. Erro ao ler a sessão ou a conta: a frase do catálogo e "Tentar de novo". Sem sessão:
 * `/entrar?volta=<caminho atual>`, no lugar da entrada do histórico. Conta incompleta: o passo
 * "Seu nome" de `/app/comecar`. Ao redirecionar, repassa o `state` que recebeu.
 */
export function GuardaSessao() {
  const sessao = useSessao()
  const location = useLocation()
  const pedido = `${location.pathname}${location.search}`

  if (sessao.estado === 'carregando') {
    return (
      <Casca ocupado>
        <Carregando />
      </Casca>
    )
  }

  if (sessao.estado === 'erro' && sessao.erro) {
    return (
      <Casca>
        <ResumoErro erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
      </Casca>
    )
  }

  if (sessao.estado === 'sem_sessao' || sessao.estado === 'erro') {
    if (sessao.motivoSaida === 'pedida') {
      return <Navigate to="/entrar" replace state={{ mensagem: 'saiu' }} />
    }
    const estado = sessao.motivoSaida === 'sem_pedido' ? { mensagem: 'sessao_encerrada' } : location.state
    return <Navigate to={`/entrar?volta=${encodeURIComponent(pedido)}`} replace state={estado} />
  }

  if (!sessao.conta && location.pathname !== '/app/comecar') {
    return <Navigate to={`/app/comecar?volta=${encodeURIComponent(pedido)}`} replace state={location.state} />
  }

  return <Outlet />
}
