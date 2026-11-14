import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { useFocoPendente } from '../../componentes/comunidade/foco.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { AcoesDoConteudo, type AcaoFeita } from '../../componentes/moderacao/Acoes.tsx'
import { ErroDeLeituraNoPainel, NaoEncontradoNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { Bloco } from '../../componentes/moderacao/Bloco.tsx'
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
import { useLeituraMantida } from '../../componentes/moderacao/mantida.ts'
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

  // A última leitura que valeu continua na tela (e a caixa aberta com ela) enquanto a releitura está em curso
  // ou falhou por erro passageiro; o erro aparece com o "Tentar de novo", também dentro da caixa (RF-15).
  const mantida = useLeituraMantida(leitura.estado)
  const lido = mantida?.valor ?? null
  const erroDaLeitura =
    leitura.estado.fase === 'erro' ? (
      <ErroDeLeituraNoPainel erro={leitura.estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} />
    ) : null

  async function aoFeito({ porConferencia, origem }: AcaoFeita) {
    await leitura.reler()
    setStatus(porConferencia ? TX.tx32 : TX.tx14)
    // O botão de origem; o título do item afetado; a confirmação; o `h1`.
    pedirFoco([() => origem, () => document.getElementById(ID_DO_TITULO), () => refStatus.current])
  }

  const ocupado = leitura.estado.fase === 'carregando' || undefined
  // O estado da leitura (confirmação, esqueleto, erro, "não encontrado") vai no alto da primeira seção.
  const topo = (
    <>
      <Status mensagem={status} refStatus={refStatus} />
      {leitura.esqueleto && mantida === null ? <Esqueleto linhas={3} /> : null}
      {erroDaLeitura}
      {leitura.estado.fase === 'pronto' && lido === null ? <NaoEncontradoNoPainel /> : null}
    </>
  )

  if (!lido) {
    return (
      <Faixa aria-busy={ocupado}>
        <Pilha vao="grupo">{topo}</Pilha>
      </Faixa>
    )
  }
  return (
    <>
      <Bloco
        id="sec-conteudo"
        titulo={lido.lido.tipo === 'topico' ? CONTEUDO.tituloDoTopico : CONTEUDO.tituloDaResposta}
        topo={topo}
        ocupado={ocupado}
      >
        <CartaoDoConteudo lido={lido.lido} autor={lido.autor} idDoTitulo={ID_DO_TITULO} />
      </Bloco>
      <Bloco id="sec-autor" titulo={DENUNCIA.secaoPerfil}>
        {lido.autor ? <CartaoDoPerfil perfil={lido.autor} /> : <p>{COMUM_MODERACAO.pessoaRemovida}</p>}
      </Bloco>
      <Bloco id="sec-acoes" titulo={DENUNCIA.acoesDoConteudo}>
        <AcoesDoConteudo
          alvo={{ tipo, id: idDoConteudo(lido.lido) }}
          estadoAtual={estadoDoConteudo(lido.lido)}
          autorId={autorDoConteudo(lido.lido)}
          denunciaId={null}
          aoFeito={aoFeito}
          aoErro={() => void leitura.reler()}
          avisoDeLeitura={erroDaLeitura}
        />
      </Bloco>
      {lido.historico ? (
        <Bloco id="sec-historico" titulo={DENUNCIA.secaoHistorico}>
          <HistoricoDoPerfilVista historico={lido.historico} semOId={idDoConteudo(lido.lido)} contaId={painel.contaId} />
        </Bloco>
      ) : null}
    </>
  )
}


// M3, /moderacao/conteudo/:tipo/:id: um tópico ou uma resposta em qualquer estado, com as ações sem denúncia.
// Um id que não é UUID, ou um tipo que não existe, é "não encontrado", sem chamar o banco.
export function ConteudoNoPainel() {
  const { tipo, id } = useParams()
  return (
    <Painel titulo={NOMES_DAS_TELAS.conteudo}>
      {ehTipo(tipo) && ehUuid(id) ? (
        <ConteudoLido key={`${tipo}-${id}`} tipo={tipo} id={id} />
      ) : (
        <Faixa>
          <NaoEncontradoNoPainel />
        </Faixa>
      )}
    </Painel>
  )
}
