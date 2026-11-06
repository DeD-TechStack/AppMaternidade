import {
  Abertura,
  CampoDeCor,
  PaginaPublica,
  SecaoDePapel,
  Titulo2,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Paragrafo } from '../../componentes/publicas/Textos.tsx'
import { CONTATO_PAGINA, H1 } from '../../conteudo/publicas.ts'

// Contato: o canal ainda não existe (pendência), para que ele vai servir e o que fazer numa urgência.
export function Contato() {
  const { proposito, urgencia } = CONTATO_PAGINA
  return (
    <PaginaPublica>
      <Abertura
        titulo={H1.contato}
        abaixoDoTitulo={<Paragrafo texto={CONTATO_PAGINA.canal} className="texto-medida mt-5 text-xl" />}
      >
        <AvisoDeConstrucao />
      </Abertura>

      <SecaoDePapel secao={proposito.secao}>
        <Paragrafo texto={proposito.texto} />
      </SecaoDePapel>

      <CampoDeCor campo="accent">
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 @min-[46rem]/publica:grid-cols-12">
          <Titulo2
            secao={urgencia.secao}
            className="[font-size:clamp(2rem,4vw,3rem)] @min-[46rem]/publica:col-span-5"
          />
          <div className="@min-[46rem]/publica:col-span-7 @min-[46rem]/publica:self-end">
            <Paragrafo texto={urgencia.texto} className="texto-medida text-xl leading-snug" />
          </div>
        </div>
      </CampoDeCor>
    </PaginaPublica>
  )
}
