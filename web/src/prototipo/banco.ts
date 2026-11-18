import { bancoConfigurado } from '../dados/cliente.ts'

// O banco está configurado? Usa a mesma regra do cliente (com trim), para um valor só de espaços
// não esconder o aviso de demonstração. Sem banco o site roda como demonstração (aviso na tela).
export function temBanco(): boolean {
  return bancoConfigurado()
}
