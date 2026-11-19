import './desenvolvimento-casa.css'

/**
 * Um fato curto (a faixa de idade) como etiqueta plana: um `p` de texto `pequeno` sobre o chão da outra faixa, sem
 * raio, sem contorno e sem cara de botão. Não é controle: não tem foco nem ação.
 */
export function Etiqueta({ texto }: { texto: string }) {
  return (
    <p className="dc-etiqueta text-pequeno font-texto" data-etiqueta="">
      {texto}
    </p>
  )
}
