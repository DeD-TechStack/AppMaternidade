import type { ReactNode } from 'react'
import { useVitrine } from '../prototipo/vitrine.ts'
import { AvisoDemonstracao } from './AvisoDemonstracao.tsx'

// As telas logadas. O invólucro `app` tem a largura toda e é o contêiner de largura (container-name
// `app`): o layout, estreito ou largo, depende da largura dele em rem, nunca da janela, para a
// mesma tela funcionar dentro de um aparelho do Início. A `.coluna-app` fica dentro dele: coluna
// única de 40 rem (estreito) ou moldura com a navegação numa faixa lateral (largo, 60 rem ou mais).
// O aviso de demonstração, a faixa do topo, o conteúdo, a barra de baixo e a navegação ficam todos
// dentro dela. Num aparelho do Início não há aviso: ele é da página, não da tela mostrada.
export function ColunaApp({ children }: { children: ReactNode }) {
  const vitrine = useVitrine()
  return (
    <div className="app">
      <div className="coluna-app">
        {vitrine ? null : <AvisoDemonstracao comRecuo />}
        {children}
      </div>
    </div>
  )
}
