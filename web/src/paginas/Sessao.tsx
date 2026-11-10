import { useEffect, useRef, useState, type RefObject } from 'react'
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

type Painel = 'nota' | 'descartar'

function AcoesDaSessao() {
  const { dispatch } = usePrototipo()
  const navigate = useNavigate()
  const [painel, setPainel] = useState<Painel | null>(null)
  const painelAnterior = useRef<Painel | null>(null)
  const campoNota = useRef<HTMLTextAreaElement>(null)
  const botaoManter = useRef<HTMLButtonElement>(null)
  const botaoAnotar = useRef<HTMLButtonElement>(null)
  const botaoDescartar = useRef<HTMLButtonElement>(null)

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

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className="botao botao-principal botao-grande" onClick={() => encerrar(false)}>
        Encerrar
      </button>

      <div className="flex flex-wrap gap-3">
        {painel !== 'nota' ? (
          <button
            ref={botaoAnotar}
            type="button"
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
            className="botao botao-secundario"
            onClick={() => setPainel('descartar')}
          >
            Descartar
          </button>
        ) : null}
      </div>

      {painel === 'nota' ? (
        <div role="group" aria-label="Encerrar e anotar" className="flex flex-col gap-3 border-t pt-4">
          <label htmlFor="campo-nota" className="rotulo">
            Nota
          </label>
          <textarea
            ref={campoNota}
            id="campo-nota"
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
        <div role="group" aria-labelledby="pergunta-descartar" className="flex flex-col gap-3 border-t pt-4">
          <p id="pergunta-descartar" className="font-semibold">
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
  const agora = useAgora(1000)
  const sessao = estado.sessao
  if (!sessao) return null

  const avisar = (location.state as { jaEmAndamento?: boolean } | null)?.jaEmAndamento === true
  const rotulo = ROTULO_SESSAO[sessao.tipo]

  return (
    <>
      <h1 ref={titulo} tabIndex={-1} className="titulo-tela alvo-foco">
        {`${rotulo} de ${NOME_BEBE}`}
      </h1>
      {avisar ? <p className="texto-info mt-2">{`Já há uma sessão de ${rotulo} em andamento.`}</p> : null}

      <div className="mt-6">
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
          preenche a área, com teto de tamanho médio, e some quando a janela é baixa. */}
      <div className="relative mt-6 min-h-0 flex-1">
        <IlustracaoDaSessao tipo={sessao.tipo} />
      </div>

      <div className="mt-auto pt-6">
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
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const tipoBruto = parametros.get('tipo')
  const tipoDaUrl: TipoSessao | null = ehTipoSessao(tipoBruto) ? tipoBruto : null
  const semSessao = estado.sessao === null
  const location = useLocation()
  const titulo = useRef<HTMLHeadingElement>(null)

  // Chegando por navegação interna (atalhos, "Ver sessão"), o foco vai ao h1 da tela, que é o
  // da sessão ou o do estado vazio. Pela URL (inclusive com ?tipo=), o foco não se move.
  const foco = focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'titulo') titulo.current?.focus()
  }, [foco, location.key])

  // `?tipo=` só vale uma vez, e só quando não há sessão. Depois de começar, sai da URL e a
  // guarda impede que, ao encerrar, a página comece outra sessão sozinha. O reducer ignora
  // o segundo "iniciar" que o StrictMode provoca.
  const jaIniciouPelaUrl = useRef(false)
  useEffect(() => {
    if (jaIniciouPelaUrl.current || !semSessao || !tipoDaUrl) return
    jaIniciouPelaUrl.current = true
    dispatch({ tipo: 'iniciar', sessao: tipoDaUrl, agora: Date.now() })
    void navigate('/app/sessao', { replace: true })
  }, [semSessao, tipoDaUrl, dispatch, navigate])

  const iniciandoPelaUrl = semSessao && tipoDaUrl !== null

  return (
    <ColunaApp>
      {/* O <header> da faixa não é o banner do site (esse é o cabeçalho do Layout): a seção o tira
          da conta dos marcos de página. */}
      <section aria-label="Aviso do protótipo">
        <FaixaPrototipo />
      </section>

      <main className="flex flex-1 flex-col px-4 pb-6 pt-6">
        <div className="flex w-full flex-1 flex-col">
          {semSessao && !iniciandoPelaUrl ? (
            <>
              <h1 ref={titulo} tabIndex={-1} className="titulo-tela alvo-foco">
                Nenhuma sessão em andamento
              </h1>
              <div
                data-campo={nomeDoCampo('field-1', estado.madrugada)}
                className="-mx-4 mt-6 flex flex-1 items-center justify-center rounded-none px-4 py-10"
              >
                <IlustracaoBerco className="block h-auto w-full max-w-[22rem]" />
              </div>
              <Link
                to="/app/hoje"
                state={{ foco: 'titulo' }}
                className="botao botao-secundario botao-grande mt-6"
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
