// O formato do e-mail, conferido na tela antes de qualquer envio (QA-06): algo, `@`, algo, ponto, algo, sem
// espaço. É o mesmo formato que a memória de dados aceita. Só o formato: se a conta existe ou não, quem
// responde é o banco.
const FORMATO_DO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailComFormatoValido(texto: string): boolean {
  return FORMATO_DO_EMAIL.test(texto.trim())
}
