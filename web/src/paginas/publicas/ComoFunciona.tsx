import { Link } from 'react-router'
import { CelularDaSessaoDeMadrugada, CelularDoHoje } from '../../componentes/publicas/Composicoes.tsx'
import {
  Abertura,
  CampoComAparelho,
  CampoDeCor,
  PaginaPublica,
  SecaoDePapel,
  Titulo2,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos } from '../../componentes/publicas/Textos.tsx'
import { COMO_FUNCIONA, H1, TF } from '../../conteudo/publicas.ts'
import { IlustracaoMamada } from '../../prototipo/IlustracaoMamada.tsx'
import { IlustracaoPasseio } from '../../prototipo/IlustracaoPasseio.tsx'

// Como funciona: três momentos da rotina (a primeira semana, a madrugada e a troca de turno), com
// as telas do protótipo em miniatura, e o caminho para abrir o protótipo.
export function ComoFunciona() {
  const { primeiraSemana, madrugada, trocaDeTurno, comecar, telas } = COMO_FUNCIONA
  return (
    <PaginaPublica>
      <Abertura
        titulo={H1.comoFunciona}
        abaixoDoTitulo={<Paragrafo texto={TF.telasFicticias} className="texto-medida mt-5 font-semibold" />}
      >
        <AvisoDeConstrucao />
        <Paragrafo texto={COMO_FUNCIONA.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <SecaoDePapel secao={primeiraSemana.secao}>
        <Paragrafos textos={primeiraSemana.textos} />
      </SecaoDePapel>

      <CampoComAparelho campo="field-2" secao={madrugada.secao} aparelho={<CelularDaSessaoDeMadrugada />}>
        <Paragrafo texto={madrugada.texto} className="texto-medida text-lg" />
        <IlustracaoMamada className="mt-4 block h-auto w-full max-w-[22rem]" />
      </CampoComAparelho>

      <CampoComAparelho campo="accent" secao={trocaDeTurno.secao} aparelho={<CelularDoHoje />}>
        <Paragrafo texto={trocaDeTurno.texto} className="texto-medida text-lg" />
      </CampoComAparelho>

      <SecaoDePapel secao={comecar.secao}>
        <Paragrafos textos={comecar.textos} />
      </SecaoDePapel>

      <CampoDeCor campo="field-1" className="text-center">
        <div className="mx-auto flex max-w-[40rem] flex-col items-center gap-6">
          <Titulo2 secao={telas.secao} className="[font-size:clamp(2.25rem,5vw,3.5rem)]" />
          <Paragrafo texto={telas.texto} className="texto-medida text-lg" />
          <Link to={telas.para} className="alvo-toque botao botao-principal">
            {telas.link}
          </Link>
          <IlustracaoPasseio className="mt-6 block h-auto w-[18rem] max-w-full" />
        </div>
      </CampoDeCor>
    </PaginaPublica>
  )
}
