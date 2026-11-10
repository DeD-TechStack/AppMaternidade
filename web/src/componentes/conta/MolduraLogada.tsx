import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { CABECALHO, COMUM, MARCA } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { BOTAO_SECUNDARIO, LINK_ALVO, ResumoErro } from './Partes.tsx'
import { useSessao } from './sessao.tsx'

interface AcaoSair {
  sair: () => void
  saindo: boolean
}

const ContextoSair = createContext<AcaoSair | null>(null)

/** O botão "Sair": o do cabeçalho e o do fim da Conta fazem a mesma saída. */
export function BotaoSair() {
  const acao = useContext(ContextoSair)
  if (!acao) return null
  return (
    <button type="button" className={BOTAO_SECUNDARIO} disabled={acao.saindo} onClick={acao.sair}>
      {acao.saindo ? COMUM.saindo : CABECALHO.sair}
    </button>
  )
}

const LINK_DA_NAVEGACAO = `${LINK_ALVO} px-2`
const SUBLINHADO_NA_PASSAGEM = 'no-underline hover:underline'

interface Props {
  /** Enquanto a tela espera dados, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

// A moldura das telas logadas desta tarefa: coluna centrada de até 64 rem, margem de 16 px, o aviso
// de demonstração como primeiro filho e, antes do `<main>`, o cabeçalho da conta. Em 390 px a marca
// fica numa linha e a navegação na de baixo; a partir de 40 rem ficam lado a lado, a marca sem
// nunca encolher e a navegação descendo para a linha de baixo quando as duas não couberem (fonte
// ampliada). Não monta a navegação inferior do protótipo.
export function MolduraLogada({ ocupado = false, children }: Props) {
  const { sair } = useSessao()
  const [saindo, setSaindo] = useState(false)
  const [falha, setFalha] = useState<ErroDados | null>(null)
  const resumo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (falha) resumo.current?.focus()
  }, [falha])

  async function aoSair() {
    if (saindo) return
    setSaindo(true)
    setFalha(null)
    const resultado = await sair()
    // Com sucesso, a guarda leva a /entrar e esta moldura sai do ar.
    if (!resultado.ok) setFalha(resultado.erro)
    setSaindo(false)
  }

  return (
    <ContextoSair value={{ sair: () => void aoSair(), saindo }}>
      <div className="mx-auto w-full max-w-[64rem] px-4 pb-16">
        <AvisoDemonstracao />
        <header className="flex flex-col items-start gap-1 border-b py-1 min-[40rem]:flex-row min-[40rem]:flex-wrap min-[40rem]:items-center min-[40rem]:justify-between min-[40rem]:gap-x-4">
          <Link to="/" className="marca alvo-toque inline-flex shrink-0 items-center no-underline">
            {MARCA}
          </Link>
          <nav aria-label={CABECALHO.navegacao} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <NavLink
              to="/app/conta"
              end
              className={({ isActive }) => `${LINK_DA_NAVEGACAO} ${isActive ? 'underline' : SUBLINHADO_NA_PASSAGEM}`}
            >
              {CABECALHO.conta}
            </NavLink>
            <Link to="/app/hoje" className={`${LINK_DA_NAVEGACAO} ${SUBLINHADO_NA_PASSAGEM}`}>
              {CABECALHO.prototipo}
            </Link>
            <BotaoSair />
          </nav>
        </header>
        {falha ? (
          <div className="mt-4">
            <ResumoErro erro={falha} refResumo={resumo} repetivel aoTentarDeNovo={() => void aoSair()} />
          </div>
        ) : null}
        <main aria-busy={ocupado || undefined} className="mt-8 flex flex-col gap-2">
          {children}
        </main>
      </div>
    </ContextoSair>
  )
}
