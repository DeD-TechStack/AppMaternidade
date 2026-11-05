/**
 * Para onde o foco vai quando uma tela é aberta por navegação interna (e não pela URL):
 * - 'cartao': o cartão "Em andamento" do Hoje (depois de encerrar ou descartar uma sessão);
 * - 'titulo': o h1 da tela (atalhos, "Ver sessão", "Voltar para Hoje", item Hoje da navegação).
 * O alvo viaja no `state` da navegação. Sem `state` (URL digitada, recarga), o foco não se move.
 */
export function focoDoEstado(estado: unknown): 'cartao' | 'titulo' | null {
  const foco = (estado as { foco?: unknown } | null | undefined)?.foco
  return foco === 'cartao' || foco === 'titulo' ? foco : null
}
