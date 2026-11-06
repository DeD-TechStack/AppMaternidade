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

/** Celular com o cartão "Em andamento" do Hoje: a soneca que ainda não acabou. */
export function CelularDoHoje() {
  return (
    <div className="palco palco-celular">
      <Aparelho
        tipo="celular"
        tela="hoje"
        className="absolute left-0 top-0 origin-top-left [scale:var(--escala-celular)]"
      >
        <NaTela ampliacao="[zoom:1.4]" altura="h-[32rem]">
          <CartaoEmAndamento miniatura sessao={MINIATURAS.hoje.sessao} />
        </NaTela>
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
        <NaTela ampliacao="[zoom:1.5]" altura="h-[32rem]">
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

/** Notebook com o cartão "Em andamento" do Hoje, em tamanho maior, ocupando a tela. */
export function NotebookDoHoje() {
  return (
    <div className="palco palco-notebook">
      <Aparelho
        tipo="notebook"
        tela="hoje"
        className="absolute top-0 origin-top-left [left:calc(2.5rem*var(--escala-notebook))] [scale:var(--escala-notebook)]"
      >
        <NaTela ampliacao="[zoom:1.6]" altura="h-[30rem]">
          <CartaoEmAndamento miniatura sessao={MINIATURAS.hoje.sessao} />
        </NaTela>
      </Aparelho>
    </div>
  )
}
