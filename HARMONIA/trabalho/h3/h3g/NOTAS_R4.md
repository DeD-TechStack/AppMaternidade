# H-3g, rodada 4: rolagem lateral a 200% de fonte em 390 (RF-05)

A prova global (`.oc/prova_global.mjs`, fonte raiz 200% em 390x844, 11 casos) achou 3 rolagens laterais novas contra a base. Corrigidas no CSS compartilhado e do cartão:

| Rota | Antes | Causa | Correção |
|---|---|---|---|
| `/` | 398 | `.sr-only` das células da tabela escapava da rolagem | `position: relative` em `.cm-tabela-rolagem` (`campo.css`) |
| `/privacidade` | 404 | título em rem não quebrava palavra longa | `overflow-wrap: anywhere` em `.cm-h1..h4` (`site.css`) |
| `/desenvolvimento` | 461 | `.pd-cartao-hora` nowrap + coluna do valor no cartão de legenda tomava o cartão inteiro | `.pd-cartao-hora { white-space: normal }` no `@container (max-width: 15rem)`; `fit-content(55%)` na coluna do valor; `.pd-nq` do detalhe pode quebrar no espaço (`publicas-destaque.css`) |

Resultado final: `comparacao.json` com `lateral_novas: []`, pares da madrugada iguais, `novas_medir_dom: []`.

## TESTES_TROCADOS
- `web/src/teste/publicasDestaque.test.tsx` (~603): o pino `white-space: nowrap` de `.pd-cartao-hora` passou a valer só fora do `@container` estreito, onde a regra é `normal`.

## PEDIDOS_COMUNS H-3a..d, f
O lint é verde (as 17 exceções de `harmonia-excecoes.json` bastam); as linhas de H-3a..d e H-3f não exigiram exceção nova.

## Não verificado
- `CartoesApp.tsx:91,106,193` renderizam a hora sem `.pd-nq` (arquivo fora desta rodada); em cartão < 15rem, "Hoje às 10:20" pode quebrar em espaços.
