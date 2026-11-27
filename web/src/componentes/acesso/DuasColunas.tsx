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
// formulário mais alto que a janela, a banda cresce e a placa fica no fundo. Abaixo de 1024 px (F8-4): a porta
// vem primeiro, como faixa de 3,25:1 de ponta a ponta (a mão, a chave e a fechadura da mesma placa), e o formulário
// logo abaixo. A ordem visual é só do CSS (`order`): no DOM o formulário continua primeiro, e o leitor de tela lê
// o formulário antes da imagem.
// A grade não tem vão (`gap-0`): as duas metades se tocam, e cada uma cuida do próprio respiro.
// A banda leva `secao` no `data-h` só para o rodapé encostar nela (o site.css tira a margem do rodapé quando o
// `<main>` termina numa seção) e zera o respiro de seção (`py-0`): quem dá o respiro é cada metade.
const BANDA = 'py-0 gap-0 lg:min-h-[calc(100svh-var(--cm-cabecalho))]'

// O formulário: respiro de topo do vão de grupo (24 em 390, logo abaixo da faixa da porta) e de base da seção ampla
// (72 em 390), a margem lateral da calha do quadro e, a partir de 1024, o recuo da borda da metade: o da margem do
// quadro (120 em 1440), no máximo a seção ampla, para o formulário não fugir para a direita em janelas largas. A
// partir de 1024 o respiro de base também cai para o vão de grupo (32 em 1440) e o formulário se centra na altura da
// metade (coluna flex, `justify-center`): o mais alto (Criar conta, ~636 px) cabe nos 720 px da placa sem crescer a
// banda, e os curtos (Entrar, Recuperar) ficam no meio.
const FORMULARIO =
  'pt-esp-grupo pb-esp-secao-ampla px-esp-quadro-calha ' +
  'lg:flex lg:flex-col lg:justify-center lg:pt-esp-grupo lg:pb-esp-grupo ' +
  'lg:col-start-2 lg:row-start-1 lg:ps-[clamp(var(--quadro-calha),calc((100vw-var(--quadro-largura))/2),var(--espaco-secao-ampla))]'

// A metade da placa: parede de cacau (não troca na madrugada) e a placa no fundo. O piso de noite (noite-cartão) da
// placa continua à direita dela, na altura que ele tem na imagem (0,136 do lado), quando a metade é mais larga que a
// placa (janela acima de 1440). Abaixo de 1024 não há piso: a faixa da porta preenche a largura. `cqw` é a
// largura da própria metade. Abaixo de 1024 a placa vem antes do formulário (`order-first`); de 1024 em diante a
// posição explícita na grade (`col-start`/`row-start`) manda e `order-none` desfaz a ordem.
const PLACA =
  'relative flex flex-col justify-end bg-cacau [container-type:inline-size] order-first lg:order-none lg:col-start-1 lg:row-start-1'
const PISO = 'hidden lg:block absolute inset-x-0 bottom-0 bg-noite-cartao h-[calc(min(45rem,100cqw)*0.136)]'

// Abaixo de 1024 a imagem é a faixa da porta: caixa de 3,25:1, de ponta a ponta, que corta o que passa (a imagem
// preenche a caixa, ver `PortaAcesso`). De 1024 em diante a caixa volta a ser só um envoltório, sem proporção
// nem corte, e a placa quadrada é a de sempre.
const FAIXA = 'relative aspect-[3.25/1] overflow-hidden lg:aspect-auto lg:overflow-visible'

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
        <div className={FAIXA}>
          <PortaAcesso />
        </div>
      </Coluna>
    </Colunas>
  )
}
