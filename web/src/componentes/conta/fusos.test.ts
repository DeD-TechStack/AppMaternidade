import { describe, expect, it } from 'vitest'
import { listaDeFusos, nomeDoFuso } from './fusos.ts'

// MAT-44d-3, volta 3, D3: o texto que a pessoa lê no select de fuso não tem "_" (hoje: America/Sao_Paulo).
// O valor guardado, o `value` da <option> e o envio seguem sendo o identificador IANA; só o texto muda.

describe('nomeDoFuso: o nome legível de um fuso, sem "_"', () => {
  it('os 16 fusos do Brasil têm nome em português, com acento', () => {
    expect(nomeDoFuso('America/Sao_Paulo')).toBe('São Paulo (Brasília)')
    expect(nomeDoFuso('America/Manaus')).toBe('Manaus')
    expect(nomeDoFuso('America/Cuiaba')).toBe('Cuiabá')
    expect(nomeDoFuso('America/Campo_Grande')).toBe('Campo Grande')
    expect(nomeDoFuso('America/Porto_Velho')).toBe('Porto Velho')
    expect(nomeDoFuso('America/Rio_Branco')).toBe('Rio Branco')
    expect(nomeDoFuso('America/Boa_Vista')).toBe('Boa Vista')
    expect(nomeDoFuso('America/Belem')).toBe('Belém')
    expect(nomeDoFuso('America/Fortaleza')).toBe('Fortaleza')
    expect(nomeDoFuso('America/Recife')).toBe('Recife')
    expect(nomeDoFuso('America/Maceio')).toBe('Maceió')
    expect(nomeDoFuso('America/Bahia')).toBe('Salvador (Bahia)')
    expect(nomeDoFuso('America/Araguaina')).toBe('Araguaína')
    expect(nomeDoFuso('America/Santarem')).toBe('Santarém')
    expect(nomeDoFuso('America/Noronha')).toBe('Fernando de Noronha')
    expect(nomeDoFuso('America/Eirunepe')).toBe('Eirunepé')
  })

  it('os demais: a parte depois da última barra, com espaço no lugar do "_"', () => {
    expect(nomeDoFuso('America/Los_Angeles')).toBe('Los Angeles')
    expect(nomeDoFuso('America/Argentina/Buenos_Aires')).toBe('Buenos Aires')
    expect(nomeDoFuso('America/North_Dakota/New_Salem')).toBe('New Salem')
    expect(nomeDoFuso('Europe/Lisbon')).toBe('Lisbon')
  })

  it('UTC fica UTC', () => {
    expect(nomeDoFuso('UTC')).toBe('UTC')
  })

  it('um identificador com "_" e sem barra também perde o "_"', () => {
    expect(nomeDoFuso('Fora_Da_Lista')).toBe('Fora Da Lista')
  })

  it('é uma função pura: o mesmo identificador dá sempre o mesmo texto', () => {
    expect(nomeDoFuso('America/Sao_Paulo')).toBe(nomeDoFuso('America/Sao_Paulo'))
  })
})

describe('a lista inteira de fusos (listaDeFusos)', () => {
  const lista = listaDeFusos()

  it('nenhum nome legível é vazio nem tem "_"', () => {
    expect(lista.length).toBeGreaterThan(16)
    for (const id of lista) {
      const nome = nomeDoFuso(id)
      expect(nome.trim(), id).not.toBe('')
      expect(nome, id).not.toContain('_')
    }
  })

  it('dois fusos diferentes nunca mostram o mesmo texto', () => {
    const vistos = new Map<string, string>()
    for (const id of lista) {
      const nome = nomeDoFuso(id)
      expect(vistos.get(nome), `"${nome}" aparece em ${vistos.get(nome)} e em ${id}`).toBeUndefined()
      vistos.set(nome, id)
    }
  })
})
