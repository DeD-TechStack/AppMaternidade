import type { ReactNode, Ref } from 'react'

// As peças da tela Conta no sistema novo (MAT-44d-3): o que a base (`componentes/base/`) não traz
// pronto. A marcação e as classes são as da base (`sb-*`, `t-*`, `grade-10`, `col-*`).

interface SecaoProps {
  /** O `id` do título (`h2`): o destino da âncora do índice. */
  id: string
  titulo: string
  /** A primeira seção fica a 32 px do fio da abertura (16 abaixo de 768); as outras, a 96 px da anterior. */
  primeira?: boolean
  /** A seção de excluir a conta: o título e o botão em urucum. */
  perigo?: boolean
  children: ReactNode
}

/**
 * Uma seção da Conta: uma área útil (filho direto do `<main>`) com o título em c2 (`subtitulo`, 48 px;
 * 36 abaixo de 768, em Instrument Serif) e os blocos da seção. O título leva `tabIndex={-1}` para
 * receber o foco quando a pessoa chega pelo índice ou por `#id`. Só o título é `h2`: os rótulos das
 * linhas são `h3`.
 */
export function SecaoDaConta({ id, titulo, primeira = false, perigo = false, children }: SecaoProps) {
  const classe = ['sb-area', 'conta-secao', primeira ? 'sb-mt-fio-bloco' : '', perigo ? 'conta-excluir' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classe} aria-labelledby={id} data-bloco="">
      <div className="grade-10">
        <div className="col-c2-c8">
          <h2 id={id} tabIndex={-1} className="conta-titulo t-subtitulo alvo-foco">
            {titulo}
          </h2>
        </div>
      </div>
      {children}
    </section>
  )
}

/**
 * Linha rótulo + texto da Conta: a mesma marcação e as mesmas classes de `base/LinhaRotuloTexto.tsx`
 * (`sb-linha`, `sb-linha-rotulo`, `sb-linha-texto`), mais o que a base não tem: o rótulo é `h3` (o
 * `h2` é o título da seção) e a coluna do texto aceita mais que um parágrafo (o botão de moldura
 * dupla, o resumo de erro, a lista de famílias).
 */
export function LinhaDaConta({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grade-10">
      <div className="sb-linha col-c2-c8">
        <h3 className="sb-linha-rotulo t-rotulo">{rotulo}</h3>
        <div className="sb-linha-texto t-corpo conta-linha-texto">{children}</div>
      </div>
    </div>
  )
}

/** Os botões da coluna do texto: a 16 px do texto de cima. */
export function AcaoDaLinha({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="conta-acao">
      {children}
    </div>
  )
}
