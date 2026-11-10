import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { CABECALHO, COMUM, MARCA } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { PainelApoio, type ConteudoDoPainel } from './PainelApoio.tsx'
import { BOTAO_SECUNDARIO, LINK_ALVO, ResumoErro } from './Partes.tsx'
import { useSessao } from './sessao.tsx'

interface AcaoSair {
  sair: () => void
  saindo: boolean
}

const ContextoSair = createContext<AcaoSair | null>(null)

/**
 * O botão "Sair": o do cabeçalho e o da seção "Sair" da Conta fazem a mesma saída. O do cabeçalho
 * é `compacto`: 44 px de altura, centrado na faixa de 56 px com folga igual acima e abaixo (o de 48 px
 * encostava na régua de baixo).
 */
export function BotaoSair({ compacto = false }: { compacto?: boolean }) {
  const acao = useContext(ContextoSair)
  if (!acao) return null
  return (
    <button
      type="button"
      className={compacto ? `${BOTAO_SECUNDARIO} min-h-11` : BOTAO_SECUNDARIO}
      disabled={acao.saindo}
      onClick={acao.sair}
    >
      {acao.saindo ? COMUM.saindo : CABECALHO.sair}
    </button>
  )
}

const LINK_DA_NAVEGACAO = `${LINK_ALVO} px-2`
const SUBLINHADO_NA_PASSAGEM = 'no-underline hover:underline'

interface Props {
  /** Enquanto a tela espera dados, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  /** A coluna da esquerda: quem a pessoa é e onde está (título, frase, status, índice). */
  esquerda: ReactNode
  /**
   * O painel de apoio, embaixo da `esquerda` no computador e depois da ação no celular. Com ele a
   * grade ocupa a altura da janela (a página não acaba no meio do espaço) e o painel cresce.
   */
  painel?: ConteudoDoPainel
  /** A coluna da direita: a ação (o formulário ou as seções). */
  children: ReactNode
}

// A moldura das telas logadas desta tarefa: o mesmo contêiner de 90 rem das telas públicas, o aviso
// de demonstração como primeiro filho e, antes do `<main>`, o cabeçalho da conta (a marca, "Conta"
// e "Sair"). A partir de 60 rem, duas colunas iguais com fio vertical, como nas telas públicas:
// `esquerda` e a ação (`children`). O cabeçalho é uma linha só em todas as larguras, igual ao da
// moldura pública: a marca sem nunca encolher e a navegação descendo para a linha de baixo só
// quando as duas não couberem (fonte ampliada). A distância do cabeçalho ao título é a mesma da
// moldura pública. Não monta a navegação inferior do protótipo.
export function MolduraLogada({ ocupado = false, esquerda, painel, children }: Props) {
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
      <div className="mx-auto w-full max-w-[90rem] px-4 pb-16 min-[40rem]:px-8">
        <AvisoDemonstracao />
        <header className="flex min-h-14 flex-row flex-wrap items-center justify-between gap-x-4 border-b py-0">
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
            <BotaoSair compacto />
          </nav>
        </header>
        {falha ? (
          <div className="mt-4">
            <ResumoErro erro={falha} refResumo={resumo} repetivel aoTentarDeNovo={() => void aoSair()} />
          </div>
        ) : null}
        <main
          aria-busy={ocupado || undefined}
          className={`mt-10 grid gap-10 min-[60rem]:mt-20 min-[60rem]:grid-cols-2 min-[60rem]:gap-x-0 ${
            painel
              ? 'min-[60rem]:min-h-[calc(100svh-13rem)] min-[60rem]:grid-rows-[auto_1fr] min-[60rem]:gap-y-8'
              : 'min-[60rem]:gap-y-0'
          }`}
        >
          <div className="flex min-w-0 flex-col gap-4 min-[60rem]:col-start-1 min-[60rem]:row-start-1 min-[60rem]:pr-16">
            {esquerda}
          </div>
          <div
            className={`min-w-0 min-[60rem]:col-start-2 min-[60rem]:row-start-1 min-[60rem]:border-l min-[60rem]:pl-16 ${painel ? 'min-[60rem]:row-span-2' : ''}`}
          >
            {children}
          </div>
          {painel ? (
            <div className="flex min-w-0 flex-col min-[60rem]:col-start-1 min-[60rem]:row-start-2 min-[60rem]:pr-16">
              <PainelApoio painel={painel} preencher />
            </div>
          ) : null}
        </main>
      </div>
    </ContextoSair>
  )
}
