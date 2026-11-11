import { useRef, useState, type ReactNode } from 'react'
import type { AlvoDenuncia } from '../../dados/comunidade.ts'
import { DialogoBloquear } from './DialogoBloquear.tsx'
import { DialogoDenunciar } from './DialogoDenunciar.tsx'

type Autor = { id: string; apelido: string }

type Aberta =
  | { caixa: 'denunciar'; alvo: AlvoDenuncia; titulo: string; autor: Autor | null }
  | { caixa: 'bloquear'; autor: Autor }

interface Opcoes {
  moderacao: boolean
  /** O bloqueio vale: a tela relê o que está aberto e leva o foco (a caixa só fecha depois). */
  aoBloqueado: (autor: Autor, origem: HTMLElement | null) => Promise<void>
}

/**
 * As duas caixas de proteção (denunciar e bloquear) de uma tela, com o botão de origem guardado: o
 * foco volta a ele quando a caixa fecha. A denúncia enviada oferece "Bloquear <apelido>", que troca
 * uma caixa pela outra sem perder a origem.
 */
export function useCaixasDeProtecao({ moderacao, aoBloqueado }: Opcoes) {
  const [aberta, setAberta] = useState<Aberta | null>(null)
  const origem = useRef<HTMLElement | null>(null)
  const fechar = () => setAberta(null)

  let caixa: ReactNode = null
  if (aberta?.caixa === 'denunciar') {
    caixa = (
      <DialogoDenunciar
        alvo={aberta.alvo}
        titulo={aberta.titulo}
        autor={aberta.autor}
        origem={origem}
        aoFechar={fechar}
        aoBloquear={(autor) => setAberta({ caixa: 'bloquear', autor })}
      />
    )
  } else if (aberta?.caixa === 'bloquear') {
    const { autor } = aberta
    caixa = (
      <DialogoBloquear
        autor={autor}
        moderacao={moderacao}
        origem={origem}
        aoFechar={fechar}
        aoBloqueado={async () => {
          await aoBloqueado(autor, origem.current)
          fechar()
        }}
      />
    )
  }

  return {
    caixa,
    denunciar(alvo: AlvoDenuncia, titulo: string, autor: Autor | null, elemento: HTMLElement) {
      origem.current = elemento
      setAberta({ caixa: 'denunciar', alvo, titulo, autor })
    },
    bloquear(autor: Autor, elemento: HTMLElement) {
      origem.current = elemento
      setAberta({ caixa: 'bloquear', autor })
    },
  }
}
