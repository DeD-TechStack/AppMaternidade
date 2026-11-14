import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChevronDown, CircleAlert } from 'lucide-react'
import { COMUM, CONFIRMACAO, FORMULARIO, LIMITES_DE_DURACAO_MIN, ROTULO_TIPO } from '../../conteudo/rotina.ts'
import type { ErroDados } from '../../dados/comum.ts'
import {
  TIPOS_REGISTRO,
  ehTipoDeSessao,
  type ConteudoFralda,
  type ConteudoMamadeira,
  type LadoMamada,
  type Registro,
  type TipoRegistro,
  type TipoSessao,
} from '../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../dados/rotina.uuid.ts'
import { formatarDuracao, formatarHora } from '../../prototipo/formatar.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import { AvisoDeErro } from './AvisoDeErro.tsx'
import { CampoHorario } from './CampoHorario.tsx'
import { useRotina, type BebeAtivo } from './contexto.ts'
import { destinoDoFormulario } from './destinoDoFormulario.ts'
import { useAcoesDaRotina } from './useAcoesDaRotina.ts'
import {
  camposDoRegistro,
  camposVazios,
  temCampoDeFim,
  validarRegistro,
  type CamposDoRegistro,
  type EntradaValidada,
  type ErrosDoRegistro,
} from './validacaoRegistro.ts'

interface Props {
  modo: 'novo' | 'editar'
  ativo: BebeAtivo
  /** O tipo que veio da URL (`?tipo=`); vazio: o primeiro campo é a escolha do tipo. */
  tipoInicial: TipoRegistro | ''
  /** Na edição, o registro lido: o formulário guarda o que a pessoa digitou e a releitura não o mexe. */
  registro?: Registro
}

const minusculo = (texto: string) => texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)

/**
 * A chamada de escrita COMPLETA, congelada quando a pessoa envia: o id, o tipo, o bebê e os valores. `Tentar de
 * novo` e `Salvar assim` repetem exatamente esta chamada (a 2ª tentativa é a mesma operação da 1ª); mexer nos
 * campos depois da falha não a altera. Salvar os valores corrigidos é outro envio, e na criação é outra
 * criação, com outro id.
 */
interface Chamada {
  id: string
  tipo: TipoRegistro
  bebeId: string
  entrada: EntradaValidada
}

const mesmosValores = (a: Chamada, b: Chamada) =>
  a.tipo === b.tipo &&
  a.bebeId === b.bebeId &&
  a.entrada.inicio === b.entrada.inicio &&
  a.entrada.fim === b.entrada.fim &&
  a.entrada.nota === b.entrada.nota &&
  JSON.stringify(a.entrada.detalhes) === JSON.stringify(b.entrada.detalhes)

interface PropsDoControle {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

/** Rótulo visível acima, o controle e a mensagem ligada por `aria-describedby` (ícone e palavras, nunca só cor). */
export function Controle({
  rotulo,
  erro,
  ajuda,
  children,
}: {
  rotulo: string
  erro?: string
  ajuda?: string
  children: (propriedades: PropsDoControle) => ReactNode
}) {
  const id = useId()
  const ligados = [erro ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="cm-campo max-w-none">
      <label htmlFor={id} className="cm-campo-rotulo">
        {rotulo}
      </label>
      {children({ id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': ligados })}
      {erro ? (
        <p id={`${id}-erro`} className="cm-campo-mensagem cm-campo-erro cm-pequeno flex items-start gap-2">
          <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </p>
      ) : null}
      {ajuda ? (
        <p id={`${id}-ajuda`} className="cm-campo-mensagem cm-pequeno text-(--cor-texto-2)">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}

export function Selecao<T extends string>({
  rotulo,
  valor,
  opcoes,
  vazio,
  aoMudar,
  erro,
  bloqueado,
}: {
  rotulo: string
  valor: T | ''
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>
  vazio: string
  aoMudar: (novo: T | '') => void
  erro?: string
  bloqueado: boolean
}) {
  return (
    <Controle rotulo={rotulo} erro={erro}>
      {(propriedades) => (
        <div className="cm-campo-controle" data-select="">
          <select
            {...propriedades}
            value={valor}
            disabled={bloqueado}
            className="cm-campo-entrada min-h-12"
            onChange={(evento) => aoMudar(evento.target.value as T | '')}
          >
            <option value="">{vazio}</option>
            {opcoes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
          <ChevronDown className="cm-campo-seta" aria-hidden="true" />
        </div>
      )}
    </Controle>
  )
}

const LADOS = (Object.keys(FORMULARIO.lados) as LadoMamada[]).map((valor) => ({ valor, rotulo: FORMULARIO.lados[valor] }))
const CONTEUDOS_DA_MAMADEIRA = (Object.keys(FORMULARIO.conteudosDaMamadeira) as ConteudoMamadeira[]).map((valor) => ({
  valor,
  rotulo: FORMULARIO.conteudosDaMamadeira[valor],
}))
const CONTEUDOS_DA_FRALDA: ReadonlyArray<{ valor: ConteudoFralda; rotulo: string }> = [
  { valor: 'xixi', rotulo: 'Xixi' },
  { valor: 'coco', rotulo: 'Cocô' },
  { valor: 'ambos', rotulo: 'Ambos' },
]

/**
 * O formulário dos 7 registros, novo e edição (R38-10): os campos de cada tipo (DR-02 e DR-03), horários com
 * `−5 min` e `+5 min`, validação antes de enviar com a mensagem ao lado do campo e o foco no primeiro erro,
 * os avisos que não bloqueiam (`Salvar assim` / `Corrigir`), o envio com `Salvando…`, o erro do banco acima
 * dos botões em `role="alert"` e o destino ao salvar ou cancelar. O novo grava com o id gerado no navegador.
 */
export function FormularioRegistro({ modo, ativo, tipoInicial, registro }: Props) {
  const { dados, atualizar, mostrarConfirmacao } = useRotina()
  const acoes = useAcoesDaRotina()
  const navigate = useNavigate()
  const location = useLocation()
  const formulario = useRef<HTMLFormElement>(null)
  const [id] = useState(() => registro?.id ?? uuidV7())
  const [campos, setCampos] = useState<CamposDoRegistro>(() =>
    registro ? camposDoRegistro(registro) : { ...camposVazios(Date.now()), tipo: tipoInicial },
  )
  const [erros, setErros] = useState<ErrosDoRegistro>({})
  const [tentativas, setTentativas] = useState(0)
  const [passo, setPasso] = useState<'editando' | 'confirmando'>('editando')
  const [avisos, setAvisos] = useState<string[]>([])
  const [erroDeLeitura, setErroDeLeitura] = useState<ErroDados | null>(null)
  const [erroDeEnvio, setErroDeEnvio] = useState<ErroDados | null>(null)
  const [enviando, setEnviando] = useState(false)
  const chamadaPendente = useRef<Chamada | null>(null)
  const grupoDeAvisos = useRef<HTMLDivElement>(null)
  const voltouDaConfirmacao = useRef(false)
  const idDosAvisos = useId()

  const emAndamento = registro !== undefined && registro.fim === null && ehTipoDeSessao(registro.tipo)
  const tipo = campos.tipo
  const mostraFim = temCampoDeFim(tipo, { modo, emAndamento, agora: 0 })
  // A mesma regra do link superior da tela; a edição aberta pela URL, sem `state`, volta ao detalhe (R38-10, R38-22).
  const destino = destinoDoFormulario(location.state, registro?.id ?? null).para

  // O foco vai ao primeiro campo com erro (na ordem do DOM) a cada validação que falha.
  useEffect(() => {
    if (tentativas > 0) formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [tentativas])

  // O foco acompanha o passo: ao pedir a confirmação vai ao grupo dos avisos (o botão `Salvar` que o tinha
  // sumiu); ao `Corrigir` volta ao primeiro campo de horário (`Início`/`Horário`).
  useEffect(() => {
    if (passo === 'confirmando') {
      grupoDeAvisos.current?.focus()
    } else if (voltouDaConfirmacao.current) {
      voltouDaConfirmacao.current = false
      formulario.current?.querySelector<HTMLElement>('[data-horario] input')?.focus()
    }
  }, [passo])

  function mudar(parcial: Partial<CamposDoRegistro>) {
    setCampos((anteriores) => ({ ...anteriores, ...parcial }))
  }

  /** As confirmações que não bloqueiam (Offline 8): duração acima do limite e sobreposição (D-36). */
  async function conferir(entrada: EntradaValidada, tipoDaSessao: TipoSessao): Promise<{ avisos: string[]; erro?: ErroDados }> {
    const mensagens: string[] = []
    const inicio = Date.parse(entrada.inicio)
    const fim = entrada.fim === null ? null : Date.parse(entrada.fim)
    const rotulo = minusculo(ROTULO_TIPO[tipoDaSessao])
    if (fim !== null && fim - inicio > LIMITES_DE_DURACAO_MIN[tipoDaSessao] * 60_000) {
      mensagens.push(FORMULARIO.confirmaDuracao(rotulo, formatarDuracao(fim - inicio)))
    }
    const agora = Date.now()
    const ate = fim ?? agora
    const [concluidas, abertas] = await Promise.all([
      dados.sessoesDaJanela(ativo.bebe.id, entrada.inicio, new Date(ate).toISOString(), [tipoDaSessao]),
      dados.emAndamento(ativo.bebe.id),
    ])
    if (!concluidas.ok) return { avisos: mensagens, erro: concluidas.erro }
    if (!abertas.ok) return { avisos: mensagens, erro: abertas.erro }
    // Intervalos fechados no início e abertos no fim; uma sessão em andamento vale até agora.
    const outros = [...concluidas.valor.itens, ...abertas.valor.itens.filter((aberta) => aberta.tipo === tipoDaSessao)]
      .filter((outro) => outro.id !== id)
      .filter((outro, indice, todos) => todos.findIndex((candidato) => candidato.id === outro.id) === indice)
      .filter((outro) => inicio < (outro.fim === null ? agora : Date.parse(outro.fim)) && Date.parse(outro.inicio) < ate)
      .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
    if (outros.length > 0) {
      const [primeiro] = outros
      const de = formatarHora(Date.parse(primeiro.inicio))
      const frase =
        primeiro.fim === null
          ? FORMULARIO.confirmaSobreposicaoEmAndamento(rotulo, de)
          : FORMULARIO.confirmaSobreposicao(rotulo, de, formatarHora(Date.parse(primeiro.fim)))
      mensagens.push(outros.length > 1 ? `${frase} ${FORMULARIO.eMaisN(outros.length - 1)}` : frase)
    }
    return { avisos: mensagens }
  }

  /**
   * A chamada deste envio: com os mesmos valores da anterior (que falhou ou ficou esperando a confirmação), é a
   * mesma chamada e o mesmo id; com valores corrigidos, na criação é outro id (a criação anterior pode ter sido
   * gravada sem a resposta chegar, e o mesmo id devolveria a linha antiga em vez de salvar o que foi corrigido).
   */
  function prepararChamada(entrada: EntradaValidada, tipoDoEnvio: TipoRegistro): Chamada {
    const nova: Chamada = { id, tipo: tipoDoEnvio, bebeId: ativo.bebe.id, entrada }
    const anterior = chamadaPendente.current
    if (modo === 'novo' && anterior !== null) {
      return mesmosValores(anterior, nova) ? anterior : { ...nova, id: uuidV7() }
    }
    return nova
  }

  async function gravar(chamada: Chamada) {
    const { entrada } = chamada
    chamadaPendente.current = chamada
    setEnviando(true)
    setErroDeEnvio(null)
    const resultado =
      modo === 'novo'
        ? await dados.gravarRegistro({
            id: chamada.id,
            bebeId: chamada.bebeId,
            tipo: chamada.tipo,
            inicio: entrada.inicio,
            fim: entrada.fim,
            detalhes: entrada.detalhes,
            nota: entrada.nota,
            origem: 'retroativo',
          })
        : await dados.editarRegistro(chamada.id, { inicio: entrada.inicio, fim: entrada.fim, detalhes: entrada.detalhes, nota: entrada.nota })
    setEnviando(false)
    if (!resultado.ok) {
      setPasso('editando')
      setErroDeEnvio(resultado.erro)
      acoes.aposErro(resultado.erro)
      return
    }
    atualizar()
    const fechar = { chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined } as const
    mostrarConfirmacao({
      texto: CONFIRMACAO.registroSalvo,
      acoes:
        modo === 'novo'
          ? [{ chave: 'desfazer', rotulo: COMUM.desfazer, executar: () => void acoes.excluir(chamada.id) }, fechar]
          : [fechar],
    })
    void navigate(destino, { state: { foco: 'titulo' } })
  }

  async function avancar(forcar: boolean) {
    if (enviando) return
    const { erros: encontrados, entrada } = validarRegistro(campos, { modo, emAndamento, agora: Date.now() })
    if (!entrada) {
      setErros(encontrados)
      setTentativas((anterior) => anterior + 1)
      return
    }
    if (tipo === '') return
    setErros({})
    setErroDeLeitura(null)
    setErroDeEnvio(null)
    const chamada = prepararChamada(entrada, tipo)
    if (!forcar && ehTipoDeSessao(tipo)) {
      setEnviando(true)
      const conferencia = await conferir(entrada, tipo)
      setEnviando(false)
      if (conferencia.erro) {
        // Se a leitura falhar, nada é enviado: o erro aparece acima dos botões e `Tentar de novo` relê.
        chamadaPendente.current = chamada
        setErroDeLeitura(conferencia.erro)
        return
      }
      if (conferencia.avisos.length > 0) {
        chamadaPendente.current = chamada
        setAvisos(conferencia.avisos)
        setPasso('confirmando')
        return
      }
    }
    await gravar(chamada)
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (passo === 'editando') void avancar(false)
  }

  const bloqueado = enviando
  const rotuloDoHorario = tipo !== '' && ehTipoDeSessao(tipo) ? FORMULARIO.inicio : FORMULARIO.horario

  return (
    <form ref={formulario} noValidate onSubmit={aoEnviar} className="flex max-w-leitura flex-col gap-esp-grupo" data-formulario-registro={modo}>
      {modo === 'novo' && tipoInicial === '' ? (
        <Selecao
          rotulo={FORMULARIO.escolhaDoTipo}
          valor={tipo}
          opcoes={TIPOS_REGISTRO.map((valor) => ({ valor, rotulo: ROTULO_TIPO[valor] }))}
          vazio={FORMULARIO.tipoPlaceholder}
          aoMudar={(novo) => mudar({ tipo: novo })}
          erro={erros.tipo}
          bloqueado={bloqueado}
        />
      ) : null}

      {tipo !== '' ? (
        <>
          <CampoHorario
            rotulo={rotuloDoHorario}
            valor={campos.inicio}
            aoMudar={(novo) => mudar({ inicio: novo })}
            erro={erros.inicio}
            somenteLeitura={bloqueado}
          />
          {mostraFim ? (
            <CampoHorario
              rotulo={FORMULARIO.fim}
              valor={campos.fim}
              aoMudar={(novo) => mudar({ fim: novo })}
              erro={erros.fim}
              ajuda={modo === 'novo' ? FORMULARIO.fimOpcional : undefined}
              somenteLeitura={bloqueado}
            />
          ) : null}

          {tipo === 'mamada' ? (
            <Selecao
              rotulo={FORMULARIO.lado}
              valor={campos.lado}
              opcoes={LADOS}
              vazio={FORMULARIO.ladoNenhum}
              aoMudar={(novo) => mudar({ lado: novo })}
              bloqueado={bloqueado}
            />
          ) : null}

          {tipo === 'mamadeira' ? (
            <>
              <Controle rotulo={FORMULARIO.quantidade} erro={erros.ml}>
                {(propriedades) => (
                  <div className="cm-campo-controle">
                    <input
                      {...propriedades}
                      type="text"
                      inputMode="numeric"
                      value={campos.ml}
                      readOnly={bloqueado}
                      className="cm-campo-entrada min-h-12"
                      onChange={(evento) => mudar({ ml: evento.target.value })}
                    />
                  </div>
                )}
              </Controle>
              <Selecao
                rotulo={FORMULARIO.conteudoMamadeira}
                valor={campos.conteudoDaMamadeira}
                opcoes={CONTEUDOS_DA_MAMADEIRA}
                vazio={FORMULARIO.conteudoNenhum}
                aoMudar={(novo) => mudar({ conteudoDaMamadeira: novo })}
                bloqueado={bloqueado}
              />
            </>
          ) : null}

          {tipo === 'fralda' ? (
            <Selecao
              rotulo={FORMULARIO.conteudoFralda}
              valor={campos.conteudoDaFralda}
              opcoes={CONTEUDOS_DA_FRALDA}
              vazio={FORMULARIO.conteudoPlaceholder}
              aoMudar={(novo) => mudar({ conteudoDaFralda: novo })}
              erro={erros.conteudoDaFralda}
              bloqueado={bloqueado}
            />
          ) : null}

          {tipo === 'solido' ? (
            <Controle rotulo={FORMULARIO.alimento} erro={erros.alimento}>
              {(propriedades) => (
                <div className="cm-campo-controle">
                  <input
                    {...propriedades}
                    type="text"
                    value={campos.alimento}
                    readOnly={bloqueado}
                    className="cm-campo-entrada min-h-12"
                    onChange={(evento) => mudar({ alimento: evento.target.value })}
                  />
                </div>
              )}
            </Controle>
          ) : null}

          {tipo === 'observacao' ? (
            <Controle rotulo={FORMULARIO.texto} erro={erros.texto}>
              {(propriedades) => (
                <textarea
                  {...propriedades}
                  rows={4}
                  value={campos.texto}
                  readOnly={bloqueado}
                  className="block min-h-[6rem] w-full resize-y rounded-campo border-[1.5px] border-(--cor-texto-2) bg-(--cor-cartao) px-4 py-3 text-corpo text-(--cor-texto) hover:border-(--cor-texto) focus-visible:border-(--cor-texto)"
                  onChange={(evento) => mudar({ texto: evento.target.value })}
                />
              )}
            </Controle>
          ) : (
            <Controle rotulo={FORMULARIO.nota} erro={erros.nota}>
              {(propriedades) => (
                <textarea
                  {...propriedades}
                  rows={3}
                  value={campos.nota}
                  readOnly={bloqueado}
                  className="block min-h-[6rem] w-full resize-y rounded-campo border-[1.5px] border-(--cor-texto-2) bg-(--cor-cartao) px-4 py-3 text-corpo text-(--cor-texto) hover:border-(--cor-texto) focus-visible:border-(--cor-texto)"
                  onChange={(evento) => mudar({ nota: evento.target.value })}
                />
              )}
            </Controle>
          )}
        </>
      ) : null}

      {erroDeLeitura ? (
        <AvisoDeErro
          erro={erroDeLeitura}
          papel={ativo.papel}
          aoTentarDeNovo={() => {
            setErroDeLeitura(null)
            void avancar(false)
          }}
        />
      ) : null}

      {erroDeEnvio ? (
        <AvisoDeErro
          erro={erroDeEnvio}
          escrita
          papel={ativo.papel}
          aoTentarDeNovo={() => {
            if (chamadaPendente.current) void gravar(chamadaPendente.current)
          }}
        />
      ) : null}

      {passo === 'confirmando' ? (
        <div
          data-h="cartao"
          ref={grupoDeAvisos}
          role="group"
          aria-label={FORMULARIO.confirmarGrupo}
          aria-describedby={avisos.map((_, indice) => `${idDosAvisos}-${indice}`).join(' ') || undefined}
          tabIndex={-1}
          className="flex flex-col gap-3 bg-(--cor-papel-fundo)"
          data-avisos=""
        >
          {avisos.map((aviso, indice) => (
            <p key={aviso} id={`${idDosAvisos}-${indice}`} className="font-medium">
              {aviso}
            </p>
          ))}
          <div className="flex flex-wrap gap-3">
            <Botao
              tamanho="app"
              className={ALVO_APP}
              desativado={enviando}
              onClick={() => {
                if (chamadaPendente.current) void gravar(chamadaPendente.current)
              }}
            >
              {enviando ? COMUM.salvando : FORMULARIO.salvarAssim}
            </Botao>
            <Botao
              variante="contorno"
              tamanho="app"
              className={ALVO_APP}
              onClick={() => {
                voltouDaConfirmacao.current = true
                setPasso('editando')
              }}
            >
              {FORMULARIO.corrigir}
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Botao type="submit" tamanho="app" className={`min-w-[8.5rem] ${ALVO_APP}`} desativado={enviando}>
            {enviando ? COMUM.salvando : FORMULARIO.salvar}
          </Botao>
          <Botao
            variante="texto"
            tamanho="app"
            className={ALVO_APP}
            onClick={() => void navigate(destino, { state: { foco: 'titulo' } })}
          >
            {FORMULARIO.cancelar}
          </Botao>
        </div>
      )}
    </form>
  )
}
