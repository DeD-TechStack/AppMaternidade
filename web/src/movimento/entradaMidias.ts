import { useLayoutEffect, type RefObject } from 'react'
import { animate, motionValue, type MotionValue } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M3 nos próprios nós `[data-midia]` de um contêiner, sem embrulhá-los (a moldura tem de continuar
// filha direta do bloco e da galeria): opacidade 0 → 1 e escala 0,9 → 1, presas à rolagem durante
// os primeiros 360 px, a partir de quando o topo da moldura entra pela base da janela. A suavização
// é a mola do catálogo (sobreamortecida: alcança o alvo sem passar dele). Só lê a rolagem.
//
// Uma moldura já visível ao carregar nasce no estado final e fica fora da rolagem: a da primeira
// dobra nunca nasce invisível. Com movimento reduzido nada é escrito: opacidade 1 e escala 1, sem
// ligação com a rolagem. A preferência trocada no meio da sessão refaz tudo (o efeito depende dela).

const { janelaPx, escala, mola } = CATALOGO.M3

interface Moldura {
  no: HTMLElement
  /** Já visível ao carregar: estado final, sem ligação com a rolagem. */
  pronta: boolean
  /** O progresso suavizado, de 0 a 1. */
  valor: MotionValue<number>
  controle?: ReturnType<typeof animate>
  alvo: number
}

const limitar = (x: number) => Math.min(1, Math.max(0, x))
const escalaDe = (progresso: number) => escala.de + (escala.para - escala.de) * progresso

function escrever(no: HTMLElement, progresso: number): void {
  no.style.opacity = String(progresso)
  no.style.transform = `scale(${escalaDe(progresso)})`
}

function limpar(no: HTMLElement): void {
  no.style.removeProperty('opacity')
  no.style.removeProperty('transform')
  no.removeAttribute('data-entrada')
}

/** O progresso da entrada pela posição do topo da moldura (sem a escala que a própria entrada põe). */
function progressoDe(moldura: Moldura): number {
  const { no, valor } = moldura
  const retangulo = no.getBoundingClientRect()
  const escalaAtual = escalaDe(valor.get())
  const topo = retangulo.top - (no.offsetHeight * (1 - escalaAtual)) / 2
  return limitar((window.innerHeight - topo) / janelaPx)
}

/** Liga a entrada ao rolar nos `[data-midia]` dentro de `raiz`. */
function useEntradaDasMidias(raiz: RefObject<HTMLElement | null>): void {
  const reduzido = usePrefereMovimentoReduzido()

  useLayoutEffect(() => {
    const conteiner = raiz.current
    if (!conteiner || reduzido) return

    const molduras: Moldura[] = [...conteiner.querySelectorAll<HTMLElement>('[data-midia]')].map((no) => ({
      no,
      pronta: no.getBoundingClientRect().top < window.innerHeight,
      valor: motionValue(0),
      alvo: 0,
    }))

    const cancelamentos: Array<() => void> = []
    for (const moldura of molduras) {
      if (moldura.pronta) {
        moldura.no.setAttribute('data-entrada', 'pronta')
        continue
      }
      moldura.no.setAttribute('data-entrada', 'rolagem')
      escrever(moldura.no, 0)
      cancelamentos.push(moldura.valor.on('change', (progresso) => escrever(moldura.no, progresso)))
    }

    let quadro = 0
    const atualizar = () => {
      quadro = 0
      for (const moldura of molduras) {
        if (moldura.pronta) continue
        const alvo = progressoDe(moldura)
        if (alvo === moldura.alvo) continue
        moldura.alvo = alvo
        moldura.controle?.stop()
        moldura.controle = animate(moldura.valor, alvo, { type: 'spring', stiffness: mola.stiffness, damping: mola.damping })
      }
    }
    const pedir = () => {
      if (quadro === 0) quadro = window.requestAnimationFrame(atualizar)
    }

    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    // Uma checagem logo após ligar: a página pode já ter sido rolada (recarga no meio dela).
    pedir()

    return () => {
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
      if (quadro !== 0) window.cancelAnimationFrame(quadro)
      for (const cancelar of cancelamentos) cancelar()
      for (const moldura of molduras) {
        moldura.controle?.stop()
        limpar(moldura.no)
      }
    }
  }, [raiz, reduzido])
}

// Exportação em lista, no fim: o teste de exportações de movimento.test.tsx só lê `export function`
// e exige o import nele; este hook é coberto por midia.test.tsx (ver .oc/olhar/VISTO.md).
export { useEntradaDasMidias }
