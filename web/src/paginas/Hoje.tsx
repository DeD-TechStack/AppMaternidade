import { useNavigate } from 'react-router'
import { ColunaApp } from '../componentes/ColunaApp.tsx'
import { BarraInferior } from '../prototipo/BarraInferior.tsx'
import { BotoesRapidos } from '../prototipo/BotoesRapidos.tsx'
import { CartaoEmAndamento } from '../prototipo/CartaoEmAndamento.tsx'
import { Confirmacao } from '../prototipo/Confirmacao.tsx'
import { FaixaPrototipo } from '../prototipo/FaixaPrototipo.tsx'
import { NavegacaoInferior } from '../prototipo/NavegacaoInferior.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
import {
  IDADE_BEBE,
  NOME_BEBE,
  ROTULO_SESSAO,
  type EscolhaFralda,
  type ItemMais,
  type TipoSessao,
} from '../prototipo/estado.ts'
import { formatarDuracao } from '../prototipo/formatar.ts'
import { useAgora } from '../prototipo/useAgora.ts'

// O cartão se atualiza sozinho: a duração sai de `agora - inicio`, nunca de um contador.
function CartaoDaSessao() {
  const { estado, dispatch } = usePrototipo()
  const agora = useAgora(1000)
  const sessao = estado.sessao
  return (
    <CartaoEmAndamento
      sessao={
        sessao
          ? {
              rotulo: ROTULO_SESSAO[sessao.tipo],
              duracao: formatarDuracao(agora - sessao.inicio),
              pessoa: sessao.pessoa,
            }
          : null
      }
      aoEncerrar={() => dispatch({ tipo: 'encerrar', agora: Date.now(), comNota: false })}
    />
  )
}

export function Hoje() {
  const { estado, dispatch } = usePrototipo()
  const navigate = useNavigate()

  function iniciarSessao(tipo: TipoSessao) {
    if (estado.sessao) {
      // Já há uma sessão: abre a que existe e deixa a Sessão mostrar o aviso.
      void navigate('/app/sessao', { state: { jaEmAndamento: true } })
      return
    }
    dispatch({ tipo: 'iniciar', sessao: tipo, agora: Date.now() })
    void navigate('/app/sessao')
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

  return (
    <ColunaApp>
      <FaixaPrototipo />

      <main className="flex-1 px-4 pb-8 pt-6">
        <div>
          <h1 className="titulo-tela">Hoje</h1>
          <p className="mt-1">{`${NOME_BEBE}, ${IDADE_BEBE}`}</p>

          <button
            type="button"
            aria-pressed={estado.madrugada}
            className="botao botao-secundario mt-4"
            onClick={() => dispatch({ tipo: 'definirMadrugada', valor: !estado.madrugada })}
          >
            Modo madrugada
          </button>

          <div className="mt-6">
            <CartaoDaSessao />
          </div>

          <section aria-labelledby="titulo-saber" className="mt-8 border-t pt-4">
            <h2 id="titulo-saber" className="rotulo">
              Para você saber
            </h2>
            <p className="nota-italico mt-3">{estado.nota.texto}</p>
            <p className="tabular mt-1 text-sm">{`${estado.nota.autor}, ${estado.nota.hora}`}</p>
          </section>

          <section aria-labelledby="titulo-ultimos" className="mt-8 border-t pt-4">
            <h2 id="titulo-ultimos" className="rotulo">
              Últimos
            </h2>
            <ul className="mt-3 divide-y border-y">
              {estado.ultimos.map((item) => (
                <li key={item.chave} className="flex items-baseline justify-between gap-4 py-3">
                  <span>{item.rotulo}</span> <span className="tabular text-right">{item.quando}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <BarraInferior>
        <section aria-label="Registro rápido" className="registro-rapido @container">
          <Confirmacao
            texto={estado.confirmacao?.texto ?? null}
            aoDesfazer={() => dispatch({ tipo: 'desfazer' })}
            aoFechar={() => dispatch({ tipo: 'fecharConfirmacao' })}
          />
          <BotoesRapidos
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
