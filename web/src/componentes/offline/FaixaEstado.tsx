import { useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { T01, T02, T03, T04, T05, T06 } from '../../conteudo/offline.ts'
import { assinarEstadoPwa, obterEstadoPwa } from '../../pwa/estado.ts'
import { executandoComoApp, instalarNoAparelho, recusarInstalacao } from '../../pwa/instalar.ts'
import { recarregarAba } from '../../pwa/recarregar.ts'
import { Botao } from '../base/Botao.tsx'

// A faixa só tem estilo inline (Tailwind sobre as variáveis de uso): o CSS do sistema-base não muda.
// Cores só da tinta, do papel e do secundário; nada de urucum. Sem sombra, sem ícone, sem movimento.

// Linha 1 (versão nova ou outra aba): um bloco de tinta no claro (texto de papel) e, na madrugada, o
// bloco escuro do sistema (a tinta sobre o fundo escuro some). O botão inverte: fundo de papel. O
// anel de foco muda de cor no claro, porque o foco de tinta sumiria no bloco de tinta.
const BLOCO =
  't-ui flex flex-wrap items-center justify-between gap-[8px] rounded-[4px] bg-[var(--cor-texto)] px-[16px] py-[8px] text-[color:var(--cor-fundo)] ' +
  '[:root[data-tema=madrugada]_&]:bg-[var(--cor-papel-fundo)] [:root[data-tema=madrugada]_&]:text-[color:var(--cor-texto)] ' +
  '[&_:focus-visible]:outline-[color:var(--cor-fundo)] [:root[data-tema=madrugada]_&_:focus-visible]:outline-[color:var(--cor-foco)]'

// Todo parágrafo da faixa (T-01, T-03 e T-06) tem a mesma largura máxima, em px: nenhuma linha passa
// de 65 caracteres. Não vale `ch` (a largura do zero): num texto proporcional cabem mais letras. Medido
// no pior caso (T-03 em 1440 e 1024): cerca de 7,3 px por caractere, então 440 px dão uns 59 por linha.
const PARAGRAFO = 'm-0 max-w-[440px]'

// Todo botão da faixa pode ser estreitado até a largura da faixa e crescer em altura: o rótulo quebra
// (o `white-space: nowrap` do miolo do sistema sai) e só há altura mínima, a do alvo de toque. O
// recuo vertical do miolo dá folga à caixa do texto, mais alta que a entrelinha de 1 do `t-botao`:
// com a fonte ampliada ela passava 1 px do fundo do botão. Com 4 px o botão de 100% segue com 48.
const BOTAO_DE_MOLDURA =
  'max-w-full min-h-[max(48px,var(--alvo-toque))] [&_.sb-moldura-miolo]:whitespace-normal [&_.sb-moldura-miolo]:py-[4px]'

const BOTAO_NO_BLOCO = BOTAO_DE_MOLDURA + ' bg-[var(--cor-fundo)] border-[color:var(--cor-fundo)]'

// Linha 9 (instalar): texto secundário à esquerda e os botões à direita; empilha abaixo de 768.
const LINHA_INSTALAR = 'flex flex-col gap-[8px] md:flex-row md:items-center md:justify-between'

// O botão de texto: alvo de 44 px no mínimo (56 de altura na madrugada), sublinhado, foco do sistema.
// Sem recuo lateral: o texto fica na borda da área útil, alinhado ao resto da faixa. Quebra se não couber.
const BOTAO_DE_TEXTO =
  't-ui max-w-full min-h-[var(--alvo-toque)] min-w-[44px] whitespace-normal underline underline-offset-[4px]'

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
      className="sb-area flex flex-col gap-[8px] border-b border-[color:var(--cor-fio-suave)] py-[8px]"
    >
      {textoDaVersao !== null ? (
        <div data-faixa-linha="versao" className={BLOCO}>
          <p className={PARAGRAFO}>{textoDaVersao}</p>
          <Botao variante="moldura" className={BOTAO_NO_BLOCO} onClick={atualizar}>
            {T02}
          </Botao>
        </div>
      ) : null}

      {eventoInstalar !== null ? (
        <div data-faixa-linha="instalar" className={LINHA_INSTALAR}>
          <p className={`t-ui t-secundario ${PARAGRAFO}`}>{T03}</p>
          <div className="flex max-w-full flex-wrap items-center gap-[8px]">
            <Botao variante="moldura" className={BOTAO_DE_MOLDURA} onClick={() => void instalarNoAparelho(eventoInstalar)}>
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
