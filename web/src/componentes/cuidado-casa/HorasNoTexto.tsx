const HORA = /(\d{2}:\d{2})/

/**
 * Uma frase do deck com as horas (hh:mm) em `<strong data-cc-hora>`: as horas carregam a ideia da página (quem
 * começou, quem encerrou, quem anotou), e o CSS as põe no tipo dos títulos. A frase não muda: só ganha marcação.
 */
export function HorasNoTexto({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(HORA).map((parte, i) =>
        i % 2 === 1 ? (
          <strong key={i} data-cc-hora="" className="cc-hora">
            {parte}
          </strong>
        ) : (
          parte
        ),
      )}
    </>
  )
}
