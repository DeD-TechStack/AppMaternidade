import type { ReactNode } from 'react'
import { Coluna, Colunas } from '../base/layout/index.ts'
import { PortaAcesso } from './PortaAcesso.tsx'

interface Props {
  children: ReactNode
}

// A banda de duas metades (cartão T3, REP-T3). A partir de 1024 px: à esquerda o corredor de noite (cacau, nas
// duas temas) com a placa da porta quadrada, encostada na borda esquerda da janela e no fundo da banda; à direita
// o papel, com uma coluna de formulário de 28 rem. A banda vai do cabeçalho ao rodapé e tem ao menos a altura da
// janela (`100svh` menos o cabeçalho): com a janela alta, a parede de cacau continua por cima da placa; com o
// formulário mais alto que a janela, a banda cresce e a placa fica no fundo. Abaixo de 1024 px: o formulário
// primeiro (20 px de margem), e a placa depois, de ponta a ponta, encostada na esquerda.
// A grade não tem vão (`gap-0`): as duas metades se tocam, e cada uma cuida do próprio respiro.
// A banda leva `secao` no `data-h` só para o rodapé encostar nela (o site.css tira a margem do rodapé quando o
// `<main>` termina numa seção) e zera o respiro de seção (`py-0`): quem dá o respiro é cada metade.
const BANDA = 'py-0 gap-0 lg:min-h-[calc(100svh-var(--cm-cabecalho))]'

// O formulário: respiro de topo e de base da seção ampla (72 em 390, 128 em 1440), a margem lateral da calha do
// quadro e, a partir de 1024, o recuo da borda da metade: o da margem do quadro (120 em 1440), no máximo a seção
// ampla, para o formulário não fugir para a direita em janelas largas.
const FORMULARIO =
  'pt-esp-secao-ampla pb-esp-secao-ampla px-esp-quadro-calha ' +
  'lg:col-start-2 lg:row-start-1 lg:ps-[clamp(var(--quadro-calha),calc((100vw-var(--quadro-largura))/2),var(--espaco-secao-ampla))]'

// A metade da placa: parede de cacau (não troca na madrugada) e a placa no fundo. O piso de noite (noite-cartão) da
// placa continua à direita dela, na altura que ele tem na imagem (0,136 do lado), quando a metade é mais larga que a
// placa (janela acima de 1440, ou abaixo de 1024). `cqw` é a largura da própria metade.
const PLACA = 'relative flex flex-col justify-end bg-cacau [container-type:inline-size] lg:col-start-1 lg:row-start-1'
const PISO = 'absolute inset-x-0 bottom-0 bg-noite-cartao h-[calc(min(45rem,100cqw)*0.136)]'

/**
 * A moldura de duas colunas das telas de acesso (Entrar, Criar conta, Recuperar acesso, Começar, Nova senha,
 * Conta excluída, Convite e Escolha da família): o formulário (`children`) e, ao lado dele, a placa da porta.
 */
export function DuasColunas({ children }: Props) {
  return (
    <Colunas fracoes="1fr 1fr" aPartirDe={1024} dataH="secao" className={BANDA}>
      <Coluna className={FORMULARIO}>
        <div className="w-full max-w-[28rem]">{children}</div>
      </Coluna>
      <Coluna className={PLACA}>
        <div aria-hidden="true" className={PISO} />
        <div className="relative">
          <PortaAcesso />
        </div>
      </Coluna>
    </Colunas>
  )
}
