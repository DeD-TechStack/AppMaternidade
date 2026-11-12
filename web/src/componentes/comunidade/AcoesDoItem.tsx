import { Link } from 'react-router'
import { TOPICO } from '../../conteudo/comunidade.ts'

/**
 * Uma ação do menu do item. Com `para`, é um link (a entrada na comunidade, a edição do tópico); com
 * `aoClicar`, é um botão que entrega o próprio elemento: o foco volta a ele quando a caixa fecha.
 */
export type Acao = { para: string } | { aoClicar: (origem: HTMLElement) => void }

interface BotaoProps {
  id: string
  rotulo: string
  acao: Acao
}

const CLASSE = 'cm-botao cm-botao-texto alvo-toque'

function BotaoDeAcao({ id, rotulo, acao }: BotaoProps) {
  if ('para' in acao) {
    return (
      <Link id={id} to={acao.para} className={CLASSE}>
        {rotulo}
      </Link>
    )
  }
  return (
    <button id={id} type="button" className={CLASSE} onClick={(evento) => acao.aoClicar(evento.currentTarget)}>
      {rotulo}
    </button>
  )
}

interface AcoesProps {
  /** Dá o `id` de cada botão: `acao-<ação>-<item>`. */
  item: string
  editar?: Acao
  /** "Responder a <apelido>" (só na resposta de primeiro nível). */
  responder?: { rotulo: string; acao: Acao }
  denunciar?: Acao
  denunciarPerfil?: Acao
  bloquear?: { rotulo: string; acao: Acao }
}

/** O menu do item: o que a pessoa pode fazer com ele. Cada ação que não cabe simplesmente não aparece. */
export function AcoesDoItem({ item, editar, responder, denunciar, denunciarPerfil, bloquear }: AcoesProps) {
  if (!editar && !responder && !denunciar && !denunciarPerfil && !bloquear) return null
  return (
    <div role="group" aria-label={TOPICO.acoes} className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {responder ? <BotaoDeAcao id={`acao-responder-${item}`} rotulo={responder.rotulo} acao={responder.acao} /> : null}
      {editar ? <BotaoDeAcao id={`acao-editar-${item}`} rotulo={TOPICO.editar} acao={editar} /> : null}
      {denunciar ? <BotaoDeAcao id={`acao-denunciar-${item}`} rotulo={TOPICO.denunciar} acao={denunciar} /> : null}
      {denunciarPerfil ? (
        <BotaoDeAcao id={`acao-denunciar-perfil-${item}`} rotulo={TOPICO.denunciarPerfil} acao={denunciarPerfil} />
      ) : null}
      {bloquear ? <BotaoDeAcao id={`acao-bloquear-${item}`} rotulo={bloquear.rotulo} acao={bloquear.acao} /> : null}
    </div>
  )
}
