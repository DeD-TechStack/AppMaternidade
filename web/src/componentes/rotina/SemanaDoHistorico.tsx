import { Link } from 'react-router'
import { HISTORICO, TOTAIS } from '../../conteudo/rotina.ts'
import { diaCurto } from './diasDoHistorico.ts'
import { formatarMinutos, larguraDaBarra, type DiaDaSemana } from './totaisHistorico.ts'

interface Props {
  dias: readonly DiaDaSemana[]
  /** A rota de um dia na vista `dia`. */
  urlDoDia: (dia: string) => string
}

/**
 * A semana (R38-21): uma linha por dia, a mais antiga primeiro, com o dia curto, o sono (texto e barra
 * decorativa), o tummy time, as mamadas mais mamadeiras e as fraldas. Tocar na linha abre o dia.
 */
export function SemanaDoHistorico({ dias, urlDoDia }: Props) {
  const maior = Math.max(0, ...dias.map((item) => item.totais.sonoMin))
  return (
    <ul aria-label={HISTORICO.resumoDaSemana} className="border-y border-(--cor-fio-suave)" data-semana="">
      {dias.map(({ dia, totais }) => {
        const largura = larguraDaBarra(totais.sonoMin, maior)
        return (
          <li key={dia} data-dia-da-semana={dia} className="border-t border-(--cor-fio-suave) first:border-t-0">
            <Link to={urlDoDia(dia)} state={{ foco: 'titulo' }} className="rotina-semana-linha alvo-toque">
              <span className="font-medium whitespace-nowrap">{diaCurto(dia)}</span>
              <span className="rotina-semana-celula">
                <span className="rotina-semana-rotulo">{TOTAIS.sono}</span> <span className="rotina-semana-valor">{formatarMinutos(totais.sonoMin)}</span>
                {largura > 0 ? <span aria-hidden="true" className="rotina-barra" style={{ width: `${largura}%` }} /> : null}
              </span>
              <span className="rotina-semana-celula">
                <span className="rotina-semana-rotulo">{TOTAIS.tummy}</span> <span className="rotina-semana-valor">{formatarMinutos(totais.tummyMin)}</span>
              </span>
              <span className="rotina-semana-celula">
                <span className="rotina-semana-rotulo">{TOTAIS.mamadasEMamadeiras}</span>{' '}
                <span className="rotina-semana-valor">{totais.mamadas + totais.mamadeiras}</span>
              </span>
              <span className="rotina-semana-celula">
                <span className="rotina-semana-rotulo">{TOTAIS.fraldas}</span> <span className="rotina-semana-valor">{totais.fraldas}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
