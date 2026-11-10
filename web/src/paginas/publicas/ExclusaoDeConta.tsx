import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { LeituraEmLinhas } from '../../componentes/publicas/LeituraEmLinhas.tsx'
import { MidiaLarga } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { EXCLUSAO, H1, SUBTITULOS } from '../../conteudo/publicas.ts'

/** Exclusão de conta: como pedir, o que vai ser apagado, o que pode ficar guardado e o prazo. */
export function ExclusaoDeConta() {
  return (
    <main className="vp-pagina">
      <AberturaPublica titulo={H1.exclusao} subtitulo={SUBTITULOS.exclusao} />
      <LeituraEmLinhas
        secoes={EXCLUSAO}
        margem="sb-mt-fio-bloco"
        entre={{ depoisDe: 2, bloco: <MidiaLarga peca={{ cena: 'tapete', fundo: 'lavanda' }} margem="sb-mt-midia-linhas" /> }}
      />
      <PaginasDoSite />
    </main>
  )
}
