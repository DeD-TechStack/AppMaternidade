type CorDoMembro = 'papel' | 'tinta' | 'urucum' | 'barro' | 'lavanda'

// Braço ou perna das ilustrações: um traço grosso de tinta com outro mais fino da cor por cima,
// o que dá ao membro o mesmo contorno das formas fechadas. Só existe dentro de uma ilustração.
export function Membro({ d, cor }: { d: string; cor: CorDoMembro }) {
  return (
    <>
      <path className="ilu-membro" d={d} />
      <path className={`ilu-membro-dentro ilu-dentro-${cor}`} d={d} />
    </>
  )
}
