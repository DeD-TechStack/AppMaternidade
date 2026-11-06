import { Membro } from './Membro.tsx'

// Mamada de madrugada: adulto na poltrona com o bebê enrolado no colo e, acima da poltrona, uma
// janela com lua crescente. Traço contínuo de tinta, preenchimento chapado nas cores dos tokens,
// sem gradiente nem sombra. Decorativa: o texto ao lado diz tudo o que importa.
//
// O viewBox é em pé (160 × 222) e a ilustração tem a mesma altura de viewBox da do colo: assim as
// duas, no Início, têm a mesma escala. A Sessão de uma mamada também usa esta.
//
// Proporções: a cabeça do adulto tem 20 de altura (cerca de 1/6 da figura em pé); a do bebê, 16,
// cerca de 1/4 do corpo dele, e menor que a do adulto. O adulto tem dois braços (que terminam em
// mãos sobre o bebê) e duas pernas (que terminam em sapatos).
export function IlustracaoMamada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="40 0 160 222"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
      data-ilustracao="mamada"
    >
      {/* chão */}
      <path d="M0 220H240" />

      {/* janela acima da poltrona, peitoril, lua crescente e estrelas */}
      <rect className="ilu-papel" x="96" y="10" width="60" height="40" rx="3" />
      <path d="M126 10V50M96 30H156" />
      <rect className="ilu-tinta" x="92" y="50" width="68" height="7" rx="2" />
      <circle className="ilu-tinta" cx="110" cy="21" r="7" />
      <circle className="ilu-papel ilu-sem-traco" cx="113.5" cy="19.5" r="6.5" />
      <circle className="ilu-tinta ilu-sem-traco" cx="142" cy="19" r="1.8" />
      <circle className="ilu-tinta ilu-sem-traco" cx="146" cy="41" r="1.8" />

      {/* poltrona */}
      <rect className="ilu-barro" x="80" y="62" width="96" height="144" rx="14" />
      <rect className="ilu-barro" x="66" y="124" width="26" height="82" rx="10" />
      <rect className="ilu-barro" x="164" y="124" width="26" height="82" rx="10" />
      <rect className="ilu-barro" x="66" y="172" width="124" height="28" rx="8" />
      <path d="M78 200V220M178 200V220" />

      {/* adulto: tronco, cabeça, rosto, pernas e sapatos */}
      <path className="ilu-urucum" d="M102 120C102 98 150 98 150 120L156 176H96Z" />
      <circle className="ilu-papel" cx="126" cy="93.5" r="10" />
      <path className="ilu-tinta" d="M116 91C116 77 136 77 136 91C132 86 120 86 116 91Z" />
      {/* rosto: dois olhos fechados separados (arcos de 4 de largura, 1/5 da cabeça) e uma boca pequena */}
      <path d="M120.5 94Q122.5 96 124.5 94" />
      <path d="M127.5 94Q129.5 96 131.5 94" />
      <path d="M124.5 99Q126 100 127.5 99" />
      <Membro d="M106 180L102 210" cor="tinta" />
      <Membro d="M146 180L150 210" cor="tinta" />
      <ellipse className="ilu-papel" cx="100" cy="214" rx="11" ry="6" />
      <ellipse className="ilu-papel" cx="152" cy="214" rx="11" ry="6" />

      {/* braços que seguram o bebê: ficam atrás dele, e as mãos aparecem sobre a manta */}
      <Membro d="M106 118C96 140 102 160 124 166" cor="urucum" />
      <Membro d="M146 118C158 140 152 158 132 164" cor="urucum" />

      {/* bebê enrolado no colo, com a cabeça à vista */}
      <ellipse
        className="ilu-papel"
        cx="128"
        cy="154"
        rx="30"
        ry="15"
        transform="rotate(-14 128 154)"
      />
      <circle className="ilu-barro" cx="100" cy="156" r="8" />
      <path d="M97.5 158Q100 160 102.5 158" />

      {/* mãos do adulto sobre a manta */}
      <circle className="ilu-papel" cx="124" cy="166" r="6" />
      <circle className="ilu-papel" cx="132" cy="164" r="6" />
    </svg>
  )
}
