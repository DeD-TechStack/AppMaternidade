interface Props {
  texto: string
  /** Uma das classes `sb-mt-*`. */
  margem: string
  /**
   * Largura de texto corrido (50,5 rem, 808 px, em c2–c8; até 65 caracteres por linha) em vez dos 40 rem da
   * apresentação curta. A usam as páginas com mídia larga logo acima e o Desenvolvimento.
   */
  ampla?: boolean
}

/**
 * O parágrafo de apresentação de uma página, em `corpo-g` (28/39; 20/28 no celular), em c2–c8. Sem
 * `ampla`, com no máximo 40 rem de largura (cerca de 57 caracteres por linha); com ela, 65ch.
 */
export function Apresentacao({ texto, margem, ampla = false }: Props) {
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <div className="grade-10">
        <div className="col-c2-c8">
          <p className="vp-apresentacao t-corpo-g" data-apresentacao="" data-ampla={ampla ? '' : undefined}>
            {texto}
          </p>
        </div>
      </div>
    </div>
  )
}
