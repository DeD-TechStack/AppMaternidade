import type { ReactNode } from 'react'

interface Props {
  tipo: 'celular' | 'notebook'
  /** A tela do protótipo que o aparelho mostra, para a demonstração poder ser conferida. */
  tela: 'hoje' | 'sessao'
  /** Só para a miniatura da madrugada: as variáveis de cor da tela passam a ser as da noite,
   *  sem tocar no tema da página (o <html> não muda). */
  tema?: 'madrugada'
  className?: string
  children: ReactNode
}

// Moldura de celular ou de notebook desenhada em CSS, sem sombra e sem imagem. É só vitrine:
// inerte e escondida do leitor de tela (o parágrafo ao lado diz o que a tela mostra). Por dentro
// vão as miniaturas de verdade, em tamanho natural (ver .aparelho-* em index.css); quem usa a
// moldura posiciona e escala.
export function Aparelho({ tipo, tela, tema, className = '', children }: Props) {
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
