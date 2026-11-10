import { Apresentacao } from '../../componentes/publicas/Apresentacao.tsx'
import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { MidiaLarga, ParDeMidias } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { DESENVOLVIMENTO, H1, SUBTITULOS } from '../../conteudo/publicas.ts'

/** Desenvolvimento e tummy time: o registro de tummy time e de onde vem o conteúdo, sem metas. */
export function Desenvolvimento() {
  const { rotina, semMetas, conteudo, profissional } = DESENVOLVIMENTO
  return (
    <main className="vp-pagina vp-subtitulo-longo">
      <AberturaPublica titulo={H1.desenvolvimento} subtitulo={SUBTITULOS.desenvolvimento} />
      <Apresentacao texto={DESENVOLVIMENTO.apresentacao} margem="sb-mt-fio-bloco" />
      <MidiaLarga peca={{ cena: 'tapete', fundo: 'lavanda' }} margem="sb-mt-midia-titulo" />
      <LinhaDeLeitura secao={rotina.secao} blocos={[rotina.texto]} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={semMetas.secao} blocos={semMetas.textos} />
      <LinhaDeLeitura secao={conteudo.secao} blocos={conteudo.textos} />
      <ParDeMidias
        esquerda={{ cena: 'colo', fundo: 'barro' }}
        direita={{ cena: 'berco', fundo: 'lavanda' }}
        margem="sb-mt-midia-linhas"
      />
      <LinhaDeLeitura secao={profissional.secao} blocos={profissional.textos} margem="sb-mt-midia-linhas" />
      <PaginasDoSite />
    </main>
  )
}
