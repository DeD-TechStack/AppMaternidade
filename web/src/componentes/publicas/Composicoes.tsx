import { MINIATURAS } from '../../conteudo/textos.ts'
import { CartaoEmAndamento } from '../../prototipo/CartaoEmAndamento.tsx'
import { SessaoInfo } from '../../prototipo/SessaoInfo.tsx'
import { Aparelho } from '../Aparelho.tsx'

// Composições de aparelho das páginas públicas: a moldura de celular ou de notebook com as telas do
// protótipo em miniatura, no tamanho natural, e o relógio parado (dados fixos de MINIATURAS). São
// vitrine: inertes, escondidas do leitor de tela, sem navegação inferior, sem ids e sem efeito no
// <html>. Cada uma mora numa caixa (.palco) que reserva a altura e escala o aparelho pela largura da
// página, em degraus (ver MAT-36 em index.css).

/** A nota "Para você saber" do Hoje. */
function NotaDoHoje() {
  const { nota } = MINIATURAS.hoje
  return (
    <div>
      <p className="rotulo">{nota.rotulo}</p>
      <p className="nota-italico mt-2">{nota.texto}</p>
      <p className="tabular mt-1 text-sm">{nota.autor}</p>
    </div>
  )
}

/** A lista "Últimos" do Hoje. */
function UltimosDoHoje() {
  const { ultimos } = MINIATURAS.hoje
  return (
    <div>
      <p className="rotulo">{ultimos.rotulo}</p>
      <ul className="mt-2 divide-y border-y">
        {ultimos.itens.map((item) => (
          <li key={item.rotulo} className="flex items-baseline justify-between gap-4 py-2">
            <span>{item.rotulo}</span>
            <span className="tabular text-right">{item.quando}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** O alto do Hoje: título, bebê e o cartão em andamento. */
function CartaoDoHoje() {
  const { hoje } = MINIATURAS
  return (
    <div>
      <p className="titulo-linha">{hoje.titulo}</p>
      <p className="mt-1">{hoje.bebe}</p>
      <div className="mt-4">
        <CartaoEmAndamento miniatura sessao={hoje.sessao} />
      </div>
    </div>
  )
}

/** As ações da Sessão, desativadas e fora da ordem de Tab. */
function AcoesEmMiniatura() {
  const [encerrar, anotar, descartar] = MINIATURAS.sessao.acoes
  return (
    <div className="mt-6 flex flex-col gap-3">
      <button type="button" disabled tabIndex={-1} className="botao botao-principal botao-grande">
        {encerrar}
      </button>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled tabIndex={-1} className="botao botao-secundario">
          {anotar}
        </button>
        <button type="button" disabled tabIndex={-1} className="botao botao-secundario">
          {descartar}
        </button>
      </div>
    </div>
  )
}

/** Celular com o Hoje: o cartão da soneca que ainda não acabou e a nota de passagem. */
export function CelularDoHoje() {
  return (
    <div className="palco palco-celular">
      <Aparelho
        tipo="celular"
        tela="hoje"
        className="absolute left-0 top-0 origin-top-left [scale:var(--escala-celular)]"
      >
        <CartaoDoHoje />
        <div className="mt-6">
          <NotaDoHoje />
        </div>
      </Aparelho>
    </div>
  )
}

/** Celular com a Sessão nas cores da madrugada (o <html> não muda). */
export function CelularDaSessaoDeMadrugada() {
  const { sessao } = MINIATURAS
  return (
    <div className="palco palco-celular">
      <Aparelho
        tipo="celular"
        tela="sessao"
        tema="madrugada"
        className="absolute left-0 top-0 origin-top-left [scale:var(--escala-celular)]"
      >
        <p className="titulo-linha mb-4">{sessao.titulo}</p>
        <SessaoInfo
          miniatura
          campo="night-paper-deep"
          cronometro={sessao.cronometro}
          hora={sessao.hora}
          pessoa={sessao.pessoa}
          atividade={sessao.atividade}
        />
        <AcoesEmMiniatura />
      </Aparelho>
    </div>
  )
}

/** Notebook com o Hoje de computador: o cartão numa coluna, a nota e os últimos registros na outra. */
export function NotebookDoHoje() {
  return (
    <div className="palco palco-notebook">
      <Aparelho
        tipo="notebook"
        tela="hoje"
        className="absolute top-0 origin-top-left [left:calc(2.5rem*var(--escala-notebook))] [scale:var(--escala-notebook)]"
      >
        <div className="grid grid-cols-2 items-start gap-8">
          <CartaoDoHoje />
          <div className="flex flex-col gap-6">
            <NotaDoHoje />
            <UltimosDoHoje />
          </div>
        </div>
      </Aparelho>
    </div>
  )
}
