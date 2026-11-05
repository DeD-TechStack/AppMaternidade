import { Membro } from './Membro.tsx'

// Passeio: adulto empurrando o carrinho, com o bebê espiando sob a capota. Traço contínuo de
// tinta, preenchimento chapado nas cores dos tokens.
export function IlustracaoPasseio({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="passeio"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* adulto: pernas, sapatos, tronco, cabeça e o braço até o puxador */}
      <Membro d="M72 150L58 206" cor="tinta" />
      <Membro d="M92 150L108 204" cor="tinta" />
      <ellipse className="ilu-papel" cx="54" cy="212" rx="12" ry="6" />
      <ellipse className="ilu-papel" cx="112" cy="210" rx="12" ry="6" />
      <path className="ilu-lavanda" d="M60 92Q80 82 100 92L106 154H56Z" />
      <circle className="ilu-papel" cx="80" cy="68" r="18" />
      <path className="ilu-tinta" d="M62 66C62 44 98 44 98 66C92 58 68 58 62 66Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="90" cy="70" r="1.8" />
      <path d="M88 78Q93 81 97 77" />
      <Membro d="M96 100L132 118" cor="lavanda" />
      <circle className="ilu-papel" cx="134" cy="118" r="6" />

      {/* carrinho: puxador, cesto, bebê, capota, eixos e rodas */}
      <path d="M150 134L136 116L128 116" />
      <path className="ilu-lavanda" d="M148 130H214Q214 178 176 178H150Z" />
      <circle className="ilu-barro" cx="180" cy="136" r="13" />
      <path className="ilu-urucum" d="M150 132Q180 82 214 132Z" />
      <path d="M164 178V190M204 178V190" />
      <circle className="ilu-papel" cx="164" cy="204" r="14" />
      <circle className="ilu-papel" cx="204" cy="204" r="14" />
      <circle className="ilu-tinta ilu-sem-traco" cx="164" cy="204" r="3" />
      <circle className="ilu-tinta ilu-sem-traco" cx="204" cy="204" r="3" />
    </svg>
  )
}
