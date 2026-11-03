"""Resumo de licencas declaradas das dependencias do Finnberry (somente leitura).

Uso: python -I dep_licenses.py <raiz_do_clone> <saida_json>

- Le pnpm-lock.yaml (v9) com um parser minimo (sem dependencias externas).
- Calcula o fechamento de dependencias de PRODUCAO a partir das secoes
  `dependencies` (nao `devDependencies`) dos pacotes do workspace, seguindo
  `snapshots` (dependencies + optionalDependencies).
- Le o campo `license`/`licenses` do package.json instalado em
  node_modules/.pnpm/*/node_modules/<nome>/package.json.
- O campo `license` e autodeclarado; nao substitui a leitura do arquivo LICENSE.
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

root = sys.argv[1]
out_path = sys.argv[2]
lock_path = os.path.join(root, "pnpm-lock.yaml")
lines = open(lock_path, encoding="utf-8").read().splitlines()


def unquote(s):
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "'\"":
        return s[1:-1]
    return s


section = None
importers = defaultdict(lambda: {"dependencies": {}, "devDependencies": {}, "optionalDependencies": {}})
snapshots = defaultdict(lambda: {"dependencies": {}, "optionalDependencies": {}})
packages_keys = set()

cur_importer = None
cur_kind = None
cur_dep = None
cur_snap = None
cur_snap_kind = None

for ln in lines:
    if ln and not ln.startswith(" "):
        section = ln.rstrip(":").strip()
        cur_importer = cur_kind = cur_dep = cur_snap = cur_snap_kind = None
        continue
    if section == "importers":
        m = re.match(r"^  (\S.*):$", ln)
        if m:
            cur_importer = unquote(m.group(1)); cur_kind = None; continue
        m = re.match(r"^    (dependencies|devDependencies|optionalDependencies):$", ln)
        if m:
            cur_kind = m.group(1); continue
        m = re.match(r"^      (\S.*):$", ln)
        if m and cur_kind:
            cur_dep = unquote(m.group(1)); continue
        m = re.match(r"^        version: (.+)$", ln)
        if m and cur_kind and cur_dep:
            importers[cur_importer][cur_kind][cur_dep] = unquote(m.group(1))
            continue
    elif section == "packages":
        m = re.match(r"^  (\S.*):$", ln)
        if m:
            packages_keys.add(unquote(m.group(1)))
    elif section == "snapshots":
        m = re.match(r"^  (\S.*?):( \{\})?$", ln)
        if m:
            cur_snap = unquote(m.group(1)); cur_snap_kind = None
            snapshots[cur_snap]
            continue
        m = re.match(r"^    (dependencies|optionalDependencies):$", ln)
        if m:
            cur_snap_kind = m.group(1); continue
        m = re.match(r"^    \S", ln)
        if m:
            cur_snap_kind = None; continue
        m = re.match(r"^      (\S.*?): (.+)$", ln)
        if m and cur_snap and cur_snap_kind:
            snapshots[cur_snap][cur_snap_kind][unquote(m.group(1))] = unquote(m.group(2))


def base_version(v):
    return v.split("(")[0]


# Fechamento de producao
prod = set()
stack = []
visited_importers = set()


def add_importer(imp):
    if imp in visited_importers or imp not in importers:
        return
    visited_importers.add(imp)
    for kind in ("dependencies", "optionalDependencies"):
        for name, ver in importers[imp][kind].items():
            if ver.startswith("link:"):
                target = os.path.normpath(os.path.join(imp, ver[5:])).replace("\\", "/")
                add_importer(target)
            else:
                stack.append(f"{name}@{ver}")


for imp in list(importers):
    if imp != ".":
        add_importer(imp)

while stack:
    key = stack.pop()
    if key in prod:
        continue
    prod.add(key)
    snap = snapshots.get(key)
    if snap is None:
        continue
    for kind in ("dependencies", "optionalDependencies"):
        for name, ver in snap[kind].items():
            stack.append(f"{name}@{ver}")

all_keys = set(snapshots)

# Indice de package.json instalados
index = {}
pnpm_dir = os.path.join(root, "node_modules", ".pnpm")
for d in os.listdir(pnpm_dir):
    nm = os.path.join(pnpm_dir, d, "node_modules")
    if not os.path.isdir(nm):
        continue
    for entry in os.listdir(nm):
        cands = []
        p = os.path.join(nm, entry)
        if entry.startswith("@") and os.path.isdir(p):
            cands = [os.path.join(p, e) for e in os.listdir(p)]
        else:
            cands = [p]
        for c in cands:
            pj = os.path.join(c, "package.json")
            if os.path.isfile(pj) and not os.path.islink(c):
                try:
                    data = json.load(open(pj, encoding="utf-8"))
                except Exception:
                    continue
                n, v = data.get("name"), data.get("version")
                if n and v and (n, v) not in index:
                    lic = data.get("license")
                    if isinstance(lic, dict):
                        lic = lic.get("type")
                    if not lic and isinstance(data.get("licenses"), list):
                        lic = " OR ".join(str(x.get("type")) for x in data["licenses"] if isinstance(x, dict))
                    index[(n, v)] = lic or "(sem campo license)"


def split_key(key):
    k = base_version(key)
    at = k.rfind("@")
    return k[:at], k[at + 1:]


def summarize(keys):
    lic_count = Counter()
    by_lic = defaultdict(list)
    missing = []
    for key in sorted(keys):
        name, ver = split_key(key)
        lic = index.get((name, ver))
        if lic is None:
            missing.append(f"{name}@{ver}")
            continue
        lic_count[lic] += 1
        by_lic[lic].append(f"{name}@{ver}")
    return lic_count, by_lic, missing


COPYLEFT = re.compile(r"GPL|LGPL|AGPL|MPL|EPL|CDDL|EUPL|OSL|CC-BY-SA|SSPL|BUSL|Commercial|SEE LICENSE|UNLICENSED|Proprietary", re.I)

result = {}
for label, keys in (("producao", prod), ("todos_os_snapshots", all_keys)):
    uniq = {base_version(k) for k in keys}
    lic_count, by_lic, missing = summarize(uniq)
    flagged = {lic: pk for lic, pk in by_lic.items() if COPYLEFT.search(lic) or lic == "(sem campo license)"}
    result[label] = {
        "pacotes_unicos": len(uniq),
        "contagem_por_licenca": dict(lic_count.most_common()),
        "sinalizados": flagged,
        "sem_package_json_instalado": missing,
    }

KEY_PKGS = [
    "next", "react", "react-dom", "@trpc/server", "@trpc/client", "@trpc/react-query",
    "@tanstack/react-query", "@prisma/client", "prisma", "zod", "zustand", "superjson",
    "@supabase/supabase-js", "@supabase/realtime-js", "next-auth", "@auth/core", "@auth/prisma-adapter",
    "nodemailer", "lucide-react", "@radix-ui/react-dialog", "tailwind-merge", "class-variance-authority",
    "date-fns", "@anthropic-ai/sdk", "@anthropic-ai/claude-agent-sdk", "@modelcontextprotocol/sdk",
    "react-markdown", "remark-gfm", "tailwindcss", "@tailwindcss/postcss", "lightningcss", "sharp",
    "@img/sharp-win32-x64", "@img/sharp-libvips-linux-x64", "caniuse-lite", "turbo", "vitest", "@playwright/test",
    "typescript", "eslint", "axe-core",
]
key_info = {}
for (n, v), lic in index.items():
    if n in KEY_PKGS:
        key_info.setdefault(n, []).append(f"{v}: {lic}")
result["pacotes_principais"] = {k: sorted(v) for k, v in sorted(key_info.items())}
result["importadores_lidos"] = sorted(importers)

json.dump(result, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(json.dumps({k: (v if k != "todos_os_snapshots" and k != "producao" else {
    "pacotes_unicos": v["pacotes_unicos"],
    "contagem_por_licenca": v["contagem_por_licenca"],
    "sinalizados": v["sinalizados"],
    "sem_package_json_instalado": v["sem_package_json_instalado"][:20],
}) for k, v in result.items()}, ensure_ascii=False, indent=1))
