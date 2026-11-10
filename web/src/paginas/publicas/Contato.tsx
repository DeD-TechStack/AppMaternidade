import { AberturaPublica, AvisoLateral } from '../../componentes/publicas/AberturaPublica.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { MidiaLarga } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { LinkDeEmail, Paragrafo } from '../../componentes/publicas/Textos.tsx'
import { CONTATO_PAGINA, H1, SUBTITULOS, TF } from '../../conteudo/publicas.ts'

/** Contato: o canal único para suporte, privacidade e denúncias, e o aviso de que não atende urgência. */
export function Contato() {
  const { proposito, urgencia } = CONTATO_PAGINA
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={H1.contato}
        subtitulo={SUBTITULOS.contato}
        antes={
          <AvisoLateral>
            {TF.faleConosco} <LinkDeEmail />
          </AvisoLateral>
        }
      />
      <LinhaDeLeitura secao={proposito.secao} blocos={[proposito.texto]} margem="sb-mt-fio-bloco" />
      <MidiaLarga peca={{ cena: 'mamada', fundo: 'lavanda' }} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={urgencia.secao} margem="sb-mt-midia-linhas">
        <Paragrafo texto={urgencia.texto} />
      </LinhaDeLeitura>
      <PaginasDoSite />
    </main>
  )
}
