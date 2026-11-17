---
tipo: politica
status: under review
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
tarefa: MAT-32
fontes_principais:
  - 02_Experiencia/Direcao_Visual.md (gate G10)
---

# Commit policy

Rules for every commit in the AppMaternidade repository, whether code or document. Gate G10 of the [Visual direction](../02_Experiencia/Direcao_Visual.md) points here.

## 1. Author

Every commit goes out with the author `Daniel Macedo <danielmacedosilva11@gmail.com>`.

## 2. What a commit is

A commit is a real, verifiable change: a step of the plan, a component, a test, or a document created or revised.

The following are prohibited:

- empty commit;
- formatting-only commit;
- artificial splitting: separating into several commits what only makes sense together, or committing an import file by file.

## 3. Ceiling

The ceiling is 800 commits per day, counted across the entire repository and in the Brasília time zone. It is a limit, not a target: the number comes from the work.

## 4. Integration

Merge commits are prohibited. Integration into `main` is only via `git merge --ff-only`.

## 5. Mensagem

- In Portuguese, in the present tense, starting with the verb and capitalized ("Adiciona...", "Corrige...").
- The first line is at most 72 characters, counted as Unicode characters, not as bytes.
- The body states what was checked.

## 6. Revisão

When reviewing a card, `<base>` is the card's base commit.

- `git log --format='%an <%ae>' <base>..HEAD` shows only the author from section 1.
- `git log --stat <base>..HEAD` has no commit without a file.
- Artificial splitting is left to the reviewer's judgment.

## 7. Automated check

The foundation (MAT-35) includes the script `scripts/verificar-commits.mjs`, which checks these rules over the range `<base>..HEAD`.

## Open questions

1. Which rules `scripts/verificar-commits.mjs` can check on its own and which are left to the reviewer alone: defined in MAT-35.
