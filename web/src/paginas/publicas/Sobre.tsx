import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { Apresentacao } from '../../componentes/publicas/Apresentacao.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { MidiaLarga, ParDeMidias } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { Paragrafo } from '../../componentes/publicas/Textos.tsx'
import { ETIQUETAS_LATERAIS, H1, SOBRE, SUBTITULOS } from '../../conteudo/publicas.ts'

/** Sobre o AppMaternidade: para quem é, o que faz (os 4 pilares), o que não faz e quem faz. */
export function Sobre() {
  const { paraQuem, oQueFaz, oQueNaoFaz, quemFaz } = SOBRE
  return (
    <main className="vp-pagina">
      <AberturaPublica titulo={H1.sobre} subtitulo={SUBTITULOS.sobre} etiquetas={ETIQUETAS_LATERAIS.sobre} />
      <ParDeMidias
        esquerda={{ cena: 'passeio', fundo: 'barro' }}
        direita={{ cena: 'berco', fundo: 'lavanda' }}
        margem="sb-mt-fio-bloco"
      />
      <Apresentacao texto={SOBRE.apresentacao} margem="sb-mt-midia-titulo" ampla />
      <LinhaDeLeitura secao={paraQuem.secao} blocos={[paraQuem.texto]} margem="sb-mt-par-numeros" />
      <LinhaDeLeitura secao={oQueFaz.secao}>
        {oQueFaz.pilares.map(({ rotulo, texto }) => (
          <div key={rotulo} className="vp-bloco">
            <h3>{rotulo}</h3>
            <p>{texto}</p>
          </div>
        ))}
        <Paragrafo texto={oQueFaz.depois} />
      </LinhaDeLeitura>
      <MidiaLarga peca={{ cena: 'tapete', fundo: 'lavanda' }} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={oQueNaoFaz.secao} blocos={oQueNaoFaz.textos} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={quemFaz.secao} blocos={quemFaz.textos} />
      <PaginasDoSite />
    </main>
  )
}
