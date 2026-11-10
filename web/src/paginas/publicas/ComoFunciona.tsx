import { Apresentacao } from '../../componentes/publicas/Apresentacao.tsx'
import { AberturaPublica, AvisoLateral, LinkLateral } from '../../componentes/publicas/AberturaPublica.tsx'
import { CtaCircular } from '../../componentes/publicas/CtaCircular.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { MidiaLarga, ParDeMidias } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { COMO_FUNCIONA, H1, SUBTITULOS, TF } from '../../conteudo/publicas.ts'

/** Como funciona: três momentos da rotina, com as telas do protótipo. */
export function ComoFunciona() {
  const { primeiraSemana, madrugada, trocaDeTurno, comecar, telas } = COMO_FUNCIONA
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={H1.comoFunciona}
        subtitulo={SUBTITULOS.comoFunciona}
        antes={<AvisoLateral>{TF.telasFicticias}</AvisoLateral>}
        depois={<LinkLateral para={telas.para}>{telas.link}</LinkLateral>}
      />
      <MidiaLarga peca={{ cena: 'mamada', fundo: 'lavanda' }} margem="sb-mt-fio-bloco" />
      <Apresentacao texto={COMO_FUNCIONA.apresentacao} margem="sb-mt-midia-titulo" />
      <LinhaDeLeitura secao={primeiraSemana.secao} blocos={primeiraSemana.textos} margem="sb-mt-par-numeros" />
      <LinhaDeLeitura secao={madrugada.secao} blocos={[madrugada.texto]} />
      <ParDeMidias
        esquerda={{ cena: 'berco', fundo: 'barro' }}
        direita={{ cena: 'colo', fundo: 'lavanda' }}
        margem="sb-mt-midia-linhas"
      />
      <LinhaDeLeitura secao={trocaDeTurno.secao} blocos={[trocaDeTurno.texto]} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={comecar.secao} blocos={comecar.textos} />
      <CtaCircular
        secao={telas.secao}
        texto={telas.texto}
        cta={telas.link}
        destino={telas.para}
        margem="sb-mt-midia-linhas"
      />
      <PaginasDoSite />
    </main>
  )
}
