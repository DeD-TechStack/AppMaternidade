import { Membro } from '../../prototipo/Membro.tsx'

// Troca: dois adultos de pé, frente a frente, e um passa o bebê para o colo do outro. O bebê vai
// enrolado na manta, nos braços entre os dois, na mesma escala do bebê do colo. É a ilustração de
// "Cada pessoa com a própria conta". Traço contínuo de tinta de uma espessura só, preenchimento
// chapado nas cores dos tokens, como as cinco do protótipo. Decorativa: o texto da página diz tudo
// o que importa. O viewBox é justo (só a cena e o chão, que termina na base do desenho e vai de
// borda a borda).
export function IlustracaoTroca({ className }: { className?: string }) {
  return (
    <svg
      viewBox="12 52 216 170"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="troca"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* adulto da esquerda: pernas, sapatos, tronco e cabeça */}
      <Membro d="M38 168L34 210" cor="tinta" />
      <Membro d="M56 168L62 210" cor="tinta" />
      <ellipse className="ilu-papel" cx="30" cy="214" rx="12" ry="6" />
      <ellipse className="ilu-papel" cx="66" cy="214" rx="12" ry="6" />
      <path className="ilu-urucum" d="M28 116Q48 104 68 116L74 172H22Z" />
      <circle className="ilu-papel" cx="48" cy="88" r="19" />
      <path className="ilu-tinta" d="M29 86C29 62 67 62 67 86C61 78 35 78 29 86Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="58" cy="92" r="1.8" />
      <path d="M56 100Q61 103 66 99" />

      {/* adulto da direita: pernas, sapatos, tronco e cabeça */}
      <Membro d="M186 168L182 210" cor="tinta" />
      <Membro d="M204 168L210 210" cor="tinta" />
      <ellipse className="ilu-urucum" cx="178" cy="214" rx="12" ry="6" />
      <ellipse className="ilu-urucum" cx="214" cy="214" rx="12" ry="6" />
      <path className="ilu-lavanda" d="M174 116Q194 104 214 116L220 172H168Z" />
      <circle className="ilu-papel" cx="194" cy="88" r="19" />
      <path className="ilu-tinta" d="M175 86C175 62 213 62 213 86C207 78 181 78 175 86Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="184" cy="92" r="1.8" />
      <path d="M176 99Q181 103 186 100" />

      {/* o bebê enrolado na manta, entre os dois, com a cabeça virada para quem recebe */}
      <ellipse
        className="ilu-papel"
        cx="120"
        cy="142"
        rx="36"
        ry="17"
        transform="rotate(-10 120 142)"
      />
      <path d="M110 128Q114 142 108 156" />
      <circle className="ilu-barro" cx="152" cy="132" r="13" />
      <path d="M147 132Q151 135 155 132" />
      <path className="ilu-tinta" d="M142 126C144 116 160 116 162 126C156 122 148 122 142 126Z" />

      {/* os braços e as mãos que seguram o bebê por baixo */}
      <Membro d="M68 124C80 142 94 156 112 158" cor="urucum" />
      <Membro d="M174 124C162 142 146 156 128 158" cor="lavanda" />
      <circle className="ilu-papel" cx="112" cy="159" r="7" />
      <circle className="ilu-papel" cx="128" cy="159" r="7" />
    </svg>
  )
}
