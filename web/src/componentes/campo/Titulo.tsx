interface Props {
  /** O nível do título no documento. */
  nivel: 'h1' | 'h2' | 'h3'
  /** O tamanho visual: `h1` 84/88, `h2` 56/62, `h3` 36/42 (em 1440). */
  tamanho?: 'h1' | 'h2' | 'h3'
  /** A primeira linha e, quando há, a segunda: a segunda linha é um bloco em prumo, sem itálico. */
  linhas: readonly [string] | readonly [string, string]
  id?: string
  className?: string
}

const CLASSE = { h1: 'cm-h1', h2: 'cm-h2', h3: 'cm-h3' } as const

/**
 * Título em Literata 600 com a segunda linha em um bloco próprio, em prumo (DESIGN.md 3). É texto comum, visível desde a
 * primeira pintura, com a marcação do h1 do Início: a primeira linha, um espaço e a segunda linha em
 * `span.cm-segunda-linha` (o espaço fica fora do span, para o span trazer só a segunda linha). O leitor de tela lê o título inteiro, uma vez.
 */
export function Titulo({ nivel, tamanho = nivel, linhas, id, className }: Props) {
  const Tag = nivel
  return (
    <Tag id={id} className={[CLASSE[tamanho], className].filter(Boolean).join(' ')}>
      {linhas[0]}
      {linhas.length > 1 ? (
        <>
          {' '}
          <span className="cm-segunda-linha">{linhas[1]}</span>
        </>
      ) : null}
    </Tag>
  )
}
