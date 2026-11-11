import { describe, expect, it } from 'vitest'
import { TEXTOS_ERRO_COMUNIDADE, textoDoErroComunidade } from '../conteudo/comunidade.ts'
import { classificarErroComunidade, erroDaChaveComunidade, ehPerfilJaCriado } from './comunidade.erros.ts'

// MAT-40, teste 3: cada linha da tabela fechada de frases (MAT-40:RF-15, 4.6) vira uma asserção, de código
// e mensagem para chave e frase. Entram também um erro de rede, um código desconhecido e a precedência.

const CRIAR = (restricao: string, tabela = 'topicos') => `new row for relation "${tabela}" violates check constraint "${restricao}"`

// [código, mensagem do banco, chave, classe, a frase do contrato]
const LINHAS: Array<[string, string, string, string, string]> = [
  ['', 'Failed to fetch', 'rede', 'rede', 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
  ['40P01', 'deadlock detected', 'tente_de_novo', 'tente_de_novo', 'O servidor estava ocupado. Tente de novo.'],
  ['P0001', 'tente de novo', 'tente_de_novo', 'tente_de_novo', 'O servidor estava ocupado. Tente de novo.'],
  ['P0002', 'topico inexistente', 'nao_encontrado', 'nao_encontrado', 'Não encontramos isso. Pode ter sido removido.'],
  ['42501', 'permission denied for table topicos', 'sem_permissao', 'sem_permissao', 'Você não tem permissão para fazer isso.'],
  ['42501', 'new row violates row-level security policy for table "topicos"', 'sem_permissao', 'sem_permissao', 'Você não tem permissão para fazer isso.'],
  ['P0001', 'parametro obrigatorio', 'parametro_obrigatorio', 'negocio', 'Falta preencher um campo obrigatório.'],
  ['23502', 'null value in column "titulo"', 'parametro_obrigatorio', 'negocio', 'Falta preencher um campo obrigatório.'],
  ['P0001', 'sem conta', 'sem_conta', 'negocio', 'Sua conta ainda não está pronta. Saia e entre de novo.'],
  ['P0001', 'termos indisponiveis', 'termos_indisponiveis', 'negocio', 'Os termos estão em revisão. Por enquanto você pode ler, mas não publicar.'],
  ['P0001', 'sem aceite', 'sem_aceite', 'negocio', 'Para publicar, aceite os termos e as regras da comunidade.'],
  ['P0001', 'sem perfil', 'sem_perfil', 'negocio', 'Para publicar, crie seu perfil público.'],
  ['P0001', 'versao nao vigente', 'versao_nao_vigente', 'negocio', 'Os termos mudaram. Leia a versão nova e aceite de novo.'],
  ['23514', 'alvo invalido', 'alvo_invalido', 'negocio', 'Escolha o que você quer denunciar.'],
  ['P0002', 'alvo inexistente', 'alvo_inexistente', 'nao_encontrado', 'Esse conteúdo não está mais disponível.'],
  ['P0001', 'so um nivel de resposta', 'so_um_nivel', 'negocio', 'Só dá para responder a uma resposta direta do tópico.'],
  ['P0001', 'resposta de outro topico', 'resposta_de_outro_topico', 'negocio', 'Essa resposta é de outro tópico.'],
  ['23505', 'duplicate key value violates unique constraint "perfis_publicos_apelido_idx"', 'apelido_em_uso', 'negocio', 'Esse apelido já está em uso. Escolha outro.'],
  ['23514', CRIAR('perfis_publicos_apelido_tamanho', 'perfis_publicos'), 'texto_fora_do_tamanho', 'negocio', 'O texto está fora do tamanho permitido.'],
  ['23514', CRIAR('perfis_publicos_bio_tamanho', 'perfis_publicos'), 'texto_fora_do_tamanho', 'negocio', 'O texto está fora do tamanho permitido.'],
  ['23514', CRIAR('topicos_titulo_tamanho'), 'texto_fora_do_tamanho', 'negocio', 'O texto está fora do tamanho permitido.'],
  ['23514', CRIAR('topicos_corpo_tamanho'), 'texto_fora_do_tamanho', 'negocio', 'O texto está fora do tamanho permitido.'],
  ['23514', CRIAR('respostas_corpo_tamanho', 'respostas'), 'texto_fora_do_tamanho', 'negocio', 'O texto está fora do tamanho permitido.'],
  ['23514', CRIAR('denuncias_texto_tamanho', 'denuncias'), 'texto_fora_do_tamanho', 'negocio', 'O texto está fora do tamanho permitido.'],
  ['23505', 'duplicate key value violates unique constraint "perfis_publicos_conta_unica"', 'desconhecido', 'desconhecido', 'Algo deu errado. Tente de novo. Se continuar, avise a equipe pelo Contato.'],
  ['23514', CRIAR('bloqueios_nao_a_si_mesmo', 'bloqueios'), 'desconhecido', 'desconhecido', 'Algo deu errado. Tente de novo. Se continuar, avise a equipe pelo Contato.'],
  ['22023', 'invalid parameter value', 'desconhecido', 'desconhecido', 'Algo deu errado. Tente de novo. Se continuar, avise a equipe pelo Contato.'],
]

describe('a tabela fechada de frases', () => {
  for (const [codigo, mensagem, chave, classe, frase] of LINHAS) {
    it(`${codigo || 'rede'} "${mensagem.slice(0, 50)}" → ${chave}`, () => {
      const origem = codigo === '' ? new TypeError(mensagem) : { code: codigo, message: mensagem }
      const erro = classificarErroComunidade(origem)
      expect(erro).toMatchObject({ chave, classe, mensagemOriginal: mensagem })
      expect(erro.codigo).toBe(codigo === '' ? 'rede' : codigo)
      expect(TEXTOS_ERRO_COMUNIDADE[chave]).toBe(frase)
      // O `desconhecido` mostra também o código, entre parênteses; as outras frases, só o texto.
      expect(textoDoErroComunidade(erro)).toBe(chave === 'desconhecido' ? `${frase} (${codigo})` : frase)
    })
  }

  it('o update sem linhas e a sessão encerrada têm a chave própria', () => {
    expect(erroDaChaveComunidade('nao_editavel')).toMatchObject({ classe: 'nao_encontrado', chave: 'nao_editavel' })
    expect(TEXTOS_ERRO_COMUNIDADE.nao_editavel).toBe('Isso não pode mais ser editado. Pode ter sido moderado ou removido.')
    for (const origem of [{ code: 'PGRST301', message: 'JWT expired' }, { status: 401, message: 'Unauthorized' }, { name: 'AuthSessionMissingError', message: 'x' }]) {
      expect(classificarErroComunidade(origem).classe).toBe('sessao_encerrada')
    }
  })

  it('a precedência: a chave específica vale quando a mensagem casa; senão, a frase genérica da classe', () => {
    expect(classificarErroComunidade({ code: 'P0002', message: 'alvo inexistente' }).chave).toBe('alvo_inexistente')
    expect(classificarErroComunidade({ code: 'P0002', message: 'qualquer outra' }).chave).toBe('nao_encontrado')
    expect(classificarErroComunidade({ code: '23514', message: 'outra restricao' }).chave).toBe('desconhecido')
    expect(classificarErroComunidade({ code: 'P0001', message: 'mensagem fora do catalogo' }).chave).toBe('desconhecido')
  })

  it('um erro de rede (o cliente lança) e um código desconhecido, com o código à vista na frase', () => {
    expect(classificarErroComunidade(new TypeError('Failed to fetch')).classe).toBe('rede')
    expect(classificarErroComunidade({ message: 'fetch failed' }).classe).toBe('rede')
    expect(textoDoErroComunidade(classificarErroComunidade({ code: '99999', message: 'x' }))).toBe(`${TEXTOS_ERRO_COMUNIDADE.desconhecido} (99999)`)
    expect(textoDoErroComunidade(classificarErroComunidade({ message: 'sem código' }))).toBe(TEXTOS_ERRO_COMUNIDADE.desconhecido)
  })

  it('nenhuma frase cita termo de banco', () => {
    for (const frase of Object.values(TEXTOS_ERRO_COMUNIDADE)) {
      expect(frase).not.toMatch(/P0001|P0002|42501|23505|23514|rls|constraint|SQL|banco de dados/i)
    }
  })

  it('o perfil criado noutra aba é o 23505 da conta única, e só ele', () => {
    const conta = classificarErroComunidade({ code: '23505', message: 'duplicate key value violates unique constraint "perfis_publicos_conta_unica"' })
    const apelido = classificarErroComunidade({ code: '23505', message: 'duplicate key value violates unique constraint "perfis_publicos_apelido_idx"' })
    expect(ehPerfilJaCriado(conta)).toBe(true)
    expect(ehPerfilJaCriado(apelido)).toBe(false)
  })

  it('um erro que já é do catálogo passa sem mudar', () => {
    const erro = erroDaChaveComunidade('so_um_nivel')
    expect(classificarErroComunidade(erro)).toBe(erro)
  })

  it('cada chave da linha da tabela tem uma origem de exemplo que volta à mesma chave', () => {
    for (const chave of Object.keys(TEXTOS_ERRO_COMUNIDADE)) {
      expect(erroDaChaveComunidade(chave as Parameters<typeof erroDaChaveComunidade>[0]).chave).toBe(chave)
    }
  })
})
