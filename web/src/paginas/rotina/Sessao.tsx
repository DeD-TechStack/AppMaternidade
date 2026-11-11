import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ChevronLeft, Info } from 'lucide-react'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { CronometroSessao } from '../../componentes/app/CronometroSessao.tsx'
import { SessoesAnteriores } from '../../componentes/app/SessoesAnteriores.tsx'
import { AvisoDeErro } from '../../componentes/rotina/AvisoDeErro.tsx'
import { ConfirmacaoRotina } from '../../componentes/rotina/ConfirmacaoRotina.tsx'
import type { AcaoDaConfirmacao } from '../../componentes/rotina/contexto.ts'
import { SessoesEmParalelo } from '../../componentes/rotina/SessoesEmParalelo.tsx'
import { TituloRotina } from '../../componentes/rotina/TituloRotina.tsx'
import { useRotina } from '../../componentes/rotina/contexto.ts'
import { useAcoesDaRotina } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { COMUM, ESTADOS, FORMATOS, ROTULO_TIPO, SESSAO, SESSOES } from '../../conteudo/rotina.ts'
import { ATIVIDADE_TUMMY } from '../../conteudo/textos.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { ehUuid } from '../../dados/rotina.uuid.ts'
import { ehTipoDeSessao, podeEscrever, type Lista, type Registro, type TipoSessao } from '../../dados/rotina.tipos.ts'
import { MidiaDaSessao } from '../../prototipo/MidiaDaSessao.tsx'
import { focoDoEstado } from '../../prototipo/foco.ts'
import { ehTipoSessao, type SessaoAnterior } from '../../prototipo/estado.ts'
import { formatarCronometro, formatarHora } from '../../prototipo/formatar.ts'
import { SUBTITULO_SEM_SESSAO, TITULO_SEM_SESSAO } from '../../prototipo/textosSessao.ts'
import { useAgora } from '../../prototipo/useAgora.ts'
import { useTituloDaTela } from '../../prototipo/useTituloDaTela.ts'

const SETE_DIAS = 7 * 24 * 60 * 60_000
const PREFIXO_DO_REGISTRO = 'registro:'

// O caminho de volta, acima do título: leva ao Hoje com o foco no h1 dele.
const VOLTAR_PARA_HOJE = (
  <Link
    to="/app/hoje"
    state={{ foco: 'titulo' }}
    className="alvo-toque -ml-1 mb-3 inline-flex min-h-(--alvo-toque) items-center gap-1.5 rounded-pilula px-1 text-[17px] leading-[25px] font-medium no-underline underline-offset-4 hover:underline"
    data-voltar=""
  >
    <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
    <span>{COMUM.voltarParaHoje}</span>
  </Link>
)

interface Leitura {
  sessao: Registro | null
}

/** O detalhe de uma sessão anterior: a nota, o lado da mamada ou, sem nada disso, o tipo. */
function detalheDaSessao(registro: Registro): string {
  if (registro.nota) return registro.nota
  if (registro.tipo === 'mamada' && registro.detalhes.lado) return FORMATOS.lados[registro.detalhes.lado]
  return ROTULO_TIPO[registro.tipo].toLocaleLowerCase('pt-BR')
}

/**
 * A Sessão (DESIGN.md 4, telas do app): o link de volta, o título "<Sessão> de Heloísa" com a segunda linha
 * em itálico, o cartão do cronômetro (o mesmo sistema do cartão do Hoje, nos dois temas) e as sessões
 * anteriores do mesmo tipo ao lado. `?id=` abre aquela sessão; sem ele, a de início mais recente do bebê
 * ativo. Sem sessão: o título do estado vazio e o desenho da noite (R38-08).
 */
export function Sessao() {
  const rotina = useRotina()
  const { dados, ativo, bebes, escolherBebe, podeAlterar, nomeDoAutor, atualizar, confirmacao, fecharConfirmacao } = rotina
  const acoes = useAcoesDaRotina()
  const navigate = useNavigate()
  const location = useLocation()
  const [parametros] = useSearchParams()
  const agora = useAgora(1000)
  const { principal, focarTitulo } = useTituloDaTela()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<ErroDados | null>(null)
  const [relogioAtrasDe, setRelogioAtrasDe] = useState<string | null>(null)
  const jaIniciouPelaUrl = useRef(false)

  const idDaUrl = parametros.get('id')
  const tipoBruto = parametros.get('tipo')
  const tipoDaUrl: TipoSessao | null = ehTipoSessao(tipoBruto) ? tipoBruto : null
  const idInvalido = idDaUrl !== null && !ehUuid(idDaUrl)
  const bebeAtivoId = ativo?.bebe.id ?? null

  // Com `id`, a leitura é do registro; sem `id`, a das sessões em andamento do bebê ativo.
  const chave = idInvalido ? null : idDaUrl !== null ? `${PREFIXO_DO_REGISTRO}${idDaUrl}` : bebeAtivoId
  const leitura = useSecao<Leitura>(chave, async (qual): Promise<Resultado<Leitura>> => {
    if (qual.startsWith(PREFIXO_DO_REGISTRO)) {
      const lido = await dados.registro(qual.slice(PREFIXO_DO_REGISTRO.length))
      if (!lido.ok) return lido
      const registro = lido.valor
      const emAndamento = registro && registro.excluidoEm === null && ehTipoDeSessao(registro.tipo) && registro.fim === null
      return { ok: true, valor: { sessao: emAndamento ? registro : null } }
    }
    const lidas = await dados.emAndamento(qual)
    if (!lidas.ok) return lidas
    return { ok: true, valor: { sessao: lidas.valor.itens[0] ?? null } }
  })

  const sessao = idInvalido ? null : (leitura.dados?.sessao ?? null)
  const carregando = !idInvalido && leitura.estado === 'carregando'
  const bebeDaSessao = (sessao ? bebes.find((candidato) => candidato.bebe.id === sessao.bebeId) : undefined) ?? ativo

  // Abrir por link uma sessão de outro bebê visível troca o bebê ativo para o dele (R38-03, item 1).
  const bebeDaSessaoId = sessao?.bebeId ?? null
  useEffect(() => {
    if (bebeDaSessaoId !== null && bebeDaSessaoId !== bebeAtivoId && bebes.some((candidato) => candidato.bebe.id === bebeDaSessaoId)) {
      escolherBebe(bebeDaSessaoId)
    }
  }, [bebeDaSessaoId, bebeAtivoId, bebes, escolherBebe])

  // Chegando por navegação interna (atalhos, "Ver sessão"), o foco vai ao h1 da tela, que é o da sessão ou o
  // do estado vazio. Pela URL (inclusive com ?tipo=), o foco não se move.
  const foco = focoDoEstado(location.state)
  const semTitulo = !idInvalido && leitura.estado === 'carregando'
  useEffect(() => {
    // O h1 só existe depois da primeira leitura: o foco espera por ele.
    if (foco === 'titulo' && !semTitulo) focarTitulo()
  }, [foco, location.key, focarTitulo, semTitulo])

  // `?tipo=` só vale uma vez, sem `id` e sem sessão em andamento. Depois de começar, a URL passa a ter o `id`
  // (a entrada do histórico é trocada) e a guarda impede que o StrictMode comece outra sessão.
  const pronto = leitura.estado === 'pronto'
  const semSessaoLida = pronto && leitura.dados?.sessao === null
  const acoesAtuais = useRef(acoes)
  useEffect(() => {
    acoesAtuais.current = acoes
  })
  useEffect(() => {
    if (jaIniciouPelaUrl.current || idDaUrl !== null || tipoDaUrl === null || !semSessaoLida) return
    jaIniciouPelaUrl.current = true
    void acoesAtuais.current.iniciarSessao(tipoDaUrl, { aPartirDaUrl: true })
  }, [idDaUrl, tipoDaUrl, semSessaoLida])

  const iniciandoPelaUrl = idDaUrl === null && tipoDaUrl !== null && (carregando || semSessaoLida)
  const tipoDasAnteriores: TipoSessao = sessao && ehTipoDeSessao(sessao.tipo) ? sessao.tipo : 'sono'
  const bebeDasAnterioresId = bebeDaSessao?.bebe.id ?? null
  const anteriores = useSecao<Lista<Registro>>(
    bebeDasAnterioresId === null ? null : `${bebeDasAnterioresId}|${tipoDasAnteriores}`,
    (qual) => {
      const [bebe, tipo] = qual.split('|')
      const agoraMs = Date.now()
      return dados.sessoesDaJanela(bebe, new Date(agoraMs - SETE_DIAS).toISOString(), new Date(agoraMs).toISOString(), [tipo as TipoSessao])
    },
  )
  const itensAnteriores: SessaoAnterior[] = (anteriores.dados?.itens ?? [])
    .filter((registro) => registro.fim !== null)
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))
    .map((registro) => ({
      inicio: Date.parse(registro.inicio),
      fim: Date.parse(registro.fim as string),
      pessoa: nomeDoAutor(registro.criadoPor, registro.familiaId),
      detalhe: detalheDaSessao(registro),
    }))

  const gravacaoLiberada = bebeDaSessao ? podeEscrever(bebeDaSessao.papel) && !bebeDaSessao.arquivado : false
  const textoDoPapel = bebeDaSessao?.arquivado ? ESTADOS.arquivado : bebeDaSessao?.papel === 'cuidador' ? ESTADOS.cuidador : ESTADOS.observador

  // ---- ações ---------------------------------------------------------------------------------------

  async function encerrar(registro: Registro, nota: string, momento?: number) {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    const resultado = await acoes.encerrar(registro, { nota, momento })
    setOcupado(false)
    if (resultado.ok) {
      // Encerrar tira esta tela do ar: o foco vai ao cartão da sessão do Hoje.
      void navigate('/app/hoje', { state: { foco: 'cartao' } })
    } else if (resultado.relogioAtras) {
      setRelogioAtrasDe(registro.id)
    } else {
      setErro(resultado.erro)
    }
  }

  async function descartar(registro: Registro) {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    const resultado = await acoes.descartar(registro)
    setOcupado(false)
    if (resultado.ok) void navigate('/app/hoje', { state: { foco: 'cartao' } })
    else setErro(resultado.erro)
  }

  // "Manter os dois" e "Fechar" fecham a confirmação; "Excluir este" também e leva ao Hoje, porque a sessão
  // que acabou de começar deixa de existir. "Tentar de novo" fica na tela até dar certo.
  function acionar(acao: AcaoDaConfirmacao) {
    if (acao.chave !== 'tentar_de_novo') fecharConfirmacao()
    acao.executar()
    if (acao.chave === 'excluir_este') void navigate('/app/hoje', { state: { foco: 'titulo' } })
  }

  const avisar = (location.state as { jaEmAndamento?: boolean } | null)?.jaEmAndamento === true

  if (!ativo) return null

  if (sessao && bebeDaSessao && ehTipoDeSessao(sessao.tipo)) {
    const rotulo = ROTULO_TIPO[sessao.tipo]
    const inicio = Date.parse(sessao.inicio)
    const autor = nomeDoAutor(sessao.criadoPor, sessao.familiaId)
    return (
      <>
        {/* O pé de papel é largo: o painel de mel do cronômetro e o painel de mel do rodapé nunca ficam
            quase encostados (DESIGN.md 7, papel entre os painéis). */}
        <main ref={principal} className="pb-24 text-[17px] leading-[25px] lg:pb-32" data-tela="sessao">
          <TituloRotina
            antes={VOLTAR_PARA_HOJE}
            titulo={SESSAO.titulo(rotulo, bebeDaSessao.bebe.nome)}
            linha={SESSOES.iniciadoAs(formatarHora(inicio), autor)}
          />

          {avisar ? (
            <div className="cm-area mt-5">
              <p className="inline-flex items-start gap-2.5 rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">
                <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
                {SESSOES.jaEmAndamento(rotulo)}
              </p>
            </div>
          ) : null}

          {rotina.acessoPerdido ? (
            <div className="cm-area mt-5">
              <p className="rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">{ESTADOS.acessoPerdido}</p>
            </div>
          ) : null}

          {/* A confirmação da rotina também vive aqui: o possível duplicado ao iniciar a sessão. Não some sozinha. */}
          <div className="cm-area mt-5" data-confirmacao-da-sessao="">
            <ConfirmacaoRotina confirmacao={confirmacao} aoAcionar={acionar} />
          </div>

          {/* Em 1440 o painel e o cartão das anteriores terminam na mesma linha (stretch: os dois fundos
              alinhados). O cronômetro ocupa a altura que sobra na coluna dele. */}
          <div className="cm-area mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-12 lg:items-stretch lg:gap-8">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <CronometroSessao
                className="lg:flex-1"
                cronometro={formatarCronometro(agora - inicio)}
                atividade={sessao.tipo === 'tummy' ? ATIVIDADE_TUMMY : undefined}
                acoes={{ encerrar: gravacaoLiberada, descartar: podeAlterar(sessao) }}
                ocupado={ocupado}
                aoEncerrar={(nota) => void encerrar(sessao, nota)}
                aoDescartar={() => void descartar(sessao)}
              />
              {!gravacaoLiberada ? <p className="text-[15px] leading-[22px] text-(--cor-texto-2)">{textoDoPapel}</p> : null}
              {erro ? (
                <AvisoDeErro
                  erro={erro}
                  escrita
                  papel={bebeDaSessao.papel}
                  aoTentarDeNovo={() => {
                    atualizar()
                    void encerrar(sessao, '')
                  }}
                />
              ) : null}
              <SessoesEmParalelo
                sessoes={[sessao]}
                agora={agora}
                autorDe={() => autor}
                podeEncerrar={gravacaoLiberada}
                podeUnir={() => false}
                textoDoPapel={textoDoPapel}
                ocupado={ocupado}
                relogioAtrasDe={relogioAtrasDe}
                aoEncerrar={() => undefined}
                aoEncerrarEm={(registro, momento) => void encerrar(registro, '', momento)}
                aoUnir={() => Promise.resolve({ ok: true, valor: null })}
              />
            </div>
            <SessoesAnteriores className="lg:col-span-5" tipo={sessao.tipo} itens={itensAnteriores} />
          </div>
        </main>

        {/* O aviso honesto de demonstração: fora do <main> e dos cartões, o único da página. */}
        <AvisoDaTela />
      </>
    )
  }

  return (
    <>
      <main ref={principal} className="pb-24 text-[17px] leading-[25px] lg:pb-32" data-tela="sessao" aria-busy={carregando ? 'true' : undefined}>
        {carregando || iniciandoPelaUrl ? (
          <p className="cm-area pt-10">{iniciandoPelaUrl ? null : COMUM.carregando}</p>
        ) : (
          <>
            <TituloRotina antes={VOLTAR_PARA_HOJE} titulo={TITULO_SEM_SESSAO} linha={SUBTITULO_SEM_SESSAO} />
            {leitura.erro ? (
              <div className="cm-area mt-5 max-w-[28rem]">
                <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
              </div>
            ) : null}
            <div className="cm-area mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-8">
              <MidiaDaSessao className="lg:col-span-7" />
              <SessoesAnteriores className="lg:col-span-5" tipo="sono" itens={itensAnteriores} />
            </div>
          </>
        )}
      </main>

      <AvisoDaTela />
    </>
  )
}
