import type { SecaoDeLeitura } from '../../conteudo/publicas-texto.ts'
import { BlocoDeLeitura } from './BlocoDeLeitura.tsx'
import { TabelaDeLeitura } from './TabelaDeLeitura.tsx'

/**
 * Uma seção da página: o `h2` (com `id` para o índice e `tabIndex={-1}`, para receber o foco por código)
 * e os blocos de texto, com a tabela no fim quando a seção tem uma.
 */
export function SecaoDeTexto({ dados }: { dados: SecaoDeLeitura }) {
  const { secao, blocos, tabela } = dados
  return (
    <section className="pt-secao">
      <h2 id={secao.id} tabIndex={-1} className="pt-h2">
        {secao.titulo}
      </h2>
      <div className="pt-texto">
        {blocos.map((bloco, indice) => (
          <BlocoDeLeitura key={indice} bloco={bloco} />
        ))}
        {tabela ? <TabelaDeLeitura {...tabela} /> : null}
      </div>
    </section>
  )
}
