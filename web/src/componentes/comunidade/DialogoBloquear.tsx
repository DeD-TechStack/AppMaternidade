import type { RefObject } from 'react'
import { COMUM_COMUNIDADE, DIALOGO_BLOQUEIO, TX } from '../../conteudo/comunidade.ts'
import { useFocoNoResumo } from '../conta/foco.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { ResumoDeErro } from './Avisos.tsx'
import { useDadosComunidade } from './dados.ts'
import { Dialogo } from './Dialogo.tsx'
import { useEscrita } from './escrita.ts'

interface Props {
  autor: { id: string; apelido: string }
  /** A conta é da moderação: o texto diz que ela continua vendo o que a pessoa publica (TX-10b). */
  moderacao: boolean
  origem: RefObject<HTMLElement | null>
  aoFechar: () => void
  /** Roda quando o bloqueio vale; a tela relê o que está aberto e só então a caixa fecha. */
  aoBloqueado: () => Promise<void>
}

// A confirmação de "Bloquear <apelido>" (MAT-40:RF-08). Bloquear exige só perfil próprio, sem aceite. O
// bloqueio repetido (`23505`) conta como sucesso. Não há conferência: repetir dá o mesmo resultado.
export function DialogoBloquear({ autor, moderacao, origem, aoFechar, aoBloqueado }: Props) {
  const dados = useDadosComunidade()
  const envio = useEscrita<null, undefined>()
  const erro = envio.estado.fase === 'erro' ? envio.estado : null
  const resumo = useFocoNoResumo(erro)

  function confirmar() {
    void envio.enviar({
      escrever: async () => {
        const feita = await dados.bloquear(autor.id)
        return !feita.ok && feita.erro.codigo === '23505' ? { ok: true, valor: null } : feita
      },
      aoSucesso: () => aoBloqueado(),
    })
  }

  return (
    <Dialogo titulo={DIALOGO_BLOQUEIO.titulo(autor.apelido)} aoFechar={aoFechar} origem={origem} ocupado={envio.enviando}>
      <p>{TX.tx10}</p>
      {moderacao ? <p>{TX.tx10b}</p> : null}
      {erro ? (
        <ResumoDeErro
          texto={erro.texto}
          rotuloDaAcao={erro.acao ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
          aoAgir={() => void envio.tentarDeNovo()}
          refResumo={resumo}
        />
      ) : null}
      <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
        <button type="button" disabled={envio.enviando} className={BOTAO_PRINCIPAL} onClick={confirmar}>
          {envio.enviando ? COMUM_COMUNIDADE.enviando : DIALOGO_BLOQUEIO.confirmar}
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
    </Dialogo>
  )
}
