import { describe, expect, it } from 'vitest'
import { formatarCronometro, formatarDuracao, formatarHora, formatarUltimo, tamanhoDoCronometro } from './formatar.ts'

// VOLTA1 E2: a classe de tamanho do cronômetro vem do número de caracteres da duração, e não de uma largura
// medida em JavaScript: até 7 ("00:00", "1:12:01") é `normal`; 8 ou mais ("10:00:00", "100:00:00") é `longo`.
describe('tamanhoDoCronometro', () => {
  it('devolve "normal" até 7 caracteres', () => {
    for (const texto of ['00:00', '09:59', '59:59', '0:09:59', '1:00:00', '1:11:11', '1:12:01', '8:08:08', '9:59:59']) {
      expect(texto.length, texto).toBeLessThanOrEqual(7)
      expect(tamanhoDoCronometro(texto), texto).toBe('normal')
    }
  })

  it('devolve "longo" a partir de 8 caracteres', () => {
    for (const texto of ['10:00:00', '12:34:56', '23:59:59', '99:59:59', '100:00:00', '1000:00:00']) {
      expect(texto.length, texto).toBeGreaterThanOrEqual(8)
      expect(tamanhoDoCronometro(texto), texto).toBe('longo')
    }
  })

  it('segue o formato real do cronômetro: 9 h 59 min 59 s é normal e 10 h exatas é longo', () => {
    expect(tamanhoDoCronometro(formatarCronometro(9 * 3_600_000 + 59 * 60_000 + 59_000))).toBe('normal')
    expect(tamanhoDoCronometro(formatarCronometro(10 * 3_600_000))).toBe('longo')
    expect(tamanhoDoCronometro(formatarCronometro(100 * 3_600_000))).toBe('longo')
  })
})

const MIN = 60_000

describe('formatarDuracao', () => {
  it('usa "h min" a partir de 1 hora e só "min" abaixo', () => {
    expect(formatarDuracao(72 * MIN)).toBe('1 h 12 min')
    expect(formatarDuracao(12 * MIN)).toBe('12 min')
    expect(formatarDuracao(30_000)).toBe('0 min')
  })

  it('com zero minutos acima de 1 hora escreve "2 h 0 min"', () => {
    expect(formatarDuracao(120 * MIN)).toBe('2 h 0 min')
  })

  it('não passa de zero para tempos negativos', () => {
    expect(formatarDuracao(-5_000)).toBe('0 min')
  })
})

describe('formatarCronometro', () => {
  it('mostra mm:ss abaixo de 1 hora', () => {
    expect(formatarCronometro(0)).toBe('00:00')
    expect(formatarCronometro(59_000)).toBe('00:59')
    expect(formatarCronometro(275_000)).toBe('04:35')
  })

  it('mostra h:mm:ss a partir de 1 hora', () => {
    expect(formatarCronometro(3_600_000)).toBe('1:00:00')
    expect(formatarCronometro(61 * MIN)).toBe('1:01:00')
    expect(formatarCronometro(61 * MIN + 10_000)).toBe('1:01:10')
  })

  it('descarta o resto de milissegundos', () => {
    expect(formatarCronometro(59_999)).toBe('00:59')
  })
})

describe('formatarUltimo', () => {
  const LEGENDA_HA = ', tempo desde o registro'

  const tabela: Array<[string, string, string, string]> = [
    ['há 2 h 10 min', 'Mamada', '2 h 10', `Mamada${LEGENDA_HA}`],
    ['há 50 min', 'Fralda', '50 min', `Fralda${LEGENDA_HA}`],
    ['ontem 17:30', 'Tummy time', '17:30', 'Tummy time, ontem'],
    ['agora', 'Mamadeira', 'agora', 'Mamadeira'],
    ['há 1 h 05 min', 'Mamada', '1 h 05', `Mamada${LEGENDA_HA}`],
    ['há 3 h', 'Sono', '3 h', `Sono${LEGENDA_HA}`],
  ]
  for (const [quando, rotulo, valor, legenda] of tabela) {
    it(`"${quando}" com o rótulo "${rotulo}" dá "${valor}" e "${legenda}"`, () => {
      expect(formatarUltimo(rotulo, quando)).toEqual({ valor, legenda })
    })
  }

  it('só tira o " min" quando o texto tem " h ": "há 50 min" e "há 5 min" ficam com o "min"', () => {
    expect(formatarUltimo('Fralda', 'há 5 min').valor).toBe('5 min')
    expect(formatarUltimo('Fralda', 'há 50 min').valor).toBe('50 min')
  })

  it('corta os espaços das pontas e os de dentro do que sobra depois do prefixo', () => {
    expect(formatarUltimo('  Fralda  ', '  há 50 min  ')).toEqual({ valor: '50 min', legenda: `Fralda${LEGENDA_HA}` })
    expect(formatarUltimo('Tummy time', 'ontem   17:30')).toEqual({ valor: '17:30', legenda: 'Tummy time, ontem' })
    expect(formatarUltimo('Mamada', '  agora ')).toEqual({ valor: 'agora', legenda: 'Mamada' })
  })

  it('falha fechado: "quando" vazio, só espaços ou só o prefixo dá o travessão', () => {
    for (const quando of ['', '   ', 'há ', 'ontem ', '  há   ', ' ontem  ']) {
      expect(formatarUltimo('Fralda', quando).valor, JSON.stringify(quando)).toBe('—')
    }
    expect(formatarUltimo('Fralda', '')).toEqual({ valor: '—', legenda: 'Fralda' })
  })

  it('falha fechado: rótulo vazio ou só espaços dá o travessão na legenda, sem o complemento', () => {
    expect(formatarUltimo('', 'há 50 min')).toEqual({ valor: '50 min', legenda: '—' })
    expect(formatarUltimo('   ', 'ontem 17:30')).toEqual({ valor: '17:30', legenda: '—' })
    expect(formatarUltimo('', '')).toEqual({ valor: '—', legenda: '—' })
  })

  it('"Há 50 min" com maiúscula não é um prefixo reconhecido: o texto fica como veio e a legenda é só o rótulo', () => {
    expect(formatarUltimo('Fralda', 'Há 50 min')).toEqual({ valor: 'Há 50 min', legenda: 'Fralda' })
    expect(formatarUltimo('Fralda', 'Ontem 17:30')).toEqual({ valor: 'Ontem 17:30', legenda: 'Fralda' })
  })

  it('o prefixo precisa do espaço: "hábito" e "ontemtarde" não são prefixos', () => {
    expect(formatarUltimo('Fralda', 'hábito')).toEqual({ valor: 'hábito', legenda: 'Fralda' })
    expect(formatarUltimo('Fralda', 'ontemtarde')).toEqual({ valor: 'ontemtarde', legenda: 'Fralda' })
  })
})

describe('formatarHora', () => {
  it('usa 24 h e dois dígitos', () => {
    expect(formatarHora(new Date(2026, 10, 5, 9, 5).getTime())).toBe('09:05')
    expect(formatarHora(new Date(2026, 10, 5, 17, 2).getTime())).toBe('17:02')
    expect(formatarHora(new Date(2026, 10, 5, 0, 0).getTime())).toBe('00:00')
  })
})
