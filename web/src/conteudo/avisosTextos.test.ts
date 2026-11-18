import { describe, expect, it } from 'vitest'
import { AVISOS_TEXTOS } from './avisos.ts'

// RF14:RN-05: cada texto de `conteudo/avisos.ts` é o da tabela 2.3 da spec, colado aqui como literal, e o
// arquivo não tem nenhum texto a mais. O controle negativo troca um caractere e a comparação tem de falhar.

type Textos = typeof AVISOS_TEXTOS

const CHAVES = [
  'abaDaPagina',
  'avisoDeFuso',
  'botao',
  'botaoSalvando',
  'desligado',
  'h1',
  'indiceDaConta',
  'lead',
  'lendoAvisos',
  'lendoPreferencia',
  'linhaDoAutor',
  'linhaDoMomento',
  'linkDoCabecalho',
  'ligarNaConta',
  'maisDe50',
  'nomeDoLink',
  'pilula',
  'rotuloDaCaixa',
  'secaoFrase',
  'secaoTitulo',
  'statusDesligados',
  'statusLigados',
  'statusMarcados',
  'vazio',
].sort()

const ESPERADO = {
  indiceDaConta: 'Avisos',
  secaoTitulo: 'Avisos de outros cuidadores',
  secaoFrase:
    'Quando ligados, os avisos mostram aqui no site as notas que outras pessoas escrevem nas suas famílias. Nada chega por celular ou e-mail, e o site não manda lembretes.',
  rotuloDaCaixa: 'Mostrar avisos de outros cuidadores',
  lendoPreferencia: 'Lendo a sua preferência…',
  statusLigados: 'Avisos ligados.',
  statusDesligados: 'Avisos desligados.',
  linkDoCabecalho: 'Avisos',
  nomeSem: 'Avisos',
  nomeUm: 'Avisos, 1 aviso novo',
  nomeDois: 'Avisos, 2 avisos novos',
  nomeCinquenta: 'Avisos, 50 avisos novos',
  nomeMais: 'Avisos, mais de 50 avisos novos',
  pilulaSem: '',
  pilulaUm: '1',
  pilulaCinquenta: '50',
  pilulaMais: '50+',
  abaDaPagina: 'Avisos | AppMaternidade',
  h1: 'Avisos',
  lead: 'Notas que outras pessoas escreveram nas suas famílias nos últimos 7 dias.',
  autorNome: 'Bruno escreveu uma nota',
  autorNomeDestaque: 'Bruno escreveu uma nota em destaque',
  autorRemovido: 'Uma pessoa removida escreveu uma nota',
  autorRemovidoDestaque: 'Uma pessoa removida escreveu uma nota em destaque',
  autorSaiu: 'Alguém que saiu da família escreveu uma nota',
  autorSaiuDestaque: 'Alguém que saiu da família escreveu uma nota em destaque',
  momento: 'Família Exemplo · 05/11 às 14:30',
  avisoDeFuso: 'Os horários estão no fuso deste aparelho, que é diferente do fuso de uma das suas famílias.',
  maisDe50: 'Mostrando os 50 avisos mais recentes.',
  botao: 'Marcar todos como vistos',
  botaoSalvando: 'Marcando…',
  statusMarcados: 'Avisos marcados como vistos.',
  lendoAvisos: 'Lendo os avisos…',
  desligado: 'Os avisos estão desligados.',
  ligarNaConta: 'Ligar os avisos na Conta',
  vazio: 'Nenhum aviso novo.',
}

/** Todo valor do arquivo, com as funções chamadas nos casos da tabela, no formato de `ESPERADO`. */
function observar(t: Textos) {
  return {
    indiceDaConta: t.indiceDaConta,
    secaoTitulo: t.secaoTitulo,
    secaoFrase: t.secaoFrase,
    rotuloDaCaixa: t.rotuloDaCaixa,
    lendoPreferencia: t.lendoPreferencia,
    statusLigados: t.statusLigados,
    statusDesligados: t.statusDesligados,
    linkDoCabecalho: t.linkDoCabecalho,
    nomeSem: t.nomeDoLink(0, false),
    nomeUm: t.nomeDoLink(1, false),
    nomeDois: t.nomeDoLink(2, false),
    nomeCinquenta: t.nomeDoLink(50, false),
    nomeMais: t.nomeDoLink(50, true),
    pilulaSem: t.pilula(0, false),
    pilulaUm: t.pilula(1, false),
    pilulaCinquenta: t.pilula(50, false),
    pilulaMais: t.pilula(50, true),
    abaDaPagina: t.abaDaPagina,
    h1: t.h1,
    lead: t.lead,
    autorNome: t.linhaDoAutor({ tipo: 'nome', nome: 'Bruno' }, false),
    autorNomeDestaque: t.linhaDoAutor({ tipo: 'nome', nome: 'Bruno' }, true),
    autorRemovido: t.linhaDoAutor({ tipo: 'removido' }, false),
    autorRemovidoDestaque: t.linhaDoAutor({ tipo: 'removido' }, true),
    autorSaiu: t.linhaDoAutor({ tipo: 'saiu' }, false),
    autorSaiuDestaque: t.linhaDoAutor({ tipo: 'saiu' }, true),
    momento: t.linhaDoMomento('Família Exemplo', '05/11', '14:30'),
    avisoDeFuso: t.avisoDeFuso,
    maisDe50: t.maisDe50,
    botao: t.botao,
    botaoSalvando: t.botaoSalvando,
    statusMarcados: t.statusMarcados,
    lendoAvisos: t.lendoAvisos,
    desligado: t.desligado,
    ligarNaConta: t.ligarNaConta,
    vazio: t.vazio,
  }
}

/** As diferenças entre o arquivo e a tabela da spec: chaves que sobram ou faltam e valores diferentes. */
function diferencas(t: Textos): string[] {
  const achadas: string[] = []
  const chaves = Object.keys(t).sort()
  if (JSON.stringify(chaves) !== JSON.stringify(CHAVES)) achadas.push(`chaves: ${chaves.join(',')}`)
  const visto = observar(t) as Record<string, string>
  for (const [nome, esperado] of Object.entries(ESPERADO)) {
    if (visto[nome] !== esperado) achadas.push(`${nome}: ${JSON.stringify(visto[nome])}`)
  }
  return achadas
}

describe('RF14:RN-05: os textos de conteudo/avisos.ts são os da tabela 2.3', () => {
  it('cada valor é igual ao da tabela e o arquivo não tem texto a mais', () => {
    expect(diferencas(AVISOS_TEXTOS)).toEqual([])
  })

  it('controle negativo: um caractere trocado em qualquer texto é achado', () => {
    for (const nome of ['secaoFrase', 'h1', 'vazio', 'avisoDeFuso', 'lendoPreferencia'] as const) {
      const adulterado = { ...AVISOS_TEXTOS, [nome]: AVISOS_TEXTOS[nome].replace(/.$/, '!') }
      expect(diferencas(adulterado), nome).not.toEqual([])
    }
    const semPlural = { ...AVISOS_TEXTOS, nomeDoLink: () => 'Avisos' }
    expect(diferencas(semPlural)).not.toEqual([])
    expect(diferencas({ ...AVISOS_TEXTOS, extra: 'texto a mais' } as unknown as Textos)).not.toEqual([])
  })

  it('o texto da aba passa por tituloDaAba: "<título> | AppMaternidade"', () => {
    expect(AVISOS_TEXTOS.abaDaPagina).toBe(`${AVISOS_TEXTOS.h1} | AppMaternidade`)
  })

  it('RN-05: nenhum texto concorda com o gênero de quem lê (sem participípio ou adjetivo no feminino ou masculino)', () => {
    const todos = Object.values(observar(AVISOS_TEXTOS)).join(' ')
    expect(todos).not.toMatch(/\b(?:bem-vind[oa]|cadastrad[oa]|conectad[oa]|avisad[oa]|notificad[oa]|sozinh[oa])\b/i)
  })
})
