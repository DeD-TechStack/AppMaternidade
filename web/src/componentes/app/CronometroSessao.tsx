import { useEffect, useId, useRef, useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { COMUM, SESSAO, SESSOES } from '../../conteudo/rotina.ts'
import { Botao } from '../base/Botao.tsx'
import { ALVO_APP } from './alvo.ts'
import { LIMITE_DA_SESSAO_CURTA_MS } from './PerguntaSessaoCurta.tsx'
import { recuoOptico } from './recuoOptico.ts'
import { TextoDoCronometro } from './TextoDoCronometro.tsx'
import { tamanhoDoCronometro } from '../../prototipo/formatar.ts'

// `curta`: a pergunta de uma sessão com menos de 1 minuto (QA-10); `origem` diz qual botão a abriu.
type Painel = 'nota' | 'descartar' | 'curta'
type Origem = 'encerrar' | 'anotar'

interface Props {
  /** "mm:ss" ou "h:mm:ss", já formatado. O leitor de tela lê o tempo inteiro. */
  cronometro: string
  /** Quanto a sessão já durou, em ms. Abaixo de 1 minuto, "Encerrar" e "Encerrar e anotar" perguntam antes (QA-10). */
  decorridoMs?: number
  atividade?: string
  /** Encerrar a sessão com o texto da nota já cortado nas pontas; `''` encerra sem nota. */
  aoEncerrar: (nota: string) => void
  aoDescartar: () => void
  /** Quais ações a pessoa pode fazer nesta sessão (matriz de papéis); a que não pode não aparece. */
  acoes?: { encerrar: boolean; descartar: boolean }
  /** Uma escrita em curso: as ações ficam com `aria-disabled="true"` e o toque não faz nada. */
  ocupado?: boolean
  className?: string
}

// A nota cabe em 500 caracteres depois de cortar as pontas (o limite do banco).
const LIMITE_DA_NOTA = 500

// O tamanho do número cai com 8 ou mais caracteres ("10:00:00"): os algarismos são tabulares, então a
// largura só depende de quantos são.
const TAMANHO = {
  normal: 'text-[72px] lg:text-[160px]',
  longo: 'text-[56px] lg:text-[120px]',
} as const

/**
 * O cartão do cronômetro da Sessão: o mesmo campo do CartaoSessao do Hoje (mel de dia, cartão da noite na
 * madrugada), o tempo em Literata grande e as ações: Encerrar (o primário), Encerrar e anotar (contorno) e
 * Descartar (texto). A nota e a pergunta de descartar abrem no próprio cartão, abaixo das ações: o foco
 * entra no painel ao abrir e volta ao botão que o abriu ao fechar (também com Esc).
 */
export function CronometroSessao({
  cronometro,
  decorridoMs,
  atividade,
  aoEncerrar,
  aoDescartar,
  acoes = { encerrar: true, descartar: true },
  ocupado = false,
  className,
}: Props) {
  const idRotulo = useId()
  const idCampo = useId()
  const idDica = useId()
  const idErro = useId()
  const idPergunta = useId()
  const idCurta = useId()
  const [painel, setPainel] = useState<Painel | null>(null)
  const [erroDaNota, setErroDaNota] = useState<string | null>(null)
  const painelAnterior = useRef<Painel | null>(null)
  const origemDaCurta = useRef<Origem>('encerrar')
  const cartao = useRef<HTMLElement>(null)
  const campoNota = useRef<HTMLTextAreaElement>(null)

  // O foco acompanha o painel: entra nele ao abrir e volta ao botão que o abriu ao fechar.
  useEffect(() => {
    const acao = (nome: string) => cartao.current?.querySelector<HTMLElement>(`[data-acao="${nome}"]`)
    if (painel === 'nota') campoNota.current?.focus()
    else if (painel === 'descartar') acao('manter')?.focus()
    else if (painel === 'curta') acao('salvar-curta')?.focus()
    else if (painelAnterior.current === 'nota') acao('anotar')?.focus()
    else if (painelAnterior.current === 'descartar') acao('descartar')?.focus()
    else if (painelAnterior.current === 'curta') acao(origemDaCurta.current)?.focus()
    painelAnterior.current = painel
  }, [painel])

  // Menos de 1 minuto: os dois botões de encerrar perguntam antes (QA-10). Com 1 minuto ou mais, nada muda.
  const sessaoCurta = decorridoMs !== undefined && decorridoMs < LIMITE_DA_SESSAO_CURTA_MS

  function tocarEncerrar() {
    if (sessaoCurta) {
      origemDaCurta.current = 'encerrar'
      setPainel('curta')
    } else {
      aoEncerrar('')
    }
  }

  function tocarAnotar() {
    if (sessaoCurta) {
      origemDaCurta.current = 'anotar'
      setPainel('curta')
    } else {
      setPainel('nota')
    }
  }

  // "Salvar" na pergunta segue o caminho normal do botão que a abriu: encerrar de uma vez, ou abrir a nota.
  function salvarMesmoCurta() {
    if (ocupado) return
    if (origemDaCurta.current === 'anotar') setPainel('nota')
    else aoEncerrar('')
  }

  // A nota é validada antes da 1ª chamada: acima de 500, a mensagem fica no campo, nada é enviado e a
  // sessão continua em andamento, com o texto no campo para corrigir.
  function salvarNota() {
    if (ocupado) return
    const texto = (campoNota.current?.value ?? '').trim()
    if (texto.length > LIMITE_DA_NOTA) {
      setErroDaNota(SESSOES.notaLonga)
      campoNota.current?.focus()
      return
    }
    setErroDaNota(null)
    aoEncerrar(texto)
  }

  // Esc fecha o painel aberto (a nota ou a pergunta); o efeito acima devolve o foco ao botão que o abriu.
  useEffect(() => {
    if (!painel) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setPainel(null)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [painel])

  // A nota cresce com o texto, sem a alça de redimensionar: `field-sizing: content` onde existe e, onde
  // não existe, a altura acompanha o conteúdo a cada tecla. Só aparência: o texto e o estado não mudam.
  function ajustarAltura() {
    const campo = campoNota.current
    if (!campo || (typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content'))) return
    campo.style.height = 'auto'
    campo.style.height = `${campo.scrollHeight}px`
  }

  // O fundo do cartão: com o botão de texto Descartar por último (alvo de 56 px na madrugada, com o
  // próprio respiro), o padding de baixo encolhe para o espaço sob as ações não sobrar.
  const fundo = painel === null ? 'pb-3' : 'pb-6'

  return (
    <section
      ref={cartao}
      aria-labelledby={idRotulo}
      data-andamento=""
      className={`rounded-cartao bg-(--cor-campo-sessao) px-6 pt-6 ${fundo} text-(--cor-numero-sessao) [border:var(--borda-campo)] lg:p-12 ${className ?? ''}`}
    >
      <p id={idRotulo} className="text-[15px] leading-[22px] font-medium">
        Duração da sessão
      </p>
      {/* `data-cronometro` mora nos dígitos: é por ele que o medidor acha o cronômetro. */}
      <div
        role="timer"
        aria-live="off"
        aria-labelledby={idRotulo}
        data-cronometro=""
        data-tamanho={tamanhoDoCronometro(cronometro)}
        className={`t-cronometro mt-2 font-titulo leading-none font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums ${TAMANHO[tamanhoDoCronometro(cronometro)]} ${recuoOptico(cronometro)}`}
      >
        <TextoDoCronometro tempo={cronometro} />
      </div>
      {atividade ? <p className="mt-4 text-[17px] leading-[25px]">{`Atividade sugerida: ${atividade}`}</p> : null}

      {/* Com a nota aberta, o "Salvar" dela é o primário: o Encerrar e o Encerrar e anotar saem e o painel
          fica logo abaixo do tempo, antes do Descartar (a ordem do Tab segue a da tela). */}
      {painel === 'nota' ? (
        <div
          role="group"
          aria-label="Encerrar e anotar"
          data-painel-sessao="nota"
          className="-mx-2 mt-6 rounded-campo bg-(--cor-fundo) p-4 text-(--cor-texto) sm:mx-0 lg:mt-8 lg:p-6"
        >
          <label htmlFor={idCampo} className="block font-medium">
            Nota
          </label>
          <p id={idDica} className="mt-0.5 text-[15px] leading-[22px] text-(--cor-texto-2)">
            O que a família precisa saber sobre esta sessão.
          </p>
          <textarea
            ref={campoNota}
            id={idCampo}
            rows={3}
            aria-describedby={erroDaNota ? `${idErro} ${idDica}` : idDica}
            aria-invalid={erroDaNota ? true : undefined}
            readOnly={ocupado}
            onInput={ajustarAltura}
            data-sem-alca=""
            className="mt-3 block min-h-[6rem] w-full resize-none field-sizing-content rounded-campo border-[1.5px] border-(--cor-texto-2) bg-(--cor-cartao) px-4 py-3 text-[17px] leading-[25px] text-(--cor-texto) hover:border-(--cor-texto) focus-visible:border-(--cor-texto)"
          />
          {erroDaNota ? (
            <p id={idErro} className="mt-2 text-[15px] leading-[22px] font-medium" data-erro-da-nota="">
              {erroDaNota}
            </p>
          ) : null}
          {/* Salvar, Cancelar e Descartar numa fileira só: Descartar é botão de texto ao lado do Salvar, e
              não fica mais solto no pé do cartão (a ordem do Tab é a mesma de antes). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-3" data-acoes-nota="">
            <Botao tamanho="app" className={`px-5 sm:min-w-[8.5rem] ${ALVO_APP}`} desativado={ocupado} onClick={salvarNota}>
              {ocupado ? COMUM.salvando : COMUM.salvar}
            </Botao>
            <Botao variante="texto" tamanho="app" className={`mx-0 px-2 sm:px-3 ${ALVO_APP}`} onClick={() => setPainel(null)}>
              Cancelar
            </Botao>
            {acoes.descartar ? (
              <Botao
                variante="texto"
                tamanho="app"
                className={`mx-0 px-2 sm:px-3 ${ALVO_APP}`}
                data-acao="descartar"
                onClick={() => setPainel('descartar')}
              >
                Descartar
              </Botao>
            ) : null}
          </div>
        </div>
      ) : null}

      {painel !== 'nota' && painel !== 'curta' ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:mt-10" data-acoes="">
          {acoes.encerrar ? (
            <Botao
              tamanho="app"
              className={`w-full sm:w-auto sm:min-w-[8.5rem] ${ALVO_APP}`}
              desativado={ocupado}
              data-acao="encerrar"
              onClick={tocarEncerrar}
            >
              Encerrar
            </Botao>
          ) : null}
          {acoes.encerrar ? (
            <Botao
              variante="contorno"
              tamanho="app"
              className={`w-full sm:w-auto ${ALVO_APP}`}
              icone={<NotebookPen />}
              data-acao="anotar"
              onClick={tocarAnotar}
            >
              <span>Encerrar e anotar</span>
            </Botao>
          ) : null}
          {painel !== 'descartar' && acoes.descartar ? (
            <Botao
              variante="texto"
              tamanho="app"
              className={`w-full sm:w-auto ${ALVO_APP}`}
              data-acao="descartar"
              onClick={() => setPainel('descartar')}
            >
              Descartar
            </Botao>
          ) : null}
        </div>
      ) : null}

      {painel === 'curta' ? (
        <div
          role="group"
          aria-labelledby={idCurta}
          data-painel-sessao="curta"
          className="mt-6 rounded-campo bg-(--cor-fundo) p-4 text-(--cor-texto) lg:p-6"
        >
          <p id={idCurta} className="font-medium">
            {SESSAO.curtaPergunta}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Botao tamanho="app" className={ALVO_APP} desativado={ocupado} data-acao="salvar-curta" onClick={salvarMesmoCurta}>
              {SESSAO.curtaSalvar}
            </Botao>
            {acoes.descartar ? (
              <Botao variante="contorno" tamanho="app" className={ALVO_APP} desativado={ocupado} onClick={aoDescartar}>
                {SESSAO.curtaDescartar}
              </Botao>
            ) : null}
          </div>
        </div>
      ) : null}

      {painel === 'descartar' ? (
        <div
          role="group"
          aria-labelledby={idPergunta}
          data-painel-sessao="descartar"
          className="mt-6 rounded-campo bg-(--cor-fundo) p-4 text-(--cor-texto) lg:p-6"
        >
          <p id={idPergunta} className="font-medium">
            Descartar esta sessão?
          </p>
          <p className="mt-0.5 text-[15px] leading-[22px] text-(--cor-texto-2)">O tempo não vai para o dia nem para o histórico.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} desativado={ocupado} onClick={aoDescartar}>
              Descartar
            </Botao>
            <Botao variante="texto" tamanho="app" className={ALVO_APP} data-acao="manter" onClick={() => setPainel(null)}>
              Manter
            </Botao>
          </div>
        </div>
      ) : null}
    </section>
  )
}
