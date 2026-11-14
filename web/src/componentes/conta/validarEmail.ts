import { COMUM, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { emailComFormatoValido } from '../../conteudo/email.ts'

/**
 * O único validador de e-mail das telas de acesso: /criar-conta e /recuperar-acesso conferem com ele antes de
 * qualquer envio. Devolve a mensagem do campo, ou `null` se o e-mail serve. Vazio ou só espaços pede o e-mail;
 * um formato que não é `nome@dominio.ext` (sem espaço) pede para conferir o que foi digitado. Se a conta existe,
 * quem responde é o banco.
 */
export function erroDoEmail(texto: string): string | null {
  if (texto.trim() === '') return COMUM.escrevaEmail
  return emailComFormatoValido(texto) ? null : TEXTOS_ERRO.email_invalido
}
