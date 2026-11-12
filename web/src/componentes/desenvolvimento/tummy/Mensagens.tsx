import { TT } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import { ALVO_APP } from '../../app/alvo.ts'
import { Botao } from '../../base/Botao.tsx'
import { CHAVE } from './foco.ts'
import type { ErroDoBloco } from './useBlocoTummy.ts'

// As mensagens do bloco: o erro perto do controle (`role="alert"`), a confirmação da ação, o aviso de lista não
// atualizada e o "Salvando…". Nenhuma diz que algo ficou salvo no aparelho.

/** T-53, anunciado uma vez, só enquanto a operação espera a resposta. */
export function EnvioEmCurso({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <p role="status" className="cm-pequeno m-0 font-medium">
      {TT.salvando}
    </p>
  ) : null
}

/**
 * Uma linha do DES-09. O texto fica em `role="alert"` e recebe o foco quando o erro tira o controle da tela
 * (`tabindex="-1"`). "Tentar de novo" só nos erros em que repetir é seguro; "Fechar" só no resultado desconhecido.
 */
export function ErroDeEscrita({ erro, aoTentarDeNovo, aoFechar }: { erro: ErroDoBloco; aoTentarDeNovo: () => void; aoFechar: () => void }) {
  return (
    <div data-erro-de-escrita="" className="flex w-full flex-col items-start gap-3">
      <p
        role="alert"
        tabIndex={-1}
        data-foco={CHAVE.alerta}
        className="m-0 w-full max-w-[65ch] rounded-campo border-2 border-[var(--cor-erro,var(--cor-texto))] bg-[var(--cor-cartao)] px-4 py-3 font-medium text-[var(--cor-texto)] wrap-anywhere"
      >
        {erro.texto}
      </p>
      {erro.repetivel || erro.bloqueia ? (
        <div className="flex flex-wrap items-center gap-3">
          {erro.repetivel ? (
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} onClick={aoTentarDeNovo}>
              {TT.tentarDeNovo}
            </Botao>
          ) : null}
          {erro.bloqueia ? (
            <Botao variante="texto" tamanho="app" className={ALVO_APP} onClick={aoFechar}>
              {TT.fechar}
            </Botao>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** T-16 a T-19 e T-65: a confirmação fica até "Fechar" ou até a próxima ação, sem mover o foco. */
export function FaixaDeConfirmacao({
  texto,
  comDesfazer,
  aoDesfazer,
  aoFechar,
}: {
  texto: string
  comDesfazer: boolean
  aoDesfazer: () => void
  aoFechar: () => void
}) {
  return (
    <div role="status" data-confirmacao="" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-2">
      <p className="m-0 font-medium wrap-anywhere">{texto}</p>
      <div className="flex flex-wrap items-center gap-2">
        {comDesfazer ? (
          <Botao variante="texto" tamanho="app" className={ALVO_APP} data-foco={CHAVE.desfazer} onClick={aoDesfazer}>
            {TT.desfazer}
          </Botao>
        ) : null}
        <Botao variante="texto" tamanho="app" className={ALVO_APP} onClick={aoFechar}>
          {TT.fechar}
        </Botao>
      </div>
    </div>
  )
}

/** T-52: a gravação respondeu, mas a releitura falhou; a lista na tela pode estar desatualizada. */
export function AvisoDeListaAntiga({ aoAtualizar }: { aoAtualizar: () => void }) {
  return (
    <div role="status" data-lista-antiga="" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-2">
      <p className="m-0 font-medium wrap-anywhere">{TT.salvoSemAtualizar}</p>
      <Botao variante="texto" tamanho="app" className={ALVO_APP} onClick={aoAtualizar}>
        {TT.atualizar}
      </Botao>
    </div>
  )
}
