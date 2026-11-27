import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { DetalheFamilia } from '../../dados/conta.ts'
import { diaDaFamilia, janelaDoDia } from '../../dados/rotina.dia.ts'
import type { ConteudoFralda, DesdeMeuUltimo, Nota, Registro, TipoSessao } from '../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../dados/rotina.uuid.ts'
import { COMUM, CONFIRMACAO, ESCOLHAS_FRALDA, HISTORICO, HOJE, NOTAS, REGISTRO_RAPIDO, ROTULO_TIPO, TOTAIS } from '../../conteudo/rotina.ts'
import { FAMILIA, PAPEIS } from '../../conteudo/conta.ts'
import { formatarDuracao, formatarHora } from '../../prototipo/formatar.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Avatar } from '../app/Avatar.tsx'
import { BotaoIniciarMamada } from '../app/BotaoIniciarMamada.tsx'
import { CartaoSessao } from '../app/CartaoSessao.tsx'
import { ResumoDoDia } from '../app/ResumoDoDia.tsx'
import { Botao } from '../base/Botao.tsx'
import { Pilha } from '../base/layout/index.ts'
import type { AcoesDaFamilia } from '../conta/acoesFamilia.ts'
import { BlocoMembros } from '../conta/BlocoMembros.tsx'
import { PainelVazio } from '../estado/PainelVazio.tsx'
import { BarraRegistroRapido, type BotaoRapido, type ItemDoMais } from '../rotina/BarraRegistroRapido.tsx'
import { DesdeUltimoRegistro, ParaVoceSaber } from '../rotina/BlocosDoHoje.tsx'
import { ConfirmacaoRotina } from '../rotina/ConfirmacaoRotina.tsx'
import { type AcaoDaConfirmacao, useRotina } from '../rotina/contexto.ts'
import { dataEHora } from '../rotina/datasDaRotina.ts'
import { maisNovoPrimeiro } from '../rotina/formatos.ts'
import { FormularioNota } from '../rotina/FormularioNota.tsx'
import { LinhaDoDia } from '../rotina/LinhaDoDia.tsx'
import { totaisDoDia } from '../rotina/totaisDoDia.ts'
import { useExtraDemo } from './ProvedorDemoRotina.tsx'
import { DEMO_TEXTOS } from './textos.ts'
import type { FluxoDemoTelefone } from './textosCasca.ts'

const formatarSono = (minutos: number) => HOJE.umaHoraEMinutos(Math.floor(minutos / 60), minutos % 60)
const maisNovaNotaPrimeiro = (a: Nota, b: Nota) => Date.parse(b.criadaEm) - Date.parse(a.criadaEm) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)

function RotaForaDaDemo({ destino }: { destino: string }) {
  return (
    <div className="dt-corpo">
      <Pilha vao="pilha">
        <p className="text-pequeno text-(--cor-texto-2)">{DEMO_TEXTOS.rotaFora}</p>
        <Link to={destino} className={`cm-botao cm-botao-contorno alvo-toque self-start ${ALVO_APP}`} data-tamanho="app">
          {DEMO_TEXTOS.voltar}
        </Link>
      </Pilha>
    </div>
  )
}

// ============================================================================================
// Fluxo 1: Histórico (Cena 2, "Agora é comigo.", co-p2-fone)
// ============================================================================================

function TelaDetalheHistorico({ id }: { id: string }) {
  const { dados, ativo, nomeDoAutor } = useRotina()
  const [item, setItem] = useState<Registro | null>(null)

  useEffect(() => {
    if (!id) return
    let ativoEfeito = true
    void dados.registro(id).then((res) => {
      if (ativoEfeito && res.ok) setItem(res.valor)
    })
    return () => {
      ativoEfeito = false
    }
  }, [dados, id])

  if (!ativo) return null

  return (
    <div className="dt-corpo">
      <Pilha vao="pilha">
        <Link to="/app/historico" className="dt-link-voltar alvo-toque">
          <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
          <span>{DEMO_TEXTOS.voltar}</span>
        </Link>
        <p className="font-titulo text-titulo-4 font-semibold">{DEMO_TEXTOS.historico.detalheTitulo}</p>
        {item ? (
          <Pilha vao="junto">
            <p className="font-medium">{ROTULO_TIPO[item.tipo]}</p>
            <p className="text-pequeno text-(--cor-texto-2)">
              {DEMO_TEXTOS.historico.detalheAutor(nomeDoAutor(item.criadoPor, item.familiaId), formatarHora(Date.parse(item.inicio)))}
            </p>
            {item.nota ? <p className="text-pequeno">{DEMO_TEXTOS.historico.detalheNota(item.nota)}</p> : null}
          </Pilha>
        ) : null}
      </Pilha>
    </div>
  )
}

function TelaHistoricoDemo() {
  const { dados, ativo, versao, atualizar, nomeDoAutor, confirmacao, mostrarConfirmacao, fecharConfirmacao } = useRotina()
  const { motor } = useExtraDemo()
  const [registros, setRegistros] = useState<Registro[]>([])
  const [ocupados, setOcupados] = useState<ReadonlySet<BotaoRapido>>(new Set())
  const listaRef = useRef<HTMLDivElement>(null)

  const bebeId = ativo?.bebe.id ?? ''
  const fuso = ativo?.familia.fuso ?? motor.relogio.fuso
  const dia = diaDaFamilia(motor.relogio.agora(), fuso)

  useEffect(() => {
    if (!bebeId) return
    let ativoEfeito = true
    void dados.doDia(bebeId, dia).then((res) => {
      if (!ativoEfeito || !res.ok) return
      setRegistros([...res.valor.itens].sort(maisNovoPrimeiro))
    })
    return () => {
      ativoEfeito = false
    }
  }, [dados, bebeId, dia, versao])

  const comOcupado = useCallback(async (chave: BotaoRapido, tarefa: () => Promise<void>) => {
    setOcupados((ant) => new Set(ant).add(chave))
    try {
      await tarefa()
    } finally {
      setOcupados((ant) => {
        const prox = new Set(ant)
        prox.delete(chave)
        return prox
      })
    }
  }, [])

  if (!ativo) return null

  const confirmarComDesfazer = (registro: Registro, texto: string) => {
    mostrarConfirmacao({
      texto,
      acoes: [
        {
          chave: 'desfazer',
          rotulo: COMUM.desfazer,
          executar: () => {
            void dados.excluirRegistro(registro.id).then((res) => {
              if (!res.ok) return
              atualizar()
              mostrarConfirmacao({
                texto: REGISTRO_RAPIDO.desfeito(registro.tipo),
                acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }],
              })
            })
          },
        },
        { chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined },
      ],
    })
  }

  const gravarRapido = async (
    botao: BotaoRapido,
    entrada: Parameters<typeof dados.gravarRegistro>[0],
    textoConfirmacao: string,
  ) => {
    await comOcupado(botao, async () => {
      const res = await dados.gravarRegistro(entrada)
      if (!res.ok) return
      atualizar()
      confirmarComDesfazer(res.valor, textoConfirmacao)
      if (listaRef.current) listaRef.current.scrollTop = 0
    })
  }

  const aoIniciar = (tipo: TipoSessao) => {
    const agoraMs = motor.relogio.avancarMinutos(1)
    const inicioIso = new Date(agoraMs).toISOString()
    const detalhes = tipo === 'mamada' ? { lado: 'ambos' as const } : {}
    const texto =
      tipo === 'mamada'
        ? DEMO_TEXTOS.historico.mamadaRegistrada
        : tipo === 'sono'
          ? DEMO_TEXTOS.historico.sonoRegistrado
          : DEMO_TEXTOS.historico.tummyRegistrado
    void gravarRapido(
      tipo,
      { id: uuidV7(), bebeId, tipo, inicio: inicioIso, fim: null, detalhes, origem: 'ao_vivo' },
      texto,
    )
  }

  const aoFralda = (conteudo: ConteudoFralda) => {
    const agoraMs = motor.relogio.avancarMinutos(1)
    const escolha = ESCOLHAS_FRALDA.find((c) => c.valor === conteudo)
    void gravarRapido(
      'fralda',
      { id: uuidV7(), bebeId, tipo: 'fralda', inicio: new Date(agoraMs).toISOString(), detalhes: { conteudo }, origem: 'ao_vivo' },
      REGISTRO_RAPIDO.fraldaRegistrada(escolha ? escolha.rotulo : ''),
    )
  }

  const aoMais = (item: ItemDoMais) => {
    if (item === 'mamadeira' || item === 'solido') {
      const agoraMs = motor.relogio.avancarMinutos(1)
      const detalhes = item === 'mamadeira' ? { ml: 90, conteudo: 'leite_materno' as const } : { alimento: 'Fruta amassada' }
      void gravarRapido(
        item,
        { id: uuidV7(), bebeId, tipo: item, inicio: new Date(agoraMs).toISOString(), detalhes, origem: 'ao_vivo' },
        REGISTRO_RAPIDO.registrada(ROTULO_TIPO[item]),
      )
      return
    }
    mostrarConfirmacao({
      texto: DEMO_TEXTOS.historico.irParaOutroFora,
      acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }],
    })
  }

  const aoAcionar = (acao: AcaoDaConfirmacao) => {
    fecharConfirmacao()
    acao.executar()
  }

  return (
    <div className="dt-fluxo-coluna">
      <div ref={listaRef} className="dt-rolavel" data-dt-rolavel="">
        <div className="dt-corpo">
          <div className="dt-cabeca-tela">
            <p className="font-titulo text-titulo-4 font-semibold">{DEMO_TEXTOS.titulos.historico}</p>
            <p className="text-pequeno text-(--cor-texto-2)">{DEMO_TEXTOS.subtitulos.historico}</p>
          </div>
          {registros.length === 0 ? (
            <PainelVazio texto={HISTORICO.semRegistros} />
          ) : (
            <ul className="border-y border-(--cor-fio-suave)" data-dt-lista-historico="">
              {registros.map((registro) => (
                <LinhaDoDia
                  key={registro.id}
                  registro={registro}
                  fuso={fuso}
                  autor={nomeDoAutor(registro.criadoPor, registro.familiaId)}
                  para={`/app/registro/${registro.id}`}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <BarraRegistroRapido
        embutida
        nome={ativo.bebe.nome}
        textoNoLugarDosBotoes={null}
        carregando={false}
        ocupados={ocupados}
        sessaoAtiva={null}
        confirmacao={confirmacao}
        aoIniciar={aoIniciar}
        aoFralda={aoFralda}
        aoMais={aoMais}
        aoAcionar={aoAcionar}
      />
    </div>
  )
}

function FluxoHistorico() {
  const { pathname } = useLocation()
  if (pathname === '/app/historico') return <TelaHistoricoDemo />
  const detalhe = /^\/app\/registro\/([^/]+)$/.exec(pathname)
  if (detalhe) return <TelaDetalheHistorico id={detalhe[1]} />
  return <RotaForaDaDemo destino="/app/historico" />
}

// ============================================================================================
// Fluxo 2: Hoje à noite (Cena 3, "Dormiu às 20:30.", co-p3-fone, madrugada)
// ============================================================================================

function TelaSessaoAvisoDemo() {
  return (
    <div className="dt-corpo">
      <Pilha vao="pilha">
        <Link to="/app/hoje" className="dt-link-voltar alvo-toque">
          <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
          <span>{DEMO_TEXTOS.voltar}</span>
        </Link>
        <p className="text-pequeno text-(--cor-texto-2)">{DEMO_TEXTOS.hoje.verSessaoAviso}</p>
      </Pilha>
    </div>
  )
}

function TelaHojeDemo() {
  const { dados, ativo, versao, atualizar, nomeDoAutor, confirmacao, mostrarConfirmacao, fecharConfirmacao } = useRotina()
  const { motor } = useExtraDemo()
  const [sessoes, setSessoes] = useState<Registro[]>([])
  const [registrosDia, setRegistrosDia] = useState<Registro[]>([])
  const [sessoesJanela, setSessoesJanela] = useState<Registro[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [encerrando, setEncerrando] = useState(false)
  const [ocupados, setOcupados] = useState<ReadonlySet<BotaoRapido>>(new Set())
  const cartaoRef = useRef<HTMLElement>(null)

  const bebeId = ativo?.bebe.id ?? ''
  const familiaId = ativo?.familia.id ?? ''
  const fuso = ativo?.familia.fuso ?? motor.relogio.fuso
  const agora = motor.relogio.agora()
  const hoje = diaDaFamilia(agora, fuso)
  const janela = janelaDoDia(hoje, fuso)

  useEffect(() => {
    if (!bebeId) return
    let ativoEfeito = true
    void Promise.all([
      dados.emAndamento(bebeId),
      dados.doDia(bebeId, hoje),
      dados.sessoesDaJanela(bebeId, janela.de, janela.ate),
      dados.notas(familiaId, bebeId),
    ]).then(([emAnd, doDiaRes, sesRes, notasRes]) => {
      if (!ativoEfeito) return
      if (emAnd.ok) setSessoes(emAnd.valor.itens)
      if (doDiaRes.ok) setRegistrosDia(doDiaRes.valor.itens)
      if (sesRes.ok) setSessoesJanela(sesRes.valor.itens)
      if (notasRes.ok) setNotas(notasRes.valor.itens)
    })
    return () => {
      ativoEfeito = false
    }
  }, [dados, bebeId, familiaId, hoje, janela.de, janela.ate, versao])

  if (!ativo) return null

  const principal = sessoes[0] ?? null
  const totais = totaisDoDia(registrosDia, sessoesJanela, Date.parse(janela.de), Date.parse(janela.ate))
  const autorDe = (r: Registro) => nomeDoAutor(r.criadoPor, r.familiaId)
  const ultimaMamada = [...registrosDia].reverse().find((r) => r.tipo === 'mamada' && r.fim !== null)

  const aoEncerrar = () => {
    if (!principal || encerrando) return
    setEncerrando(true)
    const inicioMs = Date.parse(principal.inicio)
    let fimMs = motor.relogio.agora()
    // Se a sessão acabou de ser iniciada na prévia (< 1 min no relógio fixo), avança 15 min para somar no total do dia.
    if (fimMs - inicioMs < 60_000) {
      fimMs = motor.relogio.avancarMinutos(15)
    }
    void dados.encerrarSessao(principal.id, new Date(fimMs).toISOString()).then((res) => {
      setEncerrando(false)
      if (!res.ok) return
      const duracao = formatarDuracao(fimMs - inicioMs)
      atualizar()
      mostrarConfirmacao({
        texto: CONFIRMACAO.sessaoEncerrada(duracao, false),
        acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }],
      })
      cartaoRef.current?.focus()
    })
  }

  const aoIniciar = (tipo: TipoSessao) => {
    if (ocupados.has(tipo)) return
    setOcupados((ant) => new Set(ant).add(tipo))
    const inicioMs = motor.relogio.avancarMinutos(1)
    void dados
      .gravarRegistro({
        id: uuidV7(),
        bebeId,
        tipo,
        inicio: new Date(inicioMs).toISOString(),
        fim: null,
        origem: 'ao_vivo',
      })
      .then((res) => {
        setOcupados((ant) => {
          const prox = new Set(ant)
          prox.delete(tipo)
          return prox
        })
        if (!res.ok) return
        fecharConfirmacao()
        atualizar()
      })
  }

  const aoFralda = (conteudo: ConteudoFralda) => {
    const inicioMs = motor.relogio.avancarMinutos(1)
    const escolha = ESCOLHAS_FRALDA.find((c) => c.valor === conteudo)
    void dados
      .gravarRegistro({
        id: uuidV7(),
        bebeId,
        tipo: 'fralda',
        inicio: new Date(inicioMs).toISOString(),
        detalhes: { conteudo },
        origem: 'ao_vivo',
      })
      .then((res) => {
        if (!res.ok) return
        atualizar()
        mostrarConfirmacao({
          texto: REGISTRO_RAPIDO.fraldaRegistrada(escolha ? escolha.rotulo : ''),
          acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }],
        })
      })
  }

  const aoMais = (item: ItemDoMais) => {
    if (item === 'mamadeira' || item === 'solido') {
      const inicioMs = motor.relogio.avancarMinutos(1)
      const detalhes = item === 'mamadeira' ? { ml: 120, conteudo: 'formula' as const } : { alimento: 'Banana' }
      void dados
        .gravarRegistro({
          id: uuidV7(),
          bebeId,
          tipo: item,
          inicio: new Date(inicioMs).toISOString(),
          detalhes,
          origem: 'ao_vivo',
        })
        .then((res) => {
          if (!res.ok) return
          atualizar()
          mostrarConfirmacao({
            texto: REGISTRO_RAPIDO.registrada(ROTULO_TIPO[item]),
            acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }],
          })
        })
      return
    }
    mostrarConfirmacao({
      texto: DEMO_TEXTOS.historico.irParaOutroFora,
      acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }],
    })
  }

  const aoAcionar = (acao: AcaoDaConfirmacao) => {
    fecharConfirmacao()
    acao.executar()
  }

  return (
    <div className="dt-fluxo-coluna">
      <div className="dt-rolavel" data-dt-rolavel="">
        <div className="dt-corpo">
          <Pilha vao="grupo">
            <div className="dt-cabeca-tela">
              <p className="font-titulo text-titulo-4 font-semibold">{DEMO_TEXTOS.titulos.hoje}</p>
              <p className="text-pequeno text-(--cor-texto-2)">{DEMO_TEXTOS.subtitulos.hoje}</p>
            </div>

            <CartaoSessao
              ref={cartaoRef}
              semIlustracao
              className="p-esp-pilha"
              sessao={
                principal
                  ? {
                      id: principal.id,
                      tipo: principal.tipo as TipoSessao,
                      inicio: Date.parse(principal.inicio),
                      pessoa: autorDe(principal),
                    }
                  : null
              }
              agora={agora}
              podeEncerrar
              ocupado={encerrando}
              aoEncerrar={aoEncerrar}
            />

            <ResumoDoDia
              itens={[
                { rotulo: HOJE.mamadas, valor: String(totais.mamadas) },
                { rotulo: TOTAIS.mamadeiras, valor: String(totais.mamadeiras) },
                { rotulo: HOJE.fraldas, valor: String(totais.fraldas) },
                { rotulo: HOJE.sono, valor: formatarSono(totais.sonoMin) },
              ]}
            />

            {principal?.tipo !== 'mamada' ? (
              <BotaoIniciarMamada
                compacto={principal !== null}
                aoIniciar={() => aoIniciar('mamada')}
                ultima={
                  ultimaMamada
                    ? HOJE.ultimaMamada(formatarHora(Date.parse(ultimaMamada.inicio)), autorDe(ultimaMamada))
                    : undefined
                }
              />
            ) : null}

            <ParaVoceSaber
              notas={notas.filter((n) => n.destaqueAte !== null && Date.parse(n.destaqueAte) > agora).slice(0, 2)}
              agora={agora}
              autorDe={(nota) => nomeDoAutor(nota.criadoPor, nota.familiaId)}
            />
          </Pilha>
        </div>
      </div>

      <BarraRegistroRapido
        embutida
        nome={ativo.bebe.nome}
        textoNoLugarDosBotoes={null}
        carregando={false}
        ocupados={ocupados}
        sessaoAtiva={principal ? (principal.tipo as TipoSessao) : null}
        confirmacao={confirmacao}
        aoIniciar={aoIniciar}
        aoFralda={aoFralda}
        aoMais={aoMais}
        aoAcionar={aoAcionar}
      />
    </div>
  )
}

function FluxoHoje() {
  const { pathname } = useLocation()
  if (pathname === '/app/hoje') return <TelaHojeDemo />
  if (pathname === '/app/sessao') return <TelaSessaoAvisoDemo />
  return <RotaForaDaDemo destino="/app/hoje" />
}

// ============================================================================================
// Fluxo 3: Cuidado compartilhado / Família (Cena 4, "E quando sou só eu?", co-so-fone)
// ============================================================================================

function TelaFamiliaDemo() {
  const { dados, ativo, contaId, versao, atualizar, nomeDoAutor } = useRotina()
  const { motor, pessoaAtiva, trocarPessoa } = useExtraDemo()
  const [detalhe, setDetalhe] = useState<DetalheFamilia | null>(null)
  const [desde, setDesde] = useState<DesdeMeuUltimo | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const familiaId = ativo?.familia.id ?? motor.familiaId
  const bebeId = ativo?.bebe.id ?? motor.bebeId
  const fuso = ativo?.familia.fuso ?? motor.relogio.fuso
  const agora = motor.relogio.agora()

  useEffect(() => {
    let ativoEfeito = true
    void Promise.all([motor.conta.detalheFamilia(familiaId), dados.desdeMeuUltimo(bebeId, contaId)]).then(
      ([detRes, desdeRes]) => {
        if (!ativoEfeito) return
        if (detRes.ok) setDetalhe(detRes.valor)
        if (desdeRes.ok) setDesde(desdeRes.valor)
      },
    )
    return () => {
      ativoEfeito = false
    }
  }, [motor.conta, dados, familiaId, bebeId, contaId, versao])

  const acoesFamilia = useMemo<AcoesDaFamilia>(
    () => ({
      abrirDialogo() {
        setAviso(DEMO_TEXTOS.familia.acaoSomenteNaConta)
      },
      async aposAcao(mensagem) {
        setAviso(mensagem)
        atualizar()
      },
      async aposFalha() {
        setAviso(DEMO_TEXTOS.familia.acaoSomenteNaConta)
      },
      async relerDetalhe() {
        atualizar()
      },
      dizer(mensagem) {
        setAviso(mensagem)
      },
    }),
    [atualizar],
  )

  const pessoaAtual = motor.pessoas[pessoaAtiva]

  const registrarComoAtivo = () => {
    const momento = motor.relogio.avancarMinutos(2)
    void dados
      .gravarRegistro({
        id: uuidV7(),
        bebeId,
        tipo: 'fralda',
        inicio: new Date(momento).toISOString(),
        detalhes: { conteudo: 'xixi' },
        origem: 'ao_vivo',
      })
      .then((res) => {
        if (!res.ok) return
        setAviso(DEMO_TEXTOS.familia.fraldaAnotada(pessoaAtual.nome, formatarHora(momento)))
        atualizar()
      })
  }

  return (
    <div className="dt-rolavel" data-dt-rolavel="">
      <div className="dt-corpo">
        <Pilha vao="grupo">
          <div className="dt-cabeca-tela">
            <p className="font-titulo text-titulo-4 font-semibold">{DEMO_TEXTOS.titulos.familia}</p>
            <p className="text-pequeno text-(--cor-texto-2)">{DEMO_TEXTOS.subtitulos.familia}</p>
          </div>

          <div className="dt-seletor-pessoa" role="group" aria-label={DEMO_TEXTOS.familia.alternarGrupo}>
            <span className="text-pequeno font-medium text-(--cor-texto-2)">{DEMO_TEXTOS.familia.verComo}</span>
            <div className="dt-botoes-pessoa">
              <Botao
                variante={pessoaAtiva === 'juliana' ? 'primario' : 'contorno'}
                tamanho="app"
                className={ALVO_APP}
                aria-pressed={pessoaAtiva === 'juliana'}
                onClick={() => {
                  setAviso(null)
                  trocarPessoa('juliana')
                }}
              >
                {motor.pessoas.juliana.nome}
              </Botao>
              <Botao
                variante={pessoaAtiva === 'icaro' ? 'primario' : 'contorno'}
                tamanho="app"
                className={ALVO_APP}
                aria-pressed={pessoaAtiva === 'icaro'}
                onClick={() => {
                  setAviso(null)
                  trocarPessoa('icaro')
                }}
              >
                {motor.pessoas.icaro.nome}
              </Botao>
            </div>
          </div>

          {detalhe ? (
            <p className="text-pequeno font-medium" data-dt-papel-ativo="">
              {FAMILIA.voceE(PAPEIS[detalhe.familia.meuPapel].minusculo)}
            </p>
          ) : null}

          {aviso ? (
            <p role="status" className="rounded-campo bg-(--cor-papel-fundo) p-esp-junto text-pequeno">
              {aviso}
            </p>
          ) : null}

          {desde?.marco ? (
            <DesdeUltimoRegistro
              marcoEm={Date.parse(desde.marco.recebidoEm)}
              registros={[...desde.novos].sort(maisNovoPrimeiro)}
              agora={agora}
              fuso={fuso}
              autorDe={(r) => nomeDoAutor(r.criadoPor, r.familiaId)}
            />
          ) : null}

          <div>
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} onClick={registrarComoAtivo}>
              {DEMO_TEXTOS.familia.anotarFralda(pessoaAtual.nome)}
            </Botao>
          </div>

          {detalhe ? (
            <BlocoMembros detalhe={detalhe} responsavel={detalhe.familia.meuPapel === 'responsavel'} acoes={acoesFamilia} />
          ) : null}
        </Pilha>
      </div>
    </div>
  )
}

function FluxoFamilia() {
  const { pathname } = useLocation()
  if (pathname === '/app/familia') return <TelaFamiliaDemo />
  return <RotaForaDaDemo destino="/app/familia" />
}

// ============================================================================================
// Fluxo 4: Notas (Cena 5, "Ninguém dá nota para o seu dia.", co-prova-fone)
// ============================================================================================

function TelaListaNotasDemo() {
  const { dados, ativo, versao, nomeDoAutor, confirmacao, fecharConfirmacao } = useRotina()
  const { motor } = useExtraDemo()
  const [lista, setLista] = useState<Nota[]>([])
  const [avisoExtra, setAvisoExtra] = useState<string | null>(null)
  const navigate = useNavigate()

  const familiaId = ativo?.familia.id ?? motor.familiaId
  const bebeId = ativo?.bebe.id ?? motor.bebeId
  const agora = motor.relogio.agora()

  useEffect(() => {
    let ativoEfeito = true
    void dados.notas(familiaId, bebeId).then((res) => {
      if (!ativoEfeito || !res.ok) return
      setLista([...res.valor.itens].sort(maisNovaNotaPrimeiro))
    })
    return () => {
      ativoEfeito = false
    }
  }, [dados, familiaId, bebeId, versao])

  if (!ativo) return null

  const nomeDoSobre = (nota: Nota) =>
    nota.bebeId === null
      ? NOTAS.sobreAFamiliaToda
      : NOTAS.sobre(ativo.familia.bebes.find((b) => b.id === nota.bebeId)?.nome ?? COMUM.semNomeDoBebe)

  const aoAcionar = (acao: AcaoDaConfirmacao) => {
    fecharConfirmacao()
    acao.executar()
  }

  return (
    <div className="dt-rolavel" data-dt-rolavel="">
      <div className="dt-corpo">
        <Pilha vao="grupo">
          <div className="dt-cabeca-tela">
            <p className="font-titulo text-titulo-4 font-semibold">{DEMO_TEXTOS.titulos.notas}</p>
            <p className="text-pequeno text-(--cor-texto-2)">{DEMO_TEXTOS.subtitulos.notas}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Botao
              variante="contorno"
              tamanho="app"
              className={ALVO_APP}
              icone={<Plus />}
              onClick={() => {
                setAvisoExtra(null)
                void navigate('/app/notas/nova')
              }}
            >
              {NOTAS.nova}
            </Botao>
          </div>

          <div className={confirmacao ? undefined : 'sr-only'}>
            <ConfirmacaoRotina confirmacao={confirmacao} aoAcionar={aoAcionar} />
          </div>

          {avisoExtra ? (
            <p role="status" className="rounded-campo bg-(--cor-papel-fundo) p-esp-junto text-pequeno">
              {avisoExtra}
            </p>
          ) : null}

          <Pilha vao="pilha">
            <p className="font-titulo text-titulo-4 font-semibold">{NOTAS.lista}</p>
            {lista.length === 0 ? (
              <PainelVazio texto={NOTAS.vazia} />
            ) : (
              <ul className="border-y border-(--cor-fio-suave)" data-dt-lista-notas="">
                {lista.map((nota) => {
                  const autor = nomeDoAutor(nota.criadoPor, nota.familiaId)
                  const emDestaque = nota.destaqueAte !== null && Date.parse(nota.destaqueAte) > agora
                  return (
                    <li
                      key={nota.id}
                      data-nota={nota.id}
                      className="flex flex-col gap-esp-junto border-t border-(--cor-fio-suave) py-esp-pilha first:border-t-0"
                    >
                      <p
                        className={`font-medium wrap-anywhere whitespace-pre-line ${
                          emDestaque ? 'rounded-campo bg-(--cor-papel-fundo) p-esp-junto' : ''
                        }`}
                      >
                        {nota.texto}
                      </p>
                      <div className="flex min-w-0 items-start gap-2">
                        <Avatar nome={autor} />
                        <div className="min-w-0 text-pequeno text-(--cor-texto-2) wrap-anywhere">
                          <p>{nomeDoSobre(nota)}</p>
                          <p>{NOTAS.autorEm(autor, dataEHora(Date.parse(nota.criadaEm)))}</p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Pilha>
        </Pilha>
      </div>
    </div>
  )
}

function TelaNovaNotaDemo() {
  const { ativo } = useRotina()
  const { motor } = useExtraDemo()
  if (!ativo) return null

  return (
    <div className="dt-rolavel" data-dt-rolavel="">
      <div className="dt-corpo">
        <Pilha vao="grupo">
          <Link to="/app/notas" className="dt-link-voltar alvo-toque">
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
            <span>{NOTAS.voltarParaNotas}</span>
          </Link>
          <p className="font-titulo text-titulo-4 font-semibold">{NOTAS.nova}</p>
          <FormularioNota modo="nova" ativo={ativo} origem="/app/notas" agora={motor.relogio.agora} />
        </Pilha>
      </div>
    </div>
  )
}

function FluxoNotas() {
  const { pathname } = useLocation()
  if (pathname === '/app/notas') return <TelaListaNotasDemo />
  if (pathname === '/app/notas/nova') return <TelaNovaNotaDemo />
  return <RotaForaDaDemo destino="/app/notas" />
}

// ============================================================================================
// Roteamento de entrada por fluxo
// ============================================================================================

export function rotaInicialDoFluxo(fluxo: FluxoDemoTelefone): string {
  switch (fluxo) {
    case 'historico':
      return '/app/historico'
    case 'hoje':
      return '/app/hoje'
    case 'familia':
      return '/app/familia'
    case 'notas':
      return '/app/notas'
  }
}

export function FluxosDemo({ fluxo }: { fluxo: FluxoDemoTelefone }) {
  switch (fluxo) {
    case 'historico':
      return <FluxoHistorico />
    case 'hoje':
      return <FluxoHoje />
    case 'familia':
      return <FluxoFamilia />
    case 'notas':
      return <FluxoNotas />
  }
}
