import { useEffect, useId, useRef } from 'react'
import { SESSAO } from '../../conteudo/rotina.ts'
import { Botao } from '../base/Botao.tsx'
import { Pilha } from '../base/layout/index.ts'
import { ALVO_APP } from './alvo.ts'

/** Menos que isto, encerrar pergunta antes (QA-10). */
export const LIMITE_DA_SESSAO_CURTA_MS = 60_000

/** Se a sessão que começou em `inicio` ainda não chegou a 1 minuto em `agora` (ambos em ms). */
export const sessaoCurta = (agora: number, inicio: number) => agora - inicio < LIMITE_DA_SESSAO_CURTA_MS

interface Props {
  /** Segue o encerramento normal da sessão. */
  aoSalvar: () => void
  aoDescartar: () => void
  /** Quem não pode descartar (matriz de papéis) vê só "Salvar". */
  podeDescartar: boolean
  /** Uma escrita em curso: os botões ficam com `aria-disabled="true"` e o toque não faz nada. */
  ocupado?: boolean
  /** Com ele, Esc fecha a pergunta; quem a abriu devolve o foco ao botão de origem. */
  aoFechar?: () => void
  className?: string
}

/**
 * A pergunta de uma sessão com menos de 1 minuto (QA-10), no mesmo painel em linha do cronômetro da Sessão:
 * o foco entra em "Salvar" ao abrir. Quem a abre decide onde o foco volta ao fechar.
 */
export function PerguntaSessaoCurta({ aoSalvar, aoDescartar, podeDescartar, ocupado = false, aoFechar, className }: Props) {
  const idPergunta = useId()
  const painel = useRef<HTMLDivElement>(null)

  // O Botao não repassa `ref`: o foco entra em "Salvar" pelo `data-acao`, como no cronômetro da Sessão.
  useEffect(() => {
    painel.current?.querySelector<HTMLElement>('[data-acao="salvar-curta"]')?.focus()
  }, [])

  useEffect(() => {
    if (!aoFechar) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar?.()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <div
      ref={painel}
      role="group"
      aria-labelledby={idPergunta}
      data-painel-sessao="curta"
      className={`rounded-campo bg-(--cor-fundo) p-4 text-(--cor-texto) lg:p-6 ${className ?? ''}`}
    >
      <Pilha vao="pilha">
        <p id={idPergunta} className="font-medium">
          {SESSAO.curtaPergunta}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Botao tamanho="app" className={ALVO_APP} desativado={ocupado} data-acao="salvar-curta" onClick={aoSalvar}>
            {SESSAO.curtaSalvar}
          </Botao>
          {podeDescartar ? (
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} desativado={ocupado} onClick={aoDescartar}>
              {SESSAO.curtaDescartar}
            </Botao>
          ) : null}
        </div>
      </Pilha>
    </div>
  )
}
