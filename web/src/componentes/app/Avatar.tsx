// A cor de cada pessoa da família fictícia. Só papéis da paleta: mel e areia com cacau por cima
// (9,2:1 e 11,5:1), oliva com papel por cima (4,7:1).
const CORES: Record<string, string> = {
  Juliana: 'bg-mel text-cacau',
  Bruno: 'bg-oliva text-papel',
  Carla: 'bg-areia text-cacau',
}

/**
 * O avatar redondo de quem registrou: a inicial do nome, sem foto. É enfeite (o nome vem escrito ao
 * lado), então fica fora da árvore de acessibilidade.
 */
export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      data-avatar=""
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full font-titulo text-[17px] leading-none font-semibold ${CORES[nome] ?? 'bg-areia text-cacau'}`}
    >
      {nome.slice(0, 1)}
    </span>
  )
}
