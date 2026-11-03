"""Conta entradas traduzidas/não traduzidas/fuzzy de um .po (uso: py -3.12 -I po_stats.py <arquivo.po>)."""
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()
blocks = re.split(r"\n\s*\n", text)
total = untranslated = fuzzy = 0
for b in blocks:
    if "msgid" not in b:
        continue
    lines = [l for l in b.splitlines() if not l.startswith("#~")]
    if not any(l.startswith("msgid") for l in lines):
        continue
    is_fuzzy = any(l.startswith("#,") and "fuzzy" in l for l in lines)
    # junta msgid
    cur = None
    parts = {"msgid": "", "msgstr": ""}
    for l in lines:
        m = re.match(r'^(msgid|msgid_plural|msgstr(?:\[\d+\])?)\s+"(.*)"\s*$', l)
        if m:
            key = m.group(1)
            cur = "msgid" if key.startswith("msgid") and key == "msgid" else ("msgstr" if key.startswith("msgstr") else None)
            if cur:
                parts[cur] += m.group(2)
            continue
        m = re.match(r'^"(.*)"\s*$', l)
        if m and cur:
            parts[cur] += m.group(1)
    if parts["msgid"] == "":
        continue  # cabeçalho
    total += 1
    if parts["msgstr"] == "":
        untranslated += 1
    if is_fuzzy:
        fuzzy += 1
print(f"{sys.argv[1]}: entradas={total} nao_traduzidas={untranslated} fuzzy={fuzzy} traduzidas={total-untranslated}")
