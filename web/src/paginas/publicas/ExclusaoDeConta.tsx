import { AberturaPublica, AvisoLateral } from '../../componentes/publicas/AberturaPublica.tsx'
import { LeituraEmLinhas } from '../../componentes/publicas/LeituraEmLinhas.tsx'
import { EXCLUSAO, H1, SUBTITULOS, TF } from '../../conteudo/publicas.ts'

/** Exclusão de conta: como pedir, o que vai ser apagado, o que pode ficar guardado e o prazo. Só linhas de texto. */
export function ExclusaoDeConta() {
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={H1.exclusao}
        subtitulo={SUBTITULOS.exclusao}
        depois={<AvisoLateral aviso="rascunho">{TF.rascunho}</AvisoLateral>}
      />
      <LeituraEmLinhas secoes={EXCLUSAO} margem="sb-mt-fio-bloco" />
    </main>
  )
}
