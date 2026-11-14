import { useId } from 'react'
import { Pilha } from '../base/layout/Pilha.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { CartaoFlutuante } from '../campo/CartaoFlutuante.tsx'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import { RevelaNaRolagem } from '../../movimento/RevelaNaRolagem.tsx'
import './inicio.css'

// A cor de cada avatar (só tokens): mel, oliva e areia, na ordem da lista.
const TONS = ['mel', 'oliva', 'areia'] as const

/**
 * A troca de turno: o painel de mel com o texto à esquerda e, à direita, as duas mãos passando o
 * celular. O cartão "Desde que você saiu" é HTML de verdade (a lista do app, com avatar, nome e
 * hora): fica na coluna do desenho, embaixo dele (um nunca cobre o outro), e sobra da borda de baixo
 * do painel.
 */
export function SecaoTurno() {
  const id = useId()
  const { titulo, texto, cartao } = INICIO.turno

  return (
    <Secao
      variante="painel"
      painel="mel"
      luz
      aria-labelledby={id}
      className="in-turno"
      classeCaixa="in-turno-caixa cm-com-flutuante"
    >
      {/* Duas metades a partir de 960 (o ponto de quebra de hoje, em inicio.css), `midia` entre elas. */}
      <div className="in-turno-grade">
        <Pilha vao="pilha" className="in-turno-texto">
          <Titulo nivel="h2" id={id} linhas={titulo} />
          <p className="cm-lide">{texto}</p>
        </Pilha>
        <Pilha vao="pilha" className="in-turno-arte">
          <RevelaNaRolagem className="in-revela">
            <Ilustracao nome="maos-celular" decorativa />
          </RevelaNaRolagem>
          <CartaoFlutuante giro={2} posicao="baixo-direita">
            <h3 className="in-cartao-titulo">{cartao.titulo}</h3>
            <ul className="in-cartao-lista" data-desde-que-saiu="">
              {cartao.itens.map((item, i) => (
                <li key={item.hora} className="in-cartao-item">
                  <span className="in-avatar" data-tom={TONS[i % TONS.length]} aria-hidden="true">
                    {item.pessoa.charAt(0)}
                  </span>
                  <span>
                    <span className="in-cartao-evento">{item.texto}</span>
                    <span className="in-cartao-quem">{item.pessoa}</span>
                  </span>
                  <time className="in-cartao-hora" dateTime={item.hora}>
                    {item.hora}
                  </time>
                </li>
              ))}
            </ul>
          </CartaoFlutuante>
        </Pilha>
      </div>
    </Secao>
  )
}
