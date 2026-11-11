import { Apresentacao } from '../../componentes/publicas/Apresentacao.tsx'
import { AberturaPublica, AvisoLateral, LinkLateral } from '../../componentes/publicas/AberturaPublica.tsx'
import { CtaCircular } from '../../componentes/publicas/CtaCircular.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { contemAparelho, MidiaLarga, ParDeMidias, type Peca } from '../../componentes/publicas/MidiaDePagina.tsx'
import { COMO_FUNCIONA, H1, SUBTITULOS, TF } from '../../conteudo/publicas.ts'

// As mídias da página: a larga do alto e o par do meio. O TF-12 só vale se alguma delas for um aparelho.
const LARGA: Peca = { cena: 'mamada', fundo: 'lavanda' }
const PAR: readonly [Peca, Peca] = [
  { cena: 'berco', fundo: 'barro' },
  { cena: 'colo', fundo: 'lavanda' },
]

/** Como funciona: três momentos da rotina, com as ilustrações de cada um. */
export function ComoFunciona() {
  const { primeiraSemana, madrugada, trocaDeTurno, comecar, telas } = COMO_FUNCIONA
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={H1.comoFunciona}
        subtitulo={SUBTITULOS.comoFunciona}
        antes={contemAparelho([LARGA, ...PAR]) ? <AvisoLateral>{TF.telasFicticias}</AvisoLateral> : undefined}
        depois={<LinkLateral para={telas.para}>{telas.link}</LinkLateral>}
      />
      <MidiaLarga peca={LARGA} margem="sb-mt-fio-bloco" />
      <Apresentacao texto={COMO_FUNCIONA.apresentacao} margem="sb-mt-midia-titulo" ampla />
      <LinhaDeLeitura secao={primeiraSemana.secao} blocos={primeiraSemana.textos} margem="sb-mt-par-numeros" />
      <LinhaDeLeitura secao={madrugada.secao} blocos={[madrugada.texto]} />
      <ParDeMidias esquerda={PAR[0]} direita={PAR[1]} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={trocaDeTurno.secao} blocos={[trocaDeTurno.texto]} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={comecar.secao} blocos={comecar.textos} />
      <CtaCircular
        secao={telas.secao}
        texto={telas.texto}
        cta={telas.link}
        destino={telas.para}
        margem="sb-mt-midia-linhas"
      />
    </main>
  )
}
