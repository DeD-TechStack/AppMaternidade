import type { ReactNode } from 'react'
import { Caixa, type Vars } from './midia/Caixa.tsx'
import { CAPTURAS, urlDaCaptura, type ChaveCaptura } from './midia/capturas.ts'
import './midia/midia.css'

interface Props {
  tipo: 'celular' | 'notebook'
  /** A tela do protótipo que o aparelho mostra, para a demonstração poder ser conferida. */
  tela: 'hoje' | 'sessao'
  /** Só para a miniatura da madrugada: as variáveis de cor da tela passam a ser as da noite,
   *  sem tocar no tema da página (o <html> não muda). */
  tema?: 'madrugada'
  className?: string
  children?: ReactNode
  /** Liga a versão 3D: a captura real da tela vai dentro do aparelho, com inclinação e espessura.
   *  Sem ela o aparelho é a moldura de miniatura de antes, e `children` é a tela. */
  captura?: ChaveCaptura
  /** A inclinação da versão 3D, em graus (rotateX, rotateY e rotateZ). */
  inclinacao?: { x?: number; y?: number; z?: number }
  /** A largura do aparelho 3D (um comprimento CSS, de preferência em `cqw`). A altura vem dela. */
  largura?: string
  /** Só a primeira dobra da página carrega a captura na hora; o resto é preguiçoso. */
  carregamento?: 'lazy' | 'eager'
  /** Posição e variáveis da versão 3D (`left`, `top`, `--tz`…). */
  style?: Vars
}

function Tela3d({ captura, carregamento }: { captura: ChaveCaptura; carregamento: 'lazy' | 'eager' }) {
  const { largura, altura } = CAPTURAS[captura]
  return (
    <div className="ap3d-tela">
      <img
        className="ap3d-img"
        src={urlDaCaptura(captura)}
        alt=""
        width={largura}
        height={altura}
        decoding="async"
        loading={carregamento}
      />
    </div>
  )
}

function variaveis(largura: string | undefined, inclinacao: Props['inclinacao'], style: Vars | undefined): Vars {
  return {
    ...(largura ? { '--aw': largura } : {}),
    '--rx': `${inclinacao?.x ?? 0}deg`,
    '--ry': `${inclinacao?.y ?? 0}deg`,
    '--rz': `${inclinacao?.z ?? 0}deg`,
    ...style,
  }
}

// Moldura de celular ou de notebook desenhada em CSS, sem sombra. É só vitrine: inerte e escondida
// do leitor de tela (o parágrafo ao lado diz o que a tela mostra). Sem `captura`, vão por dentro as
// miniaturas de verdade, em tamanho natural (ver .aparelho-* em index.css); quem usa a moldura
// posiciona e escala. Com `captura`, é o aparelho 3D (.ap3d-* em midia/midia.css): a captura real
// da nossa tela, com espessura em faces chapadas e inclinação, e o mesmo bloco serve às cenas do
// Início e, depois, às da Sessão e do Entrar.
export function Aparelho({
  tipo,
  tela,
  tema,
  className = '',
  children,
  captura,
  inclinacao,
  largura,
  carregamento = 'lazy',
  style,
}: Props) {
  if (captura) {
    const vars = variaveis(largura, inclinacao, style)
    if (tipo === 'notebook') {
      return (
        <div
          data-aparelho="notebook"
          data-tela={tela}
          inert
          aria-hidden="true"
          className={`ap3d ap3d-notebook ${className}`}
          style={vars}
        >
          <Caixa className="ap3d-tampa">
            <Tela3d captura={captura} carregamento={carregamento} />
          </Caixa>
          <div className="ap3d-base">
            <Caixa className="ap3d-base-caixa" />
          </div>
        </div>
      )
    }
    return (
      <Caixa
        data-aparelho="celular"
        data-tela={tela}
        inert
        aria-hidden="true"
        className={`ap3d ap3d-celular ${className}`}
        style={vars}
      >
        <Tela3d captura={captura} carregamento={carregamento} />
      </Caixa>
    )
  }
  if (tipo === 'notebook') {
    return (
      <div
        data-aparelho="notebook"
        data-tela={tela}
        inert
        aria-hidden="true"
        className={`aparelho aparelho-notebook ${className}`}
      >
        <div className="aparelho-tampa">
          <div className="aparelho-tela" data-tema-local={tema}>
            {children}
          </div>
        </div>
        <div className="aparelho-base" />
      </div>
    )
  }
  return (
    <div
      data-aparelho="celular"
      data-tela={tela}
      inert
      aria-hidden="true"
      className={`aparelho aparelho-celular ${className}`}
    >
      <div className="aparelho-tela" data-tema-local={tema}>
        {children}
      </div>
    </div>
  )
}
