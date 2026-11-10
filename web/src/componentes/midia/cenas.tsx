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

/** O contêiner da cena (cqw) e o palco com a perspectiva. `classe` liga as variáveis de uma cena
 *  (a geometria que muda abaixo de 768 fica em midia.css, nas variáveis dessa classe). */
function Palco({ children, classe = '' }: { children: ReactNode; classe?: string }) {
  return (
    <div className="mc-cena">
      <div className={`mc-palco ${classe}`.trim()}>{children}</div>
    </div>
  )
}

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

/** I-5: três celulares sobre pedestais de alturas diferentes, os de fora virados para o do meio.
 *  A posição (x), a altura do pedestal (alto) e o giro de cada um têm duas versões, a de 768 ou mais
 *  (`-l`, a geometria de 1440) e a de abaixo de 768 (`-e`, celulares maiores); o CSS escolhe (midia.css,
 *  `.mc-trio` e `.mc-trio-item`). A largura do celular (`--lw`) e a do pedestal (`--pw`) são do grupo. */
const TRES: Array<{
  captura: ChaveCaptura
  tela: 'hoje' | 'sessao'
  l: { x: number; alto: number; giro: number }
  e: { x: number; alto: number; giro: number }
}> = [
  { captura: 'hoje-claro-390', tela: 'hoje', l: { x: 8, alto: 9, giro: 20 }, e: { x: 2, alto: 6, giro: 18 } },
  { captura: 'sessao-claro-390', tela: 'sessao', l: { x: 38, alto: 17, giro: 0 }, e: { x: 34.5, alto: 10, giro: 0 } },
  { captura: 'hoje-madrugada-390', tela: 'hoje', l: { x: 68, alto: 3, giro: -20 }, e: { x: 67, alto: 2, giro: -18 } },
]

export function CenaCelulares() {
  return (
    <Palco classe="mc-trio">
      {TRES.map(({ captura, tela, l, e }) => (
        <div
          key={captura}
          className="mc-obj mc-trio-item"
          style={vars({
            '--x-l': `${l.x}cqw`,
            '--alto-l': `${l.alto}cqw`,
            '--giro-l': `${l.giro}deg`,
            '--x-e': `${e.x}cqw`,
            '--alto-e': `${e.alto}cqw`,
            '--giro-e': `${e.giro}deg`,
          })}
        >
          <Caixa className="mc-obj mc-pedestal" style={{ left: 0, bottom: 0, width: 'var(--pw)', height: 'var(--alto)', '--esp': '13cqw' }} />
          <Aparelho
            tipo="celular"
            tela={tela}
            captura={captura}
            largura="var(--lw)"
            style={{ left: 'calc((var(--pw) - var(--lw)) / 2)', bottom: 'var(--alto)' }}
          />
        </div>
      ))}
    </Palco>
  )
}

/** I-7a: a tela Sessão num notebook grande e um celular ao lado dele, os dois inteiros dentro da
 *  moldura (a borda não cruza uma tela clara) e sem um cobrir o outro: a faixa do celular acaba 2 cqw
 *  antes da do notebook, para o logo e o título da tela do notebook ficarem inteiros. O notebook mostra só o alto da captura, até o cartão do cronômetro
 *  (`ap3d-corte`): sem a ilustração que a página tem logo abaixo. */
export function CenaSessao() {
  return (
    <Palco>
      <Aparelho
        tipo="notebook"
        tela="sessao"
        captura="sessao-claro-1440"
        className="ap3d-corte"
        largura="62cqw"
        inclinacao={{ x: -8, y: -22, z: -3 }}
        style={{ left: '31cqw', top: '12cqw', '--abre': '8deg' }}
      />
      <Aparelho
        tipo="celular"
        tela="sessao"
        captura="sessao-claro-390"
        largura="22cqw"
        inclinacao={{ x: -4, y: 14, z: 4 }}
        style={{ left: '6cqw', top: '12cqw', '--tz': '6cqw' }}
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
          className="mc-obj mc-laje-papel"
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
          style={{ left: 0, top: 0, width: '60cqw', height: '64cqw', '--esp': '6cqw' }}
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
  /** Um recorte pela imagem de fundo CSS (sem tag de imagem, que o limite de 3 por moldura esgotou): a captura
   *  de computador e, abaixo de 768, a de celular da mesma tela. Em cada uma, `zw` é a largura da
   *  captura inteira em cqw e `ox`/`oy` o deslocamento do recorte, também em cqw (midia.css, `.mc-recorte-bg`). */
  fundo?: { captura: keyof typeof CELULAR_DE; l: Medida; e: Medida }
}
interface Medida {
  zw: number
  ox: number
  oy: number
}

// Uma grade de 6 por 3: três recortes por imagem (o limite por moldura), cinco por imagem de fundo (os
// mais legíveis: botões, o cartão em andamento, o título, os dígitos do cronômetro) e dois ladrilhos
// de tinta para o ritmo. Cada recorte de 1440 é o pedaço da captura que cabe no ladrilho: com a
// escala `s` (cqw por px da captura), zw = 1440 · s, ox = x · s e oy = y · s. Os de celular valem para
// a captura de 390 por 844, com escala maior (os ladrilhos têm ~50 px abaixo de 768).
const LADRILHOS: Ladrilho[] = [
  { coluna: 1, linha: 1, largura: 2, altura: 2, recorte: { captura: 'hoje-claro-1440', zoom: 2.3, ox: 4.8, oy: 43.8 } },
  // Os botões Encerrar e Ver sessão, com o fim do cartão e a barra de baixo (x 80, y 500, 400 px).
  { coluna: 3, linha: 1, largura: 1, altura: 1, fundo: { captura: 'hoje-claro-1440', l: { zw: 50.4, ox: 2.8, oy: 17.5 }, e: { zw: 54.6, ox: 5.6, oy: 63.7 } } },
  { coluna: 4, linha: 1, largura: 2, altura: 1, cor: 'tinta' },
  // Duração da sessão e os primeiros dígitos do cronômetro (x 90, y 400, 400 px).
  { coluna: 6, linha: 1, largura: 1, altura: 1, fundo: { captura: 'sessao-claro-1440', l: { zw: 50.4, ox: 3.15, oy: 14 }, e: { zw: 54.6, ox: 1.4, oy: 58.8 } } },
  { coluna: 3, linha: 2, largura: 1, altura: 2, recorte: { captura: 'sessao-claro-1440', zoom: 3.4, ox: 23.6, oy: 0 } },
  { coluna: 4, linha: 2, largura: 2, altura: 1, recorte: { captura: 'hoje-madrugada-1440', zoom: 1.6, ox: 0, oy: 0 } },
  // O título Hoje, Heloísa, 3 meses, o fio e o cartão em andamento, até antes do fim dele (x 20, y 30,
  // 360 por 758 px): o canto de baixo, o que encosta na borda da moldura, cai no urucum, não na faixa
  // de papel entre o cartão e a barra escura.
  { coluna: 6, linha: 2, largura: 1, altura: 2, fundo: { captura: 'hoje-claro-1440', l: { zw: 56, ox: 0.78, oy: 1.17 }, e: { zw: 54.6, ox: 1.4, oy: 26.6 } } },
  { coluna: 1, linha: 3, largura: 1, altura: 1, cor: 'tinta' },
  // Os dois últimos dígitos do cronômetro, os maiores da tela (x 560, y 440, 320 px).
  { coluna: 2, linha: 3, largura: 1, altura: 1, fundo: { captura: 'sessao-claro-1440', l: { zw: 63, ox: 24.5, oy: 19.25 }, e: { zw: 54.6, ox: 22.4, oy: 58.8 } } },
  // Sono, o 1 h 12 min e o começo dos botões (x 0, y 480, 780 por 370 px).
  { coluna: 4, linha: 3, largura: 2, altura: 1, fundo: { captura: 'hoje-claro-1440', l: { zw: 54.46, ox: 0, oy: 18.15 }, e: { zw: 54.6, ox: 5.6, oy: 47.6 } } },
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
        {LADRILHOS.map(({ coluna, linha, largura, altura, cor, recorte, fundo }) => {
          const estilo: Vars = { gridColumn: `${coluna} / span ${largura}`, gridRow: `${linha} / span ${altura}` }
          if (fundo) {
            return (
              <Caixa key={`${coluna}-${linha}`} className="mc-ladrilho mc-ld-papel" style={estilo}>
                <div
                  className="mc-recorte-bg"
                  style={vars({
                    '--bg-l': `url("${urlDaCaptura(fundo.captura)}")`,
                    '--zw-l': fundo.l.zw,
                    '--ox-l': fundo.l.ox,
                    '--oy-l': fundo.l.oy,
                    '--bg-e': `url("${urlDaCaptura(CELULAR_DE[fundo.captura])}")`,
                    '--zw-e': fundo.e.zw,
                    '--ox-e': fundo.e.ox,
                    '--oy-e': fundo.e.oy,
                  })}
                />
              </Caixa>
            )
          }
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

/** I-8: o celular da madrugada, cortado pela borda de baixo, diante de uma placa de papel. A posição,
 *  a largura e o topo do celular vêm de variáveis (midia.css, `.mc-retrato`): abaixo de 768 o celular
 *  sobe e cresce, para a folha de trás não aparecer vazia no alto e o celular continuar cortado embaixo. */
export function CenaRetrato() {
  return (
    <Palco classe="mc-retrato">
      <Caixa
        className="mc-obj mc-laje"
        style={{ left: '8cqw', top: '10cqw', width: '60cqw', height: '86cqw', '--esp': '6cqw', '--ry': '-14deg', '--rz': '-3deg', '--tz': '-8cqw' }}
      />
      <Aparelho
        tipo="celular"
        tela="hoje"
        captura="hoje-madrugada-390"
        largura="var(--ph-w)"
        inclinacao={{ x: -3, y: -10, z: 3 }}
        style={{ left: 'var(--ph-left)', top: 'var(--ph-top)' }}
      />
    </Palco>
  )
}

/** I-9: o celular de cada cartão, com uma placa atrás e ângulos opostos. A tela é clara, e a borda de
 *  baixo da moldura não pode cruzá-la (o papel da tela some contra a página): um chão baixo, de papel
 *  ou de tinta, fica na frente do pé do celular e passa da borda, no lugar do corte pela moldura. */
export function CenaCartao({ tela }: { tela: 'hoje' | 'sessao' }) {
  const hoje = tela === 'hoje'
  return (
    <Palco>
      <Caixa
        className={`mc-obj ${hoje ? 'mc-laje-papel' : 'mc-laje-tinta'}`}
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
      <Caixa
        className={`mc-obj mc-chao ${hoje ? 'mc-chao-tinta' : 'mc-chao-papel'}`}
        style={{ left: '-6cqw', top: '90cqw', width: '112cqw', height: '14cqw', '--esp': '8cqw', '--rx': '-6deg' }}
      />
    </Palco>
  )
}
