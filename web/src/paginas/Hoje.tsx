import { useEffect, useId, useRef, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ColunaApp } from '../componentes/ColunaApp.tsx'
import { BarraInferior } from '../prototipo/BarraInferior.tsx'
import { BotoesRapidos } from '../prototipo/BotoesRapidos.tsx'
import { CartaoEmAndamento } from '../prototipo/CartaoEmAndamento.tsx'
import { Confirmacao } from '../prototipo/Confirmacao.tsx'
import { FaixaPrototipo } from '../prototipo/FaixaPrototipo.tsx'
import { NavegacaoInferior } from '../prototipo/NavegacaoInferior.tsx'
import { nomeDoCampo } from '../prototipo/campo.ts'
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
import { formatarDuracao } from '../prototipo/formatar.ts'
import { useAgora } from '../prototipo/useAgora.ts'
import { useVitrine } from '../prototipo/vitrine.ts'

// O cartão se atualiza sozinho: a duração sai de `agora - inicio`, nunca de um contador.
// Ao encerrar, o botão "Encerrar" some; o foco vai para o próprio cartão, que passa a dizer
// "Nenhuma sessão em andamento.".
function CartaoDaSessao({ cartao }: { cartao: RefObject<HTMLElement | null> }) {
  const { estado, dispatch } = usePrototipo()
  const agora = useAgora(1000)
  const sessao = estado.sessao

  function encerrar() {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota: false })
    cartao.current?.focus()
  }

  return (
    <CartaoEmAndamento
      ref={cartao}
      campo={nomeDoCampo('accent', estado.madrugada)}
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

// A tela Hoje, de operar. Dois layouts, pela largura do contêiner `app` (ver ColunaApp e index.css):
// no estreito, a coluna de 40 rem com a barra de baixo; no largo, o título atravessa as duas
// colunas, o cartão e o registro rápido ficam à esquerda e "Para você saber" e "Últimos" à direita.
// Os dois têm a mesma árvore DOM e a mesma ordem de Tab (faixa e aviso, conteúdo, botões rápidos,
// navegação): a troca é só de CSS. Dentro de um aparelho do Início (vitrine) a tela não tem efeito
// fora da moldura: não move o foco, não repete id e nada nela é focável por Tab.
export function Hoje() {
  const { estado, dispatch } = usePrototipo()
  const vitrine = useVitrine()
  const navigate = useNavigate()
  const location = useLocation()
  const titulo = useRef<HTMLHeadingElement>(null)
  const cartao = useRef<HTMLElement>(null)
  const primeiroBotao = useRef<HTMLButtonElement>(null)
  const idSaber = useId()
  const idUltimos = useId()

  // Chegando por navegação interna, o foco vai ao alvo que a origem pediu; pela URL, não se move.
  const foco = vitrine ? null : focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'cartao') cartao.current?.focus()
    else if (foco === 'titulo') titulo.current?.focus()
  }, [foco, location.key])

  function iniciarSessao(tipo: TipoSessao) {
    if (estado.sessao) {
      // Já há uma sessão: abre a que existe e deixa a Sessão mostrar o aviso.
      void navigate('/app/sessao', { state: { jaEmAndamento: true, foco: 'titulo' } })
      return
    }
    dispatch({ tipo: 'iniciar', sessao: tipo, agora: Date.now() })
    void navigate('/app/sessao', { state: { foco: 'titulo' } })
  }

  // "Desfazer" e "Fechar" somem com a confirmação; o foco vai ao primeiro botão rápido, que é
  // o próximo controle na ordem do DOM e continua na tela. A confirmação nunca recebe o foco.
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

  // Num aparelho do Início os títulos não têm id (a página já tem os dela) nem o rótulo aria.
  const idDe = (id: string) => (vitrine ? undefined : id)

  return (
    <ColunaApp>
      {/* Num aparelho do Início o aviso é um só, o da página: a faixa não se repete na moldura. */}
      {vitrine ? null : <FaixaPrototipo />}

      <main className="hoje-main flex-1 px-4 pb-8 pt-6">
        <div className="hoje-corpo">
          <div className="hoje-titulo flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div>
              <h1 ref={titulo} tabIndex={-1} className="titulo-tela alvo-foco">
                Hoje
              </h1>
              <p className="mt-1">{`${NOME_BEBE}, ${IDADE_BEBE}`}</p>
            </div>

            <button
              type="button"
              aria-pressed={estado.madrugada}
              tabIndex={vitrine ? -1 : undefined}
              className="botao botao-secundario"
              onClick={() => dispatch({ tipo: 'definirMadrugada', valor: !estado.madrugada })}
            >
              Modo madrugada
            </button>
          </div>

          <div className="hoje-andamento mt-6">
            <CartaoDaSessao cartao={cartao} />
          </div>

          {/* A hierarquia é a dos dados: o cartão (o mais forte), os últimos registros (legíveis de
              relance) e, por fim, a nota de passagem, num campo de lavanda compacto e inset, que
              não sangra como o cartão. Na madrugada o campo é o lavanda escuro. No layout largo as
              duas seções ficam na coluna da direita, uma sobre a outra. */}
          <div className="hoje-lateral">
            <section
              aria-labelledby={idDe(idSaber)}
              data-campo={nomeDoCampo('field-2', estado.madrugada)}
              className="hoje-nota mt-6 px-4 py-5"
            >
              <h2 id={idDe(idSaber)} className="rotulo">
                Para você saber
              </h2>
              <p className="nota-italico mt-2 text-[1.5rem] leading-tight">{estado.nota.texto}</p>
              <p className="tabular mt-2 text-sm">{`${estado.nota.autor}, ${estado.nota.hora}`}</p>
            </section>

            <section aria-labelledby={idDe(idUltimos)} className="hoje-ultimos mt-8">
              <h2 id={idDe(idUltimos)} className="rotulo">
                Últimos
              </h2>
              <ul className="mt-3 divide-y border-y">
                {estado.ultimos.map((item) => (
                  <li
                    key={item.chave}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 text-lg"
                  >
                    <span>{item.rotulo}</span>{' '}
                    <span className="tabular text-right font-semibold">{item.quando}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <BarraInferior>
        <section aria-label="Registro rápido" className="registro-rapido">
          <Confirmacao
            texto={estado.confirmacao?.texto ?? null}
            aoDesfazer={desfazer}
            aoFechar={fecharConfirmacao}
          />
          <BotoesRapidos
            desativado={vitrine}
            refSono={primeiroBotao}
            aoIniciarSessao={iniciarSessao}
            aoRegistrarFralda={registrarFralda}
            aoRegistrarMais={registrarMais}
          />
        </section>
        <NavegacaoInferior hojeAtual />
      </BarraInferior>
    </ColunaApp>
  )
}
