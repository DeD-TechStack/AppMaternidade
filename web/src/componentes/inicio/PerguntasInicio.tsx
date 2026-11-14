import { Coluna, Colunas } from '../base/layout/Colunas.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'
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
    <Secao className="in-perguntas" aria-labelledby={id}>
      <QuadroLayout>
        {/* Título (7fr) e lista (5fr) a partir de 1100, como os relatos; `bloco` entre as duas colunas. */}
        <Colunas fracoes="7fr 5fr" vao="bloco" aPartirDe={1100} alinhar="inicio">
          <Coluna>
            <Pilha vao="pilha" className="in-perguntas-cabeca">
              <Ilustracao nome="avo-carrinho" decorativa carregamento="eager" className="in-perguntas-arte" />
              <Titulo nivel="h2" id={id} linhas={titulo} />
            </Pilha>
          </Coluna>
          <Coluna>
            <Acordeao itens={itens} className="in-faq" />
          </Coluna>
        </Colunas>
      </QuadroLayout>
    </Secao>
  )
}
