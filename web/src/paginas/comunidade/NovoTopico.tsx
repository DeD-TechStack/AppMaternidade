import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { NaoEncontrado, ParaEntrar } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Carregando } from '../../componentes/estado/Carregando.tsx'
import { ErroDaComunidade } from '../../componentes/estado/ErroDaComunidade.tsx'
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
  // O aviso do resumo inserido (RF12:RF-11) usa a área de status da página, a mesma da mensagem de passagem.
  const [aviso, setAviso] = useState<string | null>(null)
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
          <Status mensagem={aviso ?? textoDaPassagemComunidade(location.state)} />
          {espacos.estado.fase === 'carregando' || situacao.estado.fase === 'carregando' ? <Carregando linhas={2} /> : null}
          {espacos.estado.fase === 'erro' ? (
            <ErroDaComunidade erro={espacos.estado.erro} aoTentarDeNovo={() => void espacos.recarregar()} />
          ) : null}
          {situacao.estado.fase === 'erro' ? (
            <ErroDaComunidade erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
          ) : null}
          {espacos.estado.fase === 'pronto' && !espaco ? <NaoEncontrado /> : null}
          {espaco && lida && !ehEscritor(lida) ? <ParaEntrar destino={`/app/comunidade/${espaco.slug}/novo`} /> : null}
        </>
      }
    >
      {espaco && lida && ehEscritor(lida) && lida.perfilId ? (
        <Faixa>
          <FormularioDeTopico key={espaco.id} espaco={espaco} perfilId={lida.perfilId} edicao={null} aoAvisar={setAviso} />
        </Faixa>
      ) : null}
    </Quadro>
  )
}
