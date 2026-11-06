import {
  Abertura,
  CampoComIlustracao,
  PaginaPublica,
  SecaoDePapel,
} from '../../componentes/publicas/Estrutura.tsx'
import { AvisoDeConstrucao, Paragrafo, Paragrafos } from '../../componentes/publicas/Textos.tsx'
import { H1, SOBRE } from '../../conteudo/publicas.ts'
import { IlustracaoBerco } from '../../prototipo/IlustracaoBerco.tsx'
import { IlustracaoPasseio } from '../../prototipo/IlustracaoPasseio.tsx'

// Sobre o AppMaternidade: papel, campo, papel, campo, papel. "Para quem é" é um campo de lavanda com
// a figura à direita; "O que ele faz" é um bloco de linhas (um pilar por linha) no papel; "O que ele
// não faz" é o campo de urucum, com a figura à esquerda; e "Quem faz" fecha no papel.
export function Sobre() {
  const { paraQuem, oQueFaz, oQueNaoFaz, quemFaz } = SOBRE
  return (
    <PaginaPublica>
      <Abertura titulo={H1.sobre}>
        <AvisoDeConstrucao />
        <Paragrafo texto={SOBRE.apresentacao} className="texto-medida text-xl leading-snug" />
      </Abertura>

      <CampoComIlustracao
        campo="field-2"
        secao={paraQuem.secao}
        ilustracao={<IlustracaoPasseio className="block h-auto w-full max-w-[17rem]" />}
      >
        <Paragrafo texto={paraQuem.texto} className="texto-medida text-lg" />
      </CampoComIlustracao>

      <SecaoDePapel secao={oQueFaz.secao} bloco={false} corpo="">
        <div>
          {oQueFaz.linhas.map((linha) => (
            <div key={linha.rotulo} className="grid grid-cols-1 border-t last:border-b @min-[46rem]/publica:grid-cols-12">
              <h3 className="titulo-linha pt-5 @min-[46rem]/publica:col-span-3 @min-[46rem]/publica:py-6">
                {linha.rotulo}
              </h3>
              <div className="pb-6 pt-2 @min-[46rem]/publica:col-span-9 @min-[46rem]/publica:border-l @min-[46rem]/publica:py-6 @min-[46rem]/publica:pl-6">
                <p className="texto-medida">{linha.texto}</p>
              </div>
            </div>
          ))}
        </div>
        {/* A frase é nota da tabela: na coluna das frases (do 4º ao 12º, com o recuo da linha vertical),
            logo abaixo da última linha, menor que elas e na cor do texto. */}
        <div className="grid grid-cols-1 @min-[46rem]/publica:grid-cols-12">
          <div className="pt-4 @min-[46rem]/publica:col-span-9 @min-[46rem]/publica:col-start-4 @min-[46rem]/publica:pl-6">
            <Paragrafo texto={oQueFaz.depois} className="texto-medida text-[0.9375rem] text-[var(--cor-texto)]" />
          </div>
        </div>
      </SecaoDePapel>

      <CampoComIlustracao
        campo="accent"
        secao={oQueNaoFaz.secao}
        figuraAEsquerda
        ilustracao={<IlustracaoBerco className="block h-auto w-full max-w-[16rem]" />}
      >
        <Paragrafos textos={oQueNaoFaz.textos} />
      </CampoComIlustracao>

      <SecaoDePapel secao={quemFaz.secao}>
        <Paragrafos textos={quemFaz.textos} />
      </SecaoDePapel>
    </PaginaPublica>
  )
}
