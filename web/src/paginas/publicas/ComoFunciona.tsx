import { useEffect } from 'react'
import { BandaComecar } from '../../componentes/como-casa/BandaComecar.tsx'
import { BandaDepois } from '../../componentes/como-casa/BandaDepois.tsx'
import { BandaHistorico } from '../../componentes/como-casa/BandaHistorico.tsx'
import { BandaNota } from '../../componentes/como-casa/BandaNota.tsx'
import { ID_DO_TITULO, TextoDoHeroi } from '../../componentes/como-casa/TextoDoHeroi.tsx'
import { useCabecalhoNoite } from '../../componentes/casca/Cabecalho.tsx'
import { CenaHeroi, FaixaInteira, Fechamento, PaginaCasa } from '../../componentes/secoes/index.ts'
import {
  COMO_FUNCIONA as T,
  CENA_HEROI,
  CENA_HEROI_390,
  DESTINO_CRIAR_CONTA,
} from '../../conteudo/casa/comoFunciona.ts'
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/**
 * /como-funciona na casa acesa: um dia contado pelo que ficou anotado. Abre de noite, na mamada das 03:00 (a cena
 * rente a esquerda, o texto na parede de cacau), e cada faixa e uma hora: o Historico emoldurado no papel, a cena das
 * 15:00, a noite das 18:00 sobre o chao de noite, as Notas na areia, os tres passos e o fecho em cacau. As sete
 * partes vem de `secoes/`; o que e so desta pagina fica em `componentes/como-casa/`.
 */
export function ComoFunciona() {
  useTituloDaPagina(NOMES_DE_PAGINA.comoFunciona)
  useCabecalhoNoite()

  // O herói desta página tem o botão "Criar conta" na primeira dobra de 320 (cta1, na parede de cacau): o gancho no
  // <html> deixa o CSS do cabeçalho tirar a pílula "Criar conta" da linha só abaixo de 360, onde ela mal cabe. A
  // casca não muda; o gancho sai com a página.
  useEffect(() => {
    document.documentElement.dataset.paginaComoFunciona = ''
    return () => {
      delete document.documentElement.dataset.paginaComoFunciona
    }
  }, [])

  return (
    <main>
      <PaginaCasa>
        <CenaHeroi
          imagem={CENA_HEROI}
          recorte390={CENA_HEROI_390}
          alt={T.altCena1}
          larguraMax={977}
          parede={{ esquerda: 'cacau', direita: 'cacau' }}
          chao={{ esquerda: 'nenhum', direita: 'nenhum' }}
          costura={1}
          alturaChao={1}
          lado="esquerda"
          idTitulo={ID_DO_TITULO}
        >
          <TextoDoHeroi />
        </CenaHeroi>
        <BandaHistorico />
        <BandaDepois />
        <BandaNota />
        <BandaComecar />
        <FaixaInteira fundo="cacau">
          <Fechamento titulo={T.h2Fecho} acao={{ rotulo: T.cta2, para: DESTINO_CRIAR_CONTA }} tom="noite" />
        </FaixaInteira>
      </PaginaCasa>
    </main>
  )
}
