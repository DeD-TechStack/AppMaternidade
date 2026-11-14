import { Botao } from '../../componentes/base/Botao.tsx'
import { Coluna, Colunas, Pilha, QuadroLayout, Secao } from '../../componentes/base/layout/index.ts'
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
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/**
 * /cuidado-compartilhado: a abertura (o título, o texto e o primário de um lado; do outro, o painel de
 * mel com a tela Família, o convite com prazo por cima da borda dela e a avó do carrinho; no celular,
 * a avó ocupa o painel e o convite pousa sobre a borda de baixo dele), os três blocos curtos numa
 * lista com fios, a tabela dos papéis, o painel de areia com a tarde da Heloísa (quem fez cada
 * registro, e quando; o cartão aparece em todas as larguras) e o
 * que acontece quando alguém para de cuidar, com a ação para o protótipo e as duas mãos passando o
 * celular. O aviso de demonstração é o do rodapé da casca.
 */
export function CuidadoCompartilhado() {
  useTituloDaPagina(NOMES_DE_PAGINA.cuidadoCompartilhado)
  return (
    <main>
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
          </PainelCampo>
        }
      />

      <Secao>
        <QuadroLayout>
          <Pilha as="ul" vao="bloco" className="pd-regras" data-blocos="">
            {T.blocos.map((bloco) => (
              <li key={bloco.titulo}>
                <Colunas fracoes="7fr 5fr" aPartirDe={900} vao="midia">
                  <Pilha vao="junto" dataH="coluna" className="pd-regra-texto">
                    <h2 className="cm-h3">{bloco.titulo}</h2>
                    <p className="cm-corpo">{bloco.texto}</p>
                  </Pilha>
                  <p className="pd-regra-exemplo" data-h="coluna" data-exemplo="">
                    <span className="pd-avatar" aria-hidden="true">
                      {bloco.exemplo.inicial}
                    </span>
                    <span className="pd-linha-texto">
                      <span className="pd-linha-nome">{bloco.exemplo.quem}</span>
                      <span className="pd-linha-detalhe">{bloco.exemplo.oQue}</span>
                    </span>
                  </p>
                </Colunas>
              </li>
            ))}
          </Pilha>
        </QuadroLayout>
      </Secao>

      <Secao aria-labelledby="cuidado-papeis">
        <Pilha vao="bloco">
          <CabecaDeSecao id="cuidado-papeis" titulo={T.papeis.titulo}>
            <p className="cm-lide">{T.papeis.texto}</p>
          </CabecaDeSecao>
          <QuadroLayout>
            <TabelaTexto
              legenda={T.papeis.tabela.legenda}
              legendaOculta
              colunas={T.papeis.tabela.colunas}
              linhas={T.papeis.tabela.linhas}
              className="pd-painel-papeis"
            />
          </QuadroLayout>
        </Pilha>
      </Secao>

      <Secao variante="painel" painel="areia" classeCaixa="pd-registro">
        <Colunas fracoes="1fr 1fr" aPartirDe={900} vao="midia" alinhar="centro">
          <Pilha vao="bloco" dataH="coluna" className="pd-registro-texto">
            <Pilha vao="junto">
              <h2 className="cm-h3">{T.registro.titulo}</h2>
              <p className="cm-corpo">{T.registro.texto}</p>
            </Pilha>
            <Pilha vao="junto">
              <h2 className="cm-h3">{T.passagem.titulo}</h2>
              <p className="cm-corpo">{T.passagem.texto}</p>
            </Pilha>
          </Pilha>
          <Coluna>
            <CartaoPlano className="pd-registro-cartao">
              <CartaoTarde />
            </CartaoPlano>
          </Coluna>
        </Colunas>
      </Secao>

      <Secao aria-labelledby="cuidado-parar">
        <QuadroLayout>
          <Colunas fracoes="7fr 5fr" aPartirDe={900} vao="midia" alinhar="centro" className="pd-parar">
            <Pilha vao="grupo" dataH="coluna" className="pd-parar-texto">
              <Titulo nivel="h2" id="cuidado-parar" linhas={T.parar.titulo} />
              {T.parar.textos.map((texto) => (
                <p key={texto} className="cm-lide">
                  {texto}
                </p>
              ))}
              <div className="pd-acoes">
                <Botao to={T.primario.destino}>{T.primario.rotulo}</Botao>
              </div>
            </Pilha>
            <Coluna>
              <PainelCampo variante="mel" luz largura="celula" className="pd-parar-painel">
                {/* Eager: um desenho sem tamanho próprio, carregado só ao rolar, deixa o painel de mel vazio
                    (altura 0) até chegar na janela. */}
                <Ilustracao nome="maos-celular" carregamento="eager" />
              </PainelCampo>
            </Coluna>
          </Colunas>
        </QuadroLayout>
      </Secao>
    </main>
  )
}
