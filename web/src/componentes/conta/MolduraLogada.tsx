import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { CABECALHO, COMUM } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { BOTAO_SECUNDARIO, ResumoErro } from './Partes.tsx'
import { useSessao } from './sessao.tsx'

interface AcaoSair {
  sair: () => void
  saindo: boolean
}

const ContextoSair = createContext<AcaoSair | null>(null)

/** O botão "Sair" da barra da conta: o único da página. */
function BotaoSair() {
  const acao = useContext(ContextoSair)
  if (!acao) return null
  return (
    <button
      type="button"
      className={`${BOTAO_SECUNDARIO} max-sm:order-2`}
      data-botao="contorno"
      data-tamanho="app"
      disabled={acao.saindo}
      onClick={acao.sair}
    >
      {acao.saindo ? COMUM.saindo : CABECALHO.sair}
    </button>
  )
}

// As abas da barra, sem sublinhado: a da página em que se está é uma pílula de mel; a outra, texto
// com seta. `alvo-toque` garante os 44 px de altura.
const LINK_DA_BARRA = 'alvo-toque inline-flex items-center gap-1 rounded-pilula px-4 font-medium no-underline'
const ABA_ATUAL = 'bg-[var(--cor-destaque)] font-semibold text-[var(--cor-sobre-destaque)]'

interface Props {
  /** Enquanto a tela espera dados, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

// A moldura das telas logadas desta tarefa, dentro do cabeçalho e do rodapé da casca (a marca, o
// "Modo madrugada" e o resto do cabeçalho são dela; o rodapé do app não traz o aviso de demonstração):
// o que a conta precisa a mais, o aviso de demonstração (só sem banco), uma barra fina de 1 px embaixo
// com o link da Conta, o de ir para o Hoje e o "Sair", o resumo de uma saída que falhou e o `<main>`.
// Não monta navegação inferior.
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
      <div className="cm-area pt-2">
        {/* Um só aviso honesto, acima da barra e fora do <main> e da mídia: só sem banco (`empty:hidden` some com a folga). */}
        <div className="pt-1 pb-1 empty:hidden">
          <AvisoDemonstracao lateral />
        </div>
        <nav
          aria-label={CABECALHO.navegacao}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--cor-fio-suave)] py-4 sm:gap-y-3"
        >
          {/* No celular os três não cabem numa linha: "Conta" e "Sair" ficam juntos na de cima, e o link do Hoje desce sozinho (só a ordem visual muda, a do DOM não). */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 max-sm:contents">
            <NavLink
              to="/app/conta"
              end
              className={({ isActive }) => `${LINK_DA_BARRA} max-sm:order-1 ${isActive ? ABA_ATUAL : ''}`}
            >
              {CABECALHO.conta}
            </NavLink>
            <Link to="/app/hoje" className={`${LINK_DA_BARRA} max-sm:order-3`}>
              {CABECALHO.irParaHoje}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <BotaoSair />
        </nav>
        {falha ? (
          <div className="mt-4 max-w-[28rem]">
            <ResumoErro erro={falha} refResumo={resumo} repetivel aoTentarDeNovo={() => void aoSair()} />
          </div>
        ) : null}
        <main aria-busy={ocupado || undefined} className="pb-4 pt-8 lg:pt-12">
          {children}
        </main>
      </div>
    </ContextoSair>
  )
}
