import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { CABECALHO } from '../../conteudo/conta.ts'
import { AvisoDaTela } from '../app/AvisoDaTela.tsx'
import { QuadroLayout } from '../base/layout/index.ts'

// O link da barra, sem sublinhado e sem recuo: o texto começa na borda do quadro, a mesma do h1 da tela.
// `alvo-toque` garante os 44 px de altura; `cm-barra-link` (campo.css) estende a área de toque por um
// pseudo-elemento e afasta o anel de foco do texto.
const LINK_DA_BARRA = 'cm-barra-link alvo-toque inline-flex items-center gap-1 font-medium no-underline'

interface Props {
  /** Enquanto a tela espera dados, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

/** A área do app (/app/*): lá o rodapé da casca não traz o aviso de demonstração (Layout.tsx). */
function naAreaDoApp(caminho: string) {
  return caminho === '/app' || caminho.startsWith('/app/')
}

// A moldura das telas logadas desta tarefa, dentro do cabeçalho e do rodapé da casca (a marca, o "Conta" e
// o "Sair" da sessão, o "Modo madrugada" nas páginas da Rotina e o resto do cabeçalho são dela): uma barra
// fina de 1 px embaixo com o link de ir para o Hoje, o `<main>` e, depois dele, o aviso de demonstração (só
// sem banco), numa região rotulada como nas telas do app (AvisoDaTela). Fora de /app/* (a Moderação) o
// rodapé da casca já traz o aviso: a moldura não repete. O "Sair" mora só no cabeçalho. Não monta
// navegação inferior.
export function MolduraLogada({ ocupado = false, children }: Props) {
  const { pathname } = useLocation()
  return (
    <>
      <QuadroLayout className="pt-esp-junto">
        <nav
          aria-label={CABECALHO.navegacao}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--cor-fio-suave)] py-esp-junto"
        >
          <Link to="/app/hoje" className={LINK_DA_BARRA}>
            {CABECALHO.irParaHoje}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </nav>
      </QuadroLayout>
      <main aria-busy={ocupado || undefined}>{children}</main>
      {naAreaDoApp(pathname) ? <AvisoDaTela /> : null}
    </>
  )
}
