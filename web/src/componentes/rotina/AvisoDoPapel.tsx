/** A frase do papel no lugar das ações que a pessoa não tem (R38-11). As ações proibidas ficam ocultas. */
export function AvisoDoPapel({ texto, className }: { texto: string; className?: string }) {
  return (
    <p className={`font-medium ${className ?? ''}`} data-sem-permissao="">
      {texto}
    </p>
  )
}
