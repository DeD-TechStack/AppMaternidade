import { Link } from 'react-router'
import { ROTULOS_DE_NAVEGACAO, TF } from '../../conteudo/publicas.ts'
import type { SecaoDeLeitura } from '../../conteudo/publicas.ts'
import { PaginaPublica, SecaoDePapel } from './Estrutura.tsx'
import { AvisoDeConstrucao, AvisoDeRascunho, Blocos, Paragrafo } from './Textos.tsx'

interface Props {
  titulo: string
  secoes: readonly SecaoDeLeitura[]
  /** Privacidade e Termos: o aviso de dados fictícios (TF-09) e o índice "Nesta página". */
  comIndice?: boolean
}

// As três páginas de rascunho jurídico (Privacidade, Termos e Exclusão de conta): só papel, numa
// coluna de leitura, sem campo de cor, aparelho nem ilustração. O aviso de rascunho vem logo depois
// do h1. O índice leva a cada h2 por navegação nova (Link com hash), que rola e leva o foco.
export function PaginaDeLeitura({ titulo, secoes, comIndice = false }: Props) {
  return (
    <PaginaPublica leitura>
      <section className="entrada pb-10 pt-8 @min-[46rem]/publica:pt-12">
        <h1
          tabIndex={-1}
          className="titulo-tela [font-size:clamp(2rem,5vw,2.75rem)] focus:outline-none"
        >
          {titulo}
        </h1>
        <AvisoDeRascunho />
        <div className="mt-4 flex flex-col gap-4">
          <AvisoDeConstrucao />
          {comIndice ? <Paragrafo texto={TF.dadosFicticios} /> : null}
        </div>
        {comIndice ? (
          <nav aria-label={ROTULOS_DE_NAVEGACAO.indice} className="mt-6 border-t pt-3">
            <ul className="@min-[30rem]/publica:columns-2 @min-[30rem]/publica:gap-x-8">
              {secoes.map(({ secao }) => (
                <li key={secao.id} className="break-inside-avoid">
                  <Link to={{ hash: `#${secao.id}` }} className="alvo-toque inline-flex items-center">
                    {secao.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </section>

      {secoes.map(({ secao, blocos }) => (
        <SecaoDePapel key={secao.id} secao={secao} bloco={false}>
          <Blocos blocos={blocos} />
        </SecaoDePapel>
      ))}
    </PaginaPublica>
  )
}
