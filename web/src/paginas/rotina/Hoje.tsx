import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Info, RefreshCw } from 'lucide-react'
import { AvisoDaTela } from '../../componentes/app/AvisoDaTela.tsx'
import { BotaoIniciarMamada } from '../../componentes/app/BotaoIniciarMamada.tsx'
import { CartaoSessao } from '../../componentes/app/CartaoSessao.tsx'
import { ResumoDoDia } from '../../componentes/app/ResumoDoDia.tsx'
import { PerguntaSessaoCurta, sessaoCurta } from '../../componentes/app/PerguntaSessaoCurta.tsx'
import { ALVO_APP } from '../../componentes/app/alvo.ts'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Etiqueta } from '../../componentes/base/Etiqueta.tsx'
import { AvisoDeErro } from '../../componentes/rotina/AvisoDeErro.tsx'
import { AvisoDeFuso } from '../../componentes/rotina/AvisoDeFuso.tsx'
import { AvisoDeLista } from '../../componentes/rotina/AvisoDeLista.tsx'
import { BarraRegistroRapido, type BotaoRapido, type ItemDoMais } from '../../componentes/rotina/BarraRegistroRapido.tsx'
import { DesdeUltimoRegistro, ParaVoceSaber } from '../../componentes/rotina/BlocosDoHoje.tsx'
import { SecaoDoHoje } from '../../componentes/rotina/SecaoDoHoje.tsx'
import { SeletorBebe } from '../../componentes/rotina/SeletorBebe.tsx'
import { SessoesEmParalelo } from '../../componentes/rotina/SessoesEmParalelo.tsx'
import { TituloRotina } from '../../componentes/rotina/TituloRotina.tsx'
import { UltimosDoHoje, type ItemDosUltimos } from '../../componentes/rotina/UltimosDoHoje.tsx'
import { type AcaoDaConfirmacao, type BebeAtivo, useRotina } from '../../componentes/rotina/contexto.ts'
import { formatarQuando, maisNovoPrimeiro, momentoDoRegistro } from '../../componentes/rotina/formatos.ts'
import { useMadrugada } from '../../componentes/rotina/madrugada.ts'
import { totaisDoDia } from '../../componentes/rotina/totaisDoDia.ts'
import { useAcoesDaRotina, type ResultadoDoEncerramento } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { LinkDaRotina } from '../../componentes/rotina/LinkDaRotina.tsx'
import { ORIGEM_HOJE } from '../../componentes/rotina/origemDasNotas.ts'
import { COMUM, ESTADOS, HOJE, LIGACOES, ROTULO_TIPO, SEM_RESULTADO, TITULOS, TOTAIS } from '../../conteudo/rotina.ts'
import type { Resultado } from '../../dados/comum.ts'
import { diaDaFamilia, formatarIdade, janelaDoDia, lerAparelho } from '../../dados/rotina.dia.ts'
import { LIMITES, podeEscrever, type Lista, type Registro } from '../../dados/rotina.tipos.ts'
import { focoDoEstado } from '../../prototipo/foco.ts'
import { formatarHora, formatarUltimo } from '../../prototipo/formatar.ts'
import { useAgora } from '../../prototipo/useAgora.ts'
import { useTituloDaTela } from '../../prototipo/useTituloDaTela.ts'

const UM_SEGUNDO = 1000

// "Quarta-feira, 11 de novembro": a data do dia, ao lado do título em telas largas.
function dataPorExtenso(instante: number): string {
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(instante)
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

// Em 1440 o bloco "Últimos" é uma grade de 3 colunas: o primeiro item de cada linha (o 1º e o 4º) não leva fio
// vertical nem recuo à esquerda. O componente da base só trata o 1º item (o 4º ganhava um fio solto).
const REGRA_DAS_LINHAS_DE_ULTIMOS =
  'lg:[&_.sb-numeros-item:nth-child(3n+1)]:border-l-0 lg:[&_.sb-numeros-item:nth-child(3n+1)]:pl-0'

const formatarSono = (minutos: number) => HOJE.umaHoraEMinutos(Math.floor(minutos / 60), minutos % 60)

interface DoDia {
  registros: Lista<Registro>
  sessoes: Lista<Registro>
}

/**
 * O Hoje (DESIGN.md 4, telas do app) com os dados do banco: o título com o bebê ativo em itálico, o cartão
 * de mel da sessão em andamento, "Para você saber", "Desde o seu último registro", os números do dia e
 * "Últimos"; a barra Registrar fica fora do <main>, fixa embaixo. Cada seção tem a própria leitura e o
 * próprio erro (R38-11). Na madrugada, um botão redondo de mel "Iniciar mamada" entra logo depois do cartão.
 */
export function Hoje() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <HojeDoBebe ativo={ativo} />
}

function HojeDoBebe({ ativo }: { ativo: BebeAtivo }) {
  const rotina = useRotina()
  const { dados, contaId, atualizar, confirmacao, fecharConfirmacao, bebes, escolherBebe, acessoPerdido } = rotina
  const acoes = useAcoesDaRotina()
  const navigate = useNavigate()
  const location = useLocation()
  const agora = useAgora(UM_SEGUNDO)
  const { madrugada } = useMadrugada()
  const { principal, focarTitulo } = useTituloDaTela()
  const cartao = useRef<HTMLElement>(null)
  const primeiroBotao = useRef<HTMLButtonElement>(null)
  const ultimoToque = useRef(new Map<BotaoRapido, number>())
  const [ocupados, setOcupados] = useState<ReadonlySet<BotaoRapido>>(new Set())
  const [encerrando, setEncerrando] = useState(false)
  const [relogioAtrasDe, setRelogioAtrasDe] = useState<string | null>(null)
  // A sessão do cartão cuja pergunta de "menos de 1 minuto" está aberta (QA-10).
  const [curtaDe, setCurtaDe] = useState<string | null>(null)

  const bebeId = ativo.bebe.id
  const familiaId = ativo.familia.id
  const fuso = ativo.familia.fuso
  const nome = ativo.bebe.nome
  const aparelho = lerAparelho(agora).fuso

  const emAndamento = useSecao(bebeId, (bebe) => dados.emAndamento(bebe))
  const ultimos = useSecao(bebeId, (bebe) => dados.ultimosConcluidos(bebe))
  const desde = useSecao(bebeId, (bebe) => dados.desdeMeuUltimo(bebe, contaId))
  const notas = useSecao(bebeId, (bebe) => dados.notas(familiaId, bebe))
  const dia = useSecao<DoDia>(bebeId, async (bebe): Promise<Resultado<DoDia>> => {
    const hoje = diaDaFamilia(Date.now(), fuso)
    const { de, ate } = janelaDoDia(hoje, fuso)
    const [registros, sessoes] = await Promise.all([dados.doDia(bebe, hoje), dados.sessoesDaJanela(bebe, de, ate)])
    if (!registros.ok) return registros
    if (!sessoes.ok) return sessoes
    return { ok: true, valor: { registros: registros.valor, sessoes: sessoes.valor } }
  })

  // Chegando por navegação interna, o foco vai ao alvo que a origem pediu; pela URL, não se move.
  const foco = focoDoEstado(location.state)
  const cartaoPronto = emAndamento.estado !== 'carregando'
  useEffect(() => {
    if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])
  // O cartão "Em andamento" é trocado quando a primeira leitura termina: o foco espera pelo definitivo.
  useEffect(() => {
    if (foco === 'cartao' && cartaoPronto) cartao.current?.focus()
  }, [foco, location.key, cartaoPronto])

  const sessoes = emAndamento.dados?.itens ?? []
  const principalSessao = sessoes[0] ?? null
  const gravacaoLiberada = podeEscrever(ativo.papel) && !ativo.arquivado
  const textoNoLugarDosBotoes = ativo.arquivado ? ESTADOS.arquivado : ativo.papel === 'observador' ? ESTADOS.observador : null
  const textoDoPapel = ativo.papel === 'cuidador' ? ESTADOS.cuidador : ESTADOS.observador

  const idade = formatarIdade(ativo.bebe.nascimento, diaDaFamilia(agora, fuso))
  const linha = bebes.length > 1 ? (
    <SeletorBebe
      ativo={ativo}
      bebes={bebes}
      agora={agora}
      aoEscolher={(id) => {
        escolherBebe(id)
        focarTitulo()
      }}
    />
  ) : (
    HOJE.linhaDoBebe(nome, idade)
  )

  // ---- registro rápido ---------------------------------------------------------------------------

  /** O toque só grava se o botão não está ocupado e se o último toque nele foi há mais de 1 segundo. */
  function liberarToque(botao: BotaoRapido): boolean {
    if (ocupados.has(botao)) return false
    const agoraMs = Date.now()
    const ultimo = ultimoToque.current.get(botao)
    if (ultimo !== undefined && agoraMs - ultimo < UM_SEGUNDO) return false
    ultimoToque.current.set(botao, agoraMs)
    return true
  }

  async function comBotaoOcupado(botao: BotaoRapido, tarefa: () => Promise<void>) {
    setOcupados((anteriores) => new Set(anteriores).add(botao))
    try {
      await tarefa()
    } finally {
      setOcupados((anteriores) => {
        const proximos = new Set(anteriores)
        proximos.delete(botao)
        return proximos
      })
    }
  }

  // Observador e bebê arquivado não criam nada: nenhum atalho (a barra, o botão da madrugada, o "Mais") envia
  // uma ação de criação, em qualquer tema.
  function iniciar(tipo: 'sono' | 'mamada' | 'tummy') {
    if (!gravacaoLiberada || !liberarToque(tipo)) return
    void comBotaoOcupado(tipo, () => acoes.iniciarSessao(tipo))
  }

  function registrarFralda(conteudo: 'xixi' | 'coco' | 'ambos') {
    if (!gravacaoLiberada || !liberarToque('fralda')) return
    void comBotaoOcupado('fralda', () => acoes.registrarFralda(conteudo))
  }

  function abrirMais(item: ItemDoMais) {
    if (!gravacaoLiberada) return
    if (item === 'observacao') {
      void navigate('/app/registro/novo?tipo=observacao', { state: { de: 'hoje', foco: 'titulo' } })
    } else if (item === 'outro') {
      void navigate('/app/registro/novo', { state: { de: 'hoje', foco: 'titulo' } })
    } else if (liberarToque(item)) {
      void comBotaoOcupado(item, () => acoes.registrarMamadeiraOuSolido(item))
    }
  }

  // "Desfazer", "Fechar" e as escolhas do duplicado somem com a confirmação; o foco vai ao primeiro botão
  // rápido (Sono) ou, se ele não existe, ao h1. A confirmação nunca recebe o foco.
  function acionar(acao: AcaoDaConfirmacao) {
    if (acao.chave !== 'tentar_de_novo') fecharConfirmacao()
    if (acao.chave === 'desfazer' || acao.chave === 'fechar' || acao.chave === 'manter_os_dois' || acao.chave === 'excluir_este') {
      if (primeiroBotao.current) primeiroBotao.current.focus()
      else focarTitulo()
    }
    acao.executar()
  }

  // ---- encerrar ----------------------------------------------------------------------------------

  // Encerrar tira o botão da tela: o foco vai ao próprio cartão, que passa a dizer "Nenhuma sessão".
  // `Tentar de novo` repete o comando original (`repetir`, congelado na 1ª tentativa: o mesmo fim e a mesma
  // sessão), não um encerramento novo com o relógio de agora.
  async function conduzirEncerramento(sessaoId: string, rodar: () => Promise<ResultadoDoEncerramento>) {
    if (encerrando) return
    setEncerrando(true)
    const resultado = await rodar()
    setEncerrando(false)
    if (resultado.ok) {
      setRelogioAtrasDe(null)
    } else if (resultado.relogioAtras) {
      setRelogioAtrasDe(sessaoId)
    } else {
      acoes.mostrarErro(resultado.erro, () => void conduzirEncerramento(sessaoId, resultado.repetir))
    }
  }

  function encerrar(sessao: Registro, momento?: number): Promise<void> {
    return conduzirEncerramento(sessao.id, () => acoes.encerrar(sessao, { momento }))
  }

  function encerrarPrincipal() {
    if (!principalSessao || encerrando) return
    setCurtaDe(null)
    cartao.current?.focus()
    void encerrar(principalSessao)
  }

  // QA-10: com menos de 1 minuto, "Encerrar" pergunta antes; com 1 minuto ou mais, encerra de uma vez.
  function pedirEncerrarPrincipal() {
    if (!principalSessao || encerrando) return
    if (sessaoCurta(agora, Date.parse(principalSessao.inicio))) setCurtaDe(principalSessao.id)
    else encerrarPrincipal()
  }

  // Esc fecha a pergunta e devolve o foco ao "Encerrar" do cartão.
  function fecharPerguntaDoCartao() {
    setCurtaDe(null)
    cartao.current?.querySelector<HTMLElement>('[data-acao="encerrar"]')?.focus()
  }

  // "Descartar" da pergunta: o descarte de sempre (a sessão vai para a lixeira), sem confirmação nem Desfazer.
  async function descartarSessao(sessao: Registro) {
    if (encerrando) return
    setEncerrando(true)
    const resultado = await acoes.descartar(sessao)
    setEncerrando(false)
    if (resultado.ok) setRelogioAtrasDe(null)
    else acoes.mostrarErro(resultado.erro, () => void descartarSessao(sessao))
  }

  function descartarPrincipal() {
    if (!principalSessao || encerrando) return
    setCurtaDe(null)
    cartao.current?.focus()
    void descartarSessao(principalSessao)
  }

  // ---- os números do dia e "Últimos" ----------------------------------------------------------------

  const hoje = diaDaFamilia(agora, fuso)
  const janela = janelaDoDia(hoje, fuso)
  const autorDoRegistro = (registro: Registro) => acoes.nomeDoAutor(registro.criadoPor, registro.familiaId)

  const noite = madrugada && principalSessao?.tipo !== 'mamada'
  // O botão grande da madrugada é uma ação de criação: só para quem pode gravar.
  const comBotaoDaMamada = gravacaoLiberada
  const ultimaMamada = (ultimos.dados ?? []).find((registro) => registro.tipo === 'mamada')
  const lidos = [emAndamento, ultimos, desde, notas, dia].map((secao) => secao.lidoEm)
  const lidoEm = lidos.every((valor) => valor !== null) ? Math.min(...(lidos as number[])) : null
  const fusoDiferente = aparelho !== fuso
  const comSessao = principalSessao !== null

  // ---- os blocos; a composição (a grade) escolhe a ordem e a posição de cada um --------------------------

  const blocoCartao = (classe: string) => (
    <div className={`flex flex-col gap-4 ${classe}`}>
      {emAndamento.estado === 'carregando' || (emAndamento.estado === 'erro' && emAndamento.dados === null) ? (
        <section
          ref={cartao}
          tabIndex={-1}
          data-andamento=""
          aria-busy={emAndamento.estado === 'carregando' ? 'true' : undefined}
          className="alvo-foco rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-6 lg:p-8"
        >
          <h2 className="text-[15px] leading-[22px] font-medium text-(--cor-texto-2)">{HOJE.emAndamento}</h2>
          {emAndamento.erro ? (
            <AvisoDeErro erro={emAndamento.erro} papel={ativo.papel} aoTentarDeNovo={emAndamento.recarregar} className="mt-3" />
          ) : (
            <p className="mt-3 text-(--cor-texto-2)">{COMUM.carregando}</p>
          )}
        </section>
      ) : (
        <>
          {emAndamento.erro ? (
            <AvisoDeErro erro={emAndamento.erro} papel={ativo.papel} aoTentarDeNovo={emAndamento.recarregar} />
          ) : null}
          <CartaoSessao
            ref={cartao}
            sessao={
              principalSessao
                ? {
                    id: principalSessao.id,
                    tipo: principalSessao.tipo as 'sono' | 'mamada' | 'tummy',
                    inicio: Date.parse(principalSessao.inicio),
                    pessoa: autorDoRegistro(principalSessao),
                  }
                : null
            }
            agora={agora}
            podeEncerrar={gravacaoLiberada}
            ocupado={encerrando}
            aoEncerrar={pedirEncerrarPrincipal}
            painel={
              principalSessao && curtaDe === principalSessao.id ? (
                <PerguntaSessaoCurta
                  className="w-full"
                  ocupado={encerrando}
                  podeDescartar={rotina.podeAlterar(principalSessao)}
                  aoSalvar={encerrarPrincipal}
                  aoDescartar={descartarPrincipal}
                  aoFechar={fecharPerguntaDoCartao}
                />
              ) : null
            }
          />
        </>
      )}
      <SessoesEmParalelo
        sessoes={sessoes}
        agora={agora}
        autorDe={autorDoRegistro}
        podeEncerrar={gravacaoLiberada}
        podeUnir={(grupo) => gravacaoLiberada && acoes.podeUnir(grupo)}
        textoDoPapel={textoDoPapel}
        ocupado={encerrando}
        relogioAtrasDe={relogioAtrasDe}
        aoEncerrar={(sessao) => void encerrar(sessao)}
        podeDescartar={(sessao) => rotina.podeAlterar(sessao)}
        aoDescartar={(sessao) => void descartarSessao(sessao)}
        aoEncerrarEm={(sessao, momento) => void encerrar(sessao, momento)}
        aoUnir={(grupo) => acoes.unir(grupo)}
      />
      {emAndamento.dados?.incompleta ? <AvisoDeLista limite={LIMITES.emAndamento} dado="emAndamento" /> : null}
    </div>
  )

  const blocoBotaoMamada = (classe: string, compacto: boolean) => (
    <BotaoIniciarMamada
      compacto={compacto}
      aoIniciar={() => iniciar('mamada')}
      ultima={
        ultimaMamada && ultimaMamada.fim
          ? HOJE.ultimaMamada(formatarHora(Date.parse(ultimaMamada.inicio)), autorDoRegistro(ultimaMamada))
          : undefined
      }
      className={classe}
    />
  )

  // O histórico: as notas em destaque e o que as outras pessoas registraram depois do marco.
  const blocoHistorico = (classe: string, espaco: string) => (
    <div data-historico="" className={`flex flex-col ${espaco} ${classe}`}>
      <SecaoDoHoje secao={notas} titulo={HOJE.paraVoceSaber} papel={ativo.papel}>
        {(lista) => (
          <>
            <ParaVoceSaber
              notas={lista.itens.filter((nota) => nota.destaqueAte !== null && Date.parse(nota.destaqueAte) > agora).slice(0, 3)}
              agora={agora}
              autorDe={(nota) => acoes.nomeDoAutor(nota.criadoPor, nota.familiaId)}
              rodape={
                <LinkDaRotina to="/app/notas" state={{ origem: ORIGEM_HOJE }} className="mt-1">
                  {LIGACOES.verNotas}
                </LinkDaRotina>
              }
            />
            {lista.incompleta ? <AvisoDeLista limite={LIMITES.notas} dado="notas" className="mt-3" /> : null}
          </>
        )}
      </SecaoDoHoje>
      <SecaoDoHoje secao={desde} titulo={HOJE.desdeCarregando} papel={ativo.papel}>
        {(lido) =>
          lido.marco ? (
            <DesdeUltimoRegistro
              marcoEm={Date.parse(lido.marco.recebidoEm)}
              registros={[...lido.novos].sort(maisNovoPrimeiro)}
              agora={agora}
              fuso={fuso}
              autorDe={autorDoRegistro}
              paraDetalhe={(registro) => `/app/registro/${registro.id}`}
              rodape={
                <LinkDaRotina to="/app/historico" className="mt-1">
                  {LIGACOES.verNoHistorico}
                </LinkDaRotina>
              }
            />
          ) : null
        }
      </SecaoDoHoje>
    </div>
  )

  const blocoResumo = (classe?: string) => (
    <SecaoDoHoje secao={dia} titulo={HOJE.hojeAteAgora} papel={ativo.papel} className={classe}>
      {(doDia) => {
        if (doDia.registros.incompleta || doDia.sessoes.incompleta) {
          return (
            <section aria-labelledby="hoje-ate-agora" data-resumo="">
              <h2 id="hoje-ate-agora" className="cm-h4">
                {HOJE.hojeAteAgora}
              </h2>
              <p className="mt-3 text-(--cor-texto-2)">{ESTADOS.demaisParaSomar}</p>
            </section>
          )
        }
        const totais = totaisDoDia(doDia.registros.itens, doDia.sessoes.itens, Date.parse(janela.de), Date.parse(janela.ate))
        return (
          <ResumoDoDia
            itens={[
              { rotulo: HOJE.mamadas, valor: String(totais.mamadas) },
              { rotulo: TOTAIS.mamadeiras, valor: String(totais.mamadeiras) },
              { rotulo: HOJE.fraldas, valor: String(totais.fraldas) },
              { rotulo: HOJE.sono, valor: formatarSono(totais.sonoMin) },
            ]}
          />
        )
      }}
    </SecaoDoHoje>
  )

  const blocoUltimos = (classe?: string) => (
    <SecaoDoHoje secao={ultimos} titulo={HOJE.ultimos} papel={ativo.papel} className={classe}>
      {(concluidos) => {
        if (concluidos.length === 0) {
          return (
            <section id="ultimos" data-ultimos="" aria-labelledby="ultimos-titulo">
              <h2 id="ultimos-titulo" className="cm-h4">
                {HOJE.ultimos}
              </h2>
              <p className="mt-3 border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2) lg:mt-4">
                {sessoes.length === 0 ? HOJE.semRegistros : HOJE.semConcluidos}
              </p>
            </section>
          )
        }
        // Três colunas sempre: os mais recentes, e o travessão nas que faltam. Cada coluna leva o registro
        // dela, para o encaixe da marca de envio (R38-13); a MAT-38 não passa marca nenhuma.
        const colunas: ItemDosUltimos[] = concluidos.map((registro) => ({
          ...formatarUltimo(ROTULO_TIPO[registro.tipo], formatarQuando(momentoDoRegistro(registro), agora)),
          registro,
        }))
        const itens = [...colunas, ...Array.from({ length: Math.max(0, 3 - colunas.length) }, () => ({ valor: SEM_RESULTADO, legenda: SEM_RESULTADO }))]
        return <UltimosDoHoje itens={itens} className={REGRA_DAS_LINHAS_DE_ULTIMOS} />
      }}
    </SecaoDoHoje>
  )

  // De dia: o cartão à esquerda e a área da lista à direita, que abre com os números do dia em Literata
  // grande e segue com o histórico; "Últimos" fica embaixo do cartão. Tudo em linhas com fio fino.
  const composicaoDoDia = (
    <div
      data-grade-do-hoje=""
      className="cm-area mt-6 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12"
    >
      {blocoCartao('lg:col-span-6 lg:col-start-1 lg:row-start-1')}
      <div data-area-lista="" className="flex flex-col gap-10 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">
        {blocoResumo()}
        {blocoHistorico('', 'gap-10')}
      </div>
      {blocoUltimos('lg:col-span-6 lg:col-start-1 lg:row-start-2')}
    </div>
  )

  // Madrugada com sessão em andamento: a sessão é o destaque (o círculo encolhe e vai para baixo dela), o
  // histórico sobe para logo depois do botão (no celular a primeira linha aparece antes da dobra) e os
  // números vêm depois dele. 16 px sob o título e 20 px entre os blocos, para a primeira linha inteira
  // terminar acima da barra fixa.
  const composicaoDaMadrugadaComSessao = (
    <div
      data-grade-do-hoje=""
      className="cm-area mt-4 grid grid-cols-1 gap-5 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12"
    >
      {blocoCartao('lg:col-span-8 lg:col-start-1 lg:row-start-1')}
      {noite && comBotaoDaMamada ? blocoBotaoMamada('lg:col-span-4 lg:col-start-9 lg:row-start-2', true) : null}
      {blocoHistorico('lg:col-span-8 lg:col-start-1 lg:row-start-2', 'gap-5')}
      {blocoResumo('lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:self-center')}
      {blocoUltimos('lg:col-span-8 lg:col-start-1 lg:row-start-3')}
    </div>
  )

  const composicaoDaMadrugadaSemSessao = (
    <div
      data-grade-do-hoje=""
      className="cm-area mt-6 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12"
    >
      {blocoCartao('lg:col-span-7 lg:col-start-1 lg:row-start-1')}
      {comBotaoDaMamada ? blocoBotaoMamada('lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:self-center', false) : null}
      {blocoHistorico('lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-2', 'gap-8')}
      {blocoResumo('lg:col-span-5 lg:col-start-8 lg:row-start-2')}
      {blocoUltimos('lg:col-span-5 lg:col-start-8 lg:row-start-3')}
    </div>
  )

  return (
    <>
      <main ref={principal} className="pb-12 text-[17px] leading-[25px]" data-tela="hoje">
        <TituloRotina
          titulo={TITULOS.hoje}
          linha={linha}
          lateral={
            <div className="flex flex-col items-start gap-2 pb-2 lg:items-end">
              <p className="hidden lg:block" data-data-do-dia="">
                <Etiqueta>{dataPorExtenso(agora)}</Etiqueta>
              </p>
              <div className="flex flex-wrap items-center gap-3" data-atualizacao="">
                {lidoEm !== null ? (
                  <p className="text-[15px] leading-[22px] text-(--cor-texto-2) tabular-nums">{COMUM.atualizadoAs(formatarHora(lidoEm))}</p>
                ) : null}
                <Botao variante="contorno" tamanho="app" className={ALVO_APP} icone={<RefreshCw />} onClick={atualizar}>
                  <span>{COMUM.atualizar}</span>
                </Botao>
              </div>
            </div>
          }
        />

        {acessoPerdido || fusoDiferente ? (
          <div className="cm-area mt-5 flex flex-col gap-3">
            {acessoPerdido ? (
              <p className="inline-flex items-start gap-2.5 rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">
                <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
                {ESTADOS.acessoPerdido}
              </p>
            ) : null}
            {fusoDiferente ? <AvisoDeFuso aparelho={aparelho} familia={fuso} /> : null}
          </div>
        ) : null}

        {!madrugada ? composicaoDoDia : noite && !comSessao ? composicaoDaMadrugadaSemSessao : composicaoDaMadrugadaComSessao}
      </main>

      <BarraRegistroRapido
        nome={nome}
        refSono={primeiroBotao}
        textoNoLugarDosBotoes={textoNoLugarDosBotoes}
        carregando={emAndamento.estado === 'carregando'}
        ocupados={ocupados}
        sessaoAtiva={principalSessao ? (principalSessao.tipo as 'sono' | 'mamada' | 'tummy') : null}
        confirmacao={confirmacao}
        aoIniciar={iniciar}
        aoFralda={registrarFralda}
        aoMais={abrirMais}
        aoAcionar={acionar}
      />

      {/* O aviso honesto de demonstração: depois do conteúdo, fora do <main> e dos cartões, o único da página. */}
      <AvisoDaTela />
    </>
  )
}
