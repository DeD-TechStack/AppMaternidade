import { Apresentacao } from '../../componentes/publicas/Apresentacao.tsx'
import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { MidiaLarga } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { TabelaDeLeitura } from '../../componentes/publicas/TabelaDeLeitura.tsx'
import { H1, REGRAS, SUBTITULOS } from '../../conteudo/publicas.ts'

/** Regras da comunidade: as regras que valem quando ela abrir, a moderação e os canais de ajuda. */
export function RegrasDaComunidade() {
  const { antes, sete, denunciar, moderacao, ajuda, denuncias } = REGRAS
  return (
    <main className="vp-pagina">
      <AberturaPublica titulo={H1.regras} subtitulo={SUBTITULOS.regras} />
      <Apresentacao texto={REGRAS.apresentacao} margem="sb-mt-fio-bloco" />
      <LinhaDeLeitura secao={antes.secao} blocos={antes.blocos} margem="sb-mt-par-numeros" />
      <LinhaDeLeitura secao={sete.secao} blocos={sete.blocos} />
      <MidiaLarga peca={{ cena: 'mamada', fundo: 'barro' }} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={denunciar.secao} blocos={denunciar.blocos} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={moderacao.secao} blocos={moderacao.blocos} />
      <LinhaDeLeitura
        secao={ajuda.secao}
        blocos={[ajuda.texto]}
        depois={<TabelaDeLeitura {...ajuda.tabela} colunaDeDestaque={1} />}
      />
      <LinhaDeLeitura secao={denuncias.secao} blocos={denuncias.blocos} />
      <PaginasDoSite />
    </main>
  )
}
