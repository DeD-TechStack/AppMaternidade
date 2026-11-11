import { Botao } from '../componentes/base/Botao.tsx'

/** A rota inexistente: o título em Literata, uma linha de ajuda e o primário de volta ao início. */
export function NaoEncontrada() {
  return (
    <main className="cm-area cm-pagina-simples">
      <h1 className="cm-h1">Página não encontrada</h1>
      <p className="cm-lide cm-medida">O endereço pode ter mudado. Pelo início você chega a todas as páginas do site.</p>
      <Botao to="/">Voltar ao início</Botao>
    </main>
  )
}
