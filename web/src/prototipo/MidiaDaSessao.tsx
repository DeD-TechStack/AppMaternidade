import { Midia } from '../componentes/base/Midia.tsx'
import { IlustracaoBerco } from './IlustracaoBerco.tsx'
import { IlustracaoMamada } from './IlustracaoMamada.tsx'
import { IlustracaoTapete } from './IlustracaoTapete.tsx'
import type { TipoSessao } from './estado.ts'
import { DESCRICAO_DA_MIDIA } from './textosSessao.ts'

// A ilustração cobre a moldura (1376 × cerca de 917, proporção 1,5) sem distorcer: `slice` corta o
// que passa em vez de deixar vão. O berço usa a medida larga (240 × 160, proporção 1,5): não há o que cortar
// e a figura em pé aparece inteira, do cabelo ao chão.
const COBRE = 'h-full w-full block'

/**
 * A mídia da Sessão (EMENDAS E5, bloco 3): moldura larga em barro com a ilustração do tipo da sessão
 * (sono: berço; tummy time: tapete; mamada: poltrona) ou, sem sessão, o berço. Sem texto dentro: a
 * descrição fica no `aria-label` da moldura.
 */
export function MidiaDaSessao({ tipo }: { tipo: TipoSessao | null }) {
  return (
    <Midia formato="larga" fundo="barro" aria-label={DESCRICAO_DA_MIDIA[tipo ?? 'vazio']}>
      {tipo === 'tummy' ? (
        <IlustracaoTapete className={COBRE} preserveAspectRatio="xMidYMid slice" />
      ) : tipo === 'mamada' ? (
        <IlustracaoMamada larga className={COBRE} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <IlustracaoBerco larga className={COBRE} preserveAspectRatio="xMidYMid slice" />
      )}
    </Midia>
  )
}
