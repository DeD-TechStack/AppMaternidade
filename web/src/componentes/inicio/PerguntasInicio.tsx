import { Acordeao } from '../campo/Acordeao.tsx'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import './inicio.css'

interface Props {
  id: string
}

/**
 * As perguntas do Início no `Acordeao` da base (DESIGN.md 4): cada pergunta é um botão de verdade num
 * h3, com `aria-expanded` e `aria-controls`, e a resposta é uma região nomeada pela pergunta. Sem
 * números (as perguntas não são uma sequência, DESIGN.md 7). Em volta dele, as marcas da página, pelo
 * inicio.css: o fio de cacau em cima e embaixo, o fio fino entre as linhas, o sinal num círculo e o
 * retrato redondo de areia com a avó (o mesmo dos relatos), que abre a cabeça da seção, em cima do
 * título e na mesma borda dele. A grade é a dos relatos (7 + 5 colunas).
 */
export function PerguntasInicio({ id }: Props) {
  const { titulo, itens } = INICIO.perguntas
  return (
    <section className="cm-area in-secao in-perguntas" aria-labelledby={id}>
      <div className="in-perguntas-cabeca">
        <Ilustracao nome="avo-carrinho" decorativa carregamento="eager" className="in-perguntas-arte" />
        <Titulo nivel="h2" id={id} linhas={titulo} />
      </div>
      <Acordeao itens={itens} className="in-faq" />
    </section>
  )
}
