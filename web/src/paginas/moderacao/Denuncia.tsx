import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Etiqueta } from '../../componentes/base/Etiqueta.tsx'
import { Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { useFocoPendente } from '../../componentes/comunidade/foco.ts'
import { Texto } from '../../componentes/comunidade/Itens.tsx'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { AcoesDaDecisao, AcoesDoConteudo, type AcaoFeita } from '../../componentes/moderacao/Acoes.tsx'
import { ErroDeLeituraNoPainel, NaoEncontradoNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { CARTAO, CartaoDoConteudo, CartaoDoPerfil, HistoricoDoPerfilVista } from '../../componentes/moderacao/Conteudo.tsx'
import { usePainel } from '../../componentes/moderacao/contexto.ts'
import { useDadosModeracao } from '../../componentes/moderacao/dados.ts'
import {
  autorDoConteudo,
  estadoDoConteudo,
  idDoConteudo,
  lerDenunciaComContexto,
  type DenunciaComContexto,
} from '../../componentes/moderacao/leituras.ts'
import { Painel } from '../../componentes/moderacao/Painel.tsx'
import { ROTULO_ESTADO_DENUNCIA, ROTULO_MOTIVO } from '../../conteudo/comunidade.ts'
import { COMUM_MODERACAO, DENUNCIA, FILA, NOMES_DAS_TELAS, TX } from '../../conteudo/moderacao.ts'
import { formatarDataHora } from '../../dados/comunidade.ts'
import { ehUuid } from '../../dados/comunidade.regras.ts'
import { prioridadeDoMotivo } from '../../dados/moderacao.regras.ts'

const ID_DO_TITULO_DO_ALVO = 'alvo-titulo'

function DenunciaLida({ id }: { id: string }) {
  const painel = usePainel()
  const dados = useDadosModeracao()
  const comunidade = useDadosComunidade()
  const leitura = useLeitura(
    () =>
      painel.ler<DenunciaComContexto | null>(
        () => lerDenunciaComContexto(dados, comunidade, id),
        (lida) => lida === null,
      ),
    id,
  )
  const [status, setStatus] = useState<string | null>(null)
  const refStatus = useRef<HTMLDivElement>(null)
  const pedirFoco = useFocoPendente()

  const lida = leitura.estado.fase === 'pronto' ? leitura.estado.valor : null

  async function aoFeito({ porConferencia, origem }: AcaoFeita) {
    await leitura.reler()
    setStatus(porConferencia ? TX.tx32 : TX.tx14)
    // O botão de origem; o título do item afetado; a confirmação; o `h1`.
    pedirFoco([() => origem, () => document.getElementById(ID_DO_TITULO_DO_ALVO), () => refStatus.current])
  }

  const aoErro = () => void leitura.reler()

  return (
    <div className="flex flex-col gap-8" aria-busy={leitura.estado.fase === 'carregando' || undefined}>
      <Status mensagem={status} refStatus={refStatus} />
      {leitura.esqueleto ? <Esqueleto linhas={3} /> : null}
      {leitura.estado.fase === 'erro' ? (
        <ErroDeLeituraNoPainel erro={leitura.estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} />
      ) : null}
      {leitura.estado.fase === 'pronto' && lida === null ? <NaoEncontradoNoPainel /> : null}
      {lida ? <Corpo lida={lida} aoFeito={aoFeito} aoErro={aoErro} /> : null}
    </div>
  )
}

interface CorpoProps {
  lida: DenunciaComContexto
  aoFeito: (feita: AcaoFeita) => Promise<void>
  aoErro: () => void
}

function Corpo({ lida, aoFeito, aoErro }: CorpoProps) {
  const painel = usePainel()
  const { denuncia, conteudo, perfil } = lida
  const final = denuncia.estado === 'procedente' || denuncia.estado === 'improcedente'
  const historico = conteudo?.historico ?? perfil?.historico ?? null
  const semOId = conteudo ? idDoConteudo(conteudo.lido) : null

  return (
    <>
      <section aria-labelledby="sec-denuncia" className="flex flex-col gap-3">
        <h2 id="sec-denuncia" className="cm-h4">
          {DENUNCIA.secaoDenuncia}
        </h2>
        <div className={CARTAO}>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Etiqueta>{FILA.prioridade(prioridadeDoMotivo(denuncia.motivo))}</Etiqueta>
            <span className="font-semibold">{ROTULO_MOTIVO[denuncia.motivo]}</span>
            <Etiqueta>{ROTULO_ESTADO_DENUNCIA[denuncia.estado]}</Etiqueta>
          </p>
          {denuncia.texto && denuncia.texto.trim() !== '' ? <Texto>{denuncia.texto}</Texto> : <p>{DENUNCIA.semTexto}</p>}
          <p className="cm-pequeno flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--cor-texto-2)]">
            <time dateTime={denuncia.criadaEm} className="tabular">
              {DENUNCIA.enviadaEm(formatarDataHora(denuncia.criadaEm))}
            </time>
          </p>
        </div>
      </section>

      <section aria-labelledby="sec-alvo" className="flex flex-col gap-3">
        <h2 id="sec-alvo" className="cm-h4">
          {DENUNCIA.secaoAlvo}
        </h2>
        {conteudo ? (
          <CartaoDoConteudo lido={conteudo.lido} autor={conteudo.autor} comLink idDoTitulo={ID_DO_TITULO_DO_ALVO} />
        ) : null}
        {!conteudo && (denuncia.topicoId !== null || denuncia.respostaId !== null) ? <p>{DENUNCIA.conteudoNaoLido}</p> : null}
        {perfil?.autor ? <CartaoDoPerfil perfil={perfil.autor} /> : null}
        {!conteudo && (perfil === null || perfil.autor === null) && denuncia.topicoId === null && denuncia.respostaId === null ? (
          <p>{TX.tx28}</p>
        ) : null}
      </section>

      {conteudo ? (
        <section aria-labelledby="sec-autor" className="flex flex-col gap-3">
          <h2 id="sec-autor" className="cm-h4">
            {DENUNCIA.secaoPerfil}
          </h2>
          {conteudo.autor ? <CartaoDoPerfil perfil={conteudo.autor} /> : <p>{COMUM_MODERACAO.pessoaRemovida}</p>}
        </section>
      ) : null}

      {conteudo ? (
        <section aria-labelledby="sec-acoes-conteudo" className="flex flex-col gap-3">
          <h2 id="sec-acoes-conteudo" className="cm-h4">
            {DENUNCIA.acoesDoConteudo}
          </h2>
          <AcoesDoConteudo
            alvo={{ tipo: conteudo.lido.tipo, id: idDoConteudo(conteudo.lido) }}
            estadoAtual={estadoDoConteudo(conteudo.lido)}
            autorId={autorDoConteudo(conteudo.lido)}
            denunciaId={denuncia.id}
            aoFeito={aoFeito}
            aoErro={aoErro}
          />
        </section>
      ) : null}

      <section aria-labelledby="sec-decisao" className="flex flex-col gap-3">
        <h2 id="sec-decisao" className="cm-h4">
          {DENUNCIA.acoesDaDenuncia}
        </h2>
        {final ? (
          <p className="font-medium">{denuncia.decididaEm ? DENUNCIA.decididaEm(formatarDataHora(denuncia.decididaEm)) : null}</p>
        ) : (
          <AcoesDaDecisao denunciaId={denuncia.id} estadoAtual={denuncia.estado} aoFeito={aoFeito} aoErro={aoErro} />
        )}
      </section>

      {historico ? (
        <section aria-labelledby="sec-historico" className="flex flex-col gap-3">
          <h2 id="sec-historico" className="cm-h4">
            {DENUNCIA.secaoHistorico}
          </h2>
          <HistoricoDoPerfilVista historico={historico} semOId={semOId} contaId={painel.contaId} />
        </section>
      ) : null}
    </>
  )
}

// M2, /moderacao/denuncia/:id: a denúncia, o alvo, o autor e o histórico dele, as ações sobre o conteúdo
// (cada uma com o motivo) e a decisão. Um id que não é UUID é "não encontrado", sem chamar o banco.
export function DenunciaNoPainel() {
  const { id } = useParams()
  return (
    <Painel titulo={NOMES_DAS_TELAS.denuncia}>{ehUuid(id) ? <DenunciaLida key={id} id={id} /> : <NaoEncontradoNoPainel />}</Painel>
  )
}
