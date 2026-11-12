import { Botao } from '../../componentes/base/Botao.tsx'
import { CartaoFlutuante } from '../../componentes/campo/CartaoFlutuante.tsx'
import { Ilustracao } from '../../componentes/campo/Ilustracao.tsx'
import { PainelCampo } from '../../componentes/campo/PainelCampo.tsx'
import { Titulo } from '../../componentes/campo/Titulo.tsx'
import { Abertura } from '../../componentes/publicas-destaque/Abertura.tsx'
import { CabecaDeSecao } from '../../componentes/publicas-destaque/CabecaDeSecao.tsx'
import {
  CartaoConviteComPrazo,
  CartaoFamilia,
  CartaoPlano,
  CartaoTarde,
} from '../../componentes/publicas-destaque/CartoesApp.tsx'
import { TabelaTexto } from '../../componentes/publicas-destaque/TabelaTexto.tsx'
import { CUIDADO_DESTAQUE as T } from '../../conteudo/publicas-destaque.ts'

/**
 * /cuidado-compartilhado: a abertura (o título, o texto e o primário de um lado; do outro, o painel de
 * mel com a tela Família, o convite com prazo por cima da borda dela e a avó do carrinho; no celular,
 * o registro compartilhado num cartão flutuante), os três blocos curtos numa lista com fios, a
 * tabela dos papéis, o painel de areia com a tarde da Heloísa (quem fez cada registro, e quando) e o
 * que acontece quando alguém para de cuidar, com a ação para o protótipo e as duas mãos passando o
 * celular. O aviso de demonstração é o do rodapé da casca.
 */
export function CuidadoCompartilhado() {
  return (
    <main className="pd-pagina">
      <Abertura
        proporcao="meio"
        titulo={T.titulo}
        texto={
          <>
            <p className="cm-lide">{T.lide}</p>
            <div className="pd-acoes">
              <Botao to={T.primario.destino}>{T.primario.rotulo}</Botao>
            </div>
          </>
        }
        midia={
          <PainelCampo variante="mel" luz como="figure" aria-label={T.familia.descricao} className="pd-familia">
            <div className="pd-familia-cena">
              <div className="pd-familia-coluna">
                <CartaoPlano className="pd-familia-tela">
                  <CartaoFamilia />
                </CartaoPlano>
                <CartaoFlutuante giro={2} className="pd-em-fluxo pd-familia-convite">
                  <CartaoConviteComPrazo />
                </CartaoFlutuante>
              </div>
              <div className="pd-chao pd-familia-desenho">
                <Ilustracao nome="avo-carrinho" carregamento="eager" />
              </div>
            </div>
            <CartaoFlutuante giro={-2} className="pd-em-fluxo pd-familia-tarde">
              <CartaoTarde />
            </CartaoFlutuante>
          </PainelCampo>
        }
      />

      <ul className="pd-secao cm-area pd-regras" data-blocos="">
        {T.blocos.map((bloco) => (
          <li key={bloco.titulo}>
            <div className="pd-regra-texto">
              <h2 className="cm-h3">{bloco.titulo}</h2>
              <p className="cm-corpo">{bloco.texto}</p>
            </div>
            <p className="pd-regra-exemplo" data-exemplo="">
              <span className="pd-avatar" aria-hidden="true">
                {bloco.exemplo.inicial}
              </span>
              <span className="pd-linha-texto">
                <span className="pd-linha-nome">{bloco.exemplo.quem}</span>
                <span className="pd-linha-detalhe">{bloco.exemplo.oQue}</span>
              </span>
            </p>
          </li>
        ))}
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
            <p className="cm-corpo">{T.registro.texto}</p>
          </div>
          <div>
            <h2 className="cm-h3">{T.passagem.titulo}</h2>
            <p className="cm-corpo">{T.passagem.texto}</p>
          </div>
        </div>
        <CartaoPlano className="pd-registro-cartao">
          <CartaoTarde />
        </CartaoPlano>
      </PainelCampo>

      <section className="pd-secao cm-area pd-parar" aria-labelledby="cuidado-parar">
        <div className="pd-parar-texto">
          <Titulo nivel="h2" id="cuidado-parar" linhas={T.parar.titulo} />
          {T.parar.textos.map((texto) => (
            <p key={texto} className="cm-lide">
              {texto}
            </p>
          ))}
          <div className="pd-acoes">
            <Botao to={T.primario.destino}>{T.primario.rotulo}</Botao>
          </div>
        </div>
        <PainelCampo variante="mel" luz className="pd-parar-painel">
          <Ilustracao nome="maos-celular" />
        </PainelCampo>
      </section>
    </main>
  )
}
