import { AberturaPublica, AvisoLateral } from '../../componentes/publicas/AberturaPublica.tsx'
import { IndiceDaPagina } from '../../componentes/publicas/IndiceDaPagina.tsx'
import { LeituraEmLinhas } from '../../componentes/publicas/LeituraEmLinhas.tsx'
import { MidiaLarga } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { H1, SUBTITULOS, TERMOS, TF } from '../../conteudo/publicas.ts'

/** Termos de uso: o que é o site, quem pode usar, conta, família, comunidade e exclusão. */
export function Termos() {
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={H1.termos}
        subtitulo={SUBTITULOS.termos}
        depois={<AvisoLateral>{TF.dadosFicticios}</AvisoLateral>}
      />
      <IndiceDaPagina secoes={TERMOS.map((s) => s.secao)} margem="sb-mt-fio-bloco" />
      <LeituraEmLinhas
        secoes={TERMOS}
        entre={{ depoisDe: 4, bloco: <MidiaLarga peca={{ cena: 'passeio', fundo: 'barro' }} margem="sb-mt-midia-linhas" /> }}
      />
      <PaginasDoSite />
    </main>
  )
}
