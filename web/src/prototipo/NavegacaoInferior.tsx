import { useId } from 'react'
import { Clock, Heart, House, Sprout, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { useVitrine } from './vitrine.ts'

// O nome acessível de cada item é o próprio texto visível (WCAG 2.5.3): sem aria-label e sem
// caracteres invisíveis no texto. O ícone é decorativo (aria-hidden) e vem sempre em cima do
// rótulo. Só "Desenvolvimento" opta pela quebra automática de palavra (.nav-item-hifeniza, com o
// idioma pt-BR do <html>), como rede de segurança: a barra de 5 colunas dá a cada rótulo a largura
// de uma linha só (ver .nav-inferior em index.css).
//
// A ordem do DOM é a ordem visual nos três layouts (VIS-08): Hoje, "Em breve", e os 4 itens
// desativados. Na grade de 5 colunas o CSS posiciona a legenda sobre as colunas 2 a 5; na coluna
// única (barra estreita) e na faixa lateral do layout largo ela aparece entre Hoje e Histórico,
// como título do grupo.
const EM_BREVE: ReadonlyArray<{ nome: string; icone: LucideIcon }> = [
  { nome: 'Histórico', icone: Clock },
  { nome: 'Desenvolvimento', icone: Sprout },
  { nome: 'Comunidade', icone: Users },
  { nome: 'Família', icone: Heart },
]

interface Props {
  /** Na tela Hoje o item Hoje é a página atual ("page"); na Sessão ele marca a aba de origem ("true"). */
  hojeAtual: boolean
}

// Só Hoje existe no protótipo; os outros quatro aparecem desativados, com "Em breve" uma vez.
export function NavegacaoInferior({ hojeAtual }: Props) {
  const vitrine = useVitrine()
  const idLegenda = useId()
  // Num aparelho do Início não há id (a página já tem a navegação de verdade) e nada entra no Tab.
  const idDaLegenda = vitrine ? undefined : idLegenda
  const tab = vitrine ? -1 : undefined

  return (
    <nav aria-label="Principal" className="nav-inferior">
      {/* Chegar ao Hoje pela navegação leva o foco ao título da tela. */}
      <Link
        to="/app/hoje"
        state={{ foco: 'titulo' }}
        aria-current={hojeAtual ? 'page' : 'true'}
        tabIndex={tab}
        className="nav-item"
      >
        <House size={20} strokeWidth={1.75} aria-hidden="true" />
        <span>Hoje</span>
      </Link>
      <p id={idDaLegenda} className="nav-legenda">
        Em breve
      </p>
      {EM_BREVE.map(({ nome, icone: Icone }) => (
        <button
          key={nome}
          type="button"
          aria-disabled="true"
          aria-describedby={idDaLegenda}
          tabIndex={tab}
          className={nome === 'Desenvolvimento' ? 'nav-item nav-item-hifeniza' : 'nav-item'}
        >
          <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>{nome}</span>
        </button>
      ))}
    </nav>
  )
}
