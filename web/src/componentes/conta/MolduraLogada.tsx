import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { CABECALHO, COMUM } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { BOTAO_SECUNDARIO, LINK_ALVO, ResumoErro } from './Partes.tsx'
import { useSessao } from './sessao.tsx'

interface AcaoSair {
  sair: () => void
  saindo: boolean
}

const ContextoSair = createContext<AcaoSair | null>(null)

/** O botão "Sair": o da barra da conta e o do fim da Conta fazem a mesma saída. */
export function BotaoSair() {
  const acao = useContext(ContextoSair)
  if (!acao) return null
  return (
    <button
      type="button"
      className={BOTAO_SECUNDARIO}
      data-botao="contorno"
      data-tamanho="app"
      disabled={acao.saindo}
      onClick={acao.sair}
    >
      {acao.saindo ? COMUM.saindo : CABECALHO.sair}
    </button>
  )
}

const LINK_DA_BARRA = `${LINK_ALVO} px-1`

interface Props {
  /** Enquanto a tela espera dados, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

// A moldura das telas logadas desta tarefa, dentro do cabeçalho e do rodapé da casca (a marca, o
// "Modo madrugada" e o resto do cabeçalho são dela, e o aviso de demonstração mora no rodapé): só o
// que a conta precisa a mais, uma barra fina de 1 px embaixo com o link da Conta, o do protótipo do
// Hoje e o "Sair", o resumo de uma saída que falhou e o `<main>`. Não monta a navegação inferior do
// protótipo.
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
        <nav
          aria-label={CABECALHO.navegacao}
          className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-[var(--cor-fio-suave)] py-2"
        >
          <div className="flex flex-wrap items-center gap-x-1 min-[30rem]:gap-x-3">
            <NavLink
              to="/app/conta"
              end
              className={({ isActive }) => `${LINK_DA_BARRA} ${isActive ? 'font-semibold' : ''}`}
            >
              {CABECALHO.conta}
            </NavLink>
            <Link to="/app/hoje" className={LINK_DA_BARRA}>
              {CABECALHO.prototipo}
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
