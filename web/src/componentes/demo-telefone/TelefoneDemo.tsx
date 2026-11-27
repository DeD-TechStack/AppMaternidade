import { Component, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { DEMO_CASCA, type FluxoDemoTelefone } from './textosCasca.ts'
import { useInertNaFaixa } from './useInertNaFaixa.ts'
import './demoTelefone.css'

export type { FluxoDemoTelefone }

interface PropsMotorDemo {
  fluxo: FluxoDemoTelefone
  aoFechar: () => void
}

type CarregadorMotor = () => Promise<{ default: ComponentType<PropsMotorDemo> }>

interface TelefoneDemoProps {
  fluxo: FluxoDemoTelefone
  className?: string
  children?: ReactNode
  carregarMotor?: CarregadorMotor
}

const carregarMotorPadrao: CarregadorMotor = () => import('./DemoTelefoneMotor.tsx')

function CapturaPadrao({ fluxo }: { fluxo: FluxoDemoTelefone }) {
  const base = `${import.meta.env.BASE_URL}composicao/a/${fluxo === 'hoje' ? 'hoje-n' : fluxo}`
  return (
    <figure className="co-fone">
      <img
        src={`${base}-780w.webp`}
        srcSet={`${base}-780w.webp 780w, ${base}-1170w.webp 1170w`}
        sizes="(min-width: 69em) 360px, 78vw"
        width={390}
        height={844}
        alt={DEMO_CASCA.nomes[fluxo]}
        loading="lazy"
        decoding="async"
      />
    </figure>
  )
}

class ContencaoErroDemo extends Component<{ aoFalhar: () => void; children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError = () => ({ falhou: true })
  componentDidCatch() {
    this.props.aoFalhar()
  }
  render() {
    return this.state.falhou ? null : this.props.children
  }
}

export function TelefoneDemo({ fluxo, className, children, carregarMotor = carregarMotorPadrao }: TelefoneDemoProps) {
  const [fase, setFase] = useState<'ociosa' | 'carregando' | 'pronta' | 'erro'>('ociosa')
  const [Motor, setMotor] = useState<ComponentType<PropsMotorDemo> | null>(null)
  const envoltoriaRef = useRef<HTMLDivElement>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const montadoRef = useRef(true)
  const devolverFocoRef = useRef(false)

  const ativa = fase === 'pronta' && Motor !== null
  const foraDaTela = useInertNaFaixa(envoltoriaRef, ativa)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  const fechar = useCallback(() => {
    devolverFocoRef.current = true
    setFase('ociosa')
  }, [])

  const aoFalharRender = useCallback(() => {
    devolverFocoRef.current = true
    setMotor(null)
    setFase('erro')
  }, [])

  function abrir() {
    if (fase === 'carregando') return
    if (Motor) return setFase('pronta')
    setFase('carregando')
    void carregarMotor()
      .then((m) => {
        if (!montadoRef.current) return
        setMotor(() => m.default)
        setFase('pronta')
      })
      .catch(() => {
        if (montadoRef.current) setFase('erro')
      })
  }

  useEffect(() => {
    if (!ativa && devolverFocoRef.current) {
      devolverFocoRef.current = false
      gatilhoRef.current?.focus({ preventScroll: true })
    }
  }, [ativa])

  const carregando = fase === 'carregando'

  return (
    <div
      ref={envoltoriaRef}
      className={`dt-envoltoria ${className ?? ''}`}
      data-demo-fluxo={fluxo}
      data-demo-ativa={ativa ? '' : undefined}
    >
      {ativa && Motor ? (
        <figure className="co-fone dt-moldura-ativa" inert={foraDaTela || undefined}>
          <div className="dt-tela-caixa">
            <ContencaoErroDemo aoFalhar={aoFalharRender}>
              <Motor fluxo={fluxo} aoFechar={fechar} />
            </ContencaoErroDemo>
          </div>
        </figure>
      ) : (
        <>
          <div className="dt-barra-gatilho" inert={foraDaTela || undefined}>
            <button
              ref={gatilhoRef}
              type="button"
              className="dt-gatilho alvo-toque"
              aria-label={carregando ? DEMO_CASCA.abrindoFluxo(fluxo) : DEMO_CASCA.experimentarFluxo(fluxo)}
              aria-busy={carregando || undefined}
              aria-disabled={carregando || undefined}
              onClick={abrir}
            >
              {carregando ? DEMO_CASCA.carregando : DEMO_CASCA.experimentar}
            </button>
            {fase === 'erro' ? (
              <p role="status" className="dt-erro-carga">
                {DEMO_CASCA.erroCarga}
              </p>
            ) : null}
          </div>
          {children ?? <CapturaPadrao fluxo={fluxo} />}
        </>
      )}
    </div>
  )
}
