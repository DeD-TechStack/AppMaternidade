import { Membro } from './Membro.tsx'

// Colo: adulto sentado num banquinho com o bebê enrolado nos braços. Traço contínuo de tinta de
// uma espessura só, preenchimento chapado nas cores dos tokens. Decorativa: o texto da página
// diz tudo o que importa.
export function IlustracaoColo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="colo"
    >
      {/* chão e banquinho */}
      <path d="M0 220H240" />
      <rect className="ilu-tinta" x="68" y="186" width="104" height="12" rx="4" />
      <path d="M82 198V220M158 198V220" />

      {/* pernas e sapatos */}
      <Membro d="M98 184L96 212" cor="tinta" />
      <Membro d="M142 184L144 212" cor="tinta" />
      <ellipse className="ilu-urucum" cx="92" cy="214" rx="12" ry="6" />
      <ellipse className="ilu-urucum" cx="148" cy="214" rx="12" ry="6" />

      {/* tronco, colo e cabeça */}
      <path className="ilu-lavanda" d="M92 112C92 94 148 94 148 112L156 176H84Z" />
      <rect className="ilu-tinta" x="80" y="164" width="80" height="26" rx="13" />
      <circle className="ilu-papel" cx="120" cy="76" r="20" />
      <path className="ilu-tinta" d="M100 74C100 50 140 50 140 74C132 64 108 64 100 74Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="112" cy="80" r="1.8" />
      <circle className="ilu-tinta ilu-sem-traco" cx="128" cy="80" r="1.8" />
      <path d="M113 88Q120 93 127 88" />

      {/* bebê enrolado e os braços que o seguram */}
      <ellipse
        className="ilu-papel"
        cx="122"
        cy="150"
        rx="36"
        ry="17"
        transform="rotate(-12 122 150)"
      />
      <path d="M112 138Q116 150 110 162" />
      <circle className="ilu-barro" cx="90" cy="152" r="13" />
      <path d="M84 152Q88 156 92 152" />
      <Membro d="M94 104C80 128 88 160 116 166" cor="lavanda" />
      <Membro d="M146 104C162 130 152 158 128 164" cor="lavanda" />
      <circle className="ilu-papel" cx="116" cy="166" r="7" />
      <circle className="ilu-papel" cx="128" cy="164" r="7" />
    </svg>
  )
}
