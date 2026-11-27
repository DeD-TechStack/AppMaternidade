import type { SecaoDeLeitura } from '../../conteudo/publicas-texto.ts'
import { Pilha } from '../base/layout/index.ts'
import { BlocoDeLeitura } from './BlocoDeLeitura.tsx'
import { TabelaDeLeitura } from './TabelaDeLeitura.tsx'

/**
 * Uma seção da página: o `h2` (com `id` para o índice e `tabIndex={-1}`, para receber o foco por código)
 * e os blocos de texto, com a tabela no fim quando a seção tem uma.
 */
export function SecaoDeTexto({
  dados, editorial, lede, pilares, destaques,
}: {
  dados: SecaoDeLeitura
  editorial?: boolean
  lede?: boolean
  pilares?: boolean
  destaques?: readonly string[]
}) {
  const { secao, blocos, tabela } = dados
  return (
    <Pilha as="section" vao="pilha" className="pt-secao">
      <h2 id={secao.id} tabIndex={-1} className={editorial ? 'pt-h2 co-h2' : 'pt-h2'}>
        {secao.titulo}
      </h2>
      <Pilha vao="pilha" className={lede ? 'pt-texto co-lede' : 'pt-texto'}>
        {blocos.map((bloco, indice) => (
          <BlocoDeLeitura key={indice} bloco={bloco} pilares={pilares} destaques={destaques} />
        ))}
        {tabela ? <TabelaDeLeitura {...tabela} /> : null}
      </Pilha>
    </Pilha>
  )
}
