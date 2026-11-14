import { useNavigate } from 'react-router'
import {
  COMUM,
  CONFIRMACAO,
  DETALHE,
  ESCOLHAS_FRALDA,
  LIGACOES,
  LIXEIRA,
  REGISTRO_RAPIDO,
  ROTULO_TIPO,
  SESSOES,
  textoDoErro,
  ehErroRepetivel,
} from '../../conteudo/rotina.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { diaDaFamilia, lerAparelho } from '../../dados/rotina.dia.ts'
import { podeEscrever, type ConteudoFralda, type DetalhesRegistro, type Registro, type TipoSessao } from '../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../dados/rotina.uuid.ts'
import { formatarDuracao, formatarHora } from '../../prototipo/formatar.ts'
import type { BebeAtivo, NovaConfirmacao, OrigemDoRegistro } from './contexto.ts'
import { useRotina } from './contexto.ts'
import { urlDoHistoricoDoDia } from './parametrosHistorico.ts'

// As escritas da rotina que o Hoje e a Sessão compartilham: iniciar sessão, registro rápido, Desfazer,
// encerrar (com nota ou em outro horário), descartar e unir. Toda escrita passa pelas funções da camada de
// dados, com o id da entidade gerado no navegador nas criações e repetido em toda nova tentativa. Nenhum
// erro mostra código nem mensagem crua: a frase vem do catálogo (`textoDoErro`).

const MINUTO = 60_000
const DEZ_MINUTOS = 10 * MINUTO
const DESTAQUE_DA_NOTA = 24 * 60 * MINUTO

const iso = (instante: number) => new Date(instante).toISOString()
const minusculo = (texto: string) => texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)

/**
 * O que o encerramento devolve. Na falha de escrita, `repetir` é o comando ORIGINAL congelado (a mesma sessão,
 * o mesmo fim, a mesma nota com o mesmo id): `Tentar de novo` chama ele, nunca outro comando nem outro momento.
 */
export type ResultadoDoEncerramento =
  | { ok: true }
  | { ok: false; erro: ErroDados; repetir: () => Promise<ResultadoDoEncerramento>; relogioAtras?: undefined }
  | { ok: false; relogioAtras: true; erro?: undefined; repetir?: undefined }

/** O resultado do descarte; na falha, `repetir` repete o mesmo descarte. */
export type ResultadoDoDescarte =
  | { ok: true; valor: null }
  | { ok: false; erro: ErroDados; repetir: () => Promise<ResultadoDoDescarte>; relogioAtras?: undefined }

interface OpcoesDoEncerramento {
  /** O fim escolhido ("Encerrar em outro horário"); sem ele vale o relógio do navegador no clique. */
  momento?: number
  /** O texto da nota já cortado nas pontas; vazio ou ausente encerra sem nota. */
  nota?: string
  /** Só nas repetições: o id da nota e o fim do destaque dela, congelados na 1ª tentativa. */
  idDaNota?: string
  destaqueAte?: string
}

/** Criar (iniciar sessão, registro rápido) é do responsável e do cuidador, com o bebê não arquivado. */
const podeCriar = (ativo: BebeAtivo) => podeEscrever(ativo.papel) && !ativo.arquivado

export function useAcoesDaRotina() {
  const navigate = useNavigate()
  const rotina = useRotina()
  const { dados, ativo, atualizar, mostrarConfirmacao, fecharConfirmacao, podeAlterar, nomeDoAutor, contaId } = rotina

  /**
   * Depois de uma recusa de acesso, de um resultado incerto ou de a outra pessoa ter excluído o registro (a tela
   * mostra algo que já não existe), a tela relê (e o contexto também).
   */
  function aposErro(erro: ErroDados) {
    if (erro.classe === 'nao_encontrado' || erro.classe === 'sem_permissao' || erro.chave === 'registro_excluido' || ehErroRepetivel(erro)) {
      atualizar()
    }
  }

  /** A confirmação de um erro de escrita: a frase do catálogo e, se repetível, `Tentar de novo`. */
  function confirmacaoDeErro(erro: ErroDados, repetir?: () => void, textoDaNota?: string, origem?: OrigemDoRegistro): NovaConfirmacao {
    const acoes: NovaConfirmacao['acoes'] = []
    if (repetir && ehErroRepetivel(erro)) {
      acoes.push({ chave: 'tentar_de_novo', rotulo: COMUM.tentarDeNovo, executar: repetir })
    }
    // No 38b, a frase de `registro_excluido` ganha o link para a lixeira (R38-22).
    if (erro.chave === 'registro_excluido') {
      acoes.push({ chave: 'abrir_a_lixeira', rotulo: LIGACOES.abrirALixeira, executar: () => undefined, para: '/app/lixeira' })
    }
    acoes.push({ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined })
    return { texto: textoDoErro(erro, { escrita: true, papel: ativo?.papel }), acoes, textoDaNota, ...(origem ? { origem } : {}) }
  }

  /** `origem`: só no erro de um `Desfazer`, para o `Tentar de novo` levar o foco ao mesmo lugar que ele levou. */
  function mostrarErro(erro: ErroDados, repetir?: () => void, textoDaNota?: string, origem?: OrigemDoRegistro) {
    mostrarConfirmacao(confirmacaoDeErro(erro, repetir, textoDaNota, origem))
    aposErro(erro)
  }

  const fechar = { chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined } as const

  // ---- 38b: dia do registro, restaurar e excluir com Desfazer ---------------------------------------------

  /** O dia da família em que o registro começou (a rota do Histórico abre nesse dia). */
  function diaDoRegistro(registro: Registro): string {
    const fuso = rotina.contexto.familias.find((familia) => familia.id === registro.familiaId)?.fuso ?? lerAparelho().fuso
    return diaDaFamilia(Date.parse(registro.inicio), fuso)
  }

  /**
   * Restaura o registro. Com `confirmar`, mostra `Registro restaurado.` com o link `Ver no Histórico`; sem ele
   * (o `Desfazer` de uma exclusão), anuncia `Registro desfeito: <tipo>.` só com `Fechar` (A11Y-004). Falha: a
   * frase do catálogo e, se incerta, `Tentar de novo` com o mesmo id. Prazo vencido entre a leitura e o toque:
   * a frase e a releitura, que tira o item da lista.
   */
  async function restaurar(registro: Registro, opcoes: { confirmar: boolean }): Promise<boolean> {
    const resultado = await dados.restaurarRegistro(registro.id)
    if (!resultado.ok) {
      // O erro de um Desfazer leva a origem: o controle que o criou (a exclusão no detalhe) já saiu da tela.
      mostrarErro(resultado.erro, () => void restaurar(registro, opcoes), undefined, opcoes.confirmar ? undefined : 'tela')
      if (resultado.erro.chave === 'prazo_encerrado') atualizar()
      return false
    }
    atualizar()
    if (opcoes.confirmar) {
      mostrarConfirmacao({
        texto: LIXEIRA.restaurado,
        acoes: [
          { chave: 'ver_no_historico', rotulo: LIGACOES.verNoHistorico, executar: () => undefined, para: urlDoHistoricoDoDia(diaDoRegistro(registro)) },
          fechar,
        ],
      })
    } else {
      mostrarConfirmacao({ texto: REGISTRO_RAPIDO.desfeito(registro.tipo), acoes: [fechar] })
    }
    return true
  }

  /**
   * Exclui o registro a partir do detalhe: sem confirmação prévia; depois, `Registro excluído.` com `Desfazer`
   * (restaura) e `Fechar`, e `aoConcluir` leva ao Histórico. Falha: a frase e, se incerta, `Tentar de novo`.
   */
  async function excluirDoDetalhe(registro: Registro, aoConcluir: () => void): Promise<void> {
    const resultado = await dados.excluirRegistro(registro.id)
    if (!resultado.ok) {
      mostrarErro(resultado.erro, () => void excluirDoDetalhe(registro, aoConcluir))
      return
    }
    atualizar()
    mostrarConfirmacao({
      texto: DETALHE.excluido,
      acoes: [{ chave: 'desfazer', rotulo: COMUM.desfazer, executar: () => void restaurar(registro, { confirmar: false }) }, fechar],
      origem: 'tela',
    })
    aoConcluir()
  }

  // ---- Desfazer ---------------------------------------------------------------------------------------

  /** Exclui o registro (vai para a lixeira). Falha: a frase e, se incerta, `Tentar de novo` com o mesmo id. */
  async function excluir(id: string, repeticao = false): Promise<void> {
    const resultado = await dados.excluirRegistro(id)
    if (resultado.ok) {
      // Uma nova tentativa que deu certo tira o erro da tela (`Tentar de novo` não o fecha ao tocar).
      if (repeticao) fecharConfirmacao()
      atualizar()
      return
    }
    mostrarErro(resultado.erro, () => void excluir(id, true))
  }

  /**
   * O `Desfazer` de um registro recém-criado (A11Y-004): exclui (vai para a lixeira) e anuncia
   * `Registro desfeito: <tipo>.` só com `Fechar`. Falha: a frase e, se incerta, `Tentar de novo` com o mesmo id;
   * o aviso só entra quando a exclusão deu certo, também na repetição. `origem` diz onde o foco volta.
   */
  async function desfazerRegistro(registro: Pick<Registro, 'id' | 'tipo'>, origem: OrigemDoRegistro): Promise<void> {
    const resultado = await dados.excluirRegistro(registro.id)
    if (!resultado.ok) {
      mostrarErro(resultado.erro, () => void desfazerRegistro(registro, origem), undefined, origem)
      return
    }
    atualizar()
    mostrarConfirmacao({ texto: REGISTRO_RAPIDO.desfeito(registro.tipo), acoes: [fechar] })
  }

  // ---- iniciar sessão ---------------------------------------------------------------------------------

  /** Abre a Sessão (`/app/sessao?id=`); pela URL do `?tipo=` troca a entrada do histórico e não move o foco. */
  function irParaASessao(id: string, opcoes: { avisar?: boolean; aPartirDaUrl?: boolean } = {}) {
    if (opcoes.aPartirDaUrl) {
      void navigate(`/app/sessao?id=${id}`, { replace: true })
      return
    }
    void navigate(`/app/sessao?id=${id}`, { state: opcoes.avisar ? { jaEmAndamento: true, foco: 'titulo' } : { foco: 'titulo' } })
  }

  /**
   * Começa uma sessão do bebê ativo (início = agora, `ao_vivo`) e abre a Sessão dela. Se o bebê já tem
   * alguma em andamento, nada é gravado: abre a que existe, com o aviso (D-6). Um erro de rede repete a
   * mesma chamada com o mesmo id.
   */
  async function iniciarSessao(tipo: TipoSessao, opcoes: { aPartirDaUrl?: boolean } = {}): Promise<void> {
    if (!ativo || !podeCriar(ativo)) return
    const bebeId = ativo.bebe.id
    const lidas = await dados.emAndamento(bebeId)
    if (!lidas.ok) {
      mostrarErro(lidas.erro, () => void iniciarSessao(tipo, opcoes))
      return
    }
    const existente = lidas.valor.itens[0]
    if (existente) {
      irParaASessao(existente.id, { avisar: !opcoes.aPartirDaUrl, aPartirDaUrl: opcoes.aPartirDaUrl })
      return
    }
    const entrada = { id: uuidV7(), bebeId, tipo, inicio: iso(Date.now()), origem: 'ao_vivo' as const }
    const tentar = async (): Promise<void> => {
      const gravada = await dados.gravarRegistro(entrada)
      if (!gravada.ok) {
        mostrarErro(gravada.erro, () => void tentar())
        return
      }
      // Começar uma sessão é outro registro: o erro de uma tentativa anterior sai da tela.
      fecharConfirmacao()
      atualizar()
      irParaASessao(entrada.id, opcoes)
      // Outra pessoa pode ter registrado a mesma sessão há pouco: a Sessão mostra a pergunta (Offline 7.2).
      const duplicado = await acharDuplicado(gravada.valor)
      if (duplicado) {
        mostrarConfirmacao({
          texto: textoDoDuplicado(duplicado, tipo),
          acoes: [
            { chave: 'manter_os_dois', rotulo: CONFIRMACAO.manterOsDois, executar: () => undefined },
            { chave: 'excluir_este', rotulo: CONFIRMACAO.excluirEste, executar: () => void excluir(entrada.id) },
            fechar,
          ],
        })
      }
    }
    await tentar()
  }

  // ---- registro rápido --------------------------------------------------------------------------------

  /** Outro registro do mesmo tipo, de outra pessoa, a até 10 minutos do novo (Offline 7.2). */
  async function acharDuplicado(registro: Registro): Promise<Registro | null> {
    const inicio = Date.parse(registro.inicio)
    const lidos = await dados.doIntervalo(registro.bebeId, iso(inicio - DEZ_MINUTOS), iso(inicio + DEZ_MINUTOS + 1))
    if (!lidos.ok) return null
    return (
      lidos.valor.itens.find(
        (outro) =>
          outro.id !== registro.id &&
          outro.tipo === registro.tipo &&
          outro.criadoPor !== contaId &&
          Math.abs(Date.parse(outro.inicio) - inicio) <= DEZ_MINUTOS,
      ) ?? null
    )
  }

  /** "<autor> registrou <tipo> às HH:MM.", do registro parecido que já existia. */
  function textoDoDuplicado(duplicado: Registro, tipo: Registro['tipo']): string {
    return CONFIRMACAO.duplicado(
      nomeDoAutor(duplicado.criadoPor, duplicado.familiaId),
      minusculo(ROTULO_TIPO[tipo]),
      formatarHora(Date.parse(duplicado.inicio)),
    )
  }

  /**
   * Grava um registro pontual num toque (fralda, mamadeira, alimentação sólida) e mostra a confirmação com
   * `Desfazer` e `Fechar`. Um erro de rede repete a mesma chamada com o mesmo id.
   */
  async function registrarPontual(tipo: 'fralda' | 'mamadeira' | 'solido', detalhes: DetalhesRegistro, textoBase: string): Promise<void> {
    if (!ativo || !podeCriar(ativo)) return
    const entrada = { id: uuidV7(), bebeId: ativo.bebe.id, tipo, inicio: iso(Date.now()), detalhes, origem: 'ao_vivo' as const }
    const tentar = async (): Promise<void> => {
      const gravada = await dados.gravarRegistro(entrada)
      if (!gravada.ok) {
        mostrarErro(gravada.erro, () => void tentar())
        return
      }
      const registro = gravada.valor
      atualizar()
      const duplicado = await acharDuplicado(registro)
      const acoes: NovaConfirmacao['acoes'] = []
      // Fralda nasce no botão Fralda; mamadeira e alimentação sólida, no painel do botão Mais (A11Y-004).
      const origem: OrigemDoRegistro = tipo === 'fralda' ? 'fralda' : 'mais'
      if (duplicado) {
        acoes.push(
          { chave: 'manter_os_dois', rotulo: CONFIRMACAO.manterOsDois, executar: () => undefined },
          { chave: 'excluir_este', rotulo: CONFIRMACAO.excluirEste, executar: () => void excluir(registro.id) },
        )
      } else {
        acoes.push({ chave: 'desfazer', rotulo: COMUM.desfazer, executar: () => void desfazerRegistro(registro, origem) })
      }
      acoes.push(fechar)
      if (tipo !== 'fralda') {
        acoes.splice(acoes.length - 1, 0, {
          chave: 'detalhes',
          rotulo: REGISTRO_RAPIDO.detalhes,
          executar: () => void navigate(`/app/registro/${registro.id}/editar`, { state: { de: 'hoje', foco: 'titulo' } }),
        })
      }
      const aviso = duplicado ? ` ${textoDoDuplicado(duplicado, tipo)}` : ''
      mostrarConfirmacao({ texto: `${textoBase}${aviso}`, acoes, origem })
    }
    await tentar()
  }

  function registrarFralda(conteudo: ConteudoFralda): Promise<void> {
    const escolha = ESCOLHAS_FRALDA.find((candidata) => candidata.valor === conteudo)
    return registrarPontual('fralda', { conteudo }, REGISTRO_RAPIDO.fraldaRegistrada(escolha ? escolha.rotulo : ''))
  }

  function registrarMamadeiraOuSolido(tipo: 'mamadeira' | 'solido'): Promise<void> {
    return registrarPontual(tipo, {}, REGISTRO_RAPIDO.registrada(ROTULO_TIPO[tipo]))
  }

  // ---- encerrar ---------------------------------------------------------------------------------------

  /**
   * Encerra a sessão e, com nota, grava depois uma nota de cuidado do bebê com destaque de 24 horas (duas
   * chamadas, 46-M7). Envia sempre o `momento`: o relógio do navegador no clique ou o horário escolhido.
   * Um relógio atrás do início gravado não envia nada. O resultado de sucesso já deixa a confirmação.
   */
  async function encerrar(registro: Registro, opcoes: OpcoesDoEncerramento = {}): Promise<ResultadoDoEncerramento> {
    const escolhido = opcoes.momento ?? Date.now()
    const inicio = Date.parse(registro.inicio)
    if (escolhido < inicio) return { ok: false, relogioAtras: true }

    // O comando congelado na 1ª tentativa: o fim, o texto, o id da nota e o destaque dela. Repetir não lê o
    // relógio de novo nem gera outro id, também depois de a tela reler e achar a sessão já encerrada.
    const congelado: OpcoesDoEncerramento = {
      momento: escolhido,
      nota: opcoes.nota,
      idDaNota: opcoes.idDaNota ?? uuidV7(),
      destaqueAte: opcoes.destaqueAte ?? iso(Date.now() + DESTAQUE_DA_NOTA),
    }
    const resposta = await dados.encerrarSessao(registro.id, iso(escolhido))
    if (!resposta.ok) {
      aposErro(resposta.erro)
      return { ok: false, erro: resposta.erro, repetir: () => encerrar(registro, congelado) }
    }
    const fim = Date.parse(resposta.valor)
    atualizar()

    // Outra pessoa já tinha encerrado: o banco devolveu o primeiro fim, diferente do enviado.
    if (fim !== escolhido) {
      const lido = await dados.registro(registro.id)
      const quem = lido.ok && lido.valor ? nomeDoAutor(lido.valor.encerradoPor, registro.familiaId) : COMUM.exMembro
      mostrarConfirmacao({ texto: SESSOES.jaEncerradaPor(quem, formatarHora(fim)), acoes: [fechar] })
      return { ok: true }
    }

    const nota = (opcoes.nota ?? '').trim()
    const editar = podeAlterar(registro)
      ? [
          {
            chave: 'editar_horario' as const,
            rotulo: CONFIRMACAO.editarHorario,
            executar: () => void navigate(`/app/registro/${registro.id}/editar`, { state: { de: 'hoje', foco: 'titulo' } }),
          },
        ]
      : []
    const duracao = formatarDuracao(fim - inicio)

    if (nota === '') {
      mostrarConfirmacao({ texto: CONFIRMACAO.sessaoEncerrada(duracao, false), acoes: [...editar, fechar] })
      return { ok: true }
    }

    const entradaDaNota = {
      id: congelado.idDaNota as string,
      familiaId: registro.familiaId,
      texto: nota,
      bebeId: registro.bebeId,
      destaqueAte: congelado.destaqueAte as string,
    }
    const gravarNota = async (): Promise<void> => {
      const gravada = await dados.gravarNota(entradaDaNota)
      if (gravada.ok) {
        atualizar()
        mostrarConfirmacao({ texto: CONFIRMACAO.sessaoEncerrada(duracao, true), acoes: [...editar, fechar] })
        return
      }
      // A sessão continua encerrada. Sem resposta: repete com o mesmo id e o mesmo texto. Recusa do banco:
      // a frase e o texto da nota, para a pessoa não perder o que escreveu.
      const repetivel = ehErroRepetivel(gravada.erro)
      mostrarErro(gravada.erro, repetivel ? () => void gravarNota() : undefined, repetivel ? undefined : nota)
    }
    await gravarNota()
    return { ok: true }
  }

  // ---- descartar e unir -------------------------------------------------------------------------------

  /** Descartar exclui a sessão (ela vai para a lixeira). Na falha, `repetir` repete o mesmo descarte. */
  async function descartar(registro: Registro): Promise<ResultadoDoDescarte> {
    const resultado = await dados.excluirRegistro(registro.id)
    if (resultado.ok) {
      atualizar()
      return resultado
    }
    aposErro(resultado.erro)
    return { ok: false, erro: resultado.erro, repetir: () => descartar(registro) }
  }

  /**
   * Mantém a sessão de início mais cedo e exclui as outras do mesmo tipo, uma por vez, na ordem do início.
   * Se uma exclusão falhar no meio, nada é revertido; quem chama mostra o erro e `Unir` recalcula.
   */
  async function unir(sessoes: readonly Registro[]): Promise<Resultado<null>> {
    const ordenadas = [...sessoes].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || (a.id < b.id ? -1 : 1))
    for (const sobra of ordenadas.slice(1)) {
      const resultado = await dados.excluirRegistro(sobra.id)
      if (!resultado.ok) {
        atualizar()
        return resultado
      }
    }
    atualizar()
    return { ok: true, valor: null }
  }

  /** Quem pode alterar todas as que seriam excluídas na união. */
  function podeUnir(sessoes: readonly Registro[]): boolean {
    const ordenadas = [...sessoes].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || (a.id < b.id ? -1 : 1))
    return ordenadas.slice(1).every((sobra) => podeAlterar(sobra))
  }

  return {
    iniciarSessao,
    excluir,
    desfazerRegistro,
    registrarFralda,
    registrarMamadeiraOuSolido,
    encerrar,
    descartar,
    unir,
    podeUnir,
    restaurar,
    excluirDoDetalhe,
    diaDoRegistro,
    confirmacaoDeErro,
    mostrarErro,
    aposErro,
    nomeDoAutor,
  }
}
