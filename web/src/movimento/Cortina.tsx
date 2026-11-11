import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido, useTelaLarga } from './reduzido.ts'

// M2: a cortina do primeiro carregamento. Colunas verticais (6 no largo, 4 no estreito) com duas
// camadas: a de cima, de cacau, sobe primeiro; a de baixo, de mel, sobe 120 ms depois, e a página
// aparece. A sobreposição é fixa, não pega clique e não muda o layout de nada. Sem tela de abertura:
// a página já está montada por baixo. Roda uma vez por sessão do navegador (a marca fica em
// sessionStorage). Com movimento reduzido, ou quando já rodou, não renderiza nada. `aoTerminar` é
// chamado quando a cortina some, e também quando ela nem chegou a aparecer.

const MARCA = 'cortina-vista'

function jaFoiVista(): boolean {
  try {
    return window.sessionStorage.getItem(MARCA) === '1'
  } catch {
    return false
  }
}

function marcarComoVista(): void {
  try {
    window.sessionStorage.setItem(MARCA, '1')
  } catch {
    // Sem armazenamento da sessão a cortina pode repetir; não há o que fazer.
  }
}

interface Props {
  aoTerminar?: () => void
}

export function Cortina({ aoTerminar }: Props) {
  const { duracaoMs, curva, escalonamentoMs, deslocamentoPct, colunas, atrasoCamadaMs } = CATALOGO.M2
  const reduzido = usePrefereMovimentoReduzido()
  const largo = useTelaLarga()
  const [ativa, setAtiva] = useState(() => !jaFoiVista())
  const [quantas] = useState(() => (largo ? colunas.largo : colunas.estreito))
  const avisou = useRef(false)
  const pular = reduzido || !ativa

  useEffect(() => {
    marcarComoVista()
  }, [])

  useEffect(() => {
    if (!pular || avisou.current) return
    avisou.current = true
    aoTerminar?.()
  }, [pular, aoTerminar])

  if (pular) return null

  const subida = { y: `-${deslocamentoPct}%` }
  const transicao = (atraso: number) => ({ duration: duracaoMs / 1000, ease: curva, delay: atraso / 1000 })

  return (
    <div aria-hidden="true" data-cortina="" className="pointer-events-none fixed inset-0 z-50 flex overflow-hidden">
      {Array.from({ length: quantas }, (_, i) => {
        const ultima = i === quantas - 1
        return (
          <div key={i} className="relative flex-1">
            <motion.div
              className="absolute inset-0 bg-mel"
              initial={{ y: '0%' }}
              animate={subida}
              transition={transicao(i * escalonamentoMs + atrasoCamadaMs)}
              onAnimationComplete={ultima ? () => setAtiva(false) : undefined}
            />
            <motion.div
              className="absolute inset-0 bg-cacau"
              initial={{ y: '0%' }}
              animate={subida}
              transition={transicao(i * escalonamentoMs)}
            />
          </div>
        )
      })}
    </div>
  )
}
