import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { useFocoPendente } from '../../componentes/comunidade/foco.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { AcoesDoConteudo, type AcaoFeita } from '../../componentes/moderacao/Acoes.tsx'
import { ErroDeLeituraNoPainel, NaoEncontradoNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { CartaoDoConteudo, CartaoDoPerfil, HistoricoDoPerfilVista } from '../../componentes/moderacao/Conteudo.tsx'
import { usePainel } from '../../componentes/moderacao/contexto.ts'
import { useDadosModeracao } from '../../componentes/moderacao/dados.ts'
import {
  autorDoConteudo,
  estadoDoConteudo,
  idDoConteudo,
  lerConteudoComContexto,
  type ConteudoComContexto,
} from '../../componentes/moderacao/leituras.ts'
import { Painel } from '../../componentes/moderacao/Painel.tsx'
import { COMUM_MODERACAO, CONTEUDO, DENUNCIA, NOMES_DAS_TELAS, TX } from '../../conteudo/moderacao.ts'
import { ehUuid } from '../../dados/comunidade.regras.ts'
import type { TipoDeConteudo } from '../../dados/moderacao.ts'

const ID_DO_TITULO = 'conteudo-titulo'

const ehTipo = (valor: string | undefined): valor is TipoDeConteudo => valor === 'topico' || valor === 'resposta'

function ConteudoLido({ tipo, id }: { tipo: TipoDeConteudo; id: string }) {
  const painel = usePainel()
  const dados = useDadosModeracao()
  const comunidade = useDadosComunidade()
  const leitura = useLeitura(
    () =>
      painel.ler<ConteudoComContexto | null>(
        () => lerConteudoComContexto(dados, comunidade, tipo, id),
        (lido) => lido === null,
      ),
    `${tipo}-${id}`,
  )
  const [status, setStatus] = useState<string | null>(null)
  const refStatus = useRef<HTMLDivElement>(null)
  const pedirFoco = useFocoPendente()

  const lido = leitura.estado.fase === 'pronto' ? leitura.estado.valor : null

  async function aoFeito({ porConferencia, origem }: AcaoFeita) {
    await leitura.reler()
    setStatus(porConferencia ? TX.tx32 : TX.tx14)
    // O botão de origem; o título do item afetado; a confirmação; o `h1`.
    pedirFoco([() => origem, () => document.getElementById(ID_DO_TITULO), () => refStatus.current])
  }

  return (
    <div className="flex flex-col gap-8" aria-busy={leitura.estado.fase === 'carregando' || undefined}>
      <Status mensagem={status} refStatus={refStatus} />
      {leitura.esqueleto ? <Esqueleto linhas={3} /> : null}
      {leitura.estado.fase === 'erro' ? (
        <ErroDeLeituraNoPainel erro={leitura.estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} />
      ) : null}
      {leitura.estado.fase === 'pronto' && lido === null ? <NaoEncontradoNoPainel /> : null}
      {lido ? (
        <>
          <section aria-labelledby="sec-conteudo" className="flex flex-col gap-3">
            <h2 id="sec-conteudo" className="cm-h4">
              {lido.lido.tipo === 'topico' ? CONTEUDO.tituloDoTopico : CONTEUDO.tituloDaResposta}
            </h2>
            <CartaoDoConteudo lido={lido.lido} autor={lido.autor} idDoTitulo={ID_DO_TITULO} />
          </section>
          <section aria-labelledby="sec-autor" className="flex flex-col gap-3">
            <h2 id="sec-autor" className="cm-h4">
              {DENUNCIA.secaoPerfil}
            </h2>
            {lido.autor ? <CartaoDoPerfil perfil={lido.autor} /> : <p>{COMUM_MODERACAO.pessoaRemovida}</p>}
          </section>
          <section aria-labelledby="sec-acoes" className="flex flex-col gap-3">
            <h2 id="sec-acoes" className="cm-h4">
              {DENUNCIA.acoesDoConteudo}
            </h2>
            <AcoesDoConteudo
              alvo={{ tipo, id: idDoConteudo(lido.lido) }}
              estadoAtual={estadoDoConteudo(lido.lido)}
              autorId={autorDoConteudo(lido.lido)}
              denunciaId={null}
              aoFeito={aoFeito}
              aoErro={() => void leitura.reler()}
            />
          </section>
          {lido.historico ? (
            <section aria-labelledby="sec-historico" className="flex flex-col gap-3">
              <h2 id="sec-historico" className="cm-h4">
                {DENUNCIA.secaoHistorico}
              </h2>
              <HistoricoDoPerfilVista historico={lido.historico} semOId={idDoConteudo(lido.lido)} contaId={painel.contaId} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

// M3, /moderacao/conteudo/:tipo/:id: um tópico ou uma resposta em qualquer estado, com as ações sem denúncia.
// Um id que não é UUID, ou um tipo que não existe, é "não encontrado", sem chamar o banco.
export function ConteudoNoPainel() {
  const { tipo, id } = useParams()
  return (
    <Painel titulo={NOMES_DAS_TELAS.conteudo}>
      {ehTipo(tipo) && ehUuid(id) ? <ConteudoLido key={`${tipo}-${id}`} tipo={tipo} id={id} /> : <NaoEncontradoNoPainel />}
    </Painel>
  )
}
