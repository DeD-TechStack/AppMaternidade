import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { Botao } from '../../componentes/base/Botao.tsx'
import { PainelCampo } from '../../componentes/campo/PainelCampo.tsx'
import {
  AvisoDeEstado,
  AvisoDeFuso,
  EstadoCarregando,
  EstadoDeErro,
  EstadoDeFusoInvalido,
  EstadoSemBebe,
  EstadoSemFamilia,
} from '../../componentes/desenvolvimento/Avisos.tsx'
import { IdeiasDaFase, ParaLer, TodasAsFases } from '../../componentes/desenvolvimento/Blocos.tsx'
import { SeletorDeBebe } from '../../componentes/desenvolvimento/SeletorDeBebe.tsx'
import { useConteudo } from '../../componentes/desenvolvimento/conteudo.tsx'
import { fasesDaIdade, idadeEmDias, idadeEscrita } from '../../componentes/desenvolvimento/fase.ts'
import { ID_MARCOS, ID_TODAS_AS_FASES, ID_TUMMY_TIME, type ItemDeConteudo } from '../../componentes/desenvolvimento/itens.ts'
import { BlocoTummy } from '../../componentes/desenvolvimento/tummy/BlocoTummy.tsx'
import { useContextoDoBebe, type ContextoDoBebe } from '../../componentes/desenvolvimento/useContextoDoBebe.ts'
import { TituloRotina } from '../../componentes/rotina/TituloRotina.tsx'
import {
  T,
  avisoDeFuso,
  bebeArquivado,
  linhaDaFase,
  linhaDoBebe,
} from '../../conteudo/desenvolvimento/textosLogada.ts'
import { diaDaFamilia, lerAparelho } from '../../dados/rotina.dia.ts'
import { focoDoEstado } from '../../prototipo/foco.ts'
import { useTituloDaTela } from '../../prototipo/useTituloDaTela.ts'
import { ProvedorDaPendencia, usePendencia } from './pendencia.tsx'

/**
 * `/app/desenvolvimento` (MAT-39a): o bebê da tela, a fase dele, as ideias para brincar e os artigos. O bloco
 * de tummy time (MAT-39b) entra no lugar marcado abaixo e liga a pendência da página (`definirPendente`).
 */
export function PaginaDesenvolvimento() {
  return (
    <ProvedorDaPendencia>
      <CorpoDaPagina />
    </ProvedorDaPendencia>
  )
}

type Pronto = Extract<ContextoDoBebe, { fase: 'pronto' }>

export function CorpoDaPagina() {
  const contexto = useContextoDoBebe()
  const { principal, focarTitulo } = useTituloDaTela()
  const location = useLocation()
  const foco = focoDoEstado(location.state)

  // Chegando por navegação interna que pede o título, o foco vai ao `h1`; pela URL não se move.
  useEffect(() => {
    if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])

  return (
    <>
      <main ref={principal} className="pb-12 text-[17px] leading-[25px]" data-tela="desenvolvimento">
        {contexto.fase === 'pronto' ? <ConteudoDoBebe contexto={contexto} /> : <SemBebe contexto={contexto} />}
      </main>
      <AvisoDaTela />
    </>
  )
}

/** Os blocos que não dependem do bebê (DES-09): as fases e os artigos que a publicação deixa ver. */
function useBlocosEstaticos() {
  const conteudo = useConteudo()
  return {
    conteudo,
    todasAsFases: conteudo.visiveis.filter((item) => item.fase),
    artigos: [ID_TUMMY_TIME, ID_MARCOS].flatMap((id) => conteudo.visivel(id) ?? []),
  }
}

/**
 * Fora do estado pronto (carregando, erro, fuso inválido, sem família, sem bebê): o título, o aviso do estado
 * com a ação dele e, depois, "Todas as fases" e "Para ler" sem nenhum dado do bebê (sem idade, fase nem
 * tummy time).
 */
function SemBebe({ contexto }: { contexto: Exclude<ContextoDoBebe, { fase: 'pronto' }> }) {
  const { todasAsFases, artigos } = useBlocosEstaticos()
  return (
    <>
      <TituloRotina titulo={T.titulo} linha={null} />
      {contexto.fase === 'carregando' ? <EstadoCarregando /> : null}
      {contexto.fase === 'erro' ? <EstadoDeErro aoTentarDeNovo={() => void contexto.recarregar()} /> : null}
      {contexto.fase === 'fuso_invalido' ? <EstadoDeFusoInvalido /> : null}
      {contexto.fase === 'sem_familia' ? <EstadoSemFamilia /> : null}
      {contexto.fase === 'sem_bebe' ? <EstadoSemBebe /> : null}
      <div data-blocos-estaticos="" className="cm-area mt-12 flex flex-col gap-12">
        <TodasAsFases fases={todasAsFases} />
        <ParaLer artigos={artigos} />
      </div>
    </>
  )
}

function ConteudoDoBebe({ contexto }: { contexto: Pronto }) {
  const { pendente } = usePendencia()
  const { conteudo, todasAsFases, artigos } = useBlocosEstaticos()
  const { familia, bebe, bebes, papel, agora } = contexto

  const hoje = diaDaFamilia(agora, familia.fuso)
  const dias = idadeEmDias(bebe.nascimento, hoje)
  const nascimentoDepoisDeHoje = dias !== null && dias < 0
  const comIdade = dias !== null && !nascimentoDepoisDeHoje
  const idade = comIdade ? idadeEscrita(bebe.nascimento, hoje) : null

  // A conta da fase usa todos os itens; a tela, só os visíveis (publicação, DES-06).
  const fasesDoBebe = comIdade ? fasesDaIdade(dias, conteudo.todos) : []
  const fasesVisiveis = fasesDoBebe.filter((fase) => conteudo.visivel(fase.id))
  const linhaFase = comIdade ? (fasesDoBebe.length === 0 ? T.semFase : linhaDaFase(fasesVisiveis.map((fase) => fase.titulo))) : null

  // Sem idade (nascimento depois de hoje ou data impossível) não há fase: ficam só as ideias de todas as fases.
  const valemParaTodas = conteudo.visivel(ID_TODAS_AS_FASES)
  const ideias: ItemDeConteudo[] = [...fasesVisiveis, ...(valemParaTodas ? [valemParaTodas] : [])]
  const atuais = new Set(fasesVisiveis.map((fase) => fase.id))

  const aparelho = lerAparelho(agora).fuso
  const arquivado = bebe.estado === 'arquivado'

  return (
    <>
      <TituloRotina
        titulo={T.titulo}
        linha={linhaDoBebe(bebe.nome, idade)}
        lateral={
          bebes.length > 1 ? (
            <SeletorDeBebe bebes={bebes} escolhido={bebe.id} aoEscolher={contexto.escolher} pendente={pendente} />
          ) : null
        }
      />

      {nascimentoDepoisDeHoje ? <AvisoDeEstado dado="nascimento-futuro">{T.nascimentoDepoisDeHoje}</AvisoDeEstado> : null}
      {arquivado ? (
        <AvisoDeEstado dado="arquivado">{bebeArquivado(bebe.nome)}</AvisoDeEstado>
      ) : papel === 'observador' ? (
        <AvisoDeEstado dado="observador">{T.soVer}</AvisoDeEstado>
      ) : null}
      {aparelho !== familia.fuso ? <AvisoDeFuso>{avisoDeFuso(aparelho, familia.fuso)}</AvisoDeFuso> : null}

      <div
        data-grade-do-desenvolvimento=""
        className="cm-area mt-6 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12"
      >
        {linhaFase ? (
          <PainelCampo como="section" aria-labelledby="desenv-fase" largura="celula" className="lg:col-span-7">
            <div className="flex max-w-[34rem] flex-col items-start gap-5">
              <h2 id="desenv-fase" className="cm-h3" data-fase="">
                {linhaFase}
              </h2>
              {ideias.length > 0 ? (
                <Botao href="#ideias" tamanho="app">
                  {T.verIdeias}
                </Botao>
              ) : null}
            </div>
          </PainelCampo>
        ) : null}

        <div className={linhaFase ? 'lg:col-span-5' : 'lg:col-span-12'}>
          <TodasAsFases fases={todasAsFases} atuais={atuais} />
        </div>

        <div key={`${familia.id}:${bebe.id}`} data-lugar-do-tummy="" className="lg:col-span-12 empty:hidden">
          <BlocoTummy bebe={bebe} familia={familia} papel={papel} />
        </div>

        <div className="flex flex-col gap-12 lg:col-span-12">
          <IdeiasDaFase itens={ideias} comAbertura={valemParaTodas !== undefined} nascimentoDepoisDeHoje={nascimentoDepoisDeHoje} />
          <ParaLer artigos={artigos} />
        </div>
      </div>
    </>
  )
}
