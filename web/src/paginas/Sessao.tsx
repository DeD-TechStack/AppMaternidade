import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ColunaApp } from '../componentes/ColunaApp.tsx'
import { ATIVIDADE_TUMMY } from '../conteudo/textos.ts'
import { BarraInferior } from '../prototipo/BarraInferior.tsx'
import { FaixaPrototipo } from '../prototipo/FaixaPrototipo.tsx'
import { IlustracaoBerco } from '../prototipo/IlustracaoBerco.tsx'
import { IlustracaoMamada } from '../prototipo/IlustracaoMamada.tsx'
import { IlustracaoTapete } from '../prototipo/IlustracaoTapete.tsx'
import { NavegacaoInferior } from '../prototipo/NavegacaoInferior.tsx'
import { SessaoInfo } from '../prototipo/SessaoInfo.tsx'
import { nomeDoCampo } from '../prototipo/campo.ts'
import { usePrototipo } from '../prototipo/contexto.ts'
import { focoDoEstado } from '../prototipo/foco.ts'
import { NOME_BEBE, ROTULO_SESSAO, ehTipoSessao, type TipoSessao } from '../prototipo/estado.ts'
import { formatarCronometro, formatarHora } from '../prototipo/formatar.ts'
import { useAgora } from '../prototipo/useAgora.ts'
import { useVitrine } from '../prototipo/vitrine.ts'

type Painel = 'nota' | 'descartar'

function AcoesDaSessao() {
  const { dispatch } = usePrototipo()
  const vitrine = useVitrine()
  const navigate = useNavigate()
  const [painel, setPainel] = useState<Painel | null>(null)
  const painelAnterior = useRef<Painel | null>(null)
  const campoNota = useRef<HTMLTextAreaElement>(null)
  const botaoManter = useRef<HTMLButtonElement>(null)
  const botaoAnotar = useRef<HTMLButtonElement>(null)
  const botaoDescartar = useRef<HTMLButtonElement>(null)
  const idNota = useId()
  const idPergunta = useId()
  const tab = vitrine ? -1 : undefined

  // O foco acompanha o painel: entra nele ao abrir e volta ao botão que o abriu ao fechar.
  useEffect(() => {
    if (painel === 'nota') campoNota.current?.focus()
    else if (painel === 'descartar') botaoManter.current?.focus()
    else if (painelAnterior.current === 'nota') botaoAnotar.current?.focus()
    else if (painelAnterior.current === 'descartar') botaoDescartar.current?.focus()
    painelAnterior.current = painel
  }, [painel])

  // Encerrar, salvar e descartar tiram esta tela do ar: o foco vai ao cartão "Em andamento" do Hoje.
  function encerrar(comNota: boolean) {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota })
    void navigate('/app/hoje', { state: { foco: 'cartao' } })
  }

  function salvarNota() {
    // O texto da nota não é guardado nem mostrado: o protótipo só registra que ela existe.
    const comNota = (campoNota.current?.value.trim() ?? '') !== ''
    encerrar(comNota)
  }

  function descartar() {
    dispatch({ tipo: 'descartar' })
    void navigate('/app/hoje', { state: { foco: 'cartao' } })
  }

  // Os painéis abrem logo abaixo da linha dos botões secundários, na mesma coluna do "Encerrar".
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        tabIndex={tab}
        className="botao botao-principal botao-grande"
        onClick={() => encerrar(false)}
      >
        Encerrar
      </button>

      <div className="flex flex-wrap gap-3">
        {painel !== 'nota' ? (
          <button
            ref={botaoAnotar}
            type="button"
            tabIndex={tab}
            className="botao botao-secundario"
            onClick={() => setPainel('nota')}
          >
            Encerrar e anotar
          </button>
        ) : null}
        {painel !== 'descartar' ? (
          <button
            ref={botaoDescartar}
            type="button"
            tabIndex={tab}
            className="botao botao-secundario"
            onClick={() => setPainel('descartar')}
          >
            Descartar
          </button>
        ) : null}
      </div>

      {painel === 'nota' ? (
        <div role="group" aria-label="Encerrar e anotar" className="flex flex-col gap-3 border-t pt-4">
          <label htmlFor={idNota} className="rotulo">
            Nota
          </label>
          <textarea
            ref={campoNota}
            id={idNota}
            rows={4}
            className="min-h-[6rem] w-full rounded-[6px] border bg-[var(--cor-fundo)] p-3"
          />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="botao botao-principal" onClick={salvarNota}>
              Salvar
            </button>
            <button type="button" className="botao botao-secundario" onClick={() => setPainel(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {painel === 'descartar' ? (
        <div role="group" aria-labelledby={idPergunta} className="flex flex-col gap-3 border-t pt-4">
          <p id={idPergunta} className="font-semibold">
            Descartar esta sessão?
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="botao botao-principal" onClick={descartar}>
              Descartar
            </button>
            <button
              ref={botaoManter}
              type="button"
              className="botao botao-secundario"
              onClick={() => setPainel(null)}
            >
              Manter
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CorpoDaSessao({ titulo }: { titulo: RefObject<HTMLHeadingElement | null> }) {
  const { estado } = usePrototipo()
  const location = useLocation()
  const vitrine = useVitrine()
  const agora = useAgora(1000)
  const sessao = estado.sessao
  if (!sessao) return null

  const avisar = (location.state as { jaEmAndamento?: boolean } | null)?.jaEmAndamento === true
  const rotulo = ROTULO_SESSAO[sessao.tipo]

  // "Voltar para Hoje" é o primeiro controle da tela, acima do título, nos dois layouts: leva ao
  // Hoje com o foco no h1, sem perguntar nada e sem encerrar; a sessão continua.
  return (
    <>
      <Link
        to="/app/hoje"
        state={{ foco: 'titulo' }}
        tabIndex={vitrine ? -1 : undefined}
        className="sessao-voltar botao botao-secundario self-start"
      >
        Voltar para Hoje
      </Link>

      <h1 ref={titulo} tabIndex={-1} className="sessao-titulo titulo-tela alvo-foco mt-4">
        {`${rotulo} de ${NOME_BEBE}`}
      </h1>
      {avisar ? <p className="sessao-aviso texto-info mt-2">{`Já há uma sessão de ${rotulo} em andamento.`}</p> : null}

      <div className="sessao-campo mt-6">
        <SessaoInfo
          campo={nomeDoCampo('accent', estado.madrugada)}
          cronometro={formatarCronometro(agora - sessao.inicio)}
          hora={formatarHora(sessao.inicio)}
          pessoa={sessao.pessoa}
          atividade={sessao.tipo === 'tummy' ? ATIVIDADE_TUMMY : undefined}
        />
      </div>

      {/* O espaço entre o campo e as ações é de uma ilustração do tipo da sessão. A área cresce
          com o espaço livre (flex-1) e vai a zero antes de empurrar as ações (min-h-0): a figura
          preenche a área, com teto de tamanho médio, e some quando a janela é baixa. No layout
          largo a área é o campo de barro da coluna da direita, com a figura no meio dele. */}
      <div
        data-campo={nomeDoCampo('field-1', estado.madrugada)}
        className="sessao-ilu relative mt-6 min-h-0 flex-1"
      >
        <IlustracaoDaSessao tipo={sessao.tipo} />
      </div>

      <div className="sessao-acoes mt-auto pt-6">
        <AcoesDaSessao />
      </div>
    </>
  )
}

/** Sono: o berço. Tummy time: o tapete. Mamada: a poltrona (a mais próxima). */
function IlustracaoDaSessao({ tipo }: { tipo: TipoSessao }) {
  if (tipo === 'sono') {
    return <IlustracaoBerco className="absolute inset-0 m-auto block h-full max-h-[16rem] w-full max-w-[16rem]" />
  }
  if (tipo === 'tummy') {
    return <IlustracaoTapete className="absolute inset-0 m-auto block h-full max-h-[16rem] w-full max-w-[16rem]" />
  }
  return <IlustracaoMamada className="absolute inset-0 m-auto block h-full max-h-[16rem] w-full max-w-[16rem]" />
}

export function Sessao() {
  const { estado, dispatch } = usePrototipo()
  const vitrine = useVitrine()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const tipoBruto = parametros.get('tipo')
  const tipoDaUrl: TipoSessao | null = ehTipoSessao(tipoBruto) ? tipoBruto : null
  const semSessao = estado.sessao === null
  const location = useLocation()
  const titulo = useRef<HTMLHeadingElement>(null)

  // Chegando por navegação interna (atalhos, "Ver sessão"), o foco vai ao h1 da tela, que é o
  // da sessão ou o do estado vazio. Pela URL (inclusive com ?tipo=), o foco não se move. Num
  // aparelho do Início a tela nunca move o foco.
  const foco = vitrine ? null : focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'titulo') titulo.current?.focus()
  }, [foco, location.key])

  // `?tipo=` só vale uma vez, e só quando não há sessão. Depois de começar, sai da URL e a
  // guarda impede que, ao encerrar, a página comece outra sessão sozinha. O reducer ignora
  // o segundo "iniciar" que o StrictMode provoca. Num aparelho do Início a URL não é da tela.
  const jaIniciouPelaUrl = useRef(false)
  useEffect(() => {
    if (vitrine || jaIniciouPelaUrl.current || !semSessao || !tipoDaUrl) return
    jaIniciouPelaUrl.current = true
    dispatch({ tipo: 'iniciar', sessao: tipoDaUrl, agora: Date.now() })
    void navigate('/app/sessao', { replace: true })
  }, [vitrine, semSessao, tipoDaUrl, dispatch, navigate])

  const iniciandoPelaUrl = !vitrine && semSessao && tipoDaUrl !== null

  // No layout largo as peças da tela ocupam áreas de uma grade (ver .sessao-* em index.css): a
  // ordem do DOM e a do Tab são as mesmas do estreito.
  return (
    <ColunaApp>
      <FaixaPrototipo />

      <main className="sessao-main flex flex-1 flex-col px-4 pb-6 pt-6">
        <div className="sessao-corpo flex w-full flex-1 flex-col">
          {semSessao && !iniciandoPelaUrl ? (
            <>
              <h1 ref={titulo} tabIndex={-1} className="sessao-titulo titulo-tela alvo-foco">
                Nenhuma sessão em andamento
              </h1>
              <div
                data-campo={nomeDoCampo('field-1', estado.madrugada)}
                className="sessao-ilu-vazio -mx-4 mt-6 flex flex-1 items-center justify-center rounded-none px-4 py-10"
              >
                <IlustracaoBerco className="block h-auto w-full max-w-[22rem]" />
              </div>
              <Link
                to="/app/hoje"
                state={{ foco: 'titulo' }}
                tabIndex={vitrine ? -1 : undefined}
                className="sessao-voltar-vazio botao botao-secundario botao-grande mt-6"
              >
                Voltar para Hoje
              </Link>
            </>
          ) : (
            <CorpoDaSessao titulo={titulo} />
          )}
        </div>
      </main>

      <BarraInferior>
        <NavegacaoInferior hojeAtual={false} />
      </BarraInferior>
    </ColunaApp>
  )
}
