import { useEffect } from 'react'
import { AberturaCuidado } from '../../componentes/cuidado-casa/AberturaCuidado.tsx'
import { FaixaComCena } from '../../componentes/cuidado-casa/FaixaComCena.tsx'
import { HorasNoTexto } from '../../componentes/cuidado-casa/HorasNoTexto.tsx'
import { PapeisDaFamilia } from '../../componentes/cuidado-casa/PapeisDaFamilia.tsx'
import { FaixaInteira } from '../../componentes/secoes/FaixaInteira.tsx'
import { Fechamento } from '../../componentes/secoes/Fechamento.tsx'
import { PaginaCasa } from '../../componentes/secoes/PaginaCasa.tsx'
import { CUIDADO, DESTINO_CRIAR_CONTA, IMAGENS_CUIDADO } from '../../conteudo/casa/cuidado.ts'
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/**
 * /cuidado-compartilhado, nas seções da casa (CLONE-CUIDADO): a página responde quem vê o quê. Seis faixas, nos chãos
 * papel (a abertura, com a cena, o texto e a tela Família na moldura), areia (os três papéis em uma lista), papel (as
 * mãos, rente à borda direita), cacau (Ícaro com o celular, rente à borda esquerda), papel (o título numa coluna e o
 * texto na outra) e cacau (o fechamento). Todo texto vem de `conteudo/casa/cuidado.ts`; as horas (13:00, 14:40 e
 * 03:00) ganham o tipo dos títulos por `HorasNoTexto`, sem mudar a frase.
 */
export function CuidadoCompartilhado() {
  useTituloDaPagina(NOMES_DE_PAGINA.cuidadoCompartilhado)

  // Nesta página a pílula "Criar conta" do cabeçalho fica quieta (contorno): o gancho é um atributo do <html>, que
  // o CSS da página lê; a casca não muda.
  useEffect(() => {
    document.documentElement.dataset.paginaCuidado = ''
    return () => {
      delete document.documentElement.dataset.paginaCuidado
    }
  }, [])

  return (
    <main>
      <PaginaCasa>
        <AberturaCuidado />

        <FaixaInteira fundo="areia" idTitulo="cc-papeis">
          <PapeisDaFamilia />
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="cc-sono">
          <FaixaComCena cena="cena2" imagem={IMAGENS_CUIDADO.cena2} alt={CUIDADO.alt.cena2}>
            <div className="cc-par">
              <h2 id="cc-sono" className="text-titulo-1 font-titulo cm-sec-titulo">
                {CUIDADO.sono.h2}
              </h2>
              <p className="text-abertura font-texto cm-sec-texto">
                <HorasNoTexto texto={CUIDADO.sono.p} />
              </p>
            </div>
          </FaixaComCena>
        </FaixaInteira>

        <FaixaInteira fundo="cacau" idTitulo="cc-senha">
          <FaixaComCena cena="cena3" imagem={IMAGENS_CUIDADO.cena3} alt={CUIDADO.alt.cena3}>
            <div className="cc-par">
              <h2 id="cc-senha" className="text-titulo-1 font-titulo cm-sec-titulo">
                {CUIDADO.senha.h2}
              </h2>
              <p className="text-corpo font-texto cm-sec-texto">{CUIDADO.senha.p}</p>
            </div>
            {/* A legenda da casa (p[data-legenda], tom noite), com a hora no tipo dos títulos: a peça Legenda do
                pacote só aceita um nó de texto. */}
            <p data-legenda="" data-tom="noite" className="text-abertura font-texto cm-legenda cc-legenda">
              <HorasNoTexto texto={CUIDADO.senha.legenda} />
            </p>
          </FaixaComCena>
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="cc-parar">
          <div className="cc-parar">
            <div className="cc-parar-titulo">
              <h2 id="cc-parar" className="text-titulo-1 font-titulo cm-sec-titulo">
                {CUIDADO.parar.h2}
              </h2>
            </div>
            <div className="cc-par cc-medida">
              <p className="text-corpo font-texto cm-sec-texto">{CUIDADO.parar.p1}</p>
              <p className="text-corpo font-texto cm-sec-texto">{CUIDADO.parar.p2}</p>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="cacau">
          <Fechamento titulo={CUIDADO.fecho.h2} acao={{ rotulo: CUIDADO.fecho.cta2, para: DESTINO_CRIAR_CONTA }} tom="noite" />
        </FaixaInteira>
      </PaginaCasa>
    </main>
  )
}
