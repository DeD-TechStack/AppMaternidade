import { useId, type ReactNode } from 'react'

interface Linha {
  readonly rotulo: string
  readonly texto: string
}

export interface ConteudoDoPainel {
  readonly titulo: string
  readonly linhas: readonly Linha[]
}

interface Props {
  painel: ConteudoDoPainel
  /** O Hoje em miniatura (inerte, escondido do leitor de tela), ao lado das linhas quando cabe. */
  miniatura?: ReactNode
  /** O painel cresce para encher a coluna (a tela Começar ocupa a altura da janela). */
  preencher?: boolean
}

// O painel de apoio de cada tela: um campo de barro, com a tinta por cima, e um bloco de linhas
// (rótulo serifado e texto, régua entre as linhas). É texto: sem ilustração, sem link, fora da
// ordem do Tab e sem título de seção (o rótulo nomeia o painel, não é um `<h2>`, e a estrutura de
// títulos da página não muda). Aparece em toda largura: no celular fica empilhado depois do
// formulário, com o respiro e a tipografia do celular; a partir de 40 rem ganha o respiro maior.
// O contêiner (`@container`) mede o painel, não a janela, e mede a caixa de conteúdo (sem o
// respiro de 2 rem de cada lado): a miniatura só entra quando sobra largura (34 rem de conteúdo,
// 38 rem de painel) e as linhas só passam a rótulo-ao-lado-do-texto a partir de 26 rem.
export function PainelApoio({ painel, miniatura, preencher = false }: Props) {
  const rotuloId = useId()
  return (
    <aside
      aria-labelledby={rotuloId}
      data-campo="field-1"
      className={`@container rounded-[8px] p-5 min-[40rem]:p-8 ${preencher ? 'flex-1' : ''}`}
    >
      <p id={rotuloId} className="rotulo">
        {painel.titulo}
      </p>
      <div className="mt-4 flex flex-col @min-[34rem]:flex-row @min-[34rem]:items-start @min-[34rem]:gap-8">
        <ul className="m-0 min-w-0 flex-1 list-none p-0">
          {painel.linhas.map((linha) => (
            <li
              key={linha.rotulo}
              className="flex flex-col gap-1 border-t border-[var(--cor-linha)] py-4 @min-[26rem]:flex-row @min-[26rem]:gap-6"
            >
              <span className="titulo-linha min-w-0 text-[1.375rem] @min-[26rem]:w-1/3 @min-[26rem]:shrink-0">
                {linha.rotulo}
              </span>
              <span className="min-w-0 @min-[26rem]:flex-1">{linha.texto}</span>
            </li>
          ))}
        </ul>
        {miniatura ? <div className="hidden shrink-0 border-t border-[var(--cor-linha)] pt-4 @min-[34rem]:block">{miniatura}</div> : null}
      </div>
    </aside>
  )
}
