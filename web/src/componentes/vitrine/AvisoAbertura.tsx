import { Etiqueta } from '../base/Etiqueta.tsx'
import { ETIQUETA_AVISO } from '../../conteudo/textos.ts'

/**
 * O aviso de demonstração do Início, como mais um item da lateral da abertura (depois das etiquetas
 * e antes do link). Aparece quando falta alguma das variáveis do banco; elas são lidas a cada
 * renderização, e não na carga do módulo, como no `AvisoDemonstracao` das outras telas (o teste
 * troca as variáveis por caso). O marcador `data-aviso` é o mesmo do aviso longo.
 */
export function AvisoAbertura() {
  const temBanco = Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
  if (temBanco) return null

  return (
    <li data-aviso="demonstracao">
      <Etiqueta>{ETIQUETA_AVISO}</Etiqueta>
    </li>
  )
}
