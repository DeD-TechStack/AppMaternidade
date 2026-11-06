import {
  Abertura,
  CampoComIlustracao,
  PaginaPublica,
  SecaoDePapel,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos } from '../../componentes/publicas/Textos.tsx'
import { DESENVOLVIMENTO, H1 } from '../../conteudo/publicas.ts'
import { IlustracaoColo } from '../../prototipo/IlustracaoColo.tsx'
import { IlustracaoTapete } from '../../prototipo/IlustracaoTapete.tsx'

// Desenvolvimento e tummy time: o registro na rotina, sem metas e sem comparação, de onde vem o
// conteúdo e quando procurar um profissional. Os dois campos têm a mesma composição, espelhada: no
// primeiro a figura fica à esquerda; no segundo, à direita.
export function Desenvolvimento() {
  const { rotina, semMetas, conteudo, profissional } = DESENVOLVIMENTO
  const [orientacao, aviso] = profissional.textos
  return (
    <PaginaPublica>
      <Abertura titulo={H1.desenvolvimento}>
        <AvisoDeConstrucao />
        <Paragrafo texto={DESENVOLVIMENTO.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <CampoComIlustracao
        campo="field-1"
        secao={rotina.secao}
        figuraAEsquerda
        ilustracao={<IlustracaoTapete className="block h-auto w-full max-w-[26rem]" />}
      >
        <Paragrafo texto={rotina.texto} className="texto-medida text-lg" />
      </CampoComIlustracao>

      <SecaoDePapel secao={semMetas.secao}>
        <Paragrafos textos={semMetas.textos} />
      </SecaoDePapel>

      <SecaoDePapel secao={conteudo.secao}>
        <Paragrafos textos={conteudo.antes} />
        <p className="texto-medida">
          {conteudo.comSelo.antes}
          <span className="etiqueta rotulo etiqueta-em-linha">{conteudo.comSelo.selo}</span>
          {conteudo.comSelo.depois}
        </p>
        <Paragrafos textos={conteudo.depois} />
      </SecaoDePapel>

      <CampoComIlustracao
        campo="field-2"
        secao={profissional.secao}
        ilustracao={<IlustracaoColo className="block h-auto w-full max-w-[12rem]" />}
      >
        <Paragrafo texto={orientacao} className="texto-medida text-lg" />
        <Paragrafo texto={aviso} className="texto-medida text-lg font-semibold" />
      </CampoComIlustracao>
    </PaginaPublica>
  )
}
