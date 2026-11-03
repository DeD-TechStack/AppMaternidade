#!/usr/bin/env python3
"""Confere os links relativos dos documentos Markdown do repositório.

Uso, a partir da raiz do repositório:

    python scripts/verificar_links.py

Percorre docs/**/*.md e AGENTS.md. Para cada link [texto](alvo) ou imagem
![texto](alvo) fora de blocos de código e de trechos entre crases, confere se
o alvo existe (arquivo ou pasta), com maiúsculas e minúsculas exatas em cada
parte do caminho. Não confere âncoras, wikilinks [[...]] nem endereços com
esquema (http:, mailto:, obsidian: etc.).

Cada link quebrado sai como "arquivo:linha -> alvo". Links listados em
scripts/verificar_links_excecoes.txt ("arquivo -> alvo", um por linha; vazias
e linhas com # no início são ignoradas) são aceitos.

Sai com 1 se houver link quebrado e com 0 caso contrário.
Só usa a biblioteca padrão do Python 3.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ARQUIVO_EXCECOES = Path("scripts") / "verificar_links_excecoes.txt"

# Abertura de cerca: até 3 espaços, depois ``` ou ~~~ (3 ou mais).
CERCA = re.compile(r"^ {0,3}(`{3,}|~{3,})")
# Fecho de cerca: só a sequência, sem texto depois.
FECHO = re.compile(r"^ {0,3}(`{3,}|~{3,})\s*$")
# Esquema: "algo:" antes da primeira "/".
ESQUEMA = re.compile(r"^[A-Za-z][A-Za-z0-9+.\-]*:")


def arquivos_alvo(raiz: Path) -> list[Path]:
    lista = sorted(p for p in (raiz / "docs").rglob("*.md") if p.is_file())
    agents = raiz / "AGENTS.md"
    if agents.is_file():
        lista.append(agents)
    return lista


def tirar_codigo_inline(linha: str) -> str:
    """Troca trechos entre crases (de qualquer tamanho) por espaços."""
    saida = []
    i = 0
    n = len(linha)
    while i < n:
        if linha[i] == "`":
            j = i
            while j < n and linha[j] == "`":
                j += 1
            tamanho = j - i
            fecho = linha.find("`" * tamanho, j)
            # O fecho precisa ter exatamente o mesmo número de crases.
            while fecho != -1 and fecho + tamanho < n and linha[fecho + tamanho] == "`":
                k = fecho
                while k < n and linha[k] == "`":
                    k += 1
                fecho = linha.find("`" * tamanho, k)
            if fecho == -1:
                saida.append(linha[i:j])
                i = j
                continue
            saida.append(" " * (fecho + tamanho - i))
            i = fecho + tamanho
        else:
            saida.append(linha[i])
            i += 1
    return "".join(saida)


def extrair_alvos(linha: str) -> list[str]:
    """Devolve o conteúdo bruto entre parênteses de cada [texto](alvo)."""
    alvos = []
    i = 0
    n = len(linha)
    while True:
        k = linha.find("](", i)
        if k == -1:
            break
        j = k + 2
        if j < n and linha[j] == "<":
            fim = linha.find(">", j + 1)
            if fim == -1:
                i = j
                continue
            resto = linha[fim + 1 :]
            fecha = resto.find(")")
            if fecha == -1:
                i = j
                continue
            alvos.append(linha[j : fim + 1 + fecha])
            i = fim + 1 + fecha + 1
            continue
        profundidade = 0
        m = j
        while m < n:
            c = linha[m]
            if c == "\\" and m + 1 < n:
                m += 2
                continue
            if c == "(":
                profundidade += 1
            elif c == ")":
                if profundidade == 0:
                    break
                profundidade -= 1
            m += 1
        if m >= n:
            i = j
            continue
        alvos.append(linha[j:m])
        i = m + 1
    return alvos


def limpar_alvo(bruto: str) -> str:
    """Tira espaços, <...> e o título entre aspas; devolve o alvo como escrito."""
    alvo = bruto.strip()
    if alvo.startswith("<"):
        fim = alvo.find(">")
        if fim != -1:
            return alvo[1:fim]
        return alvo[1:]
    # Título: alvo "título" | alvo 'título' | alvo (título)
    m = re.match(r'^(\S+)\s+("[^"]*"|\'[^\']*\'|\([^)]*\))\s*$', alvo)
    if m:
        return m.group(1)
    return alvo


def existe_com_caixa(base: Path, relativo: str) -> bool:
    """Confere cada parte do caminho contra a listagem real da pasta."""
    atual = base
    partes = [p for p in relativo.replace("\\", "/").split("/") if p not in ("", ".")]
    for parte in partes:
        if parte == "..":
            atual = atual.parent
            continue
        try:
            nomes = os.listdir(atual)
        except OSError:
            return False
        if parte not in nomes:
            return False
        atual = atual / parte
    return atual.exists()


def ler_excecoes(raiz: Path) -> set[tuple[str, str]]:
    caminho = raiz / ARQUIVO_EXCECOES
    if not caminho.is_file():
        return set()
    excecoes = set()
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        texto = linha.strip()
        if not texto or texto.startswith("#"):
            continue
        if " -> " not in texto:
            continue
        arquivo, alvo = texto.split(" -> ", 1)
        excecoes.add((arquivo.strip(), alvo.strip()))
    return excecoes


def verificar_arquivo(raiz: Path, arquivo: Path) -> list[tuple[int, str]]:
    quebrados = []
    texto = arquivo.read_text(encoding="utf-8")
    cerca_aberta: str | None = None
    for numero, linha in enumerate(texto.splitlines(), start=1):
        m = CERCA.match(linha)
        if cerca_aberta is not None:
            fecho = FECHO.match(linha)
            if (
                fecho
                and fecho.group(1)[0] == cerca_aberta[0]
                and len(fecho.group(1)) >= len(cerca_aberta)
            ):
                cerca_aberta = None
            continue
        if m:
            cerca_aberta = m.group(1)
            continue
        limpa = tirar_codigo_inline(linha)
        for bruto in extrair_alvos(limpa):
            alvo = limpar_alvo(bruto)
            if not alvo or alvo.startswith("#"):
                continue
            if ESQUEMA.match(alvo):
                continue
            caminho = unquote(alvo.split("#", 1)[0])
            if not caminho:
                continue
            if caminho.startswith("/"):
                base = raiz
                caminho = caminho.lstrip("/")
            else:
                base = arquivo.parent
            if not existe_com_caixa(base, caminho):
                quebrados.append((numero, alvo))
    return quebrados


def main() -> int:
    raiz = Path.cwd()
    excecoes = ler_excecoes(raiz)
    total = 0
    for arquivo in arquivos_alvo(raiz):
        relativo = arquivo.relative_to(raiz).as_posix()
        try:
            quebrados = verificar_arquivo(raiz, arquivo)
        except (OSError, UnicodeDecodeError):
            print(f"{relativo}:0 -> ERRO DE LEITURA")
            total += 1
            continue
        for numero, alvo in quebrados:
            if (relativo, alvo) in excecoes:
                continue
            print(f"{relativo}:{numero} -> {alvo}")
            total += 1
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
