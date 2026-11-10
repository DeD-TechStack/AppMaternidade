import { Botao } from '../componentes/base/Botao.tsx'
import { AberturaPublica, AvisoLateral } from '../componentes/publicas/AberturaPublica.tsx'
import { PaginasDoSite } from '../componentes/publicas/PaginasDoSite.tsx'
import { NAO_ENCONTRADA } from '../conteudo/publicas.ts'
import { AVISO_DEMONSTRACAO } from '../conteudo/textos.ts'

/**
 * A Página não encontrada, sobre a abertura da base (a mesma das 9 páginas públicas): `h1`, subtítulo,
 * lateral e fio. Abaixo dela, o link para o início e a linha "Páginas do site". Não leva o aviso de
 * construção (ela não descreve função nenhuma); o aviso de demonstração (o texto de sempre) é o item
 * da lateral, em `ui` na cor secundária. Com o texto inteiro a lateral tem altura próxima da coluna do
 * título (G8); uma etiqueta de uma linha ficaria 130 px mais baixa. As variáveis do banco são lidas a
 * cada renderização, como nos outros avisos.
 */
export function NaoEncontrada() {
  const temBanco = Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
  return (
    <main className="vp-pagina">
      <AberturaPublica
        titulo={NAO_ENCONTRADA.h1}
        subtitulo={NAO_ENCONTRADA.subtitulo}
        construcao={false}
        antes={temBanco ? undefined : <AvisoLateral aviso="demonstracao">{AVISO_DEMONSTRACAO}</AvisoLateral>}
      />
      <div className="sb-area sb-mt-fio-bloco" data-bloco="">
        <div className="grade-10">
          <div className="col-c2-c8">
            <Botao to="/" className="alvo-toque">
              {NAO_ENCONTRADA.voltar}
            </Botao>
          </div>
        </div>
      </div>
      <PaginasDoSite margem="sb-mt-64" />
    </main>
  )
}
