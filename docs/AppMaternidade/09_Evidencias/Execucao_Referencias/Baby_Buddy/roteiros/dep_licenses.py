"""Lista licença declarada nos metadados das dependências instaladas no venv do clone.
Uso: py -3.12 -I dep_licenses.py <site-packages>"""
import sys
from importlib import metadata

site = sys.argv[1]
wanted = {
    "django", "djangorestframework", "django-filter", "django-axes", "django-import-export",
    "django-taggit", "django-dbsettings", "django-imagekit", "django-storages", "django-qr-code",
    "django-widget-tweaks", "django-cors-headers", "dj-database-url", "plotly", "pillow", "faker",
    "whitenoise", "gunicorn", "psycopg2-binary", "boto3", "python-dotenv", "pyyaml", "tablib",
    "segno", "uritemplate", "inflection", "django-ipware", "python-ipware", "pilkit", "tzdata",
}
rows = []
for d in metadata.distributions(path=[site]):
    name = (d.metadata.get("Name") or "").lower()
    if name not in wanted:
        continue
    lic_expr = d.metadata.get("License-Expression") or ""
    lic = (d.metadata.get("License") or "").strip().splitlines()[0][:60] if d.metadata.get("License") else ""
    classifiers = [c.split("::")[-1].strip() for c in d.metadata.get_all("Classifier") or [] if c.startswith("License ::")]
    rows.append((name, d.version, lic_expr, lic, "; ".join(classifiers)))
for r in sorted(rows):
    print(" | ".join(r))
print(f"total: {len(rows)} de {len(wanted)} pacotes pedidos")
