import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeletorFuso } from '../componentes/conta/Campos.tsx'
import { rotuloDoFuso } from '../componentes/conta/fusos.ts'
import * as TEXTOS from '../conteudo/conta.ts'
import { CENA_ACESSO, COMECAR, COMECAR_FAMILIA, COMUM, CONTA, CONVITE, FAMILIA, PAPEIS, TEXTOS_ERRO, textoDoErro } from '../conteudo/conta.ts'
import { erroDaChave } from '../dados/conta.erros.ts'
import { criarDadosContaMemoria } from '../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from './renderizarComDados.tsx'

// LOC-04 (LOC-REV C01-C14 e SEC-REV SEC-06, parte da tela): as frases da conta, da família e do
// convite servem para qualquer pessoa que lê e para qualquer nome de bebê; a exportação diz o
// formato (JSON, RF-13); o fuso aparece em pt-BR; a sigla é "ID"; a senha tem pelo menos 8 caracteres.

const semEfeito = () => undefined

/** Todas as frases fixas de conta.ts, de qualquer profundidade (as funções ficam de fora). */
function frasesFixas(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor]
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(frasesFixas)
  return []
}

describe('LOC-04: concordância neutra (C01, C02)', () => {
  it('C01: o convite diz o papel sem particípio que concorde com quem lê', () => {
    expect(CONVITE.convidouComo).toBe('Seu papel nesta família:')
    expect(CONVITE.convidouComo).not.toMatch(/convidad[oa]/)
  })

  it.each(['Heloísa', 'Davi', 'Mel'])('C02: bebê adicionado e arquivado sem concordar com o nome (%s)', (nome) => {
    expect(FAMILIA.bebes.adicionado(nome)).toBe(`Bebê adicionado: ${nome}.`)
    expect(FAMILIA.bebes.arquivado(nome)).toBe(`Bebê arquivado: ${nome}.`)
    expect(FAMILIA.bebes.adicionado(nome)).not.toMatch(/foi adicionad[oa]/)
    expect(FAMILIA.bebes.arquivado(nome)).not.toMatch(/foi arquivad[oa]/)
  })

  it('nenhuma frase fixa de conta.ts traz "foi convidado", "foi adicionado" ou "foi arquivado"', () => {
    const todas = frasesFixas(TEXTOS)
    for (const proibida of ['foi convidado', 'foi adicionado', 'foi arquivado']) {
      expect(todas.filter((frase) => frase.includes(proibida)), proibida).toEqual([])
    }
  })
})

describe('LOC-04: registro, regência e sentido (C03 a C08, C10, C11, C13)', () => {
  it('C03: o cuidador edita e exclui só os próprios registros', () => {
    expect(PAPEIS.cuidador.permite).toBe(
      'Registra e acompanha. Edita e exclui só os próprios registros e pode encerrar qualquer sessão em andamento.',
    )
  })

  it('C04: quem cria a família fica como responsável', () => {
    expect(COMECAR_FAMILIA.criar.texto).toBe('Você fica como responsável e pode convidar quem vai cuidar junto.')
  })

  it('C05 e C06: a exclusão da conta diz "nestas famílias" e "são apagados", e mantém "pessoa removida"', () => {
    expect(CONTA.excluir.impedimento).toBe(
      'Você é a única pessoa responsável nestas famílias. Antes de excluir a conta, torne outra pessoa responsável ou exclua a família:',
    )
    expect(CONTA.excluir.explicacao).toMatch(/^Ao excluir a conta, ela e os seus vínculos com famílias são apagados\./)
    expect(CONTA.excluir.explicacao).toContain('o autor passa a aparecer como “pessoa removida”')
  })

  it('C07: o ID é um código, não um número', () => {
    expect(CONTA.id.frase).toBe('Quem cuida da moderação pode pedir este código para dar a você um papel na equipe.')
  })

  it('C08: a exportação diz que o arquivo é JSON e quem recebe o quê', () => {
    expect(CONTA.exportar.frase).toBe(
      'Baixe uma cópia dos seus dados num arquivo JSON. Quem é responsável recebe os dados da família inteira; as outras pessoas recebem os próprios dados.',
    )
  })

  it('C10: o termo da LGPD é "Encarregado pelo tratamento de dados"', () => {
    expect(CONTA.privacidade.encarregado.antes).toBe('Encarregado pelo tratamento de dados: ')
  })

  it('C11: o alt da cena descreve o que se vê, sem nome de token de cor, e termina em ponto', () => {
    expect(CENA_ACESSO.alt).toBe('Celular sobre um pedestal verde-oliva, com uma tela do AppMaternidade aberta.')
    expect(CENA_ACESSO.alt).not.toMatch(/\b(de oliva|mel|cacau)\b/)
  })

  it('C13: o código de convite "não é válido"', () => {
    expect(TEXTOS_ERRO.convite_invalido).toBe('Este código de convite não é válido. Confira se copiou o código inteiro.')
  })
})

describe('LOC-04: a sigla ID (C09)', () => {
  it('os textos da conta escrevem "ID" em maiúsculas', () => {
    expect(COMUM.idCopiado).toBe('ID copiado.')
    expect(CONTA.secoes.id).toBe('ID da conta')
    expect(CONTA.id.titulo).toBe('ID da sua conta')
    expect(CONTA.id.botao).toBe('Copiar ID')
  })

  it('nenhuma frase fixa de conta.ts traz "Id " nem "id" solto', () => {
    expect(frasesFixas(TEXTOS).filter((frase) => /\bId\b|\bid\b/.test(frase))).toEqual([])
  })
})

describe('LOC-04: o fuso horário em pt-BR (C12)', () => {
  it('os rótulos dizem "Fuso horário"', () => {
    expect(COMECAR.fuso).toBe('Fuso horário')
    expect(COMECAR_FAMILIA.formulario.fuso).toBe('Fuso horário da família')
    expect(FAMILIA.acoes.fuso).toBe('Fuso horário da família')
    expect(CONTA.perfil.fuso).toBe('Seu fuso horário')
  })

  it('America/Sao_Paulo aparece com o nome em pt-BR, a diferença para o UTC e a cidade', () => {
    const rotulo = rotuloDoFuso('America/Sao_Paulo')
    expect(rotulo).toMatch(/^Horário .*Brasília \(UTC−3, São Paulo\)$/)
    expect(rotulo).not.toContain('America/')
    expect(rotulo).not.toContain('_')
  })

  it('a cidade do Brasil leva acento; a de fora sai sem o sublinhado do identificador', () => {
    expect(rotuloDoFuso('America/Cuiaba')).toMatch(/\(UTC−4, Cuiabá\)$/)
    expect(rotuloDoFuso('America/Manaus')).toMatch(/\(UTC−4, Manaus\)$/)
    expect(rotuloDoFuso('America/Noronha')).toMatch(/\(UTC−2, Fernando de Noronha\)$/)
    expect(rotuloDoFuso('America/Argentina/Buenos_Aires')).toMatch(/\(UTC−3, Buenos Aires\)$/)
  })

  it('UTC e os fusos sem nome próprio mostram só a diferença; um identificador inválido volta como veio', () => {
    expect(rotuloDoFuso('UTC')).toBe('UTC')
    expect(rotuloDoFuso('Etc/GMT+3')).toBe('UTC−3')
    expect(rotuloDoFuso('Asia/Kolkata')).toMatch(/\(UTC\+5:30, Kolkata\)$/)
    expect(rotuloDoFuso('Nao/Existe')).toBe('Nao/Existe')
  })

  it('o seletor mostra o rótulo em pt-BR e guarda o identificador IANA como valor', () => {
    render(createElement(SeletorFuso, { rotulo: 'Seu fuso horário', valor: 'America/Sao_Paulo', aoMudar: semEfeito }))
    const seletor = screen.getByLabelText('Seu fuso horário') as HTMLSelectElement
    expect(seletor.value).toBe('America/Sao_Paulo')
    const opcao = seletor.selectedOptions[0]
    expect(opcao.value).toBe('America/Sao_Paulo')
    expect(opcao.textContent).toBe(rotuloDoFuso('America/Sao_Paulo'))
    // Nenhuma opção mostra o identificador cru (com barra ou sublinhado).
    expect([...seletor.options].filter((o) => /[/_]/.test(o.textContent ?? '')).map((o) => o.value)).toEqual([])
  })

  it('o fuso guardado fora da lista aparece primeiro, com o rótulo em pt-BR e "(atual)"', () => {
    render(createElement(SeletorFuso, { rotulo: 'Fuso horário', valor: 'Etc/GMT+3', guardado: 'Etc/GMT+3', aoMudar: semEfeito }))
    const seletor = screen.getByLabelText('Fuso horário') as HTMLSelectElement
    expect(seletor.options[0].value).toBe('Etc/GMT+3')
    expect(seletor.options[0].textContent).toBe('UTC−3 (atual)')
  })
})

describe('LOC-04: "já faz parte" sem nome de família (C14)', () => {
  it('com o nome, a frase leva o nome; sem nome ou só espaços, "desta família"', () => {
    const erro = erroDaChave('ja_e_membro')
    expect(textoDoErro(erro, 'Família Exemplo')).toBe('Você já faz parte da família Família Exemplo.')
    expect(textoDoErro(erro, 'Casa da Ana')).toBe('Você já faz parte da família Casa da Ana.')
    expect(textoDoErro(erro, '')).toBe('Você já faz parte desta família.')
    expect(textoDoErro(erro, '   ')).toBe('Você já faz parte desta família.')
    expect(textoDoErro(erro)).toBe('Você já faz parte desta família.')
  })
})

describe('LOC-04: senha de pelo menos 8 caracteres (C15)', () => {
  const AGORA = Date.parse('2026-11-06T12:00:00.000Z')
  const criar = () => criarDadosContaMemoria(criarFixtureDeTeste(AGORA), { agora: () => AGORA })

  it('a frase do erro diz 8', () => {
    expect(TEXTOS_ERRO.senha_fraca).toBe('A senha precisa ter pelo menos 8 caracteres.')
    expect(erroDaChave('senha_fraca').mensagemOriginal).toBe('Password should be at least 8 characters.')
  })

  it('no modo memória, criar conta com 7 caracteres dá senha_fraca e com 8 passa', async () => {
    const dados = criar()
    const curta = await dados.criarUsuario('sete@exemplo.invalid', '1234567', 'Sete', 'x')
    expect(curta.ok ? null : curta.erro.chave).toBe('senha_fraca')
    const certa = await dados.criarUsuario('oito@exemplo.invalid', '12345678', 'Oito', 'x')
    expect(certa.ok).toBe(true)
  })

  it('no modo memória, trocar para 7 caracteres dá senha_fraca e para 8 passa', async () => {
    const dados = criar()
    await dados.criarUsuario('troca@exemplo.invalid', 'senha-inicial', 'Troca', 'x')
    const curta = await dados.trocarSenha('abcdefg')
    expect(curta.ok ? null : curta.erro.chave).toBe('senha_fraca')
    expect((await dados.trocarSenha('abcdefgh')).ok).toBe(true)
  })
})
