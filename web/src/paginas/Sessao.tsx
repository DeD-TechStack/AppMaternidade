import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ColunaApp } from '../componentes/ColunaApp.tsx'
import { BarraInferior } from '../prototipo/BarraInferior.tsx'
import { FaixaPrototipo } from '../prototipo/FaixaPrototipo.tsx'
import { NavegacaoInferior } from '../prototipo/NavegacaoInferior.tsx'
import { SessaoInfo } from '../prototipo/SessaoInfo.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
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

  function encerrar(comNota: boolean) {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota })
    void navigate('/app/hoje')
  }

  function salvarNota() {
    // O texto da nota não é guardado nem mostrado: o protótipo só registra que ela existe.
    const comNota = (campoNota.current?.value.trim() ?? '') !== ''
    encerrar(comNota)
  }

  function descartar() {
    dispatch({ tipo: 'descartar' })
    void navigate('/app/hoje')
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

function CorpoDaSessao() {
  const { estado } = usePrototipo()
  const location = useLocation()
  const agora = useAgora(1000)
  const sessao = estado.sessao
  if (!sessao) return null

  const avisar = (location.state as { jaEmAndamento?: boolean } | null)?.jaEmAndamento === true
  const rotulo = ROTULO_SESSAO[sessao.tipo]

  return (
    <>
      <h1 className="titulo-tela">{`${rotulo} de ${NOME_BEBE}`}</h1>
      {avisar ? <p className="texto-info mt-2">{`Já há uma sessão de ${rotulo} em andamento.`}</p> : null}

      <div className="mt-6">
        <SessaoInfo
          cronometro={formatarCronometro(agora - sessao.inicio)}
          hora={formatarHora(sessao.inicio)}
          pessoa={sessao.pessoa}
          atividade={sessao.tipo === 'tummy' ? 'Espelho no chão' : undefined}
        />
      </div>

      <div className="mt-auto pt-10">
        <AcoesDaSessao />
      </div>
    </>
  )
}

export function Sessao() {
  const { estado, dispatch } = usePrototipo()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const tipoBruto = parametros.get('tipo')
  const tipoDaUrl: TipoSessao | null = ehTipoSessao(tipoBruto) ? tipoBruto : null
  const semSessao = estado.sessao === null

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
      <FaixaPrototipo />

      <main className="flex flex-1 flex-col px-4 pb-6 pt-6">
        <div className="flex w-full flex-1 flex-col">
          {semSessao && !iniciandoPelaUrl ? (
            <>
              <h1 className="titulo-tela">Nenhuma sessão em andamento</h1>
              <p className="mt-4">
                <Link to="/app/hoje" className="alvo-toque inline-flex items-center">
                  Voltar para Hoje
                </Link>
              </p>
            </>
          ) : (
            <CorpoDaSessao />
          )}
        </div>
      </main>

      <BarraInferior>
        <NavegacaoInferior hojeAtual={false} />
      </BarraInferior>
    </ColunaApp>
  )
}
