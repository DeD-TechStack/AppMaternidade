import { Botao } from '../componentes/base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../componentes/base/layout/index.ts'
import { NOMES_DE_PAGINA } from '../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './publicas/useTitulo.ts'

/** A rota inexistente: o título em Literata, uma linha de ajuda e o primário de volta ao início. */
export function NaoEncontrada() {
  useTituloDaPagina(NOMES_DE_PAGINA.naoEncontrada)
  return (
    <main>
      <Secao>
        <QuadroLayout largura="medio">
          <Pilha vao="grupo">
            <h1 className="cm-h1">Página não encontrada</h1>
            <p className="cm-lide cm-medida">O endereço pode ter mudado. Pelo início você chega a todas as páginas do site.</p>
            <Botao to="/" className="self-start">
              Voltar ao início
            </Botao>
          </Pilha>
        </QuadroLayout>
      </Secao>
    </main>
  )
}
