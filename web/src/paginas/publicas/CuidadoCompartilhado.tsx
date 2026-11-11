import { CalendarClock, UserMinus, UserPlus } from 'lucide-react'
import { CartaoFlutuante } from '../../componentes/campo/CartaoFlutuante.tsx'
import { Ilustracao } from '../../componentes/campo/Ilustracao.tsx'
import { PainelCampo } from '../../componentes/campo/PainelCampo.tsx'
import { Titulo } from '../../componentes/campo/Titulo.tsx'
import { Abertura } from '../../componentes/publicas-destaque/Abertura.tsx'
import { CabecaDeSecao } from '../../componentes/publicas-destaque/CabecaDeSecao.tsx'
import {
  CartaoConviteComPrazo,
  CartaoFamilia,
  CartaoNota,
  CartaoSoneca,
} from '../../componentes/publicas-destaque/CartoesApp.tsx'
import { TabelaTexto } from '../../componentes/publicas-destaque/TabelaTexto.tsx'
import { CUIDADO_DESTAQUE as T } from '../../conteudo/publicas-destaque.ts'

const ICONES = [UserPlus, CalendarClock, UserMinus] as const

/**
 * /cuidado-compartilhado: o painel de mel com a tela Família e a avó do carrinho (a composição F1),
 * os três blocos curtos (convite, prazo, revogação), a tabela dos papéis, o painel de areia com quem
 * fez cada registro e a passagem de turno, e o que acontece quando alguém para de cuidar.
 */
export function CuidadoCompartilhado() {
  return (
    <main className="pd-pagina">
      <Abertura
        disposicao="titulo-lide"
        titulo={T.titulo}
        texto={
          <>
            <p className="cm-lide">{T.lide}</p>
            <p className="cm-pequeno pd-aviso" data-aviso="">
              {T.aviso}
            </p>
          </>
        }
      />

      <PainelCampo variante="mel" luz como="figure" aria-label={T.familia.descricao} className="pd-familia">
        <div className="pd-familia-cartoes">
          <CartaoFlutuante giro={-2} className="pd-em-fluxo">
            <CartaoFamilia />
          </CartaoFlutuante>
          <CartaoFlutuante giro={4} className="pd-em-fluxo">
            <CartaoConviteComPrazo />
          </CartaoFlutuante>
        </div>
        <div className="pd-familia-desenho">
          <Ilustracao nome="avo-carrinho" carregamento="eager" />
        </div>
      </PainelCampo>

      <ul className="pd-secao cm-area pd-tres" data-blocos="">
        {T.blocos.map((bloco, i) => {
          const Icone = ICONES[i]
          return (
            <li key={bloco.titulo}>
              <span className="pd-tres-icone" aria-hidden="true">
                <Icone strokeWidth={1.75} />
              </span>
              <h2 className="cm-h4">{bloco.titulo}</h2>
              <p className="cm-corpo">{bloco.texto}</p>
            </li>
          )
        })}
      </ul>

      <section className="pd-secao" aria-labelledby="cuidado-papeis">
        <CabecaDeSecao id="cuidado-papeis" titulo={T.papeis.titulo}>
          <p className="cm-lide">{T.papeis.texto}</p>
        </CabecaDeSecao>
        <TabelaTexto
          legenda={T.papeis.tabela.legenda}
          legendaOculta
          colunas={T.papeis.tabela.colunas}
          linhas={T.papeis.tabela.linhas}
        />
      </section>

      <PainelCampo variante="areia" className="pd-secao pd-registro">
        <div className="pd-registro-texto">
          <div>
            <h2 className="cm-h3">{T.registro.titulo}</h2>
            <p className="cm-lide">{T.registro.texto}</p>
          </div>
          <div>
            <h2 className="cm-h3">{T.passagem.titulo}</h2>
            <p className="cm-lide">{T.passagem.texto}</p>
          </div>
        </div>
        <div className="pd-pilha">
          <CartaoFlutuante giro={-2} className="pd-em-fluxo">
            <CartaoSoneca />
          </CartaoFlutuante>
          <CartaoFlutuante giro={2} className="pd-em-fluxo">
            <CartaoNota />
          </CartaoFlutuante>
        </div>
      </PainelCampo>

      <section className="pd-secao cm-area pd-duas" aria-labelledby="cuidado-parar">
        <Titulo nivel="h2" id="cuidado-parar" linhas={T.parar.titulo} />
        <div className="pd-duas-texto">
          {T.parar.textos.map((texto) => (
            <p key={texto} className="cm-lide">
              {texto}
            </p>
          ))}
        </div>
      </section>
    </main>
  )
}
