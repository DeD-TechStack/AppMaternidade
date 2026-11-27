// O recuo óptico do cronômetro grande: em Literata, o algarismo tabular tem respiro dos dois lados, e o
// "1" (estreito, centrado na caixa) fica bem mais para dentro que o rótulo e os botões da mesma coluna.
// A margem negativa, em `em`, puxa o primeiro algarismo de volta à borda da coluna em qualquer tamanho.
export function recuoOptico(tempo: string): string {
  return tempo.startsWith('1') ? '-ml-[0.1em]' : '-ml-[0.045em]'
}
