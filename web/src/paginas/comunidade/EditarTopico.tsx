import { useParams } from 'react-router'
import { ErroDeLeitura, Esqueleto, NaoEncontrado, ParaEntrar } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { FormularioDeTopico } from '../../componentes/comunidade/FormularioDeTopico.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { FORMULARIO_TOPICO, LISTA } from '../../conteudo/comunidade.ts'
import { ehUuid } from '../../dados/comunidade.regras.ts'

function EdicaoLida({ id }: { id: string }) {
  const dados = useDadosComunidade()
  const situacao = useSituacao()
  const topico = useLeitura(() => dados.lerTopico(id), id)
  const espacos = useLeitura(() => dados.listarEspacos(), 'espacos')
  const leituras = [topico, situacao, espacos]
  const lido = topico.estado.fase === 'pronto' ? topico.estado.valor : null
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null
  const espaco = lido && espacos.estado.fase === 'pronto' ? espacos.estado.valor.find((e) => e.id === lido.espacoId) : undefined
  const pronto = topico.estado.fase === 'pronto' && lida !== null
  // O banco só deixa o autor editar, e só com o tópico visível: para os outros, é "não encontrado".
  const editavel = lido !== null && lida !== null && lido.estado === 'visivel' && lido.autorId !== null && lido.autorId === lida.perfilId

  return (
    <Quadro voltar={`/app/comunidade/topico/${id}`} ocupado={leituras.some((leitura) => leitura.estado.fase === 'carregando')}>
      <TituloDaTela>{FORMULARIO_TOPICO.tituloEditar}</TituloDaTela>
      <div className="mt-6">{leituras.some((leitura) => leitura.esqueleto) ? <Esqueleto linhas={2} /> : null}</div>
      {leituras.map((leitura, indice) =>
        leitura.estado.fase === 'erro' ? (
          <ErroDeLeitura key={indice} erro={leitura.estado.erro} aoTentarDeNovo={() => void leitura.recarregar()} />
        ) : null,
      )}
      {pronto && lida && !ehEscritor(lida) ? <ParaEntrar destino={`/app/comunidade/topico/${id}/editar`} /> : null}
      {pronto && lida && ehEscritor(lida) && !editavel ? <NaoEncontrado /> : null}
      {lido && lida && editavel && ehEscritor(lida) && lida.perfilId && espaco ? (
        <FormularioDeTopico
          espaco={espaco}
          perfilId={lida.perfilId}
          edicao={{ id: lido.id, titulo: lido.titulo, corpo: lido.corpo, faixa: lido.faixa }}
          aoNaoEditavel={() => void topico.reler()}
        />
      ) : null}
    </Quadro>
  )
}

// C4, /app/comunidade/topico/:id/editar: o mesmo formulário, com os valores atuais. Um id que não é UUID
// é "não encontrado", sem chamar o banco. Volta à C3 do tópico.
export function EditarTopico() {
  const { id } = useParams()
  if (!ehUuid(id)) {
    return (
      <Quadro voltar="/app/comunidade">
        <TituloDaTela>{LISTA.titulo}</TituloDaTela>
        <NaoEncontrado />
      </Quadro>
    )
  }
  return <EdicaoLida key={id} id={id} />
}
