import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { rotas } from './rotas.tsx'
import { comLimiteDeErro } from './rotasComErro.tsx'

// Display variants of FG-2b: `?exibicao=b` or `?exibicao=c` picks the B or C block of tokens.css for this load only.
// It is read once here and never stored; without it (or with any other value) the default block A stands.
const variante = new URLSearchParams(window.location.search).get('exibicao')
if (variante === 'b' || variante === 'c') document.documentElement.dataset.exibicao = variante

const roteador = createBrowserRouter(comLimiteDeErro(rotas), { basename: import.meta.env.BASE_URL })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={roteador} />
  </StrictMode>,
)
