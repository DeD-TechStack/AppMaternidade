import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ChevronLeft, Info } from 'lucide-react'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { Colunas, Pilha, QuadroLayout, Secao } from '../../componentes/base/layout/index.ts'
import { CronometroSessao } from '../../componentes/app/CronometroSessao.tsx'
import { SessoesAnteriores } from '../../componentes/app/SessoesAnteriores.tsx'
import { AvisoDeErro } from '../../componentes/rotina/AvisoDeErro.tsx'
import { ConfirmacaoRotina } from '../../componentes/rotina/ConfirmacaoRotina.tsx'
import type { AcaoDaConfirmacao } from '../../componentes/rotina/contexto.ts'
import { SessoesEmParalelo } from '../../componentes/rotina/SessoesEmParalelo.tsx'
import { TituloRotina } from '../../componentes/rotina/TituloRotina.tsx'
import { useRotina } from '../../componentes/rotina/contexto.ts'
import { AvisoDeLista } from '../../componentes/rotina/AvisoDeLista.tsx'
import { useAcoesDaRotina, type ResultadoDoDescarte, type ResultadoDoEncerramento } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { COMUM, ESTADOS, FORMATOS, ROTULO_TIPO, SESSAO, SESSOES, TITULOS } from '../../conteudo/rotina.ts'
import { ATIVIDADE_TUMMY } from '../../conteudo/textos.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { ehUuid } from '../../dados/rotina.uuid.ts'
import { ehTipoDeSessao, LIMITES, podeEscrever, type Lista, type Registro, type TipoSessao } from '../../dados/rotina.tipos.ts'
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
    className="alvo-toque -ml-1 inline-flex min-h-(--alvo-toque) items-center gap-1.5 self-start rounded-pilula px-1 text-corpo font-medium no-underline underline-offset-4 hover:underline"
    data-voltar=""
  >
    <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
    <span>{COMUM.voltarParaHoje}</span>
  </Link>
)

interface Leitura {
  sessao: Registro | null
}

interface Pendencia {
  erro: ErroDados
  nota: string
  repetir: () => void
}

type ResultadoDaEscrita = ResultadoDoEncerramento | ResultadoDoDescarte

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
  const { dados, ativo, bebes, escolherBebe, podeAlterar, nomeDoAutor, confirmacao, fecharConfirmacao } = rotina
  const acoes = useAcoesDaRotina()
  const navigate = useNavigate()
  const location = useLocation()
  const [parametros] = useSearchParams()
  const agora = useAgora(1000)
  const { principal, focarTitulo } = useTituloDaTela()
  const [ocupado, setOcupado] = useState(false)
  // Uma escrita que falhou: o erro, o texto da nota (para a pessoa não perdê-lo) e o comando ORIGINAL para
  // `Tentar de novo`. Fica na tela mesmo quando a releitura já mostra a sessão encerrada ou excluída.
  const [pendencia, setPendencia] = useState<Pendencia | null>(null)
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
  const gravacaoLiberada = bebeDaSessao ? podeEscrever(bebeDaSessao.papel) && !bebeDaSessao.arquivado : false

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
  // Quem não pode gravar (observador, bebê arquivado) abre a tela sem que nada seja iniciado: o `?tipo=` é uma
  // ação de criação como o botão da barra.
  useEffect(() => {
    if (jaIniciouPelaUrl.current || idDaUrl !== null || tipoDaUrl === null || !semSessaoLida || !gravacaoLiberada) return
    jaIniciouPelaUrl.current = true
    void acoesAtuais.current.iniciarSessao(tipoDaUrl, { aPartirDaUrl: true })
  }, [idDaUrl, tipoDaUrl, semSessaoLida, gravacaoLiberada])

  const iniciandoPelaUrl = idDaUrl === null && tipoDaUrl !== null && gravacaoLiberada && (carregando || semSessaoLida)
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

  const textoDoPapel = bebeDaSessao?.arquivado ? ESTADOS.arquivado : bebeDaSessao?.papel === 'cuidador' ? ESTADOS.cuidador : ESTADOS.observador

  // ---- ações ---------------------------------------------------------------------------------------

  // Toda escrita da Sessão passa por aqui. Na falha, `Tentar de novo` chama `repetir`, o comando original
  // congelado pela ação (a mesma sessão, o mesmo fim, a mesma nota e o mesmo id da nota), e não um comando
  // novo montado com o relógio de agora. A recuperação fica em `pendencia`, que não depende de a releitura
  // ainda mostrar a sessão.
  async function conduzir(sessaoId: string, nota: string, rodar: () => Promise<ResultadoDaEscrita>) {
    if (ocupado) return
    setOcupado(true)
    setPendencia(null)
    const resultado = await rodar()
    setOcupado(false)
    if (resultado.ok) {
      // Encerrar e descartar tiram esta tela do ar: o foco vai ao cartão da sessão do Hoje.
      void navigate('/app/hoje', { state: { foco: 'cartao' } })
    } else if (resultado.relogioAtras) {
      setRelogioAtrasDe(sessaoId)
    } else {
      const repetir = resultado.repetir
      setPendencia({ erro: resultado.erro, nota, repetir: () => void conduzir(sessaoId, nota, repetir) })
    }
  }

  function encerrar(registro: Registro, nota: string, momento?: number) {
    return conduzir(registro.id, nota, () => acoes.encerrar(registro, { nota, momento }))
  }

  function descartar(registro: Registro) {
    return conduzir(registro.id, '', () => acoes.descartar(registro))
  }

  const avisoDaPendencia = pendencia ? (
    <AvisoDeErro erro={pendencia.erro} escrita papel={ativo?.papel ?? null} aoTentarDeNovo={pendencia.repetir} className="max-w-md">
      {pendencia.nota !== '' ? (
        <p className="w-full rounded-campo bg-(--cor-papel-fundo) px-4 py-3 wrap-anywhere" data-texto-da-nota="">
          {pendencia.nota}
        </p>
      ) : null}
    </AvisoDeErro>
  ) : null

  // As releituras que falharam com dados anteriores na tela: o aviso e `Tentar de novo` ficam junto dos dados,
  // sem desmontar o cartão, o painel da nota nem o texto digitado (R8). A lista que passou do limite diz o N.
  const avisosDasAnteriores =
    anteriores.erro || anteriores.dados?.incompleta ? (
      <Pilha vao="pilha" dataH="coluna" className="lg:col-span-2" data-avisos-das-anteriores="">
        {anteriores.erro ? <AvisoDeErro erro={anteriores.erro} papel={ativo?.papel ?? null} aoTentarDeNovo={anteriores.recarregar} /> : null}
        {anteriores.dados?.incompleta ? <AvisoDeLista limite={LIMITES.sessoesDaJanela} dado="anteriores" /> : null}
      </Pilha>
    ) : null

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
        {/* O pé de papel é largo: a Seção que fecha o <main> tem espaco-secao-ampla embaixo, e o painel de mel do
            cronômetro e o do rodapé nunca ficam quase encostados (DESIGN.md 7, papel entre os painéis). */}
        <main ref={principal} className="text-corpo" data-tela="sessao">
          <Secao>
            <QuadroLayout>
              <Pilha vao="bloco">
                <TituloRotina
                  antes={VOLTAR_PARA_HOJE}
                  titulo={SESSAO.titulo(rotulo, bebeDaSessao.bebe.nome)}
                  linha={SESSOES.iniciadoAs(formatarHora(inicio), autor)}
                />

                {avisar ? (
                  <p className="inline-flex items-start gap-2.5 self-start rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">
                    <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
                    {SESSOES.jaEmAndamento(rotulo)}
                  </p>
                ) : null}

                {rotina.acessoPerdido ? (
                  <p className="self-start rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">{ESTADOS.acessoPerdido}</p>
                ) : null}

                {/* A confirmação da rotina também vive aqui: o possível duplicado ao iniciar a sessão. Não some
                    sozinha. Vazia, fica no DOM e fora do fluxo (sr-only): não ocupa vão da pilha. */}
                <div className={confirmacao ? undefined : 'sr-only'} data-confirmacao-da-sessao="">
                  <ConfirmacaoRotina confirmacao={confirmacao} aoAcionar={acionar} />
                </div>

                {leitura.erro ? (
                  <div className="max-w-md" data-releitura-falhou="">
                    <AvisoDeErro erro={leitura.erro} papel={bebeDaSessao.papel} aoTentarDeNovo={leitura.recarregar} />
                  </div>
                ) : null}

                {/* Em 1440 o painel e o cartão das anteriores terminam na mesma linha (stretch: os dois fundos
                    alinhados). O cronômetro ocupa a altura que sobra na coluna dele. Frações de hoje: 7 e 5 de 12. */}
                <Colunas fracoes="7fr 5fr" aPartirDe={1024} vao="bloco">
                  <Pilha vao="pilha" dataH="coluna">
                    <CronometroSessao
                      className="lg:flex-1"
                      cronometro={formatarCronometro(agora - inicio)}
                      decorridoMs={agora - inicio}
                      atividade={sessao.tipo === 'tummy' ? ATIVIDADE_TUMMY : undefined}
                      acoes={{ encerrar: gravacaoLiberada, descartar: podeAlterar(sessao) }}
                      ocupado={ocupado}
                      aoEncerrar={(nota) => void encerrar(sessao, nota)}
                      aoDescartar={() => void descartar(sessao)}
                    />
                    {!gravacaoLiberada ? <p className="text-pequeno text-(--cor-texto-2)">{textoDoPapel}</p> : null}
                    {avisoDaPendencia}
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
                  </Pilha>
                  <SessoesAnteriores tipo={sessao.tipo} itens={itensAnteriores} />
                  {avisosDasAnteriores}
                </Colunas>
              </Pilha>
            </QuadroLayout>
          </Secao>
        </main>

        {/* O aviso honesto de demonstração: fora do <main> e dos cartões, o único da página. */}
        <AvisoDaTela />
      </>
    )
  }

  // A primeira leitura falhou e não há dado nenhum: não se sabe se há sessão, então o estado vazio (título,
  // subtítulo, anteriores e desenho) seria uma afirmação falsa. Fica só o título da tela, o link de volta, a
  // pendência de uma escrita, se houver, e o erro com "Tentar de novo".
  if (leitura.erro && !leitura.dados && !idInvalido) {
    return (
      <>
        <main ref={principal} className="text-corpo" data-tela="sessao">
          <Secao>
            <QuadroLayout>
              <Pilha vao="bloco">
                <TituloRotina antes={VOLTAR_PARA_HOJE} titulo={TITULOS.sessao} linha={null} />
                <div className="max-w-md">
                  <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
                </div>
                {pendencia ? <div>{avisoDaPendencia}</div> : null}
              </Pilha>
            </QuadroLayout>
          </Secao>
        </main>

        <AvisoDaTela />
      </>
    )
  }

  return (
    <>
      <main ref={principal} className="text-corpo" data-tela="sessao" aria-busy={carregando ? 'true' : undefined}>
        <Secao>
          <QuadroLayout>
            {carregando || iniciandoPelaUrl ? (
              <p>{iniciandoPelaUrl ? null : COMUM.carregando}</p>
            ) : (
              <Pilha vao="bloco">
                <TituloRotina antes={VOLTAR_PARA_HOJE} titulo={TITULO_SEM_SESSAO} linha={SUBTITULO_SEM_SESSAO} />
                {leitura.erro ? (
                  <div className="max-w-md">
                    <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
                  </div>
                ) : null}
                {/* A sessão pode ter acabado de ser encerrada ou descartada, mas a escrita falhou sem resposta: a
                    recuperação (`Tentar de novo` e a nota) continua aqui, mesmo com a releitura já sem a sessão. */}
                {pendencia ? <div>{avisoDaPendencia}</div> : null}
                <Colunas fracoes="7fr 5fr" aPartirDe={1024} alinhar="inicio" vao="bloco">
                  <MidiaDaSessao />
                  <SessoesAnteriores tipo="sono" itens={itensAnteriores} />
                  {avisosDasAnteriores}
                </Colunas>
              </Pilha>
            )}
          </QuadroLayout>
        </Secao>
      </main>

      <AvisoDaTela />
    </>
  )
}
