import { useEffect, useId, useRef, useState } from 'react'
import { Botao } from '../componentes/base/Botao.tsx'
import { tamanhoDoCronometro } from './formatar.ts'

type Painel = 'nota' | 'descartar'

interface Props {
  /** "mm:ss" ou "h:mm:ss", já formatado. O leitor de tela lê o tempo inteiro. */
  cronometro: string
  atividade?: string
  /** Encerrar a sessão; `comNota` é verdadeiro quando a nota salva tem texto. */
  aoEncerrar: (comNota: boolean) => void
  aoDescartar: () => void
}

const ALVO = 'alvo-toque'

/**
 * O bloco do cronômetro da Sessão (EMENDAS E5, bloco 2): o campo de cor com a duração em número
 * enorme à esquerda (c1–c7) e, à direita (c8–c10), os botões: Encerrar (o único primário), Encerrar e
 * anotar e Descartar (moldura dupla). O painel da nota e a pergunta de descartar abrem no lugar dos
 * dois botões secundários, na mesma coluna: o foco entra no painel ao abrir e volta ao botão que o
 * abriu ao fechar. Encerrar, salvar e descartar tiram a tela do ar (quem chama navega ao Hoje).
 */
export function BlocoCronometro({ cronometro, atividade, aoEncerrar, aoDescartar }: Props) {
  const idRotulo = useId()
  const idCampo = useId()
  const idPergunta = useId()
  const [painel, setPainel] = useState<Painel | null>(null)
  const painelAnterior = useRef<Painel | null>(null)
  const secundarios = useRef<HTMLDivElement>(null)
  const campoNota = useRef<HTMLTextAreaElement>(null)

  // O foco acompanha o painel: entra nele ao abrir e volta ao botão que o abriu ao fechar.
  useEffect(() => {
    const acao = (nome: string) => secundarios.current?.querySelector<HTMLElement>(`[data-acao="${nome}"]`)
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

  return (
    <section
      aria-labelledby={idRotulo}
      data-andamento=""
      className="sb-area sb-mt-fio-bloco ha-andamento ha-cronometro"
    >
      <div className="ha-cron-grade">
        <div className="ha-cron-tempo">
          <p id={idRotulo} className="ha-cron-rotulo t-rotulo">
            Duração da sessão
          </p>
          {/* O `data-cronometro` mora no elemento dos dígitos: é por ele que o medidor (NUM) acha o
              cronômetro e confere Zilla Slab, a face carregada e `lining-nums`. */}
          <div
            role="timer"
            aria-live="off"
            aria-labelledby={idRotulo}
            data-cronometro=""
            data-tamanho={tamanhoDoCronometro(cronometro)}
            className="ha-cron-valor t-cronometro"
          >
            {cronometro}
          </div>
          {atividade ? <p className="ha-cron-atividade t-corpo">{`Atividade sugerida: ${atividade}`}</p> : null}
        </div>

        <div className="ha-cron-acoes">
          <Botao className={`ha-encerrar ${ALVO}`} onClick={() => aoEncerrar(false)}>
            Encerrar
          </Botao>

          <div ref={secundarios} className="ha-cron-secundarios">
            {painel !== 'nota' ? (
              <Botao variante="moldura" alto className={ALVO} data-acao="anotar" onClick={() => setPainel('nota')}>
                Encerrar e anotar
              </Botao>
            ) : null}
            {painel !== 'descartar' ? (
              <Botao
                variante="moldura"
                alto
                className={ALVO}
                data-acao="descartar"
                onClick={() => setPainel('descartar')}
              >
                Descartar
              </Botao>
            ) : null}

            {painel === 'nota' ? (
              <div role="group" aria-label="Encerrar e anotar" className="ha-cron-painel">
                <label htmlFor={idCampo} className="t-rotulo">
                  Nota
                </label>
                <textarea ref={campoNota} id={idCampo} rows={3} className="ha-nota-campo min-h-[6rem] w-full" />
                <div className="ha-cron-painel-acoes">
                  <Botao variante="moldura" alto className={ALVO} onClick={salvarNota}>
                    Salvar
                  </Botao>
                  <Botao variante="moldura" alto className={ALVO} onClick={() => setPainel(null)}>
                    Cancelar
                  </Botao>
                </div>
              </div>
            ) : null}

            {painel === 'descartar' ? (
              <div role="group" aria-labelledby={idPergunta} className="ha-cron-painel">
                <p id={idPergunta} className="t-corpo">
                  Descartar esta sessão?
                </p>
                <div className="ha-cron-painel-acoes">
                  <Botao variante="moldura" alto className={ALVO} onClick={aoDescartar}>
                    Descartar
                  </Botao>
                  <Botao variante="moldura" alto className={ALVO} data-acao="manter" onClick={() => setPainel(null)}>
                    Manter
                  </Botao>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
