import { useId, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import './inicio.css'

interface Item {
  pergunta: string
  resposta: string
}

function Pergunta({ item }: { item: Item }) {
  const [aberta, setAberta] = useState(false)
  const id = useId()
  const idResposta = `${id}-resposta`
  const idGatilho = `${id}-gatilho`
  const Sinal = aberta ? Minus : Plus
  return (
    <div className="in-faq-item" data-aberta={aberta ? '' : undefined}>
      <h3 className="in-faq-titulo">
        <button
          type="button"
          id={idGatilho}
          className="in-faq-gatilho alvo-toque"
          aria-expanded={aberta}
          aria-controls={idResposta}
          onClick={() => setAberta((atual) => !atual)}
        >
          <span className="in-faq-pergunta">{item.pergunta}</span>
          <span className="in-faq-sinal" aria-hidden="true">
            <Sinal size={20} strokeWidth={2} />
          </span>
        </button>
      </h3>
      <div id={idResposta} role="region" aria-labelledby={idGatilho} className="in-faq-resposta" hidden={!aberta}>
        <p>{item.resposta}</p>
      </div>
    </div>
  )
}

interface Props {
  id: string
}

/**
 * As perguntas do Início: fios de cacau de largura cheia e a marca redonda de mais e menos, sem
 * números (as perguntas não são uma sequência, DESIGN.md 7). A pergunta é um botão de verdade num h3
 * (Enter e Espaço abrem e fecham), com `aria-expanded` e `aria-controls`, e a resposta é uma região
 * nomeada pela pergunta. O desenho da avó é da seção: no largo fica embaixo do título, ao lado da
 * lista; no celular, menor, num retrato redondo entre o título e a lista.
 */
export function PerguntasInicio({ id }: Props) {
  const { titulo, itens } = INICIO.perguntas
  return (
    <section className="cm-area in-secao in-perguntas" aria-labelledby={id}>
      <div className="in-perguntas-cabeca">
        <Titulo nivel="h2" id={id} linhas={titulo} />
        <Ilustracao nome="avo-carrinho" decorativa carregamento="eager" className="in-perguntas-arte" />
      </div>
      <div className="in-faq" data-acordeao="">
        {itens.map((item) => (
          <Pergunta key={item.pergunta} item={item} />
        ))}
      </div>
    </section>
  )
}
