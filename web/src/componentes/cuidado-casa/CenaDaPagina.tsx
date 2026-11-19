import type { CenaDePagina } from '../../conteudo/casa/cuidado.ts'
import './cuidado-casa.css'

interface Props {
  cena: CenaDePagina
  alt: string
  /** A cena da primeira dobra: carrega na hora e com prioridade. As outras, só ao chegar perto da janela. */
  prioritaria?: boolean
  className?: string
}

/**
 * Uma cena da página: um `<picture>` com um só `<img>`. Abaixo de 1024 vale o recorte do celular; dali em diante, o
 * arquivo largo. A largura e a altura do `<img>` são as do maior arquivo servido (a caixa final vem do CSS, em
 * proporção fixa por faixa de largura, então a página não se mexe quando o arquivo chega).
 */
export function CenaDaPagina({ cena, alt, prioritaria = false, className }: Props) {
  const { largo, celular } = cena
  return (
    <picture className={['cc-cena-imagem', className].filter(Boolean).join(' ')}>
      <source
        media="(max-width: 1023.98px)"
        srcSet={celular.srcSet}
        sizes={celular.sizes}
        width={celular.largura}
        height={celular.altura}
      />
      <img
        src={largo.src}
        srcSet={largo.srcSet}
        sizes={largo.sizes}
        width={largo.largura}
        height={largo.altura}
        alt={alt}
        loading={prioritaria ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={prioritaria ? 'high' : undefined}
      />
    </picture>
  )
}
