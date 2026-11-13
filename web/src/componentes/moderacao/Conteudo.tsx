import { Link } from 'react-router'
import { COMUM_COMUNIDADE, ROTULO_FAIXA } from '../../conteudo/comunidade.ts'
import { AUDITORIA, COMUM_MODERACAO, CONTEUDO, DENUNCIA, ROTULO_ESTADO_CONTEUDO, TX } from '../../conteudo/moderacao.ts'
import { formatarDataHora, type PerfilPublico } from '../../dados/comunidade.ts'
import type { EstadoModeracao } from '../../dados/comunidade.regras.ts'
import type { ConteudoLido, HistoricoDoPerfil } from '../../dados/moderacao.ts'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { Meta, Texto } from '../comunidade/Itens.tsx'
import { ETIQUETAS_QUEBRAM, LINK_ALVO_DO_PAINEL } from './estilos.ts'
import { LinhaDaAuditoria } from './LinhaDaAuditoria.tsx'

export const CARTAO = 'flex flex-col gap-3 rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-5'

/** O estado atual do conteúdo, sempre com a etiqueta (também `visivel`), e o motivo de moderação. */
function EstadoDoConteudo({ estado, motivo }: { estado: EstadoModeracao; motivo: string | null }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${ETIQUETAS_QUEBRAM}`}>
      <Etiqueta>{ROTULO_ESTADO_CONTEUDO[estado]}</Etiqueta>
      {motivo ? <span className="cm-pequeno wrap-anywhere">{COMUM_COMUNIDADE.motivoDaModeracao(motivo)}</span> : null}
    </p>
  )
}

interface CartaoProps {
  lido: ConteudoLido
  autor: PerfilPublico | null
  /** O link para a M3 (na M2); a M3 não leva link para si mesma. */
  comLink?: boolean
  /** O id do título (`tabindex="-1"`): a regra de foco o usa quando o botão de origem some. */
  idDoTitulo: string
}

/** O tópico ou a resposta, em qualquer estado, com o autor (ou "pessoa removida") e o estado de agora. */
export function CartaoDoConteudo({ lido, autor, comLink = false, idDoTitulo }: CartaoProps) {
  const apelido = autor?.apelido ?? null
  if (lido.tipo === 'topico') {
    const { topico } = lido
    return (
      <article aria-labelledby={idDoTitulo} className={CARTAO}>
        <h3 id={idDoTitulo} tabIndex={-1} className="cm-h4 alvo-foco wrap-anywhere">
          {topico.titulo}
        </h3>
        <Meta apelido={apelido} criadoEm={topico.criadoEm} editadoEm={topico.editadoEm} faixa={topico.faixa} />
        <EstadoDoConteudo estado={topico.estado} motivo={topico.motivoModeracao} />
        <Texto>{topico.corpo}</Texto>
        {comLink ? (
          <Link to={`/moderacao/conteudo/topico/${topico.id}`} className={LINK_ALVO_DO_PAINEL}>
            {DENUNCIA.verConteudo}
          </Link>
        ) : null}
      </article>
    )
  }
  const { resposta, topicoTitulo } = lido
  return (
    <article aria-labelledby={idDoTitulo} className={CARTAO}>
      <h3 id={idDoTitulo} tabIndex={-1} className="cm-h4 alvo-foco wrap-anywhere">
        {CONTEUDO.tituloDaResposta}
      </h3>
      {topicoTitulo ? (
        <p className="wrap-anywhere">
          <Link to={`/moderacao/conteudo/topico/${resposta.topicoId}`} className={LINK_ALVO_DO_PAINEL}>
            {CONTEUDO.topicoDaResposta(topicoTitulo)}
          </Link>
        </p>
      ) : (
        <p className="cm-pequeno text-[var(--cor-texto-2)]">{DENUNCIA.respostaSemTopico}</p>
      )}
      <Meta apelido={apelido} criadoEm={resposta.criadoEm} editadoEm={resposta.editadoEm} />
      <EstadoDoConteudo estado={resposta.estado} motivo={resposta.motivoModeracao} />
      <Texto>{resposta.corpo}</Texto>
      {comLink ? (
        <Link to={`/moderacao/conteudo/resposta/${resposta.id}`} className={LINK_ALVO_DO_PAINEL}>
          {DENUNCIA.verConteudo}
        </Link>
      ) : null}
    </article>
  )
}

/** O perfil público (do autor ou o denunciado): apelido, bio, faixa e a data de criação. */
export function CartaoDoPerfil({ perfil }: { perfil: PerfilPublico }) {
  return (
    <div className={CARTAO}>
      <p className="font-medium wrap-anywhere">{perfil.apelido}</p>
      {perfil.bio ? <p className="wrap-anywhere">{perfil.bio}</p> : null}
      <p className={`cm-pequeno flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--cor-texto-2)] ${ETIQUETAS_QUEBRAM}`}>
        {perfil.faixa ? <Etiqueta>{ROTULO_FAIXA[perfil.faixa]}</Etiqueta> : null}
        <time dateTime={perfil.criadoEm} className="tabular">
          {DENUNCIA.perfilDesde(formatarDataHora(perfil.criadoEm))}
        </time>
      </p>
    </div>
  )
}

interface HistoricoProps {
  historico: HistoricoDoPerfil
  /** O conteúdo que a tela já mostra: não repete na lista (o histórico é dos outros). */
  semOId: string | null
  contaId: string | null
}

/** O histórico do perfil: os outros conteúdos, com o estado de cada um, e as linhas de auditoria deles. */
export function HistoricoDoPerfilVista({ historico, semOId, contaId }: HistoricoProps) {
  const conteudos = historico.conteudos.filter((item) => item.id !== semOId)
  if (conteudos.length === 0 && historico.auditoria.length === 0) return <p>{TX.tx29}</p>
  return (
    <div className="flex flex-col gap-6">
      {conteudos.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-[var(--cor-texto-2)]">{DENUNCIA.secaoConteudos}</h3>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {conteudos.map((item) => (
              <li key={`${item.tipo}-${item.id}`} className={CARTAO}>
                <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${ETIQUETAS_QUEBRAM}`}>
                  <Etiqueta>{COMUM_MODERACAO.tipoDoAlvo[item.tipo]}</Etiqueta>
                  <Etiqueta>{ROTULO_ESTADO_CONTEUDO[item.estado]}</Etiqueta>
                  <time dateTime={item.criadoEm} className="cm-pequeno tabular text-[var(--cor-texto-2)]">
                    {formatarDataHora(item.criadoEm)}
                  </time>
                </p>
                <p className="font-medium wrap-anywhere">{item.titulo ?? item.corpo.slice(0, 120)}</p>
                {item.motivoModeracao ? (
                  <p className="cm-pequeno wrap-anywhere">{COMUM_COMUNIDADE.motivoDaModeracao(item.motivoModeracao)}</p>
                ) : null}
                <Link to={`/moderacao/conteudo/${item.tipo}/${item.id}`} className={LINK_ALVO_DO_PAINEL}>
                  {AUDITORIA.abrirConteudo(AUDITORIA.alvoConteudo[item.tipo])}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {historico.auditoria.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-[var(--cor-texto-2)]">{DENUNCIA.secaoAuditoria}</h3>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {historico.auditoria.map((linha) => (
              <LinhaDaAuditoria key={linha.id} linha={linha} contaId={contaId} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
