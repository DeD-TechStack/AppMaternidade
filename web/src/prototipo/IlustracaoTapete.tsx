import { Membro } from './Membro.tsx'

// Tapete: bebê de bruços levantando a cabeça (tummy time) e um adulto ajoelhado ao lado, com a
// mão perto dele. Traço contínuo de tinta, preenchimento chapado nas cores dos tokens.
export function IlustracaoTapete({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="tapete"
    >
      {/* chão e tapete */}
      <path d="M0 220H240" />
      <rect className="ilu-fundo" x="14" y="198" width="212" height="14" rx="5" />

      {/* adulto ajoelhado: pernas, tronco, cabeça e o braço que alcança o bebê */}
      <rect className="ilu-tinta" x="156" y="186" width="76" height="24" rx="12" />
      <path className="ilu-lavanda" d="M176 134Q198 122 220 134L226 190H170Z" />
      <circle className="ilu-papel" cx="198" cy="110" r="18" />
      <path className="ilu-tinta" d="M180 108C180 86 216 86 216 108C210 100 186 100 180 108Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="191" cy="114" r="1.8" />
      <circle className="ilu-tinta ilu-sem-traco" cx="205" cy="114" r="1.8" />
      <path d="M192 121Q198 125 204 121" />
      <Membro d="M180 142L152 178" cor="lavanda" />
      <circle className="ilu-papel" cx="150" cy="182" r="7" />

      {/* bebê de bruços: corpo, pernas, braço de apoio e cabeça levantada */}
      <ellipse className="ilu-urucum" cx="84" cy="182" rx="40" ry="15" />
      <Membro d="M52 180Q38 178 32 190" cor="barro" />
      <Membro d="M120 184L128 198" cor="barro" />
      <circle className="ilu-barro" cx="134" cy="164" r="17" />
      <path d="M130 148Q134 141 139 148" />
      <path d="M129 164Q133 168 137 164" />
    </svg>
  )
}
