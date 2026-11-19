// CODE-Q R2 behaviour lock for Q-12 (dados/moderacao.ts:193 reads Comunidade's memory state via a cast).
// Observable effect to keep: in memory mode, hiding a topic through the page's Moderação instance hides it
// from the page's Comunidade instance (one shared state). Must PASS at BASE and after the refactor.
// Negative control: the same checker on an UNSHARED pair must report false (proves the lock can fail).
import { describe, expect, it } from 'vitest'
import { criarDadosComunidade, informarContaDaSessao } from './comunidade.ts'
import { criarDadosModeracao, informarContaDaSessaoModeracao, type DadosModeracao } from './moderacao.ts'
import { fixtureComunidadeDemonstracao } from './comunidade.demonstracao.ts'
import { criarEstadoComunidade } from './comunidade.memoria.ts'
import { criarDadosModeracaoMemoria } from './moderacao.memoria.ts'
import { modoDados } from './comum.ts'
import type { DadosComunidade } from './comunidade.ts'

const BRUNO = '22222222-2222-4222-8222-222222222222'
const DIEGO = '47000000-0000-4000-8000-000000000001'

async function ocultarAparece(com: DadosComunidade, mod: DadosModeracao, id: string): Promise<boolean> {
  const antes = await com.lerTopico(id)
  if (!antes.ok || antes.valor === null) throw new Error('setup: topic not visible before hiding: ' + JSON.stringify(antes))
  const r = await mod.moderarConteudo({ tipo: 'topico', id }, 'oculto', 'teste de trava CODE-Q', null)
  if (!r.ok) throw new Error('setup: moderarConteudo failed: ' + JSON.stringify(r))
  const depois = await com.lerTopico(id)
  if (!depois.ok) throw new Error('setup: lerTopico failed after hiding')
  return depois.valor === null
}

describe('Q-12 lock: Moderação and Comunidade share the memory state', () => {
  it('memory mode is active in the test env', () => expect(modoDados()).toBe('memoria'))
  it('hiding via the page Moderação instance hides it in the page Comunidade instance', async () => {
    informarContaDaSessao(BRUNO)
    informarContaDaSessaoModeracao(DIEGO)
    const id = fixtureComunidadeDemonstracao.topicos[0]!.id
    expect(await ocultarAparece(criarDadosComunidade(), criarDadosModeracao(), id)).toBe(true)
  })
  it('negative control: an unshared Moderação copy does NOT hide it (checker can fail)', async () => {
    informarContaDaSessao(BRUNO)
    const separado = criarDadosModeracaoMemoria(criarEstadoComunidade(fixtureComunidadeDemonstracao), () => DIEGO)
    const id = fixtureComunidadeDemonstracao.topicos[1]!.id
    expect(await ocultarAparece(criarDadosComunidade(), separado, id)).toBe(false)
  })
})
