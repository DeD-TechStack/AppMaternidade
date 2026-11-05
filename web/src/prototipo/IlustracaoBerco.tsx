import { Membro } from './Membro.tsx'

// Berço: o bebê dorme sob a manta, com a lua lá fora, e o adulto sai do quarto pela porta
// aberta. É a ilustração do estado vazio da Sessão (nenhuma sessão em andamento). Traço
// contínuo de tinta, preenchimento chapado nas cores dos tokens. Decorativa.
export function IlustracaoBerco({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="berco"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* lua crescente e estrelas */}
      <circle className="ilu-tinta" cx="92" cy="40" r="12" />
      <circle className="ilu-barro ilu-sem-traco" cx="97" cy="37" r="11" />
      <circle className="ilu-tinta ilu-sem-traco" cx="40" cy="30" r="2" />
      <circle className="ilu-tinta ilu-sem-traco" cx="124" cy="62" r="2" />
      <circle className="ilu-tinta ilu-sem-traco" cx="22" cy="68" r="2" />

      {/* berço: grades do lado de lá, travesseiro, colchão, bebê e a tábua da frente */}
      <path d="M40 108V150M58 108V150M76 108V150M94 108V150M112 108V150" />
      <rect className="ilu-fundo" x="18" y="100" width="120" height="8" rx="3" />
      <rect className="ilu-lavanda" x="24" y="150" width="108" height="16" rx="3" />
      <ellipse className="ilu-urucum" cx="88" cy="143" rx="34" ry="12" />
      <path d="M70 133Q74 143 70 154" />
      <circle className="ilu-barro" cx="50" cy="141" r="12" />
      <path d="M45 141Q48 144 51 141" />
      <path d="M46 130Q51 124 57 130" />
      <rect className="ilu-fundo" x="24" y="166" width="108" height="6" rx="2" />
      <rect className="ilu-fundo" x="14" y="92" width="10" height="128" rx="3" />
      <rect className="ilu-fundo" x="132" y="92" width="10" height="128" rx="3" />
      <circle className="ilu-fundo" cx="19" cy="89" r="5" />
      <circle className="ilu-fundo" cx="137" cy="89" r="5" />

      {/* porta aberta, vão da porta e o adulto saindo do quarto */}
      <rect className="ilu-papel" x="160" y="56" width="74" height="164" rx="2" />
      <path className="ilu-lavanda" d="M160 56L146 66V214L160 220Z" />
      <Membro d="M188 178L184 210" cor="tinta" />
      <Membro d="M208 178L214 210" cor="tinta" />
      <ellipse className="ilu-barro" cx="182" cy="214" rx="10" ry="5" />
      <ellipse className="ilu-barro" cx="216" cy="214" rx="10" ry="5" />
      <path className="ilu-urucum" d="M180 126Q198 116 216 126L220 178H176Z" />
      <circle className="ilu-papel" cx="198" cy="98" r="16" />
      <path className="ilu-tinta" d="M182 96C182 76 214 76 214 96C208 88 188 88 182 96Z" />
      <Membro d="M180 132L170 162" cor="urucum" />
      <circle className="ilu-barro" cx="169" cy="166" r="6" />
    </svg>
  )
}
