import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { COMUM_COMUNIDADE, TOPICO, TX } from '../../conteudo/comunidade.ts'
import { LIMITES, conferirLimite } from '../../dados/comunidade.regras.ts'
import { Cartao } from '../base/layout/Cartao.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { useFocoNoResumo } from '../conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { ResumoDeErro, Selo } from './Avisos.tsx'
import { CampoComContador } from './Campos.tsx'
import { useDadosComunidade } from './dados.ts'
import { useEscrita } from './escrita.ts'
import { Meta, Texto } from './Itens.tsx'
import type { RespostaComAutor } from './respostas.ts'

export const ID_DO_CAMPO_DE_RESPOSTA = 'campo-resposta'

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
// banco antes de "Publicar resposta" na prévia, e "Voltar e editar" mantém o texto.
export function FormularioDeResposta({ topicoId, modo, apelidoProprio, aoTirarCitacao, aoConcluir, aoNaoEditavel }: Props) {
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
