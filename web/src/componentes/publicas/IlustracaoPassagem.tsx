import { Membro } from '../../prototipo/Membro.tsx'

// Passagem de turno: dois adultos de frente um para o outro, o da esquerda entregando o bebê enrolado
// ao da direita, e um relógio na parede entre as cabeças. Mesma linguagem das outras cinco (traço
// contínuo de tinta, preenchimento chapado nas cores dos tokens, sem gradiente nem sombra); o viewBox é
// justo (só a cena e o chão, que termina na base do desenho). A cabeça do bebê é barro: a moldura que a
// leva é lavanda, onde ela se lê. Decorativa: o texto da página diz tudo o que importa.
export function IlustracaoPassagem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="8 72 224 150"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="passagem"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* relógio na parede, entre as duas cabeças */}
      <circle className="ilu-papel" cx="120" cy="98" r="18" />
      <path d="M120 98V86M120 98L129 104" />
      <circle className="ilu-tinta ilu-sem-traco" cx="120" cy="98" r="2.5" />

      {/* adulto que entrega: pernas, sapatos, tronco, cabeça e cabelo */}
      <Membro d="M44 180L42 210" cor="tinta" />
      <Membro d="M60 180L62 210" cor="tinta" />
      <ellipse className="ilu-papel" cx="40" cy="214" rx="11" ry="6" />
      <ellipse className="ilu-papel" cx="64" cy="214" rx="11" ry="6" />
      <path className="ilu-urucum" d="M34 128Q52 118 70 128L74 180H30Z" />
      <circle className="ilu-papel" cx="52" cy="100" r="17" />
      <path className="ilu-tinta" d="M35 98C35 78 69 78 69 98C63 90 41 90 35 98Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="58" cy="100" r="1.8" />
      <circle className="ilu-tinta ilu-sem-traco" cx="66" cy="100" r="1.8" />
      <path d="M54 108Q59 112 63 108" />

      {/* adulto que recebe: pernas, sapatos, tronco, cabeça e cabelo */}
      <Membro d="M180 180L178 210" cor="tinta" />
      <Membro d="M196 180L198 210" cor="tinta" />
      <ellipse className="ilu-papel" cx="176" cy="214" rx="11" ry="6" />
      <ellipse className="ilu-papel" cx="200" cy="214" rx="11" ry="6" />
      <path className="ilu-barro" d="M170 128Q188 118 206 128L210 180H166Z" />
      <circle className="ilu-papel" cx="188" cy="100" r="17" />
      <path className="ilu-tinta" d="M171 98C171 78 205 78 205 98C199 90 177 90 171 98Z" />
      <circle className="ilu-tinta ilu-sem-traco" cx="182" cy="100" r="1.8" />
      <circle className="ilu-tinta ilu-sem-traco" cx="174" cy="100" r="1.8" />
      <path d="M186 108Q181 112 177 108" />

      {/* bebê enrolado no ar entre os dois, com a cabeça virada para quem entrega */}
      <ellipse
        className="ilu-papel"
        cx="120"
        cy="148"
        rx="32"
        ry="15"
        transform="rotate(-8 120 148)"
      />
      <path d="M130 135Q134 148 128 160" />
      <circle className="ilu-barro" cx="92" cy="150" r="13" />
      <path d="M87 150Q91 154 95 150" />

      {/* os dois braços por baixo do bebê, e as mãos */}
      <Membro d="M62 132C62 156 82 166 108 162" cor="urucum" />
      <Membro d="M178 132C178 156 158 166 132 162" cor="barro" />
      <circle className="ilu-papel" cx="108" cy="162" r="7" />
      <circle className="ilu-papel" cx="132" cy="162" r="7" />
    </svg>
  )
}
