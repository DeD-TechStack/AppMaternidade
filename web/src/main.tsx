import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { iniciarPwa } from './pwa/iniciar.ts'
import { rotas } from './rotas.tsx'

const roteador = createBrowserRouter(rotas, { basename: import.meta.env.BASE_URL })

iniciarPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={roteador} />
  </StrictMode>,
)
