// Limites dos campos de nome, iguais aos CHECKs do banco (SEC-05, t_9b95bf43):
// nome_privado 80 (conta), familias.nome 80, bebes.nome 60.
// O `maxLength` nativo do campo impede a digitação além do limite; nada mais muda na tela.
export const NOME_DA_CONTA_MAX = 80
export const NOME_DA_FAMILIA_MAX = 80
export const NOME_DO_BEBE_MAX = 60
