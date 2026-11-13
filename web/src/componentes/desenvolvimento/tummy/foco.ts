// O destino do foco quando o controle focado some (DES-03, M11): cada controle do bloco leva `data-foco` com uma
// chave, e quem pede o foco dá uma lista de chaves candidatas. Vale a primeira que existir; uma chave terminada em
// `*` vale o primeiro controle cuja chave começa igual (o primeiro "Encerrar" da lista).

export const CHAVE = {
  titulo: 'titulo',
  alerta: 'alerta',
  iniciar: 'iniciar',
  abrirAgora: 'abrir-agora',
  abrirHorario: 'abrir-horario',
  campoDoPainel: 'campo-do-painel',
  confirmar: 'confirmar',
  salvar: 'salvar',
  desfazer: 'desfazer',
  qualquerEncerrar: 'encerrar:*',
  encerrar: (id: string) => `encerrar:${id}`,
  descartar: (id: string) => `descartar:${id}`,
} as const

/** Foca o primeiro destino que existe dentro de `raiz`; sem nenhum, o `h2` do bloco. */
export function focarPrimeiro(raiz: HTMLElement | null, chaves: readonly string[]): void {
  if (!raiz) return
  for (const chave of [...chaves, CHAVE.titulo]) {
    // O primeiro campo do painel aberto (o "Dia" do formulário ou a duração do "Fizemos agora").
    const seletor =
      chave === CHAVE.campoDoPainel
        ? '[data-painel-tummy] select, [data-painel-tummy] input'
        : chave.endsWith('*')
          ? `[data-foco^="${chave.slice(0, -1)}"]`
          : `[data-foco="${chave}"]`
    const alvo = raiz.querySelector<HTMLElement>(seletor)
    if (alvo) {
      alvo.focus()
      return
    }
  }
}
