const doisDigitos = (n: number) => String(n).padStart(2, '0')

// "1 h 12 min", ou "12 min" abaixo de 1 hora. Com minutos zerados acima de 1 hora: "2 h 0 min".
export function formatarDuracao(ms: number): string {
  const minutos = Math.floor(Math.max(0, ms) / 60_000)
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas > 0 ? `${horas} h ${resto} min` : `${resto} min`
}

// "mm:ss" abaixo de 1 hora, "h:mm:ss" a partir de 1 hora.
export function formatarCronometro(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60
  return horas > 0
    ? `${horas}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`
    : `${doisDigitos(minutos)}:${doisDigitos(segundos)}`
}

// A classe de tamanho do cronômetro, pelo número de caracteres do texto (VOLTA1 E2): até 7 ("00:00", "1:12:01",
// "9:59:59") é `normal`; 8 ou mais ("10:00:00", "100:00:00") é `longo` e o CSS o faz cair para um tamanho que
// cabe. É contagem de caracteres, e não largura medida: os algarismos do cronômetro são tabulares, então a
// largura da caixa só depende de quantos caracteres há, e a classe não muda enquanto os dígitos mudam.
const CARACTERES_DO_CRONOMETRO_NORMAL = 7

export function tamanhoDoCronometro(texto: string): 'normal' | 'longo' {
  return texto.length > CARACTERES_DO_CRONOMETRO_NORMAL ? 'longo' : 'normal'
}

const TRAVESSAO = '—'
const PREFIXO_HA = 'há '
const PREFIXO_ONTEM = 'ontem '

// Uma coluna da faixa "Últimos": o tempo grande e a legenda de 20 px. O `quando` do estado vem como
// "há 2 h 10 min", "há 50 min", "ontem 17:30" ou "agora":
//  - o valor perde o "há " e o "ontem " do começo e, quando o texto tem " h ", o " min" do fim
//    ("há 2 h 10 min" → "2 h 10"; "há 50 min" → "50 min");
//  - a legenda é o rótulo, mais ", tempo desde o registro" depois de "há " ou ", ontem" depois de "ontem ".
// Só vale o prefixo em minúscula e com o espaço. Falha fechado: sem tempo ou sem rótulo, o travessão.
export function formatarUltimo(rotulo: string, quando: string): { valor: string; legenda: string } {
  const bruto = quando.trimStart()
  const ehHa = bruto.startsWith(PREFIXO_HA)
  const ehOntem = bruto.startsWith(PREFIXO_ONTEM)

  const semPrefixo = ehHa ? bruto.slice(PREFIXO_HA.length) : ehOntem ? bruto.slice(PREFIXO_ONTEM.length) : bruto
  let valor = semPrefixo.trim()
  if (valor.includes(' h ') && valor.endsWith(' min')) valor = valor.slice(0, -' min'.length)

  const nome = rotulo.trim()
  const complemento = ehHa ? ', tempo desde o registro' : ehOntem ? ', ontem' : ''

  return { valor: valor === '' ? TRAVESSAO : valor, legenda: nome === '' ? TRAVESSAO : `${nome}${complemento}` }
}

// Hora local, 24 h, dois dígitos: "17:02".
export function formatarHora(instante: number): string {
  const data = new Date(instante)
  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
}
