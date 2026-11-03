"""Substitui páginas HTML de erro do DEBUG (que incluem request.META/ambiente do
processo) por um resumo de uma linha. Uso: py -3.12 -I strip_html.py <log>"""
import html
import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8", errors="replace").read()

pattern = re.compile(r"<!DOCTYPE html>.*?</html>", re.S | re.I)


def summary(m):
    block = m.group(0)
    title = re.search(r"<title>(.*?)</title>", block, re.S)
    exc = re.search(r'<pre class="exception_value">(.*?)</pre>', block, re.S)
    parts = []
    if title:
        parts.append("title=" + html.unescape(" ".join(title.group(1).split())))
    if exc:
        parts.append("exception_value=" + html.unescape(" ".join(exc.group(1).split())))
    return "[pagina HTML de erro do DEBUG suprimida do log (contem META/ambiente do processo); resumo: " + "; ".join(parts) + "]"


new, n = pattern.subn(summary, text)
open(path, "w", encoding="utf-8").write(new)
print(f"{n} pagina(s) HTML substituida(s); linhas agora: {new.count(chr(10))}")
