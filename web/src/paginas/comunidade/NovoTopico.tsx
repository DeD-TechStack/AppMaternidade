import { useLocation, useParams } from 'react-router'
import { ErroDeLeitura, Esqueleto, NaoEncontrado, ParaEntrar } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { FormularioDeTopico } from '../../componentes/comunidade/FormularioDeTopico.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { FORMULARIO_TOPICO, textoDaPassagemComunidade } from '../../conteudo/comunidade.ts'

// C4, /app/comunidade/:slug/novo: o formulário de um tópico novo, que abre vazio. Volta à C2 do espaço.
export function NovoTopico() {
  const { slug } = useParams()
  const location = useLocation()
  const dados = useDadosComunidade()
  const situacao = useSituacao()
  const espacos = useLeitura(() => dados.listarEspacos(), 'espacos')
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null
  const espaco = espacos.estado.fase === 'pronto' ? espacos.estado.valor.find((e) => e.slug === slug) : undefined

  return (
    <Quadro
      voltar={espaco ? `/app/comunidade/${espaco.slug}` : '/app/comunidade'}
      ocupado={espacos.estado.fase === 'carregando' || situacao.estado.fase === 'carregando'}
      titulo={<TituloDaTela>{FORMULARIO_TOPICO.tituloNovo}</TituloDaTela>}
      cabeca={
        <>
          <Status mensagem={textoDaPassagemComunidade(location.state)} />
          {espacos.esqueleto || situacao.esqueleto ? <Esqueleto linhas={2} /> : null}
          {espacos.estado.fase === 'erro' ? (
            <ErroDeLeitura erro={espacos.estado.erro} aoTentarDeNovo={() => void espacos.recarregar()} />
          ) : null}
          {situacao.estado.fase === 'erro' ? (
            <ErroDeLeitura erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
          ) : null}
          {espacos.estado.fase === 'pronto' && !espaco ? <NaoEncontrado /> : null}
          {espaco && lida && !ehEscritor(lida) ? <ParaEntrar destino={`/app/comunidade/${espaco.slug}/novo`} /> : null}
        </>
      }
    >
      {espaco && lida && ehEscritor(lida) && lida.perfilId ? (
        <Faixa>
          <FormularioDeTopico key={espaco.id} espaco={espaco} perfilId={lida.perfilId} edicao={null} />
        </Faixa>
      ) : null}
    </Quadro>
  )
}
