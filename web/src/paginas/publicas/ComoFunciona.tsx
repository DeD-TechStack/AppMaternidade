import { Botao } from '../../componentes/base/Botao.tsx'
import { Coluna, Colunas, Pilha, QuadroLayout, Secao } from '../../componentes/base/layout/index.ts'
import { CartaoFlutuante } from '../../componentes/campo/CartaoFlutuante.tsx'
import { CenaEstudio } from '../../componentes/campo/CenaEstudio.tsx'
import { Ilustracao } from '../../componentes/campo/Ilustracao.tsx'
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
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { RevelacaoPorBaixo } from '../../movimento/RevelacaoPorBaixo.tsx'
import { useTituloDaPagina } from './useTitulo.ts'

/**
 * /como-funciona: a abertura com a cena de estúdio (sem nada por cima do aparelho), os três momentos
 * da rotina (um painel de campo por passo, com a tela de exemplo de cada um; o convite e a madrugada
 * são cartões girados), o "para começar" e a faixa de cacau que leva ao protótipo, com os números ao
 * lado. O aviso de demonstração é o do rodapé da casca: a página não repete outro.
 */
export function ComoFunciona() {
  useTituloDaPagina(NOMES_DE_PAGINA.comoFunciona)
  return (
    <main>
      <Abertura
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

      <Secao id="tres-momentos" aria-labelledby="como-momentos">
        <Pilha vao="bloco">
          <CabecaDeSecao id="como-momentos" titulo={T.momentos.titulo}>
            <p className="cm-corpo cm-texto-2">{T.momentos.texto}</p>
          </CabecaDeSecao>
          <QuadroLayout>
            <ListaDePassos
              passos={T.passos}
              midias={[
                <div key="primeira-semana" className="pd-passo-um">
                  <div className="pd-chao pd-passo-desenho">
                    <Ilustracao nome="pai-colo" carregamento="eager" />
                  </div>
                  <Pilha vao="grupo" className="pd-pilha">
                    <CartaoFlutuante giro={-2} className="pd-em-fluxo">
                      <CartaoConvite />
                    </CartaoFlutuante>
                    <CartaoPlano>
                      <CartaoPrimeirosRegistros />
                    </CartaoPlano>
                  </Pilha>
                </div>,
                <CartaoFlutuante key="madrugada" giro={2} className="pd-em-fluxo pd-cartao-noite">
                  <CartaoMadrugada />
                </CartaoFlutuante>,
                <CartaoPlano key="troca-de-turno">
                  <CartaoDesdeQueSaiu />
                </CartaoPlano>,
              ]}
            />
          </QuadroLayout>
        </Pilha>
      </Secao>

      <Secao aria-labelledby="como-comecar">
        <QuadroLayout>
          <Colunas fracoes="5fr 7fr" aPartirDe={900} vao="bloco" className="pd-duas">
            <Pilha vao="grupo" dataH="coluna" className="pd-duas-titulo">
              <Titulo nivel="h2" id="como-comecar" linhas={T.comecar.titulo} />
              <p className="cm-lide">{T.comecar.textos[0]}</p>
            </Pilha>
            <Pilha vao="grupo" dataH="coluna" className="pd-duas-texto">
              <p className="cm-lide">{T.comecar.textos[1]}</p>
            </Pilha>
          </Colunas>
        </QuadroLayout>
      </Secao>

      <Secao variante="painel" painel="cacau" classeCaixa="cm-faixa-cacau" aria-labelledby="como-fechamento">
        <RevelacaoPorBaixo variante="M6" className="cm-faixa-conteudo">
          <Colunas fracoes="6fr 5fr" aPartirDe={900} vao="midia" alinhar="centro" className="pd-faixa pd-faixa-com-numeros">
            <Pilha vao="grupo" dataH="coluna" className="pd-faixa-lado">
              <Titulo nivel="h2" id="como-fechamento" linhas={T.fechamento.titulo} />
              <Botao variante="mel" to={T.fechamento.acao.destino}>
                {T.fechamento.acao.rotulo}
              </Botao>
            </Pilha>
            <Coluna>
              <Numeros itens={T.numeros} className="pd-faixa-numeros" />
            </Coluna>
          </Colunas>
        </RevelacaoPorBaixo>
      </Secao>
    </main>
  )
}
