import { AVISO_DEMONSTRACAO } from '../conteudo/textos.ts'

// O aviso aparece quando falta pelo menos uma das variáveis do banco. As variáveis são lidas a
// cada renderização, e não na carga do módulo, para o teste poder trocá-las por caso.
// `aviso-demonstracao` é só marcador; a aparência vem dos utilitários e de `texto-info`.
export function AvisoDemonstracao({ comRecuo = false }: { comRecuo?: boolean }) {
  const temBanco = Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
  if (temBanco) return null

  return (
    <p
      data-aviso="demonstracao"
      className={`aviso-demonstracao texto-info py-1 text-sm font-normal leading-snug${comRecuo ? ' px-4' : ''}`}
    >
      {AVISO_DEMONSTRACAO}
    </p>
  )
}
