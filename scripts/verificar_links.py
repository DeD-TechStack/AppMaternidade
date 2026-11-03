#!/usr/bin/env python3
"""Confere os links relativos dos documentos Markdown do repositório.

Uso, a partir da raiz do repositório:

    python scripts/verificar_links.py

Percorre docs/**/*.md e AGENTS.md. Para cada link [texto](alvo) ou imagem
![texto](alvo) fora de blocos de código e de trechos entre crases (que podem
cruzar linhas dentro de um parágrafo), confere se o alvo existe (arquivo ou
pasta), com maiúsculas e minúsculas exatas em cada parte do caminho. O título
opcional ("...", '...' ou (...)) é separado do destino como no CommonMark,
mesmo quando tem parênteses. Não confere âncoras, wikilinks [[...]] nem
endereços com esquema (http:, mailto:, obsidian: etc.).

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
# Linha que começa bloco novo: título, linha de tabela ou item de lista.
# Um trecho entre crases não atravessa o começo de outro bloco.
INICIO_BLOCO = re.compile(r"^ {0,3}(#{1,6}(\s|$)|\||[-*+]\s|\d{1,9}[.)]\s)")
# Título e linha de tabela ocupam uma linha só.
BLOCO_DE_UMA_LINHA = re.compile(r"^ {0,3}(#{1,6}(\s|$)|\|)")
# Pontuação ASCII que a barra invertida escapa (CommonMark).
PONTUACAO = set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")


def arquivos_alvo(raiz: Path) -> list[Path]:
    lista = sorted(p for p in (raiz / "docs").rglob("*.md") if p.is_file())
    agents = raiz / "AGENTS.md"
    if agents.is_file():
        lista.append(agents)
    return lista


def tirar_codigo_inline(texto: str) -> str:
    """Troca trechos entre crases (de qualquer tamanho) por espaços.

    O texto pode ter várias linhas (um bloco inteiro): o trecho pode cruzar
    linhas, e as quebras de linha são mantidas para não mudar a numeração.
    Uma crase depois de barra invertida não abre trecho.
    """
    saida = list(texto)
    i = 0
    n = len(texto)
    while i < n:
        c = texto[i]
        if c == "\\" and i + 1 < n and texto[i + 1] in PONTUACAO:
            i += 2
            continue
        if c != "`":
            i += 1
            continue
        j = i
        while j < n and texto[j] == "`":
            j += 1
        tamanho = j - i
        # O fecho precisa ter exatamente o mesmo número de crases.
        fecho = -1
        k = j
        while k < n:
            if texto[k] == "`":
                m = k
                while m < n and texto[m] == "`":
                    m += 1
                if m - k == tamanho:
                    fecho = k
                    break
                k = m
            else:
                k += 1
        if fecho == -1:
            i = j
            continue
        for p in range(i, fecho + tamanho):
            if saida[p] != "\n":
                saida[p] = " "
        i = fecho + tamanho
    return "".join(saida)


def desescapar(texto: str) -> str:
    """Tira a barra invertida antes de pontuação ASCII."""
    return re.sub(r"\\([!-/:-@\[-`{-~])", r"\1", texto)


def ler_destino(linha: str, j: int) -> tuple[str, int] | None:
    """Lê destino e título opcional a partir de j (logo depois de "](").

    Segue o CommonMark: o destino é <...> ou uma sequência sem espaços com
    parênteses balanceados; o título, separado por espaço, vem entre aspas
    duplas, aspas simples ou parênteses. Entre aspas, o título pode ter
    parênteses. Devolve (alvo, posição depois do ")") ou None se o trecho
    não for um destino válido.
    """
    n = len(linha)
    p = j
    while p < n and linha[p] in " \t":
        p += 1
    if p < n and linha[p] == "<":
        q = p + 1
        while q < n and linha[q] != ">":
            if linha[q] == "<":
                return None
            if linha[q] == "\\" and q + 1 < n and linha[q + 1] in PONTUACAO:
                q += 2
                continue
            q += 1
        if q >= n:
            return None
        destino = linha[p + 1 : q]
        p = q + 1
    else:
        q = p
        profundidade = 0
        while q < n:
            c = linha[q]
            if c == "\\" and q + 1 < n and linha[q + 1] in PONTUACAO:
                q += 2
                continue
            if c in " \t":
                break
            if c == "(":
                profundidade += 1
            elif c == ")":
                if profundidade == 0:
                    break
                profundidade -= 1
            q += 1
        if profundidade != 0:
            return None
        destino = linha[p:q]
        p = q
    r = p
    while r < n and linha[r] in " \t":
        r += 1
    if r < n and linha[r] != ")":
        if r == p:
            return None  # o título precisa de espaço antes
        fecha = {'"': '"', "'": "'", "(": ")"}.get(linha[r])
        if fecha is None:
            return None
        s = r + 1
        while s < n and linha[s] != fecha:
            if linha[s] == "\\" and s + 1 < n and linha[s + 1] in PONTUACAO:
                s += 2
                continue
            if fecha == ")" and linha[s] == "(":
                return None
            s += 1
        if s >= n:
            return None
        r = s + 1
        while r < n and linha[r] in " \t":
            r += 1
    if r < n and linha[r] == ")":
        return desescapar(destino), r + 1
    return None


def leitura_simples(linha: str, j: int) -> tuple[str, int] | None:
    """Leitura de reserva: conteúdo até o ")" que fecha, contando parênteses."""
    n = len(linha)
    if j < n and linha[j] == "<":
        fim = linha.find(">", j + 1)
        if fim == -1:
            return None
        fecha = linha.find(")", fim + 1)
        if fecha == -1:
            return None
        return linha[j:fecha], fecha + 1
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
                return linha[j:m], m + 1
            profundidade -= 1
        m += 1
    return None


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


def extrair_alvos(linha: str) -> list[str]:
    """Devolve o alvo de cada [texto](alvo) e ![texto](alvo) da linha.

    Primeiro tenta a leitura do CommonMark (ler_destino), que separa destino
    e título respeitando as aspas. Se ela falhar (por exemplo, espaço no
    destino sem <...>), usa a leitura de reserva, que pega tudo até o ")"
    que fecha e tira o título com limpar_alvo; assim o link continua sendo
    conferido em vez de sumir.
    """
    alvos = []
    i = 0
    while True:
        k = linha.find("](", i)
        if k == -1:
            break
        j = k + 2
        lido = ler_destino(linha, j)
        if lido is not None:
            alvos.append(lido[0].strip())
            i = lido[1]
            continue
        bruto = leitura_simples(linha, j)
        if bruto is None:
            i = j
            continue
        alvos.append(limpar_alvo(bruto[0]))
        i = bruto[1]
    return alvos


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


def linhas_sem_codigo(texto: str) -> list[str]:
    """Devolve as linhas do arquivo com o código apagado.

    Linhas de cerca ``` ou ~~~ (e o que fica entre elas) viram vazias. O resto
    é agrupado em blocos (parágrafos separados por linha em branco, cerca,
    título, linha de tabela ou item de lista), e os trechos entre crases são
    apagados no bloco inteiro, porque podem cruzar linhas. A lista tem uma
    entrada por linha do arquivo, na mesma ordem.
    """
    linhas = texto.splitlines()
    saida = [""] * len(linhas)
    cerca_aberta: str | None = None
    bloco: list[int] = []

    def fechar_bloco() -> None:
        if bloco:
            limpo = tirar_codigo_inline("\n".join(linhas[i] for i in bloco))
            for indice, conteudo in zip(bloco, limpo.split("\n")):
                saida[indice] = conteudo
            bloco.clear()

    for indice, linha in enumerate(linhas):
        if cerca_aberta is not None:
            fecho = FECHO.match(linha)
            if (
                fecho
                and fecho.group(1)[0] == cerca_aberta[0]
                and len(fecho.group(1)) >= len(cerca_aberta)
            ):
                cerca_aberta = None
            continue
        m = CERCA.match(linha)
        if m:
            fechar_bloco()
            cerca_aberta = m.group(1)
            continue
        if not linha.strip():
            fechar_bloco()
            continue
        if INICIO_BLOCO.match(linha):
            fechar_bloco()
        bloco.append(indice)
        if BLOCO_DE_UMA_LINHA.match(linha):
            fechar_bloco()
    fechar_bloco()
    return saida


def verificar_arquivo(raiz: Path, arquivo: Path) -> list[tuple[int, str]]:
    quebrados = []
    texto = arquivo.read_text(encoding="utf-8")
    for numero, limpa in enumerate(linhas_sem_codigo(texto), start=1):
        for alvo in extrair_alvos(limpa):
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
