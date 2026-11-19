import type { ReactNode } from 'react'
import type { CenaDePagina } from '../../conteudo/casa/cuidado.ts'
import { CenaDaPagina } from './CenaDaPagina.tsx'
import './cuidado-casa.css'

interface Props {
  /** `cena2`: rente à borda direita (as mãos). `cena3`: rente à borda esquerda, com o texto em x 800 (Ícaro). */
  cena: 'cena2' | 'cena3'
  imagem: CenaDePagina
  alt: string
  /** O texto da faixa: vai primeiro no DOM. */
  children: ReactNode
}

/**
 * O miolo de uma `FaixaInteira` com a cena rente à borda da janela. De 1024 em diante a cena é absoluta na faixa, de
 * cima a baixo, e a faixa tem a altura dela (o texto fica centrado nessa altura). Abaixo de 1024 o texto vem primeiro
 * e a cena depois, de ponta a ponta, com a borda de baixo na borda da faixa. Só `cuidado-casa.css` mexe nas bordas:
 * o pacote `secoes/` não muda.
 */
export function FaixaComCena({ cena, imagem, alt, children }: Props) {
  return (
    <div className="cc-meio" data-cc-cena={cena}>
      <div className="cc-meio-texto">{children}</div>
      <CenaDaPagina cena={imagem} alt={alt} className="cc-meio-cena" />
    </div>
  )
}
