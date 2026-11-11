import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { LinkDeEmail, Paragrafo } from '../../componentes/publicas/Textos.tsx'
import { CONTATO_PAGINA, H1, SUBTITULOS } from '../../conteudo/publicas.ts'

/**
 * Contato: o canal primeiro (a linha "E-mail", com o endereço em `corpo-g`, na fonte do corpo), a urgência
 * logo depois, depois para que serve o canal. Sem mídia: a página é um canal e um aviso. A lista das
 * páginas é a do rodapé.
 */
export function Contato() {
  const { canal, urgencia, proposito } = CONTATO_PAGINA
  return (
    <main className="vp-pagina">
      <AberturaPublica titulo={H1.contato} subtitulo={SUBTITULOS.contato} />
      <LinhaDeLeitura secao={canal.secao} margem="sb-mt-fio-bloco">
        <p className="vp-bloco vp-canal t-corpo-g">
          <LinkDeEmail />
        </p>
      </LinhaDeLeitura>
      <LinhaDeLeitura secao={urgencia.secao}>
        <Paragrafo texto={urgencia.texto} />
      </LinhaDeLeitura>
      <LinhaDeLeitura secao={proposito.secao} blocos={[proposito.texto]} />
    </main>
  )
}
