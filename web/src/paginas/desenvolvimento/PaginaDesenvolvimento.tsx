import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Coluna, Colunas } from '../../componentes/base/layout/Colunas.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
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
import { TituloDaPagina } from '../../componentes/desenvolvimento/TituloDaPagina.tsx'
import { useConteudo } from '../../componentes/desenvolvimento/conteudo.tsx'
import { fasesDaIdade, idadeEmDias, idadeEscrita } from '../../componentes/desenvolvimento/fase.ts'
import { ID_MARCOS, ID_TODAS_AS_FASES, ID_TUMMY_TIME, type ItemDeConteudo } from '../../componentes/desenvolvimento/itens.ts'
import { BlocoTummy } from '../../componentes/desenvolvimento/tummy/BlocoTummy.tsx'
import { useContextoDoBebe, type ContextoDoBebe } from '../../componentes/desenvolvimento/useContextoDoBebe.ts'
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
  // O contexto do bebê (`useContextoDoBebe`) só se relê a partir da fase de erro. Quando o bloco de tummy time
  // descobre que o vínculo acabou (DES-09, estado 3), a página refaz a leitura inteira: o corpo é remontado,
  // lê as famílias de novo e, ao terminar, leva o foco ao título. A proteção contra laço é por IDENTIDADE do
  // contexto (`familia.id:bebe.id`): a mesma identidade já invalidada não invalida de novo (a releitura não vira
  // laço se o contexto ainda mostrar o bebê), e uma identidade diferente, como a da outra família para onde a
  // página trocou sozinha, invalida outra vez.
  const [leitura, setLeitura] = useState({ numero: 0, focarTitulo: false })
  const ultimaInvalidada = useRef<string | null>(null)
  const aoPerderAcesso = useCallback((identidade: string) => {
    if (ultimaInvalidada.current === identidade) return
    ultimaInvalidada.current = identidade
    setLeitura((anterior) => ({ numero: anterior.numero + 1, focarTitulo: true }))
  }, [])

  return (
    <ProvedorDaPendencia>
      <CorpoDaPagina key={leitura.numero} focarTituloAoCarregar={leitura.focarTitulo} aoPerderAcesso={aoPerderAcesso} />
    </ProvedorDaPendencia>
  )
}

type Pronto = Extract<ContextoDoBebe, { fase: 'pronto' }>

interface PropsDoCorpo {
  /** A página foi remontada porque o vínculo acabou: ao terminar de carregar, o foco vai ao `h1`. */
  focarTituloAoCarregar?: boolean
  /** O bloco perdeu o acesso ao contexto de identidade `familia.id:bebe.id`. */
  aoPerderAcesso?: (identidade: string) => void
}

export function CorpoDaPagina({ focarTituloAoCarregar = false, aoPerderAcesso }: PropsDoCorpo = {}) {
  const contexto = useContextoDoBebe()
  const { principal, focarTitulo } = useTituloDaTela()
  const location = useLocation()
  const foco = focoDoEstado(location.state)
  const focadoAoCarregar = useRef(false)
  const carregando = contexto.fase === 'carregando'

  // Chegando por navegação interna que pede o título, o foco vai ao `h1`; pela URL não se move.
  useEffect(() => {
    if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])

  useEffect(() => {
    if (!focarTituloAoCarregar || carregando || focadoAoCarregar.current) return
    focadoAoCarregar.current = true
    focarTitulo()
  }, [focarTituloAoCarregar, carregando, focarTitulo])

  return (
    <>
      <main ref={principal} className="text-corpo" data-tela="desenvolvimento">
        {contexto.fase === 'pronto' ? (
          <ConteudoDoBebe contexto={contexto} aoPerderAcesso={aoPerderAcesso} />
        ) : (
          <SemBebe contexto={contexto} />
        )}
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
      <Faixa>
        <Pilha vao="grupo">
          <TituloDaPagina titulo={T.titulo} linha={null} />
          {contexto.fase === 'carregando' ? <EstadoCarregando /> : null}
          {contexto.fase === 'erro' ? <EstadoDeErro aoTentarDeNovo={() => void contexto.recarregar()} /> : null}
          {contexto.fase === 'fuso_invalido' ? <EstadoDeFusoInvalido /> : null}
          {contexto.fase === 'sem_familia' ? <EstadoSemFamilia /> : null}
          {contexto.fase === 'sem_bebe' ? <EstadoSemBebe /> : null}
        </Pilha>
      </Faixa>
      <Faixa data-blocos-estaticos="">
        <Pilha vao="bloco">
          <TodasAsFases fases={todasAsFases} />
          <ParaLer artigos={artigos} />
        </Pilha>
      </Faixa>
    </>
  )
}

function ConteudoDoBebe({ contexto, aoPerderAcesso }: { contexto: Pronto; aoPerderAcesso?: (identidade: string) => void }) {
  const { pendente } = usePendencia()
  const { conteudo, todasAsFases, artigos } = useBlocosEstaticos()
  const { familia, bebe, bebes, papel, agora } = contexto
  const identidade = `${familia.id}:${bebe.id}`

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
      <Faixa>
        <Pilha vao="grupo">
          <TituloDaPagina
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
        </Pilha>
      </Faixa>

      <Faixa data-grade-do-desenvolvimento="">
        <Pilha vao="bloco">
          {linhaFase ? (
            // Fase de hoje (7 partes) e "Todas as fases" (5 partes), lado a lado a partir de 1024 px (o `lg` de antes).
            <Colunas fracoes="7fr 5fr" aPartirDe={1024} alinhar="inicio">
              <Cartao as="section" aria-labelledby="desenv-fase" dataH="coluna" className="cm-painel-mel rounded-painel" data-painel="mel">
                <Pilha vao="grupo" className="max-w-leitura items-start">
                  <h2 id="desenv-fase" className="cm-h3 text-titulo-3" data-fase="">
                    {linhaFase}
                  </h2>
                  {ideias.length > 0 ? (
                    <Botao href="#ideias" tamanho="app">
                      {T.verIdeias}
                    </Botao>
                  ) : null}
                </Pilha>
              </Cartao>
              <Coluna>
                <TodasAsFases fases={todasAsFases} atuais={atuais} />
              </Coluna>
            </Colunas>
          ) : (
            <TodasAsFases fases={todasAsFases} atuais={atuais} />
          )}

          <div key={identidade} data-lugar-do-tummy="" className="empty:hidden">
            <BlocoTummy
              bebe={bebe}
              familia={familia}
              papel={papel}
              aoPerderAcesso={aoPerderAcesso ? () => aoPerderAcesso(identidade) : undefined}
            />
          </div>

          <IdeiasDaFase itens={ideias} comAbertura={valemParaTodas !== undefined} nascimentoDepoisDeHoje={nascimentoDepoisDeHoje} />
          <ParaLer artigos={artigos} />
        </Pilha>
      </Faixa>
    </>
  )
}
