import { useEffect, useId, useRef, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Abertura } from '../componentes/base/Abertura.tsx'
import { FaixaNumeros } from '../componentes/base/FaixaNumeros.tsx'
import { LinhaRotuloTexto } from '../componentes/base/LinhaRotuloTexto.tsx'
import { BarraRegistrar } from '../componentes/registro/BarraRegistrar.tsx'
import { BlocoEmAndamento } from '../prototipo/BlocoEmAndamento.tsx'
import { ItemAvisoDaAbertura } from '../prototipo/ItemAvisoDaAbertura.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
import {
  IDADE_BEBE,
  NOME_BEBE,
  ROTULO_SESSAO,
  type EscolhaFralda,
  type ItemMais,
  type TipoSessao,
} from '../prototipo/estado.ts'
import { focoDoEstado } from '../prototipo/foco.ts'
import { formatarDuracao, formatarUltimo } from '../prototipo/formatar.ts'
import { useAgora } from '../prototipo/useAgora.ts'
import { useTituloDaTela } from '../prototipo/useTituloDaTela.ts'

const SEM_REGISTRO = { valor: '—', legenda: '—' }

// O bloco se atualiza sozinho: a duração sai de `agora - inicio`, nunca de um contador. Ao
// encerrar, o botão "Encerrar" some; o foco vai para o próprio bloco, que passa a dizer
// "Nenhuma sessão em andamento.".
function BlocoDaSessao({ bloco }: { bloco: RefObject<HTMLElement | null> }) {
  const { estado, dispatch } = usePrototipo()
  const agora = useAgora(1000)
  const sessao = estado.sessao

  function encerrar() {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota: false })
    bloco.current?.focus()
  }

  return (
    <BlocoEmAndamento
      ref={bloco}
      sessao={
        sessao
          ? {
              rotulo: ROTULO_SESSAO[sessao.tipo],
              duracao: formatarDuracao(agora - sessao.inicio),
              pessoa: sessao.pessoa,
            }
          : null
      }
      aoEncerrar={encerrar}
    />
  )
}

export function Hoje() {
  const { estado, dispatch } = usePrototipo()
  const navigate = useNavigate()
  const location = useLocation()
  const { principal, focarTitulo } = useTituloDaTela()
  const bloco = useRef<HTMLElement>(null)
  const primeiroBotao = useRef<HTMLButtonElement>(null)
  const idUltimos = useId()
  const idSaber = useId()

  // Chegando por navegação interna, o foco vai ao alvo que a origem pediu; pela URL, não se move.
  const foco = focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'cartao') bloco.current?.focus()
    else if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])

  function iniciarSessao(tipo: TipoSessao) {
    if (estado.sessao) {
      // Já há uma sessão: abre a que existe e deixa a Sessão mostrar o aviso.
      void navigate('/app/sessao', { state: { jaEmAndamento: true, foco: 'titulo' } })
      return
    }
    dispatch({ tipo: 'iniciar', sessao: tipo, agora: Date.now() })
    void navigate('/app/sessao', { state: { foco: 'titulo' } })
  }

  // "Desfazer" e "Fechar" somem com a confirmação; o foco vai ao primeiro botão da barra (Sono), que
  // é o próximo controle na ordem do DOM e continua na tela. A confirmação nunca recebe o foco.
  function desfazer() {
    dispatch({ tipo: 'desfazer' })
    primeiroBotao.current?.focus()
  }

  function fecharConfirmacao() {
    dispatch({ tipo: 'fecharConfirmacao' })
    primeiroBotao.current?.focus()
  }

  function registrarFralda(escolha: EscolhaFralda) {
    dispatch({
      tipo: 'registrar',
      chave: 'fralda',
      rotulo: 'Fralda',
      confirmacao: `Fralda registrada: ${escolha}`,
    })
  }

  function registrarMais(item: ItemMais) {
    dispatch({
      tipo: 'registrar',
      chave: item.chave,
      rotulo: item.rotulo,
      confirmacao: `${item.rotulo} registrada`,
    })
  }

  // Três colunas sempre: os 3 primeiros registros, e o travessão nas que faltam.
  const registros = estado.ultimos.map((item) => formatarUltimo(item.rotulo, item.quando))
  const coluna = (posicao: number) => registros[posicao] ?? SEM_REGISTRO
  const faixa = [coluna(0), coluna(1), coluna(2)] as const

  return (
    <>
      <main ref={principal} className="ha-tela ha-hoje">
        <Abertura
          titulo="Hoje"
          subtitulo={`${NOME_BEBE}, ${IDADE_BEBE}`}
          lateral={[
            <ItemAvisoDaAbertura key="aviso" />,
            // O `li` guarda 44 px de layout e o link tem 56 de alvo nos dois temas (ver `.ha-li-link`).
            <li key="ultimos" className="ha-li-link">
              <a className="sb-abertura-link t-corpo alvo-toque" href="#ultimos">
                Ir aos últimos
              </a>
            </li>,
          ]}
        />

        <BlocoDaSessao bloco={bloco} />

        <section id="ultimos" data-ultimos="" aria-labelledby={idUltimos} className="sb-area sb-mt-par-numeros">
          <h2 id={idUltimos} className="sr-only">
            Últimos
          </h2>
          <FaixaNumeros itens={faixa} />
        </section>

        <section aria-labelledby={idSaber} className="sb-area sb-mt-midia-titulo">
          <h2 id={idSaber} className="sr-only">
            Para você saber
          </h2>
          <LinhaRotuloTexto rotulo={`${estado.nota.autor}, ${estado.nota.hora}`}>{estado.nota.texto}</LinhaRotuloTexto>
        </section>
      </main>

      <BarraRegistrar
        refSono={primeiroBotao}
        aoIniciarSessao={iniciarSessao}
        aoRegistrarFralda={registrarFralda}
        aoRegistrarMais={registrarMais}
        texto={estado.confirmacao?.texto ?? null}
        aoDesfazer={desfazer}
        aoFechar={fecharConfirmacao}
      />
    </>
  )
}
