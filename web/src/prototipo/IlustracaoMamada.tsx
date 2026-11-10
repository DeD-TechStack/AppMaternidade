import { Membro } from './Membro.tsx'

// Mamada de madrugada: adulto na poltrona com o bebê enrolado no colo, janela com lua crescente
// e uma luminária baixa. Traço contínuo de tinta, preenchimento chapado nas cores dos tokens, sem
// gradiente nem sombra. Decorativa: o texto ao lado diz tudo o que importa.
//
// Duas medidas do mesmo desenho: a quadrada (240 × 240), que a Sessão usa, e a larga (480 × 222),
// do Início, com a cena no meio e o chão indo de borda a borda, cortada rente à linha do chão para
// ela se apoiar na base do celular ao lado. A cena é a mesma nas duas.
export function IlustracaoMamada({
  className,
  larga = false,
  preserveAspectRatio,
}: {
  className?: string
  larga?: boolean
  /** A moldura da Sessão corta (`slice`) em vez de deixar vão: ver MidiaDaSessao. */
  preserveAspectRatio?: string
}) {
  return (
    <svg
      viewBox={larga ? '0 0 480 222' : '0 0 240 240'}
      preserveAspectRatio={preserveAspectRatio}
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="mamada"
    >
      {/* chão */}
      {larga ? <path d="M0 220H480" /> : <path d="M0 220H240" />}

      <g transform={larga ? 'translate(120 0)' : undefined}>
        {/* janela, peitoril, lua crescente e estrelas */}
        <rect className="ilu-papel" x="12" y="26" width="62" height="86" rx="3" />
        <path d="M43 26V112M12 69H74" />
        <rect className="ilu-tinta" x="6" y="112" width="74" height="8" rx="2" />
        <circle className="ilu-tinta" cx="28" cy="48" r="10" />
        <circle className="ilu-papel ilu-sem-traco" cx="33" cy="45" r="9" />
        <circle className="ilu-tinta ilu-sem-traco" cx="60" cy="40" r="2" />
        <circle className="ilu-tinta ilu-sem-traco" cx="58" cy="92" r="2" />
        <circle className="ilu-tinta ilu-sem-traco" cx="24" cy="92" r="2" />

        {/* luminária baixa sobre a mesa de apoio */}
        <rect className="ilu-tinta" x="186" y="160" width="44" height="8" rx="2" />
        <path d="M192 168V220M224 168V220" />
        <rect className="ilu-tinta" x="198" y="152" width="20" height="8" rx="2" />
        <path d="M208 152V128" />
        <path className="ilu-papel" d="M194 130L200 98H216L222 130Z" />
        <path d="M188 108L178 104M186 118L174 120M228 108L238 104" />

        {/* poltrona */}
        <rect className="ilu-barro" x="80" y="58" width="96" height="148" rx="14" />
        <rect className="ilu-barro" x="66" y="120" width="26" height="86" rx="10" />
        <rect className="ilu-barro" x="164" y="120" width="26" height="86" rx="10" />
        <rect className="ilu-barro" x="66" y="172" width="124" height="28" rx="8" />
        <path d="M78 200V220M178 200V220" />

        {/* adulto: tronco, cabeça, pernas e sapatos */}
        <path className="ilu-urucum" d="M102 114C102 96 150 96 150 114L156 176H96Z" />
        <circle className="ilu-papel" cx="126" cy="80" r="17" />
        <path className="ilu-tinta" d="M109 78C109 58 143 58 143 78C137 70 115 70 109 78Z" />
        <path d="M117 83Q120 86 123 83M129 83Q132 86 135 83" />
        <Membro d="M106 180L102 210" cor="tinta" />
        <Membro d="M146 180L150 210" cor="tinta" />
        <ellipse className="ilu-papel" cx="100" cy="214" rx="11" ry="6" />
        <ellipse className="ilu-papel" cx="152" cy="214" rx="11" ry="6" />

        {/* bebê enrolado no colo e os braços que o seguram */}
        <ellipse
          className="ilu-papel"
          cx="128"
          cy="154"
          rx="30"
          ry="15"
          transform="rotate(-14 128 154)"
        />
        <circle className="ilu-barro" cx="100" cy="156" r="11" />
        <path d="M95 156Q98 159 101 156" />
        <Membro d="M106 112C96 134 102 156 124 162" cor="urucum" />
        <Membro d="M146 112C158 134 152 154 132 160" cor="urucum" />
      </g>
    </svg>
  )
}
