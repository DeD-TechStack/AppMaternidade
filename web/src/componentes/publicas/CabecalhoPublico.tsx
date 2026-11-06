import { Link, NavLink } from 'react-router'
import { CAMINHOS, NAVEGACAO_DO_CABECALHO, NOME_SITE, ROTULOS_DE_NAVEGACAO } from '../../conteudo/publicas.ts'

// Cabeçalho das páginas públicas da MAT-36 (o Início tem o dele). Segue o visual do cabeçalho do
// Início: a marca, a linha de baixo e os pesos. Declara o próprio contêiner ("cabecalho"): não usa
// o contêiner "pagina" do Início, que a Página não encontrada não tem. Em 390 px os links vão para
// uma segunda linha e quebram em quantas linhas precisarem; no desktop o <header> inteiro tem 64 px:
// o miolo mede 4 rem menos 1 px e a linha de baixo (border-b, no <header>) completa os 4 rem.
export function CabecalhoPublico() {
  return (
    <header className="@container/cabecalho border-b">
      <div className="flex flex-col py-3 @min-[46rem]/cabecalho:h-[calc(4rem_-_1px)] @min-[46rem]/cabecalho:flex-row @min-[46rem]/cabecalho:items-center @min-[46rem]/cabecalho:justify-between @min-[46rem]/cabecalho:py-0">
        <Link to={CAMINHOS.inicio} className="marca alvo-toque inline-flex items-center no-underline">
          {NOME_SITE}
        </Link>
        <nav aria-label={ROTULOS_DE_NAVEGACAO.cabecalho} className="flex flex-wrap gap-x-1 @min-[46rem]/cabecalho:gap-x-4">
          {NAVEGACAO_DO_CABECALHO.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end
              className="alvo-toque inline-flex items-center justify-center px-2 text-[0.9375rem] font-semibold no-underline decoration-[var(--cor-destaque)] decoration-[3px] underline-offset-[6px] first:pl-0 last:pr-0 hover:underline aria-[current=page]:underline"
            >
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
