import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { ArtigoDeConteudo } from '../../componentes/desenvolvimento/ArtigoDeConteudo.tsx'
import { useConteudo } from '../../componentes/desenvolvimento/conteudo.tsx'
import { useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { T } from '../../conteudo/desenvolvimento/textosLogada.ts'

const VOLTAR = '/app/desenvolvimento'

function Voltar() {
  return (
    <p className="m-0">
      <Link to={VOLTAR} className={LINK_ALVO} data-voltar="">
        {T.voltar}
      </Link>
    </p>
  )
}

function Moldura({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="text-corpo" data-tela="desenvolvimento-item">
        <Faixa>
          <Pilha vao="grupo">{children}</Pilha>
        </Faixa>
      </main>
      <AvisoDaTela />
    </>
  )
}

/**
 * `/app/desenvolvimento/conteudo/<id>` (DES-06): o item inteiro, com o título como `h1`. Um item recolhido (no
 * site de produção) mostra só o título, T-50 e o link de volta; sem aviso de saúde, sem corpo, sem fontes.
 */
export function PaginaItem({ id }: { id: string }) {
  const conteudo = useConteudo()
  const refDoTitulo = useFocoNoTitulo()
  const existente = conteudo.porId(id)
  const visivel = conteudo.visivel(id)

  if (!existente) return <NaoEncontrado />
  if (!visivel) {
    return (
      <Moldura>
        <h1 ref={refDoTitulo} tabIndex={-1} className="cm-h2 text-titulo-1 alvo-foco wrap-anywhere">
          {existente.titulo}
        </h1>
        <p role="status" data-em-revisao="" className="m-0 max-w-[65ch] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium">
          {T.emRevisao}
        </p>
        <Voltar />
      </Moldura>
    )
  }
  return (
    <Moldura>
      <ArtigoDeConteudo item={visivel} nivel="pagina" refDoTitulo={refDoTitulo} />
      <Voltar />
    </Moldura>
  )
}

/** O `id` desconhecido: T-48 como `h1`, o link de volta e nada mais (sem aviso de saúde). */
function NaoEncontrado() {
  const refDoTitulo = useFocoNoTitulo()
  return (
    <Moldura>
      <h1 ref={refDoTitulo} tabIndex={-1} className="cm-h2 text-titulo-1 alvo-foco wrap-anywhere">
        {T.naoEncontrado}
      </h1>
      <Voltar />
    </Moldura>
  )
}

/** A rota com `:id`: lê o parâmetro e entrega ao item. */
export function PaginaItemDaRota() {
  const { id = '' } = useParams()
  return <PaginaItem id={id} />
}
