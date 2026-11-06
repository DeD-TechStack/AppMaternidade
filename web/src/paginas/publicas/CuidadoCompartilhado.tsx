import { NotebookDoHoje } from '../../componentes/publicas/Composicoes.tsx'
import {
  Abertura,
  CampoComAparelho,
  CampoDeCor,
  PaginaPublica,
  SecaoDePapel,
  Titulo2,
} from '../../componentes/publicas/Estrutura.tsx'
import { IlustracaoTroca } from '../../componentes/publicas/IlustracaoTroca.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos, Tabela } from '../../componentes/publicas/Textos.tsx'
import { CUIDADO, H1 } from '../../conteudo/publicas.ts'

// Cuidado compartilhado: cada adulto com a própria conta, os três papéis, a autoria de cada registro,
// a passagem de turno e o que acontece quando alguém para de cuidar.
export function CuidadoCompartilhado() {
  const { conta, papeis, registro, passagem, parar } = CUIDADO
  return (
    <PaginaPublica>
      <Abertura titulo={H1.cuidado}>
        <AvisoDeConstrucao />
        <Paragrafo texto={CUIDADO.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <CampoDeCor campo="field-1">
        <div className="grid grid-cols-1 items-end gap-10 @min-[46rem]/publica:grid-cols-12 @min-[46rem]/publica:gap-x-6">
          <div className="flex flex-col gap-5 @min-[46rem]/publica:col-span-6 @min-[46rem]/publica:self-center">
            <Titulo2 secao={conta.secao} className="[font-size:clamp(2rem,4vw,3rem)]" />
            <Paragrafo texto={conta.texto} className="texto-medida text-lg" />
          </div>
          <div className="@min-[46rem]/publica:col-span-6">
            <IlustracaoTroca className="mx-auto block h-auto w-full max-w-[32rem]" />
          </div>
        </div>
      </CampoDeCor>

      <SecaoDePapel secao={papeis.secao}>
        <Paragrafo texto={papeis.texto} />
        <Tabela {...papeis.tabela} />
      </SecaoDePapel>

      <SecaoDePapel secao={registro.secao}>
        <Paragrafo texto={registro.texto} />
      </SecaoDePapel>

      <CampoComAparelho campo="accent" secao={passagem.secao} aparelho={<NotebookDoHoje />}>
        <Paragrafo texto={passagem.texto} className="texto-medida text-lg" />
      </CampoComAparelho>

      <SecaoDePapel secao={parar.secao}>
        <Paragrafos textos={parar.textos} />
      </SecaoDePapel>
    </PaginaPublica>
  )
}
