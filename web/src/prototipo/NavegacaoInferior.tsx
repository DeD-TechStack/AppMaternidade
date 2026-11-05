import { Link } from 'react-router'

// O nome acessível de cada item é o próprio texto visível (WCAG 2.5.3): sem aria-label e sem
// caracteres invisíveis no texto. Em 390 px, só "Desenvolvimento" precisa quebrar; a quebra
// vem do CSS (.nav-item-hifeniza, hyphens: auto, com o idioma pt-BR do <html>). Os outros
// itens ficam com hifens manuais e não quebram.
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
      <p id={ID_LEGENDA} className="nav-legenda">
        Em breve
      </p>
      <Link to="/app/hoje" aria-current={hojeAtual ? 'page' : undefined} className="nav-item row-start-2">
        Hoje
      </Link>
      {EM_BREVE.map((nome) => (
        <button
          key={nome}
          type="button"
          aria-disabled="true"
          aria-describedby={ID_LEGENDA}
          className={
            nome === 'Desenvolvimento' ? 'nav-item nav-item-hifeniza row-start-2' : 'nav-item row-start-2'
          }
        >
          {nome}
        </button>
      ))}
    </nav>
  )
}
