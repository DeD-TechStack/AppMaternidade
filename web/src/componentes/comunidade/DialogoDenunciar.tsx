import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import {
  COMUM_COMUNIDADE,
  DIALOGO_DENUNCIA,
  ROTULO_MOTIVO,
  TX,
} from '../../conteudo/comunidade.ts'
import type { Resultado } from '../../dados/comum.ts'
import type { AlvoDenuncia } from '../../dados/comunidade.ts'
import { LIMITES, MOTIVOS, conferirLimite, type MotivoDenuncia } from '../../dados/comunidade.regras.ts'
import { useFocoNoResumo } from '../conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { CampoComContador } from './Campos.tsx'
import { LinkDeAjuda, ResumoDeErro } from './Avisos.tsx'
import { useDadosComunidade } from './dados.ts'
import { Dialogo } from './Dialogo.tsx'
import { useEscrita } from './escrita.ts'

interface Props {
  alvo: AlvoDenuncia
  titulo: string
  /** O autor do alvo, quando há: depois do envio a tela oferece bloqueá-lo. */
  autor: { id: string; apelido: string } | null
  origem: RefObject<HTMLElement | null>
  aoFechar: () => void
  /** "Bloquear <apelido>" no fim da denúncia: quem chamou fecha esta caixa e abre a do bloqueio. */
  aoBloquear: (autor: { id: string; apelido: string }) => void
}

const ID_DO_TEXTO = 'denuncia-texto'

// A caixa de "Denunciar" (MAT-40:RF-07): os 8 motivos, o texto opcional de até 500 caracteres, o bloco
// de crise assim que "Risco de autolesão" é marcado e, depois do envio, a confirmação sem prazo.
export function DialogoDenunciar({ alvo, titulo, autor, origem, aoFechar, aoBloquear }: Props) {
  const dados = useDadosComunidade()
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null)
  const [texto, setTexto] = useState('')
  const [enviada, setEnviada] = useState(false)
  const confirmacao = useRef<HTMLParagraphElement>(null)
  const envio = useEscrita<string, string[]>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)

  useEffect(() => {
    if (enviada) confirmacao.current?.focus()
  }, [enviada])

  const casa = (d: { topicoId: string | null; respostaId: string | null; perfilId: string | null; motivo: string; texto: string | null }, enviado: string | null) =>
    d.motivo === motivo &&
    d.texto === enviado &&
    (alvo.tipo === 'topico' ? d.topicoId : alvo.tipo === 'resposta' ? d.respostaId : d.perfilId) === alvo.id

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!motivo) return
    const enviado = texto.trim() === '' ? null : texto
    if (enviado !== null && conferirLimite(enviado, LIMITES.textoDenuncia) !== 'ok') {
      return document.getElementById(ID_DO_TEXTO)?.focus()
    }
    const lerIguais = async (): Promise<Resultado<string[]>> => {
      const lidas = await dados.minhasDenuncias()
      return lidas.ok ? { ok: true, valor: lidas.valor.filter((d) => casa(d, enviado)).map((d) => d.id) } : lidas
    }
    void envio.enviar({
      antes: lerIguais,
      escrever: () => dados.denunciar(motivo, alvo, enviado),
      // Achou = uma denúncia igual que não estava lá antes do primeiro envio.
      conferir: async (antes) => {
        const agora = await lerIguais()
        if (!agora.ok) return agora
        const nova = agora.valor.find((id) => !(antes ?? []).includes(id))
        return { ok: true, valor: nova ? { valor: nova } : null }
      },
      aoSucesso: () => setEnviada(true),
    })
  }

  if (enviada) {
    return (
      <Dialogo titulo={titulo} aoFechar={aoFechar} origem={origem}>
        <div role="status" className="flex flex-col gap-4">
          <p ref={confirmacao} tabIndex={-1} className="alvo-foco">
            {TX.tx09}
          </p>
        </div>
        <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
          {autor ? (
            <button type="button" className={BOTAO_PRINCIPAL} onClick={() => aoBloquear(autor)}>
              {DIALOGO_DENUNCIA.bloquear(autor.apelido)}
            </button>
          ) : null}
          <button type="button" className={`${BOTAO_SECUNDARIO} min-[30rem]:w-full`} onClick={aoFechar}>
            {COMUM_COMUNIDADE.fechar}
          </button>
        </div>
      </Dialogo>
    )
  }

  return (
    <Dialogo titulo={titulo} aoFechar={aoFechar} origem={origem} ocupado={envio.enviando}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {erro ? (
          <ResumoDeErro
            texto={erro.texto}
            rotuloDaAcao={erro.acao === 'conferir' ? COMUM_COMUNIDADE.conferir : erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
            aoAgir={() => void envio.tentarDeNovo()}
            refResumo={resumo}
          />
        ) : null}
        <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
          <legend className="cm-campo-rotulo mb-1 p-0">{DIALOGO_DENUNCIA.motivos}</legend>
          {MOTIVOS.map((opcao) => (
            <label key={opcao} className="alvo-toque flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="motivo-da-denuncia"
                value={opcao}
                checked={motivo === opcao}
                onChange={() => {
                  setMotivo(opcao)
                  envio.limpar()
                }}
                className="size-6 shrink-0 accent-[var(--cor-texto)]"
              />
              <span>{ROTULO_MOTIVO[opcao]}</span>
            </label>
          ))}
        </fieldset>
        {motivo === 'risco_autolesao' ? (
          <div
            data-bloco="crise"
            className="flex flex-col items-start gap-2 rounded-campo border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-cartao)] p-4"
          >
            <p className="font-medium">{TX.tx08}</p>
            <LinkDeAjuda />
          </div>
        ) : null}
        <CampoComContador
          id={ID_DO_TEXTO}
          rotulo={DIALOGO_DENUNCIA.texto}
          valor={texto}
          aoMudar={(valor) => {
            setTexto(valor)
            envio.limpar()
          }}
          limite={LIMITES.textoDenuncia}
          mensagemDoLimite={DIALOGO_DENUNCIA.erroTexto}
          linhas={4}
        />
        <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
          <button type="submit" disabled={!motivo || envio.enviando} className={BOTAO_PRINCIPAL}>
            {envio.enviando ? COMUM_COMUNIDADE.enviando : DIALOGO_DENUNCIA.enviar}
          </button>
          <button
            type="button"
            disabled={envio.enviando}
            data-foco-inicial=""
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
