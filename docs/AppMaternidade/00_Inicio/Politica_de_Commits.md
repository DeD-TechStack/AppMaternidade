---
tipo: politica
status: em revisão
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
tarefa: MAT-32
fontes_principais:
  - 02_Experiencia/Direcao_Visual.md (portão G10)
---

# Política de commits

Regras para todo commit do repositório AppMaternidade, de código ou de documento. O portão G10 da [Direção visual](../02_Experiencia/Direcao_Visual.md) aponta para cá.

## 1. Autor

Todo commit sai com o autor `Daniel Macedo <danielmacedosilva11@gmail.com>`.

## 2. O que é um commit

Um commit é uma mudança real e verificável: um passo do plano, um componente, um teste, ou um documento criado ou revisado.

São proibidos:

- commit vazio;
- commit só de formatação;
- divisão artificial: separar em vários commits o que só faz sentido junto, ou commitar uma importação arquivo por arquivo.

## 3. Teto

O teto é de 800 commits por dia, contados no repositório inteiro e no fuso de Brasília. É limite, não meta: o número sai do trabalho.

## 4. Integração

Commit de merge é proibido. A integração na `main` é só por `git merge --ff-only`.

## 5. Mensagem

- Em português, no presente, começando pelo verbo e com maiúscula ("Adiciona...", "Corrige...").
- A primeira linha tem até 72 caracteres, contados como caracteres Unicode, não como bytes.
- O corpo diz o que foi conferido.

## 6. Revisão

Na revisão de um cartão, `<base>` é o commit-base do cartão.

- `git log --format='%an <%ae>' <base>..HEAD` mostra só o autor da seção 1.
- `git log --stat <base>..HEAD` não tem commit sem arquivo.
- A divisão artificial fica para o julgamento do revisor.

## 7. Checagem automática

A fundação (MAT-35) traz o script `scripts/verificar-commits.mjs`, que confere estas regras no intervalo `<base>..HEAD`.

## Questões abertas

1. Quais regras o `scripts/verificar-commits.mjs` consegue conferir sozinho e quais ficam só para o revisor: definido na MAT-35.
