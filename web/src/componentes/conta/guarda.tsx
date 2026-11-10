import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { CarregandoAcesso, ResumoErroAcesso } from './PartesAcesso.tsx'
import { useSessao } from './sessao.tsx'

// O estado de espera ou de erro das rotas logadas: o próprio `<main>`, com uma área útil que começa a
// 64 px do cabeçalho (32 abaixo de 768), como a abertura das outras telas. O cabeçalho e o rodapé são
// do `Layout`.
function Casca({ ocupado = false, children }: { ocupado?: boolean; children: ReactNode }) {
  return (
    <main aria-busy={ocupado || undefined}>
      <div className="sb-area sb-acesso-estado">{children}</div>
    </main>
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
        <CarregandoAcesso />
      </Casca>
    )
  }

  if (sessao.estado === 'erro' && sessao.erro) {
    return (
      <Casca>
        <ResumoErroAcesso erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
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
