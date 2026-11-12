import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { COMUM_MODERACAO } from '../../conteudo/moderacao.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { conferirLimite } from '../../dados/comunidade.regras.ts'
import { LIMITE_DO_MOTIVO } from '../../dados/moderacao.regras.ts'
import { ResumoDeErro } from '../comunidade/Avisos.tsx'
import { CampoComContador } from '../comunidade/Campos.tsx'
import { Dialogo } from '../comunidade/Dialogo.tsx'
import { useFocoNoResumo } from '../conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { usePainel } from './contexto.ts'
import { useEscritaModeracao } from './escrita.ts'

const ID_DO_MOTIVO = 'motivo-da-acao'

interface Props {
  titulo: string
  /** O rótulo do botão que envia ("Ocultar", "Revogar papel"). */
  confirmar: string
  origem: RefObject<HTMLElement | null>
  aoFechar: () => void
  /** A escrita (uma função do banco): recebe o motivo digitado. */
  enviar: (motivo: string) => Promise<Resultado<unknown>>
  /** A conferência de um envio incerto: `true` quando o banco já está como a ação o deixaria. */
  conferir: () => Promise<Resultado<boolean>>
  /** Depois de a ação valer (`porConferencia`: quem agiu pode ter sido outra pessoa, TX-32). */
  aoConcluir: (porConferencia: boolean) => void | Promise<void>
  /** O banco recusou a ação: a tela relê o que está aberto. */
  aoErro?: (erro: ErroDados) => void
  /** Um aviso fixo acima do campo (por exemplo, o TX-15 da revogação). */
  children?: ReactNode
}

// A confirmação de uma ação do painel (`<dialog>`): o motivo de 1 a 300 caracteres, com contador, e o envio.
// O resultado incerto (`rede`) confere antes de repetir (MAT-40:RF-19). Um segundo clique não chama o banco.
export function DialogoDeMotivo({ titulo, confirmar, origem, aoFechar, enviar, conferir, aoConcluir, aoErro, children }: Props) {
  const painel = usePainel()
  const [motivo, setMotivo] = useState('')
  const [tentou, setTentou] = useState(false)
  const envio = useEscritaModeracao<unknown>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)
  const campo = useRef<HTMLDivElement>(null)

  function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (envio.enviando) return
    if (conferirLimite(motivo, LIMITE_DO_MOTIVO) !== 'ok') {
      setTentou(true)
      return campo.current?.querySelector<HTMLElement>('textarea, input')?.focus()
    }
    void envio.enviar({
      escrever: () => enviar(motivo),
      conferir: async () => {
        const conferida = await conferir()
        if (!conferida.ok) return conferida
        return { ok: true, valor: conferida.valor ? { valor: null } : null }
      },
      aoSucesso: (_valor, porConferencia) => aoConcluir(porConferencia),
      aoErro: (falha) => {
        painel.aoErroDeAcao(falha)
        aoErro?.(falha)
      },
    })
  }

  return (
    <Dialogo titulo={titulo} aoFechar={aoFechar} origem={origem} ocupado={envio.enviando}>
      <form onSubmit={submeter} noValidate className="flex flex-col gap-5">
        {children}
        {erro ? (
          <ResumoDeErro
            texto={erro.texto}
            rotuloDaAcao={erro.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
            aoAgir={() => void envio.tentarDeNovo()}
            refResumo={resumo}
          />
        ) : null}
        <div ref={campo}>
          <CampoComContador
            id={ID_DO_MOTIVO}
            rotulo={COMUM_MODERACAO.campoMotivo}
            valor={motivo}
            aoMudar={(valor) => {
              setMotivo(valor)
              envio.limpar()
            }}
            limite={LIMITE_DO_MOTIVO}
            mensagemDoLimite={COMUM_MODERACAO.erroMotivo}
            linhas={3}
            tentou={tentou}
          />
        </div>
        <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
          <button type="submit" disabled={envio.enviando} className={BOTAO_PRINCIPAL}>
            {envio.enviando ? COMUM_COMUNIDADE.enviando : confirmar}
          </button>
          <button
            type="button"
            disabled={envio.enviando}
            className={`${BOTAO_SECUNDARIO} min-[30rem]:w-full`}
            onClick={aoFechar}
          >
            {COMUM_COMUNIDADE.cancelar}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
