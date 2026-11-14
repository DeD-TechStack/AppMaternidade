import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { CABECALHO } from '../../conteudo/conta.ts'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { Pilha, QuadroLayout } from '../base/layout/index.ts'

// O link da barra, sem sublinhado; `alvo-toque` garante os 44 px de altura.
const LINK_DA_BARRA = 'alvo-toque inline-flex items-center gap-1 rounded-pilula px-4 font-medium no-underline'

interface Props {
  /** Enquanto a tela espera dados, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

// A moldura das telas logadas desta tarefa, dentro do cabeçalho e do rodapé da casca (a marca, o "Conta" e
// o "Sair" da sessão, o "Modo madrugada" nas páginas da Rotina e o resto do cabeçalho são dela; o rodapé do
// app não traz o aviso de demonstração): o que a conta precisa a mais, o aviso de demonstração (só sem
// banco), uma barra fina de 1 px embaixo com o link de ir para o Hoje e o `<main>`. O "Sair" mora só no
// cabeçalho, e a saída que falha também mostra o alerta lá. Não monta navegação inferior.
export function MolduraLogada({ ocupado = false, children }: Props) {
  return (
    <>
      <QuadroLayout className="pt-2">
        <Pilha vao="pilha">
          {/* Um só aviso honesto, acima da barra e fora do <main> e da mídia: só sem banco (`empty:hidden` some com a folga). */}
          <div className="empty:hidden">
            <AvisoDemonstracao lateral />
          </div>
          <nav
            aria-label={CABECALHO.navegacao}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--cor-fio-suave)] py-4 sm:gap-y-3"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to="/app/hoje" className={LINK_DA_BARRA}>
                {CABECALHO.irParaHoje}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </Pilha>
      </QuadroLayout>
      <main aria-busy={ocupado || undefined}>{children}</main>
    </>
  )
}
