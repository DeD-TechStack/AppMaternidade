// Cena de mamada de madrugada: adulto sentado com o bebê enrolado no colo, janela com lua
// crescente e uma luminária baixa. Traço contínuo de tinta, preenchimento chapado de tinta ou
// de papel, sem gradiente nem sombra. Decorativa: o texto ao lado diz tudo o que importa.
export function IlustracaoMamada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 320"
      className={`ilu ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* chão */}
      <path d="M16 292H464" />

      {/* janela, peitoril e lua crescente */}
      <rect className="ilu-papel" x="36" y="36" width="124" height="168" rx="4" />
      <path d="M98 36V204M36 120H160" />
      <rect className="ilu-tinta" x="28" y="204" width="140" height="10" rx="2" />
      <circle className="ilu-tinta" cx="67" cy="78" r="20" />
      <circle className="ilu-papel ilu-sem-traco" cx="76" cy="72" r="17" />
      <circle className="ilu-tinta ilu-sem-traco" cx="130" cy="66" r="2.5" />
      <circle className="ilu-tinta ilu-sem-traco" cx="126" cy="152" r="2.5" />
      <circle className="ilu-tinta ilu-sem-traco" cx="62" cy="160" r="2.5" />

      {/* luminária baixa sobre a mesa de apoio */}
      <rect className="ilu-tinta" x="392" y="236" width="64" height="10" rx="2" />
      <path d="M402 246V292M446 246V292" />
      <rect className="ilu-tinta" x="412" y="226" width="24" height="10" rx="2" />
      <path d="M424 226V188" />
      <path className="ilu-papel" d="M400 190L412 150H436L448 190Z" />
      <path d="M388 168L374 162M386 180L370 182M460 168L474 162M462 180L478 182" />

      {/* poltrona */}
      <rect className="ilu-tinta" x="190" y="96" width="128" height="176" rx="16" />
      <rect className="ilu-tinta" x="172" y="196" width="34" height="76" rx="12" />
      <rect className="ilu-tinta" x="302" y="196" width="34" height="76" rx="12" />
      <rect className="ilu-tinta" x="172" y="250" width="164" height="30" rx="10" />
      <path d="M190 280V292M318 280V292" />

      {/* adulto: tronco, colo, pernas e cabeça */}
      <path className="ilu-papel" d="M222 170C222 148 286 148 286 170L292 244H216Z" />
      <rect className="ilu-papel" x="206" y="232" width="96" height="26" rx="12" />
      <path d="M222 258V288M284 258V288" />
      <rect className="ilu-tinta" x="212" y="284" width="26" height="8" rx="3" />
      <rect className="ilu-tinta" x="268" y="284" width="26" height="8" rx="3" />
      <circle className="ilu-papel" cx="254" cy="128" r="20" />
      <path className="ilu-tinta" d="M234 126C234 104 274 104 274 126C268 116 244 116 234 126Z" />

      {/* bebê enrolado no colo e os braços que o seguram */}
      <ellipse
        className="ilu-papel"
        cx="262"
        cy="214"
        rx="44"
        ry="22"
        transform="rotate(-12 262 214)"
      />
      <path d="M250 196C254 208 254 220 250 232M270 192C274 204 274 216 270 228" />
      <circle className="ilu-papel" cx="224" cy="204" r="14" />
      <path d="M217 204Q221 208 225 204" />
      <path d="M226 176C212 196 220 226 246 234" />
      <path d="M282 176C300 196 296 226 280 232" />
    </svg>
  )
}
