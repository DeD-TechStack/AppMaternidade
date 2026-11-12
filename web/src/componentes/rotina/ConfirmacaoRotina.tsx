import { Check, Undo2 } from 'lucide-react'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import type { AcaoDaConfirmacao, ConfirmacaoDaRotina } from './contexto.ts'

interface Props {
  confirmacao: ConfirmacaoDaRotina | null
  aoAcionar: (acao: AcaoDaConfirmacao) => void
}

// A região fica no DOM mesmo vazia, para o leitor de tela anunciar o que entrar nela. Não some sozinha
// (WCAG 2.2.1): só sai quando a pessoa fecha ou faz outro registro. Nunca recebe o foco: quem aciona uma
// ação (que some junto) tem o foco levado pela barra a um controle que continua na tela. É a única região
// `role="status"` da tela.
export function ConfirmacaoRotina({ confirmacao, aoAcionar }: Props) {
  return (
    <div role="status" className={confirmacao ? 'flex flex-wrap items-center gap-3' : undefined}>
      {confirmacao ? (
        <>
          <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-mel text-cacau">
            <Check className="size-5" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-[17px] leading-[25px] font-medium wrap-anywhere">{confirmacao.texto}</p>
          {confirmacao.textoDaNota ? (
            <p className="basis-full rounded-campo bg-(--cor-papel-fundo) px-4 py-3 wrap-anywhere" data-texto-da-nota="">
              {confirmacao.textoDaNota}
            </p>
          ) : null}
          <div className="flex basis-full flex-wrap gap-2 sm:basis-auto">
            {confirmacao.acoes.map((acao) => (
              <Botao
                key={acao.chave}
                variante={acao.chave === 'fechar' ? 'texto' : 'contorno'}
                tamanho="app"
                icone={acao.chave === 'desfazer' ? <Undo2 /> : undefined}
                className={`flex-1 sm:flex-none ${ALVO_APP}`}
                onClick={() => aoAcionar(acao)}
              >
                {acao.chave === 'desfazer' ? <span>{acao.rotulo}</span> : acao.rotulo}
              </Botao>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
