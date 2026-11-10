import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AREAS_EM_BREVE, ETIQUETA_EM_BREVE, ROTULO_EM_BREVE } from './textos.ts'
import { Etiqueta } from '../base/Etiqueta.tsx'

/**
 * O submenu "+ Em breve" do cabeçalho: um painel de moldura dupla (cerca de 224 × 120) com as áreas
 * futuras, cada uma com a etiqueta "Em breve". Abre na hora, por clique ou pela seta para baixo, e
 * fecha com Esc (devolvendo o foco ao botão) e ao clicar fora.
 */
export function SubmenuEmBreve() {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const gatilho = useRef<HTMLButtonElement>(null)
  const idPainel = useId()

  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(evento: PointerEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false)
    }
    function aoTeclar(evento: globalThis.KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setAberto(false)
      gatilho.current?.focus()
    }
    document.addEventListener('pointerdown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('pointerdown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function aoTeclarNoGatilho(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setAberto(true)
    }
  }

  return (
    <div ref={raiz} className="sb-submenu">
      <button
        ref={gatilho}
        type="button"
        className="sb-submenu-gatilho t-corpo"
        aria-expanded={aberto}
        aria-controls={aberto ? idPainel : undefined}
        onClick={() => setAberto((atual) => !atual)}
        onKeyDown={aoTeclarNoGatilho}
      >
        {ROTULO_EM_BREVE}
      </button>
      {aberto ? (
        <div id={idPainel} className="sb-submenu-painel sb-quadro" data-moldura-dupla="">
          <div className="sb-quadro-miolo">
            <ul className="sb-submenu-lista">
              {AREAS_EM_BREVE.map((area) => (
                <li key={area} className="sb-submenu-item t-corpo">
                  <span>{area}</span>
                  <Etiqueta>{ETIQUETA_EM_BREVE}</Etiqueta>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
