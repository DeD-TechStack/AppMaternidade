import { Link } from 'react-router'
import { COMUM_COMUNIDADE, ROTULO_ESTADO_DENUNCIA } from '../../conteudo/comunidade.ts'
import { AUDITORIA, COMUM_MODERACAO, ROTULO_ESTADO_CONTEUDO, ROTULO_PAPEL } from '../../conteudo/moderacao.ts'
import { formatarDataHora } from '../../dados/comunidade.ts'
import type { LinhaDeAuditoria } from '../../dados/moderacao.ts'
import { Texto } from '../comunidade/Itens.tsx'
import { LINK_ALVO } from '../conta/Partes.tsx'

/** O rótulo de um estado guardado na auditoria: de conteúdo, de denúncia ou de papel. */
function rotuloDoEstado(valor: string | null): string {
  if (valor === null) return AUDITORIA.nenhum
  const mapa: Record<string, string> = { ...ROTULO_ESTADO_CONTEUDO, ...ROTULO_ESTADO_DENUNCIA, ...ROTULO_PAPEL }
  return mapa[valor] ?? valor
}

/** Quem agiu: "Você" para a conta da sessão; senão "Equipe · " e os 8 primeiros caracteres do id. */
export function quemAgiu(atorId: string, contaId: string | null): string {
  return atorId === contaId ? COMUM_MODERACAO.voce : COMUM_MODERACAO.equipe(atorId.slice(0, 8))
}

function AlvoDaLinha({ linha }: { linha: LinhaDeAuditoria }) {
  if (linha.alvoTipo === 'papel_plataforma') {
    return <span>{AUDITORIA.papelDaConta(linha.alvoId.slice(0, 8))}</span>
  }
  if (linha.alvoTipo === 'denuncia') {
    return (
      <Link to={`/moderacao/denuncia/${linha.alvoId}`} className={LINK_ALVO}>
        {AUDITORIA.abrirDenuncia}
      </Link>
    )
  }
  return (
    <>
      <Link to={`/moderacao/conteudo/${linha.alvoTipo}/${linha.alvoId}`} className={LINK_ALVO}>
        {AUDITORIA.abrirConteudo(AUDITORIA.alvoConteudo[linha.alvoTipo])}
      </Link>
      {linha.denunciaId ? (
        <Link to={`/moderacao/denuncia/${linha.denunciaId}`} className={LINK_ALVO}>
          {AUDITORIA.verDenuncia}
        </Link>
      ) : null}
    </>
  )
}

/** Uma linha da auditoria (M4 e o histórico do perfil): a ação, o alvo com link, os estados, o motivo e a data. */
export function LinhaDaAuditoria({ linha, contaId }: { linha: LinhaDeAuditoria; contaId: string | null }) {
  const mudou = linha.estadoAnterior !== null || linha.estadoNovo !== null
  return (
    <li className="flex flex-col gap-2 rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-5">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold">{AUDITORIA.acao[linha.acao]}</span>
        <span className="cm-pequeno text-[var(--cor-texto-2)]">{quemAgiu(linha.atorId, contaId)}</span>
        <time dateTime={linha.criadoEm} className="cm-pequeno tabular text-[var(--cor-texto-2)]">
          {formatarDataHora(linha.criadoEm)}
        </time>
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <AlvoDaLinha linha={linha} />
      </div>
      {mudou ? (
        <p className="cm-pequeno">{AUDITORIA.mudanca(rotuloDoEstado(linha.estadoAnterior), rotuloDoEstado(linha.estadoNovo))}</p>
      ) : null}
      {linha.acao === 'conceder_papel' ? (
        <p className="cm-pequeno">
          {AUDITORIA.validade(linha.validoAte ? formatarDataHora(linha.validoAte) : COMUM_MODERACAO.semValidade)}
        </p>
      ) : null}
      <p className="cm-pequeno wrap-anywhere">{COMUM_COMUNIDADE.motivoDaModeracao(linha.motivo)}</p>
      {linha.conteudo ? (
        <details>
          <summary className="alvo-toque inline-flex cursor-pointer items-center font-medium">{AUDITORIA.textoNoMomento}</summary>
          <div className="mt-2">
            <Texto>{linha.conteudo}</Texto>
          </div>
        </details>
      ) : null}
    </li>
  )
}
