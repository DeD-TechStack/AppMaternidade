import {
  Abertura,
  CampoDeCor,
  PaginaPublica,
  SecaoDePapel,
  Titulo2,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos } from '../../componentes/publicas/Textos.tsx'
import { DESENVOLVIMENTO, H1 } from '../../conteudo/publicas.ts'
import { IlustracaoColo } from '../../prototipo/IlustracaoColo.tsx'
import { IlustracaoTapete } from '../../prototipo/IlustracaoTapete.tsx'

// Desenvolvimento e tummy time: o registro na rotina, sem metas e sem comparação, de onde vem o
// conteúdo e quando procurar um profissional.
export function Desenvolvimento() {
  const { rotina, semMetas, conteudo, profissional } = DESENVOLVIMENTO
  const [orientacao, aviso] = profissional.textos
  return (
    <PaginaPublica>
      <Abertura titulo={H1.desenvolvimento}>
        <AvisoDeConstrucao />
        <Paragrafo texto={DESENVOLVIMENTO.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <CampoDeCor campo="field-1">
        <div className="grid grid-cols-1 items-end gap-10 @min-[46rem]/publica:grid-cols-12 @min-[46rem]/publica:gap-x-6">
          <div className="flex flex-col gap-5 @min-[46rem]/publica:col-span-6 @min-[46rem]/publica:col-start-7 @min-[46rem]/publica:row-start-1 @min-[46rem]/publica:self-center">
            <Titulo2 secao={rotina.secao} className="[font-size:clamp(2rem,4vw,3rem)]" />
            <Paragrafo texto={rotina.texto} className="texto-medida text-lg" />
          </div>
          <div className="@min-[46rem]/publica:col-span-6 @min-[46rem]/publica:col-start-1 @min-[46rem]/publica:row-start-1">
            <IlustracaoTapete className="mx-auto block h-auto w-full max-w-[34rem]" />
          </div>
        </div>
      </CampoDeCor>

      <SecaoDePapel secao={semMetas.secao}>
        <Paragrafos textos={semMetas.textos} />
      </SecaoDePapel>

      <SecaoDePapel secao={conteudo.secao}>
        <Paragrafos textos={conteudo.antes} />
        <p className="texto-medida">
          {conteudo.comSelo.antes}
          <span className="etiqueta rotulo">{conteudo.comSelo.selo}</span>
          {conteudo.comSelo.depois}
        </p>
        <Paragrafos textos={conteudo.depois} />
      </SecaoDePapel>

      <CampoDeCor campo="field-2" className="text-center">
        <div className="mx-auto flex max-w-[40rem] flex-col items-center gap-5">
          <Titulo2 secao={profissional.secao} className="[font-size:clamp(2rem,4.5vw,3.25rem)]" />
          <Paragrafo texto={orientacao} className="texto-medida text-lg" />
          <Paragrafo texto={aviso} className="texto-medida text-lg font-semibold" />
          <IlustracaoColo className="mt-4 block h-auto w-[14rem] max-w-full" />
        </div>
      </CampoDeCor>
    </PaginaPublica>
  )
}
