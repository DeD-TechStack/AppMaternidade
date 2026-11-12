import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { TITULOS } from '../../conteudo/conta.ts'
import { Carregando, ResumoErro } from './Partes.tsx'
import { useSessao } from './sessao.tsx'

// O estado carregando e o erro da guarda: o aviso de demonstração (só sem banco) e o `<main>` na área
// de conteúdo, dentro do cabeçalho e do rodapé da casca (o rodapé do app não traz o aviso).
function Casca({ ocupado = false, children }: { ocupado?: boolean; children: ReactNode }) {
  return (
    <>
      {/* Um só aviso de demonstração (só sem banco), acima do <main>. */}
      <div className="cm-area pt-3 empty:hidden">
        <AvisoDemonstracao lateral />
      </div>
      <main aria-busy={ocupado || undefined} className="cm-area pt-10">
        <div className="max-w-[28rem]">{children}</div>
      </main>
    </>
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
        <h1 className="cm-h1 wrap-anywhere mb-6 max-sm:text-[48px] max-sm:leading-[52px]">{TITULOS.erroDaConta}</h1>
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
