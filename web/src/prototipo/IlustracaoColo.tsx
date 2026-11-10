import { Membro } from './Membro.tsx'

// Colo: adulto em pé embalando o bebê nos braços. Traço contínuo de tinta de uma espessura só,
// preenchimento chapado nas cores dos tokens. Decorativa: o texto da página diz tudo o que importa.
//
// O viewBox é em pé (160 × 222), com a mesma altura de viewBox da ilustração da mamada: as duas,
// no Início, têm a mesma escala. O chão termina na base do desenho.
//
// Proporções: a cabeça do adulto tem 29 de altura (com o cabelo) contra cerca de 188 da figura
// em pé, cerca de 1/6,4; o bebê tem a cabeça à vista, de 18 de altura (menor que a do adulto), e
// cerca de 1/3 do corpo dele. Os braços saem dos ombros, envolvem o bebê e terminam em mãos; as
// pernas terminam em sapatos.
export function IlustracaoColo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="40 0 160 222"
      preserveAspectRatio="xMidYMax meet"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="colo"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* pernas e sapatos */}
      <Membro d="M108 146L106 210" cor="tinta" />
      <Membro d="M132 146L134 210" cor="tinta" />
      <ellipse className="ilu-urucum" cx="102" cy="215" rx="12" ry="5" />
      <ellipse className="ilu-urucum" cx="138" cy="215" rx="12" ry="5" />

      {/* tronco, cabeça, cabelo e rosto */}
      <path className="ilu-lavanda" d="M96 84C96 56 144 56 144 84L150 146H90Z" />
      <circle className="ilu-papel" cx="120" cy="48" r="14" />
      <path className="ilu-tinta" d="M106 46C106 28 134 28 134 46C129 38 111 38 106 46Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="115.5" cy="49" r="1.5" />
      <circle className="ilu-tinta ilu-sem-traco" cx="124.5" cy="49" r="1.5" />
      <path d="M116 55Q120 58 124 55" />

      {/* braços: saem dos ombros e passam por trás do bebê; as mãos aparecem sobre a manta */}
      <Membro d="M98 74C82 92 84 124 112 128" cor="lavanda" />
      <Membro d="M142 74C158 94 152 124 130 128" cor="lavanda" />

      {/* bebê embalado, deitado na diagonal, com a cabeça à vista no alto */}
      <ellipse
        className="ilu-papel"
        cx="120"
        cy="112"
        rx="26"
        ry="12"
        transform="rotate(18 120 112)"
      />
      <circle className="ilu-barro" cx="95" cy="103" r="9" />
      <path d="M91 102Q93 104 95 102" />
      <path d="M93 107Q95 109 97 107" />

      {/* mãos do adulto sobre a manta */}
      <circle className="ilu-papel" cx="112" cy="128" r="6" />
      <circle className="ilu-papel" cx="130" cy="128" r="6" />
    </svg>
  )
}
