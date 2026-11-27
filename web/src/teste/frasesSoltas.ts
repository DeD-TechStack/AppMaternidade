import * as ts from 'typescript'

const ATRIBUTO_TECNICO = /^(?:aria-[\w-]+|href|to|id|key|role|data-[\w-]+)$/

// MAT-44 A3: mantenha o recorte de frases em literais; a classe é identificada pelo uso, não pelo texto.
export function frasesSoltas(texto: string): string[] {
  const nome = 'pagina.tsx'
  const fonte = ts.createSourceFile(nome, texto, ts.ScriptTarget.Latest, true)
  const literais: ts.StringLiteral[] = []
  const nomes: ts.Identifier[] = []
  function visitar(no: ts.Node) {
    if (ts.isStringLiteral(no) && no.text.length >= 13 && no.text.includes(' ')) literais.push(no)
    if (ts.isIdentifier(no)) nomes.push(no)
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  if (!literais.length) return []

  // O vinculador resolve sombras no próprio arquivo, sem carregar dependências ou ler o disco.
  const opcoes = { noLib: true, noResolve: true, types: [] }
  const verificador = ts.createProgram([nome], opcoes, {
    ...ts.createCompilerHost(opcoes),
    getSourceFile: (arquivo) => arquivo === nome ? fonte : undefined,
    getCurrentDirectory: () => '',
    fileExists: (arquivo) => arquivo === nome,
    readFile: (arquivo) => arquivo === nome ? texto : undefined,
    directoryExists: () => false,
    getDirectories: () => [],
  }).getTypeChecker()
  const referencias = new Map<ts.Symbol, ts.Identifier[]>()
  for (const id of nomes) {
    const simbolo = verificador.getSymbolAtLocation(id)
    if (!simbolo || simbolo.declarations?.some((d) => d === id.parent)) continue
    const usos = referencias.get(simbolo) ?? []
    usos.push(id)
    referencias.set(simbolo, usos)
  }

  const emAnalise = new Set<ts.Node>()
  function soEmClasses(id: ts.BindingName): boolean {
    if (!ts.isIdentifier(id) || emAnalise.has(id)) return false
    const simbolo = verificador.getSymbolAtLocation(id)
    const usos = simbolo && referencias.get(simbolo)
    if (!usos?.length) return false
    emAnalise.add(id)
    const somenteClasses = usos.every(valorDeClasse)
    emAnalise.delete(id)
    return somenteClasses
  }

  function valorDeClasse(no: ts.Node): boolean {
    const pai = no.parent
    if (ts.isJsxAttribute(pai)) {
      const atributo = pai.name.getText(fonte)
      if (atributo === 'className') return true
      // O cartão da sessão encaminha `classe` para seu próprio className.
      if (atributo !== 'classe') return false
      const tag = pai.parent.parent.tagName
      const item = ts.isIdentifier(tag) && verificador.getSymbolAtLocation(tag)?.declarations?.[0]
      if (!item || !ts.isImportSpecifier(item) || (item.propertyName ?? item.name).text !== 'CartaoDaSessao') return false
      const modulo = item.parent.parent.parent.moduleSpecifier
      return ts.isStringLiteral(modulo) && modulo.text === './hoje/CartaoDaSessao.tsx'
    }
    if (ts.isJsxExpression(pai) || ts.isParenthesizedExpression(pai)) return valorDeClasse(pai)
    if (ts.isTemplateSpan(pai)) return valorDeClasse(pai.parent)
    if (ts.isConditionalExpression(pai) && no !== pai.condition) return valorDeClasse(pai)
    if (ts.isVariableDeclaration(pai) && no === pai.initializer && ts.isVariableDeclarationList(pai.parent)) {
      const declaracao = pai.parent.parent
      return !!(pai.parent.flags & ts.NodeFlags.Const) &&
        !(ts.isVariableStatement(declaracao) && declaracao.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) &&
        soEmClasses(pai.name)
    }
    if (ts.isCallExpression(pai) && ts.isIdentifier(pai.expression)) {
      const declaracao = verificador.getSymbolAtLocation(pai.expression)?.valueDeclaration
      const funcao = declaracao && ts.isVariableDeclaration(declaracao) && (declaracao.parent.flags & ts.NodeFlags.Const)
        ? declaracao.initializer : declaracao
      if (funcao && (ts.isArrowFunction(funcao) || ts.isFunctionExpression(funcao) || ts.isFunctionDeclaration(funcao))) {
        const parametro = funcao.parameters[pai.arguments.findIndex((argumento) => argumento === no)]
        if (parametro && !parametro.dotDotDotToken) return soEmClasses(parametro.name)
      }
    }
    return false
  }

  return literais.filter((no) => {
    const pai = ts.isJsxExpression(no.parent) ? no.parent.parent : no.parent
    return !(ts.isJsxAttribute(pai) && ATRIBUTO_TECNICO.test(pai.name.getText(fonte))) && !valorDeClasse(no)
  }).map((no) => no.text)
}
