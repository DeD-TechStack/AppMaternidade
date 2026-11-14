# H-3g MEDIDAS_NOS (fechamento do item H, passo 3)

`medir_h.js` sha256 3b22da114bff180bb9a6e89193f7efb6eff4b006bc5c18ba956841dec41f45e9 (o mesmo do HANDOFF da H-3a; arquivo inalterado). Driver: `.oc/medir_tudo.mjs` (copiado para `h3g/ferramentas/`), CDP por Chrome, DSF 1, reduce, rolagem até o fim, 3 s de espera, tema claro, demo em memória para `/app/hoje` (login pela UI).
HEAD = ver HANDOFF (commit com o merge do `origin/int/refazer` 15908b0); `<base>` = H-3a base `38f0784` (int/refazer antes da integração da H-3a; sem `data-h`, sem primitivas).

## HEAD: células (a) a (e), 9 rotas

| rota | largura | (a) | (b) | (c) | (d) | (e) bruto | (e) pela emenda 55..80 | textos | lateral |
|---|---|---|---|---|---|---|---|---|---|
| / | 1440 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 12 | False |
| / | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 12 | False |
| /como-funciona | 1440 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 9 | False |
| /como-funciona | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 9 | False |
| /cuidado-compartilhado | 1440 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 12 | False |
| /cuidado-compartilhado | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 12 | False |
| /desenvolvimento | 1440 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 32 | False |
| /desenvolvimento | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 32 | False |
| /sobre | 1440 | PASSA | PASSA | PASSA | PASSA | FALHA (1 falhas) | PASSA (emenda 55..80) | 23 | False |
| /sobre | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 23 | False |
| /privacidade | 1440 | PASSA | PASSA | PASSA | PASSA | PASSA | PASSA | 30 | False |
| /privacidade | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 30 | False |
| /contato | 1440 | PASSA | PASSA | PASSA | PASSA | PASSA | PASSA | 8 | False |
| /contato | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 8 | False |
| /entrar | 1440 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 3 | False |
| /entrar | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 3 | False |
| /app/hoje | 1440 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 9 | False |
| /app/hoje | 390 | PASSA | PASSA | PASSA | PASSA | N/A | N/A | 9 | False |

(e): `/sobre` a 1440 mede 58,7, fora de 60 a 80 do medidor e dentro de 55 a 80 da emenda do líder (MEDIDAS.md §5, 14/11, páginas de texto de leitura 640). O JSON bruto fica FALHA no limite antigo; a emenda é aplicada no resumo, não no `medir_h.js`.
Controle negativo (Início 1440 sem nenhum `data-h`): (a) = N/A, (c) = N/A, ok = True.

## `<base>` 38f0784: números informativos (sem `data-h`, nada passa nem reprova)

| rota | largura | textos | bordas esq. | pares de tipo distintos (base) | pares (HEAD) | mediana cpl base | mediana cpl HEAD |
|---|---|---|---|---|---|---|---|
| / | 1440 | 16 | 4 -> 2 | 6 | 4 | 40.7 | 40.7 |
| / | 390 | 16 | 3 -> 2 | 5 | 4 | 30.5 | 30.5 |
| /como-funciona | 1440 | 8 | 3 -> 3 | 4 | 4 | 47.3 | 47.3 |
| /como-funciona | 390 | 8 | 2 -> 2 | 3 | 4 | 37.6 | 32.1 |
| /cuidado-compartilhado | 1440 | 20 | 6 -> 2 | 10 | 5 | 50 | 48.5 |
| /cuidado-compartilhado | 390 | 18 | 5 -> 2 | 8 | 5 | 35 | 34.8 |
| /desenvolvimento | 1440 | 43 | 9 -> 6 | 10 | 7 | 50.3 | 51.7 |
| /desenvolvimento | 390 | 43 | 6 -> 2 | 9 | 7 | 37 | 38 |
| /sobre | 1440 | 23 | 3 -> 3 | 6 | 5 | 58.7 | 58.7 |
| /sobre | 390 | 22 | 1 -> 2 | 5 | 5 | 35.2 | 39.4 |
| /privacidade | 1440 | 30 | 3 -> 3 | 5 | 4 | 64.5 | 63.3 |
| /privacidade | 390 | 29 | 1 -> 2 | 4 | 4 | 39.8 | 40.2 |
| /contato | 1440 | 8 | 3 -> 3 | 5 | 4 | 64.7 | 64.7 |
| /contato | 390 | 7 | 1 -> 2 | 4 | 4 | 38.8 | 38.2 |
| /entrar | 1440 | 2 | 1 -> 2 | 2 | 3 | None | None |
| /entrar | 390 | 2 | 1 -> 2 | 2 | 3 | None | None |
| /app/hoje | 1440 | 24 | 9 -> 3 | 6 | 4 | None | None |
| /app/hoje | 390 | 23 | 6 -> 2 | 6 | 4 | None | None |

Células na base: todas N/A (sem ganchos `data-h`); a base não tem como passar ou reprovar.

## RF-05

- medir-dom (11 casos): falhas (regra, caso, seletor) na base = 0, no HEAD = 0, novas no HEAD = 0.
- Fonte 200% a 390 (`html` com `font-size: 200%`), rolagem lateral nova no HEAD: nenhuma.
  - inicio: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - comofunciona: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - cuidado: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - desenvolvimento: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - sobre: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - privacidade: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - contato: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - entrar: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - hoje_claro: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - hoje_madrugada: base 390/390 lateral=False | HEAD 390/390 lateral=False
  - sessao_madrugada: base 390/390 lateral=False | HEAD 390/390 lateral=False
- Pares (color, background-color) dos elementos visíveis da página inteira, 390x844:
  - hoje_claro: IGUAIS (base 10, HEAD 10); só HEAD: []; só base: []
  - hoje_madrugada: IGUAIS (base 10, HEAD 10); só HEAD: []; só base: []
  - sessao_madrugada: IGUAIS (base 8, HEAD 8); só HEAD: []; só base: []
