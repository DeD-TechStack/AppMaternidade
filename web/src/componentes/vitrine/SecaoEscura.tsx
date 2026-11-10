import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'

interface Props {
  titulo: string
  texto: string
  botao: string
  destino: string
}

/**
 * A seção escura do fim do Início: de borda a borda, fundo da tinta e texto do papel, conteúdo em
 * c3–c9. Vai fora do `main` (irmã dele), encostada no rodapé. Como não está num marco da página,
 * ela própria é uma região nomeada pelo título.
 */
export function SecaoEscura({ titulo, texto, botao, destino }: Props) {
  const idTitulo = useId()
  return (
    <section className="vt-escura" aria-labelledby={idTitulo} data-secao-escura="" data-bloco="">
      <div className="sb-area grade-10">
        <div className="vt-col-c3-c9">
          <h2 id={idTitulo} className="vt-escura-titulo t-display-m">
            {titulo}
          </h2>
          <p className="vt-escura-texto t-corpo">{texto}</p>
          <div className="vt-escura-acao">
            <Botao to={destino} className="alvo-toque">
              {botao}
            </Botao>
          </div>
        </div>
      </div>
    </section>
  )
}
