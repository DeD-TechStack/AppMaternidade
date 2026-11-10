import { AberturaPublica, AvisoLateral } from '../../componentes/publicas/AberturaPublica.tsx'
import { IndiceDaPagina } from '../../componentes/publicas/IndiceDaPagina.tsx'
import { LeituraEmLinhas } from '../../componentes/publicas/LeituraEmLinhas.tsx'
import { MidiaLarga } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { H1, PRIVACIDADE, SUBTITULOS, TF } from '../../conteudo/publicas.ts'

/** Política de privacidade: o que o site vai guardar, para quê, por quanto tempo e quais são os direitos. */
export function Privacidade() {
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={H1.privacidade}
        subtitulo={SUBTITULOS.privacidade}
        depois={<AvisoLateral>{TF.dadosFicticios}</AvisoLateral>}
      />
      <IndiceDaPagina secoes={PRIVACIDADE.map((s) => s.secao)} margem="sb-mt-fio-bloco" />
      <LeituraEmLinhas
        secoes={PRIVACIDADE}
        entre={{ depoisDe: 4, bloco: <MidiaLarga peca={{ cena: 'berco', fundo: 'lavanda' }} margem="sb-mt-midia-linhas" /> }}
      />
      <PaginasDoSite />
    </main>
  )
}
