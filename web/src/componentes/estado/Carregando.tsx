import { useEffect, useState, type HTMLAttributes } from 'react'

const ATRASO_DO_ESQUELETO_MS = 300

type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** A frase de "carregando" do catálogo da tela. A peça não traz texto próprio. */
  texto?: string
  /** Com um número de linhas, a peça é o esqueleto da lista ou do item, que só aparece depois de 300 ms. */
  linhas?: number
}

/**
 * O estado "carregando" de uma leitura, o mesmo para Rotina, Comunidade, Família e Conta. É uma região de status
 * ocupada; nunca cria um título (o `<h1>` da página fica onde estava durante a leitura). O esqueleto é estático: sem
 * movimento nenhum, então não há o que reduzir em `prefers-reduced-motion`.
 */
export function Carregando({ texto, linhas, className, ...resto }: Props) {
  if (linhas !== undefined) return <Esqueleto texto={texto} linhas={linhas} className={className} {...resto} />
  return (
    <p {...resto} role="status" aria-busy="true" data-estado="carregando" className={`py-2 text-(--cor-texto-2) ${className ?? ''}`}>
      {texto}
    </p>
  )
}

function Esqueleto({ texto, linhas = 3, className, ...resto }: Omit<Props, 'linhas'> & { linhas?: number }) {
  const [passou, setPassou] = useState(false)
  useEffect(() => {
    const relogio = setTimeout(() => setPassou(true), ATRASO_DO_ESQUELETO_MS)
    return () => clearTimeout(relogio)
  }, [])
  if (!passou) return null
  return (
    <div {...resto} role="status" aria-busy="true" data-estado="carregando" data-esqueleto="" className={`flex flex-col gap-3 ${className ?? ''}`}>
      {texto ? <span className="sr-only">{texto}</span> : null}
      {Array.from({ length: linhas }, (_, indice) => (
        <div key={indice} aria-hidden="true" className="h-20 rounded-cartao bg-(--cor-papel-fundo)" />
      ))}
    </div>
  )
}
