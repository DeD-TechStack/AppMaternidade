import {
  Abertura,
  CampoDeCor,
  PaginaPublica,
  SecaoDePapel,
  Titulo2,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos } from '../../componentes/publicas/Textos.tsx'
import { H1, SOBRE } from '../../conteudo/publicas.ts'
import { IlustracaoBerco } from '../../prototipo/IlustracaoBerco.tsx'

// Sobre o AppMaternidade: para quem é, o que faz (um bloco de linhas, um pilar por linha), o que não
// faz e quem faz.
export function Sobre() {
  const { paraQuem, oQueFaz, oQueNaoFaz, quemFaz } = SOBRE
  return (
    <PaginaPublica>
      <Abertura titulo={H1.sobre}>
        <AvisoDeConstrucao />
        <Paragrafo texto={SOBRE.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <SecaoDePapel secao={paraQuem.secao}>
        <Paragrafo texto={paraQuem.texto} />
      </SecaoDePapel>

      <SecaoDePapel secao={oQueFaz.secao} bloco={false} corpo="">
        <div>
          {oQueFaz.linhas.map((linha) => (
            <div key={linha.rotulo} className="grid grid-cols-1 border-t last:border-b @min-[46rem]/publica:grid-cols-12">
              <h3 className="titulo-linha pt-5 @min-[46rem]/publica:col-span-3 @min-[46rem]/publica:py-6">
                {linha.rotulo}
              </h3>
              <div className="pb-6 pt-2 @min-[46rem]/publica:col-span-9 @min-[46rem]/publica:border-l @min-[46rem]/publica:py-6 @min-[46rem]/publica:pl-6">
                <p className="texto-medida">{linha.texto}</p>
              </div>
            </div>
          ))}
        </div>
        <Paragrafo texto={oQueFaz.depois} className="texto-medida mt-8" />
      </SecaoDePapel>

      <CampoDeCor campo="accent">
        <div className="grid grid-cols-1 items-end gap-10 @min-[46rem]/publica:grid-cols-12 @min-[46rem]/publica:gap-x-6">
          <div className="flex flex-col gap-5 @min-[46rem]/publica:col-span-6 @min-[46rem]/publica:col-start-7 @min-[46rem]/publica:row-start-1 @min-[46rem]/publica:self-center">
            <Titulo2 secao={oQueNaoFaz.secao} className="[font-size:clamp(2rem,4vw,3rem)]" />
            <Paragrafos textos={oQueNaoFaz.textos} />
          </div>
          <div className="@min-[46rem]/publica:col-span-6 @min-[46rem]/publica:col-start-1 @min-[46rem]/publica:row-start-1">
            <IlustracaoBerco className="mx-auto block h-auto w-full max-w-[26rem]" />
          </div>
        </div>
      </CampoDeCor>

      <SecaoDePapel secao={quemFaz.secao}>
        <Paragrafos textos={quemFaz.textos} />
      </SecaoDePapel>
    </PaginaPublica>
  )
}
