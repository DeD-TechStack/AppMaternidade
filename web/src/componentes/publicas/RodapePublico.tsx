import { NavLink } from 'react-router'
import { RODAPE } from '../../conteudo/textos.ts'
import {
  NAVEGACAO_DO_RODAPE_PRODUTO,
  NAVEGACAO_DO_RODAPE_REGRAS,
  PENDENCIAS,
  ROTULOS_DE_NAVEGACAO,
  TF,
} from '../../conteudo/publicas.ts'

interface Item {
  rotulo: string
  para: string
}

function ListaDeLinks({ rotulo, itens }: { rotulo: string; itens: readonly Item[] }) {
  return (
    <nav aria-label={rotulo} className="min-w-0">
      {/* gap-y-2: 8 px entre um item e o seguinte, além dos 44 px do alvo, para um link de duas linhas
          não encostar nos vizinhos. */}
      <ul className="flex flex-col items-start gap-y-2">
        {itens.map((item) => (
          <li key={item.para}>
            <NavLink
              to={item.para}
              end
              className="alvo-toque inline-flex items-center leading-snug aria-[current=page]:font-semibold aria-[current=page]:decoration-[var(--cor-destaque)] aria-[current=page]:decoration-[3px] aria-[current=page]:underline-offset-[6px]"
            >
              {item.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Rodapé comum das páginas públicas: o Início, as 9 páginas novas e a Página não encontrada. Monta
// dentro do contêiner "pagina" do Início e também na 404, que não o tem: por isso declara o próprio
// contêiner ("rodape") e não usa variantes do "pagina" nem de janela.
//
// Hierarquia: cada lista de links é vertical e tem a própria coluna. Em computador (46 rem ou mais) são
// três colunas: Produto, Regras e privacidade, e o contato com a frase do protótipo, alinhado pelo
// topo. Abaixo disso, as duas listas lado a lado em duas colunas quando cabem (20 rem ou mais, em rem:
// com a fonte ampliada a página tem menos rem e as listas se empilham) e o contato embaixo, nas duas
// colunas.
export function RodapePublico() {
  return (
    <footer className="@container/rodape border-t">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 py-8 @min-[20rem]/rodape:grid-cols-2 @min-[46rem]/rodape:grid-cols-3">
        <ListaDeLinks rotulo={ROTULOS_DE_NAVEGACAO.produto} itens={NAVEGACAO_DO_RODAPE_PRODUTO} />
        <ListaDeLinks rotulo={ROTULOS_DE_NAVEGACAO.regras} itens={NAVEGACAO_DO_RODAPE_REGRAS} />
        <div className="flex flex-col gap-4 @min-[20rem]/rodape:col-span-2 @min-[46rem]/rodape:col-span-1 @min-[46rem]/rodape:self-start">
          <p className="font-semibold">
            {TF.faleConosco} <span data-pendencia="contato">{PENDENCIAS.contato}</span>
          </p>
          <p className="text-sm">{RODAPE}</p>
        </div>
      </div>
    </footer>
  )
}
