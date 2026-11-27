import * as ts from 'typescript'

const ATRIBUTO_TECNICO = /^(?:aria-[\w-]+|href|to|id|key|role|data-[\w-]+)$/

// MAT-44 A3: os usos técnicos são identificados pelo destino do valor, não pelo texto.
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
    const pai = id.parent
    const simbolo = ts.isShorthandPropertyAssignment(pai) && pai.name === id
      ? verificador.getShorthandAssignmentValueSymbol(pai)
      : ts.isExportSpecifier(pai) && (pai.propertyName ?? pai.name) === id
        ? verificador.getExportSpecifierLocalTargetSymbol(pai)
        : verificador.getSymbolAtLocation(id)
    if (!simbolo || simbolo.declarations?.some((d) => d === id.parent)) continue
    const usos = referencias.get(simbolo) ?? []
    usos.push(id)
    referencias.set(simbolo, usos)
  }

  const emAnalise = new Set<ts.Node>()
  function soEmAtributosTecnicos(id: ts.BindingName): boolean {
    if (!ts.isIdentifier(id) || emAnalise.has(id)) return false
    const simbolo = verificador.getSymbolAtLocation(id)
    const usos = simbolo && referencias.get(simbolo)
    if (!usos?.length) return false
    emAnalise.add(id)
    const somenteTecnicos = usos.every(valorTecnico)
    emAnalise.delete(id)
    return somenteTecnicos
  }

  function valorTecnico(no: ts.Node): boolean {
    const pai = no.parent
    if (ts.isJsxAttribute(pai)) {
      const atributo = pai.name.getText(fonte)
      if (atributo === 'className') return true
      const tag = pai.parent.parent.tagName
      if (!ts.isIdentifier(tag)) return false
      if (tag.text === 'source' && (atributo === 'media' || atributo === 'sizes')) return true
      if (atributo !== 'classe' && atributo !== 'costuraX' && atributo !== 'sizes') return false
      const item = verificador.getSymbolAtLocation(tag)?.declarations?.[0]
      if (!item || !ts.isImportSpecifier(item)) return false
      const modulo = item.parent.parent.parent.moduleSpecifier
      if (!ts.isStringLiteral(modulo)) return false
      const componente = (item.propertyName ?? item.name).text
      if (atributo === 'classe') return componente === 'CartaoDaSessao' && modulo.text === './hoje/CartaoDaSessao.tsx'
      if (atributo === 'costuraX') return componente === 'FaixaInteira' && modulo.text === '../componentes/secoes/FaixaInteira.tsx'
      return componente === 'Telefone' && [
        '../componentes/inicio-composicao/pecas.tsx', '../../componentes/inicio-composicao/pecas.tsx',
      ].includes(modulo.text)
    }
    if (ts.isJsxExpression(pai) || ts.isParenthesizedExpression(pai)) return valorTecnico(pai)
    if (ts.isTemplateSpan(pai)) return valorTecnico(pai.parent)
    if (ts.isBinaryExpression(pai) && pai.operatorToken.kind === ts.SyntaxKind.PlusToken) return valorTecnico(pai)
    if (ts.isConditionalExpression(pai) && no !== pai.condition) return valorTecnico(pai)
    if (ts.isVariableDeclaration(pai) && no === pai.initializer && ts.isVariableDeclarationList(pai.parent)) {
      const declaracao = pai.parent.parent
      return !!(pai.parent.flags & ts.NodeFlags.Const) &&
        !(ts.isVariableStatement(declaracao) && declaracao.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) &&
        soEmAtributosTecnicos(pai.name)
    }
    if (ts.isCallExpression(pai) && ts.isIdentifier(pai.expression)) {
      const declaracao = verificador.getSymbolAtLocation(pai.expression)?.valueDeclaration
      const funcao = declaracao && ts.isVariableDeclaration(declaracao) && (declaracao.parent.flags & ts.NodeFlags.Const)
        ? declaracao.initializer : declaracao
      if (funcao && (ts.isArrowFunction(funcao) || ts.isFunctionExpression(funcao) || ts.isFunctionDeclaration(funcao))) {
        const parametro = funcao.parameters[pai.arguments.findIndex((argumento) => argumento === no)]
        if (parametro && !parametro.dotDotDotToken) return soEmAtributosTecnicos(parametro.name)
      }
    }
    return false
  }

  return literais.filter((no) => {
    const pai = ts.isJsxExpression(no.parent) ? no.parent.parent : no.parent
    return !(ts.isJsxAttribute(pai) && ATRIBUTO_TECNICO.test(pai.name.getText(fonte))) && !valorTecnico(no)
  }).map((no) => no.text)
}
