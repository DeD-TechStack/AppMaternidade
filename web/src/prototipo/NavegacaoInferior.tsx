import { Link } from 'react-router'

// O nome acessível de cada item é o próprio texto visível (WCAG 2.5.3): sem aria-label e sem
// caracteres invisíveis no texto. Só "Desenvolvimento" opta pela quebra automática de palavra
// (.nav-item-hifeniza, com o idioma pt-BR do <html>); nos outros itens a palavra não quebra, e
// como rede de segurança o CSS nunca deixa o rótulo vazar da coluna.
//
// A ordem do DOM é a ordem visual nos dois layouts (VIS-08): Hoje, "Em breve", e os 4 itens
// desativados. Na grade de 5 colunas o CSS posiciona a legenda sobre as colunas 2 a 5; na coluna
// única (barra estreita) ela aparece entre Hoje e Histórico, como título do grupo.
const EM_BREVE = ['Histórico', 'Desenvolvimento', 'Comunidade', 'Família'] as const
const ID_LEGENDA = 'nav-em-breve'

interface Props {
  /** Na tela Hoje o item Hoje é a página atual. */
  hojeAtual: boolean
}

// Só Hoje existe no protótipo; os outros quatro aparecem desativados, com "Em breve" uma vez.
export function NavegacaoInferior({ hojeAtual }: Props) {
  return (
    <nav aria-label="Principal" className="nav-inferior">
      {/* Chegar ao Hoje pela navegação leva o foco ao título da tela. */}
      <Link
        to="/app/hoje"
        state={{ foco: 'titulo' }}
        aria-current={hojeAtual ? 'page' : undefined}
        className="nav-item"
      >
        Hoje
      </Link>
      <p id={ID_LEGENDA} className="nav-legenda">
        Em breve
      </p>
      {EM_BREVE.map((nome) => (
        <button
          key={nome}
          type="button"
          aria-disabled="true"
          aria-describedby={ID_LEGENDA}
          className={nome === 'Desenvolvimento' ? 'nav-item nav-item-hifeniza' : 'nav-item'}
        >
          {nome}
        </button>
      ))}
    </nav>
  )
}
