import { ApresentacaoComRetrato } from '../../componentes/publicas/ApresentacaoComRetrato.tsx'
import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { ParDeMidias } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { Paragrafo } from '../../componentes/publicas/Textos.tsx'
import { ETIQUETAS_LATERAIS, H1, SOBRE, SUBTITULOS } from '../../conteudo/publicas.ts'

/** Sobre o AppMaternidade: para quem é, o que faz (os 4 pilares), o que não faz e quem faz. */
export function Sobre() {
  const { paraQuem, oQueFaz, oQueNaoFaz, quemFaz } = SOBRE
  return (
    <main className="vp-pagina">
      <AberturaPublica titulo={H1.sobre} subtitulo={SUBTITULOS.sobre} etiquetas={ETIQUETAS_LATERAIS.sobre} />
      <ApresentacaoComRetrato
        texto={SOBRE.apresentacao}
        peca={{ cena: 'passeio', fundo: 'barro' }}
        margem="sb-mt-fio-bloco"
      />
      <LinhaDeLeitura secao={paraQuem.secao} blocos={[paraQuem.texto]} margem="sb-mt-midia-titulo" />
      <LinhaDeLeitura secao={oQueFaz.secao}>
        {oQueFaz.pilares.map(({ rotulo, texto }) => (
          <div key={rotulo} className="vp-bloco">
            <h3>{rotulo}</h3>
            <p>{texto}</p>
          </div>
        ))}
        <Paragrafo texto={oQueFaz.depois} />
      </LinhaDeLeitura>
      <ParDeMidias
        esquerda={{ cena: 'berco', fundo: 'barro' }}
        direita={{ cena: 'tapete', fundo: 'lavanda' }}
        margem="sb-mt-midia-linhas"
      />
      <LinhaDeLeitura secao={oQueNaoFaz.secao} blocos={oQueNaoFaz.textos} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={quemFaz.secao} blocos={quemFaz.textos} />
      <PaginasDoSite />
    </main>
  )
}
