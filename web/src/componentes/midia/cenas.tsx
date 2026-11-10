import type { ReactNode } from 'react'
import { IlustracaoBerco } from '../../prototipo/IlustracaoBerco.tsx'
import { IlustracaoMamada } from '../../prototipo/IlustracaoMamada.tsx'
import { Aparelho } from '../Aparelho.tsx'
import { Caixa, vars, type Vars } from './Caixa.tsx'
import { CAPTURAS, CELULAR_DE, urlDaCaptura, type ChaveCaptura } from './capturas.ts'
import './midia.css'

// As cenas das molduras de mídia do Início (cartão 44d-5). Cada uma é filha da moldura `<Midia>`:
// um aparelho, um pedestal ou uma placa, em CSS 3D, sobre o fundo de barro ou de lavanda da própria
// moldura. Nenhum texto dentro. Toda medida é em cqw (a largura da moldura), então em 1440 e em 390
// a cena é a mesma, inteira. Os ângulos e as posições mudam de uma cena para a outra.

/** O contêiner da cena (cqw) e o palco com a perspectiva. */
function Palco({ children }: { children: ReactNode }) {
  return (
    <div className="mc-cena">
      <div className="mc-palco">{children}</div>
    </div>
  )
}

/** A altura de um celular com largura `aw` (cqw): o corpo é 2,071 vezes mais alto que largo. */
const ALTURA_CELULAR = 2.071

/** I-2: o notebook com a tela Hoje, sobre um pedestal largo e baixo, girado e visto de cima. */
export function CenaNotebook() {
  return (
    <Palco>
      <div
        className="mc-obj"
        style={vars({ left: '8cqw', top: '4cqw', width: '84cqw', height: '52.5cqw', '--rx': '-5deg', '--ry': '-14deg', '--rz': '1deg' })}
      >
        <Caixa
          className="mc-obj mc-pedestal"
          style={{ left: '4cqw', bottom: 0, width: '76cqw', height: '7cqw', '--esp': '32cqw', '--tz': '12cqw' }}
        />
        <Aparelho
          tipo="notebook"
          tela="hoje"
          captura="hoje-claro-1440"
          carregamento="eager"
          largura="68cqw"
          style={{ left: '8cqw', top: 0, '--abre': '12deg' }}
        />
      </div>
    </Palco>
  )
}

/** I-5: três celulares sobre pedestais de alturas diferentes, os de fora virados para o do meio. */
const TRES: Array<{ captura: ChaveCaptura; tela: 'hoje' | 'sessao'; x: number; alto: number; giro: number }> = [
  { captura: 'hoje-claro-390', tela: 'hoje', x: 8, alto: 9, giro: 20 },
  { captura: 'sessao-claro-390', tela: 'sessao', x: 38, alto: 17, giro: 0 },
  { captura: 'hoje-madrugada-390', tela: 'hoje', x: 68, alto: 3, giro: -20 },
]
const LARGURA_TRES = 19

export function CenaCelulares() {
  return (
    <Palco>
      {TRES.map(({ captura, tela, x, alto, giro }) => (
        <div
          key={captura}
          className="mc-obj"
          style={vars({
            left: `${x}cqw`,
            bottom: '4cqw',
            width: '24cqw',
            height: `${alto + LARGURA_TRES * ALTURA_CELULAR}cqw`,
            '--rx': '-8deg',
            '--ry': `${giro}deg`,
          })}
        >
          <Caixa
            className="mc-obj mc-pedestal"
            style={{ left: 0, bottom: 0, width: '24cqw', height: `${alto}cqw`, '--esp': '13cqw' }}
          />
          <Aparelho
            tipo="celular"
            tela={tela}
            captura={captura}
            largura={`${LARGURA_TRES}cqw`}
            style={{ left: '2.5cqw', bottom: `${alto}cqw` }}
          />
        </div>
      ))}
    </Palco>
  )
}

/** I-7a: a tela Sessão num notebook grande, cortado pela direita e por baixo, e um celular cortado embaixo. */
export function CenaSessao() {
  return (
    <Palco>
      <Aparelho
        tipo="notebook"
        tela="sessao"
        captura="sessao-claro-1440"
        largura="76cqw"
        inclinacao={{ x: -8, y: -22, z: -3 }}
        style={{ left: '23cqw', top: '10cqw', '--abre': '8deg' }}
      />
      <Aparelho
        tipo="celular"
        tela="sessao"
        captura="sessao-claro-390"
        largura="22cqw"
        inclinacao={{ x: -4, y: 14, z: 4 }}
        style={{ left: '8cqw', top: '34cqw', '--tz': '10cqw' }}
      />
    </Palco>
  )
}

/** I-7b: o campo escuro da madrugada, com dois celulares com a captura da madrugada, e blocos no claro. */
export function CenaMadrugada() {
  return (
    <Palco>
      <Caixa
        className="mc-obj mc-pedestal"
        style={{ left: '3cqw', bottom: '-4cqw', width: '14cqw', height: '40cqw', '--esp': '14cqw', '--ry': '22deg', '--rx': '-6deg' }}
      />
      <Caixa
        className="mc-obj mc-laje-tinta"
        style={{ left: '5cqw', bottom: '39cqw', width: '10cqw', height: '10cqw', '--esp': '10cqw', '--ry': '34deg', '--rx': '-6deg' }}
      />
      <div
        className="mc-campo"
        data-tema-local="madrugada"
        style={{ left: '20cqw', top: 0, right: 0, bottom: 0 }}
      >
        <Aparelho
          tipo="celular"
          tela="hoje"
          captura="hoje-madrugada-390"
          largura="27cqw"
          inclinacao={{ x: -3, y: 16, z: -3 }}
          style={{ left: '12cqw', top: '7cqw' }}
        />
        <Aparelho
          tipo="celular"
          tela="sessao"
          captura="sessao-madrugada-390"
          largura="27cqw"
          inclinacao={{ x: -3, y: -16, z: 3 }}
          style={{ left: '41cqw', top: '19cqw' }}
        />
      </div>
    </Palco>
  )
}

/** I-7c e I-7d: uma ilustração que já existe, numa placa de papel com espessura. */
export function CenaIlustracao({ qual }: { qual: 'berco' | 'mamada' }) {
  if (qual === 'berco') {
    return (
      <Palco>
        <Caixa
          className="mc-obj mc-laje-tinta"
          style={{ left: '-8cqw', top: '72cqw', width: '34cqw', height: '30cqw', '--esp': '10cqw', '--ry': '16deg', '--rz': '-4deg', '--tz': '-6cqw' }}
        />
        <Caixa
          className="mc-obj mc-laje"
          style={{ left: '26cqw', top: '20cqw', width: '78cqw', height: '86cqw', '--esp': '6cqw', '--rx': '-8deg', '--ry': '-16deg', '--rz': '-3deg' }}
        >
          <div className="mc-laje-ilu">
            <IlustracaoBerco className="mc-ilu" />
          </div>
        </Caixa>
      </Palco>
    )
  }
  return (
    <Palco>
      <div
        className="mc-obj"
        style={vars({ left: '12cqw', top: '10cqw', width: '76cqw', height: '78cqw', '--rx': '-7deg', '--ry': '20deg', '--rz': '2deg' })}
      >
        <Caixa
          className="mc-obj mc-pedestal"
          style={{ left: 0, bottom: 0, width: '76cqw', height: '14cqw', '--esp': '30cqw' }}
        />
        <Caixa
          className="mc-obj mc-laje"
          style={{ left: '8cqw', top: 0, width: '60cqw', height: '64cqw', '--esp': '6cqw' }}
        >
          <div className="mc-laje-ilu">
            <IlustracaoMamada className="mc-ilu" />
          </div>
        </Caixa>
      </div>
    </Palco>
  )
}

type Cor = 'papel' | 'superficie' | 'tinta'
interface Ladrilho {
  coluna: number
  linha: number
  largura: number
  altura: number
  cor?: Cor
  /** Um recorte de captura de computador: `zoom` é quantas vezes a imagem é mais larga que o ladrilho;
   *  `ox` e `oy` deslocam a imagem, em % do ladrilho, para a esquerda e para cima. Abaixo de 768 a
   *  imagem troca para a captura de celular da mesma tela (`CELULAR_DE`), com zoom e deslocamentos
   *  próprios, que ficam em midia.css (`.mc-recorte[data-recorte]`). */
  recorte?: { captura: keyof typeof CELULAR_DE; zoom: number; ox: number; oy: number }
}

// Uma grade de 6 por 3: três recortes das nossas capturas (no máximo 3 imagens) e o resto em tons
// chapados de papel e de tinta.
const LADRILHOS: Ladrilho[] = [
  { coluna: 1, linha: 1, largura: 2, altura: 2, recorte: { captura: 'hoje-claro-1440', zoom: 2.3, ox: 4.8, oy: 43.8 } },
  { coluna: 3, linha: 1, largura: 1, altura: 1, cor: 'superficie' },
  { coluna: 4, linha: 1, largura: 2, altura: 1, cor: 'tinta' },
  { coluna: 6, linha: 1, largura: 1, altura: 1, cor: 'papel' },
  { coluna: 3, linha: 2, largura: 1, altura: 2, recorte: { captura: 'sessao-claro-1440', zoom: 3.4, ox: 23.6, oy: 0 } },
  { coluna: 4, linha: 2, largura: 2, altura: 1, recorte: { captura: 'hoje-madrugada-1440', zoom: 1.6, ox: 0, oy: 0 } },
  { coluna: 6, linha: 2, largura: 1, altura: 2, cor: 'superficie' },
  { coluna: 1, linha: 3, largura: 1, altura: 1, cor: 'tinta' },
  { coluna: 2, linha: 3, largura: 1, altura: 1, cor: 'papel' },
  { coluna: 4, linha: 3, largura: 2, altura: 1, cor: 'papel' },
]

const CLASSE_COR: Record<Cor, string> = {
  papel: 'mc-ld-papel',
  superficie: 'mc-ld-superficie',
  tinta: 'mc-ld-tinta',
}

/** I-7e: mosaico de fragmentos da rotina, recortes das capturas numa grade grossa, deitada e girada. */
export function CenaMosaico() {
  return (
    <Palco>
      <div className="mc-grade">
        {LADRILHOS.map(({ coluna, linha, largura, altura, cor, recorte }) => {
          const estilo: Vars = { gridColumn: `${coluna} / span ${largura}`, gridRow: `${linha} / span ${altura}` }
          if (!recorte) {
            return <Caixa key={`${coluna}-${linha}`} className={`mc-ladrilho ${CLASSE_COR[cor ?? 'papel']}`} style={estilo} />
          }
          const { largura: w, altura: h } = CAPTURAS[recorte.captura]
          const celular = CELULAR_DE[recorte.captura]
          return (
            <Caixa key={`${coluna}-${linha}`} className="mc-ladrilho mc-ld-papel" style={estilo}>
              <div
                className="mc-recorte"
                data-recorte={recorte.captura}
                style={vars({ '--zoom': recorte.zoom, '--ox': recorte.ox, '--oy': recorte.oy })}
              >
                <picture>
                  <source
                    media="(max-width: 767px)"
                    srcSet={urlDaCaptura(celular)}
                    width={CAPTURAS[celular].largura}
                    height={CAPTURAS[celular].altura}
                  />
                  <img
                    className="mc-recorte-img"
                    src={urlDaCaptura(recorte.captura)}
                    alt=""
                    width={w}
                    height={h}
                    decoding="async"
                    loading="lazy"
                  />
                </picture>
              </div>
            </Caixa>
          )
        })}
      </div>
    </Palco>
  )
}

/** I-8: o celular da madrugada, cortado pela borda de baixo, diante de uma placa de papel. */
export function CenaRetrato() {
  return (
    <Palco>
      <Caixa
        className="mc-obj mc-laje"
        style={{ left: '8cqw', top: '10cqw', width: '60cqw', height: '86cqw', '--esp': '6cqw', '--ry': '-14deg', '--rz': '-3deg', '--tz': '-8cqw' }}
      />
      <Aparelho
        tipo="celular"
        tela="hoje"
        captura="hoje-madrugada-390"
        largura="74cqw"
        inclinacao={{ x: -3, y: -10, z: 3 }}
        style={{ left: '13cqw', top: '48cqw' }}
      />
    </Palco>
  )
}

/** I-9: o celular de cada cartão, cortado embaixo, com uma placa atrás e ângulos opostos. */
export function CenaCartao({ tela }: { tela: 'hoje' | 'sessao' }) {
  const hoje = tela === 'hoje'
  return (
    <Palco>
      <Caixa
        className={`mc-obj ${hoje ? 'mc-laje' : 'mc-laje-tinta'}`}
        style={
          hoje
            ? { left: '46cqw', top: '10cqw', width: '62cqw', height: '62cqw', '--esp': '8cqw', '--ry': '-12deg', '--rz': '4deg', '--tz': '-10cqw' }
            : { left: '-10cqw', top: '6cqw', width: '56cqw', height: '56cqw', '--esp': '8cqw', '--ry': '14deg', '--rz': '-4deg', '--tz': '-10cqw' }
        }
      />
      <Aparelho
        tipo="celular"
        tela={tela}
        captura={hoje ? 'hoje-claro-390' : 'sessao-claro-390'}
        largura="54cqw"
        inclinacao={hoje ? { x: -5, y: 14, z: -5 } : { x: -5, y: -14, z: 5 }}
        style={hoje ? { left: '16cqw', top: '22cqw' } : { left: '32cqw', top: '24cqw' }}
      />
    </Palco>
  )
}
