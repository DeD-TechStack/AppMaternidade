import { Apresentacao } from '../../componentes/publicas/Apresentacao.tsx'
import { AberturaPublica } from '../../componentes/publicas/AberturaPublica.tsx'
import { LinhaDeLeitura } from '../../componentes/publicas/LinhaDeLeitura.tsx'
import { MidiaLarga, ParDeMidias } from '../../componentes/publicas/MidiaDePagina.tsx'
import { PaginasDoSite } from '../../componentes/publicas/PaginasDoSite.tsx'
import { TabelaDeLeitura } from '../../componentes/publicas/TabelaDeLeitura.tsx'
import { CUIDADO, ETIQUETAS_LATERAIS, H1, SUBTITULOS } from '../../conteudo/publicas.ts'

/** Cuidado compartilhado: um bebê, vários adultos, cada um com a própria conta e um papel. */
export function CuidadoCompartilhado() {
  const { conta, papeis, registro, passagem, parar } = CUIDADO
  return (
    <main className="vp-pagina">
      <AberturaPublica titulo={H1.cuidado} subtitulo={SUBTITULOS.cuidado} etiquetas={ETIQUETAS_LATERAIS.cuidado} />
      <MidiaLarga peca={{ cena: 'mamada', fundo: 'lavanda' }} margem="sb-mt-fio-bloco" />
      <Apresentacao texto={CUIDADO.apresentacao} margem="sb-mt-midia-titulo" ampla />
      <LinhaDeLeitura secao={conta.secao} blocos={[conta.texto]} margem="sb-mt-par-numeros" />
      <LinhaDeLeitura
        secao={papeis.secao}
        blocos={[papeis.texto]}
        depois={<TabelaDeLeitura {...papeis.tabela} />}
      />
      <ParDeMidias
        esquerda={{ cena: 'passeio', fundo: 'barro' }}
        direita={{ cena: 'colo', fundo: 'lavanda' }}
        margem="sb-mt-midia-linhas"
      />
      <LinhaDeLeitura secao={registro.secao} blocos={[registro.texto]} margem="sb-mt-midia-linhas" />
      <LinhaDeLeitura secao={passagem.secao} blocos={[passagem.texto]} />
      <LinhaDeLeitura secao={parar.secao} blocos={parar.textos} />
      <PaginasDoSite />
    </main>
  )
}
