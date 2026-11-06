import { Membro } from '../../prototipo/Membro.tsx'

// Troca: dois adultos de pé, frente a frente, e um passa o bebê enrolado para o colo do outro. É a
// ilustração de "Cada pessoa com a própria conta". Traço contínuo de tinta de uma espessura só,
// preenchimento chapado nas cores dos tokens, como as cinco do protótipo. Decorativa: o texto da
// página diz tudo o que importa. O viewBox é justo (só a cena e o chão, que termina na base do
// desenho e vai de borda a borda).
export function IlustracaoTroca({ className }: { className?: string }) {
  return (
    <svg
      viewBox="24 56 192 164"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="troca"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* adulto da esquerda: pernas, sapatos, tronco e cabeça */}
      <Membro d="M54 168L50 210" cor="tinta" />
      <Membro d="M74 168L80 210" cor="tinta" />
      <ellipse className="ilu-papel" cx="46" cy="214" rx="12" ry="6" />
      <ellipse className="ilu-papel" cx="84" cy="214" rx="12" ry="6" />
      <path className="ilu-urucum" d="M44 116Q64 104 84 116L90 172H38Z" />
      <circle className="ilu-papel" cx="64" cy="88" r="18" />
      <path className="ilu-tinta" d="M46 86C46 64 82 64 82 86C76 78 52 78 46 86Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="73" cy="92" r="1.8" />
      <path d="M71 100Q76 103 81 99" />

      {/* adulto da direita: pernas, sapatos, tronco e cabeça */}
      <Membro d="M170 168L166 210" cor="tinta" />
      <Membro d="M190 168L196 210" cor="tinta" />
      <ellipse className="ilu-urucum" cx="162" cy="214" rx="12" ry="6" />
      <ellipse className="ilu-urucum" cx="200" cy="214" rx="12" ry="6" />
      <path className="ilu-lavanda" d="M156 116Q176 104 196 116L202 172H150Z" />
      <circle className="ilu-papel" cx="176" cy="88" r="18" />
      <path className="ilu-tinta" d="M158 86C158 64 194 64 194 86C188 78 164 78 158 86Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="167" cy="92" r="1.8" />
      <path d="M159 99Q164 103 169 100" />

      {/* o bebê enrolado na manta, entre os dois */}
      <ellipse
        className="ilu-lavanda"
        cx="122"
        cy="138"
        rx="27"
        ry="13"
        transform="rotate(-8 122 138)"
      />
      <circle className="ilu-barro" cx="102" cy="132" r="11" />
      <path d="M97 132Q100 135 103 132" />
      <path d="M114 126Q118 138 112 150" />

      {/* os braços e as mãos que o seguram */}
      <Membro d="M82 124C96 134 106 142 120 146" cor="urucum" />
      <Membro d="M158 124C146 134 138 142 124 146" cor="lavanda" />
      <circle className="ilu-papel" cx="119" cy="147" r="7" />
      <circle className="ilu-papel" cx="126" cy="147" r="7" />
    </svg>
  )
}
