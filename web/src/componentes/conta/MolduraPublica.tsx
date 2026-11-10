import type { ReactNode } from 'react'
import { AberturaAcesso } from './AberturaAcesso.tsx'

interface Props {
  /** O `h1` da tela, com o texto fixo da rota. */
  titulo: string
  /** A linha sob o `h1` (uma linha em 1440). */
  subtitulo: string
  /** Os itens da coluna lateral da abertura: etiqueta de protótipo, aviso de demonstração e links. */
  lateral?: ReactNode
  /** A coluna lateral já montada, no lugar da lista de `lateral` (o índice da Conta abaixo de 768). */
  colunaLateral?: ReactNode
  /** Antes da abertura, como primeiro filho do `<main>` (o índice da Conta a partir de 768). */
  antes?: ReactNode
  /** Enquanto a sessão carrega, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  /** O subtítulo leva um valor sem ponto de quebra (o e-mail da Conta): quebra dentro da palavra. */
  quebraLonga?: boolean
  /** Os blocos da tela, cada um uma área útil (filho direto do `<main>`). */
  children: ReactNode
}

// As telas de acesso e as logadas desta tarefa no sistema novo: a casca (cabeçalho e rodapé) é do
// `Layout`, e cada tela monta o próprio `<main>`: a abertura (o `h1`, a linha sob ele e a coluna
// lateral, com os fios do contrato) e depois os blocos da tela. Sem marca própria, sem régua e sem
// medida fixa: a grade de 10 colunas cuida do resto.
export function MolduraPublica({
  titulo,
  subtitulo,
  lateral,
  colunaLateral,
  antes,
  ocupado = false,
  quebraLonga = false,
  children,
}: Props) {
  return (
    <main aria-busy={ocupado || undefined}>
      {antes}
      <AberturaAcesso
        titulo={titulo}
        subtitulo={subtitulo}
        lateral={lateral}
        colunaLateral={colunaLateral}
        quebraLonga={quebraLonga}
      />
      {children}
    </main>
  )
}
