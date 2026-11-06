import { GrupoNotebookECelularDoHoje } from '../../componentes/publicas/Composicoes.tsx'
import {
  Abertura,
  CampoComAparelho,
  CampoComIlustracao,
  PaginaPublica,
  SecaoDePapel,
} from '../../componentes/publicas/Estrutura.tsx'
import { IlustracaoTroca } from '../../componentes/publicas/IlustracaoTroca.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos, Tabela } from '../../componentes/publicas/Textos.tsx'
import { CUIDADO, H1 } from '../../conteudo/publicas.ts'

// Cuidado compartilhado: cada adulto com a própria conta, os três papéis, a autoria de cada registro,
// a passagem de turno e o que acontece quando alguém para de cuidar.
export function CuidadoCompartilhado() {
  const { conta, papeis, registro, passagem, parar } = CUIDADO
  return (
    <PaginaPublica>
      <Abertura titulo={H1.cuidado}>
        <AvisoDeConstrucao />
        <Paragrafo texto={CUIDADO.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <CampoComIlustracao
        campo="field-1"
        secao={conta.secao}
        ilustracao={<IlustracaoTroca className="block h-auto w-full max-w-[20rem]" />}
      >
        <Paragrafo texto={conta.texto} className="texto-medida text-lg" />
      </CampoComIlustracao>

      <SecaoDePapel secao={papeis.secao}>
        <Paragrafo texto={papeis.texto} />
        <Tabela {...papeis.tabela} />
      </SecaoDePapel>

      <SecaoDePapel secao={registro.secao}>
        <Paragrafo texto={registro.texto} />
      </SecaoDePapel>

      <CampoComAparelho
        campo="accent"
        secao={passagem.secao}
        aparelho={<GrupoNotebookECelularDoHoje />}
        alinhamentoDoTexto="base"
      >
        <Paragrafo texto={passagem.texto} className="texto-medida text-lg" />
      </CampoComAparelho>

      <SecaoDePapel secao={parar.secao}>
        <Paragrafos textos={parar.textos} />
      </SecaoDePapel>
    </PaginaPublica>
  )
}
