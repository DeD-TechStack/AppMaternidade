import { MIDIAS } from '../../conteudo/publicas.ts'
import { IlustracaoBerco } from '../../prototipo/IlustracaoBerco.tsx'
import { IlustracaoColo } from '../../prototipo/IlustracaoColo.tsx'
import { IlustracaoMamada } from '../../prototipo/IlustracaoMamada.tsx'
import { IlustracaoPasseio } from '../../prototipo/IlustracaoPasseio.tsx'
import { IlustracaoTapete } from '../../prototipo/IlustracaoTapete.tsx'
import { Galeria } from '../base/Galeria.tsx'
import { Midia } from '../base/Midia.tsx'
import { IlustracaoPassagem } from './IlustracaoPassagem.tsx'

type Cena = keyof typeof MIDIAS
type Fundo = 'barro' | 'lavanda'

/** Uma peça: a cena (uma das 6 ilustrações: as 5 do protótipo e a passagem de turno) e o fundo da moldura. */
export interface Peca {
  cena: Cena
  fundo: Fundo
}

/**
 * As cenas que mostram um aparelho (uma tela do protótipo dentro da moldura, `[data-aparelho]`). As 6
 * cenas das páginas públicas são ilustrações e nenhuma é um aparelho; se uma cena de tela entrar, é aqui
 * que ela se declara. Quem decide mostrar o TF-12 ("as telas mostradas aqui são exemplos") é esta pergunta.
 */
const CENAS_COM_APARELHO: ReadonlySet<Cena> = new Set<Cena>()

/** A página tem um aparelho no meio das mídias que usa? Sem ele, nada nela são "telas mostradas aqui". */
export function contemAparelho(pecas: readonly Peca[]): boolean {
  return pecas.some(({ cena }) => CENAS_COM_APARELHO.has(cena))
}

const DESENHOS: Record<Cena, typeof IlustracaoMamada> = {
  mamada: IlustracaoMamada,
  berco: IlustracaoBerco,
  colo: IlustracaoColo,
  passeio: IlustracaoPasseio,
  tapete: IlustracaoTapete,
  passagem: IlustracaoPassagem,
}

/** A moldura de mídia da base com uma ilustração decorativa dentro; a descrição vai no `aria-label`. */
function Quadro({ peca, formato }: { peca: Peca; formato: 'larga' | 'par' }) {
  const Desenho = DESENHOS[peca.cena]
  return (
    <Midia formato={formato} fundo={peca.fundo} aria-label={MIDIAS[peca.cena]}>
      <Desenho className="vp-ilustracao" />
    </Midia>
  )
}

/** Mídia larga (c1–c10), como bloco de uma página. `margem` é uma das classes `sb-mt-*`. */
export function MidiaLarga({ peca, margem }: { peca: Peca; margem: string }) {
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <Quadro peca={peca} formato="larga" />
    </div>
  )
}

/** Um par de mídias quadradas, lado a lado, na galeria de 2 colunas. */
export function ParDeMidias({ esquerda, direita, margem }: { esquerda: Peca; direita: Peca; margem: string }) {
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <Galeria>
        <Quadro peca={esquerda} formato="par" />
        <Quadro peca={direita} formato="par" />
      </Galeria>
    </div>
  )
}
