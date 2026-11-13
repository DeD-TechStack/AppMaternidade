import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina, simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import { ehUuidV7 } from '../../dados/rotina.uuid.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { ID_BEBE, comSessaoEmAndamento } from '../../teste/rotina.fixture.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'

// O formulário dos 7 registros, novo e edição (R38-10), com o relógio falso parado às 10:00 de 5/11/2026
// (hora do aparelho): campos de cada tipo, validação antes de enviar, avisos que não bloqueiam, envio,
// erro do banco e destino ao salvar.

const INSTANTE = new Date('2026-11-05T10:00:00')
const MIN = 60_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const digitar = (rotulo: string, valor: string) => fireEvent.change(campo(rotulo), { target: { value: valor } })
/** O fim começa vazio (sessão em andamento): para dar um fim é preciso data e hora. */
const digitarFim = (hora: string) => {
  digitar('Fim: data', '2026-11-05')
  digitar('Fim: hora', hora)
}
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')

async function enviar() {
  fireEvent.click(botao('Salvar'))
  await aguardarCarga()
}

const todosOsRegistros = async (rotina: Awaited<ReturnType<typeof renderizarRotaPronta>>['rotina']) => {
  const lista = await rotina.doIntervalo(ID_BEBE, new Date(Date.now() - 48 * 60 * MIN).toISOString(), new Date(Date.now() + 60 * MIN).toISOString())
  return lista.ok ? lista.valor.itens : []
}

describe('o formulário novo: a escolha do tipo e os campos de cada tipo', () => {
  it('sem ?tipo=, ou com um tipo desconhecido, o primeiro campo é a escolha do tipo, e cada tipo traz os seus campos', async () => {
    for (const caminho of ['/app/registro/novo', '/app/registro/novo?tipo=banho']) {
      const { unmount } = await renderizarRotaPronta(caminho)
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Novo registro')
      expect((campo('Tipo do registro') as HTMLSelectElement).value).toBe('')
      expect(screen.queryByLabelText('Horário: data')).toBeNull()
      unmount()
    }

    await renderizarRotaPronta('/app/registro/novo')
    const casos: Array<[string, string[]]> = [
      ['sono', ['Início: data', 'Fim: data', 'Nota']],
      ['mamada', ['Início: data', 'Fim: data', 'Lado', 'Nota']],
      ['mamadeira', ['Horário: data', 'Quantidade em ml', 'Conteúdo', 'Nota']],
      ['fralda', ['Horário: data', 'Conteúdo', 'Nota']],
      ['solido', ['Horário: data', 'Alimento', 'Nota']],
      ['observacao', ['Horário: data', 'Texto']],
    ]
    for (const [tipo, rotulos] of casos) {
      digitar('Tipo do registro', tipo)
      for (const rotulo of rotulos) expect(screen.getByLabelText(rotulo), `${tipo}: ${rotulo}`).toBeTruthy()
    }
    // A observação não tem o campo Nota: o texto dela é a nota.
    expect(screen.queryByLabelText('Nota')).toBeNull()
  })

  it('o ?tipo= válido fixa o tipo, que não aparece como campo, e o início vem com agora', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=sono')

    expect(screen.queryByLabelText('Tipo do registro')).toBeNull()
    expect((campo('Início: data') as HTMLInputElement).value).toBe('2026-11-05')
    expect((campo('Início: hora') as HTMLInputElement).value).toBe('10:00')
    expect(screen.getByText('Sono, Heloísa')).toBeTruthy()
  })

  it('o grupo diz "Horário" uma vez só: os campos mostram "data" e "hora", e o nome acessível continua "Horário: data"', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=fralda')

    for (const [rotulo, visivel] of [['Horário: data', 'data'], ['Horário: hora', 'hora']] as const) {
      const etiqueta = (campo(rotulo) as HTMLInputElement).labels![0].cloneNode(true) as HTMLElement
      expect(etiqueta.textContent).toBe(rotulo)
      etiqueta.querySelectorAll('.sr-only').forEach((oculto) => oculto.remove())
      expect(etiqueta.textContent!.trim()).toBe(visivel)
    }
    expect(screen.getAllByText('Horário')).toHaveLength(1)
  })

  it('os botões −5 min e +5 min ajustam o horário ao lado dele, com nome acessível que traz o texto visível', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=fralda')

    fireEvent.click(botao('+5 min no campo Horário'))
    expect((campo('Horário: hora') as HTMLInputElement).value).toBe('10:05')
    fireEvent.click(botao('−5 min no campo Horário'))
    fireEvent.click(botao('−5 min no campo Horário'))
    expect((campo('Horário: hora') as HTMLInputElement).value).toBe('09:55')
    expect(botao('−5 min no campo Horário').textContent).toBe('−5 min')
  })
})

describe('a validação antes de enviar', () => {
  it('observação sem texto: a mensagem fica ao lado do campo, ligada por aria-describedby, o foco vai a ele e nada é enviado', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=observacao')
    const antes = (await todosOsRegistros(rotina)).length

    await enviar()

    const texto = campo('Texto')
    expect(texto.getAttribute('aria-invalid')).toBe('true')
    const ligada = document.getElementById(texto.getAttribute('aria-describedby')!)!
    expect(ligada.textContent).toBe('Escreva o texto.')
    expect(document.activeElement).toBe(texto)
    expect((await todosOsRegistros(rotina)).length).toBe(antes)
  })

  it('texto: 500 passa e 501 não; só espaços não passa', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=observacao')

    digitar('Texto', '   ')
    await enviar()
    expect(campo('Texto').getAttribute('aria-invalid')).toBe('true')

    digitar('Texto', 'a'.repeat(501))
    await enviar()
    expect(campo('Texto').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('O texto passa de 500 caracteres.')).toBeTruthy()
  })

  it('ml fora de 1 a 500 ou não inteiro: erro no campo e foco nele', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=mamadeira')

    for (const invalido of ['0', '501', '90.5']) {
      digitar('Quantidade em ml', invalido)
      await enviar()
      expect(campo('Quantidade em ml').getAttribute('aria-invalid'), invalido).toBe('true')
      expect(document.activeElement, invalido).toBe(campo('Quantidade em ml'))
    }
  })

  it('o foco vai ao primeiro campo com erro, na ordem da tela, mesmo com dois erros', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=mamadeira')
    fireEvent.click(botao('+5 min no campo Horário'))
    fireEvent.click(botao('+5 min no campo Horário'))
    digitar('Quantidade em ml', '999')

    await enviar()

    expect(campo('Horário: data').getAttribute('aria-invalid')).toBe('true')
    expect(campo('Quantidade em ml').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('Horário: data'))
  })

  it('horário: até 5 minutos no futuro passa; mais que isso, não', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'xixi')

    digitar('Horário: hora', '10:06')
    await enviar()
    expect(screen.getByText('O horário está mais de 5 minutos no futuro.')).toBeTruthy()
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(0)

    digitar('Horário: hora', '10:05')
    await enviar()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(1)
  })

  it('fim antes do início: erro no campo de fim; fim vazio inicia uma sessão em andamento', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=tummy')
    digitar('Início: hora', '09:00')
    digitarFim('08:30')

    await enviar()
    expect(screen.getByText('O fim não pode ser antes do início.')).toBeTruthy()
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(0)
    expect(document.activeElement).toBe(campo('Fim: data'))

    digitar('Fim: data', '')
    digitar('Fim: hora', '')
    await enviar()
    const gravados = (await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')
    expect(gravados).toHaveLength(1)
    expect(gravados[0].fim).toBeNull()
  })

  it('fralda sem o conteúdo: erro no campo', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=fralda')

    await enviar()

    expect(campo('Conteúdo').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Escolha o conteúdo da fralda.')).toBeTruthy()
  })
})

describe('gravar um registro novo', () => {
  it('grava como retroativo, com id v7 do navegador, confirma "Registro salvo." com Desfazer e Fechar e volta ao Hoje', async () => {
    const { rotina, roteador } = await renderizarRotaPronta('/app/registro/novo?tipo=mamadeira')
    digitar('Horário: hora', '09:30')
    digitar('Quantidade em ml', '120')
    digitar('Conteúdo', 'formula')
    digitar('Nota', 'Tomou tudo')

    await enviar()

    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().querySelector('p')!.textContent).toBe('Registro salvo.')
    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar'])
    const novo = (await todosOsRegistros(rotina)).find((r) => r.origem === 'retroativo')!
    expect(novo.tipo).toBe('mamadeira')
    expect(ehUuidV7(novo.id)).toBe(true)
    expect(novo.detalhes).toEqual({ ml: 120, conteudo: 'formula' })
    expect(novo.nota).toBe('Tomou tudo')
    expect(novo.criadoPor).toBe(PESSOAS.juliana.id)
    expect(new Date(novo.inicio).getHours()).toBe(9)
  })

  it('"Desfazer" exclui o registro salvo (vai para a lixeira) e limpa a confirmação', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'ambos')
    await enviar()

    fireEvent.click(botao('Desfazer'))
    await aguardarCarga()

    expect(status().textContent).toBe('')
    const lixeira = await rotina.lixeira(ID_BEBE)
    expect(lixeira.ok && lixeira.valor.itens.map((r) => r.tipo)).toEqual(['fralda'])
  })

  it('"Cancelar" volta à tela de origem sem gravar e sem confirmação, com o foco no h1', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    const antes = (await todosOsRegistros(rotina)).length

    fireEvent.click(botao('Cancelar'))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    expect(status().textContent).toBe('')
    expect((await todosOsRegistros(rotina)).length).toBe(antes)
  })

  it('enquanto envia: "Salvando…" com aria-disabled, campos somente leitura, e um segundo toque não envia', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'xixi')
    let liberar: () => void = () => undefined
    const original = rotina.gravarRegistro.bind(rotina)
    const gravar = vi.spyOn(rotina, 'gravarRegistro').mockImplementation(
      (entrada) => new Promise((resolver) => (liberar = () => resolver(original(entrada)))),
    )

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    const salvando = botao('Salvando…')
    expect(salvando.getAttribute('aria-disabled')).toBe('true')
    expect((campo('Horário: hora') as HTMLInputElement).readOnly).toBe(true)
    fireEvent.click(salvando)
    fireEvent.submit(salvando.closest('form')!)
    await aguardarCarga()

    expect(gravar).toHaveBeenCalledTimes(1)
    liberar()
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
  })
})

describe('os avisos que não bloqueiam: "Salvar assim" e "Corrigir"', () => {
  it('duração acima do limite do tipo pede confirmação; "Corrigir" volta ao formulário, "Salvar assim" grava', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=tummy')
    digitar('Início: hora', '08:00')
    digitarFim('10:00')

    await enviar()

    const grupo = screen.getByRole('group', { name: 'Confirmar o registro' })
    expect(within(grupo).getByText('Este tummy time dura 2 h 0 min, mais do que o esperado.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    fireEvent.click(botao('Corrigir'))
    expect(botao('Salvar')).toBeTruthy()

    await enviar()
    fireEvent.click(botao('Salvar assim'))
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(1)
  })

  it('a duração de exatamente o limite passa sem aviso (só "mais que" o limite avisa)', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=tummy')
    digitar('Início: hora', '09:00')
    digitarFim('10:00')

    await enviar()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
  })

  it('sobreposição com a sessão em andamento: a frase cita das 08:48 até agora; encostar não é sobreposição', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=sono')
    digitar('Início: hora', '09:00')
    digitarFim('09:30')

    await enviar()
    expect(screen.getByText('Este sono se sobrepõe a outro, das 08:48 até agora (em andamento).')).toBeTruthy()
  })

  it('uma sessão que termina quando a outra começa (06:40) encosta e não pede confirmação', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=sono', { diaCompleto: true })
    digitar('Início: hora', '06:40')
    digitarFim('07:00')

    await enviar()

    expect(screen.queryByRole('group', { name: 'Confirmar o registro' })).toBeNull()
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(1)
  })

  it('com mais de uma sobreposição, a frase cita a de início mais cedo e acrescenta "E mais N."', async () => {
    await renderizarRotaPronta('/app/registro/novo?tipo=sono', { diaCompleto: true })
    digitar('Início: hora', '03:00')
    digitarFim('09:00')

    await enviar()

    expect(screen.getByText('Este sono se sobrepõe a outro, das 03:30 às 04:20. E mais 2.')).toBeTruthy()
  })

  it('se a leitura da conferência falhar, nada é enviado: o erro aparece acima dos botões e "Tentar de novo" relê', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=sono')
    digitar('Início: hora', '09:00')
    digitarFim('09:30')
    simularFalhaRotina(rotina, 'sessoesDaJanela', 'rede')

    await enviar()

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Não foi possível falar com o servidor. Verifique a conexão.')
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(0)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(screen.getByRole('group', { name: 'Confirmar o registro' })).toBeTruthy()
  })
})

describe('o erro do banco no envio', () => {
  it('aparece acima dos botões, em role="alert", com a frase do catálogo e sem código; os campos guardam o digitado', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=observacao')
    digitar('Texto', 'Tossiu à noite')
    simularFalhaRotina(rotina, 'gravarRegistro', 'bebe_arquivado')

    await enviar()

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Este bebê está arquivado. Os registros ficam só para leitura.')
    expect(alerta.textContent).not.toMatch(/P0001|bebe arquivado|42501/)
    expect(alerta.querySelector('button')).toBeNull()
    expect((campo('Texto') as HTMLTextAreaElement).value).toBe('Tossiu à noite')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Novo registro')
  })

  it('erro de rede: a frase de escrita e "Tentar de novo", que repete a mesma chamada com o mesmo id e não duplica', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'coco')
    const gravar = vi.spyOn(rotina, 'gravarRegistro')
    simularRespostaPerdidaRotina(rotina, 'gravarRegistro')

    await enviar()
    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.')
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(gravar).toHaveBeenCalledTimes(2)
    expect(gravar.mock.calls[1][0].id).toBe(gravar.mock.calls[0][0].id)
    expect((await todosOsRegistros(rotina)).filter((r) => r.origem === 'retroativo')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
  })

  it('"tente de novo" (40P01) e "desconhecido" também oferecem repetir; nenhum mostra o código', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'coco')

    for (const [chave, frase] of [
      ['tente_de_novo', 'O servidor estava ocupado. Tente de novo.'],
      ['desconhecido', 'Algo deu errado e não sabemos se a mudança foi salva. Toque em Tentar de novo ou atualize para conferir.'],
    ] as const) {
      simularFalhaRotina(rotina, 'gravarRegistro', chave)
      await enviar()
      const alerta = screen.getByRole('alert')
      expect(alerta.textContent).toContain(frase)
      expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
      expect(alerta.textContent).not.toMatch(/40P01|XX000|22023/)
    }
  })
})

describe('a edição', () => {
  const registroDe = (fixture: { registros: Array<{ id: string; tipo: string; criadoPor: string | null; fim: string | null }> }, tipo: string, autor: string, aberta = false) =>
    fixture.registros.find((r) => r.tipo === tipo && r.criadoPor === autor && (aberta ? r.fim === null : true))!

  it('abre com o estado completo do registro e manda o estado completo; confirma "Registro salvo." só com Fechar', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje')
    const alvo = registroDe(primeira.fixture, 'fralda', PESSOAS.bruno.id)
    primeira.unmount()

    const { rotina } = await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: primeira })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Editar registro')
    expect((campo('Conteúdo') as HTMLSelectElement).value).toBe('xixi')
    expect(screen.queryByLabelText('Tipo do registro')).toBeNull()

    digitar('Conteúdo', 'coco')
    digitar('Nota', 'Muito')
    await enviar()

    // Aberta pela URL, sem `state`, a edição volta ao detalhe do registro (R38-10, rodada 5).
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Registro')
    expect(status().querySelector('p')!.textContent).toBe('Registro salvo.')
    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Fechar'])
    const lido = await rotina.registro(alvo.id)
    expect(lido.ok && lido.valor).toMatchObject({ detalhes: { conteudo: 'coco' }, nota: 'Muito', versao: 2 })
  })

  it('sessão em andamento: só o início e os detalhes, sem o campo de fim', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje')
    const alvo = registroDe(primeira.fixture, 'sono', PESSOAS.bruno.id, true)
    primeira.unmount()

    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: primeira })

    expect(screen.getByLabelText('Início: data')).toBeTruthy()
    expect(screen.queryByLabelText('Fim: data')).toBeNull()
  })

  it('sessão encerrada: o fim é obrigatório; apagá-lo mostra a mensagem no campo e não envia', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })
    const alvo = primeira.fixture.registros.find((r) => r.tipo === 'sono' && r.fim !== null)!
    primeira.unmount()
    const { rotina } = await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: primeira })
    const enviarEdicao = vi.spyOn(rotina, 'editarRegistro')

    digitar('Fim: data', '')
    digitar('Fim: hora', '')
    await enviar()

    expect(screen.getByText('Uma sessão encerrada não pode voltar a ficar em andamento.')).toBeTruthy()
    expect(document.activeElement).toBe(campo('Fim: data'))
    expect(enviarEdicao).not.toHaveBeenCalled()
  })

  it('o cuidador não abre o registro de outra pessoa: vê o texto do papel e o link de volta', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })
    const alvo = registroDe(primeira.fixture, 'fralda', PESSOAS.juliana.id)
    primeira.unmount()
    primeira.conta.sessaoParaTeste(PESSOAS.bruno.email)

    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: primeira })

    expect(screen.getByText('Seu papel nesta família permite mudar só os registros que você fez.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Voltar para o registro' }).getAttribute('href')).toBe(`/app/registro/${alvo.id}`)
  })

  it('o observador e o bebê arquivado não abrem o formulário novo nem a edição', async () => {
    const observador = await renderizarRotaPronta('/app/registro/novo', { sessao: 'davi', papelDeDavi: 'observador' })
    expect(screen.getByText('Seu papel nesta família permite só ver os registros.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    observador.unmount()

    await renderizarRotaPronta('/app/registro/novo', { bebeArquivado: true })
    expect(screen.getByText('Este bebê está arquivado. Os registros ficam só para leitura.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
  })

  it('id que não é UUID, que não existe ou sem acesso: "Não encontrado"; excluído: a frase do banco', async () => {
    const primeira = await renderizarRotaPronta('/app/registro/banana/editar')
    expect(screen.getByText(/Não encontramos este registro/)).toBeTruthy()
    const alvo = registroDe(primeira.fixture, 'fralda', PESSOAS.bruno.id)
    primeira.unmount()

    const desconhecido = await renderizarRotaPronta('/app/registro/c3333333-3333-4333-8333-333333333333/editar', { mundo: primeira })
    expect(screen.getByText(/Não encontramos este registro/)).toBeTruthy()
    desconhecido.unmount()

    await primeira.rotina.excluirRegistro(alvo.id)
    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: primeira })
    expect(screen.getByText('Este registro foi excluído e não pode ser mudado.')).toBeTruthy()
  })

  it('"Detalhes" na confirmação da mamadeira abre a edição daquele registro', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')
    fireEvent.click(botao('Mais registros'))
    fireEvent.click(botao('Mamadeira'))
    await aguardarCarga()

    fireEvent.click(botao('Detalhes'))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toMatch(/^\/app\/registro\/[0-9a-f-]{36}\/editar$/)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Editar registro')
  })

  it('a edição aberta pela sessão em andamento de Juliana: o responsável edita a sessão de outro cuidador', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje', { ajustarRotina: comSessaoEmAndamento('mamada', 10 * MIN, PESSOAS.bruno.id) })
    const alvo = registroDe(primeira.fixture, 'mamada', PESSOAS.bruno.id, true)
    primeira.unmount()

    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: primeira })

    expect(screen.getByLabelText('Lado')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy()
  })
})
