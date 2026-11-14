/**
 * A11Y-008: os campos obrigatórios das telas de acesso mostram "(obrigatório)" no rótulo. Nos testes, o rótulo
 * pedido casa com ou sem esse sufixo: o teste diz só o nome do campo.
 */
export function comObrigatorio(rotulo: string): (texto: string) => boolean {
  return (texto) => texto === rotulo || texto === `${rotulo} (obrigatório)`
}
