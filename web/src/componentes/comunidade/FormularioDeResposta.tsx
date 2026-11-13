import { useId, useState, type FormEvent } from 'react'
import { COMUM_COMUNIDADE, TOPICO, TX } from '../../conteudo/comunidade.ts'
import { LIMITES, conferirLimite } from '../../dados/comunidade.regras.ts'
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

  function aoEnviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (valido) setPrevia(true)
  }

  const botaoDoErro =
    erro?.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro?.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined

  if (previa) {
    return (
      <div className="flex max-w-[44rem] flex-col gap-4" data-previa="resposta">
        <h3 className="cm-h4">{TOPICO.previa}</h3>
        <p>{TX.tx05b}</p>
        <article className="flex flex-col gap-3 rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-5">
          <Selo />
          <Meta apelido={apelidoProprio} />
          {citando ? <Citacao resposta={citando} /> : null}
          <Texto>{texto}</Texto>
        </article>
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
              setPrevia(false)
            }}
          >
            {TOPICO.voltarEEditar}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={aoEnviarFormulario} noValidate className="flex max-w-[40rem] flex-col gap-4">
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
        <button type="submit" disabled={!valido} aria-describedby={valido ? undefined : dicaId} className={BOTAO_PRINCIPAL}>
          {TOPICO.verPrevia}
        </button>
        {valido ? null : (
          <p id={dicaId} className="cm-pequeno mt-2 text-[var(--cor-texto-2)]">
            {TOPICO.dicaPrevia}
          </p>
        )}
      </div>
    </form>
  )
}
