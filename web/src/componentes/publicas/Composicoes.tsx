import type { ReactNode } from 'react'
import { MINIATURAS } from '../../conteudo/textos.ts'
import { CartaoEmAndamento } from '../../prototipo/CartaoEmAndamento.tsx'
import { SessaoInfo } from '../../prototipo/SessaoInfo.tsx'
import { Aparelho } from '../Aparelho.tsx'

// Composições de aparelho das páginas públicas: a moldura de celular ou de notebook com UM componente
// do protótipo em miniatura (CartaoEmAndamento ou SessaoInfo), com os dados fixos de MINIATURAS e o
// relógio parado. Nada mais entra na tela: título, nota, lista e ações são das telas do Início, que
// não se reaproveitam aqui. É vitrine: inerte, escondida do leitor de tela, sem navegação inferior,
// sem ids e sem efeito no <html>. Cada composição mora numa caixa (.palco) que reserva a altura e
// escala o aparelho pela largura da página, em degraus (ver MAT-36 em index.css).
//
// O valor grande da miniatura (o cronômetro e a duração do cartão) tem tamanho fixo dentro do .palco,
// em rem, e não o clamp com vw dos componentes: a tela do aparelho tem tamanho fixo, e com a janela
// larga a fonte chegava ao máximo e o valor quebrava em duas linhas. O zoom de cada invólucro foi
// escolhido para a largura útil da tela comportar o valor com folga (conferido em
// acabamentoPublicas.test.tsx).

/**
 * O invólucro do componente dentro da tela. A tela só tem o componente, então ele cresce com `zoom`
 * (a caixa do aparelho e a escala da vitrine não mudam) e fica no meio da altura útil da tela, sem
 * sobrar um vazio embaixo. `altura` é a altura útil da tela em rem: celular 32 rem (a moldura tem
 * 37,33 rem, menos a borda, o respiro e a faixa da câmera) e notebook 30 rem.
 */
function NaTela({ ampliacao, altura, children }: { ampliacao: string; altura: string; children: ReactNode }) {
  return (
    <div className={`flex items-center ${altura}`}>
      <div className={`w-full ${ampliacao}`}>{children}</div>
    </div>
  )
}

/** A tela do celular com o cartão "Em andamento" do Hoje: a soneca que ainda não acabou. */
function TelaDoCelularComCartao() {
  return (
    <NaTela ampliacao="[zoom:1.25]" altura="h-[32rem]">
      <CartaoEmAndamento miniatura sessao={MINIATURAS.hoje.sessao} />
    </NaTela>
  )
}

/** A tela do notebook com o cartão "Em andamento" do Hoje, em tamanho maior, ocupando a tela. */
function TelaDoNotebookComCartao() {
  return (
    <NaTela ampliacao="[zoom:1.6]" altura="h-[30rem]">
      <CartaoEmAndamento miniatura sessao={MINIATURAS.hoje.sessao} />
    </NaTela>
  )
}

/** Celular com o cartão "Em andamento" do Hoje. */
export function CelularDoHoje() {
  return (
    <div className="palco palco-celular">
      <Aparelho
        tipo="celular"
        tela="hoje"
        className="absolute left-0 top-0 origin-top-left [scale:var(--escala-celular)]"
      >
        <TelaDoCelularComCartao />
      </Aparelho>
    </div>
  )
}

/** Celular com o cronômetro da Sessão nas cores da madrugada (o <html> não muda). */
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
        <NaTela ampliacao="[zoom:1.4]" altura="h-[32rem]">
          <SessaoInfo
            miniatura
            campo="night-paper-deep"
            cronometro={sessao.cronometro}
            hora={sessao.hora}
            pessoa={sessao.pessoa}
            atividade={sessao.atividade}
          />
        </NaTela>
      </Aparelho>
    </div>
  )
}

/**
 * A mesma sessão vista em dois aparelhos: o notebook com o cartão e, na frente dele, ancorado no canto
 * inferior direito, um celular menor com o mesmo cartão. A caixa do grupo é a do notebook (o celular
 * fica dentro dela), então o grupo cabe na largura como o notebook sozinho. A sobreposição é só entre
 * os dois aparelhos. O celular tem uma proporção do notebook (--proporcao-do-celular, em index.css),
 * maior em página estreita para continuar legível.
 */
export function GrupoNotebookECelularDoHoje() {
  return (
    <div className="palco palco-notebook palco-grupo">
      <Aparelho
        tipo="notebook"
        tela="hoje"
        className="absolute top-0 origin-top-left [left:calc(2.5rem*var(--escala-notebook))] [scale:var(--escala-notebook)]"
      >
        <TelaDoNotebookComCartao />
      </Aparelho>
      <Aparelho
        tipo="celular"
        tela="hoje"
        className="absolute bottom-0 right-0 origin-bottom-right [scale:calc(var(--escala-notebook)*var(--proporcao-do-celular))]"
      >
        <TelaDoCelularComCartao />
      </Aparelho>
    </div>
  )
}
