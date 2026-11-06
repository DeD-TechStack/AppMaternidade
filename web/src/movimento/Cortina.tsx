import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido, useTelaLarga } from './reduzido.ts'
import { TracoDesenhado } from './TracoDesenhado.tsx'

// M2: a cortina de abertura. Colunas verticais com duas camadas (a de cima na cor do texto, a de
// baixo na cor de destaque) sobem uma depois da outra, da esquerda para a direita, e revelam a
// página. A sobreposição é fixa, não pega clique e fica acima da página sem mudar o layout de
// nada. Roda uma vez por sessão do navegador: a marca fica em sessionStorage, então uma segunda
// montagem, ou a volta de uma aba em segundo plano, não a repete. Com movimento reduzido, ou
// quando já rodou, não renderiza nada. `aoTerminar` é chamado quando a cortina some do DOM, e
// também quando ela nem chegou a aparecer, para quem espera por ela não ficar parado.

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
  /** Mostra o traço desenhado no centro, antes de as colunas subirem. */
  comTraco?: boolean
}

export function Cortina({ aoTerminar, comTraco = false }: Props) {
  const { duracaoMs, curva, escalonamentoMs, atrasoMs, deslocamentoPct, colunas, atrasoCamadaMs } = CATALOGO.M2
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

  // Sem o traço não há o que esperar: as colunas começam logo.
  const inicioMs = comTraco ? atrasoMs : 0
  const subida = { y: `-${deslocamentoPct}%` }
  const transicao = (atraso: number) => ({ duration: duracaoMs / 1000, ease: curva, delay: atraso / 1000 })

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 flex overflow-hidden">
      {Array.from({ length: quantas }, (_, i) => {
        const ultima = i === quantas - 1
        return (
          <div key={i} className="relative flex-1">
            <motion.div
              className="absolute inset-0 bg-[var(--cor-destaque)]"
              initial={{ y: '0%' }}
              animate={subida}
              transition={transicao(inicioMs + i * escalonamentoMs + atrasoCamadaMs)}
              onAnimationComplete={ultima ? () => setAtiva(false) : undefined}
            />
            <motion.div
              className="absolute inset-0 bg-[var(--cor-texto)]"
              initial={{ y: '0%' }}
              animate={subida}
              transition={transicao(inicioMs + i * escalonamentoMs)}
            />
          </div>
        )
      })}
      {comTraco && (
        <motion.div
          className="absolute inset-0 grid place-items-center text-[color:var(--cor-fundo)]"
          initial={{ y: '0%' }}
          animate={subida}
          transition={transicao(inicioMs)}
        >
          <TracoDesenhado className="w-48" />
        </motion.div>
      )}
    </div>
  )
}
