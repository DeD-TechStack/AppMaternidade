import { useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Etiqueta } from '../../componentes/base/Etiqueta.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { useFocoPendente } from '../../componentes/comunidade/foco.ts'
import { Texto } from '../../componentes/comunidade/Itens.tsx'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { AcoesDaDecisao, AcoesDoConteudo, type AcaoFeita } from '../../componentes/moderacao/Acoes.tsx'
import { ErroDeLeituraNoPainel, NaoEncontradoNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { Bloco } from '../../componentes/moderacao/Bloco.tsx'
import { CARTAO, CartaoDoConteudo, CartaoDoPerfil, HistoricoDoPerfilVista } from '../../componentes/moderacao/Conteudo.tsx'
import { usePainel } from '../../componentes/moderacao/contexto.ts'
import { useDadosModeracao } from '../../componentes/moderacao/dados.ts'
import { ETIQUETAS_QUEBRAM } from '../../componentes/moderacao/estilos.ts'
import {
  autorDoConteudo,
  estadoDoConteudo,
  idDoConteudo,
  lerDenunciaComContexto,
  type DenunciaComContexto,
} from '../../componentes/moderacao/leituras.ts'
import { useLeituraMantida } from '../../componentes/moderacao/mantida.ts'
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

  // A última leitura que valeu continua na tela (e a caixa aberta com ela) enquanto a releitura está em curso
  // ou falhou por erro passageiro; o erro aparece com o "Tentar de novo", também dentro da caixa (RF-15).
  const mantida = useLeituraMantida(leitura.estado)
  const lida = mantida?.valor ?? null
  const erroDaLeitura =
    leitura.estado.fase === 'erro' ? (
      <ErroDeLeituraNoPainel erro={leitura.estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} />
    ) : null

  async function aoFeito({ porConferencia, origem }: AcaoFeita) {
    await leitura.reler()
    setStatus(porConferencia ? TX.tx32 : TX.tx14)
    // O botão de origem; o título do item afetado; a confirmação; o `h1`.
    pedirFoco([() => origem, () => document.getElementById(ID_DO_TITULO_DO_ALVO), () => refStatus.current])
  }

  const aoErro = () => void leitura.reler()

  const ocupado = leitura.estado.fase === 'carregando' || undefined
  // O estado da leitura (confirmação, esqueleto, erro, "não encontrado") vai no alto da primeira seção.
  const topo = (
    <>
      <Status mensagem={status} refStatus={refStatus} />
      {leitura.esqueleto && mantida === null ? <Esqueleto linhas={3} /> : null}
      {erroDaLeitura}
      {leitura.estado.fase === 'pronto' && lida === null ? <NaoEncontradoNoPainel /> : null}
    </>
  )

  if (!lida) {
    return (
      <Faixa aria-busy={ocupado}>
        <Pilha vao="grupo">{topo}</Pilha>
      </Faixa>
    )
  }
  return <Corpo lida={lida} aoFeito={aoFeito} aoErro={aoErro} avisoDeLeitura={erroDaLeitura} topo={topo} ocupado={ocupado} />
}

interface CorpoProps {
  lida: DenunciaComContexto
  aoFeito: (feita: AcaoFeita) => Promise<void>
  aoErro: () => void
  /** O erro da releitura, repetido dentro das caixas de ação (a caixa modal deixa a tela atrás dela inerte). */
  avisoDeLeitura: ReactNode
  /** O estado da leitura, no alto da primeira seção. */
  topo: ReactNode
  ocupado?: true
}

function Corpo({ lida, aoFeito, aoErro, avisoDeLeitura, topo, ocupado }: CorpoProps) {
  const painel = usePainel()
  const { denuncia, conteudo, perfil } = lida
  const final = denuncia.estado === 'procedente' || denuncia.estado === 'improcedente'
  const historico = conteudo?.historico ?? perfil?.historico ?? null
  const semOId = conteudo ? idDoConteudo(conteudo.lido) : null

  return (
    <>
      <Bloco id="sec-denuncia" titulo={DENUNCIA.secaoDenuncia} topo={topo} ocupado={ocupado}>
        <Cartao className={CARTAO}>
          <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${ETIQUETAS_QUEBRAM}`}>
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
        </Cartao>
      </Bloco>

      <Bloco id="sec-alvo" titulo={DENUNCIA.secaoAlvo}>
        {conteudo ? (
          <CartaoDoConteudo lido={conteudo.lido} autor={conteudo.autor} comLink idDoTitulo={ID_DO_TITULO_DO_ALVO} />
        ) : null}
        {!conteudo && (denuncia.topicoId !== null || denuncia.respostaId !== null) ? <p>{DENUNCIA.conteudoNaoLido}</p> : null}
        {perfil?.autor ? <CartaoDoPerfil perfil={perfil.autor} /> : null}
        {!conteudo && (perfil === null || perfil.autor === null) && denuncia.topicoId === null && denuncia.respostaId === null ? (
          <p>{TX.tx28}</p>
        ) : null}
      </Bloco>

      {conteudo ? (
        <Bloco id="sec-autor" titulo={DENUNCIA.secaoPerfil}>
          {conteudo.autor ? <CartaoDoPerfil perfil={conteudo.autor} /> : <p>{COMUM_MODERACAO.pessoaRemovida}</p>}
        </Bloco>
      ) : null}

      {conteudo ? (
        <Bloco id="sec-acoes-conteudo" titulo={DENUNCIA.acoesDoConteudo}>
          <AcoesDoConteudo
            alvo={{ tipo: conteudo.lido.tipo, id: idDoConteudo(conteudo.lido) }}
            estadoAtual={estadoDoConteudo(conteudo.lido)}
            autorId={autorDoConteudo(conteudo.lido)}
            denunciaId={denuncia.id}
            aoFeito={aoFeito}
            aoErro={aoErro}
            avisoDeLeitura={avisoDeLeitura}
          />
        </Bloco>
      ) : null}

      <Bloco id="sec-decisao" titulo={DENUNCIA.acoesDaDenuncia}>
        {final ? (
          <p className="font-medium">{denuncia.decididaEm ? DENUNCIA.decididaEm(formatarDataHora(denuncia.decididaEm)) : null}</p>
        ) : (
          <AcoesDaDecisao
            denunciaId={denuncia.id}
            estadoAtual={denuncia.estado}
            aoFeito={aoFeito}
            aoErro={aoErro}
            avisoDeLeitura={avisoDeLeitura}
          />
        )}
      </Bloco>

      {historico ? (
        <Bloco id="sec-historico" titulo={DENUNCIA.secaoHistorico}>
          <HistoricoDoPerfilVista historico={historico} semOId={semOId} contaId={painel.contaId} />
        </Bloco>
      ) : null}
    </>
  )
}

// M2, /moderacao/denuncia/:id: a denúncia, o alvo, o autor e o histórico dele, as ações sobre o conteúdo
// (cada uma com o motivo) e a decisão. Um id que não é UUID é "não encontrado", sem chamar o banco.
export function DenunciaNoPainel() {
  const { id } = useParams()
  return (
    <Painel titulo={NOMES_DAS_TELAS.denuncia}>
      {ehUuid(id) ? (
        <DenunciaLida key={id} id={id} />
      ) : (
        <Faixa>
          <NaoEncontradoNoPainel />
        </Faixa>
      )}
    </Painel>
  )
}
