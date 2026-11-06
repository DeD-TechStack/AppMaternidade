import { Membro } from './Membro.tsx'

// Tapete: bebê de bruços levantando a cabeça (tummy time) e um adulto ajoelhado ao lado, com a
// mão perto dele. Traço contínuo de tinta, preenchimento chapado nas cores dos tokens. O viewBox
// é justo (só a cena e o chão, que termina na base do desenho).
//
// Proporções: a cabeça do adulto tem 26 de altura contra cerca de 165 da figura em pé (cabeça,
// tronco e pernas à vista), cerca de 1/6,3; a do bebê tem 22, menos que a do adulto, e cerca de
// 1/4 do corpo dele. O adulto tem um braço à vista, que termina na mão, e as pernas terminam no
// sapato; o bebê tem um braço de apoio e uma perna, com mão e pé.
export function IlustracaoTapete({ className }: { className?: string }) {
  return (
    <svg
      viewBox="8 86 232 136"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="tapete"
    >
      {/* chão e tapete */}
      <path d="M0 220H240" />
      <rect className="ilu-fundo" x="14" y="198" width="212" height="14" rx="5" />

      {/* adulto ajoelhado: pernas e sapato, tronco, cabeça e o braço que alcança o bebê */}
      <rect className="ilu-tinta" x="156" y="186" width="76" height="24" rx="12" />
      <ellipse className="ilu-urucum" cx="228" cy="204" rx="9" ry="6" />
      <path className="ilu-lavanda" d="M176 134Q198 122 220 134L226 190H170Z" />
      <circle className="ilu-papel" cx="198" cy="112" r="13" />
      <path className="ilu-tinta" d="M185 110C185 94 211 94 211 110C207 104 189 104 185 110Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="193" cy="113.5" r="1.5" />
      <circle className="ilu-tinta ilu-sem-traco" cx="203" cy="113.5" r="1.5" />
      <path d="M194.5 119Q198 122 201.5 119" />
      <Membro d="M180 142L152 178" cor="lavanda" />
      <circle className="ilu-papel" cx="150" cy="182" r="7" />

      {/* bebê de bruços: corpo, perna, braço de apoio e cabeça levantada */}
      <ellipse className="ilu-urucum" cx="84" cy="182" rx="40" ry="15" />
      <Membro d="M52 180Q38 178 32 190" cor="barro" />
      <circle className="ilu-barro" cx="31" cy="192" r="5" />
      <Membro d="M110 188L118 198" cor="barro" />
      <circle className="ilu-barro" cx="119" cy="200" r="4.5" />
      <circle className="ilu-barro" cx="124" cy="166" r="11" />
      <path d="M121 157Q124 152 127 157" />
      <path d="M121 168Q124 171 127 168" />
    </svg>
  )
}
