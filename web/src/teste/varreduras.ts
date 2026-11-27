import * as ts from 'typescript'

// As varreduras estáticas que mais de um teste usa: as importações de um arquivo e os literais de texto de
// interface num `.tsx`. Saíram de `paginas/comunidade/estatico.test.ts` (RF12, A5) para o teste de fronteira da
// peça de resumo da rotina usar as mesmas.

export const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

export const importsDe = (texto: string) => [...semComentarios(texto).matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1])

export interface Achado {
  arquivo: string
  linha: number
  texto: string
}

const COM_LETRA = /\p{L}/u
// Os atributos de texto da interface (MAT-40:RN-03).
const ATRIBUTOS_DE_TEXTO = new Set(['aria-label', 'aria-description', 'title', 'placeholder', 'alt', 'label'])

export function literaisDeTexto(arquivo: string, texto: string): Achado[] {
  const fonte = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados: Achado[] = []
  const registrar = (no: ts.Node, conteudo: string) =>
    achados.push({ arquivo, linha: fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1, texto: conteudo.trim().slice(0, 60) })
  const temLetra = (no: ts.Expression): string | null => {
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) return COM_LETRA.test(no.text) ? no.text : null
    if (ts.isTemplateExpression(no)) {
      const partes = [no.head.text, ...no.templateSpans.map((s) => s.literal.text)].join('')
      return COM_LETRA.test(partes) ? partes : null
    }
    return null
  }

  function visitar(no: ts.Node) {
    // Texto JSX com letra entre `>` e `<`, fora de `{}`.
    if (ts.isJsxText(no) && COM_LETRA.test(no.text)) registrar(no, no.text)
    // Literal com letra nos atributos de texto.
    if (ts.isJsxAttribute(no) && ATRIBUTOS_DE_TEXTO.has(no.name.getText()) && no.initializer) {
      const inicial = no.initializer
      const valor = ts.isStringLiteral(inicial) ? inicial.text : ts.isJsxExpression(inicial) && inicial.expression ? temLetra(inicial.expression) : null
      if (valor && COM_LETRA.test(valor)) registrar(no, valor)
    }
    // Literal com letra passado como filho: `{'texto'}`.
    if (ts.isJsxExpression(no) && no.expression && (ts.isJsxElement(no.parent) || ts.isJsxFragment(no.parent))) {
      const valor = temLetra(no.expression)
      if (valor) registrar(no, valor)
    }
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return achados
}
