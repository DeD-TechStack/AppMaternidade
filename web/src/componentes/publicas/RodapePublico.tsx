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
    <nav aria-label={rotulo}>
      <ul className="flex flex-wrap gap-x-5">
        {itens.map((item) => (
          <li key={item.para}>
            <NavLink
              to={item.para}
              end
              className="alvo-toque inline-flex items-center aria-[current=page]:font-semibold aria-[current=page]:decoration-[var(--cor-destaque)] aria-[current=page]:decoration-[3px] aria-[current=page]:underline-offset-[6px]"
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
export function RodapePublico() {
  return (
    <footer className="@container/rodape border-t">
      <div className="grid grid-cols-1 gap-y-6 py-8 @min-[46rem]/rodape:grid-cols-2 @min-[46rem]/rodape:gap-x-10">
        <ListaDeLinks rotulo={ROTULOS_DE_NAVEGACAO.produto} itens={NAVEGACAO_DO_RODAPE_PRODUTO} />
        <ListaDeLinks rotulo={ROTULOS_DE_NAVEGACAO.regras} itens={NAVEGACAO_DO_RODAPE_REGRAS} />
        <p className="font-semibold @min-[46rem]/rodape:col-span-2">
          {TF.faleConosco} <span data-pendencia="contato">{PENDENCIAS.contato}</span>
        </p>
        <p className="text-sm @min-[46rem]/rodape:col-span-2">{RODAPE}</p>
      </div>
    </footer>
  )
}
