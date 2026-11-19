import { Link, NavLink } from 'react-router'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { useAvisos } from './useAvisos.ts'

// A entrada "Avisos" do cabeçalho (RF14:RF-06): só existe com sessão (quem monta já decide isso), com a
// preferência ligada e depois da primeira leitura com sucesso. A contagem é uma pílula só visual
// (`aria-hidden`); o link diz o número uma vez, pelo nome de acessibilidade. O rótulo e a pílula ficam num só
// <span>: a pílula é uma caixa inline-flex dentro do texto corrido, e o sublinhado da página atual não passa por
// baixo dela.

const DESTINO_AVISOS = '/app/avisos'

// A pílula da contagem: mel com cacau, 24 px no mínimo, o número em tipo pequeno, semibold e tabular.
const PILULA =
  'ml-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-pilula bg-mel px-2 align-middle ' +
  'text-pequeno font-semibold leading-none text-cacau tabular'

interface Props {
  /** `linha`: o link do cabeçalho de 1100 para cima. `menu`: o primeiro item do menu abaixo disso. */
  variante: 'linha' | 'menu'
  /** Só no menu: fecha o painel ao seguir o link (também quando a pessoa já está na página). */
  aoFechar?: () => void
}

export function EntradaAvisos({ variante, aoFechar }: Props) {
  const { mostrado } = useAvisos()
  if (mostrado === null || !mostrado.ligados) return null

  const quantos = mostrado.avisos.length
  const pilula = AVISOS_TEXTOS.pilula(quantos, mostrado.maisDe50)
  const nome = AVISOS_TEXTOS.nomeDoLink(quantos, mostrado.maisDe50)
  const rotulo = (
    <span>
      {AVISOS_TEXTOS.linkDoCabecalho}
      {pilula ? (
        <span className={PILULA} aria-hidden="true" data-pilula-avisos="">
          {pilula}
        </span>
      ) : null}
    </span>
  )

  if (variante === 'menu') {
    // O mesmo desenho do botão de contorno, como o "Conta" do menu.
    return (
      <Link
        to={DESTINO_AVISOS}
        aria-label={nome}
        className="cm-botao cm-botao-contorno alvo-toque"
        data-botao="contorno"
        data-tamanho="site"
        onClick={aoFechar}
      >
        {rotulo}
      </Link>
    )
  }
  return (
    <NavLink to={DESTINO_AVISOS} end aria-label={nome} className="cm-cab-link cm-cab-entrar">
      {rotulo}
    </NavLink>
  )
}
