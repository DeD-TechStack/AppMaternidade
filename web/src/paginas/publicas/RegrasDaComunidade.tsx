import {
  Abertura,
  CampoDeCor,
  PaginaPublica,
  SecaoDePapel,
  Titulo2,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Blocos, Paragrafo, Tabela } from '../../componentes/publicas/Textos.tsx'
import { H1, REGRAS } from '../../conteudo/publicas.ts'

// Regras da comunidade: as sete regras, como denunciar, bloquear e silenciar, como a moderação
// trabalha e os canais oficiais de ajuda. A comunidade ainda não abriu.
export function RegrasDaComunidade() {
  const { secoes, ajuda, denuncias } = REGRAS
  return (
    <PaginaPublica>
      <Abertura titulo={H1.regras}>
        <AvisoDeConstrucao />
        <Paragrafo texto={REGRAS.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      {secoes.map(({ secao, blocos }) => (
        <SecaoDePapel key={secao.id} secao={secao}>
          <Blocos blocos={blocos} />
        </SecaoDePapel>
      ))}

      <SecaoDePapel secao={ajuda.secao}>
        <Paragrafo texto={ajuda.texto} />
        <Tabela {...ajuda.tabela} />
      </SecaoDePapel>

      <CampoDeCor campo="field-2">
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 @min-[46rem]/publica:grid-cols-12">
          <Titulo2
            secao={denuncias.secao}
            className="[font-size:clamp(2rem,4vw,3rem)] @min-[46rem]/publica:col-span-5"
          />
          <div className="flex flex-col gap-4 @min-[46rem]/publica:col-span-7 @min-[46rem]/publica:self-end">
            <Paragrafo texto={denuncias.texto} className="texto-medida text-lg" />
            <Paragrafo texto={denuncias.canal} className="texto-medida text-lg" />
          </div>
        </div>
      </CampoDeCor>
    </PaginaPublica>
  )
}
