import { useEffect, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { FluxosDemo, rotaInicialDoFluxo } from './FluxosDemo.tsx'
import { criarMotorDemo, type MotorDemo } from './motorDemo.ts'
import { ProvedorDemoRotina } from './ProvedorDemoRotina.tsx'
import { RoteadorIsolado } from './RoteadorIsolado.tsx'
import { DEMO_TEXTOS } from './textos.ts'
import type { FluxoDemoTelefone } from './textosCasca.ts'

interface Props {
  fluxo: FluxoDemoTelefone
  aoFechar: () => void
}

/**
 * Núcleo carregado sob demanda (React.lazy) quando o visitante toca em "Experimentar".
 * Instancia um motor de memória privado, um roteador isolado e os componentes reais do app.
 */
export default function DemoTelefoneMotor({ fluxo, aoFechar }: Props) {
  const [ciclo, setCiclo] = useState(0)
  const [motor, setMotor] = useState<MotorDemo>(() => criarMotorDemo(fluxo))
  const grupoRef = useRef<HTMLDivElement>(null)
  const botaoSairRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    botaoSairRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const elemento = grupoRef.current
    if (!elemento) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape' || evento.defaultPrevented) return
      // Se um menu local de escolhas (Fralda ou Mais) estiver aberto, deixa a barra fechar esse menu primeiro.
      // Quando há apenas a confirmação visível (sem [role="group"]), Escape sai normalmente da prévia.
      if (elemento?.querySelector('[data-painel] [role="group"]')) return
      evento.stopPropagation()
      aoFechar()
    }
    elemento.addEventListener('keydown', aoTeclar)
    return () => elemento.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  const reiniciar = () => {
    setMotor(criarMotorDemo(fluxo))
    setCiclo((anterior) => anterior + 1)
  }

  const pessoaInicial = fluxo === 'historico' || fluxo === 'hoje' ? 'icaro' : 'juliana'
  const madrugada = fluxo === 'hoje'

  return (
    <div
      ref={grupoRef}
      role="group"
      aria-label={DEMO_TEXTOS.regiao(fluxo)}
      data-demo-painel={fluxo}
      data-tema-local={madrugada ? 'madrugada' : undefined}
      className="dt-tela"
    >
      <div className="dt-topo">
        <button
          type="button"
          className="dt-topo-botao alvo-toque"
          aria-label={`${DEMO_TEXTOS.reiniciar} ${DEMO_TEXTOS.titulos[fluxo]}`}
          onClick={reiniciar}
        >
          <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{DEMO_TEXTOS.reiniciar}</span>
        </button>
        <button
          ref={botaoSairRef}
          type="button"
          className="dt-topo-botao alvo-toque"
          aria-label={`${DEMO_TEXTOS.voltarImagem} (${DEMO_TEXTOS.titulos[fluxo]})`}
          onClick={aoFechar}
        >
          <X className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{DEMO_TEXTOS.voltarImagem}</span>
        </button>
      </div>

      <RoteadorIsolado key={`${fluxo}-${ciclo}`} entradaInicial={rotaInicialDoFluxo(fluxo)}>
        <ProvedorDemoRotina key={`${fluxo}-${ciclo}`} motor={motor} pessoaInicial={pessoaInicial}>
          <FluxosDemo fluxo={fluxo} />
        </ProvedorDemoRotina>
      </RoteadorIsolado>
    </div>
  )
}
