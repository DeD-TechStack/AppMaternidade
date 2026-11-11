import { Botao } from '../../componentes/base/Botao.tsx'
import { CartaoFlutuante } from '../../componentes/campo/CartaoFlutuante.tsx'
import { CenaEstudio } from '../../componentes/campo/CenaEstudio.tsx'
import { FaixaCacau } from '../../componentes/campo/FaixaCacau.tsx'
import { Numeros } from '../../componentes/campo/Numeros.tsx'
import { Titulo } from '../../componentes/campo/Titulo.tsx'
import { Abertura } from '../../componentes/publicas-destaque/Abertura.tsx'
import { CabecaDeSecao } from '../../componentes/publicas-destaque/CabecaDeSecao.tsx'
import {
  CartaoConvite,
  CartaoDesdeQueSaiu,
  CartaoMadrugada,
  CartaoPlano,
  CartaoPrimeirosRegistros,
} from '../../componentes/publicas-destaque/CartoesApp.tsx'
import { ListaDePassos } from '../../componentes/publicas-destaque/Passos.tsx'
import { COMO_FUNCIONA_DESTAQUE as T } from '../../conteudo/publicas-destaque.ts'

/**
 * /como-funciona: a abertura com a cena de estúdio (sem nada por cima do aparelho), os três momentos
 * da rotina (um painel de campo por passo, com a tela de exemplo de cada um; só a madrugada flutua),
 * o "para começar" e a faixa de cacau que leva ao protótipo, com os números ao lado. O aviso honesto
 * fica uma vez só, fora das imagens.
 */
export function ComoFunciona() {
  return (
    <main className="pd-pagina">
      <Abertura
        disposicao="lado"
        titulo={T.titulo}
        texto={
          <>
            <p className="cm-lide">{T.lide}</p>
            <div className="pd-acoes">
              <Botao to={T.primario.destino}>{T.primario.rotulo}</Botao>
              <Botao variante="texto" href={T.secundario.destino} className="pd-link">
                {T.secundario.rotulo}
              </Botao>
            </div>
            <p className="cm-pequeno pd-aviso" data-aviso="">
              {T.aviso}
            </p>
          </>
        }
        midia={
          <CenaEstudio
            base={T.cena.base}
            largura={T.cena.largura}
            altura={T.cena.altura}
            alt={T.cena.alt}
            prioritaria
            className="pd-cena-retrato"
          />
        }
      />

      <section id="tres-momentos" className="pd-secao" aria-labelledby="como-momentos">
        <CabecaDeSecao id="como-momentos" titulo={T.momentos.titulo} junta>
          <p className="cm-corpo cm-texto-2">{T.momentos.texto}</p>
        </CabecaDeSecao>
        <ListaDePassos
          passos={T.passos}
          midias={[
            <div key="primeira-semana" className="pd-pilha">
              <CartaoPlano>
                <CartaoConvite />
              </CartaoPlano>
              <CartaoPlano>
                <CartaoPrimeirosRegistros />
              </CartaoPlano>
            </div>,
            <CartaoFlutuante key="madrugada" giro={2} className="pd-em-fluxo pd-cartao-noite">
              <CartaoMadrugada />
            </CartaoFlutuante>,
            <CartaoPlano key="troca-de-turno">
              <CartaoDesdeQueSaiu />
            </CartaoPlano>,
          ]}
        />
      </section>

      <section className="pd-secao cm-area pd-duas" aria-labelledby="como-comecar">
        <Titulo nivel="h2" id="como-comecar" linhas={T.comecar.titulo} />
        <div className="pd-duas-texto">
          {T.comecar.textos.map((texto) => (
            <p key={texto} className="cm-lide">
              {texto}
            </p>
          ))}
        </div>
      </section>

      <div className="pd-secao pd-secao-perto">
        <FaixaCacau brilho aria-labelledby="como-fechamento">
          <div className="pd-faixa pd-faixa-com-numeros">
            <div className="pd-faixa-lado">
              <Titulo nivel="h2" id="como-fechamento" linhas={T.fechamento.titulo} />
              <p className="cm-lide">{T.fechamento.texto}</p>
              <Botao variante="mel" to={T.fechamento.acao.destino}>
                {T.fechamento.acao.rotulo}
              </Botao>
            </div>
            <Numeros itens={T.numeros} className="pd-faixa-numeros" />
          </div>
        </FaixaCacau>
      </div>
    </main>
  )
}
