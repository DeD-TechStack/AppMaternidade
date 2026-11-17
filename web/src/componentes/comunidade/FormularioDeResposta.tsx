import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { COMUM_COMUNIDADE, RESUMO_NA_COMUNIDADE, TOPICO, TX } from '../../conteudo/comunidade.ts'
import { LIMITES, conferirLimite } from '../../dados/comunidade.regras.ts'
import { Cartao } from '../base/layout/Cartao.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { useFocoNoResumo } from '../conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { PainelDoResumo, anexarBloco } from '../resumo-rotina/index.ts'
import { ResumoDeErro, Selo } from './Avisos.tsx'
import { CampoComContador } from './Campos.tsx'
import { useDadosComunidade } from './dados.ts'
import { useEscrita } from './escrita.ts'
import { Meta, Texto } from './Itens.tsx'
import type { RespostaComAutor } from './respostas.ts'

export const ID_DO_CAMPO_DE_RESPOSTA = 'campo-resposta'
// O `.cm-botao` é `nowrap`: a 390 px com 200 % de fonte o rótulo passava da tela. Estas classes o deixam quebrar; em texto (F10), para "Ver prévia" ser o único primário.
const BOTAO_DO_RESUMO = 'cm-botao cm-botao-texto alvo-toque h-auto max-w-full text-start whitespace-normal wrap-anywhere'

export type ModoDaResposta =
  | { tipo: 'nova'; citando: RespostaComAutor | null }
  | { tipo: 'editar'; resposta: RespostaComAutor }

interface Props {
  topicoId: string
  modo: ModoDaResposta
  /** O apelido da própria pessoa, que a prévia mostra como autor. */
  apelidoProprio: string
  aoTirarCitacao: () => void
  /** A resposta valeu (publicada ou salva): a tela relê a lista e leva o foco. */
  aoConcluir: (id: string, tipo: ModoDaResposta['tipo']) => Promise<void>
  /** O banco não achou a linha para editar: a tela relê a lista. */
  aoNaoEditavel: () => void
  /** O aviso de status da página (RF12:RF-11). */
  aoAvisar?: (mensagem: string) => void
}

/** A citação: o apelido de quem foi citado e o começo da resposta dele. */
function Citacao({ resposta }: { resposta: RespostaComAutor }) {
  return (
    <blockquote className="m-0 flex max-w-[44rem] flex-col gap-1 border-l-[3px] border-[var(--cor-fio-suave)] pl-4">
      <p className="cm-pequeno font-medium wrap-anywhere">
        {TOPICO.emRespostaA(resposta.autor?.apelido ?? COMUM_COMUNIDADE.pessoaRemovida)}
      </p>
      <p className="cm-pequeno text-[var(--cor-texto-2)] wrap-anywhere">{TOPICO.citacaoDe(resposta.corpo.slice(0, 120))}</p>
    </blockquote>
  )
}

// O formulário de resposta no fim da C3 (MAT-40:RF-05): o corpo de 1 a 2000 caracteres com contador, a
// prévia exata com confirmação e, para quem cita, a citação marcada com "Tirar citação". Nada vai ao
// banco antes de "Publicar resposta" na prévia, e "Voltar e editar" mantém o texto. Na resposta nova (não na
// edição), o botão "Incluir resumo da rotina" abre o painel do resumo (RF12): este formulário é dono do botão, do
// estado aberto, da marca "houve inserção" e do foco; do painel só recebe o texto do bloco.
export function FormularioDeResposta({ topicoId, modo, apelidoProprio, aoTirarCitacao, aoConcluir, aoNaoEditavel, aoAvisar }: Props) {
  const dados = useDadosComunidade()
  const editando = modo.tipo === 'editar'
  const [texto, setTexto] = useState(editando ? modo.resposta.corpo : '')
  const [previa, setPrevia] = useState(false)
  const envio = useEscrita<string, string[]>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)
  const valido = conferirLimite(texto, LIMITES.resposta) === 'ok'
  const dicaId = useId()
  const citando = modo.tipo === 'nova' ? modo.citando : null

  // O resumo da rotina (RF12): o painel, a marca de que houve inserção (zera ao publicar) e o foco.
  const comResumo = modo.tipo === 'nova'
  const [painelAberto, setPainelAberto] = useState(false)
  const [houveResumo, setHouveResumo] = useState(false)
  const botaoDoResumo = useRef<HTMLButtonElement>(null)
  const focoNoCampo = useRef(false)
  const idDoPainel = useId()
  const idDoTituloDoPainel = useId()

  function abrirOuFocarPainel() {
    if (painelAberto) document.getElementById(idDoTituloDoPainel)?.focus()
    else setPainelAberto(true)
  }

  function fecharPainel() {
    setPainelAberto(false)
    botaoDoResumo.current?.focus()
  }

  function inserirResumo(bloco: string) {
    setTexto((atual) => anexarBloco(atual, bloco))
    setHouveResumo(true)
    setPainelAberto(false)
    focoNoCampo.current = true
    aoAvisar?.(RESUMO_NA_COMUNIDADE.inserido)
  }

  // Depois da inserção o foco vai ao campo da resposta, com o cursor no fim do texto.
  useLayoutEffect(() => {
    if (!focoNoCampo.current) return
    focoNoCampo.current = false
    const campo = document.getElementById(ID_DO_CAMPO_DE_RESPOSTA) as HTMLTextAreaElement | null
    campo?.focus()
    campo?.setSelectionRange(campo.value.length, campo.value.length)
  })

  function publicar() {
    if (!valido) return
    if (modo.tipo === 'editar') {
      const { id } = modo.resposta
      void envio.enviar({
        escrever: async () => {
          const feita = await dados.editarResposta(id, texto)
          if (!feita.ok && feita.erro.chave === 'nao_editavel') aoNaoEditavel()
          return feita
        },
        aoSucesso: async (editada) => {
          await aoConcluir(editada, 'editar')
        },
      })
      return
    }
    const respostaA = modo.citando?.id ?? null
    const parecidas = async () => {
      const lidas = await dados.conferirRespostas(topicoId, respostaA, texto)
      return lidas
    }
    void envio.enviar({
      antes: parecidas,
      escrever: () => dados.responder(topicoId, respostaA, texto),
      // Achou = uma resposta igual que não estava lá antes do primeiro envio (a mais nova, se houver duas).
      conferir: async (antes) => {
        const agora = await parecidas()
        if (!agora.ok) return agora
        const nova = agora.valor.find((id) => !(antes ?? []).includes(id))
        return { ok: true, valor: nova ? { valor: nova } : null }
      },
      aoSucesso: async (nova) => {
        setTexto('')
        setPrevia(false)
        setHouveResumo(false)
        await aoConcluir(nova, 'nova')
      },
    })
  }

  // A11Y-F4: o passo que some leva o foco com ele; o foco vai ao título da prévia, ou ao campo na volta.
  const tituloDaPrevia = useRef<HTMLHeadingElement>(null)
  const trocouDePasso = useRef(false)
  useEffect(() => {
    if (!trocouDePasso.current) return
    trocouDePasso.current = false
    if (previa) tituloDaPrevia.current?.focus()
    else document.getElementById(ID_DO_CAMPO_DE_RESPOSTA)?.focus()
  }, [previa])

  function aoEnviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!valido) return
    setPainelAberto(false)
    trocouDePasso.current = true
    setPrevia(true)
  }

  const botaoDoErro =
    erro?.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro?.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined

  if (previa) {
    return (
      <Pilha vao="grupo" className="max-w-[44rem]" data-previa="resposta">
        <Pilha vao="pilha">
          <h3 ref={tituloDaPrevia} tabIndex={-1} className="cm-h4 text-titulo-4">
            {TOPICO.previa}
          </h3>
          <p>{TX.tx05b}</p>
          {houveResumo ? <p>{RESUMO_NA_COMUNIDADE.avisoNaPrevia}</p> : null}
        </Pilha>
        <Cartao as="article" className="flex flex-col gap-3 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]">
          <Selo />
          <Meta apelido={apelidoProprio} />
          {citando ? <Citacao resposta={citando} /> : null}
          <Texto>{texto}</Texto>
        </Cartao>
        {erro ? <ResumoDeErro texto={erro.texto} rotuloDaAcao={botaoDoErro} aoAgir={() => void envio.tentarDeNovo()} refResumo={resumo} /> : null}
        <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse min-[30rem]:justify-end">
          <button type="button" disabled={envio.enviando} className={BOTAO_PRINCIPAL} onClick={publicar}>
            {envio.enviando ? COMUM_COMUNIDADE.enviando : editando ? TOPICO.salvar : TOPICO.publicarResposta}
          </button>
          <button
            type="button"
            disabled={envio.enviando}
            className={BOTAO_SECUNDARIO}
            onClick={() => {
              envio.limpar()
              trocouDePasso.current = true
              setPrevia(false)
            }}
          >
            {TOPICO.voltarEEditar}
          </button>
        </div>
      </Pilha>
    )
  }

  return (
    <form onSubmit={aoEnviarFormulario} noValidate className="flex max-w-[40rem] flex-col gap-esp-pilha">
      {citando ? (
        <div className="flex flex-col items-start gap-2">
          <Citacao resposta={citando} />
          <button type="button" className={BOTAO_SECUNDARIO} data-tamanho="app" onClick={aoTirarCitacao}>
            {TOPICO.tirarCitacao}
          </button>
        </div>
      ) : null}
      <Pilha vao="grupo">
        <CampoComContador
          id={ID_DO_CAMPO_DE_RESPOSTA}
          rotulo={TOPICO.campoResposta}
          valor={texto}
          aoMudar={(valor) => {
            setTexto(valor)
            envio.limpar()
          }}
          limite={LIMITES.resposta}
          mensagemDoLimite={TOPICO.erroLimiteResposta}
          linhas={5}
        />
        {comResumo ? (
          <>
            <div>
              <button
                ref={botaoDoResumo}
                type="button"
                className={BOTAO_DO_RESUMO}
                aria-expanded={painelAberto}
                aria-controls={painelAberto ? idDoPainel : undefined}
                onClick={abrirOuFocarPainel}
              >
                {RESUMO_NA_COMUNIDADE.botao}
              </button>
            </div>
            {painelAberto ? (
              <PainelDoResumo id={idDoPainel} idDoTitulo={idDoTituloDoPainel} nivelDoTitulo={3} aoInserir={inserirResumo} aoFechar={fecharPainel} />
            ) : null}
          </>
        ) : null}
      </Pilha>
      <div>
        {/* `aria-disabled` em vez de `disabled`: o Tab chega ao botão e a dica ligada a ele é lida (A11Y-005). */}
        <button
          type="submit"
          aria-disabled={valido ? undefined : 'true'}
          aria-describedby={valido ? undefined : dicaId}
          className={BOTAO_PRINCIPAL}
          onClick={(evento) => {
            if (!valido) evento.preventDefault()
          }}
        >
          {TOPICO.verPrevia}
        </button>
        {valido ? null : (
          <p id={dicaId} className="cm-pequeno pt-2 text-[var(--cor-texto-2)]">
            {TOPICO.dicaPrevia}
          </p>
        )}
      </div>
    </form>
  )
}
