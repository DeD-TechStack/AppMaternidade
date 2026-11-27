import { useEffect, useState } from 'react'
import { FASES, IDEIAS } from '../../conteudo/desenvolvimento/itens.ts'
import { Fontes } from './Fontes.tsx'
import './desenvolvimento-casa.css'

const IDS_FASES: ReadonlySet<string> = new Set(FASES.map((fase) => fase.id))

function faseDoHash(): string {
  if (typeof window === 'undefined') return FASES[0].id
  const hash = window.location.hash.replace(/^#/, '')
  return IDS_FASES.has(hash) ? hash : FASES[0].id
}

/**
 * Navegação rotulada por fase com estado selecionado visível (`aria-current="location"`) seguida das seis fases
 * abertas em uma lista só com fio de 1 px (cor do texto): janela de idade, h3 da fase, itens e fontes de cada uma.
 * Todas no DOM, na ordem; sem abas nem `details`.
 */
export function Fases() {
  const [faseAtiva, setFaseAtiva] = useState<string>(faseDoHash)

  useEffect(() => {
    const sincronizarHash = () => setFaseAtiva(faseDoHash())
    window.addEventListener('hashchange', sincronizarHash)
    return () => window.removeEventListener('hashchange', sincronizarHash)
  }, [])

  return (
    <div className="dc-fases-bloco">
      <nav className="dc-fases-indice text-pequeno font-texto" aria-labelledby="dc-fases-rotulo">
        <p id="dc-fases-rotulo" className="dc-fases-rotulo text-corpo font-texto">
          {IDEIAS.rotuloSeletor}
        </p>
        <ul>
          {FASES.map((fase) => {
            const ativa = fase.id === faseAtiva
            return (
              <li key={fase.id}>
                <a
                  href={`#${fase.id}`}
                  aria-current={ativa ? 'location' : undefined}
                  data-fase-ativa={ativa ? '' : undefined}
                  onClick={() => setFaseAtiva(fase.id)}
                >
                  {fase.titulo}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
      <ul className="dc-fases" data-fases="">
        {FASES.map((fase) => (
          <li key={fase.id} id={fase.id} data-fase-selecionada={fase.id === faseAtiva ? '' : undefined}>
            <div className="dc-fase-cabeca">
              <p className="dc-fase-faixa text-pequeno font-texto">{fase.faixa}</p>
              <h3 className="text-titulo-3 font-titulo cm-sec-titulo">{fase.titulo}</h3>
            </div>
            <ul className="dc-itens text-corpo font-texto">
              {fase.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Fontes fontes={fase.fontes} consultadoEm={fase.consultadoEm} />
          </li>
        ))}
      </ul>
    </div>
  )
}
