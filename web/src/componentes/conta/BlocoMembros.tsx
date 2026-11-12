import type { MouseEvent } from 'react'
import { FAMILIA, ORDEM_DOS_PAPEIS, PAPEIS } from '../../conteudo/conta.ts'
import type { DetalheFamilia, Membro } from '../../dados/conta.ts'
import type { AcoesDaFamilia } from './acoesFamilia.ts'
import { formatarData } from './datas.ts'
import { BOTAO_SECUNDARIO, LINK_ALVO } from './Partes.tsx'

interface Props {
  detalhe: DetalheFamilia
  responsavel: boolean
  acoes: AcoesDaFamilia
}

/** Os vínculos ativos: responsáveis primeiro, depois cuidadores e observadores, e por nome em cada papel. */
function ordenar(membros: Membro[]): Membro[] {
  return [...membros].sort(
    (a, b) =>
      ORDEM_DOS_PAPEIS.indexOf(a.papel) - ORDEM_DOS_PAPEIS.indexOf(b.papel) || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

// O link "Sair da família" da própria linha leva ao botão do bloco de ações, sem passar pelo roteador
// (um link de âncora faria a tela voltar ao topo, como numa troca de página).
function irParaOBotaoDeSair(evento: MouseEvent<HTMLAnchorElement>) {
  evento.preventDefault()
  const alvo = document.getElementById('sair-da-familia')
  alvo?.scrollIntoView?.()
  alvo?.focus()
}

// O bloco Membros (RF-15, item 3): os vínculos ativos com papel e validade. Só o responsável tem
// controles: "Mudar papel" em toda linha, inclusive a própria, e "Remover acesso" nas outras.
export function BlocoMembros({ detalhe, responsavel, acoes }: Props) {
  return (
    <section aria-labelledby="membros" className="flex flex-col gap-4">
      <h2 id="membros" className="cm-h4">
        {FAMILIA.membros.titulo}
      </h2>
      <ul className="m-0 list-none p-0">
        {ordenar(detalhe.membros).map((membro) => (
          <li
            key={membro.vinculoId}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--cor-fio-suave)] py-3"
          >
            <div className="min-w-0">
              <p className="font-medium wrap-anywhere">
                {membro.nome}
                {membro.souEu ? <span className="font-normal text-[var(--cor-texto-2)]"> {FAMILIA.membros.voce}</span> : null}
              </p>
              <p className="cm-pequeno text-[var(--cor-texto-2)]">{PAPEIS[membro.papel].nome}</p>
              {membro.validoAte ? (
                <p className="cm-pequeno tabular text-[var(--cor-texto-2)]">
                  {FAMILIA.membros.acessoAte(formatarData(membro.validoAte, detalhe.familia.fuso))}
                </p>
              ) : null}
            </div>
            {responsavel ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={BOTAO_SECUNDARIO}
                  data-tamanho="app"
                  aria-label={`${FAMILIA.membros.mudarPapel} de ${membro.nome}`}
                  onClick={(evento) => acoes.abrirDialogo({ tipo: 'papel', membro }, evento.currentTarget)}
                >
                  {FAMILIA.membros.mudarPapel}
                </button>
                {membro.souEu ? (
                  <a href="#sair-da-familia" className={LINK_ALVO} onClick={irParaOBotaoDeSair}>
                    {FAMILIA.membros.sairDaFamilia}
                  </a>
                ) : (
                  <button
                    type="button"
                    className={BOTAO_SECUNDARIO}
                    data-tamanho="app"
                    aria-label={`${FAMILIA.membros.removerAcesso} de ${membro.nome}`}
                    onClick={(evento) => acoes.abrirDialogo({ tipo: 'remover', membro }, evento.currentTarget)}
                  >
                    {FAMILIA.membros.removerAcesso}
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
