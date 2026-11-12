import { useRef, useState } from 'react'
import { ACAO_NO_CONTEUDO, DECISAO, TEXTOS_ERRO_MODERACAO } from '../../conteudo/moderacao.ts'
import type { EstadoDenuncia, EstadoModeracao } from '../../dados/comunidade.regras.ts'
import type { AlvoModeravel } from '../../dados/moderacao.ts'
import { DECISOES } from '../../dados/moderacao.regras.ts'
import { BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { usePainel } from './contexto.ts'
import { useDadosModeracao } from './dados.ts'
import { DialogoDeMotivo } from './DialogoDeMotivo.tsx'

/** O que a tela faz depois de uma ação que valeu: reler, mostrar a confirmação e levar o foco. */
export interface AcaoFeita {
  porConferencia: boolean
  /** O botão que abriu a caixa (pode ter sumido com a mudança de estado). */
  origem: HTMLElement | null
}

const ESTADOS_DA_ACAO: readonly EstadoModeracao[] = ['oculto', 'removido', 'visivel']

interface ConteudoProps {
  alvo: AlvoModeravel
  estadoAtual: EstadoModeracao
  /** O perfil autor do conteúdo; igual ao perfil próprio é conflito de interesse. */
  autorId: string | null
  /** A denúncia ligada à ação (M2); `null` na M3. */
  denunciaId: string | null
  aoFeito: (feita: AcaoFeita) => Promise<void>
  /** O banco recusou: a tela relê a denúncia e o conteúdo. */
  aoErro: () => void
}

// As ações da moderação sobre um conteúdo (M2 e M3): só aparecem as que mudam o estado atual. No lugar
// delas, o conflito de interesse mostra a frase do catálogo (o conteúdo é do próprio perfil).
export function AcoesDoConteudo({ alvo, estadoAtual, autorId, denunciaId, aoFeito, aoErro }: ConteudoProps) {
  const painel = usePainel()
  const dados = useDadosModeracao()
  const [aberta, setAberta] = useState<EstadoModeracao | null>(null)
  const origem = useRef<HTMLElement | null>(null)

  const doProprio = autorId !== null && autorId === painel.perfilId()
  if (doProprio) return <p className="max-w-[40rem] font-medium">{TEXTOS_ERRO_MODERACAO.conflito_de_interesse}</p>

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {ESTADOS_DA_ACAO.filter((estado) => estado !== estadoAtual).map((estado) => (
          <button
            key={estado}
            id={`acao-${estado}`}
            type="button"
            className={BOTAO_SECUNDARIO}
            data-tamanho="app"
            onClick={(evento) => {
              origem.current = evento.currentTarget
              setAberta(estado)
            }}
          >
            {ACAO_NO_CONTEUDO[estado].botao}
          </button>
        ))}
      </div>
      {aberta ? (
        <DialogoDeMotivo
          key={aberta}
          titulo={ACAO_NO_CONTEUDO[aberta].titulo}
          confirmar={ACAO_NO_CONTEUDO[aberta].confirmar}
          origem={origem}
          aoFechar={() => setAberta(null)}
          enviar={(motivo) => dados.moderarConteudo(alvo, aberta, motivo, denunciaId)}
          conferir={async () => {
            const lido = await dados.lerConteudo(alvo.tipo, alvo.id)
            if (!lido.ok) return lido
            const atual = lido.valor === null ? null : lido.valor.tipo === 'topico' ? lido.valor.topico.estado : lido.valor.resposta.estado
            return { ok: true, valor: atual === aberta }
          }}
          aoErro={aoErro}
          aoConcluir={async (porConferencia) => {
            const botao = origem.current
            setAberta(null)
            await aoFeito({ porConferencia, origem: botao })
          }}
        />
      ) : null}
    </>
  )
}

interface DecisaoProps {
  denunciaId: string
  estadoAtual: EstadoDenuncia
  aoFeito: (feita: AcaoFeita) => Promise<void>
  aoErro: () => void
}

type DecisaoDaTela = (typeof DECISOES)[number]

// A decisão sobre a denúncia (só na M2): "Em análise" só com a denúncia aberta; as decisões finais ficam
// até a denúncia ser decidida.
export function AcoesDaDecisao({ denunciaId, estadoAtual, aoFeito, aoErro }: DecisaoProps) {
  const dados = useDadosModeracao()
  const [aberta, setAberta] = useState<DecisaoDaTela | null>(null)
  const origem = useRef<HTMLElement | null>(null)
  const oferecidas = DECISOES.filter((decisao) => (decisao === 'em_analise' ? estadoAtual === 'aberta' : true))

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {oferecidas.map((decisao) => (
          <button
            key={decisao}
            id={`decisao-${decisao}`}
            type="button"
            className={BOTAO_SECUNDARIO}
            data-tamanho="app"
            onClick={(evento) => {
              origem.current = evento.currentTarget
              setAberta(decisao)
            }}
          >
            {DECISAO[decisao].botao}
          </button>
        ))}
      </div>
      {aberta ? (
        <DialogoDeMotivo
          key={aberta}
          titulo={DECISAO[aberta].titulo}
          confirmar={DECISAO[aberta].confirmar}
          origem={origem}
          aoFechar={() => setAberta(null)}
          enviar={(motivo) => dados.decidirDenuncia(denunciaId, aberta, motivo)}
          conferir={async () => {
            const lida = await dados.lerDenuncia(denunciaId)
            if (!lida.ok) return lida
            return { ok: true, valor: lida.valor?.estado === aberta }
          }}
          aoErro={aoErro}
          aoConcluir={async (porConferencia) => {
            const botao = origem.current
            setAberta(null)
            await aoFeito({ porConferencia, origem: botao })
          }}
        />
      ) : null}
    </>
  )
}
