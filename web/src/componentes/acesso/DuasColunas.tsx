import type { ReactNode } from 'react'
import { Coluna, Colunas, QuadroLayout, Secao } from '../base/layout/index.ts'
import { Ilustracao, type NomeIlustracao } from '../campo/Ilustracao.tsx'
import { CenaAcesso } from './CenaAcesso.tsx'

interface Props {
  children: ReactNode
  /**
   * Um desenho de traço pequeno, só no celular (abaixo de 640 px), ao lado da segunda linha do título.
   * É enfeite (`alt` vazio): fica fora da leitura de tela, e some na madrugada (o traço é de cacau).
   */
  ilustracao?: NomeIlustracao
}

/**
 * A tela de acesso em duas colunas: o formulário no papel, à esquerda, e o painel de mel com a cena,
 * à direita (7/5 da grade, a partir de 64 rem: o título de 84 px precisa de uma coluna de ~730 px).
 * É uma seção (`Secao`) com o quadro e as `Colunas` com o vão de mídia (texto e mídia).
 * As duas colunas começam no mesmo topo: o painel tem proporção fixa (não estica com a altura do
 * formulário) e, com o formulário mais alto que a janela, fica preso logo abaixo do cabeçalho
 * (`sticky`). No celular é uma coluna só: o formulário primeiro, a cena depois.
 */
export function DuasColunas({ children, ilustracao }: Props) {
  return (
    <Secao as="div">
      <QuadroLayout>
        <Colunas fracoes="7fr 5fr" vao="midia" aPartirDe={1024} alinhar="inicio">
          <Coluna className="relative">
            {ilustracao ? (
              <Ilustracao
                nome={ilustracao}
                decorativa
                carregamento="eager"
                className="pointer-events-none absolute top-[46px] right-0 h-auto max-h-[58px] w-auto max-w-[60px] sm:hidden [:root[data-tema=madrugada]_&]:hidden"
              />
            ) : null}
            {children}
          </Coluna>
          <Coluna className="lg:sticky lg:top-[calc(var(--cm-cabecalho)+16px)]">
            <CenaAcesso />
          </Coluna>
        </Colunas>
      </QuadroLayout>
    </Secao>
  )
}
