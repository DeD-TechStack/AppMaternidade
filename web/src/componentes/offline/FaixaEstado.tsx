import { useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { T01, T02, T03, T04, T05, T06 } from '../../conteudo/offline.ts'
import { assinarEstadoPwa, obterEstadoPwa } from '../../pwa/estado.ts'
import { executandoComoApp, instalarNoAparelho, recusarInstalacao } from '../../pwa/instalar.ts'
import { recarregarAba } from '../../pwa/recarregar.ts'
import { Botao } from '../base/Botao.tsx'

// A faixa só tem estilo inline (Tailwind sobre as variáveis de uso): o CSS do sistema-base não muda.
// Cores só da tinta, do papel e do secundário; nada de urucum. Sem sombra, sem ícone, sem movimento.

// Ritmo vertical (escala de 8): 8 abaixo do cabeçalho, 8 (16 a partir de 768) entre o bloco da versão e a
// oferta de instalar, 16 até o fio. O `h1` da tela vem depois do fio e desce a altura da faixa, sem outra conta.

// Linha 1 (versão nova ou outra aba): um bloco do sistema (raio 8, recuo vertical de 8, recuo lateral de
// 16 abaixo de 768 e de 64 a partir dele, o do bloco "Em andamento": o texto e o botão caem nas colunas do
// bloco da tela). No claro é de tinta (texto de papel) e, na madrugada, o bloco escuro do sistema (a tinta
// sobre o fundo escuro some). O texto e o botão ficam sempre na mesma linha (o texto quebra ao lado do botão,
// que tem a altura do alvo): o bloco mede 64 (48 do alvo e 8 de cada lado) quando o texto cabe em duas linhas.
// O anel de foco muda de cor no claro, porque o foco de tinta sumiria no bloco de tinta.
const BLOCO =
  't-corpo-p flex flex-row flex-wrap items-center justify-between gap-x-[12px] md:gap-x-[16px] gap-y-[8px] rounded-[8px] bg-[var(--cor-texto)] px-[16px] py-[8px] text-[color:var(--cor-fundo)] ' +
  'md:px-[64px] ' +
  '[:root[data-tema=madrugada]_&]:bg-[var(--cor-papel-fundo)] [:root[data-tema=madrugada]_&]:text-[color:var(--cor-texto)] ' +
  '[&_:focus-visible]:outline-[color:var(--cor-fundo)] [:root[data-tema=madrugada]_&_:focus-visible]:outline-[color:var(--cor-foco)]'

// Todo parágrafo da faixa (T-01, T-03 e T-06) tem a mesma largura máxima, em px: nenhuma linha passa
// de 65 caracteres. Não vale `ch` (a largura do zero): num texto proporcional cabem mais letras. Em 17 px
// o pior caso (T-03) mede cerca de 8,3 px por caractere, então 520 px dão uns 62 por linha, e a quebra de
// T-03 fica equilibrada (com 480 sobrava "app, mesmo sem internet." sozinho na segunda linha).
const PARAGRAFO = 'm-0 max-w-[520px] text-balance'

// No bloco da versão o parágrafo divide a linha com o botão: base pequena (160 abaixo de 768, 240 daí para
// cima), para o texto quebrar ao lado do botão em vez de empurrá-lo para outra linha. Na oferta de
// instalar (T-03) a coluna abaixo de 768 não pode ter base, que lá seria altura; vale só a partir de 768.
const PARAGRAFO_NO_BLOCO = 'min-w-0 flex-[1_1_160px] md:flex-[1_1_240px]'
const PARAGRAFO_NA_OFERTA = 'md:min-w-0 md:flex-[1_1_240px]'

// Todo botão da faixa pode ser estreitado até a largura da faixa e crescer em altura: o rótulo quebra
// (o `white-space: nowrap` do miolo do sistema sai) e só há altura mínima, a do alvo de toque. O
// recuo vertical do miolo dá folga à caixa do texto, mais alta que a entrelinha de 1 do `t-botao`:
// com a fonte ampliada ela passava 1 px do fundo do botão. Com 4 px o botão de 100% segue com 48.
const BOTAO_DE_MOLDURA =
  'max-w-full min-h-[max(48px,var(--alvo-toque))] [&_.sb-moldura-miolo]:whitespace-normal [&_.sb-moldura-miolo]:py-[4px]'

// No bloco: de dia o botão é uma placa de papel sobre a tinta; na madrugada, só a moldura clara sobre o
// bloco escuro (o fundo escuro do botão virava um buraco no bloco). Abaixo de 768 o miolo perde 16 px de
// recuo de cada lado (24 no sistema), para o botão e o texto caberem na mesma linha em 390.
const BOTAO_NO_BLOCO =
  BOTAO_DE_MOLDURA +
  ' shrink-0 max-md:[&_.sb-moldura-miolo]:px-[8px] bg-[var(--cor-fundo)] border-[color:var(--cor-fundo)] ' +
  '[:root[data-tema=madrugada]_&]:bg-transparent [:root[data-tema=madrugada]_&]:border-[color:var(--cor-texto)]'

// Linha 9 (instalar): texto secundário à esquerda e os botões à direita; o grupo vai para baixo do texto
// abaixo de 768.
const LINHA_INSTALAR = 'flex flex-col gap-[8px] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-[16px]'

// Os dois controles da oferta: abaixo de 768, na mesma linha (o botão cresce até o link, que fica na borda
// direita); se não couberem (fonte ampliada), o link desce, alinhado à esquerda sob o botão. De 768 para
// cima, lado a lado, com o fim da fila na margem direita da área útil.
const GRUPO_INSTALAR = 'flex max-w-full flex-row flex-wrap items-center gap-x-[8px] md:shrink-0 md:gap-x-[16px]'

// O botão de texto: alvo de 44 px no mínimo (56 de altura na madrugada), sublinhado, foco do sistema.
// Sem recuo lateral: o texto fica na borda da área útil, alinhado ao resto da faixa. Quebra se não couber.
const BOTAO_DE_TEXTO =
  't-corpo-p max-w-full min-h-[var(--alvo-toque)] min-w-[44px] whitespace-normal underline underline-offset-[4px]'

/**
 * A faixa de estado do PWA, entre o cabeçalho e a tela: (1) versão nova (T-01) ou site atualizado em
 * outra aba (T-06), com T-02; (9) oferta de instalar (T-03, T-04 e T-05). Só na área logada (/app e
 * /app/*). Sem estado a mostrar não renderiza nada. Não é landmark, não rouba o foco e fica no fluxo
 * da página (não é fixa), com um fio de 1 px embaixo de tudo.
 */
export function FaixaEstado() {
  const { pathname } = useLocation()
  const estado = useSyncExternalStore(assinarEstadoPwa, obterEstadoPwa, obterEstadoPwa)

  if (pathname !== '/app' && !pathname.startsWith('/app/')) return null

  const textoDaVersao = estado.outraAba ? T06 : estado.versaoNova ? T01 : null
  const eventoInstalar = executandoComoApp() ? null : estado.eventoInstalar
  if (textoDaVersao === null && eventoInstalar === null) return null

  // T-06 só recarrega esta aba (as outras já estão na versão nova); T-01 pede ao service worker novo
  // que assuma, e quem recarrega é a mudança de controle.
  function atualizar() {
    if (estado.outraAba) recarregarAba()
    else estado.versaoNova?.ativar()
  }

  return (
    <div
      data-faixa-estado=""
      className="sb-area flex flex-col gap-[8px] border-b border-[color:var(--cor-fio-suave)] pb-[16px] pt-[8px] md:gap-[16px]"
    >
      {textoDaVersao !== null ? (
        <div data-faixa-linha="versao" className={BLOCO}>
          <p className={`${PARAGRAFO} ${PARAGRAFO_NO_BLOCO}`}>{textoDaVersao}</p>
          <Botao variante="moldura" className={BOTAO_NO_BLOCO} onClick={atualizar}>
            {T02}
          </Botao>
        </div>
      ) : null}

      {eventoInstalar !== null ? (
        <div data-faixa-linha="instalar" className={LINHA_INSTALAR}>
          <p className={`t-corpo-p t-secundario ${PARAGRAFO} ${PARAGRAFO_NA_OFERTA}`}>{T03}</p>
          <div className={GRUPO_INSTALAR}>
            <Botao variante="moldura" className={`${BOTAO_DE_MOLDURA} max-md:flex-[1_1_auto] max-md:[&_.sb-moldura-miolo]:px-[8px]`} onClick={() => void instalarNoAparelho(eventoInstalar)}>
              {T04}
            </Botao>
            <button type="button" className={BOTAO_DE_TEXTO} onClick={recusarInstalacao}>
              {T05}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
