import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// I-S1: a configuração local do Auth (supabase/config.toml) não pode voltar aos padrões frouxos:
// senha com ao menos 8 caracteres, troca de senha que exige reautenticação recente e o TOTP ligado.

const texto = readFileSync(resolve(import.meta.dirname, '../../../supabase/config.toml'), 'utf8').replace(/\r\n/g, '\n')

/** O texto da seção `[nome]`, até o próximo cabeçalho de seção. */
function secao(nome: string): string {
  const linhas = texto.split('\n')
  const inicio = linhas.findIndex((linha) => linha.trim() === `[${nome}]`)
  if (inicio < 0) throw new Error(`seção [${nome}] ausente`)
  const resto = linhas.slice(inicio + 1)
  const fim = resto.findIndex((linha) => /^\s*\[/.test(linha))
  return (fim < 0 ? resto : resto.slice(0, fim)).join('\n')
}

describe('I-S1: configuração do Auth local', () => {
  it('a troca de senha exige reautenticação recente (secure_password_change = true)', () => {
    expect(secao('auth.email')).toMatch(/^secure_password_change = true\s*$/m)
  })

  it('a senha tem no mínimo 8 caracteres', () => {
    const achada = /^minimum_password_length = (\d+)\s*$/m.exec(secao('auth'))
    expect(achada).not.toBeNull()
    expect(Number(achada![1])).toBeGreaterThanOrEqual(8)
  })

  it('o MFA por aplicativo (TOTP) permite cadastrar e verificar', () => {
    const totp = secao('auth.mfa.totp')
    expect(totp).toMatch(/^enroll_enabled = true\s*$/m)
    expect(totp).toMatch(/^verify_enabled = true\s*$/m)
  })
})
