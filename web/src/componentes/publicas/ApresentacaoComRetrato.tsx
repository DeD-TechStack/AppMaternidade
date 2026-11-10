import { Quadro, type Peca } from './MidiaDePagina.tsx'

/**
 * O parágrafo de apresentação ao lado de um retrato: o texto em `corpo-g` em c2–c7, centrado na altura
 * do retrato, e a moldura do retrato em c8–c10 (a composição da citação do Início). Abaixo de 768 o
 * retrato vem abaixo do texto, em moldura quadrada. `margem` é uma das classes `sb-mt-*`.
 */
export function ApresentacaoComRetrato({ texto, peca, margem }: { texto: string; peca: Peca; margem: string }) {
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <div className="grade-10 vp-com-retrato">
        <div className="vp-col-c2-c7 vp-com-retrato-texto">
          <p className="vp-apresentacao t-corpo-g" data-apresentacao="">
            {texto}
          </p>
        </div>
        <div className="col-c8-c10 vp-com-retrato-midia">
          <Quadro peca={peca} formato="retrato" />
        </div>
      </div>
    </div>
  )
}
