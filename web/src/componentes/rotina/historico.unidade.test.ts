import { describe, expect, it } from 'vitest'
import type { Alteracao, Registro } from '../../dados/rotina.tipos.ts'
import { camposMudados } from './alteracoesDoRegistro.ts'
import { ehRestauravel, prazoDaRestauracao } from './datasDaRotina.ts'
import { diaCurto, ehDiaDoHistorico, numeroDoDia, seteDiasAte, somarDias } from './diasDoHistorico.ts'
import { CHAVES_DO_FILTRO, lerParametros, urlDoHistorico, urlDoHistoricoDoDia } from './parametrosHistorico.ts'
import { larguraDaBarra, linhasDoResumo, temAlgoParaSomar, totaisDoPeriodo } from './totaisHistorico.ts'

// A lógica pura do Histórico (R38-20, R38-21): parâmetros da URL, contas de calendário, totais e o que a edição mudou.

const HOJE = '2026-11-05'
const hora = (dia: string, h: number, m = 0) => new Date(`${dia}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime()
const iso = (instante: number) => new Date(instante).toISOString()

function registro(parcial: Partial<Registro> & Pick<Registro, 'tipo' | 'inicio'>): Registro {
  return {
    id: 'a0000000-0000-7000-8000-000000000001',
    familiaId: 'f',
    bebeId: 'b',
    fim: null,
    detalhes: {},
    nota: null,
    origem: 'ao_vivo',
    fuso: 'UTC',
    deslocamentoMin: 0,
    criadoPor: null,
    encerradoPor: null,
    versao: 1,
    recebidoEm: parcial.inicio,
    atualizadoEm: parcial.inicio,
    excluidoEm: null,
    excluidoPor: null,
    ...parcial,
  }
}

describe('R38-20: os parâmetros da URL do Histórico', () => {
  it('sem parâmetros: hoje, todos os tipos, vista do dia e a URL já é a canônica', () => {
    expect(lerParametros('', HOJE)).toEqual({ dia: HOJE, tipos: [...CHAVES_DO_FILTRO], vista: 'dia', canonica: '' })
  })

  it('dia fora do formato, impossível ou futuro vale hoje, e a canônica descarta o dia', () => {
    for (const busca of ['?dia=2026-1-5', '?dia=2026-02-30', '?dia=2026-11-06', '?dia=amanha', '?dia=']) {
      const lidos = lerParametros(busca, HOJE)
      expect(lidos.dia, busca).toBe(HOJE)
      expect(lidos.canonica, busca).toBe('')
    }
  })

  it('um dia passado que existe é mantido, com o dia explícito na canônica', () => {
    expect(lerParametros('?dia=2026-11-04', HOJE)).toMatchObject({ dia: '2026-11-04', canonica: '?dia=2026-11-04' })
    expect(lerParametros(`?dia=${HOJE}`, HOJE).canonica).toBe(`?dia=${HOJE}`)
  })

  it('tipos vazio, sem nenhuma chave conhecida ou ausente: todos', () => {
    for (const busca of ['?tipos=', '?tipos=xyz', '?tipos=,,', '']) {
      expect(lerParametros(busca, HOJE).tipos, busca).toEqual([...CHAVES_DO_FILTRO])
      expect(lerParametros(busca, HOJE).canonica, busca).toBe('')
    }
  })

  it('tipo desconhecido e repetido é ignorado, e a URL é reescrita na ordem canônica', () => {
    const lidos = lerParametros('?tipos=fralda,xyz,sono,fralda', HOJE)
    expect(lidos.tipos).toEqual(['sono', 'fralda'])
    expect(lidos.canonica).toBe('?tipos=sono,fralda')
  })

  it('todos os sete tipos escritos viram a URL sem `tipos`', () => {
    expect(lerParametros(`?tipos=${[...CHAVES_DO_FILTRO].reverse().join(',')}`, HOJE).canonica).toBe('')
  })

  it('vista inválida vale `dia`; `semana` entra na canônica, depois do dia e dos tipos', () => {
    expect(lerParametros('?vista=mes', HOJE)).toMatchObject({ vista: 'dia', canonica: '' })
    expect(lerParametros('?vista=semana&tipos=sono&dia=2026-11-01', HOJE).canonica).toBe('?dia=2026-11-01&tipos=sono&vista=semana')
  })

  it('as URLs que a tela escreve levam sempre o dia', () => {
    expect(urlDoHistorico({ dia: HOJE, tipos: CHAVES_DO_FILTRO, vista: 'dia' })).toBe(`/app/historico?dia=${HOJE}`)
    expect(urlDoHistorico({ dia: HOJE, tipos: ['sono'], vista: 'semana' })).toBe(`/app/historico?dia=${HOJE}&tipos=sono&vista=semana`)
    expect(urlDoHistoricoDoDia('2026-11-02')).toBe('/app/historico?dia=2026-11-02')
  })
})

describe('R38-20: as contas de calendário', () => {
  it('somarDias atravessa o mês e o ano', () => {
    expect(somarDias('2026-11-01', -1)).toBe('2026-10-31')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('a fila tem 7 dias que terminam no dia escolhido, do mais antigo ao mais novo', () => {
    const fila = seteDiasAte('2026-11-03')
    expect(fila).toHaveLength(7)
    expect(fila[0]).toBe('2026-10-28')
    expect(fila[6]).toBe('2026-11-03')
  })

  it('ehDiaDoHistorico confere o formato, o calendário e o futuro', () => {
    expect(ehDiaDoHistorico('2026-11-05', HOJE)).toBe(true)
    expect(ehDiaDoHistorico('2026-11-06', HOJE)).toBe(false)
    expect(ehDiaDoHistorico('2026-02-30', HOJE)).toBe(false)
    expect(ehDiaDoHistorico(null, HOJE)).toBe(false)
  })

  it('o dia curto e o número do dia', () => {
    expect(diaCurto('2026-11-05')).toBe('qui., 05/11')
    expect(numeroDoDia('2026-11-05')).toBe('05')
  })
})

describe('R38-20 e R38-21: os totais', () => {
  const de = hora(HOJE, 0)
  const ate = hora('2026-11-06', 0)
  const todos = [...CHAVES_DO_FILTRO]

  it('o sono soma a parte da sessão que cai na janela, inclusive a que começou no dia anterior', () => {
    const noite = registro({ tipo: 'sono', inicio: iso(hora('2026-11-04', 23)), fim: iso(hora(HOJE, 2, 45)) })
    const totais = totaisDoPeriodo([], [noite], de, ate, todos)
    expect(totais.sonoMin).toBe(165)
  })

  it('a sessão em andamento não conta, e o filtro tira o tipo desligado', () => {
    const aberta = registro({ tipo: 'sono', inicio: iso(hora(HOJE, 8)) })
    const concluida = registro({ tipo: 'sono', inicio: iso(hora(HOJE, 3)), fim: iso(hora(HOJE, 4)) })
    expect(totaisDoPeriodo([aberta], [aberta, concluida], de, ate, todos).sonoMin).toBe(60)
    expect(totaisDoPeriodo([aberta], [concluida], de, ate, ['fralda']).sonoMin).toBe(0)
  })

  it('as contagens: mamada concluída, mamadeira com soma de ml, fraldas por conteúdo, sólidos e observações', () => {
    const doDia = [
      registro({ tipo: 'mamada', inicio: iso(hora(HOJE, 4)), fim: iso(hora(HOJE, 4, 20)) }),
      registro({ tipo: 'mamada', inicio: iso(hora(HOJE, 6)) }),
      registro({ tipo: 'mamadeira', inicio: iso(hora(HOJE, 5)), detalhes: { ml: 90 } }),
      registro({ tipo: 'mamadeira', inicio: iso(hora(HOJE, 7)) }),
      registro({ tipo: 'fralda', inicio: iso(hora(HOJE, 5)), detalhes: { conteudo: 'xixi' } }),
      registro({ tipo: 'fralda', inicio: iso(hora(HOJE, 6)), detalhes: { conteudo: 'coco' } }),
      registro({ tipo: 'fralda', inicio: iso(hora(HOJE, 7)), detalhes: { conteudo: 'ambos' } }),
      registro({ tipo: 'solido', inicio: iso(hora(HOJE, 8)), detalhes: { alimento: 'banana' } }),
      registro({ tipo: 'observacao', inicio: iso(hora(HOJE, 9)), nota: 'ok' }),
    ]
    const totais = totaisDoPeriodo(doDia, [], de, ate, todos)
    expect(totais).toMatchObject({ mamadas: 1, mamadeiras: 2, mlDasMamadeiras: 90, fraldas: 3, xixi: 1, coco: 1, ambos: 1, solidos: 1, observacoes: 1 })
    expect(linhasDoResumo(totais).map((linha) => `${linha.rotulo}: ${linha.valor}`)).toEqual([
      'Mamadas: 1',
      'Mamadeiras: 2, somando 90 ml',
      'Fraldas: 3: 1 xixi, 1 cocô, 1 ambos',
      'Alimentação sólida: 1',
      'Observações: 1',
    ])
  })

  it('sem nada para somar, o resumo não aparece', () => {
    expect(temAlgoParaSomar(totaisDoPeriodo([], [], de, ate, todos))).toBe(false)
  })

  it('a barra: proporcional ao maior sono; maior zero ou sono zero, nenhuma barra', () => {
    expect(larguraDaBarra(0, 0)).toBe(0)
    expect(larguraDaBarra(0, 120)).toBe(0)
    expect(larguraDaBarra(120, 120)).toBe(100)
    expect(larguraDaBarra(60, 120)).toBe(50)
  })
})

describe('R38-22: o que a edição mudou e o prazo da lixeira', () => {
  function edicao(antes: Record<string, unknown>, depois: Record<string, unknown>, operacao: Alteracao['operacao'] = 'edicao'): Alteracao {
    return { id: 'x', registroId: 'r', familiaId: 'f', operacao, autor: null, antes, depois, versao: 2, recebidaEm: iso(hora(HOJE, 15)) }
  }
  const base = { inicio: iso(hora(HOJE, 14)), fim: iso(hora(HOJE, 14, 40)), detalhes: {}, nota: null, fuso: 'UTC', deslocamento_min: 0 }

  it('o fim que mudou vira `Fim: 14:40 → 14:55`', () => {
    const mudados = camposMudados(edicao(base, { ...base, fim: iso(hora(HOJE, 14, 55)) }))
    expect(mudados).toEqual([{ campo: 'Fim', antes: '14:40', depois: '14:55' }])
  })

  it('detalhes e nota: o rótulo do campo e o valor em texto; fuso e deslocamento ficam de fora', () => {
    const antes = { ...base, detalhes: { ml: 90, conteudo: 'formula' } }
    const depois = { ...base, detalhes: { ml: 120, conteudo: 'leite_materno' }, nota: 'bebeu tudo', fuso: 'America/Sao_Paulo', deslocamento_min: -180 }
    expect(camposMudados(edicao(antes, depois))).toEqual([
      { campo: 'Quantidade', antes: '90 ml', depois: '120 ml' },
      { campo: 'Conteúdo', antes: 'fórmula', depois: 'leite materno' },
      { campo: 'Nota', antes: 'sem nota', depois: 'bebeu tudo' },
    ])
  })

  it('criação, exclusão e restauração não listam campos', () => {
    expect(camposMudados(edicao(base, base, 'exclusao'))).toEqual([])
  })

  it('30 dias exatos já não são restauráveis; um instante antes, ainda são', () => {
    const excluidoEm = iso(hora('2026-10-06', 10))
    const prazo = prazoDaRestauracao(excluidoEm)
    expect(ehRestauravel(excluidoEm, prazo - 1)).toBe(true)
    expect(ehRestauravel(excluidoEm, prazo)).toBe(false)
    expect(ehRestauravel(null, prazo - 1)).toBe(false)
  })
})
