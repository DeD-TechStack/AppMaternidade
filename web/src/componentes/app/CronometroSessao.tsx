import { useEffect, useId, useRef, useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { Botao } from '../base/Botao.tsx'
import { ALVO_APP } from './alvo.ts'
import { recuoOptico } from './recuoOptico.ts'
import { tamanhoDoCronometro } from '../../prototipo/formatar.ts'

type Painel = 'nota' | 'descartar'

interface Props {
  /** "mm:ss" ou "h:mm:ss", já formatado. O leitor de tela lê o tempo inteiro. */
  cronometro: string
  atividade?: string
  /** Encerrar a sessão; `comNota` é verdadeiro quando a nota salva tem texto. */
  aoEncerrar: (comNota: boolean) => void
  aoDescartar: () => void
  className?: string
}

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
export function CronometroSessao({ cronometro, atividade, aoEncerrar, aoDescartar, className }: Props) {
  const idRotulo = useId()
  const idCampo = useId()
  const idDica = useId()
  const idPergunta = useId()
  const [painel, setPainel] = useState<Painel | null>(null)
  const painelAnterior = useRef<Painel | null>(null)
  const cartao = useRef<HTMLElement>(null)
  const campoNota = useRef<HTMLTextAreaElement>(null)

  // O foco acompanha o painel: entra nele ao abrir e volta ao botão que o abriu ao fechar.
  useEffect(() => {
    const acao = (nome: string) => cartao.current?.querySelector<HTMLElement>(`[data-acao="${nome}"]`)
    if (painel === 'nota') campoNota.current?.focus()
    else if (painel === 'descartar') acao('manter')?.focus()
    else if (painelAnterior.current === 'nota') acao('anotar')?.focus()
    else if (painelAnterior.current === 'descartar') acao('descartar')?.focus()
    painelAnterior.current = painel
  }, [painel])

  function salvarNota() {
    // O texto da nota não é guardado nem mostrado: o protótipo só registra que ela existe.
    aoEncerrar((campoNota.current?.value.trim() ?? '') !== '')
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
        {cronometro}
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
            aria-describedby={idDica}
            onInput={ajustarAltura}
            data-sem-alca=""
            className="mt-3 block min-h-[6rem] w-full resize-none field-sizing-content rounded-campo border-[1.5px] border-(--cor-texto-2) bg-(--cor-cartao) px-4 py-3 text-[17px] leading-[25px] text-(--cor-texto) hover:border-(--cor-texto) focus-visible:border-(--cor-texto)"
          />
          {/* Salvar, Cancelar e Descartar numa fileira só: Descartar é botão de texto ao lado do Salvar, e
              não fica mais solto no pé do cartão (a ordem do Tab é a mesma de antes). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-3" data-acoes-nota="">
            <Botao tamanho="app" className={`px-5 sm:min-w-[8.5rem] ${ALVO_APP}`} onClick={salvarNota}>
              Salvar
            </Botao>
            <Botao variante="texto" tamanho="app" className={`mx-0 px-2 sm:px-3 ${ALVO_APP}`} onClick={() => setPainel(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="texto"
              tamanho="app"
              className={`mx-0 px-2 sm:px-3 ${ALVO_APP}`}
              data-acao="descartar"
              onClick={() => setPainel('descartar')}
            >
              Descartar
            </Botao>
          </div>
        </div>
      ) : null}

      {painel !== 'nota' ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:mt-10" data-acoes="">
          <Botao tamanho="app" className={`w-full sm:w-auto sm:min-w-[8.5rem] ${ALVO_APP}`} onClick={() => aoEncerrar(false)}>
            Encerrar
          </Botao>
          <Botao
            variante="contorno"
            tamanho="app"
            className={`w-full sm:w-auto ${ALVO_APP}`}
            icone={<NotebookPen />}
            data-acao="anotar"
            onClick={() => setPainel('nota')}
          >
            <span>Encerrar e anotar</span>
          </Botao>
          {painel !== 'descartar' ? (
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
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} onClick={aoDescartar}>
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
